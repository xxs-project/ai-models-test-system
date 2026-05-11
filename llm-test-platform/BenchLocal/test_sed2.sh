#!/bin/bash
ver_dir="test_dir"
mkdir -p "$ver_dir"
cat << 'DOCKER_EOF' > "$ver_dir/Dockerfile"
  && curl -fsSL https://sh.rustup.rs \
    | sh -s -- -y --profile minimal --default-toolchain "${RUST_VERSION}" --default-host "${rust_target}"
DOCKER_EOF

sed -i 's#curl -fsSL https://sh.rustup.rs#export RUSTUP_DIST_SERVER=https://rsproxy.cn \&\& export RUSTUP_UPDATE_ROOT=https://rsproxy.cn/rustup \&\& curl -fsSL https://rsproxy.cn/sh.rustup.rs#g' "$ver_dir/Dockerfile"

cat "$ver_dir/Dockerfile"
