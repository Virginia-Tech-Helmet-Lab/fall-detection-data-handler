@echo off
setlocal enabledelayedexpansion

echo =========================================
echo Fall Detection Data Handler - Clean Setup
echo =========================================
echo.

:: Get script directory
set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"
set "VENV_DIR=%BACKEND_DIR%\venv"

:: Check prerequisites
echo [1/5] Checking prerequisites...
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [OK] Python found: !PYTHON_VERSION!

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js found: !NODE_VERSION!

:: Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm found: !NPM_VERSION!

:: Check FFmpeg (optional)
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo WARNING: FFmpeg is not installed
    echo Download from: https://ffmpeg.org/download.html
) else (
    echo [OK] FFmpeg found
)

:: Setup backend
echo.
echo [2/5] Setting up backend...
echo.

if not exist "%VENV_DIR%" (
    echo Creating Python virtual environment...
    python -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
)

echo Activating virtual environment...
call "%VENV_DIR%\Scripts\activate.bat"

if not exist "%VENV_DIR%\.dependencies_installed" (
    echo Installing Python dependencies...
    pip install -r "%BACKEND_DIR%\requirements.txt"
    if errorlevel 1 (
        echo ERROR: Failed to install Python dependencies
        pause
        exit /b 1
    )
    echo. > "%VENV_DIR%\.dependencies_installed"
    echo [OK] Python dependencies installed
) else (
    echo [OK] Python dependencies already installed
)

:: Setup frontend
echo.
echo [3/5] Setting up frontend...
echo.

cd /d "%FRONTEND_DIR%"

if not exist "%FRONTEND_DIR%\node_modules" (
    echo Installing npm dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install npm dependencies
        pause
        exit /b 1
    )
    echo [OK] npm dependencies installed
) else (
    echo [OK] npm dependencies already installed
)

:: Start backend
echo.
echo [4/5] Starting backend server...
echo.

cd /d "%BACKEND_DIR%"
call "%VENV_DIR%\Scripts\activate.bat"

:: Start backend in new window
start "Backend Server" cmd /k "call "%VENV_DIR%\Scripts\activate.bat" && python run.py"

echo [OK] Backend started in new window
echo      Backend running at: http://localhost:5000
echo.

:: Wait for backend to be ready
echo Waiting for backend to be ready...
set RETRY_COUNT=0
:wait_backend
timeout /t 1 /nobreak >nul
set /a RETRY_COUNT+=1
curl -s http://localhost:5000 >nul 2>&1
if errorlevel 1 (
    if !RETRY_COUNT! LSS 30 goto wait_backend
    echo WARNING: Backend may not be responding
) else (
    echo [OK] Backend is ready
)

:: Start frontend
echo.
echo [5/5] Starting frontend...
echo.

cd /d "%FRONTEND_DIR%"

:: Start frontend in new window
start "Frontend Server" cmd /k "set BROWSER=none && npm start"

echo [OK] Frontend started in new window
echo      Frontend running at: http://localhost:3000
echo.

:: Summary
echo =========================================
echo Services are running!
echo =========================================
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo Default login credentials:
echo   Admin:     admin / admin123
echo   Annotator: annotator1 / test123
echo   Reviewer:  reviewer1 / test123
echo.
echo Close the Backend and Frontend windows to stop services
echo.
pause
