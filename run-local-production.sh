#!/bin/bash
# Run locally without Docker (requires PostgreSQL installed)

echo "Fall Detection Data Handler - Local Production (No Docker)"
echo "========================================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed."
    exit 1
fi

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "ERROR: PostgreSQL is not installed."
    echo ""
    echo "To install PostgreSQL on Ubuntu/Debian:"
    echo "  sudo apt update"
    echo "  sudo apt install postgresql postgresql-contrib"
    echo ""
    echo "Or use Docker deployment instead: ./deploy-local.sh"
    exit 1
fi

# Create directories
mkdir -p uploads/thumbnails uploads/preview backups data

# Set up Python environment if needed
if [ ! -d "backend/venv" ]; then
    echo "Creating Python virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
else
    source backend/venv/bin/activate
fi

# Check if PostgreSQL is running
if ! sudo -u postgres psql -c "SELECT 1" &> /dev/null; then
    echo "Starting PostgreSQL..."
    sudo systemctl start postgresql
fi

# Create database if it doesn't exist
echo "Setting up database..."
sudo -u postgres psql << EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'falldetection') THEN
        CREATE USER falldetection WITH PASSWORD 'localpassword123';
    END IF;
END\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE falldetection_local OWNER falldetection'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'falldetection_local')\\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE falldetection_local TO falldetection;
EOF

# Export environment variables
export FLASK_ENV=production
export DB_USER=falldetection
export DB_PASSWORD=localpassword123
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=falldetection_local
export SECRET_KEY=local-secret-key-$(openssl rand -hex 16)
export JWT_SECRET_KEY=local-jwt-key-$(openssl rand -hex 16)
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=admin123

# Initialize database
cd backend
echo "Initializing database tables..."
python -c "
from app import create_app
from app.database import db
app = create_app('production')
with app.app_context():
    db.create_all()
    print('Database initialized')
"

# Start backend in background
echo ""
echo "Starting backend server..."
python run.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Give backend time to start
sleep 5

# Start frontend
cd ../frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

echo ""
echo "Starting frontend..."
REACT_APP_API_URL=http://localhost:5000 npm start &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Create PID file
echo "$BACKEND_PID $FRONTEND_PID" > ../local-production.pid

echo ""
echo "======================================"
echo "✅ Local Production Started!"
echo "======================================"
echo ""
echo "Access your application at:"
echo "  📺 Frontend: http://localhost:3000"
echo "  🔧 Backend API: http://localhost:5000/api"
echo ""
echo "Default credentials:"
echo "  👤 Username: admin"
echo "  🔑 Password: admin123"
echo ""
echo "To stop the servers:"
echo "  ./stop-local-production.sh"
echo ""
echo "To create a backup:"
echo "  cd backend && python backup_database.py"
echo ""
echo "Log files:"
echo "  Backend: Check terminal output"
echo "  Database: /var/log/postgresql/"