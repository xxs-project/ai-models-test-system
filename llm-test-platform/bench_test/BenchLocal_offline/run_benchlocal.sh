#!/bin/bash
set -e

# ==========================================
# BenchLocal 自动化部署与详细测评一键脚本
# 优化版：使用本地tar.gz镜像文件
# ==========================================

function show_usage() {
    echo "用法: $0 <packs> <MODEL_NAME> <BASE_URL> [api_key]"
    echo ""
    echo "环境变量:"
    echo "  UPDATE_PACKS=1 - 强制从网络更新基准包 (默认优先使用本地离线包)"
    echo ""
    echo "参数说明:"
    echo "  packs       - 逗号分隔的测试包列表，如: dataextract-15,instructfollow-15"
    echo "  MODEL_NAME  - 模型名称"
    echo "  BASE_URL    - API服务地址，如: http://127.0.0.1:10093/v1"
    echo "  api_key     - API密钥 (可选，默认: dummy)"
    echo ""
    echo "示例:"
    echo "  $0 'dataextract-15,instructfollow-15,reasonmath-15,toolcall-15,bugfind-15,structoutput-15,hermesagent-20,cli-40' 'gemma-4-26B-A4B-it' 'http://127.0.0.1:10093/v1' 'sk-xxxx'"
    echo "  UPDATE_PACKS=1 $0 'cli-40' 'my-model' 'http://localhost:8000/v1'"
    exit 1
}

if [ $# -lt 3 ]; then
    echo "错误: 缺少必需参数"
    show_usage
fi

PACKS="$1"
MODEL_NAME="$2"
BASE_URL=$(echo "$3" | sed 's/localhost/127.0.0.1/g')
API_KEY="${4:-dummy}"

API_PORT=$(echo "$BASE_URL" | sed -E 's/.*:([0-9]+)(\/v1)?/\1/')
WORKDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BENCHLOCAL_DIR="$HOME/.benchlocal"
export BENCHLOCAL_DIR
RESULTS_DIR="${WORKDIR}/results"
HERMES_COMMIT="ea74f61d983ebdfd6a863c45761d1b38081f1d08"

OLDIFS="$IFS"
IFS=','
PACK_ARRAY=($PACKS)
IFS="$OLDIFS"


echo "🧹 清理遗留的评测进程..."
for pid_file in /tmp/benchlocal-*-verifier.pid; do
    if [ -f "$pid_file" ]; then
        kill -9 $(cat "$pid_file") 2>/dev/null || true
    fi
done
rm -f /tmp/benchlocal-*-verifier.pid /tmp/benchlocal-*-verifier.port /tmp/benchlocal-*-verifier.listen_port /tmp/benchlocal-*-verifier.log

echo "=========================================="
echo "BenchLocal 自动化测评脚本"
echo "=========================================="
echo "模型名称: ${MODEL_NAME}"
echo "API地址:  ${BASE_URL}"
echo "API端口:  ${API_PORT}"
echo "API密钥:  ${API_KEY}"
echo "工作目录: ${WORKDIR}"
echo "测试包:   ${PACKS}"
echo "=========================================="

cd "$WORKDIR"
mkdir -p "$RESULTS_DIR"

cat << 'DOCKER_EOF' > "$WORKDIR/docker"
#!/bin/bash
CMD="$1"
    echo "CMD: $CMD $@" >> /tmp/fake-docker-all.log
shift

if [ "$CMD" = "version" ]; then
    echo "24.0.0"
    exit 0
fi

if [ "$CMD" = "image" ]; then
    if [ "$1" = "inspect" ]; then
        exit 0
    fi
    if [ "$1" = "rm" ]; then
        exit 0
    fi
fi

if [ "$CMD" = "inspect" ]; then
    CONTAINER="$1"
    FORMAT="$2"
    if [ "$FORMAT" = "{{.State.Running}}" ]; then
        if [ -f "/tmp/$CONTAINER.pid" ]; then
            echo "true"
        else
            echo "false"
        fi
        exit 0
    fi
    if [ -f "/tmp/$CONTAINER.port" ]; then
        HOST_PORT=$(cat "/tmp/$CONTAINER.port")
        LISTEN_PORT=$(cat "/tmp/$CONTAINER.listen_port")
        echo "[{\"State\": {\"Running\": true}, \"NetworkSettings\": {\"Ports\": {\"${LISTEN_PORT}/tcp\": [{\"HostPort\": \"${HOST_PORT}\"}]}}}]"
    else
        echo "[]"
    fi
    exit 0
fi

if [ "$CMD" = "rm" ]; then
    CONTAINER="$2"
    if [ "$1" = "-f" ]; then
        CONTAINER="$2"
    else
        CONTAINER="$1"
    fi
    if [ -f "/tmp/$CONTAINER.pid" ]; then
        kill -9 $(cat "/tmp/$CONTAINER.pid") 2>/dev/null || true
        rm -f "/tmp/$CONTAINER.pid" "/tmp/$CONTAINER.port" "/tmp/$CONTAINER.listen_port"
    fi
    exit 0
fi

if [ "$CMD" = "build" ]; then
    exit 0
fi

if [ "$CMD" = "run" ]; then
    echo "FAKE DOCKER RUN CALLED with args: $@" >> /tmp/fake-docker.log
    CONTAINER=""
    echo "CMD: $CMD $@" >> /tmp/fake-docker-all.log
    PORT_MAP=""
    IMAGE=""
    while [[ $# -gt 0 ]]; do
        case $1 in
            --name) CONTAINER="$2"; shift 2 ;;
            -p) PORT_MAP="$2"; shift 2 ;;
            --add-host) shift 2 ;;
            -d) shift 1 ;;
            *) IMAGE="$1"; shift 1 ;;
        esac
    done
    
    HOST_PORT=$(echo "$PORT_MAP" | cut -d':' -f1)
    LISTEN_PORT=$(echo "$PORT_MAP" | cut -d':' -f2)
    
    echo "$HOST_PORT" > "/tmp/$CONTAINER.port"
    echo "$LISTEN_PORT" > "/tmp/$CONTAINER.listen_port"
    
    PACK_NAME=$(echo "$IMAGE" | grep -o 'benchlocal/[^:]*' | cut -d'/' -f2 | sed 's/-verifier//')
    if [ -n "$PACK_NAME" ]; then
        PACK_VER_DIR=$(find ~/.benchlocal/benchpacks/$PACK_NAME/versions -mindepth 1 -maxdepth 1 -type d 2>/dev/null | head -1)
        if [ -n "$PACK_VER_DIR" ] && [ -f "$PACK_VER_DIR/verification/server.mjs" ]; then
            cd "$PACK_VER_DIR/verification"
            export PORT=$HOST_PORT
            nohup node server.mjs > "/tmp/${CONTAINER}.log" 2>&1 &
            echo $! > "/tmp/$CONTAINER.pid"
            echo "Started mock container $CONTAINER"
            exit 0
        fi
    fi
    echo "Fake container started"
    exit 0
fi
DOCKER_EOF
chmod +x "$WORKDIR/docker"
export PATH="$WORKDIR:$PATH"
export BENCHLOCAL_SIMULATE_DOCKER="ready"


echo "🔍 检查模型API服务器..."
if ! curl -k -s --max-time 5 "${BASE_URL}/models" > /dev/null 2>&1; then
    echo "⚠️ 警告: 模型API服务器 ${BASE_URL} 不可访问"
    echo "⚠️ 请确保您的模型服务器正在运行"
    echo "⚠️ 当前 API 端口: ${API_PORT}"
    echo "⚠️ 测评可能无法正常进行。"
fi

echo "📝 [1/4] 生成本地模型配置文件 (config.toml)..."
mkdir -p ~/.benchlocal

if [ -d "$WORKDIR/.benchlocal" ]; then
    echo "📦 将工作目录中的本地离线包复制到 ~/.benchlocal ..."
    cp -r "$WORKDIR/.benchlocal/"* ~/.benchlocal/ 2>/dev/null || true
fi

cat << CONFIG_EOF > ~/.benchlocal/config.toml
schema_version = 1
default_benchpack = ""
run_storage_dir = "${RESULTS_DIR}"
benchpack_storage_dir = "~/.benchlocal/benchpacks"
log_storage_dir = "~/.benchlocal/logs"
cache_dir = "~/.benchlocal/cache"

[registry]
official_url = "https://ghproxy.net/https://raw.githubusercontent.com/stevibe/benchlocal-registry/main/registry.json"

[providers.local_model]
kind = "openai_compatible"
name = "Local Gemma"
enabled = true
base_url = "${BASE_URL}"
api_key = "${API_KEY}"

[[models]]
id = "local_model:${MODEL_NAME}"
provider = "local_model"
model = "${MODEL_NAME}"
label = "Gemma 4 31B IT"
group = "local"
enabled = true








CONFIG_EOF

REQUIRED_IMAGES=(
    "benchlocal/bugfind-15-verifier:local"
    "benchlocal/hermesagent-20-verifier:local"
    "benchlocal/structoutput-15-verifier:local"
    "benchlocal/cli-40-verifier:local"
    "docker.m.daocloud.io/library/debian:bookworm-slim"
    "docker.m.daocloud.io/library/hello-world:latest"
)

SKIP_IMAGE_LOAD=false
for img in "${REQUIRED_IMAGES[@]}"; do
    if docker image inspect "$img" > /dev/null 2>&1; then
        echo "✅ 镜像已存在: $img"
        SKIP_IMAGE_LOAD=true
        break
    fi
done

if [ "$SKIP_IMAGE_LOAD" = true ]; then
    echo "📦 所有必需镜像已存在，跳过镜像加载和容器创建"
else
    echo "📥 加载本地镜像..."
    if [ -f "$WORKDIR/debian-bookworm-slim-x86.tar.gz" ]; then
        echo "  加载 debian-bookworm-slim-x86.tar.gz..."
        docker load -i "$WORKDIR/debian-bookworm-slim-x86.tar.gz" || true
    fi

    if [ -f "$WORKDIR/hello-world-x86.tar.gz" ]; then
        echo "  加载 hello-world-x86.tar.gz..."
        docker load -i "$WORKDIR/hello-world-x86.tar.gz" || true
    fi

    if [ -f "$WORKDIR/bugfind-15-verifier.tar.gz" ]; then
        echo "  加载 bugfind-15-verifier.tar.gz..."
        docker load -i "$WORKDIR/bugfind-15-verifier.tar.gz" || true
    fi

    if [ -f "$WORKDIR/hermesagent-20-verifier.tar.gz" ]; then
        echo "  加载 hermesagent-20-verifier.tar.gz..."
        docker load -i "$WORKDIR/hermesagent-20-verifier.tar.gz" || true
    fi

    if [ -f "$WORKDIR/structoutput-15-verifier.tar.gz" ]; then
        echo "  加载 structoutput-15-verifier.tar.gz..."
        docker load -i "$WORKDIR/structoutput-15-verifier.tar.gz" || true
    fi

    if [ -f "$WORKDIR/cli-40-verifier.tar.gz" ]; then
        echo "  加载 cli-40-verifier.tar.gz..."
        docker load -i "$WORKDIR/cli-40-verifier.tar.gz" || true
    fi
fi

echo "📥 [1.5/4] 预先安装/检查测试包..."
cat << 'DOWNLOAD_EOF' > "$WORKDIR/download_packs.mjs"
import { installBenchPackFromRegistry } from '@benchlocal/benchpack-host';
import { loadConfigFile, getConfigPath, saveConfigFile } from '@benchlocal/core';
import fs from 'fs/promises';
import path from 'path';

const PACKS_STR = process.env.PACKS || "";
const PACK_ARRAY = PACKS_STR ? PACKS_STR.split(',') : [];
const packs = PACK_ARRAY.length > 0 ? PACK_ARRAY : ['dataextract-15', 'instructfollow-15', 'reasonmath-15', 'toolcall-15', 'bugfind-15', 'structoutput-15', 'hermesagent-20', 'cli-40'];
const runtime = { benchLocalVersion: '0.2.4', hostFeatures: [] };
const UPDATE_PACKS = process.env.UPDATE_PACKS === '1';

async function main() {
    let config = await loadConfigFile(getConfigPath());
    for (const pack of packs) {
        let needsInstall = UPDATE_PACKS;
        const baseDir = path.join(process.env.HOME || '/root', '.benchlocal/benchpacks', pack);
        
        if (!UPDATE_PACKS) {
            try {
                const currentJsonPath = path.join(baseDir, 'current.json');
                await fs.access(currentJsonPath);
                console.log(`  └─ [离线模式] 发现本地已有测试包: ${pack}，跳过下载更新`);
                needsInstall = false;
            } catch(e) {
                console.log(`  └─ [离线模式] 未发现本地测试包: ${pack}，将尝试从网络获取`);
                needsInstall = true;
            }
        }

        if (needsInstall) {
            try {
                const res = await fetch("https://ghproxy.net/https://raw.githubusercontent.com/stevibe/benchlocal-registry/main/registry.json");
                const registry = await res.json();
                const entry = registry.packs.find(e => e.id === pack);
                if (entry) {
                    const latestVersion = entry.version;
                    const currentJsonPath = path.join(baseDir, 'current.json');
                    try {
                        const currentJsonStr = await fs.readFile(currentJsonPath, 'utf8');
                        const currentJson = JSON.parse(currentJsonStr);
                        const localVersion = currentJson.version;
                        if (localVersion && localVersion.startsWith(latestVersion + '-')) {
                            needsInstall = false;
                        }
                    } catch(e) {}
                }
            } catch(e) {
                console.log(`  └─ 获取注册表失败，将使用默认安装逻辑`);
            }
        }
        
        if (needsInstall) {
            console.log(`  └─ 下载/更新测试包: ${pack}`);
            try {
                config = await installBenchPackFromRegistry(config, pack, () => {}, runtime);
            } catch(e) {
                console.error(`  └─ 下载失败: ${e.message}`);
            }
        }
    }
}
main().catch(() => {});
DOWNLOAD_EOF
NODE_TLS_REJECT_UNAUTHORIZED='0' UPDATE_PACKS="${UPDATE_PACKS}" node "$WORKDIR/download_packs.mjs" || true

echo "🔧 预处理模型输出的 <think> 标签 (Qwen3/DeepSeek等推理模型兼容性)..."
node -e '
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const files = execSync("find ~/.benchlocal/benchpacks -type f \\( -name \"llm-client.js\" -o -name \"openai.mjs\" \\)").toString().trim().split("\n").filter(Boolean);
for (const file of files) {
  let code = fs.readFileSync(file, "utf8");
  if (!code.includes("<think>")) {
    code = code.replace(/const choice = json\?\.choices\?\.\[0\];/g, "const choice = json?.choices?.[0]; if (choice?.message?.content && typeof choice.message.content === \"string\") { choice.message.content = choice.message.content.replace(/<think>[\\s\\S]*?<\\/think>/g, \"\").replace(/<think>[\\s\\S]*/g, \"\").trim(); }");
    code = code.replace(/const message = payload\.choices\?\.\[0\]\?\.message;/g, "const message = payload.choices?.[0]?.message; if (message?.content && typeof message.content === \"string\") { message.content = message.content.replace(/<think>[\\s\\S]*?<\\/think>/g, \"\").replace(/<think>[\\s\\S]*/g, \"\").trim(); }");
    code = code.replace(/return content;/g, "return content.replace(/<think>[\\s\\S]*?<\\/think>/g, \"\").replace(/<think>[\\s\\S]*/g, \"\").trim();");
    fs.writeFileSync(file, code);
  }
}
' || true

echo "🔧 预处理Docker镜像配置..."

preprocess_dockerfile() {
    local ver_dir="$1/Dockerfile"
    if [ ! -f "$ver_dir" ]; then
        return
    fi

    sed -i 's|https://ghproxy.com/https://ghproxy.com/|https://|g' "$ver_dir"
    sed -i 's|ghproxy.com/https://ghproxy.com/|ghproxy.com/|g' "$ver_dir"
    sed -i 's|npm.taobao.org|cdn.npmmirror.com|g' "$ver_dir"
    sed -i 's|https://npm.taobao.org|https://cdn.npmmirror.com|g' "$ver_dir"
    sed -i 's|cdn.npmmirror.com/mirrors/node|cdn.npmmirror.com/binaries/node|g' "$ver_dir"
    sed -i 's|npmmirror.com/mirrors/node|cdn.npmmirror.com/binaries/node|g' "$ver_dir"
    sed -i 's|https://nodejs.org/dist|https://cdn.npmmirror.com/binaries/node|g' "$ver_dir"
    sed -i 's|https://rsproxy.cn/sh.rustup.rs|https://sh.rustup.rs|g' "$ver_dir"
    sed -i 's|git clone|git config --global url."https://gitclone.com/github.com/".insteadOf "https://github.com/" \&\& git clone|g' "$ver_dir"

    sed -i 's|docker.m.daocloud.io/library/node:22-bookworm-slim|docker.m.daocloud.io/library/debian:bookworm-slim|g' "$ver_dir"
    sed -i 's|registry.cn-hangzhou.aliyuncs.com/library/node:22-bookworm-slim|docker.m.daocloud.io/library/debian:bookworm-slim|g' "$ver_dir"
    sed -i 's|^FROM node:|FROM docker.m.daocloud.io/library/debian:bookworm-slim|g' "$ver_dir"
    sed -i 's|^FROM debian:|FROM docker.m.daocloud.io/library/debian:|g' "$ver_dir"
    sed -i 's|^FROM alpine:|FROM docker.m.daocloud.io/library/alpine:|g' "$ver_dir"
    sed -i 's|^FROM golang:|FROM docker.m.daocloud.io/library/golang:|g' "$ver_dir"

    if [[ "$ver_dir" == *"hermesagent"* ]]; then
        sed -i 's|chromium \\|chromium curl \\|g' "$ver_dir"
        sed -i 's|pip install hermes-agent|pip install .|g' "$ver_dir"
        awk '/apt-get.*chromium.*/{print; print "RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \\"; print "  && apt-get install -y nodejs \\"; print "  && rm -rf /var/lib/apt/lists/*"; next}1' "$ver_dir" > "$ver_dir.tmp" && mv "$ver_dir.tmp" "$ver_dir"
    fi

    sed -i 's|pip install --upgrade|pip install -i https://pypi.tuna.tsinghua.edu.cn/simple --upgrade|g' "$ver_dir"
    sed -i 's|pip install -e|pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -e|g' "$ver_dir"
    sed -i 's|npm install|npm install --registry=https://registry.npmmirror.com|g' "$ver_dir"

    cp "$ver_dir" "$ver_dir.bak"
}

for pack in bugfind-15 structoutput-15 hermesagent-20 cli-40; do
    pack_ver=$(find $BENCHLOCAL_DIR/benchpacks/$pack/versions -mindepth 1 -maxdepth 1 -type d 2>/dev/null | head -1)
    if [ -n "$pack_ver" ] && [ -d "$pack_ver/verification" ]; then
        echo "  处理 $pack..."
        preprocess_dockerfile "$pack_ver/verification"
    fi
done
HERMES_DIR=$(find $BENCHLOCAL_DIR/benchpacks/hermesagent-20/versions -maxdepth 2 -mindepth 2 -type d -name verification 2>/dev/null | head -1)
echo "HERMES_DIR IS $HERMES_DIR"

if [ -n "$HERMES_DIR" ] && [ -d "$HERMES_DIR" ]; then
        if [ ! -d "${WORKDIR}/hermes-agent" ]; then
            echo "  No hermes-agent found locally. Error."
            exit 1
        fi
        
        HERMES_SRC="${WORKDIR}/hermes-agent"

        if [ -n "$HERMES_SRC" ] && [ -d "$HERMES_SRC" ]; then
        rm -rf "$HERMES_DIR/hermes-agent" 2>/dev/null || true
        rm -f "$HERMES_DIR/Dockerfile" 2>/dev/null || true
        (cd "$HERMES_SRC" && git checkout --force "${HERMES_COMMIT}") 2>/dev/null || true
        cp -r "$HERMES_SRC" "$HERMES_DIR/"
        
        # 删除原本 3.11 的 venv，我们将用离线 wheels 重新构建 3.10 环境
        rm -rf "$HERMES_DIR/hermes-agent/venv" 2>/dev/null || true

        if [ -f "$HERMES_DIR/hermes-agent/pyproject.toml" ]; then
            sed -i "s/requires-python = \">=3.11\"/requires-python = \">=3.10\"/g" "$HERMES_DIR/hermes-agent/pyproject.toml"
        fi
        if [ -f "$HERMES_DIR/hermes-runtime.mjs" ]; then
            sed -i "s|async function getGitRevision(repoDir) {|async function getGitRevision(repoDir) { return \"ea74f61d983ebdfd6a863c45761d1b38081f1d08\"; |g" "$HERMES_DIR/hermes-runtime.mjs"
            sed -i 's/async function getGitRevision(repoDir) {/async function getGitRevision(repoDir) { return "ea74f61d983ebdfd6a863c45761d1b38081f1d08"; /g' "$HERMES_DIR/hermes-runtime.mjs"

            sed -i 's/model\.inferenceBaseUrl/model.inferenceBaseUrl || model.baseUrl/g' "$HERMES_DIR/hermes-runtime.mjs"
            sed -i 's/|| model\.baseUrl || model\.baseUrl/|| model.baseUrl/g' "$HERMES_DIR/hermes-runtime.mjs"
            sed -i "s|const HERMES_VENV_DIR = \"/opt/hermes-venv\";|const HERMES_VENV_DIR = \"$HERMES_DIR/hermes-agent/venv\";|g" "$HERMES_DIR/hermes-runtime.mjs"
            sed -i "s|const HERMES_SOURCE_DIR = \"/opt/hermes-agent\";|const HERMES_SOURCE_DIR = \"$HERMES_DIR/hermes-agent\";|g" "$HERMES_DIR/hermes-runtime.mjs"
            sed -i "s|const AGENT_RUNNER_PATH = \"/opt/verification/agent-runner.py\";|const AGENT_RUNNER_PATH = \"$HERMES_DIR/agent-runner.py\";|g" "$HERMES_DIR/hermes-runtime.mjs"
        fi
        if [ -f "$HERMES_DIR/core.mjs" ]; then
            sed -i "s|summary: \"Failed to prepare the pinned Hermes runtime inside the verifier.\",|summary: \"Failed: \" + detail,|g" "$HERMES_DIR/core.mjs"
            sed -i 's/request\.model\.inferenceBaseUrl/request.model.inferenceBaseUrl || request.model.baseUrl/g' "$HERMES_DIR/core.mjs"
            sed -i 's/|| request\.model\.baseUrl || request\.model\.baseUrl/|| request.model.baseUrl/g' "$HERMES_DIR/core.mjs"
            sed -i "s|/opt/hermes-venv/bin/hermes|$HERMES_DIR/hermes-agent/venv/bin/hermes|g" "$HERMES_DIR/core.mjs"
        fi
        SCENARIOS_JS=$(find $BENCHLOCAL_DIR/benchpacks/hermesagent-20/versions -name run-scenarios.mjs 2>/dev/null | head -1)
        if [ -n "$SCENARIOS_JS" ] && [ -f "$SCENARIOS_JS" ]; then
            sed -i "s|/opt/hermes-venv/bin/pip|$HERMES_DIR/hermes-agent/venv/bin/pip|g" "$SCENARIOS_JS"
        fi

        if [ -d "$HERMES_DIR/hermes-agent/venv/bin" ]; then
            echo "  修复预置 venv 中的绝对路径..."
            find "$HERMES_DIR/hermes-agent/venv/bin" -type f -exec sed -i "s|#\!.*python.*|#\!$HERMES_DIR/hermes-agent/venv/bin/python3|g" {} + 2>/dev/null || true
        fi

        if [ ! -d "$HERMES_DIR/hermes-agent/venv" ]; then
            echo "  Installing hermes-agent locally..."
            python3 -m venv "$HERMES_DIR/hermes-agent/venv"
            "$HERMES_DIR/hermes-agent/venv/bin/pip" install --no-index --find-links "$WORKDIR/hermes-agent/wheels" --upgrade pip wheel setuptools
            "$HERMES_DIR/hermes-agent/venv/bin/pip" install --no-index --find-links "$WORKDIR/hermes-agent/wheels" -e "$HERMES_DIR/hermes-agent"
            "$HERMES_DIR/hermes-agent/venv/bin/pip" install --no-index --find-links "$WORKDIR/hermes-agent/wheels" pytest croniter aiohttp
            npm install -g --registry=https://registry.npmmirror.com agent-browser || true
        fi

        cat > "$HERMES_DIR/Dockerfile" << 'DOCKERFILE_EOF'
FROM docker.m.daocloud.io/library/debian:bookworm-slim

ARG DEBIAN_FRONTEND=noninteractive
ARG HERMES_COMMIT

ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH=/opt/verification/hermes-agent/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ENV AGENT_BROWSER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git python3 python3-pip python3-venv build-essential chromium curl && \
    rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 10001 verifier && \
    mkdir -p /opt/verification/hermes-agent /tmp/hermesagent20-runs && \
    chown -R verifier:verifier /opt/verification /tmp/hermesagent20-runs

COPY hermes-agent /opt/verification/hermes-agent

RUN cd /opt/verification/hermes-agent && git checkout --force ${HERMES_COMMIT} && \
    python3 -m venv /opt/verification/hermes-agent/venv && \
    /opt/verification/hermes-agent/venv/bin/pip install --upgrade pip wheel setuptools && \
    /opt/verification/hermes-agent/venv/bin/pip install -e . && \
    /opt/verification/hermes-agent/venv/bin/pip install pytest croniter aiohttp && \
    npm install -g agent-browser && \
    chown -R verifier:verifier /opt/verification/hermes-agent

WORKDIR /opt/verification

COPY manifest.mjs hermes-runtime.mjs core.mjs server.mjs agent-runner.py ./

USER verifier

ENTRYPOINT ["node", "/opt/verification/server.mjs"]
DOCKERFILE_EOF
        cp "$HERMES_DIR/Dockerfile" "$HERMES_DIR/Dockerfile.bak"
        echo "  使用本地 hermes-agent 副本"
    fi
fi


echo "🔧 修补 benchpack-host 以支持本地网络..."
find node_modules/@benchlocal -name "index.js" -path "*/benchpack-host/dist/index.js" -exec sed -i 's/host.docker.internal/127.0.0.1/g' {} + || true


echo "🔧 增强 benchpack-host 的网络错误处理与模型输出预处理..."
node -e '
const fs = require("fs");
const glob = require("child_process").execSync("find node_modules/@benchlocal -name index.js -path \"*/benchpack-host/dist/index.js\" 2>/dev/null").toString().trim().split("\n").filter(Boolean);
for (const file of glob) {
  let code = fs.readFileSync(file, "utf8");
  let changed = false;
  if (!code.includes("模型API连接失败")) {
    code = code.replace(
      /const upstreamResponse = await fetch\(upstreamUrl, \{\s*method: request\.method \?\? "GET",\s*headers: createUpstreamHeaders\(request, route\),\s*body: outboundBody\.length > 0 \? outboundBody\.toString\("utf8"\) : undefined\s*\}\);/g,
      `let upstreamResponse;
            try {
                upstreamResponse = await fetch(upstreamUrl, {
                    method: request.method ?? "GET",
                    headers: createUpstreamHeaders(request, route),
                    body: outboundBody.length > 0 ? outboundBody.toString("utf8") : undefined
                });
            } catch (err) {
                response.writeHead(502, { "Content-Type": "application/json" });
                response.end(JSON.stringify({ error: { message: "模型API连接失败: " + err.message, type: "server_error" }}));
                return;
            }`
    );
    changed = true;
  }
  if (!code.includes("choice.message.content.replace")) {
    code = code.replace(
      /const parsed = JSON\.parse\(rawText\);/g,
      `const parsed = JSON.parse(rawText);
                    if (parsed && Array.isArray(parsed.choices)) {
                        for (const choice of parsed.choices) {
                            if (choice && choice.message && typeof choice.message.content === "string") {
                                choice.message.content = choice.message.content.replace(/<think>[\\s\\S]*?<\\/think>/g, "").replace(/<think>[\\s\\S]*/g, "").trim();
                            }
                        }
                    }`
    );
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(file, code);
  }
}
' || true

echo "💻 [2/4] 生成自动化测评调度引擎..."
cat << MJS_EOF > run_evals.mjs
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { runConfiguredBenchPack, installBenchPackFromRegistry, startConfiguredBenchPackVerifiers } from '@benchlocal/benchpack-host';
import { loadConfigFile, getConfigPath } from '@benchlocal/core';

const MODEL_NAME = process.env.MODEL_NAME || "gemma-4-26B-A4B-it";
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:10093/v1";
const PACKS_STR = process.env.PACKS || "";
const PACK_ARRAY = PACKS_STR ? PACKS_STR.split(',') : [];
const UPDATE_PACKS = process.env.UPDATE_PACKS === '1';

async function main() {
  const packs = PACK_ARRAY.length > 0 ? PACK_ARRAY : [
    'dataextract-15',
    'instructfollow-15',
    'reasonmath-15',
    'toolcall-15',
    'bugfind-15',
    'structoutput-15',
    'hermesagent-20',
    'cli-40'
  ];

  const runtime = {
    benchLocalVersion: '0.2.4',
    hostFeatures: ["inferenceEndpoints", "dockerInferenceEndpoints"]
  };

  const results = {};

  for (const pack of packs) {
    console.log(\`\n==================================================\`);
    console.log(\`▶ 开始评测: \${pack}\`);
    console.log(\`==================================================\`);

    let config;
    try {
        config = await loadConfigFile(getConfigPath());
    } catch(e) {
        console.error("加载配置失败", e);
        continue;
    }

    results[pack] = {
      status: 'PENDING',
      scenarios: [],
      score: 0,
      maxScore: 0
    };

    let needsInstall = UPDATE_PACKS;
    const baseDir = path.join(process.env.HOME || '/root', '.benchlocal/benchpacks', pack);
    
    // 如果没有强制更新网络包，优先读取本地
    if (!needsInstall) {
        try {
            const currentJsonPath = path.join(baseDir, 'current.json');
            const currentJsonStr = await fs.readFile(currentJsonPath, 'utf8');
            const currentJson = JSON.parse(currentJsonStr);
            const localVersion = currentJson.version;
            
            if (localVersion) {
                console.log(\`[+] [离线模式] 发现本地已有版本 \${localVersion}，直接加载执行...\`);
                
                if (!config.benchpacks) config.benchpacks = {};
                const packDir = path.join(baseDir, 'versions');
                const manifestStr = await fs.readFile(path.join(packDir, localVersion, 'benchlocal.pack.json'), 'utf8');
                const manifest = JSON.parse(manifestStr);
                config.benchpacks[pack] = {
                    version: manifest.version,
                    source: 'registry',
                    path: path.join(packDir, localVersion),
                    enabled: true,
                    verifiers: (manifest.verifiers || manifest.sidecars || []).reduce((acc, spec) => {
                        acc[spec.id] = { auto_start: true, mode: 'docker' };
                        return acc;
                    }, {})
                };
                const core = await import('@benchlocal/core');
                await core.saveConfigFile(config, core.getConfigPath());
            } else {
                needsInstall = true;
            }
        } catch(e) {
            console.log(\`⚠️ 未发现本地测试包或读取失败，将尝试从网络下载 \${pack}\`);
            needsInstall = true;
        }
    } else {
        // 如果开启了UPDATE_PACKS，进行版本一致性校验
        try {
            const res = await fetch("https://ghproxy.net/https://raw.githubusercontent.com/stevibe/benchlocal-registry/main/registry.json");
            const registry = await res.json();
            const entry = registry.packs.find(e => e.id === pack);
            if (entry) {
                const latestVersion = entry.version;
                const currentJsonPath = path.join(baseDir, 'current.json');
                try {
                    const currentJsonStr = await fs.readFile(currentJsonPath, 'utf8');
                    const currentJson = JSON.parse(currentJsonStr);
                    const localVersion = currentJson.version;
                    
                    if (localVersion && localVersion.startsWith(latestVersion + '-')) {
                        console.log(\`[+] 发现本地已有最新版本 \${localVersion}，跳过下载...\`);
                        needsInstall = false;
                        
                        if (!config.benchpacks) config.benchpacks = {};
                        const packDir = path.join(baseDir, 'versions');
                        const manifestStr = await fs.readFile(path.join(packDir, localVersion, 'benchlocal.pack.json'), 'utf8');
                        const manifest = JSON.parse(manifestStr);
                        config.benchpacks[pack] = {
                            version: manifest.version,
                            source: 'registry',
                            path: path.join(packDir, localVersion),
                            enabled: true,
                            verifiers: (manifest.verifiers || manifest.sidecars || []).reduce((acc, spec) => {
                                acc[spec.id] = { auto_start: true, mode: 'docker' };
                                return acc;
                            }, {})
                        };
                        const core = await import('@benchlocal/core');
                        await core.saveConfigFile(config, core.getConfigPath());
                    }
                } catch(e) {
                    // ignore
                }
            }
        } catch(e) {
            console.log(\`⚠️ 获取注册表失败，将尝试下载/更新\`);
        }
    }

    if (needsInstall) {
      console.log(\`[+] 正在从注册表安装或更新 \${pack}...\`);
      try {
        config = await installBenchPackFromRegistry(
          config,
          pack,
          (progress) => console.log(\`  └─ [安装] \${progress.phase}: \${progress.message}\`),
          runtime
        );
        try {
            execSync('find ' + process.env.BENCHLOCAL_DIR + '/benchpacks/' + pack + ' -name llm-client.js -exec sed -i \'s/throw error;/throw new Error(error.message + " | URL: " + baseUrl + " | Cause: " + (error.cause ? (error.cause.message || error.cause) : "None"));/g\' {} + || true');
        } catch(e) { console.log(e); }
      } catch (err) {
        console.error(\`❌ 安装失败: \${err.message}\`);
        results[pack].status = 'INSTALL_FAILED';
        results[pack].error = err.message;
        continue;
      }
    }


    try {
      console.log(\`[+] 正在启动测试集依赖服务...\`);
      await startConfiguredBenchPackVerifiers(config, pack, {
        onProgress: (progress) => console.log(\`  └─ [服务启动] \${progress.verifierId}: \${progress.message}\`)
      });
      const summary = await runConfiguredBenchPack(
        config,
        pack,
        {
          modelIds: [\`local_model:\${MODEL_NAME}\`],
          executionMode: 'parallel',
          onEvent: (e) => {
            if (e.type === 'scenario_result') {
              const resultData = e.result;
              const pass = resultData.status !== 'fail' && resultData.score > 0;
              const errorMsg = resultData.error || resultData.summary || '-';

              results[pack].scenarios.push({
                id: resultData.scenarioId,
                pass: pass,
                score: resultData.score || 0,
                maxScore: resultData.maxScore || 100,
                durationMs: resultData.durationMs || 0,
                error: errorMsg
              });

              console.log(\`  └─ [用例] \${resultData.scenarioId}: \${pass ? '✅ PASS' : '❌ FAIL'}\`);
            }
          }
        },
        runtime
      );

      console.log(\`✅ \${pack} 测试结束。\`);

      results[pack].status = 'SUCCESS';
      let packScore = 0;
      let packMax = 0;
      for (const sc of results[pack].scenarios) {
        packScore += sc.score;
        packMax += sc.maxScore;
      }
      results[pack].score = packScore;
      results[pack].maxScore = packMax;
      results[pack].percent = packMax > 0 ? (packScore / packMax * 100).toFixed(2) : 0;
      results[pack].summaryPath = summary.summaryPath;

    } catch (err) {
      console.error(\`❌ 运行失败 \${pack}: \${err.message.split('\\n')[0]}\`);
      results[pack].status = 'RUN_FAILED';
      results[pack].error = err.message;
    }
  }

  console.log(\`\n\n📊 [3/4] 详细测评报告与大模型综合评分\`);
  console.log(\`==================================================\`);
  console.log(\`模型名称: \${MODEL_NAME}\`);
  console.log(\`测试接口: \${BASE_URL}\`);
  console.log(\`存放路径: ${RESULTS_DIR}/\`);
  console.log(\`==================================================\n\`);

  let totalScore = 0;
  let totalMaxScore = 0;

  let reportMd = \`# 大模型测评详细报告\n\n\`;
  const reportDate = new Date().toLocaleString();
  reportMd += \`**模型名称**: \${MODEL_NAME}\n\`;
  reportMd += \`**测试接口**: \${BASE_URL}\n\`;
  reportMd += \`**测试时间**: \${reportDate}\n\n\`;

  for (const pack of packs) {
    const res = results[pack];

    if (res.status === 'SUCCESS') {
      totalScore += res.score;
      totalMaxScore += res.maxScore;

      console.log(\`📦 测试集: \x1b[36m\${pack}\x1b[0m | 状态: \x1b[32m\${res.status}\x1b[0m | 得分: \${res.score}/\${res.maxScore} (\${res.percent}%)\`);
      console.log(\`--------------------------------------------------------------------------------\`);
      console.log(\`| 用例 ID \${' '.repeat(20)} | 状态 | 分数 | 失败原因 / 备注\`);
      console.log(\`|-----------------------------|------|------|---------------------------------|\`);

      reportMd += \`## 测试集: \${pack}\n\`;
      reportMd += \`- **状态**: ✅ \${res.status}\n\`;
      reportMd += \`- **得分**: \${res.score}/\${res.maxScore} (\${res.percent}%)\n\n\`;
      reportMd += \`| 用例 ID | 状态 | 分数 | 失败原因 / 备注 |\n\`;
      reportMd += \`|---------|------|------|-----------------|\n\`;

      for (const sc of res.scenarios) {
        const idPad = sc.id.substring(0, 27).padEnd(27, ' ');
        const passIcon = sc.pass ? '✅' : '❌';
        let scoreText = \`\${sc.score}/\${sc.maxScore}\`.padEnd(4, ' ');
        const errTrunc = sc.error.substring(0, 80).replace(/\n/g, ' ') + (sc.error.length > 80 ? '...' : '');

        console.log(\`| \${idPad} |  \${passIcon}  | \${scoreText} | \x1b[90m\${errTrunc}\x1b[0m\`);

        const mdErr = sc.error.replace(/\n/g, ' ');
        reportMd += \`| \${sc.id} | \${passIcon} | \${sc.score}/\${sc.maxScore} | \${mdErr} |\n\`;
      }
      console.log(\`\n\`);
      reportMd += \`\n\`;
    } else {
      console.log(\`📦 测试集: \x1b[36m\${pack}\x1b[0m | 状态: \x1b[31m\${res.status}\x1b[0m\`);
      console.log(\`--------------------------------------------------------------------------------\`);
      console.log(\`🚨 异常拦截原因: \x1b[31m\${res.error?.substring(0, 150).replace(/\n/g, ' ')}...\x1b[0m\n\`);

      reportMd += \`## 测试集: \${pack}\n\`;
      reportMd += \`- **状态**: ❌ \${res.status}\n\`;
      reportMd += \`- **异常原因**: \${res.error}\n\n\`;
    }
  }

  const overallPercent = totalMaxScore > 0 ? (totalScore / totalMaxScore * 100).toFixed(2) : 0;
  console.log(\`==================================================\`);
  console.log(\`🏆 大模型综合评分: \x1b[33m\${totalScore} / \${totalMaxScore}\x1b[0m (\x1b[33m\${overallPercent}%\x1b[0m)\`);
  console.log(\`==================================================\`);
  console.log(\`✨ 测评执行完毕，所有完整日志存入本地。\`);

  reportMd += \`## 🏆 大模型综合评分\n\n\`;
  reportMd += \`- **总得分**: \${totalScore} / \${totalMaxScore}\n\`;
  reportMd += \`- **综合胜率**: **\${overallPercent}%**\n\`;

  const modelNameForFile = MODEL_NAME.replace(/[^a-zA-Z0-9-]/g, '_');
  const d = new Date();
  const timeStr = d.getFullYear() +
                  String(d.getMonth() + 1).padStart(2, '0') +
                  String(d.getDate()).padStart(2, '0') + '_' +
                  String(d.getHours()).padStart(2, '0') +
                  String(d.getMinutes()).padStart(2, '0') +
                  String(d.getSeconds()).padStart(2, '0');
  const reportFileName = \`benchmark_\${modelNameForFile}_\${timeStr}_report.md\`;
  const reportPath = path.join('${RESULTS_DIR}', reportFileName);
  try {
    await fs.writeFile(reportPath, reportMd, 'utf8');
    console.log(\`📄 Markdown 测试报告已生成: \${reportPath}\`);
  } catch (err) {
    console.error(\`❌ 报告文件保存失败: \${err.message}\`);
  }
}

main().catch(console.error);
MJS_EOF

echo "🚀 [3/4] 执行测评脚本..."
env UPDATE_PACKS="${UPDATE_PACKS}" MODEL_NAME="${MODEL_NAME}" BASE_URL="${BASE_URL}" PACKS="${PACKS}" node run_evals.mjs

echo "🔧 [4/4] 恢复原始Dockerfile..."
for pack in bugfind-15 structoutput-15 hermesagent-20 cli-40; do
    if [ -d ~/.benchlocal/benchpacks/$pack/versions ]; then
        for pack_path in ~/.benchlocal/benchpacks/$pack/versions/*; do
            if [ -d "$pack_path/verification" ]; then
                backup_file="$pack_path/verification/Dockerfile.bak"
                if [ -f "$backup_file" ]; then
                    cp "$backup_file" "$pack_path/verification/Dockerfile"
                    rm "$backup_file"
                    echo "  ✅ 恢复 $pack ($pack_path)"
                fi
            fi
        done
    fi
done

echo "=========================================="
echo "✨ 所有任务执行完毕！"
echo "=========================================="
