#!/bin/bash
command="echo cd perf_test/api_benchmark_auto && echo bash run_vllmbench.sh --dataset-args '--dataset-name prefix_repetition --prefix_rate 0.5'"

full_command="
nohup bash << 'EOF' > test3.log 2>&1 &
echo \$\$ > test3.pid
$command 2>&1
EOF
"

eval "$full_command"
wait
cat test3.log
