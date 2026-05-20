import subprocess
import shlex

dataset_args = "--dataset-name prefix_repetition --prefix_rate 0.5"
escaped_args = shlex.quote(dataset_args)

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
bash -c "bash sim_bench.sh $INNER_ARGS"
''')

with open("sim_bench.sh", "w") as f:
    f.write('''#!/bin/bash
DATASET_ARGS=""
dataset_name="random"
input_len=1024
output_len=1024
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

if [[ -n "${DATASET_ARGS:-}" ]]; then
    eval "dataset_args_arr=(${DATASET_ARGS})"
    
    current_dataset_name="$dataset_name"
    if [[ "$DATASET_ARGS" =~ --dataset-name[[:space:]=]+([^[:space:]]+) ]]; then
        current_dataset_name="${BASH_REMATCH[1]}"
    fi

    if [[ "$DATASET_ARGS" =~ --prefix_rate[[:space:]=]+([0-9.]+) ]]; then
        PREFIX_RATE="${BASH_REMATCH[1]}"
    fi

    if [[ "$DATASET_ARGS" =~ --prefix_rate ]]; then
        temp_args=()
        for arg in "${dataset_args_arr[@]}"; do
            if [[ "$arg" != "--prefix_rate" && "$arg" != "$PREFIX_RATE" ]]; then
                temp_args+=("$arg")
            fi
        done
        dataset_args_arr=("${temp_args[@]}")
    fi
    
    if [[ "$current_dataset_name" == "prefix_repetition" ]]; then
        if [[ -n "$PREFIX_RATE" ]]; then
            prefix_len=$(awk "BEGIN {printf \\"%.0f\\", $input_len * $PREFIX_RATE}")
            suffix_len=$(awk "BEGIN {printf \\"%.0f\\", $input_len - $input_len * $PREFIX_RATE}")
            dataset_args_arr+=(--prefix-repetition-prefix-len "$prefix_len" --prefix-repetition-suffix-len "$suffix_len" --prefix-repetition-output-len "$output_len")
        else
            default_dataset_args=(
                 --dataset-name "$dataset_name"
                 --random-input-len "$input_len"
                 --random-output-len "$output_len"
            )
            dataset_args_arr=("${default_dataset_args[@]}")
        fi
    fi
else
    default_dataset_args=(
        --dataset-name "$dataset_name"
        --random-input-len "$input_len"
        --random-output-len "$output_len"
    )
    dataset_args_arr=("${default_dataset_args[@]}")
fi

echo "FINAL ARGS: ${dataset_args_arr[@]}"
''')

cmd = f"bash sim_run.sh --dataset-args {escaped_args}"
print(f"Executing: {cmd}")
subprocess.run(cmd, shell=True)
