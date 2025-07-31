#!/bin/bash
# Local deployment script with data persistence

set -e

echo "Fall Detection Data Handler - Local Production Deployment"
echo "========================================================"
echo ""
echo "This will set up a local production environment with:"
echo "  - PostgreSQL database for data persistence"
echo "  - Automatic daily backups"
echo "  - Persistent storage for uploads"
echo ""

# Create necessary directories
echo "Creating directories..."
mkdir -p data/postgres backups uploads/thumbnails uploads/preview

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed."
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "ERROR: Docker Compose is not installed."
    echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if containers are already running
if docker-compose -f docker-compose.local.yml ps 2>/dev/null | grep -q "Up"; then
    echo ""
    echo "Some services are already running!"
    echo ""
    docker-compose -f docker-compose.local.yml ps
    echo ""
    
    # Check if all required services are running
    POSTGRES_UP=$(docker-compose -f docker-compose.local.yml ps postgres 2>/dev/null | grep -q "Up" && echo "yes" || echo "no")
    BACKEND_UP=$(docker-compose -f docker-compose.local.yml ps backend 2>/dev/null | grep -q "Up" && echo "yes" || echo "no")
    FRONTEND_UP=$(docker-compose -f docker-compose.local.yml ps frontend 2>/dev/null | grep -q "Up" && echo "yes" || echo "no")
    
    if [ "$BACKEND_UP" = "no" ] || [ "$FRONTEND_UP" = "no" ]; then
        echo "Some services failed to start. Attempting to fix..."
        echo ""
        
        # Try to start missing services
        docker-compose -f docker-compose.local.yml up -d backend frontend
        
        sleep 5
        echo ""
        echo "Current status:"
        docker-compose -f docker-compose.local.yml ps
    fi
    
    echo ""
    echo "Use './deploy-local.sh restart' to restart all services"
    echo "Use './deploy-local.sh stop' to stop all services"
    echo "Use './deploy-local.sh logs' to view logs"
    exit 0
fi

# Handle commands BEFORE checking if services are running
if [ "$1" == "stop" ]; then
    echo "Stopping services..."
    docker-compose -f docker-compose.local.yml down
    exit 0
elif [ "$1" == "restart" ]; then
    echo "Restarting services..."
    docker-compose -f docker-compose.local.yml restart
    exit 0
elif [ "$1" == "backup" ]; then
    echo "Creating manual backup..."
    docker-compose -f docker-compose.local.yml exec backend python backup_database.py
    exit 0
elif [ "$1" == "logs" ]; then
    docker-compose -f docker-compose.local.yml logs -f
    exit 0
elif [ "$1" == "rebuild" ]; then
    echo "Rebuilding backend with latest code..."
    docker-compose -f docker-compose.local.yml stop backend
    docker-compose -f docker-compose.local.yml rm -f backend
    docker-compose -f docker-compose.local.yml build --no-cache backend
    docker-compose -f docker-compose.local.yml up -d backend
    echo "Backend rebuilt and restarted!"
    exit 0
fi

# Build and start
echo "Building Docker images..."
docker-compose -f docker-compose.local.yml build

echo ""
echo "Starting services..."
docker-compose -f docker-compose.local.yml up -d

# Wait for database
echo ""
echo "Waiting for database to initialize..."
sleep 15

# Initialize database
echo "Setting up database..."
docker-compose -f docker-compose.local.yml exec -T backend python -c "
from app import create_app
from app.database import db
app = create_app('production')
with app.app_context():
    db.create_all()
    print('Database tables created')
"

# Check if admin exists
echo ""
echo "Checking admin user..."
docker-compose -f docker-compose.local.yml exec -T backend python -c "
from app import create_app
from app.models import User
app = create_app('production')
with app.app_context():
    admin = User.query.filter_by(username='admin').first()
    if admin:
        print(f'✓ Admin user exists: {admin.username}')
    else:
        print('✗ Admin user not found - will be created on first access')
"

# Create initial backup
echo ""
echo "Creating initial backup..."
docker-compose -f docker-compose.local.yml exec -T backend python backup_database.py || echo "Initial backup will be created after first data entry"

# Show status
echo ""
echo "======================================"
echo "✅ Local Deployment Complete!"
echo "======================================"
echo ""
docker-compose -f docker-compose.local.yml ps
echo ""
echo "Access your application at:"
echo "  📺 Frontend: http://localhost:3000"
echo "  🔧 Backend API: http://localhost:5000/api"
echo ""
echo "Default credentials:"
echo "  👤 Username: admin"
echo "  🔑 Password: admin123"
echo ""
echo "Useful commands:"
echo "  ./deploy-local.sh logs     - View logs"
echo "  ./deploy-local.sh stop     - Stop all services"
echo "  ./deploy-local.sh restart  - Restart services"
echo "  ./deploy-local.sh backup   - Create manual backup"
echo ""
echo "Data persistence:"
echo "  📁 Database: ./data/postgres/"
echo "  📸 Uploads: ./uploads/"
echo "  💾 Backups: ./backups/"
echo ""
echo "Your data is safe! Daily automatic backups are enabled."