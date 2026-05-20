#!/bin/bash
DATASET_ARGS=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dataset-args)
            DATASET_ARGS="$2"
            shift 2
            ;;
        *)
            echo "Unknown: $1"
            shift
            ;;
    esac
done

echo "Parsed DATASET_ARGS: '$DATASET_ARGS'"

if [[ "$DATASET_ARGS" =~ --prefix[-_]rate[[:space:]=]+([0-9.]+) ]]; then
    echo "PREFIX_RATE: ${BASH_REMATCH[1]}"
else
    echo "Regex failed"
fi
eval "dataset_args_arr=(${DATASET_ARGS})"
echo "dataset_args_arr size: ${#dataset_args_arr[@]}"
for arg in "${dataset_args_arr[@]}"; do
    echo "arr: $arg"
done
