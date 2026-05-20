CODE_PATH="/tmp"
DATASET_ARGS="--dataset-name prefix_repetition --prefix_rate 0.5"
INNER_ARGS=""
[ -n "$DATASET_ARGS" ] && INNER_ARGS="$INNER_ARGS --dataset-args \"$DATASET_ARGS\""

CMD="cd \"$CODE_PATH\" && bash benchmark.sh $INNER_ARGS"
echo "The command string is:"
echo "$CMD"
