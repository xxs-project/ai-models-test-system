DATASET_ARGS="--dataset-name prefix_repetition --prefix_rate 0.5"
INNER_ARGS=""
[ -n "$DATASET_ARGS" ] && INNER_ARGS="$INNER_ARGS --dataset-args \"$DATASET_ARGS\""

echo "INNER_ARGS is $INNER_ARGS"
