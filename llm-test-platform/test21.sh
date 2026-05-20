input_len=1024
PREFIX_RATE=0.5
prefix_len=$(awk "BEGIN {printf \"%.0f\", $input_len * $PREFIX_RATE}" 2>/dev/null)
echo "prefix_len: [$prefix_len]"
