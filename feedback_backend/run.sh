#!/bin/bash
nohup $PWD/.venv/bin/uvicorn app.main:app --port 8001> $PWD/run.log 2>&1 &
echo $! > ./pid.file &