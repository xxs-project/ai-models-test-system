#!/bin/bash

PROXY_IP="192.168.184.107"  #根据自己的代理配置
PROXY_PORT="10082"          #根据自己的代理配置

# 获取当前架构
ARCH=$(uname -m)

#vllm▒~I~H▒~\▒为0.11.0以▒~J▒~W▒▒~L▒~G~G▒~T▒▒~Q▒令▒~V▒▒~O▒~I▒▒~L▒~@▒▒~C▒▒~K▒~U

VLLM_ASCEND_VERSION=$(pip list | grep vllm_ascend | awk '{print $2}')

if [ -z "$VLLM_ASCEND_VERSION" ]; then
    echo "Error:not install vllm" >> "$EXEC_LOG"
    exit 1
fi

echo "VLLM_ASCEND_VERSION=$VLLM_ASCEND_VERSION"

VLLM_ASCEND_VERSION=$(echo "$VLLM_ASCEND_VERSION" | sed 's/\+[a-zA-Z0-9]*$//')
VLLM_VERSION=$(echo "$VLLM_ASCEND_VERSION" | sed 's/\+[a-zA-Z0-9]*$//' | grep -oE '^[0-9]+\.[0-9]+\.[0-9]+')

if [ "$VLLM_VERSION" == "0.11.0" ]; then
    TORCH_NPU_VERSION="2.7.1"
    RELEASE_PATH="/data/xxs/release/1124"
elif [ "$VLLM_VERSION" == "0.12.0" ]; then
    TORCH_NPU_VERSION="2.8.0"
    RELEASE_PATH="/data/xxs/release/0114_master"
else
    TORCH_NPU_VERSION="2.8.0"
    VLLM_VERSION="0.12.0"
    VLLM_ASCEND_VERSION="0.12.0rc1"
    RELEASE_PATH="/data/xxs/release/0114_master"
fi

# 根据架构选择安装包
if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm" ]]; then
  echo "检测到 ARM 架构，安装 ARM 包..."
   PACKAGES=(
    "vllm-${VLLM_VERSION}+empty-py3-none-any.whl"
    "vllm_ascend-${VLLM_ASCEND_VERSION}-cp38-abi3-linux_aarch64.whl"
    "torch_npu-${TORCH_NPU_VERSION}-cp311-cp311-linux_aarch64.whl"
  )

  CANN_PACKAGES=(
    "CANN-custom_ops--linux-ascend910b.aarch64.run"
  )
  release_dir="$RELEASE_PATH/arm"  #根据目录配置
elif [[ "$ARCH" == "x86_64" || "$ARCH" == "i686" ]]; then
  echo "检测到 x86 架构，安装 x86 包..."
  PACKAGES=(
    "vllm-${VLLM_VERSION}+empty-py3-none-any.whl"
    "vllm_ascend-${VLLM_ASCEND_VERSION}-cp38-abi3-linux_x86_64.whl"
    "torch_npu-${TORCH_NPU_VERSION}-cp311-cp311-linux_x86_64.whl"
  )
  CANN_PACKAGES=(
    "CANN-custom_ops--linux-ascend910b.x86_64.run"
  )

  release_dir="$RELEASE_PATH/x86"  #根据目录配置
else
    echo "不支持的架构: $ARCH"
    exit 1
fi

#安装依赖包
#export https_proxy=http://$PROXY_IP:$PROXY_PORT 
#export http_proxy=http://$PROXY_IP:$PROXY_PORT 
#export no_proxy="localhost,127.0.0.1,*fusionos*" 
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple/
pip uninstall -y torch_npu vllm vllm_ascend || exit 1
cd $release_dir
pip install  "${PACKAGES[@]}" || exit 1
pip install arctic-inference || exit 1
chmod +x "${CANN_PACKAGES[@]}" 
./"${CANN_PACKAGES[@]}"
# 安装后清除代理
#unset https_proxy http_proxy

if [ "$model_name" == "DeepSeek-V3.2-Exp-w8a8" ]; then
    pip install custom_ops-1.0-cp311-cp311-linux_x86_64.whl
fi

if [ "$model_name" == "Qwen3-Next-80B-A3B-Instruct" ]; then
    pip uninstall triton -y
    BISHENG_NAME="Ascend-BiSheng-toolkit_$(uname -i)_20251225.run"
    BISHENG_URL="https://vllm-ascend.obs.cn-north-4.myhuaweicloud.com/vllm-ascend/${BISHENG_NAME}"
    wget $BISHENG_URL
    chmod a+x $BISHENG_NAME
    mkdir -p /usr/local/Ascend/8.5.0
    ./$BISHENG_NAME --install --install-path=/usr/local/Ascend/8.5.0
    source /usr/local/Ascend/8.5.0/share/info/ascendnpu-ir/bin/set_env.sh
    wget https://vllm-ascend.obs.cn-north-4.myhuaweicloud.com/vllm-ascend/triton_ascend-3.2.0.dev20251229-cp311-cp311-manylinux_2_27_$(uname -i).manylinux_2_28_$(uname -i).whl
    pip install triton_ascend-3.2.0.dev20251229-cp311-cp311-manylinux_2_27_$(uname -i).manylinux_2_28_$(uname -i).whl
fi



# 初始化参数为空
quantization=""
max_model_len=""
max_num_batched_tokens=""
trust_remote_code=""
no_enable_prefix_caching=""
gpu_memory_utilization=""
seed=""
dtype=""
load_format=""
enforce_eager=""
limit_mm_per_prompt=""
swap_space=""
COMPILATION_CONFIG=''
block_size=""
max_num_seqs=""
# 统一处理所有模型的参数设置
case "$model_name" in
    # DeepSeek 系列模型
    "DeepSeek-R1-0528" | "DeepSeek-V3-0324" | "DeepSeek-V3.1-base"  | "DeepSeek-V3.1")
        export VLLM_ASCEND_ENABLE_NZ=0
        quantization="--quantization ascend"
        ;;
    "DeepSeek-R1")
        #export ASCEND_LAUNCH_BLOCKING=1
	    export VLLM_ASCEND_ENABLE_NZ=0
	    quantization="--quantization ascend"

        max_model_len="--max-model-len 16000"
        max_num_batched_tokens="--max-num-batched-tokens 16000"
        ;;
    # Qwen3 系列模型（仅启用量化）
    "Qwen3-32B-FP8" | "Qwen3-14B-FP8" | "Qwen3-8B-FP8" | "Qwen3-4B-FP8" | "Qwen3-1.7B-FP8" | "Qwen3-0.6B-FP8")
        export VLLM_ASCEND_ENABLE_NZ=0
        quantization="--quantization ascend"
        ;;
    # Qwen -30B-A3B-FP8 模型（启用量化和 max-model-len）
    "Qwen3-30B-A3B-FP8")
        export VLLM_ASCEND_ENABLE_NZ=0
        quantization="--quantization ascend"
        #max_model_len="--max-model-len 16000"
        ;;
    "Qwen3-32B-NVFP4")
        export VLLM_ASCEND_ENABLE_NZ=0
    	quantization="--quantization ascend"
        ;;
    "DeepSeek-V3.2-Exp-w8a8")
        export VLLM_ASCEND_ENABLE_NZ=0
        seed="--seed 1024"
        quantization="--quantization ascend"
        max_model_len="--max-model-len 17450"
        max_num_batched_tokens="--max-num-batched-tokens 17450"
        trust_remote_code="--trust-remote-code"
        no_enable_prefix_caching="--no-enable-prefix-caching"
        gpu_memory_utilization="--gpu-memory-utilization 0.9"
        ;;
    "Qwen3-Next-80B-A3B-Instruct")
        export VLLM_ASCEND_ENABLE_NZ=0
        gpu_memory_utilization="--gpu-memory-utilization 0.7"
        ;;
    "Qwen3-VL-32B-Instruct" | "Qwen3-VL-30B-A3B-Instruct" | "Qwen3-VL-8B-Instruct")
        export VLLM_ASCEND_ENABLE_NZ=0
        export VLLM_ASCEND_ENABLE_MATMUL_ALLREDUCE=1
        export VLLM_ASCEND_ENABLE_PREFETCH_MLP=1
        export VLLM_ASCEND_ENABLE_DENSE_OPTIMIZE=1
        dtype="--dtype bfloat16"
        max_model_len="--max-model-len 16384"
        max_num_batched_tokens="--max-num-batched-tokens 16384"
        gpu_memory_utilization="--gpu-memory-utilization 0.9"
        conditional_args+=(--limit-mm-per-prompt '{"image":4, "video":0}')
	    swap_space="--swap-space 16"
        ;;
    "Qwen3-32B")
        export VLLM_ASCEND_ENABLE_NZ=0
        if [ "$mode"=="eager" ]; then
        	export VLLM_ASCEND_ENABLE_NZ=0
       		export VLLM_ASCEND_ENABLE_MATMUL_ALLREDUCE=1
        	max_num_batched_tokens="--max-num-batched-tokens 40960"
            ASCEND_SCHEDULER_CONFIG='{"ascend_scheduler_config": {"enabled": true}}'
            if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm" ]]; then
                 COMPILATION_CONFIG='{"cudagraph_mode": "FULL_DECODE_ONLY", "cudagraph_capture_sizes": [1,2,4,8,16,24,32,48,60,64,72,76,128,256]}'
                 conditional_args+=(
                    --additional-config "$ASCEND_SCHEDULER_CONFIG"
                    --compilation-config "$COMPILATION_CONFIG"
                 )
            else
                conditional_args+=(
                    --additional-config "$ASCEND_SCHEDULER_CONFIG"
                )
            fi
	    else
		    load_format="--load-format dummy"
	    fi
            swap_space="--swap-space 16"
        ;;
    *)
        export VLLM_ASCEND_ENABLE_NZ=0
        load_format="--load-format dummy"
        ;;
esac

# 根据mode设置不同的参数
case "$mode" in
    "eager")
        enforce_eager="--enforce-eager"
        ;;
    "torchair")
        if [ "$model_name" == "DeepSeek-V3.2-Exp-w8a8" ]; then
             conditional_args+=(--additional-config '{"ascend_scheduler_config":{"enabled":true},"torchair_graph_config":{"enabled":true,"graph_batch_sizes":[16]}}')
        else
            conditional_args+=(--additional-config '{"torchair_graph_config":{"enabled":true, "graph_batch_sizes_init":true}, "ascend_scheduler_config":{"enabled":true}}')
        fi
        ;;
    "xlite")
        pip install xlite
        conditional_args+=(--additional-config '{"xlite_graph_config": {"enabled": true, "full_mode": true}}')
        block_size="--block-size 128"
	    ;;
    *)
        # 默认使用aclgraph模式
        additional_config_arg=""
        enforce_eager=""                
        ;;
esac


# 检查 VLLM_ASCEND 相关环境变量
if [ -n "$VLLM_ASCEND_ENABLE_MATMUL_ALLREDUCE" ]; then
    echo "VLLM_ASCEND_ENABLE_MATMUL_ALLREDUCE = $VLLM_ASCEND_ENABLE_MATMUL_ALLREDUCE"
else
    echo "VLLM_ASCEND_ENABLE_MATMUL_ALLREDUCE = (未设置)"
fi

if [ -n "$VLLM_ASCEND_ENABLE_PREFETCH_MLP" ]; then
    echo "VLLM_ASCEND_ENABLE_PREFETCH_MLP = $VLLM_ASCEND_ENABLE_PREFETCH_MLP"
else
    echo "VLLM_ASCEND_ENABLE_PREFETCH_MLP = (未设置)"
fi

if [ -n "$VLLM_ASCEND_ENABLE_DENSE_OPTIMIZE" ]; then
    echo "VLLM_ASCEND_ENABLE_DENSE_OPTIMIZE = $VLLM_ASCEND_ENABLE_DENSE_OPTIMIZE"
else
    echo "VLLM_ASCEND_ENABLE_DENSE_OPTIMIZE = (未设置)"
fi

if [ -n "$VLLM_ASCEND_ENABLE_NZ" ]; then
    echo "VLLM_ASCEND_ENABLE_NZ = $VLLM_ASCEND_ENABLE_NZ"
else
    echo "VLLM_ASCEND_ENABLE_NZ = (未设置)"
fi

echo "start serve"
if [ "$mode" == "xlite" ]; then
    vllm serve --port $port $model_path \
            --served-model-name $model_name \
            --tensor-parallel-size $npu_count \
            --disable-log-stats \
            --disable-log-requests \
            $swap_space \
            $seed \
            $dtype \
            $trust_remote_code \
            $no_enable_prefix_caching \
            $gpu_memory_utilization \
            $load_format \
            $quantization \
            $enforce_eager \
            $block_size \
            "${conditional_args[@]}"
else
    vllm serve --port $port $model_path \
            --served-model-name $model_name \
            --tensor-parallel-size $npu_count \
            --disable-log-stats \
            --disable-log-requests \
            $swap_space \
            $seed \
            $dtype \
            $max_model_len \
            $max_num_batched_tokens \
            $trust_remote_code \
            $no_enable_prefix_caching \
            $gpu_memory_utilization \
            $load_format \
            $quantization \
            $enforce_eager \
            "${conditional_args[@]}"
fi

