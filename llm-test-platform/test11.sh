#!/bin/bash
mkdir -p /tmp/fakepip
cat << 'IN' > /tmp/fakepip/pip
#!/bin/bash
echo "vllm 0.11.0"
IN
chmod +x /tmp/fakepip/pip

export PATH="/tmp/fakepip:$PATH"
bash /home/xxs/models-test-system_ucd/llm-test-platform/perf_test/api_benchmark_auto/benchmark.sh -c "1024 1024 1 1" --dataset-args "--dataset-name prefix_repetition --prefix_rate 0.5" --model-path /mnt1/00_weight/Qwen3-32B --base-url http://7.6.52.170:10093 > /tmp/out3.log 2>&1
cat /tmp/out3.log
