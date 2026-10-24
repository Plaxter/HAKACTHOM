@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Creando entorno virtual...
  python -m venv .venv
  if errorlevel 1 goto :error
  ".venv\Scripts\python.exe" -m pip install --upgrade pip
  if errorlevel 1 goto :error
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt
  if errorlevel 1 goto :error
)

if not defined HOST set "HOST=127.0.0.1"
if not defined PORT set "PORT=5000"

echo.
echo Super Qubit esta disponible en http://%HOST%:%PORT%
echo Pulsa Ctrl+C para detener el servidor.
echo.
".venv\Scripts\python.exe" app.py
goto :eof

:error
echo.
echo No se pudo preparar el entorno. Comprueba que Python 3.11 o superior este instalado.
pause
