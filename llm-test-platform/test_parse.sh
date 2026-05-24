#!/bin/bash
while [[ $# -gt 0 ]]; do
    case $1 in
        --name) CONTAINER="$2"; shift 2 ;;
        -p) PORT_MAP="$2"; shift 2 ;;
        --add-host) shift 2 ;;
        -d) shift 1 ;;
        *) IMAGE="$1"; shift 1 ;;
    esac
done
echo "CONTAINER: $CONTAINER"
echo "PORT_MAP: $PORT_MAP"
echo "IMAGE: $IMAGE"
