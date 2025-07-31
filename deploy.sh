#!/bin/bash
# Quick deployment script for Fall Detection Data Handler

set -e  # Exit on error

echo "Fall Detection Data Handler - Production Deployment"
echo "=================================================="

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "Creating .env.production from template..."
    cp .env.production.template .env.production
    echo ""
    echo "IMPORTANT: Please edit .env.production with your settings before continuing!"
    echo "Especially set:"
    echo "  - SECRET_KEY (use: openssl rand -hex 32)"
    echo "  - JWT_SECRET_KEY (use: openssl rand -hex 32)"
    echo "  - DB_PASSWORD"
    echo "  - ADMIN_PASSWORD"
    echo ""
    read -p "Press Enter after editing .env.production..."
fi

# Load environment variables
export $(grep -v '^#' .env.production | xargs)

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "Starting deployment..."

# Build images
echo "Building Docker images..."
docker-compose build

# Start services
echo "Starting services..."
docker-compose up -d

# Wait for database to be ready
echo "Waiting for database..."
sleep 10

# Initialize database
echo "Initializing database..."
docker-compose exec -T backend python migrate.py init 2>/dev/null || true
docker-compose exec -T backend python migrate.py upgrade

# Create initial backup
echo "Creating initial backup..."
docker-compose exec -T backend python backup_database.py

# Show status
echo ""
echo "Deployment complete!"
echo ""
docker-compose ps

echo ""
echo "Access the application at:"
echo "  - Frontend: http://localhost"
echo "  - Backend API: http://localhost:5000/api"
echo ""
echo "Default admin credentials:"
echo "  - Username: ${ADMIN_USERNAME:-admin}"
echo "  - Password: ${ADMIN_PASSWORD:-admin123} (CHANGE THIS!)"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Backup database: docker-compose exec backend python backup_database.py"
echo "  - Restore database: docker-compose exec backend python restore_database.py"