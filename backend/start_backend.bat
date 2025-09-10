@echo off
REM Script para ejecutar el backend SGT con el entorno virtual correcto

REM Cambiar al directorio del backend
cd /d "C:\apps\miweb\SGT-Portal\backend"

REM Activar entorno virtual (establece todas las variables de PATH)
call "C:\apps\miweb\SGT-Portal\.venv\Scripts\activate.bat"

REM Ejecutar el servidor
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1 --access-log

REM Pausa en caso de error para debugging
if errorlevel 1 (
    echo ERROR: El servidor falló con código %errorlevel%
    pause
)
