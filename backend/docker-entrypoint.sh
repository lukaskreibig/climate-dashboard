#!/usr/bin/env bash
set -euo pipefail

PORT_VALUE="${PORT:-8000}"

# Some platforms inject the literal string "${PORT}" when interpolation fails.
if [ "${PORT_VALUE}" = "\${PORT}" ]; then
  PORT_VALUE="8000"
fi

# Fallback to default if the value still isn't a number.
if ! [[ "${PORT_VALUE}" =~ ^[0-9]+$ ]]; then
  echo "[entrypoint] Invalid PORT='${PORT_VALUE}', falling back to 8000" >&2
  PORT_VALUE="8000"
fi

echo "[entrypoint] Starting uvicorn on port ${PORT_VALUE}"
exec uvicorn main:app --host 0.0.0.0 --port "${PORT_VALUE}"
