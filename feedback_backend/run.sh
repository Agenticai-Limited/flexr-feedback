#!/bin/bash
nohup $PWD/.venv/bin/uvicorn app.main:app > $PWD/run.log 2>&1 &
echo $! > ./pid.file &