#!/bin/bash
CODE_PATH="/test"
DATASET_ARGS="--dataset-name prefix_repetition --prefix_rate 0.5"
INNER_ARGS="--dataset-args \"$DATASET_ARGS\""

echo "INNER_ARGS is: $INNER_ARGS"

echo "Executing:"
echo bash -c "cd \"$CODE_PATH\" && bash benchmark.sh $INNER_ARGS"

cat << 'INNER_EOF' > benchmark.sh
#!/bin/bash
echo "Total args to benchmark.sh: $#"
for i in "$@"; do
    echo "Arg: $i"
done
INNER_EOF
chmod +x benchmark.sh

bash -c "cd \"$(pwd)\" && bash benchmark.sh $INNER_ARGS"
