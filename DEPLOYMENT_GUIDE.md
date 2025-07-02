# Deployment Guide - Fall Detection Data Handler

This guide explains how to deploy the Fall Detection Data Handler as a central server for team collaboration, and how to create a Windows installer for easy distribution.

## Table of Contents
- [Overview](#overview)
- [Option 1: Central PC Server Setup](#option-1-central-pc-server-setup)
- [Option 2: Windows Installer (Distributed App)](#option-2-windows-installer-distributed-app)
- [Client Access](#client-access)

## Overview

The Fall Detection Data Handler can be deployed in two ways:

1. **Central Server Model** - One PC hosts the application, team accesses via browser
2. **Distributed Installation** - Package as Windows installer for individual PCs

## Option 1: Central PC Server Setup

This is the recommended approach for team collaboration. One PC acts as a server, and all team members access it through their web browsers.

### Architecture
```
Central PC (Server)
├── Backend (Flask) - Port 5000
├── Frontend (React) - Port 3000  
└── Database (SQLite)
     ↓
Local Network
     ↓
Team Members (Clients)
└── Web Browser Only!
```

### Step 1: Find Your Server PC's IP Address

```cmd
# Open Command Prompt
ipconfig
# Look for IPv4 Address (e.g., 192.168.1.100)
```

Write down this IP address - your team will need it.

### Step 2: Prepare the Server PC

#### Install Prerequisites
```bash
# Python (if not installed)
# Download from https://www.python.org/downloads/

# Node.js (if not installed)  
# Download from https://nodejs.org/

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 3: Configure for Network Access

#### Create Server Configuration

Create `backend/server_config.py`:
```python
import os

# Your PC's IP address (from Step 1)
SERVER_IP = "192.168.1.100"  # CHANGE THIS!

# Server settings
HOST = '0.0.0.0'  # Accept connections from any IP
PORT = 5000
DEBUG = False

# Database location (absolute path)
basedir = os.path.abspath(os.path.dirname(__file__))
SQLALCHEMY_DATABASE_URI = f'sqlite:///{os.path.join(basedir, "instance", "fall_detection.db")}'

# Security
SECRET_KEY = 'your-secret-key-change-this-in-production'
JWT_SECRET_KEY = 'your-jwt-secret-key-change-this'

# CORS - Allow your network
CORS_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5000',
    f'http://{SERVER_IP}:3000',
    f'http://{SERVER_IP}:5000',
]
```

#### Update Backend to Use Config

Edit `backend/run.py`:
```python
from app import create_app
import os

if __name__ == '__main__':
    # Try to import server config
    try:
        from server_config import HOST, PORT, DEBUG
    except ImportError:
        HOST = '127.0.0.1'
        PORT = 5000
        DEBUG = True
    
    app = create_app()
    print(f"Starting server on {HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=DEBUG)
```

#### Configure Frontend

Create `frontend/.env.production.local`:
```
REACT_APP_API_URL=http://192.168.1.100:5000
HOST=0.0.0.0
```

### Step 4: Create Server Startup Scripts

#### Windows Batch File (`start_server.bat`):
```batch
@echo off
cls
echo ============================================
echo   Fall Detection Data Handler Server
echo ============================================
echo.

:: Get IP address
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /C:"IPv4 Address"') do (
    for /f "tokens=1" %%j in ("%%i") do (
        set IP=%%j
        goto :found
    )
)
:found

echo Server IP: %IP%
echo Frontend URL: http://%IP%:3000
echo.
echo Starting services...
echo.

:: Create logs directory
if not exist logs mkdir logs

:: Start backend server
start "Backend Server" /min cmd /c "cd backend && python run.py > ../logs/backend.log 2>&1"

:: Wait for backend to start
timeout /t 5 /nobreak > nul

:: Start frontend server
start "Frontend Server" /min cmd /c "cd frontend && npm start > ../logs/frontend.log 2>&1"

echo.
echo ============================================
echo Server is starting...
echo.
echo Team members can access:
echo   http://%IP%:3000
echo.
echo Login credentials:
echo   Admin: admin / admin123
echo   Annotator: annotator1 / test123
echo   Reviewer: reviewer1 / test123
echo.
echo Press any key to stop the server...
echo ============================================
pause > nul

:: Stop servers
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
echo.
echo Server stopped.
pause
```

#### PowerShell Script (`start_server.ps1`):
```powershell
# Fall Detection Server Startup Script

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Fall Detection Data Handler Server" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Get local IP
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet", "Wi-Fi" | Where-Object {$_.IPAddress -notlike "169.254.*"}).IPAddress
Write-Host "Server IP: $ip" -ForegroundColor Green
Write-Host "Frontend URL: http://${ip}:3000" -ForegroundColor Green
Write-Host ""

# Start services
Write-Host "Starting services..." -ForegroundColor Yellow

# Backend
$backend = Start-Process python -ArgumentList "run.py" -WorkingDirectory "backend" -WindowStyle Hidden -PassThru

# Frontend
Start-Sleep -Seconds 5
$frontend = Start-Process npm -ArgumentList "start" -WorkingDirectory "frontend" -WindowStyle Hidden -PassThru

Write-Host ""
Write-Host "Server is running!" -ForegroundColor Green
Write-Host ""
Write-Host "Team members can access:" -ForegroundColor Cyan
Write-Host "  http://${ip}:3000" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to stop the server..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Stop services
Stop-Process -Id $backend.Id -Force
Stop-Process -Id $frontend.Id -Force
Write-Host "Server stopped." -ForegroundColor Red
```

### Step 5: Configure Windows Firewall

Run as Administrator:
```cmd
:: Allow Python (Backend)
netsh advfirewall firewall add rule name="Fall Detection Backend" dir=in action=allow protocol=TCP localport=5000

:: Allow Node.js (Frontend)
netsh advfirewall firewall add rule name="Fall Detection Frontend" dir=in action=allow protocol=TCP localport=3000
```

### Step 6: Auto-Start on Windows Boot (Optional)

1. **Create VBS Script** (`auto_start.vbs`):
```vbscript
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\fall-detection-server"
WshShell.Run "start_server.bat", 0, False
Set WshShell = Nothing
```

2. **Add to Startup**:
   - Press `Win + R`, type `shell:startup`
   - Copy `auto_start.vbs` to this folder

3. **Or Use Task Scheduler**:
   - Open Task Scheduler
   - Create Basic Task
   - Trigger: "When computer starts"
   - Action: Start `start_server.bat`
   - Check "Run with highest privileges"

## Option 2: Windows Installer (Distributed App)

Create a standalone Windows installer that team members can install on their own PCs.

### Method 1: Using PyInstaller + Electron

#### Step 1: Prepare Backend for Distribution

Create `backend/main.py`:
```python
import sys
import os
import threading
import webbrowser
from app import create_app

def run_flask():
    app = create_app()
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)

def main():
    # Start Flask in a thread
    flask_thread = threading.Thread(target=run_flask)
    flask_thread.daemon = True
    flask_thread.start()
    
    # Open browser after a delay
    threading.Timer(3, lambda: webbrowser.open('http://localhost:3000')).start()
    
    # Keep the main thread alive
    try:
        while True:
            threading.Event().wait(1)
    except KeyboardInterrupt:
        sys.exit(0)

if __name__ == '__main__':
    main()
```

Create `backend/build_exe.spec`:
```python
# -*- mode: python ; coding: utf-8 -*-
import os
from PyInstaller.utils.hooks import collect_all

datas = [
    ('app/templates', 'app/templates'),
    ('app/static', 'app/static'),
    ('instance', 'instance'),
]

binaries = []
hiddenimports = [
    'flask',
    'flask_sqlalchemy',
    'flask_cors',
    'flask_login',
    'flask_jwt_extended',
    'flask_bcrypt',
    'sqlalchemy.sql.default_comparator',
]

# Collect all Flask and dependencies
for package in ['flask', 'flask_sqlalchemy', 'flask_cors', 'jinja2', 'click']:
    tmp_ret = collect_all(package)
    datas += tmp_ret[0]
    binaries += tmp_ret[1]
    hiddenimports += tmp_ret[2]

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=None)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='FallDetectionServer',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='app/static/icon.ico'
)
```

Build the backend:
```bash
cd backend
pip install pyinstaller
pyinstaller build_exe.spec
```

#### Step 2: Package Frontend with Electron

Create `frontend/electron/main.js`:
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, '../public/icon.ico')
  });

  // Load the React app
  mainWindow.loadURL('http://localhost:3000');
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  // Start the Python backend
  const backendPath = path.join(__dirname, '../../dist/FallDetectionServer.exe');
  backendProcess = spawn(backendPath);
  
  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });
}

app.whenReady().then(() => {
  startBackend();
  setTimeout(createWindow, 3000); // Wait for backend to start
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

Create `frontend/electron/package.json`:
```json
{
  "name": "fall-detection-app",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder"
  },
  "devDependencies": {
    "electron": "^22.0.0",
    "electron-builder": "^23.6.0"
  },
  "build": {
    "appId": "com.vthelmetlab.falldetection",
    "productName": "Fall Detection Data Handler",
    "directories": {
      "output": "dist"
    },
    "files": [
      "main.js",
      "../build/**/*",
      "../../dist/FallDetectionServer.exe"
    ],
    "win": {
      "target": "nsis",
      "icon": "../public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

Build the installer:
```bash
# Build React app
cd frontend
npm run build

# Package with Electron
cd electron
npm install
npm run build
```

### Method 2: Using NSIS Installer (Simpler)

Create `installer/installer.nsi`:
```nsis
!define APP_NAME "Fall Detection Data Handler"
!define APP_VERSION "1.0.0"
!define PUBLISHER "VT Helmet Lab"

Name "${APP_NAME}"
OutFile "FallDetectionInstaller.exe"
InstallDir "$PROGRAMFILES64\${APP_NAME}"
RequestExecutionLevel admin

!include "MUI2.nsh"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

Section "Install"
  SetOutPath "$INSTDIR"
  
  ; Copy all files
  File /r "..\backend\*"
  File /r "..\frontend\build\*"
  File "..\start_server.bat"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\start_server.bat"
  CreateShortcut "$SMPROGRAMS\${APP_NAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"
  CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\start_server.bat"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
  ; Registry information
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
                   "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
                   "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
                   "Publisher" "${PUBLISHER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" \
                   "DisplayVersion" "${APP_VERSION}"
SectionEnd

Section "Uninstall"
  ; Remove files
  RMDir /r "$INSTDIR"
  
  ; Remove shortcuts
  Delete "$SMPROGRAMS\${APP_NAME}\*.*"
  RMDir "$SMPROGRAMS\${APP_NAME}"
  Delete "$DESKTOP\${APP_NAME}.lnk"
  
  ; Remove registry keys
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
SectionEnd
```

Build installer:
```bash
# Install NSIS from https://nsis.sourceforge.io/
# Run:
makensis installer.nsi
```

### Method 3: Python + React Bundle Script

Create `build_windows_app.py`:
```python
import os
import shutil
import subprocess
import zipfile
from pathlib import Path

def build_app():
    """Build complete Windows application"""
    
    print("Building Fall Detection Data Handler...")
    
    # 1. Build frontend
    print("Building frontend...")
    os.chdir("frontend")
    subprocess.run(["npm", "run", "build"], check=True)
    os.chdir("..")
    
    # 2. Create distribution folder
    dist_dir = Path("dist/FallDetectionApp")
    dist_dir.mkdir(parents=True, exist_ok=True)
    
    # 3. Copy backend
    print("Copying backend...")
    shutil.copytree("backend", dist_dir / "backend", 
                    ignore=shutil.ignore_patterns('__pycache__', '*.pyc', 'instance'))
    
    # 4. Copy frontend build
    print("Copying frontend...")
    shutil.copytree("frontend/build", dist_dir / "frontend")
    
    # 5. Create run script
    run_script = '''@echo off
cd /d "%~dp0"
start "Backend" cmd /c "cd backend && python run.py"
timeout /t 5
start http://localhost:3000
cd frontend
python -m http.server 3000
'''
    
    with open(dist_dir / "run.bat", "w") as f:
        f.write(run_script)
    
    # 6. Create requirements installer
    req_script = '''@echo off
echo Installing requirements...
cd backend
pip install -r requirements.txt
echo.
echo Installation complete!
pause
'''
    
    with open(dist_dir / "install_requirements.bat", "w") as f:
        f.write(req_script)
    
    # 7. Create README
    readme = '''# Fall Detection Data Handler

## First Time Setup
1. Run install_requirements.bat
2. Run run.bat

## Daily Use
Just run run.bat

## Default Login
Username: admin
Password: admin123
'''
    
    with open(dist_dir / "README.txt", "w") as f:
        f.write(readme)
    
    # 8. Create ZIP file
    print("Creating ZIP archive...")
    shutil.make_archive("FallDetectionApp", 'zip', "dist")
    
    print("Build complete! Distribute FallDetectionApp.zip to team members.")

if __name__ == "__main__":
    build_app()
```

## Client Access

### For Team Members

Team members only need:
1. **Modern web browser** (Chrome, Firefox, Edge)
2. **Server URL** from IT/Admin
3. **Login credentials**

### Access Instructions (Share with Team)

```
===========================================
Fall Detection Data Handler - Access Guide
===========================================

1. Open your web browser

2. Enter the URL provided by your admin:
   http://[SERVER-IP]:3000
   
3. Login with your credentials:
   - Username: [your-username]
   - Password: [your-password]
   
4. For help, contact: [admin-email]

Browser Requirements:
- Chrome 90+
- Firefox 88+  
- Edge 90+
- Safari 14+

===========================================
```

### Network Access

#### Same Office/Building
- Direct access via IP: `http://192.168.1.100:3000`

#### Remote Access (VPN)
1. Connect to company VPN
2. Access same URL as office

#### Internet Access (Port Forwarding)
1. Router configuration needed
2. Use dynamic DNS service
3. Access via: `http://yourcompany.ddns.net:3000`

## Troubleshooting

### Server Issues

#### Backend Won't Start
```bash
# Check if port 5000 is in use
netstat -an | findstr :5000

# Kill process using port
taskkill /F /PID [process-id]

# Check Python installation
python --version

# Reinstall requirements
cd backend
pip install -r requirements.txt --force-reinstall
```

#### Frontend Won't Start
```bash
# Check if port 3000 is in use
netstat -an | findstr :3000

# Clear npm cache
cd frontend
npm cache clean --force
npm install

# Check Node version
node --version
```

### Client Issues

#### Can't Access Server
1. Check server IP is correct
2. Verify firewall rules
3. Test with: `ping [server-ip]`
4. Try: `http://[server-ip]:5000/api/test`

#### Login Problems
```python
# Reset admin password (run on server)
cd backend
python
>>> from app import create_app, db
>>> from app.models import User
>>> app = create_app()
>>> with app.app_context():
...     admin = User.query.filter_by(username='admin').first()
...     admin.set_password('new_password')
...     db.session.commit()
```

### Performance Issues

#### Slow Response
1. Check server CPU/RAM usage
2. Restart both services
3. Clear browser cache
4. Check network speed

#### Database Optimization
```python
# Run on server periodically
cd backend
python
>>> from app import create_app, db
>>> app = create_app()
>>> with app.app_context():
...     db.engine.execute("VACUUM")  # SQLite optimization
```

### Common Error Messages

| Error | Solution |
|-------|----------|
| "Connection refused" | Server not running or firewall blocking |
| "CORS error" | Update CORS settings in server_config.py |
| "Token expired" | User needs to login again |
| "Database locked" | Too many simultaneous writes - restart backend |
| "Out of memory" | Restart services, check video sizes |

### Logs Location

Check logs for detailed errors:
- Backend: `logs/backend.log`
- Frontend: `logs/frontend.log`
- Windows Event Viewer for system issues

### Backup Script

Create `backup.bat`:
```batch
@echo off
set BACKUP_DIR=D:\Backups\FallDetection
set DATE=%date:~-4,4%%date:~-10,2%%date:~-7,2%

:: Create backup directory
mkdir "%BACKUP_DIR%\%DATE%"

:: Backup database
copy "backend\instance\fall_detection.db" "%BACKUP_DIR%\%DATE%\"

:: Backup uploads
xcopy "backend\uploads" "%BACKUP_DIR%\%DATE%\uploads\" /E /I

:: Backup configs
copy "backend\server_config.py" "%BACKUP_DIR%\%DATE%\"

echo Backup completed to %BACKUP_DIR%\%DATE%
pause
```