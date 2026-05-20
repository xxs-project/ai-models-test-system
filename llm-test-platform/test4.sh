#!/bin/bash
echo 'echo "Arg 2 is: $2"' > test_run.sh
chmod +x test_run.sh

full_command="
nohup bash << 'EOF' > test4.log 2>&1 &
./test_run.sh --dataset-args '--dataset-name prefix_repetition --prefix_rate 0.5' 2>&1
EOF
"

eval "$full_command"
wait
sleep 0.1
cat test4.log
