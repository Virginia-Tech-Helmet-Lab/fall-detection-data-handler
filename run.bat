@echo off
echo =========================================
echo Fall Detection Data Handler
echo =========================================
echo.

echo DEBUG: Script started
echo.

:: Get script directory
set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"
set "VENV_DIR=%BACKEND_DIR%\venv"

echo DEBUG: Directories set
echo BACKEND_DIR: %BACKEND_DIR%
echo FRONTEND_DIR: %FRONTEND_DIR%
echo VENV_DIR: %VENV_DIR%
echo.

:: Check Python
echo DEBUG: About to check Python
python --version
echo DEBUG: Python check complete, errorlevel: %errorlevel%
echo.

:: Check Node
echo DEBUG: About to check Node
node --version
echo DEBUG: Node check complete, errorlevel: %errorlevel%
echo.

:: Check npm
echo DEBUG: About to check npm
npm --version
echo DEBUG: npm check complete, errorlevel: %errorlevel%
echo.

echo [OK] Prerequisites found!
echo.

:: Setup backend
echo =========================================
echo Setting up backend...
echo =========================================
echo.

echo DEBUG: Checking if venv exists at: %VENV_DIR%
if not exist "%VENV_DIR%" (
    echo DEBUG: venv does not exist, creating...
    python -m venv "%VENV_DIR%"
    echo DEBUG: venv creation complete, errorlevel: %errorlevel%
) else (
    echo DEBUG: venv already exists
)
echo.

echo DEBUG: About to activate venv
call "%VENV_DIR%\Scripts\activate.bat"
echo DEBUG: Activation complete, errorlevel: %errorlevel%
echo.

echo DEBUG: Checking for .deps_installed marker
if not exist "%VENV_DIR%\.deps_installed" (
    echo Installing Python dependencies...
    echo This may take a few minutes...
    pip install -r "%BACKEND_DIR%\requirements.txt"
    echo DEBUG: pip install complete, errorlevel: %errorlevel%
    echo installed > "%VENV_DIR%\.deps_installed"
) else (
    echo [OK] Python dependencies already installed
)
echo.

:: Setup frontend
echo =========================================
echo Setting up frontend...
echo =========================================
echo.

echo DEBUG: Changing to frontend dir: %FRONTEND_DIR%
cd /d "%FRONTEND_DIR%"
echo DEBUG: Current directory: %CD%
echo.

echo DEBUG: Checking if node_modules exists
if not exist "%FRONTEND_DIR%\node_modules" (
    echo Installing npm dependencies...
    echo This may take a few minutes...
    call npm install
    echo DEBUG: npm install complete, errorlevel: %errorlevel%
) else (
    echo [OK] npm dependencies already installed
)
echo.

:: Start servers
echo =========================================
echo Starting servers...
echo =========================================
echo.

echo DEBUG: Changing to backend dir
cd /d "%BACKEND_DIR%"
echo DEBUG: Starting backend in new window
start "Backend Server" cmd /k "call "%VENV_DIR%\Scripts\activate.bat" && python run.py"
echo [OK] Backend started in new window
echo.

echo DEBUG: Changing to frontend dir
cd /d "%FRONTEND_DIR%"
echo DEBUG: Starting frontend in new window
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
echo DEBUG: Script complete
pause
