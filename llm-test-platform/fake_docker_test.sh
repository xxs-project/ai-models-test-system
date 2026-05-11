#!/bin/bash
CMD="$1"
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
    CONTAINER=""
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
            echo "Started fake container"
            exit 0
        fi
    fi
    echo "Fake container started"
    exit 0
fi
