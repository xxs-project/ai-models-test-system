#!/bin/bash
CODE_PATH="/tmp"
DATASET_ARGS="--dataset-name prefix_repetition --prefix_rate 0.5"
INNER_ARGS="--dataset-args '$(echo "$DATASET_ARGS" | sed "s/'/'\\\\''/g")'"

cat << 'INNER_EOF' > /tmp/benchmark.sh
#!/bin/bash
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
echo "DATASET_ARGS is: $DATASET_ARGS"
INNER_EOF

bash -c "cd \"$CODE_PATH\" && bash benchmark.sh $INNER_ARGS"
