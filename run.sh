#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/venv"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Fall Detection Data Handler - Clean Setup${NC}"
echo -e "${BLUE}=========================================${NC}\n"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

# Check prerequisites
echo -e "${BLUE}[1/5] Checking prerequisites...${NC}"

if ! command_exists python3; then
    echo -e "${RED}Error: Python 3 is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python 3 found: $(python3 --version)${NC}"

if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found: $(npm --version)${NC}"

if ! command_exists ffmpeg; then
    echo -e "${YELLOW}Warning: FFmpeg is not installed${NC}"
    echo -e "${YELLOW}Install with: sudo apt-get install ffmpeg (or brew install ffmpeg on Mac)${NC}"
fi

# Setup backend
echo -e "\n${BLUE}[2/5] Setting up backend...${NC}"

if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}Creating Python virtual environment...${NC}"
    python3 -m venv "$VENV_DIR"
fi

echo -e "${YELLOW}Activating virtual environment...${NC}"
source "$VENV_DIR/bin/activate"

if [ ! -f "$VENV_DIR/.dependencies_installed" ]; then
    echo -e "${YELLOW}Installing Python dependencies...${NC}"
    pip install -r "$BACKEND_DIR/requirements.txt"
    touch "$VENV_DIR/.dependencies_installed"
else
    echo -e "${GREEN}✓ Python dependencies already installed${NC}"
fi

# Setup frontend
echo -e "\n${BLUE}[3/5] Setting up frontend...${NC}"

cd "$FRONTEND_DIR"

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}Installing npm dependencies...${NC}"
    npm install
else
    echo -e "${GREEN}✓ npm dependencies already installed${NC}"
fi

# Start backend
echo -e "\n${BLUE}[4/5] Starting backend server...${NC}"

cd "$BACKEND_DIR"
source "$VENV_DIR/bin/activate"

python run.py > "$BACKEND_DIR/server.log" 2>&1 &
BACKEND_PID=$!

echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo -e "${GREEN}  Backend running at: http://localhost:5000${NC}"
echo -e "${GREEN}  Logs: $BACKEND_DIR/server.log${NC}"

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:5000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Warning: Backend may not be responding${NC}"
    fi
    sleep 1
done

# Start frontend
echo -e "\n${BLUE}[5/5] Starting frontend...${NC}"

cd "$FRONTEND_DIR"

# Set environment variable to avoid browser auto-open
export BROWSER=none

npm start > "$FRONTEND_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "${GREEN}  Frontend running at: http://localhost:3000${NC}"
echo -e "${GREEN}  Logs: $FRONTEND_DIR/frontend.log${NC}"

# Summary
echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}Services are running!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}Backend:  http://localhost:5000${NC}"
echo -e "\n${YELLOW}Default login credentials:${NC}"
echo -e "  Admin:     ${GREEN}admin / admin123${NC}"
echo -e "  Annotator: ${GREEN}annotator1 / test123${NC}"
echo -e "  Reviewer:  ${GREEN}reviewer1 / test123${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}\n"

# Wait for processes
wait
