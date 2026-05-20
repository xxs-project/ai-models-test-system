DATASET_ARGS="--dataset-name prefix_repetition --prefix_rate '0.5'"

if [[ "$DATASET_ARGS" =~ --prefix[-_]rate[[:space:]=]+([0-9.]+) ]]; then
    PREFIX_RATE="${BASH_REMATCH[1]}"
    echo "Matched 1: $PREFIX_RATE"
else
    echo "Failed 1"
fi

DATASET_ARGS2="--dataset-name prefix_repetition --prefix_rate \"0.5\""
if [[ "$DATASET_ARGS2" =~ --prefix[-_]rate[[:space:]=]+([0-9.]+) ]]; then
    PREFIX_RATE="${BASH_REMATCH[1]}"
    echo "Matched 2: $PREFIX_RATE"
else
    echo "Failed 2"
fi
