#!/bin/bash

NPU_DEFAULT_DOCKER_TAG="v0.18.0rc1"
GPU_DEFAULT_DOCKER_TAG="v0.19.0"
CODE_PATH=$(pwd)

MODEL_PATH=""
BASE_URL=""
API_KEY=""
C_VAL=""
MODE=""
PROCESSOR=""

show_help() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --model-path <path>       Model path"
    echo "  --base_url <url>          Base URL"
    echo "  --api_key <key>           API Key"
    echo "  -c <val>                  Configuration string"
    echo "  --mode <mode>             Mode (e.g. eager)"
    echo "  --processor <GPU|NPU>     Processor type (GPU or NPU)"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --model-path)
            MODEL_PATH="$2"
            shift 2
            ;;
        --base_url)
            BASE_URL="$2"
            shift 2
            ;;
        --api_key)
            API_KEY="$2"
            shift 2
            ;;
        -c)
            C_VAL=$(echo "$2" | tr '\n' ' ')
            shift 2
            ;;
        --mode)
            MODE="$2"
            shift 2
            ;;
        --processor)
            PROCESSOR="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo "Unknown option: $1" >&2
            show_help
            ;;
    esac
done

if [ -z "$PROCESSOR" ]; then
    echo "ERROR: --processor is REQUIRED (GPU or NPU)" >&2
    exit 1
fi

get_latest_local_image() {
    local repo="$1"
    local default_tag="$2"
    
    # 获取该仓库的所有 tag，排除 <none> 和 latest
    local tags=$(docker images --format '{{.Tag}}' "$repo" | grep -v '^<none>$' | grep -v 'latest' 2>/dev/null)
    
    local selected_tag=""
    for tag in $tags; do
        # 去掉 v 前缀以便比较
        local clean_tag=$(echo "$tag" | sed -E 's/^v//')
        
        # 判断版本是否大于 0.11.0
        local higher=$(printf "0.11.0\n%s" "$clean_tag" | sort -V | tail -n 1)
        if [ "$higher" == "$clean_tag" ] && [ "$clean_tag" != "0.11.0" ]; then
            if [ -z "$selected_tag" ]; then
                selected_tag="$tag"
            else
                local clean_selected=$(echo "$selected_tag" | sed -E 's/^v//')
                local highest=$(printf "%s\n%s" "$clean_selected" "$clean_tag" | sort -V | tail -n 1)
                if [ "$highest" == "$clean_tag" ]; then
                    selected_tag="$tag"
                fi
            fi
        fi
    done

    if [ -n "$selected_tag" ]; then
        echo "${repo}:${selected_tag}"
    else
        # 如果没有找到满足条件的镜像，则使用默认的 tag
        echo "${repo}:${default_tag}"
    fi
}

if [ "$PROCESSOR" == "GPU" ]; then
    DOCKER_IMAGE=$(get_latest_local_image "vllm/vllm-openai" "$GPU_DEFAULT_DOCKER_TAG")
    DEVICE_ARGS="--gpus all"
elif [ "$PROCESSOR" == "NPU" ]; then
    DOCKER_IMAGE=$(get_latest_local_image "quay.io/ascend/vllm-ascend" "$NPU_DEFAULT_DOCKER_TAG")
    DEVICE_ARGS="--device /dev/davinci_manager --device /dev/devmm_svm --device /dev/hisi_hdc -v /usr/local/dcmi:/usr/local/dcmi -v /usr/local/bin/npu-smi:/usr/local/bin/npu-smi -v /usr/local/Ascend/driver/lib64/:/usr/local/Ascend/driver/lib64/ -v /usr/local/Ascend/driver:/usr/local/Ascend/driver -v /etc/ascend_install.info:/etc/ascend_install.info"
else
    echo "ERROR: Unknown processor type '$PROCESSOR'. Must be GPU or NPU." >&2
    exit 1
fi

MODEL_NAME=$(basename "$MODEL_PATH")
TASK_DIR="vllmbench_container_$(date +%Y%m%d_%H%M%S)"

cleanup() {
    echo -e "\n🛑 Cleaning up..."
    docker rm -f "$TASK_DIR" >/dev/null 2>&1
    exit 130
}
trap cleanup SIGINT SIGTERM SIGHUP SIGQUIT

echo "Starting container for $PROCESSOR using image $DOCKER_IMAGE..."

# Build the inner command arguments
INNER_ARGS=""
[ -n "$MODEL_PATH" ] && INNER_ARGS="$INNER_ARGS --model-path \"$MODEL_PATH\""
[ -n "$BASE_URL" ] && INNER_ARGS="$INNER_ARGS --base_url \"$BASE_URL\""
[ -n "$API_KEY" ] && INNER_ARGS="$INNER_ARGS --api_key \"$API_KEY\""
[ -n "$C_VAL" ] && INNER_ARGS="$INNER_ARGS -c \"$C_VAL\""
[ -n "$MODE" ] && INNER_ARGS="$INNER_ARGS --mode \"$MODE\""

docker run --rm --privileged --net=host --name "$TASK_DIR" $DEVICE_ARGS \
    --entrypoint "" \
    -v "$MODEL_PATH:$MODEL_PATH" \
    -v /root/.cache:/root/.cache \
    -v /root/.pip:/root/.pip \
    -v "$CODE_PATH":"$CODE_PATH" \
    -v /data:/data \
    -v /data2:/data2 \
    -e PIP_CONFIG_FILE=/root/.pip/pip.conf \
    "$DOCKER_IMAGE" \
    bash -c "cd \"$CODE_PATH\" && bash benchmark.sh $INNER_ARGS"

DOCKER_EXIT_CODE=$?

if [ $DOCKER_EXIT_CODE -eq 0 ]; then
    echo -e "\n✅ Performance test completed successfully."
else
    echo -e "\n⚠️  Performance test exited with code: $DOCKER_EXIT_CODE"
    exit $DOCKER_EXIT_CODE
fi
