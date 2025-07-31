# Local Production Deployment Guide

This guide helps you deploy the Fall Detection Data Handler locally with full data persistence and automatic backups.

## Quick Start (Recommended - Docker)

### 1. One-Command Deployment
```bash
./deploy-local.sh
```

This will:
- Set up PostgreSQL database for data persistence
- Start the backend API server
- Start the frontend development server
- Enable automatic daily backups
- Create persistent storage directories

### 2. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Default login: `admin` / `admin123`

### 3. Manage Your Deployment
```bash
# View logs
./deploy-local.sh logs

# Create manual backup
./deploy-local.sh backup

# Stop services
./deploy-local.sh stop

# Restart services
./deploy-local.sh restart
```

## Alternative: Run Without Docker

If you prefer not to use Docker:

### Prerequisites
- Python 3.8+
- PostgreSQL 12+
- Node.js 14+
- FFmpeg

### Setup
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib ffmpeg

# Run the local production script
./run-local-production.sh

# Stop when done
./stop-local-production.sh
```

## Data Persistence

Your data is stored in:
- **Database**: `./data/postgres/` (Docker) or PostgreSQL system location
- **Uploaded Videos**: `./uploads/`
- **Backups**: `./backups/`

## Backup & Recovery

### Automatic Backups
- Backups run daily at 2 AM automatically
- Stored in `./backups/` directory
- Includes database, uploaded files, and metadata

### Manual Backup
```bash
# With Docker
./deploy-local.sh backup

# Without Docker
cd backend
source venv/bin/activate
python backup_database.py
```

### Restore from Backup
```bash
# With Docker
docker-compose -f docker-compose.local.yml exec backend python restore_database.py

# Without Docker
cd backend
source venv/bin/activate
python restore_database.py
```

## Important Notes

1. **First Time Setup**: The admin user is created automatically on first run
2. **Data Safety**: All your annotation data is stored in PostgreSQL, not SQLite
3. **Backups**: Check `./backups/` directory regularly
4. **Updates**: Pull latest code and restart services to update

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the ports
sudo lsof -i :3000  # Frontend
sudo lsof -i :5000  # Backend
sudo lsof -i :5432  # PostgreSQL
```

### Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose -f docker-compose.local.yml logs postgres

# Or without Docker
sudo systemctl status postgresql
```

### Reset Everything
```bash
# Stop services
./deploy-local.sh stop

# Remove data (WARNING: This deletes everything!)
rm -rf data/ uploads/ backups/

# Start fresh
./deploy-local.sh
```

## Network Access

To access from other devices on your network:
1. Find your IP: `ip addr show` or `ifconfig`
2. Access via: `http://YOUR_IP:3000`
3. Update CORS settings in `.env.local` if needed

## Production Tips

1. **Change the admin password** immediately after first login
2. **Regular backups**: Set up a cron job for off-site backup copies
3. **Monitor disk space**: Uploaded videos can consume significant space
4. **Update regularly**: Pull latest updates and restart services

Your labeling progress is now safe with automatic backups and PostgreSQL!