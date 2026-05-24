#!/bin/bash
cd /home/xxs/models-test-system/llm-test-platform/backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 > ../backend.log 2>&1 &
