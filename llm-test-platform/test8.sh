#!/bin/bash
CODE_PATH="/tmp"

run_vllmbench() {
    DATASET_ARGS="$1"
    
    INNER_ARGS=""
    [ -n "$DATASET_ARGS" ] && INNER_ARGS="$INNER_ARGS --dataset-args \"$DATASET_ARGS\""
    
    echo "Running inside container..."
    bash -c "cd \"$CODE_PATH\" && bash bench.sh $INNER_ARGS"
}

cat << 'IN' > /tmp/bench.sh
echo "Total args: $#"
for i in "$@"; do
    echo "Arg: $i"
done
IN
chmod +x /tmp/bench.sh

run_vllmbench "--dataset-name \"prefix repetition\""
