# Windows Setup Guide for Fall Detection Data Handler

This guide will help you set up the Fall Detection Data Handler on Windows.

## Prerequisites

### 1. Python 3.8+ 
- Download from [python.org](https://www.python.org/downloads/)
- During installation, **check "Add Python to PATH"**

### 2. Node.js and npm
- Download from [nodejs.org](https://nodejs.org/)
- LTS version recommended

### 3. FFmpeg (Required for video processing)
- Download from [ffmpeg.org/download.html](https://ffmpeg.org/download.html)
- Choose "Windows builds by BtbN"
- Extract the zip file to `C:\ffmpeg`
- Add `C:\ffmpeg\bin` to your system PATH:
  1. Open System Properties → Advanced → Environment Variables
  2. Edit the "Path" variable
  3. Add `C:\ffmpeg\bin`
  4. Click OK and restart Command Prompt

### 4. Visual C++ Redistributables
- Required for OpenCV
- Download from [Microsoft](https://support.microsoft.com/en-us/help/2977003/the-latest-supported-visual-c-downloads)
- Install the x64 version

## Installation Steps

### Backend Setup

1. Open Command Prompt or PowerShell
2. Navigate to the project directory:
   ```cmd
   cd path\to\fall-detection-data-handler
   ```

3. Create a virtual environment (recommended):
   ```cmd
   python -m venv venv
   venv\Scripts\activate
   ```

4. Install backend dependencies:
   ```cmd
   cd backend
   pip install -r requirements.txt
   ```

5. Run the backend server:
   ```cmd
   python run.py
   ```
   The backend will start at `http://localhost:5000`

### Frontend Setup

1. Open a new Command Prompt or PowerShell
2. Navigate to the frontend directory:
   ```cmd
   cd path\to\fall-detection-data-handler\frontend
   ```

3. Install dependencies:
   ```cmd
   npm install
   ```

4. Start the development server:
   ```cmd
   npm start
   ```
   The frontend will open at `http://localhost:3000`

## Troubleshooting

### FFmpeg not found
- Verify installation: Run `ffmpeg -version` in Command Prompt
- If not found, check that `C:\ffmpeg\bin` is in your PATH
- Restart Command Prompt after adding to PATH

### Python packages fail to install
- Ensure you have the latest pip: `python -m pip install --upgrade pip`
- For opencv-python issues, install Visual C++ Redistributables

### Port already in use
- Backend: Change port in `backend/run.py`
- Frontend: The React dev server will prompt for an alternative port

### File upload issues
- Windows Defender might block large file uploads
- Add an exception for the project directory if needed

## Quick Start Scripts

Save these as `.bat` files in the project root:

**start-backend.bat:**
```batch
@echo off
cd backend
call ..\venv\Scripts\activate
python run.py
pause
```

**start-frontend.bat:**
```batch
@echo off
cd frontend
npm start
pause
```

**start-all.bat:**
```batch
@echo off
start "Backend" cmd /k "cd backend && call ..\venv\Scripts\activate && python run.py"
start "Frontend" cmd /k "cd frontend && npm start"
```

## Verifying Installation

1. Check FFmpeg: `ffmpeg -version`
2. Check Python: `python --version`
3. Check Node: `node --version`
4. Check npm: `npm --version`

All commands should return version numbers without errors.