CODE_PATH="/tmp"
DATASET_ARGS="--dataset-name prefix_repetition --prefix_rate 0.5"
INNER_ARGS=""
[ -n "$DATASET_ARGS" ] && INNER_ARGS="$INNER_ARGS --dataset-args \"$DATASET_ARGS\""

cat << 'IN' > /tmp/bench.sh
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dataset-args)
            echo "DATASET_ARGS is: $2"
            shift 2
            ;;
        *)
            echo "Other: $1"
            shift
            ;;
    esac
done
IN

echo "Running bash -c..."
bash -c "cd \"$CODE_PATH\" && bash bench.sh $INNER_ARGS"
