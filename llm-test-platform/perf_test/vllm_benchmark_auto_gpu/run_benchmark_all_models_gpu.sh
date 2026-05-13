#!/bin/bash

# =============================================================================
# VLLM基准测试自动化脚本 (NVIDIA GPU版本)
# 
# 功能说明:
# - 支持多模型并行测试，自动分配GPU资源
# - 推理服务容器化部署，独立端口管理
# - 测试完成后自动清理资源，释放GPU供后续任务使用
# - 完整的错误处理和日志记录
#
# 作者: AI Assistant
# 版本: v1.0
# 更新: 2025-01-20
# =============================================================================

# ======================== 配置常量 ========================
DEFAULT_HOST="127.0.0.1"
DEFAULT_PORT_RANGE_START="2800"
DEFAULT_PORT_RANGE_END="2899"
DEFAULT_TEMPERATURE="0.65"
DEFAULT_REQUEST_RATE="0"
DEFAULT_DOCKER_TAG="latest"
PROXY_IP="192.168.110.10"
PROXY_PORT="10082"
DEFAULT_COMMUNITIES="0"
DEFAULT_DIR=$(pwd)
echo "DEFAULT_DIR=${DEFAULT_DIR}"

# ======================== 全局变量 ========================
BASE_MODEL_PATH=""          # 模型文件基础路径
RESULT_DIR=""               # 测试结果输出目录
DOCKER_TAG=""               # Docker镜像标签
DEBUG_MODE=false            # 调试模式开关
SINGLE_MODEL=""              # 单模型测试开关
SINGLE_GPU_COUNT=""         # 单模型测试GPU卡数
SINGLE_MODE=""              # 单模型测试模式

# ======================== 测试配置矩阵 ========================
# 格式: "模型名称:GPU卡数:模式"
# 说明: 
# - 1卡模型: 小型模型，快速测试
# - 2卡模型: 中型模型，平衡性能
# - 4卡模型: 大型模型，高性能需求  
# - 8卡模型: 超大型模型，最高性能
declare -a TEST_CONFIGS=(
    "Qwen3-32B:4:aclgraph"
    "Qwen3-32B:4:eager"
    "Qwen3-32B:4:xlite"
    "Qwen3-Next-80B-A3B-Instruct:4:eager"
    "Qwen3-VL-30B-A3B-Instruct:4:aclgraph"
    "Qwen3-VL-30B-A3B-Instruct:4:eager"
    "Qwen3-VL-32B-Instruct:4:aclgraph"
    "Qwen3-VL-32B-Instruct:4:eager"
    "Qwen3-32B-NVFP4:4:aclgraph"
    "Qwen3-32B-NVFP4:4:eager"
    "Qwen2.5-72B:4:aclgraph"
    "Qwen2.5-72B:4:eager"
    "Qwen2.5-72B:4:xlite"
    "Qwen2.5-32B:4:aclgraph"
    "Qwen2.5-32B:4:eager"
    "Qwen2.5-32B:4:xlite"
    "Qwen3-30B-A3B:2:aclgraph"
    "Qwen3-30B-A3B:2:eager"
    "Qwen3-14B:2:aclgraph"
    "Qwen3-14B:2:eager"
    "Qwen3-32B-NVFP4:2:aclgraph"
    "Qwen3-32B-NVFP4:2:eager"
    "Qwen2.5-14B:2:aclgraph"
    "Qwen2.5-14B:2:eager"
    "Qwen2.5-14B:2:xlite"
    "Qwen_Qwen3-32B-FP8:2:aclgraph"
    "Qwen_Qwen3-32B-FP8:2:eager"
    "Qwen_Qwen3-30B-A3B-FP8:2:aclgraph"
    "Qwen_Qwen3-30B-A3B-FP8:2:eager"
    "Qwen3-14B-FP8:1:aclgraph"
    "Qwen3-14B-FP8:1:eager"
    "Qwen3-8B:1:aclgraph"
    "Qwen3-8B:1:eager"
    "Qwen3-8B-FP8:1:aclgraph"
    "Qwen3-8B-FP8:1:eager"
    "Qwen3-4B:1:aclgraph"
    "Qwen3-4B:1:eager"
    "Qwen3-4B-FP8:1:aclgraph"
    "Qwen3-4B-FP8:1:eager"
    "Qwen3-1.7B:1:aclgraph"
    "Qwen3-1.7B:1:eager"
    "Qwen3-1.7B-FP8:1:aclgraph"
    "Qwen3-1.7B-FP8:1:eager"
    "Qwen3-0.6B:1:aclgraph"
    "Qwen3-0.6B:1:eager"
    "Qwen3-0.6B-FP8:1:aclgraph"
    "Qwen3-0.6B-FP8:1:eager"
    "Qwen3-VL-8B-Instruct:1:aclgraph"
    "Qwen3-VL-8B-Instruct:1:eager"
    "Qwen2.5-7B:1:aclgraph"
    "Qwen2.5-7B:1:eager"
    "Qwen2.5-7B:1:xlite"
    "Qwen2.5-3B:1:aclgraph"
    "Qwen2.5-3B:1:eager"
    "Qwen2.5-3B:1:xlite"
    "Qwen2.5-1.5B:1:aclgraph"
    "Qwen2.5-1.5B:1:eager"
    "Qwen2.5-1.5B:1:xlite"
    "Qwen2.5-0.5B:1:aclgraph"
    "Qwen2.5-0.5B:1:eager"
    "Qwen2.5-0.5B:1:xlite"
    "Qwen3-32B-NVFP4:1:aclgraph"
    "Qwen3-32B-NVFP4:1:eager"
    "DeepSeek-R1-Distill-Qwen-1.5B:1:aclgraph"
    "DeepSeek-R1-Distill-Qwen-7B:1:aclgraph"
    "DeepSeek-R1-Distill-Llama-8B:1:aclgraph"
    "DeepSeek-R1-Distill-Qwen-14B:2:aclgraph"
    "DeepSeek-R1-Distill-Qwen-32B:4:aclgraph"
    "DeepSeek-R1-Distill-Llama-70B:8:aclgraph"
    "Qwen2.5-32B:4:aclgraph"
    "QwQ-32B:4:aclgraph"
    "Qwen2.5-32B-Instruct:4:aclgraph"
    "Qwen3-32B-w8a8-MindIE:2:aclgraph"
	"DeepSeek-V3-0324:16:aclgraph"
    "aleoyang_Qwen3-32B-w8a8-MindIE:2:aclgraph"
    "Qwen3-235B-A22B:16:aclgraph"
    "DeepSeek-V3.2-Exp-w8a8:16:torchair"
    "DeepSeek-R1:16:eager"
)


# ======================== 运行时状态管理 ========================
declare -a AVAILABLE_GPUS=()       # 系统中所有可用的GPU设备ID
declare -a RUNNING_BENCHMARKS=()   # 运行中的测试任务: "pid:model_name:container_name:port:allocated_gpus"
declare -a ALLOCATED_PORTS=()      # 已分配的端口列表，避免冲突

# ======================== 清理和退出处理 ========================
# 脚本退出时的资源清理函数
cleanup_on_exit() {
    local exit_code=$?
    log "warning" "收到退出信号，开始清理资源..."
    
    # 终止所有运行中的性能测试进程
    if [ ${#RUNNING_BENCHMARKS[@]} -gt 0 ]; then
        log "info" "终止运行中的性能测试进程..."
        for benchmark_info in "${RUNNING_BENCHMARKS[@]}"; do
            IFS=':' read -r pid model_name container_name port mode gpu_count allocated_gpus <<< "$benchmark_info"
            if kill -0 "$pid" 2>/dev/null; then
                log "debug" "终止性能测试进程: model_name:$model_name mode:$mode gpu_num:$gpu_count (PID: $pid)"
                kill -TERM "$pid" 2>/dev/null || true
                sleep 2
                if kill -0 "$pid" 2>/dev/null; then
                    kill -KILL "$pid" 2>/dev/null || true
                fi
            fi
            cleanup_container "$container_name"
        done
    fi
    
    RUNNING_BENCHMARKS=()
    ALLOCATED_PORTS=()

    log "success" "资源清理完成"

    if [ $exit_code -ne 0 ]; then
        log "error" "脚本异常退出 (退出码: $exit_code)"
    fi

    exit $exit_code
}
trap cleanup_on_exit SIGINT SIGTERM EXIT

# ======================== 工具函数 ========================
get_model_identifier() {
    local model_name="$1"
    echo "$model_name" | tr '[:upper:]' '[:lower:]' | tr -d '.-'
}

show_help() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -b, --base-model-path <path>  Base path where all models are stored (required)"
    echo "  -r, --result-dir <dir>        Results directory (required)"
    echo "  -t, --temperature <temp>      Temperature setting (default: $DEFAULT_TEMPERATURE)"
    echo "  -R, --request-rate <rate>     Request rate (default: $DEFAULT_REQUEST_RATE)"
    echo "  -d, --docker-tag <version>    VLLM version (default: $DEFAULT_DOCKER_TAG)"
    echo "  -m, --model <name>            Single Model name (default: $SINGLE_MODEL_NAME)"
    echo "  -n, --gpu-count <num>         GPU count for single model test (default: $DEFAULT_NUM_WORKERS)"
    echo "  --mode <mode>                 Execution mode: eager, aclgraph, xlite (default: aclgraph)"
    echo "  -c, --communities <num>       Number of communities to use (default: $DEFAULT_COMMUNITIES)"
    echo "  --debug                       Enable debug mode"
    echo "  -h, --help                    Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 -b /path/to/models -r /path/to/results"
    echo ""
    echo "注意: 使用 Ctrl+C 中断脚本时会自动清理所有容器和进程"
    exit 1
}

# ======================== 日志系统 ========================
log() {
    local level="$1"
    local message="$2"
    local task_prefix=""
    if [ -n "$3" ]; then
        task_prefix="[$3] "
    fi

    case "$level" in
        info)
            echo -e "🔷 ${task_prefix}$message"
            ;;
        success)
            echo -e "✅ ${task_prefix}$message"
            ;;
        warning)
            echo -e "⚠️  ${task_prefix}$message"
            ;;
        error)
            echo -e "❌ ${task_prefix}$message" >&2
            ;;
        debug)
            if [ "$DEBUG_MODE" = true ]; then
                echo -e "🔍 DEBUG: ${task_prefix}$message" >&2
            fi
            ;;
        *)
            echo -e "${task_prefix}$message"
            ;;
    esac
}

# ======================== 容器管理 ========================
cleanup_container() {
    local container_name="$1"
    
    if [ -z "$container_name" ]; then
        log "warning" "容器名称为空，跳过清理操作"
        return 0
    fi
    
    container_name=$(echo "$container_name" | tr -d '\n' | tr -s ' ')
    
    if [[ ! "$container_name" =~ ^vllm_nvidia_[a-z0-9_]+$ ]]; then
        log "warning" "容器名称格式无效: $container_name"
        return 0
    fi
    
    log "debug" "尝试清理容器: $container_name"
    
    if docker ps -a --format "{{.Names}}" | grep -qx "$container_name"; then
        log "debug" "正在删除容器: $container_name"
        if docker rm -f "$container_name" >/dev/null 2>&1; then
            log "debug" "容器删除成功: $container_name"
            return 0
        else
            log "warning" "容器删除失败: $container_name"
            return 1
        fi
    else
        log "debug" "容器不存在或已删除: $container_name"
        return 0
    fi
}

# ======================== GPU资源管理 ========================
get_current_available_gpus() {
    nvidia-smi --query-gpu=index,utilization.gpu --format=csv,noheader 2>/dev/null | \
    grep "0 %" | grep -o "^[0-9]*" | tr '\n' ' '
}

# 等待并获取足够的GPU资源
wait_for_available_gpus() {
    local required_count="$1"
    local model_name="$2"
    local max_wait_minutes=600
    local wait_minutes=0

    while true; do
        local available_gpus_str=$(get_current_available_gpus)
        [ $? -eq 0 ] || return 1
        
        read -ra available_gpus <<< "$available_gpus_str"
        if [ ${#available_gpus[@]} -ge $required_count ]; then
            local selected_gpus=("${available_gpus[@]:0:$required_count}")
            local gpu_list=$(IFS=,; echo "${selected_gpus[*]}")
            echo "$gpu_list"
            return 0
        fi
        
        [ $wait_minutes -le $max_wait_minutes ] || return 1
        ((wait_minutes++))
        sleep 60
    done
}

# 检查推理服务是否就绪
wait_for_service_ready() {
    local host="$1"
    local port="$2"
    local model_name="$3"
    local max_wait_seconds=1200
    local wait_time=0
    local check_interval=10
    
    log "info" "正在等待推理服务启动 (最大等待: ${max_wait_seconds}s)" "$model_name"
    
    while [ $wait_time -lt $max_wait_seconds ]; do
        models_response=$(curl -s -w "%{http_code}" -o /dev/null --max-time 10 "http://$host:$port/v1/models" 2>/dev/null)
        if [ "$models_response" = "200" ]; then
            log "success" "推理服务已就绪 (耗时: ${wait_time}秒)" "$model_name"
            return 0
        fi
        
        sleep $check_interval
        wait_time=$((wait_time + check_interval))
    done
    
    log "error" "推理服务启动超时 (等待时间: ${max_wait_seconds}s)" "$model_name"
    return 1
}

# ======================== GPU设备管理 ========================
init_gpu_devices() {
    local gpu_info
    gpu_info=$(nvidia-smi --query-gpu=index,name,driver_version --format=csv,noheader 2>/dev/null) || {
        log "error" "无法获取GPU设备信息，请检查NVIDIA驱动安装"
        return 1
    }
    AVAILABLE_GPUS=()
    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            local gpu_id=$(echo "$line" | cut -d',' -f1 | tr -d ' ')
            AVAILABLE_GPUS+=("$gpu_id")
        fi
    done <<< "$gpu_info"
    
    if [ ${#AVAILABLE_GPUS[@]} -eq 0 ]; then
        log "error" "未检测到可用的GPU设备"
        return 1
    fi
    log "info" "检测到GPU设备: ${AVAILABLE_GPUS[*]} (共 ${#AVAILABLE_GPUS[@]} 张)"
    return 0
}

# ======================== 端口管理 ========================
get_available_port() {
    local port
    for ((port=DEFAULT_PORT_RANGE_START; port<=DEFAULT_PORT_RANGE_END; port++)); do
        if ! netstat -tuln 2>/dev/null | grep -q ":$port " && \
           ! ss -tuln 2>/dev/null | grep -q ":$port " && \
           [[ ! " ${ALLOCATED_PORTS[*]} " =~ " $port " ]]; then
            ALLOCATED_PORTS+=("$port")
            echo "$port"
            return 0
        fi
    done
    
    log "error" "无可用端口 (范围: $DEFAULT_PORT_RANGE_START-$DEFAULT_PORT_RANGE_END)"
    return 1
}

release_port() {
    local port="$1"
    local new_allocated_ports=()
    
    for allocated_port in "${ALLOCATED_PORTS[@]}"; do
        if [ "$allocated_port" != "$port" ]; then
            new_allocated_ports+=("$allocated_port")
        fi
    done
    
    ALLOCATED_PORTS=("${new_allocated_ports[@]}")
    log "debug" "已释放端口: $port"
}

# ======================== 进程互斥检查 ========================
check_process_mutex() {
    echo "========================================"
    echo "🔍 开始进程互斥检查"
    echo "========================================"

    local SCRIPT_NAME=$(basename "$0")
    local CURRENT_PID=$$
    echo "当前脚本名称: $SCRIPT_NAME"
    echo "当前进程PID: $CURRENT_PID"

    local CURRENT_CMD=$(ps -p $CURRENT_PID -o args= 2>/dev/null | head -1)
    echo "当前进程命令: $CURRENT_CMD"

    local ALL_PIDS=$(pgrep -f "bash.*${SCRIPT_NAME}" 2>/dev/null || true)
    echo "所有同名进程PID: [$ALL_PIDS]"

    local RUNNING_PIDS=""
    local PARENT_PID=""
    for pid in $ALL_PIDS; do
        if [ "$pid" != "$CURRENT_PID" ]; then
            local PID_CMD=$(ps -p $pid -o args= 2>/dev/null | head -1)
            if [[ "$PID_CMD" == *"$SCRIPT_NAME"* ]] && [[ "$PID_CMD" != *grep* ]] && [[ "$PID_CMD" != *pgrep* ]]; then
                local CURRENT_PPID=$(ps -p $CURRENT_PID -o ppid= 2>/dev/null | tr -d ' ')
                if [ "$pid" == "$CURRENT_PPID" ]; then
                    PARENT_PID="$pid"
                    echo "  ⚠️  检测到父进程: PID=$pid"
                else
                    RUNNING_PIDS="$RUNNING_PIDS $pid"
                fi
            fi
        fi
    done
    RUNNING_PIDS=$(echo "$RUNNING_PIDS" | tr -s ' ' | sed 's/^ //;s/ $//')
    echo "其他运行进程PID: [$RUNNING_PIDS]"

    if [ -n "$RUNNING_PIDS" ]; then
        echo "检测到的进程详情:"
        for pid in $RUNNING_PIDS; do
            local PID_CMD=$(ps -p $pid -o pid,ppid,etime,args 2>/dev/null || echo "进程已结束")
            echo "  PID: $PID_CMD"
        done
    fi

    if [ -n "$PARENT_PID" ] && [ -z "$RUNNING_PIDS" ]; then
        echo "========================================"
        echo "✅ 仅检测到父进程，无需等待"
        echo "========================================"
        echo "父进程PID: $PARENT_PID"
        echo "这是正常的子进程启动场景，直接执行测试"
        echo "========================================"
        echo "进程互斥检查完成"
        echo "========================================"
        echo ""
        return 0
    fi

    if [ -n "$RUNNING_PIDS" ]; then
        echo "========================================"
        echo "⚠️  检测到冲突进程！"
        echo "========================================"
        echo "冲突进程: $RUNNING_PIDS"
        if [ -n "$PARENT_PID" ]; then
            echo "检测到父进程: $PARENT_PID（父进程不会触发等待）"
        fi
        echo "为避免资源冲突，等待5分钟后继续执行..."
        echo "当前时间: $(date)"
        
        local wait_time=300
        local elapsed=0
        local check_interval=10
        
        while [ $elapsed -lt $wait_time ]; do
            sleep $check_interval
            elapsed=$((elapsed + check_interval))
            local remaining=$((wait_time - elapsed))
            
            if [ $((elapsed % 60)) -eq 0 ] && [ $elapsed -gt 0 ]; then
                echo "[进度] 已等待 $((elapsed / 60))分$((elapsed % 60))秒，剩余 $((remaining / 60))分$((remaining % 60))秒"
            fi
        done
        
        echo "========================================"
        echo "等待完成，重新检查进程状态..."
        echo "========================================"
        echo "重新检查时间: $(date)"
        
        RUNNING_PIDS=$(pgrep -f "$SCRIPT_NAME" | grep -v "^${CURRENT_PID}$" | tr '\n' ' ')
        echo "重新检查结果: [$RUNNING_PIDS]"
        
        if [ -n "$RUNNING_PIDS" ]; then
            echo "⚠️  警告: 仍有进程在运行: $RUNNING_PIDS"
            echo "建议手动检查后再继续，脚本将继续执行，但可能存在资源冲突风险"
        else
            echo "✅ 确认无冲突进程，开始执行测试"
        fi
    else
        echo "✅ 未检测到冲突进程，直接执行测试"
    fi

    echo "========================================"
    echo "进程互斥检查完成"
    echo "========================================"
    echo ""
    
    return 0
}

# ======================== 推理服务管理 ========================
start_inference_service() {
    local model_name="$1"
    local gpu_count="$2"
    local allocated_gpus="$3"
    local port="$4"
    local mode="$5"
    
    local model_path="$BASE_MODEL_PATH/$model_name"
    local safe_model_name=$(echo "$model_name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g')
    local container_name="vllm_nvidia_${safe_model_name}_$(date +%s)_${mode}"
    local docker_image="vllm/vllm-openai:$DOCKER_TAG"
    log "debug" "容器: $container_name | GPU: $allocated_gpus | 端口: $port" "$model_name"
    local log_file="$RESULT_LOG_DIR/${ARCH}_start_vllm_${model_name}_$(date +%s)_${gpu_count}_gpu_${mode}.log"
    
    local container_id=$(docker run -itd --entrypoint "" --privileged --net=host --name $container_name \
        --gpus all \
        -e CUDA_DEVICE_ORDER=PCI_BUS_ID \
        -v $model_path:$model_path \
        -v /data:/data \
        -v /data2:/data2 \
        -e CUDA_VISIBLE_DEVICES=$allocated_gpus \
        -e model_path=$model_path \
        -e model_name=$model_name \
        -e gpu_count=$gpu_count \
        -e port=$port \
        -e mode=$mode \
        -e result_dir=$RESULT_DIR \
        -e code_path=$DEFAULT_DIR \
        $docker_image \
        bash -c "bash '$DEFAULT_DIR/start_vllm_server_nvidia.sh' 2>&1 | tee -a '$log_file'")

    if [ $? -eq 0 ] && [ -n "$container_id" ]; then
        if wait_for_service_ready "$DEFAULT_HOST" "$port" "$model_name" >&2; then
            log "success" "推理服务启动成功 (容器: $container_name)" "$model_name" >&2
            echo "$container_name"
            return 0
        else
            log "error" "服务就绪检查失败，清理容器: $container_name" "$model_name" >&2
            cleanup_container "$container_name"
            return 1
        fi
    else
        log "error" "容器启动失败: $container_id" "$model_name" >&2
        cleanup_container "$container_name"
        return 1
    fi
}

# ======================== 性能测试管理 ========================
run_benchmark_async() {
    local model_name="$1"
    local port="$2"
    local container_name="$3"
    local allocated_gpus="$4"
    local mode="$5"
    local gpu_count="$6"
    local model_path="$BASE_MODEL_PATH/$model_name"
    local benchmark_script="./run_vllmbench.sh"
    
    if [ ! -f "$benchmark_script" ]; then
        log "error" "基准测试脚本不存在: $benchmark_script" "$model_name"
        return 1
    fi
    echo "开始测试模型：$model_name, DEFAULT_DIR=$DEFAULT_DIR"
    (
        local log_file="$RESULT_LOG_DIR/${ARCH}_benchmark_${model_name}_$(date +%s)_${gpu_count}_gpu_${mode}.log"
        log "debug" "测试日志保存到: $log_file" "$model_name"
        echo "Result_dir:$RESULT_DIR"
        echo "Result_log_dir:$RESULT_LOG_DIR"
        
        if [ "$EXECUTABLE_MODULE" == "1" ]; then
             docker exec "$container_name" bash -c "
                echo '🏃 Running perf test...' &&
                cd $DEFAULT_DIR &&
                bash ./run_perf_test.sh \
                    --ip '$DEFAULT_HOST' \
                    --port '$port' \
                    --mode '$mode' \
                    --gpu-count '$gpu_count' \
                    --result-dir '$RESULT_DIR' \
                    --model-path '$model_path' 
            " 2>&1 > "$log_file"
        elif [ "$EXECUTABLE_MODULE" == "2" ]; then
             docker exec "$container_name" bash -c "
                echo '🏃 Running benchmark...' &&
                cd $DEFAULT_DIR &&
                bash ./benchmark.sh \
                    --ip '$DEFAULT_HOST' \
                    --port '$port' \
                    --mode '$mode' \
                    --result-dir '$RESULT_DIR' \
                    --model-path '$model_path' \
                    --temperature '$TEMPERATURE' \
                    --request-rate '$REQUEST_RATE'
            " 2>&1 > "$log_file"
        else
             docker exec "$container_name" bash -c "
                mkdir -p /vllm-workspace/vllm/benchmarks &&
                ln -sf $DEFAULT_DIR/results /vllm-workspace/vllm/benchmarks/results &&
                ln -sf $DEFAULT_DIR/benchmark.sh /vllm-workspace/vllm/benchmarks/benchmark.sh &&
                echo '✅ Symbolic links created successfully' &&
                echo '🏃 Running benchmark...' &&
                cd /vllm-workspace/vllm/benchmarks &&
                bash ./benchmark.sh \
                    --ip '$DEFAULT_HOST' \
                    --port '$port' \
                    --mode '$mode' \
                    --model-path '$model_path' \
                    --temperature '$TEMPERATURE' \
                    --request-rate '$REQUEST_RATE'
            " 2>&1 > "$log_file"
        fi

        local test_result=${PIPESTATUS[0]}
        log "info" "测试完成，清理推理服务容器: $container_name" "$model_name"
        cleanup_container "$container_name"
        local result_file="/tmp/test_result_$(get_model_identifier "$model_name")_${mode}_${gpu_count}.tmp"
        log "debug" "测试脚本执行完成，返回码: $test_result，日志: $log_file" "$model_name"
        if [ $test_result -eq 0 ]; then
            echo "SUCCESS:$model_name:$log_file:$mode" > "$result_file"
        else
            echo "FAILED:$model_name:$log_file:$mode" > "$result_file"
        fi
    ) &
    
    local pid=$!
    RUNNING_BENCHMARKS+=("$pid:$model_name:$container_name:$port:$mode:$gpu_count:$allocated_gpus")
    log "success" "性能测试已启动 (PID: $pid)" "$model_name"
    return 0
}

check_completed_benchmarks() {
    local new_running_benchmarks=()
    
    for benchmark_info in "${RUNNING_BENCHMARKS[@]}"; do
        IFS=':' read -r pid model_name container_name port mode gpu_count _ <<< "$benchmark_info"
        
        if kill -0 "$pid" 2>/dev/null; then
            new_running_benchmarks+=("$benchmark_info")
        else
            local found_result=false
            local result_file="/tmp/test_result_$(get_model_identifier "$model_name")_${mode}_${gpu_count}.tmp"
            if [ -f "$result_file" ]; then
                local result=$(cat "$result_file" 2>/dev/null)
                rm -f "$result_file"
                
                IFS=':' read -r status result_model log_file <<< "$result"
                
                if [[ "$status" == "SUCCESS" ]]; then
                    log "success" "测试完成，日志: $log_file" "$model_name" "$mode" "$gpu_count"
                    successful_tests+=("$model_name:$mode:$gpu_count")
                    found_result=true
                else
                    log "error" "测试失败，查看日志: $log_file" "$model_name" "$mode" "$gpu_count"
                    failed_tests+=("$model_name:$mode:$gpu_count")
                    found_result=true
                fi
            fi

            if [ "$found_result" = false ]; then
                local expected_csv="$RESULT_DIR/${ARCH}_vllm_results_${model_name}_${gpu_count}_gpu_*.csv"
                if ls $expected_csv 1> /dev/null 2>&1; then
                    log "success" "测试完成 (检测到CSV结果文件)" "$model_name" "$mode" "$gpu_count"
                    successful_tests+=("$model_name:$mode:$gpu_count")
                else
                    log "error" "测试异常退出 (无结果文件和CSV文件)" "$model_name" "$mode" "$gpu_count"
                    failed_tests+=("$model_name:$mode:$gpu_count")
                fi
            fi

            release_port "$port"
        fi
    done
    
    RUNNING_BENCHMARKS=("${new_running_benchmarks[@]}")
}

# ======================== 命令行参数处理 ========================
while [[ $# -gt 0 ]]; do
    case "$1" in
        -b|--base-model-path)
            [ -z "$2" ] && { echo "ERROR: --base-model-path requires a value" >&2; show_help; }
            BASE_MODEL_PATH="$2"
            shift 2
            ;;
        -r|--result-dir)
            [ -z "$2" ] && { echo "ERROR: --result-dir requires a value" >&2; show_help; }
            RESULT_DIR="$(cd "$(dirname "$2")" 2>/dev/null && cd "$(basename "$2")" 2>/dev/null && pwd || realpath "$2" 2>/dev/null || echo "$2")"
            shift 2
            ;;
        -t|--temperature)
            [ -z "$2" ] && { echo "ERROR: --temperature requires a value" >&2; show_help; }
            TEMPERATURE="$2"
            shift 2
            ;;
        -R|--request-rate)
            [ -z "$2" ] && { echo "ERROR: --request-rate requires a value" >&2; show_help; }
            REQUEST_RATE="$2"
            shift 2
            ;;
        -d|--docker-tag)
            [ -z "$2" ] && { echo "ERROR: --docker-tag requires a value" >&2; show_help; }
            DOCKER_TAG="$2"
            shift 2
            ;;
        -e|--executable-module)
            EXECUTABLE_MODULE="$2"
            shift 2
            ;;
        -m|--model)
            [ -z "$2" ] && { echo "ERROR: --model requires a value" >&2; show_help; }
            SINGLE_MODEL=("$2")
            shift 2
            ;;
        -n|--gpu-count)
            [ -z "$2" ] && { echo "ERROR: --gpu-count requires a value" >&2; show_help; }
            SINGLE_GPU_COUNT="$2"
            shift 2
            ;;
        --mode)
            [ -z "$2" ] && { echo "ERROR: --mode requires a value" >&2; show_help; }
            SINGLE_MODE="$2"
            shift 2
            ;;
        -c|--communities)
            [ -z "$2" ] && { echo "ERROR: --communities requires a value" >&2; show_help; }
            COMMUNITIES="$2"
            shift 2
            ;;
        --debug)
            DEBUG_MODE=true
            log "debug" "调试模式已启用"
            shift
            ;;
        -p|--port)
            [ -z "$2" ] && { echo "ERROR: --port requires a value" >&2; show_help; }
            FIXED_PORT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1" >&2
            show_help
            ;;
    esac
done

# ======================== 参数验证和环境初始化 ========================
if [ -z "$BASE_MODEL_PATH" ]; then
    echo "ERROR: 模型基础路径为必需参数。请使用 -b 或 --base-model-path" >&2
    show_help
fi

if [ ! -e "$BASE_MODEL_PATH" ] || [ ! -r "$BASE_MODEL_PATH" ]; then
    log "error" "模型基础路径不存在或不可读: $BASE_MODEL_PATH"
    if [ -L "$BASE_MODEL_PATH" ]; then
        log "debug" "检测到符号链接，目标路径: $(readlink -f "$BASE_MODEL_PATH" 2>/dev/null || echo "无法解析")"
    fi
    exit 1
fi

if [ -z "$RESULT_DIR" ]; then
    echo "ERROR: 结果保存目录为必需参数。请使用 -r 或 --result-dir" >&2
    show_help
fi

TEMPERATURE="${TEMPERATURE:-$DEFAULT_TEMPERATURE}"
REQUEST_RATE="${REQUEST_RATE:-$DEFAULT_REQUEST_RATE}"
DOCKER_TAG="${DOCKER_TAG:-$DEFAULT_DOCKER_TAG}"
COMMUNITIES="${COMMUNITIES:-$DEFAULT_COMMUNITIES}"

RESULT_DIR="$RESULT_DIR/vllm_$DOCKER_TAG"
if ! mkdir -p "$RESULT_DIR" 2>/dev/null; then
    log "error" "无法创建VLLM版本目录: '$RESULT_DIR'"
    exit 1
fi

RESULT_LOG_DIR="$RESULT_DIR/log"
if ! mkdir -p "$RESULT_LOG_DIR" 2>/dev/null; then
    log "error" "无法创建log目录: '$RESULT_LOG_DIR'"
    exit 1
fi

ARCH=$(uname -m)

log "info" "配置参数 - 模型路径: $BASE_MODEL_PATH"
log "info" "配置参数 - 结果目录: $RESULT_DIR"
log "info" "配置参数 - 温度: $TEMPERATURE, 请求速率: $REQUEST_RATE"
log "info" "配置参数 - Docker标签: $DOCKER_TAG"

if ! init_gpu_devices; then
    log "error" "无法初始化GPU设备列表，请检查NVIDIA驱动安装"
    exit 1
fi

# ======================== 主执行逻辑 ========================
declare -a successful_tests=()
declare -a failed_tests=()
declare -a skipped_tests=()

if [ -n "$SINGLE_MODEL" ]; then
    log "info" "🚀 开始单模型基准测试"
    log "info" "模型路径: $BASE_MODEL_PATH | 结果目录: $RESULT_DIR"
    log "info" "测试模型: ${SINGLE_MODEL} | GPU: ${SINGLE_GPU_COUNT} 张 | 模式: ${SINGLE_MODE}"
    TEST_CONFIGS=("$SINGLE_MODEL:$SINGLE_GPU_COUNT:$SINGLE_MODE")
else
    log "info" "🚀 开始自动化VLLM基准测试 (NVIDIA GPU版本)"
    log "info" "模型路径: $BASE_MODEL_PATH | 结果目录: $RESULT_DIR"
    log "info" "测试模型数: ${#TEST_CONFIGS[@]} | GPU总计: ${#AVAILABLE_GPUS[@]} 张"
fi

check_process_mutex

for config in "${TEST_CONFIGS[@]}"; do
    IFS=':' read -r model_name gpu_count mode <<< "$config"
    mode="${mode:-aclgraph}"
    log "info" "处理测试配置: $model_name (需要 $gpu_count 卡, 模式: $mode)" "$model_name"
    
    read -ra current_available_gpus <<< "$(get_current_available_gpus)"
    log "info" "GPU状态: 总计${#AVAILABLE_GPUS[@]}张 | 可用${#current_available_gpus[@]}张 | 占用$((${#AVAILABLE_GPUS[@]} - ${#current_available_gpus[@]}))张 | 需要${gpu_count}张" "$model_name"
    
    model_path="$BASE_MODEL_PATH/$model_name"
    if [ ! -e "$model_path" ] || [ ! -r "$model_path" ]; then
        log "warning" "跳过测试: $model_name (模型路径不存在或不可读: $model_path)" "$model_name"
        if [ -L "$model_path" ]; then
            log "debug" "检测到软连接，目标路径: $(readlink -f "$model_path" 2>/dev/null || echo "无法解析")" "$model_name"
        fi
        skipped_tests+=("$model_name:模型路径不存在或不可读")
        continue
    fi
    
    if [ $gpu_count -gt ${#AVAILABLE_GPUS[@]} ]; then
        log "warning" "跳过测试: $model_name (需要 $gpu_count 卡，系统总共只有 ${#AVAILABLE_GPUS[@]} 卡)" "$model_name"
        skipped_tests+=("$model_name:需要${gpu_count}卡, 系统总共只有${#AVAILABLE_GPUS[@]}卡")
        continue
    fi
    
    log "info" "等待GPU资源分配 (需要 $gpu_count 卡)..." "$model_name"
    allocated_gpus=$(wait_for_available_gpus "$gpu_count" "$model_name")
    if [ $? -ne 0 ] || [ -z "$allocated_gpus" ]; then
        log "warning" "跳过测试: $model_name (等待GPU资源超时，当前GPU被占用)" "$model_name"
        skipped_tests+=("$model_name:等待GPU资源超时")
        continue
    fi
    
    if [ -n "$FIXED_PORT" ]; then
        port="$FIXED_PORT"
        log "info" "使用指定端口: $port" "$model_name"
    else
        port=$(get_available_port)
    fi
    if [ $? -ne 0 ] || [ -z "$port" ]; then
        log "error" "无法分配可用端口" "$model_name"
        skipped_tests+=("$model_name:端口分配失败")
        continue
    fi
    
    log "info" "启动推理服务 (端口: $port, GPU: $allocated_gpus)..." "$model_name"
    container_name=$(start_inference_service "$model_name" "$gpu_count" "$allocated_gpus" "$port" "$mode")
    echo "start container_name: $container_name"
    if [ $? -eq 0 ] && [ -n "$container_name" ]; then
        log "info" "启动性能测试..." "${model_name}_${mode}_${gpu_count}_gpu"
        run_benchmark_async "$model_name" "$port" "$container_name" "$allocated_gpus" "$mode" "$gpu_count"
    else
        log "error" "推理服务启动失败" "${model_name}_${mode}_${gpu_count}_gpu"
        release_port "$port"
        failed_tests+=("${model_name}_${mode}_${gpu_count}_gpu:推理服务启动失败")
    fi
done

# ======================== 等待测试完成 ========================
log "info" "⏳ 等待所有性能测试完成..."
while [ ${#RUNNING_BENCHMARKS[@]} -gt 0 ]; do
    check_completed_benchmarks
    
    if [ ${#RUNNING_BENCHMARKS[@]} -gt 0 ]; then
        log "debug" "当前运行中的测试: ${#RUNNING_BENCHMARKS[@]} 个"
        sleep 10
    fi
done

# ======================== 测试结果汇总 ========================
log "info" "📊 测试完成: 成功 ${#successful_tests[@]} | 失败 ${#failed_tests[@]} | 跳过 ${#skipped_tests[@]} (共 ${#TEST_CONFIGS[@]} 个)"

if [ ${#successful_tests[@]} -gt 0 ]; then
    log "success" "✅ 成功的测试:"
    for test in "${successful_tests[@]}"; do
        log "success" "  • $test"
    done
fi

if [ ${#failed_tests[@]} -gt 0 ]; then
    log "error" "❌ 失败的测试:"
    for test in "${failed_tests[@]}"; do
        log "error" "  • $test"
    done
fi

if [ ${#skipped_tests[@]} -gt 0 ]; then
    log "warning" "⚠️  跳过的测试:"
    for test in "${skipped_tests[@]}"; do
        IFS=':' read -r model_name reason <<< "$test"
        log "warning" "  • $model_name ($reason)"
    done
fi

log "info" "🎯 测试会话完成"
log "info" "结果保存到: $RESULT_DIR"

log_files=($(ls /tmp/benchmark_*.log 2>/dev/null || true))
if [ ${#log_files[@]} -gt 0 ]; then
    log "info" "📋 测试日志文件:"
    for log_file in "${log_files[@]}"; do
        file_size=$(du -h "$log_file" 2>/dev/null | cut -f1)
        log "info" "  • $log_file ($file_size)"
    done
fi

if [ ${#failed_tests[@]} -gt 0 ]; then
    log "warning" "存在测试失败，请检查相关日志"
    exit 1
else
    log "success" "所有可执行的测试均已成功完成"
    exit 0
fi
