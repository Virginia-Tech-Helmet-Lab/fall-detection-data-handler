@echo off
SETLOCAL

echo =========================================
echo Fall Detection Data Handler
echo =========================================
echo.

:: Get script directory
set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"
set "VENV_DIR=%BACKEND_DIR%\venv"

echo Directories:
echo   Backend:  %BACKEND_DIR%
echo   Frontend: %FRONTEND_DIR%
echo.

:: Check Python - redirect to stdout to avoid issues
echo Checking Python...
python --version 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python not found!
    pause
    exit /b 1
)
echo.

:: Check Node
echo Checking Node.js...
node --version 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js not found!
    pause
    exit /b 1
)
echo.

:: Check npm
echo Checking npm...
call npm --version 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm not found!
    pause
    exit /b 1
)
echo.

echo [OK] All prerequisites found!
echo.

:: Setup backend
echo =========================================
echo Setting up backend...
echo =========================================
echo.

if not exist "%VENV_DIR%" (
    echo Creating Python virtual environment...
    python -m venv "%VENV_DIR%"
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
    echo.
)

echo Activating virtual environment...
call "%VENV_DIR%\Scripts\activate.bat"
echo.

if not exist "%VENV_DIR%\.deps_installed" (
    echo Installing Python dependencies...
    echo This may take a few minutes...
    pip install -r "%BACKEND_DIR%\requirements.txt"
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo installed > "%VENV_DIR%\.deps_installed"
    echo [OK] Dependencies installed
    echo.
) else (
    echo [OK] Python dependencies already installed
    echo.
)

:: Setup frontend
echo =========================================
echo Setting up frontend...
echo =========================================
echo.

cd /d "%FRONTEND_DIR%"

if not exist "node_modules" (
    echo Installing npm dependencies...
    echo This may take several minutes...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install npm dependencies
        pause
        exit /b 1
    )
    echo [OK] npm dependencies installed
    echo.
) else (
    echo [OK] npm dependencies already installed
    echo.
)

:: Start servers
echo =========================================
echo Starting servers...
echo =========================================
echo.

cd /d "%BACKEND_DIR%"
echo Starting backend server in new window...
start "Backend Server" cmd /k "call "%VENV_DIR%\Scripts\activate.bat" && python run.py"
echo [OK] Backend started
echo.

cd /d "%FRONTEND_DIR%"
echo Starting frontend server in new window...
start "Frontend Server" cmd /k "set BROWSER=none && npm start"
echo [OK] Frontend started
echo.

:: Summary
echo =========================================
echo Services Started Successfully!
echo =========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo Default Login:
echo   Username: admin
echo   Password: admin123
echo.
echo Close the Backend and Frontend windows to stop services
echo.
pause
