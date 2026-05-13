#!/bin/bash

set -e
CODE_PATH=$code_path
CONFIG_FILE="$CODE_PATH/vllm_config.json"
EXEC_LOG="$CODE_PATH/vllm_server.log"

# Global arrays
CMD_ARGS=()
PACKAGES=()

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$EXEC_LOG"
}

error_exit() {
    log "ERROR: $*"
    exit 1
}

# Configuration validation
check_dependencies() {
    command -v jq >/dev/null 2>&1 || error_exit "jq is required but not installed"
    command -v python >/dev/null 2>&1 || error_exit "python is required but not installed"
}

validate_config() {
    [[ -f "$CONFIG_FILE" ]] || error_exit "Config file not found: $CONFIG_FILE"
    jq empty "$CONFIG_FILE" >/dev/null 2>&1 || error_exit "Invalid JSON in config file"
    
    # Validate required sections
    jq -e '.models' "$CONFIG_FILE" >/dev/null || error_exit "Missing models configuration"
    jq -e '.modes' "$CONFIG_FILE" >/dev/null || error_exit "Missing modes configuration"
    jq -e '.packages' "$CONFIG_FILE" >/dev/null || error_exit "Missing packages configuration"
    jq -e '.versions' "$CONFIG_FILE" >/dev/null || error_exit "Missing versions configuration"
}

# Configuration parsing functions
get_json_value() {
    local key="$1"
    local default="$2"
    local config_file="${CONFIG_FILE:-$(dirname "$0")/vllm_config.json}"
    jq -r "$key // \"$default\"" "$config_file" 2>/dev/null || echo "$default"
}

get_json_array() {
    local key="$1"
    local config_file="${CONFIG_FILE:-$(dirname "$0")/vllm_config.json}"
    jq -c "$key // []" "$config_file" 2>/dev/null || echo "[]"
}

get_json_object() {
    local key="$1"
    local config_file="${CONFIG_FILE:-$(dirname "$0")/vllm_config.json}"
    jq -c "$key // {}" "$config_file" 2>/dev/null || echo "{}"
}

# System detection
detect_architecture() {
    local arch=$(uname -m)
    case "$arch" in
        aarch64|arm) echo "aarch64" ;;
        x86_64|i686) echo "x86_64" ;;
        *) error_exit "Unsupported architecture: $arch" ;;
    esac
}

get_vllm_version() {
    local vllm_ascend_version=$(pip list 2>/dev/null | grep vllm_ascend | awk '{print $2}')
    [[ -z "$vllm_ascend_version" ]] && error_exit "vllm_ascend not installed"
    
    local clean_version=$(echo "$vllm_ascend_version" | sed 's/\+[a-zA-Z0-9]*$//')
    local major_version=$(echo "$clean_version" | grep -oE '^[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    
    local version_key=$(jq -r ".versions | keys[] | select(. == \"$major_version\") // \"default\"" "$CONFIG_FILE")
    echo "$version_key"
}

# Package installation - fully configurable
install_packages() {
    local arch="$1"
    local version_key="$2"
    PACKAGES=()
    # # Setup proxy if configured
    # local proxy_ip=$(get_json_value '.proxy.ip' "")
    # local proxy_port=$(get_json_value '.proxy.port' "")
    
    # if [[ -n "$proxy_ip" && -n "$proxy_port" ]]; then
    #     export https_proxy="http://$proxy_ip:$proxy_port"
    #     export http_proxy="http://$proxy_ip:$proxy_port"
    #     export no_proxy="localhost,127.0.0.1,*fusionos*"
    # else
    #     pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple/       
    # fi
    
    pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple/
    
    # Get version configuration
    local vllm_version=$(get_json_value ".versions.$version_key.vllm_version" "0.12.0")
    local vllm_ascend_version=$(get_json_value ".versions.$version_key.vllm_ascend_version" "0.12.0rc1")
    local torch_npu_version=$(get_json_value ".versions.$version_key.torch_npu_version" "2.8.0")
    local release_path=$(get_json_value ".versions.$version_key.release_path" "/data/xxs/release/0114_master")
    
    log "Installing packages for version: $version_key"
    log "VLLM: $vllm_version, VLLM_ASCEND: $vllm_ascend_version, TORCH_NPU: $torch_npu_version"
    
    # Uninstall existing packages
    log "Uninstalling existing packages..."
    pip uninstall -y torch_npu vllm vllm_ascend || true
    if [[ "$arch" == "aarch64" || "$arch" == "arm" ]]; then
        cd "$release_path/arm" || error_exit "Release path not found: $release_path/arm"
    elif [[ "$arch" == "x86_64" || "$arch" == "i686" ]]; then
        cd "$release_path/x86" || error_exit "Release path not found: $release_path/x86"
    else
        echo "不支持的架构: $arch"
        exit 1
    fi
    
    
    # Install base packages using template substitution
    local packages_config=$(get_json_object ".packages.$arch")
    local base_templates=$(echo "$packages_config" | jq -r '.base_templates[]')
    
    while IFS= read -r template; do
        if [[ -n "$template" ]]; then
            local package=$(echo "$template" | sed "s/{vllm_version}/$vllm_version/g" | sed "s/{vllm_ascend_version}/$vllm_ascend_version/g" | sed "s/{torch_npu_version}/$torch_npu_version/g")
            #log "Installing: $package"
            #pip install "$package" || error_exit "Failed to install: $package"
            PACKAGES+=("$package")
        fi
    done <<< "$base_templates"
    
    if [[ -n ${#PACKAGES[@]} ]]; then
        pip install "${PACKAGES[@]}" || error_exit "Failed to install: ${PACKAGES[@]}"
    fi

    # Install arctic-inference (always installed)
    log "Installing arctic-inference..."
    pip install arctic-inference || error_exit "Failed to install arctic-inference"
    
    # Install CANN packages
    local cann_packages=$(echo "$packages_config" | jq -r '.cann[]')
    while IFS= read -r package; do
        if [[ -n "$package" ]]; then
            log "Installing CANN package: $package"
            chmod +x "$package" || error_exit "Failed to chmod: $package"
            ./"$package" || error_exit "Failed to install CANN package: $package"
        fi
    done <<< "$cann_packages"
    
    # Clear proxy settings
    unset https_proxy http_proxy no_proxy
}

# Model-specific setup - fully configurable
setup_model_specific_packages() {
    local model_name="$1"
    local arch="$2"
    
    local config_model_name="$model_name"
    [[ "$use_default_config" == true ]] && config_model_name="default"
    
    local custom_packages_config=$(get_json_object ".custom_packages.\"$model_name\"")
    
    if [[ "$custom_packages_config" != "{}" ]]; then
        # Handle simple array of packages
        local simple_packages=$(echo "$custom_packages_config" | jq -r 'if type=="array" then .[] | select(type=="string") else empty end' 2>/dev/null)
        while IFS= read -r package; do
            [[ -n "$package" ]] && pip install "$package" || log "Warning: Failed to install: $package"
        done <<< "$simple_packages"
        
        # Handle complex setup (like bisheng)
        local special_setup=$(get_json_value ".models.\"$model_name\".special_setup" "")
        if [[ -n "$special_setup" ]]; then
            setup_special_packages "$model_name" "$special_setup" "$arch"
        fi
    fi
}

setup_special_packages() {
    local model_name="$1"
    local setup_type="$2"
    local arch="$3"
    
    case "$setup_type" in
        "bisheng")
            setup_bisheng_packages "$model_name" "$arch"
            ;;
        *)
            log "Warning: Unknown special setup type: $setup_type"
            ;;
    esac
}

setup_bisheng_packages() {
    local model_name="$1"
    local arch="$2"
    
    log "Setting up BiSheng packages for: $model_name"
    
    local download_config=$(get_json_object ".custom_packages.\"$model_name\".download")
    local bisheng_config=$(echo "$download_config" | jq -r '.bisheng')
    local triton_config=$(echo "$download_config" | jq -r '.triton')
    
    # Uninstall triton if specified
    local uninstall_packages=$(get_json_array ".custom_packages.\"$model_name\".uninstall")
    while IFS= read -r package; do
        [[ -n "$package" ]] && pip uninstall "$package" -y || true
    done <<< "$(echo "$uninstall_packages" | jq -r '.[]? // empty')"
    # local uninstall_packages=$(get_json_array ".custom_packages.\"$model_name\".uninstall")
    # echo "$uninstall_packages" | jq -r '.[]? // empty' | while IFS= read -r package; do
    #     [[ -n "$package" ]] && pip uninstall "$package" -y || true
    # done
    
    # Install bisheng toolkit
    local bisheng_url=$(echo "$bisheng_config" | jq -r '.url')
    local bisheng_file_template=$(echo "$bisheng_config" | jq -r '.file_template')
    local bisheng_file=$(echo "$bisheng_file_template" | sed "s/{arch}/$arch/g")
    local bisheng_full_url=$(echo "$bisheng_url" | sed "s/{file}/$bisheng_file/g")
    
    log "Downloading BiSheng toolkit from: $bisheng_full_url"
    wget "$bisheng_full_url" || error_exit "Failed to download BiSheng toolkit"
    chmod a+x "$bisheng_file"
    
    local install_path=$(echo "$bisheng_config" | jq -r '.install_path')
    local env_script=$(echo "$bisheng_config" | jq -r '.env_script')
    
    mkdir -p "$install_path"
    ./"$bisheng_file" --install --install-path="$install_path" || error_exit "Failed to install BiSheng toolkit"
    source "$env_script" 2>/dev/null || log "Warning: Failed to source BiSheng environment"
    
    # Install triton_ascend
    local triton_url=$(echo "$triton_config" | jq -r '.url')
    local triton_file_template=$(echo "$triton_config" | jq -r '.file_template')
    local triton_file=$(echo "$triton_file_template" | sed "s/{arch}/$arch/g")
    local triton_full_url=$(echo "$triton_url" | sed "s/{file}/$triton_file/g")
    
    log "Downloading triton_ascend from: $triton_full_url"
    wget "$triton_full_url" || error_exit "Failed to download triton_ascend"
    pip install "$triton_file" || error_exit "Failed to install triton_ascend"
}

# Environment setup - fully configurable
set_environment_variables() {
    local model_name="$1"
    local mode="$2"
    
    local config_model_name="$model_name"
    [[ "$use_default_config" == true ]] && config_model_name="default"
    
    # Set model-specific environment variables
    local model_config=$(get_json_object ".models.\"$config_model_name\"")
    local model_env=$(echo "$model_config" | jq -r '.env // {}')
    
    while IFS="=" read -r key value; do
        [[ -n "$key" ]] && export "$key=$value"
    done < <(echo "$model_env" | jq -r 'to_entries[] | "\(.key)=\(.value)"')
    
    # Set conditional environment variables based on mode
    local conditional_config=$(echo "$model_config" | jq -r '.conditional // {}')
    local mode_env=$(echo "$conditional_config" | jq -r ".\"$mode\".env // {}")
    
    while IFS="=" read -r key value; do
        [[ -n "$key" ]] && export "$key=$value"
    done < <(echo "$mode_env" | jq -r 'to_entries[] | "\(.key)=\(.value)"')
}

# Command argument building - fully configurable
build_cmd_args() {
    local model_name="$1"
    local mode="$2"
    local port="$3"
    local model_path="$4"
    local npu_count="$5"

    # Clear and initialize CMD_ARGS
    CMD_ARGS=()

    CMD_ARGS+=("--port")
    CMD_ARGS+=("$port")
    CMD_ARGS+=("$model_path")
    CMD_ARGS+=("--served-model-name")
    CMD_ARGS+=("$model_name")
    CMD_ARGS+=("--tensor-parallel-size")
    CMD_ARGS+=("$npu_input")
    CMD_ARGS+=("--disable-log-stats")
    CMD_ARGS+=("--disable-log-requests")

    # Model-specific arguments
    add_model_arguments "$model_name" "$mode"
    
    # Mode-specific arguments
    add_mode_arguments "$model_name" "$mode"
}

add_model_arguments() {
    local model_name="$1"
    local mode="$2"
    
    local config_model_name="$model_name"
    [[ "$use_default_config" == true ]] && config_model_name="default"
    
    local model_config=$(get_json_object ".models.\"$config_model_name\"")
    local conditional_config=$(echo "$model_config" | jq -r '.conditional // {}')
    
    # Check if model has mode-specific configuration
    if echo "$conditional_config" | jq -e ".\"$mode\"" >/dev/null 2>&1; then
        # Use mode-specific configuration
        local mode_config=$(echo "$conditional_config" | jq -r ".\"$mode\"")
        
        # Add mode-specific arguments
        local mode_args=$(echo "$mode_config" | jq -r '.args[]? // empty')
        while IFS= read -r arg; do
            [[ -n "$arg" ]] && CMD_ARGS+=("$arg")
        done <<< "$mode_args"
        
        # Add additional configuration
        local additional_config=$(echo "$mode_config" | jq -r '.additional_config // empty')
        if [[ -n "$additional_config" && "$additional_config" != "null" && "$additional_config" != "{}" ]]; then
            CMD_ARGS+=("--additional-config" "$additional_config")
        fi
        
        # Add compilation config (with architecture specificity)
        local compilation_config=$(echo "$mode_config" | jq -r '.compilation_config // empty')
        if [[ -n "$compilation_config" && "$compilation_config" != "null" ]]; then
            local arch=$(detect_architecture)
            local arch_specific=$(echo "$mode_config" | jq -r ".arch_specific.\"$arch\".compilation_config // empty")
            
            if [[ "$arch_specific" == "true" ]]; then
                CMD_ARGS+=("--compilation-config" "$compilation_config")
            fi
        fi
    else
        # Use default model arguments
        local model_args=$(echo "$model_config" | jq -r '.args[]? // empty')
        while IFS= read -r arg; do
            [[ -n "$arg" ]] && CMD_ARGS+=("$arg")
        done <<< "$model_args"
    fi
}

add_mode_arguments() {
    local model_name="$1"
    local mode="$2"
    
    local mode_config=$(get_json_object ".modes.$mode")
    if [[ "$mode" == "xlite" ]]; then
        # Install mode-specific packages
        local mode_packages=$(echo "$mode_config" | jq -r '.packages[]? // empty')
        while IFS= read -r package; do
            [[ -n "$package" ]] && pip install "$package" || log "Warning: Failed to install mode package: $package"
        done <<< "$mode_packages"
    fi
    
    # Add mode-specific arguments
    local mode_args=$(echo "$mode_config" | jq -r '.args[]? // empty')
    while IFS= read -r arg; do
        [[ -n "$arg" ]] && CMD_ARGS+=("$arg")
    done <<< "$mode_args"
    
    # Handle mode-specific conditional configurations
    local conditional=$(echo "$mode_config" | jq -r '.conditional // {}')
    if [[ "$conditional" != "{}" ]]; then
        # Check for model-specific configuration
        if echo "$conditional" | jq -e ".\"$model_name\"" >/dev/null 2>&1; then
            local model_specific=$(echo "$conditional" | jq -r ".\"$model_name\"")
            local additional_config=$(echo "$model_specific" | jq -r '.additional_config // empty')
            [[ -n "$additional_config" && "$additional_config" != "null" ]] && CMD_ARGS+=("--additional-config" "$additional_config")
        else
            # Use default configuration
            local default_config=$(echo "$conditional" | jq -r '.default // empty')
            local additional_config=$(echo "$default_config" | jq -r '.additional_config // empty')
            [[ -n "$additional_config" && "$additional_config" != "null" ]] && CMD_ARGS+=("--additional-config" "$additional_config")
        fi
    fi
    
    # Add mode-level additional configuration
    local additional_config=$(echo "$mode_config" | jq -r '.additional_config // empty')
    if [[ -n "$additional_config" && "$additional_config" != "null" && "$additional_config" != "{}" ]]; then
        CMD_ARGS+=("--additional-config" "$additional_config")
    fi
}


# Logging and monitoring
log_environment() {
    log "=== Environment Variables ==="
    env | grep VLLM_ASCEND | while IFS= read -r line; do
        log "$line"
    done
    log "=========================="
}

log_command_args() {
    log "=== Command Arguments ==="
    for i in "${!CMD_ARGS[@]}"; do
        log "CMD_ARGS[$i] = '${CMD_ARGS[i]}'"
    done
    log "Final command: vllm serve ${CMD_ARGS[*]}"
    log "======================="
}

# Main execution function
main() {
    local model_name=$model_name
    local mode=$mode
    local model_path=$model_path
    local npu_input=$npu_count
    local port=$port
    
    # Validation
    check_dependencies
    validate_config
    
    # Parameter validation
    [[ -z "$model_name" ]] && error_exit "Model name is required"
    [[ -z "$model_path" ]] && error_exit "Model path is required"
    
    # Check if model exists in configuration, fallback to default if not
    local config_file="${CONFIG_FILE:-$(dirname "$0")/vllm_config.json}"
    if ! jq -e ".models.\"$model_name\"" "$config_file" >/dev/null; then
        log "WARNING: Model '$model_name' not found in configuration, using default configuration"
        log "Available models: $(jq -r '.models | keys[]' "$config_file" | tr '\n' ' ')"
        use_default_config=true
    else
        use_default_config=false
    fi
    
    log "Starting VLLM server with model: $model_name, mode: $mode, NPU: $npu_input, port: $port"
    
    # System detection
    local arch=$(detect_architecture)
    local version_key=$(get_vllm_version)
    log "Architecture: $arch, Version key: $version_key"
    
    # Installation and setup
    install_packages "$arch" "$version_key"
    setup_model_specific_packages "$model_name" "$arch"
    
    # Environment and command setup
    set_environment_variables "$model_name" "$mode"
    build_cmd_args "$model_name" "$mode" "$port" "$model_path" "$npu_input"

    # Logging
    log_environment
    log_command_args
    
    # Start VLLM server
    log "Starting VLLM serve..."
    echo "port=$port"
    echo "model_path=$model_path"
    echo  "model_name=$model_name"
    echo  "npu_count=$npu_input"
    vllm serve "${CMD_ARGS[@]}" || error_exit "VLLM serve failed"
    # vllm serve --port $port $model_path \
    #     --served-model-name $model_name \
    #     --tensor-parallel-size $npu_count \
    #     --disable-log-stats \
    #     --disable-log-requests \
    #      "${CMD_ARGS[@]}" || error_exit "VLLM serve failed"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi