#!/usr/bin/env sh
set -e
PORT="${PORT:-8000}"
echo "Listening on 0.0.0.0:$PORT (PORT=$PORT)"
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
