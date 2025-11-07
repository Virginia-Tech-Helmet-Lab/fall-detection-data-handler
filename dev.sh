#!/bin/bash

# Simple dev script - assumes dependencies are already installed
# Use run.sh for clean setup

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${GREEN}Starting backend and frontend...${NC}\n"

# Start backend
cd "$BACKEND_DIR"
source venv/bin/activate
python run.py &

# Start frontend
cd "$FRONTEND_DIR"
BROWSER=none npm start &

echo -e "\n${GREEN}Services running!${NC}"
echo -e "Frontend: http://localhost:3000"
echo -e "Backend:  http://localhost:5000"
echo -e "\n${YELLOW}Press Ctrl+C to stop${NC}\n"

wait
