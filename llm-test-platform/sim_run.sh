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
INNER_ARGS="--dataset-args \"$DATASET_ARGS\""
bash -c "bash sim_bench.sh $INNER_ARGS"
