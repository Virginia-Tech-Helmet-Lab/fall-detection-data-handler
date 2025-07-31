#!/bin/bash
# Local deployment script with data persistence

set -e

# Handle commands FIRST, before any other output
if [ "$1" == "stop" ]; then
    echo "Stopping Fall Detection services..."
    docker-compose -f docker-compose.local.yml down
    echo "Services stopped."
    exit 0
elif [ "$1" == "restart" ]; then
    echo "Restarting Fall Detection services..."
    docker-compose -f docker-compose.local.yml restart
    echo "Services restarted."
    exit 0
elif [ "$1" == "rebuild" ]; then
    if [ "$2" == "backend" ]; then
        echo "Rebuilding backend with latest code..."
        docker-compose -f docker-compose.local.yml stop backend
        docker-compose -f docker-compose.local.yml rm -f backend
        docker-compose -f docker-compose.local.yml build --no-cache backend
        docker-compose -f docker-compose.local.yml up -d backend
        echo "Backend rebuilt and restarted!"
    elif [ "$2" == "frontend" ]; then
        echo "Rebuilding frontend with latest code..."
        docker-compose -f docker-compose.local.yml stop frontend
        docker-compose -f docker-compose.local.yml rm -f frontend
        docker-compose -f docker-compose.local.yml build --no-cache frontend
        docker-compose -f docker-compose.local.yml up -d frontend
        echo "Frontend rebuilt and restarted!"
    else
        echo "Rebuilding all services with latest code..."
        docker-compose -f docker-compose.local.yml down
        docker-compose -f docker-compose.local.yml build --no-cache
        docker-compose -f docker-compose.local.yml up -d
        echo "All services rebuilt and restarted!"
    fi
    exit 0
elif [ "$1" == "logs" ]; then
    docker-compose -f docker-compose.local.yml logs -f
    exit 0
elif [ "$1" == "backup" ]; then
    echo "Creating manual backup..."
    docker-compose -f docker-compose.local.yml exec backend python backup_database.py
    exit 0
elif [ "$1" == "status" ]; then
    docker-compose -f docker-compose.local.yml ps
    exit 0
fi

# Show banner for normal startup
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
    echo "Commands:"
    echo "  ./deploy-local-v2.sh stop           - Stop all services"
    echo "  ./deploy-local-v2.sh restart        - Restart all services"
    echo "  ./deploy-local-v2.sh rebuild        - Rebuild all services"
    echo "  ./deploy-local-v2.sh rebuild backend  - Rebuild only backend"
    echo "  ./deploy-local-v2.sh rebuild frontend - Rebuild only frontend"
    echo "  ./deploy-local-v2.sh logs           - View logs"
    echo "  ./deploy-local-v2.sh backup         - Create manual backup"
    echo "  ./deploy-local-v2.sh status         - Show status"
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

# Show final status
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
echo "Commands:"
echo "  ./deploy-local-v2.sh stop     - Stop all services"
echo "  ./deploy-local-v2.sh restart  - Restart all services"
echo "  ./deploy-local-v2.sh rebuild  - Rebuild backend with latest code"
echo "  ./deploy-local-v2.sh logs     - View logs"
echo "  ./deploy-local-v2.sh backup   - Create manual backup"
echo "  ./deploy-local-v2.sh status   - Show status"
echo ""
echo "Your data is safe! Daily automatic backups are enabled."