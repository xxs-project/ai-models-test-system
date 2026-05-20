DATASET_ARGS="--dataset-name prefix_repetition --prefix_rate 0.5"
if [[ "$DATASET_ARGS" =~ --prefix[-_]rate[[:space:]=]+([0-9.]+) ]]; then
    echo "Matched space: ${BASH_REMATCH[1]}"
fi
if [[ "$DATASET_ARGS" =~ --prefix[-_]rate[ \t=]+([0-9.]+) ]]; then
    echo "Matched space/tab: ${BASH_REMATCH[1]}"
fi
if [[ "$DATASET_ARGS" =~ --prefix[-_]rate[ \=]+([0-9.]+) ]]; then
    echo "Matched space/equal: ${BASH_REMATCH[1]}"
fi
