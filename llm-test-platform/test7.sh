#!/bin/bash
CODE_PATH="/tmp"

run_vllmbench() {
    DATASET_ARGS=""
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --dataset-args)
                DATASET_ARGS="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done
    
    INNER_ARGS=""
    [ -n "$DATASET_ARGS" ] && INNER_ARGS="$INNER_ARGS --dataset-args \"$DATASET_ARGS\""
    
    echo "Running inside container..."
    bash -c "cd \"$CODE_PATH\" && bash bench.sh $INNER_ARGS"
}

cat << 'IN' > /tmp/bench.sh
echo "Inside bench.sh"
echo "Total args: $#"
for i in "$@"; do
    echo "Arg: $i"
done
IN
chmod +x /tmp/bench.sh

ssh_command="run_vllmbench --dataset-args '--dataset-name prefix_repetition --prefix_rate 0.5'"
eval "$ssh_command"
