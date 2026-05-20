CODE_PATH="/tmp"
INNER_ARGS="--dataset-args \"--dataset-name prefix_repetition --prefix_rate 0.5\""

cat << 'IN' > /tmp/bench.sh
echo "ARG 1: $1"
echo "ARG 2: $2"
echo "ARG 3: $3"
echo "ARG 4: $4"
IN

echo "Testing bash -c..."
bash -c "cd \"$CODE_PATH\" && bash bench.sh $INNER_ARGS"
