@echo off
setlocal enabledelayedexpansion

:: Colors using ANSI escape codes (Windows 10+)
set "BLUE=[94m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "NC=[0m"

echo %BLUE%=========================================%NC%
echo %BLUE%Fall Detection Data Handler - Clean Setup%NC%
echo %BLUE%=========================================%NC%
echo.

:: Get script directory
set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"
set "VENV_DIR=%BACKEND_DIR%\venv"

:: Check prerequisites
echo %BLUE%[1/5] Checking prerequisites...%NC%

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo %RED%Error: Python is not installed or not in PATH%NC%
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo %GREEN%✓ Python found: !PYTHON_VERSION!%NC%

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo %RED%Error: Node.js is not installed or not in PATH%NC%
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo %GREEN%✓ Node.js found: !NODE_VERSION!%NC%

:: Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo %RED%Error: npm is not installed%NC%
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo %GREEN%✓ npm found: !NPM_VERSION!%NC%

:: Check FFmpeg (optional)
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%Warning: FFmpeg is not installed%NC%
    echo Download from: https://ffmpeg.org/download.html
) else (
    echo %GREEN%✓ FFmpeg found%NC%
)

:: Setup backend
echo.
echo %BLUE%[2/5] Setting up backend...%NC%

if not exist "%VENV_DIR%" (
    echo %YELLOW%Creating Python virtual environment...%NC%
    python -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo %RED%Error: Failed to create virtual environment%NC%
        pause
        exit /b 1
    )
)

echo %YELLOW%Activating virtual environment...%NC%
call "%VENV_DIR%\Scripts\activate.bat"

if not exist "%VENV_DIR%\.dependencies_installed" (
    echo %YELLOW%Installing Python dependencies...%NC%
    pip install -r "%BACKEND_DIR%\requirements.txt"
    if errorlevel 1 (
        echo %RED%Error: Failed to install Python dependencies%NC%
        pause
        exit /b 1
    )
    echo. > "%VENV_DIR%\.dependencies_installed"
) else (
    echo %GREEN%✓ Python dependencies already installed%NC%
)

:: Setup frontend
echo.
echo %BLUE%[3/5] Setting up frontend...%NC%

cd /d "%FRONTEND_DIR%"

if not exist "%FRONTEND_DIR%\node_modules" (
    echo %YELLOW%Installing npm dependencies...%NC%
    call npm install
    if errorlevel 1 (
        echo %RED%Error: Failed to install npm dependencies%NC%
        pause
        exit /b 1
    )
) else (
    echo %GREEN%✓ npm dependencies already installed%NC%
)

:: Start backend
echo.
echo %BLUE%[4/5] Starting backend server...%NC%

cd /d "%BACKEND_DIR%"
call "%VENV_DIR%\Scripts\activate.bat"

:: Start backend in new window
start "Backend Server" cmd /k "call "%VENV_DIR%\Scripts\activate.bat" && python run.py"

echo %GREEN%✓ Backend started in new window%NC%
echo %GREEN%  Backend running at: http://localhost:5000%NC%

:: Wait for backend to be ready
echo %YELLOW%Waiting for backend to be ready...%NC%
set RETRY_COUNT=0
:wait_backend
timeout /t 1 /nobreak >nul
set /a RETRY_COUNT+=1
curl -s http://localhost:5000 >nul 2>&1
if errorlevel 1 (
    if !RETRY_COUNT! LSS 30 goto wait_backend
    echo %YELLOW%Warning: Backend may not be responding%NC%
) else (
    echo %GREEN%✓ Backend is ready%NC%
)

:: Start frontend
echo.
echo %BLUE%[5/5] Starting frontend...%NC%

cd /d "%FRONTEND_DIR%"

:: Start frontend in new window
start "Frontend Server" cmd /k "set BROWSER=none && npm start"

echo %GREEN%✓ Frontend started in new window%NC%
echo %GREEN%  Frontend running at: http://localhost:3000%NC%

:: Summary
echo.
echo %GREEN%=========================================%NC%
echo %GREEN%Services are running!%NC%
echo %GREEN%=========================================%NC%
echo %GREEN%Frontend: http://localhost:3000%NC%
echo %GREEN%Backend:  http://localhost:5000%NC%
echo.
echo %YELLOW%Default login credentials:%NC%
echo   Admin:     %GREEN%admin / admin123%NC%
echo   Annotator: %GREEN%annotator1 / test123%NC%
echo   Reviewer:  %GREEN%reviewer1 / test123%NC%
echo.
echo %YELLOW%Close the Backend and Frontend windows to stop services%NC%
echo.
pause
