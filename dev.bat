@echo off
:: Simple dev script - assumes dependencies are already installed
:: Use run.bat for clean setup

setlocal

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"

echo Starting backend and frontend...
echo.

:: Start backend
cd /d "%BACKEND_DIR%"
start "Backend Server" cmd /k "call venv\Scripts\activate.bat && python run.py"

:: Start frontend
cd /d "%FRONTEND_DIR%"
start "Frontend Server" cmd /k "set BROWSER=none && npm start"

echo.
echo Services starting in new windows!
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo Close the Backend and Frontend windows to stop services
echo.
pause
