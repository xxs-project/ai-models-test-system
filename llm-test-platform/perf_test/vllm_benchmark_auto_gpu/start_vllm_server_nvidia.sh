#!/bin/bash

set -e
CODE_PATH=$code_path
CONFIG_FILE="$CODE_PATH/vllm_config_nvidia.json"
EXEC_LOG="$CODE_PATH/vllm_server_nvidia.log"

CMD_ARGS=()

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$EXEC_LOG"
}

error_exit() {
    log "ERROR: $*"
    exit 1
}

check_dependencies() {
    command -v jq >/dev/null 2>&1 || error_exit "jq is required but not installed"
    command -v python >/dev/null 2>&1 || error_exit "python is required but not installed"
}

validate_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        jq empty "$CONFIG_FILE" >/dev/null 2>&1 || error_exit "Invalid JSON in config file"
    else
        error_exit "Config file not found: $CONFIG_FILE"
    fi
}

get_json_value() {
    local key="$1"
    local default="$2"
    if [[ -f "$CONFIG_FILE" ]]; then
        jq -r "$key // \"$default\"" "$CONFIG_FILE" 2>/dev/null || echo "$default"
    else
        echo "$default"
    fi
}

get_json_object() {
    local key="$1"
    if [[ -f "$CONFIG_FILE" ]]; then
        jq -c "$key // {}" "$CONFIG_FILE" 2>/dev/null || echo "{}"
    else
        echo "{}"
    fi
}

add_model_arguments() {
    local model_name="$1"
    local mode="$2"
    local config_model_name="$model_name"
    
    local model_config=$(get_json_object ".models.\"$config_model_name\"")
    if [[ "$model_config" == "{}" ]]; then
        model_config=$(get_json_object ".models.default")
    fi
    
    local model_args=$(echo "$model_config" | jq -r '.args[]? // empty')
    while IFS= read -r arg; do
        [[ -n "$arg" ]] && [[ "$arg" != "empty" ]] && CMD_ARGS+=("$arg")
    done <<< "$model_args"
    
    local model_env=$(echo "$model_config" | jq -r '.env // {}')
    while IFS="=" read -r key value; do
        [[ -n "$key" ]] && export "$key=$value"
    done < <(echo "$model_env" | jq -r 'to_entries[] | "\(.key)=\(.value)"')
    
    local conditional_config=$(echo "$model_config" | jq -r '.conditional // {}')
    if [[ "$conditional_config" != "{}" ]]; then
        if echo "$conditional_config" | jq -e ".\"$mode\"" >/dev/null 2>&1; then
            local mode_config=$(echo "$conditional_config" | jq -r ".\"$mode\"")
            local mode_args=$(echo "$mode_config" | jq -r '.args[]? // empty')
            while IFS= read -r arg; do
                [[ -n "$arg" ]] && [[ "$arg" != "empty" ]] && CMD_ARGS+=("$arg")
            done <<< "$mode_args"
        fi
    fi
}

add_mode_arguments() {
    local mode="$1"
    local mode_config=$(get_json_object ".modes.$mode")
    
    if [[ "$mode_config" == "{}" ]]; then
        log "WARNING: Mode '$mode' not defined, using defaults"
        return 0
    fi
    
    local mode_args=$(echo "$mode_config" | jq -r '.args[]? // empty')
    while IFS= read -r arg; do
        [[ -n "$arg" ]] && [[ "$arg" != "empty" ]] && CMD_ARGS+=("$arg")
    done <<< "$mode_args"
}

build_cmd_args() {
    local model_name="$1"
    local mode="$2"
    local port="$3"
    local model_path="$4"
    local gpu_count="$5"
    
    CMD_ARGS=()
    CMD_ARGS+=("--port")
    CMD_ARGS+=("$port")
    CMD_ARGS+=("$model_path")
    CMD_ARGS+=("--served-model-name")
    CMD_ARGS+=("$model_name")
    CMD_ARGS+=("--tensor-parallel-size")
    CMD_ARGS+=("$gpu_count")
    CMD_ARGS+=("--disable-log-stats")
    CMD_ARGS+=("--disable-log-requests")
    
    add_model_arguments "$model_name" "$mode"
    add_mode_arguments "$mode"
}

main() {
    local model_name=$model_name
    local mode=${mode:-eager}
    local model_path=$model_path
    local gpu_count=${npu_count:-1}
    local port=${port:-8000}
    
    [[ -z "$model_name" ]] && error_exit "Model name is required"
    [[ -z "$model_path" ]] && error_exit "Model path is required"
    
    check_dependencies
    validate_config
    
    log "Starting VLLM server: model=$model_name, mode=$mode, GPUs=$gpu_count, port=$port"
    
    build_cmd_args "$model_name" "$mode" "$port" "$model_path" "$gpu_count"
    
    log "Command: vllm serve ${CMD_ARGS[*]}"
    
    vllm serve "${CMD_ARGS[@]}" || error_exit "VLLM serve failed"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
