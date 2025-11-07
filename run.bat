@echo off
echo =========================================
echo Fall Detection Data Handler
echo =========================================
echo.

:: Get script directory
set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"
set "VENV_DIR=%BACKEND_DIR%\venv"

:: Check Python
echo Checking Python...
python --version
if errorlevel 1 (
    echo ERROR: Python not found!
    pause
    exit /b 1
)
echo.

:: Check Node
echo Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found!
    pause
    exit /b 1
)
echo.

:: Check npm
echo Checking npm...
npm --version
if errorlevel 1 (
    echo ERROR: npm not found!
    pause
    exit /b 1
)
echo.

echo [OK] Prerequisites found!
echo.

:: Setup backend
echo =========================================
echo Setting up backend...
echo =========================================
echo.

if not exist "%VENV_DIR%" (
    echo Creating virtual environment...
    python -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo ERROR: Failed to create venv
        pause
        exit /b 1
    )
    echo [OK] Created venv
    echo.
)

echo Activating virtual environment...
call "%VENV_DIR%\Scripts\activate.bat"
if errorlevel 1 (
    echo ERROR: Failed to activate venv
    pause
    exit /b 1
)
echo.

if not exist "%VENV_DIR%\.deps_installed" (
    echo Installing Python dependencies...
    pip install -r "%BACKEND_DIR%\requirements.txt"
    if errorlevel 1 (
        echo ERROR: Failed to install Python dependencies
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

if not exist "%FRONTEND_DIR%\node_modules" (
    echo Installing npm dependencies...
    echo This may take a few minutes...
    call npm install
    if errorlevel 1 (
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
echo Starting backend server...
start "Backend Server" cmd /k "call "%VENV_DIR%\Scripts\activate.bat" && python run.py"
echo [OK] Backend started in new window
echo.

cd /d "%FRONTEND_DIR%"
echo Starting frontend server...
start "Frontend Server" cmd /k "set BROWSER=none && npm start"
echo [OK] Frontend started in new window
echo.

:: Summary
echo =========================================
echo Services Started!
echo =========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo Default Login:
echo   admin / admin123
echo.
echo Close the server windows to stop
echo.
pause
