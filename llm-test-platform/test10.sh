#!/bin/bash
CODE_PATH="/tmp"

DATASET_ARGS="--dataset-name \"prefix repetition\" --prefix_rate 0.5"

INNER_ARGS=""
[ -n "$DATASET_ARGS" ] && INNER_ARGS="$INNER_ARGS --dataset-args '$(echo "$DATASET_ARGS" | sed "s/'/'\\\\''/g")'"

cat << 'IN' > /tmp/bench.sh
echo "Total args: $#"
for i in "$@"; do
    echo "Arg: $i"
done
IN
chmod +x /tmp/bench.sh

bash -c "cd \"$CODE_PATH\" && bash bench.sh $INNER_ARGS"
