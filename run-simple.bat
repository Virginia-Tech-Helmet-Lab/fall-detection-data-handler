@echo off
echo =========================================
echo Fall Detection Data Handler
echo =========================================
echo.

set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"
set "VENV_DIR=%BACKEND_DIR%\venv"

echo Step 1: Creating venv if needed...
if not exist "%VENV_DIR%" (
    python -m venv "%VENV_DIR%"
)
echo.

echo Step 2: Installing backend dependencies...
cd /d "%BACKEND_DIR%"
call "%VENV_DIR%\Scripts\activate.bat"
if not exist "%VENV_DIR%\.installed" (
    pip install -r requirements.txt
    echo done > "%VENV_DIR%\.installed"
)
echo.

echo Step 3: Installing frontend dependencies...
cd /d "%FRONTEND_DIR%"
if not exist "node_modules" (
    call npm install
)
echo.

echo Step 4: Starting backend...
cd /d "%BACKEND_DIR%"
start "Backend" cmd /k "call "%VENV_DIR%\Scripts\activate.bat" && python run.py"
echo.

echo Step 5: Starting frontend...
cd /d "%FRONTEND_DIR%"
start "Frontend" cmd /k "set BROWSER=none && npm start"
echo.

echo =========================================
echo Started!
echo =========================================
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo Login: admin / admin123
echo.
pause
