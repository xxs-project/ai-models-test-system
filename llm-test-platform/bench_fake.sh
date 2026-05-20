#!/bin/bash
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
echo "IN BENCH_FAKE: DATASET_ARGS=[$DATASET_ARGS]"
