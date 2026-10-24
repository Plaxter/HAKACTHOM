#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

PYTHON="${PYTHON:-python3}"

if [ -x ".venv/Scripts/python.exe" ]; then
  VENV_PY=".venv/Scripts/python.exe"
elif [ -x ".venv/bin/python" ]; then
  VENV_PY=".venv/bin/python"
else
  echo "Creando entorno virtual..."
  "$PYTHON" -m venv .venv
  if [ -x ".venv/Scripts/python.exe" ]; then
    VENV_PY=".venv/Scripts/python.exe"
  else
    VENV_PY=".venv/bin/python"
  fi
  "$VENV_PY" -m pip install --upgrade pip
  "$VENV_PY" -m pip install -r requirements.txt
fi

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-5000}"

echo
echo "Super Qubit esta disponible en http://${HOST}:${PORT}"
echo "Pulsa Ctrl+C para detener el servidor."
echo
exec "$VENV_PY" app.py
