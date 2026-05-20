DATASET_ARGS="\"--dataset-name prefix_repetition --prefix_rate 0.5\""
if [[ "$DATASET_ARGS" =~ --prefix[-_]rate[[:space:]=]+([0-9.]+) ]]; then
    echo "Matched! ${BASH_REMATCH[1]}"
else
    echo "Failed"
fi
