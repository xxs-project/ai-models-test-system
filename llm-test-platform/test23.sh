DATASET_ARGS="--dataset-name prefix_repetition --prefix_rate 0.5"
if [[ "$DATASET_ARGS" =~ --prefix[-_]rate([ =]+)([0-9.]+) ]]; then
    echo "Matched: ${BASH_REMATCH[2]}"
else
    echo "Failed"
fi
