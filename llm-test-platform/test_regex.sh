#!/bin/bash
DATASET_ARGS="--dataset-name prefix_repetition --prefix_rate 0.5"
if [[ "$DATASET_ARGS" =~ --dataset-name[[:space:]=]+([^[:space:]]+) ]]; then
    current_dataset_name="${BASH_REMATCH[1]}"
    echo "current_dataset_name: $current_dataset_name"
fi
if [[ "$DATASET_ARGS" =~ --prefix[-_]rate[[:space:]=]+([0-9.]+) ]]; then
    PREFIX_RATE="${BASH_REMATCH[1]}"
    echo "PREFIX_RATE: $PREFIX_RATE"
fi
