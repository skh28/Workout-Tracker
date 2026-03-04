#!/usr/bin/env sh
set -e
PORT="${PORT:-8000}"
echo "PORT=$PORT (listening on 0.0.0.0:$PORT)" 1>&2
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
