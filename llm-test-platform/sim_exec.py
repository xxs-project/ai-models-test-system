import subprocess
import shlex

dataset_args = "--dataset-name prefix_repetition --prefix_rate 0.5"
escaped_args = shlex.quote(dataset_args)

# Fake run_vllmbench.sh
with open("sim_run.sh", "w") as f:
    f.write('''#!/bin/bash
DATASET_ARGS=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dataset-args)
            DATASET_ARGS="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done
INNER_ARGS="--dataset-args \\"$DATASET_ARGS\\""
# simulate docker bash -c
bash -c "bash sim_bench.sh $INNER_ARGS"
''')

# Fake benchmark.sh
with open("sim_bench.sh", "w") as f:
    f.write('''#!/bin/bash
DATASET_ARGS=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dataset-args)
            DATASET_ARGS="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done
echo "IN BENCH.SH, DATASET_ARGS is: [$DATASET_ARGS]"
if [[ -n "${DATASET_ARGS:-}" ]]; then
    eval "dataset_args_arr=(${DATASET_ARGS})"
    echo "ARRAY SIZE: ${#dataset_args_arr[@]}"
    echo "ARRAY: ${dataset_args_arr[@]}"
fi
''')

cmd = f"bash sim_run.sh --dataset-args {escaped_args}"
print(f"Executing: {cmd}")
subprocess.run(cmd, shell=True)
