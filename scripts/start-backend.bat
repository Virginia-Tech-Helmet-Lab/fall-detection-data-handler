@echo off
echo Starting Fall Detection Backend...
cd backend
if exist ..\venv (
    call ..\venv\Scripts\activate
) else (
    echo Virtual environment not found. Running with global Python...
)
python run.py
pause