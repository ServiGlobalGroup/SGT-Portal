@echo off
cd /d "c:\Users\PC-EMATRA-AZ\Desktop\IT\portal\backend"
set PYTHONPATH=c:\Users\PC-EMATRA-AZ\Desktop\IT\portal\backend
C:\Users\PC-EMATRA-AZ\AppData\Local\Programs\Python\Python313\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
pause
