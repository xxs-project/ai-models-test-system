#!/bin/bash
ver_dir="test_dir"
mkdir -p "$ver_dir"
cat << 'DOCKER_EOF' > "$ver_dir/Dockerfile"
FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl
DOCKER_EOF

# Debian apt 国内源 (插入到 RUN apt-get 前面)
sed -i 's#RUN apt-get update#RUN sed -i "s|deb.debian.org|mirrors.ustc.edu.cn|g" /etc/apt/sources.list.d/debian.sources 2>/dev/null || true \&\& sed -i "s|deb.debian.org|mirrors.ustc.edu.cn|g" /etc/apt/sources.list 2>/dev/null || true \&\& apt-get update#g' "$ver_dir/Dockerfile"

cat "$ver_dir/Dockerfile"
