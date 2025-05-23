@echo off
echo Starting Fall Detection Data Handler...
echo.
echo Starting Backend Server...
start "Fall Detection Backend" cmd /k "cd backend && if exist ..\venv (call ..\venv\Scripts\activate) && python run.py"
echo.
echo Waiting 3 seconds before starting Frontend...
timeout /t 3 /nobreak > nul
echo.
echo Starting Frontend Development Server...
start "Fall Detection Frontend" cmd /k "cd frontend && npm start"
echo.
echo Both servers are starting in separate windows.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
pause