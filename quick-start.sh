#!/bin/bash
# Quick start script for local development

echo "Quick Start - Fall Detection Data Handler"
echo "========================================"
echo ""

# Kill any existing processes on our ports
echo "Cleaning up existing processes..."
pkill -f "python.*run.py" 2>/dev/null
pkill -f "npm.*start" 2>/dev/null
lsof -ti:5000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Remove old PID file
rm -f local-production.pid

echo "✓ Ports cleared"
echo ""

# Check if we should use Docker or direct
read -p "Use Docker? (y/n, default: n): " use_docker
use_docker=${use_docker:-n}

if [ "$use_docker" = "y" ]; then
    echo "Starting with Docker..."
    ./deploy-local.sh
else
    echo "Starting without Docker..."
    
    # Start backend
    echo ""
    echo "Starting backend..."
    cd backend
    
    # Create venv if it doesn't exist
    if [ ! -d "venv" ]; then
        echo "Creating Python virtual environment..."
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
    else
        source venv/bin/activate
    fi
    
    # Set environment variables
    export FLASK_ENV=development
    export SQLALCHEMY_DATABASE_URI="sqlite:///fall_detection.db"
    
    # Start backend
    python run.py &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    
    # Give backend time to start
    echo "Waiting for backend to start..."
    sleep 5
    
    # Test backend
    if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
        echo "✓ Backend is running"
    else
        echo "✗ Backend failed to start. Check logs above."
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    # Start frontend
    cd ../frontend
    echo ""
    echo "Starting frontend..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    
    # Start frontend with correct API URL
    REACT_APP_API_URL=http://localhost:5000 npm start &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
    
    # Save PIDs
    cd ..
    echo "$BACKEND_PID $FRONTEND_PID" > local-production.pid
    
    echo ""
    echo "========================================"
    echo "✓ Application started successfully!"
    echo ""
    echo "Access at:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:5000/api"
    echo ""
    echo "Default login:"
    echo "  Username: admin"
    echo "  Password: admin123"
    echo ""
    echo "To stop: ./stop-local-production.sh"
    echo "========================================"
fi