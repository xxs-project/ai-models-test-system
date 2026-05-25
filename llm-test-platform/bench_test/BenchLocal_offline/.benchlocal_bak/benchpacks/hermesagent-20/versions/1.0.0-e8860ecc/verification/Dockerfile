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
