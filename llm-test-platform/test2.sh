#!/bin/bash
CODE_PATH="/test"
DATASET_ARGS="--dataset-name prefix_repetition --prefix_rate 0.5"

INNER_ARGS=""
[ -n "$DATASET_ARGS" ] && INNER_ARGS="$INNER_ARGS --dataset-args \"$DATASET_ARGS\""

echo bash -c "cd \"$CODE_PATH\" && bash benchmark.sh $INNER_ARGS"

bash -c "cd \"$(pwd)\" && bash benchmark.sh $INNER_ARGS"
