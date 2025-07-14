@echo off
echo Configurando backend...

REM Crear entorno virtual
python -m venv venv

REM Activar entorno virtual
call venv\Scripts\activate

REM Instalar dependencias
pip install -r requirements.txt

echo Backend configurado exitosamente!
echo Para ejecutar el backend:
echo 1. Activar el entorno virtual: venv\Scripts\activate
echo 2. Ejecutar: python main.py
