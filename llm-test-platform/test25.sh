DATASET_ARGS="--dataset-name prefix_repetition --prefix_rate 0.5"

if [[ "$DATASET_ARGS" =~ --dataset-name[[:space:]=]+([^[:space:]]+) ]]; then
    echo "1 MATCHED: ${BASH_REMATCH[1]}"
else
    echo "1 FAILED"
fi

if [[ "$DATASET_ARGS" =~ --prefix[-_]rate[[:space:]=]+([0-9.]+) ]]; then
    echo "2 MATCHED: ${BASH_REMATCH[1]}"
else
    echo "2 FAILED"
fi

