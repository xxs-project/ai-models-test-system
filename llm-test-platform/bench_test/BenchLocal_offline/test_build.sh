#!/bin/bash
set -x
ver_dir=$(find /root/.benchlocal/benchpacks/bugfind-15/versions -mindepth 1 -maxdepth 1 -type d | head -n 1)/verification
cp "$ver_dir/Dockerfile" "$ver_dir/Dockerfile.bak"

sed -i 's|FROM node:|FROM docker.m.daocloud.io/library/node:|g' "$ver_dir/Dockerfile"
sed -i 's|FROM alpine|FROM docker.m.daocloud.io/library/alpine|g' "$ver_dir/Dockerfile"
sed -i 's|FROM golang:|FROM docker.m.daocloud.io/library/golang:|g' "$ver_dir/Dockerfile"

sed -i 's|https://nodejs.org/dist|https://npmmirror.com/mirrors/node|g' "$ver_dir/Dockerfile"
sed -i 's|https://go.dev/dl|https://golang.google.cn/dl|g' "$ver_dir/Dockerfile"

sed -i 's#curl -fsSL https://sh.rustup.rs#export RUSTUP_DIST_SERVER=https://rsproxy.cn \&\& export RUSTUP_UPDATE_ROOT=https://rsproxy.cn/rustup \&\& curl -fsSL https://rsproxy.cn/sh.rustup.rs#g' "$ver_dir/Dockerfile"

sed -i 's#apt-get update#sed -i "s|deb.debian.org|mirrors.ustc.edu.cn|g" /etc/apt/sources.list.d/debian.sources 2>/dev/null || true \&\& sed -i "s|deb.debian.org|mirrors.ustc.edu.cn|g" /etc/apt/sources.list 2>/dev/null || true \&\& apt-get update#g' "$ver_dir/Dockerfile"

sed -i 's/pip install/pip install -i https:\/\/pypi.tuna.tsinghua.edu.cn\/simple/g' "$ver_dir/Dockerfile"
sed -i 's/npm install/npm install --registry=https:\/\/registry.npmmirror.com/g' "$ver_dir/Dockerfile"
sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' "$ver_dir/Dockerfile"
sed -i 's#https://github.com/#https://ghproxy.net/https://github.com/#g' "$ver_dir/Dockerfile"

cd "$ver_dir"
docker build -t test-bugfind .
mv "$ver_dir/Dockerfile.bak" "$ver_dir/Dockerfile"
