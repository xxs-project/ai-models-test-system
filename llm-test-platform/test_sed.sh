#!/bin/bash
ver_dir="test.txt"
echo "git clone https://github.com/foo/bar" > "$ver_dir"
sed -i 's|git clone|git config --global url."https://gitclone.com/github.com/".insteadOf "https://github.com/" \&\& git clone|g' "$ver_dir"
cat "$ver_dir"
