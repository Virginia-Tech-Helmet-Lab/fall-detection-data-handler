# Production Deployment Guide

This guide provides step-by-step instructions for deploying the Fall Detection Data Handler in a production environment with data persistence and automatic backups.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start with Docker](#quick-start-with-docker)
- [Manual Deployment](#manual-deployment)
- [Data Persistence & Backups](#data-persistence--backups)
- [Security Hardening](#security-hardening)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Disaster Recovery](#disaster-recovery)

## Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose (for containerized deployment)
- PostgreSQL 12+ (for manual deployment)
- Nginx (for manual deployment)
- SSL certificates for HTTPS
- At least 4GB RAM and 20GB storage

## Quick Start with Docker

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/fall-detection-data-handler.git
cd fall-detection-data-handler
```

### 2. Configure Environment
```bash
# Copy the production template
cp .env.production.template .env.production

# Edit with your settings
nano .env.production
```

**Critical settings to change:**
- `SECRET_KEY`: Generate with `openssl rand -hex 32`
- `JWT_SECRET_KEY`: Generate with `openssl rand -hex 32`
- `DB_PASSWORD`: Strong database password
- `ADMIN_PASSWORD`: Strong admin password
- `CORS_ORIGINS`: Your domain names

### 3. Set Up SSL Certificates
```bash
# Create SSL directory
mkdir -p ssl

# Copy your certificates
cp /path/to/your/certificate.crt ssl/
cp /path/to/your/private.key ssl/

# Or use Let's Encrypt
sudo certbot certonly --standalone -d yourdomain.com
```

### 4. Deploy with Docker Compose
```bash
# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 5. Initialize Database
```bash
# Run migrations
docker-compose exec backend python migrate.py init
docker-compose exec backend python migrate.py upgrade

# Verify admin user was created
docker-compose exec backend python -c "
from app import create_app
from app.models import User
app = create_app('production')
with app.app_context():
    admin = User.query.filter_by(username='admin').first()
    print(f'Admin user exists: {admin is not None}')
"
```

## Manual Deployment

### 1. System Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3.9 python3.9-venv python3-pip postgresql nginx ffmpeg

# Create application user
sudo useradd -m -s /bin/bash falldetection
sudo usermod -aG www-data falldetection
```

### 2. PostgreSQL Setup
```bash
# Access PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE USER falldetection WITH PASSWORD 'your_secure_password';
CREATE DATABASE falldetection_prod OWNER falldetection;
GRANT ALL PRIVILEGES ON DATABASE falldetection_prod TO falldetection;
\q
```

### 3. Application Setup
```bash
# Switch to app user
sudo su - falldetection

# Clone repository
git clone https://github.com/your-org/fall-detection-data-handler.git
cd fall-detection-data-handler

# Set up Python environment
python3.9 -m venv venv
source venv/bin/activate

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Configure environment
cp ../.env.production.template ../.env.production
# Edit .env.production with your settings

# Initialize database
export FLASK_ENV=production
python migrate.py init
python migrate.py upgrade
```

### 4. Systemd Service
Create `/etc/systemd/system/falldetection.service`:
```ini
[Unit]
Description=Fall Detection Data Handler
After=network.target postgresql.service

[Service]
Type=simple
User=falldetection
Group=www-data
WorkingDirectory=/home/falldetection/fall-detection-data-handler/backend
Environment="FLASK_ENV=production"
EnvironmentFile=/home/falldetection/fall-detection-data-handler/.env.production
ExecStart=/home/falldetection/fall-detection-data-handler/venv/bin/python run.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable falldetection
sudo systemctl start falldetection
sudo systemctl status falldetection
```

### 5. Nginx Configuration
Create `/etc/nginx/sites-available/falldetection`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Frontend
    root /var/www/falldetection/frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Upload settings
        client_max_body_size 100M;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/falldetection /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Data Persistence & Backups

### Automatic Daily Backups
```bash
# Add to crontab
crontab -e

# Add this line for daily 2 AM backups
0 2 * * * /home/falldetection/fall-detection-data-handler/scripts/backup-cron.sh
```

### Manual Backup
```bash
cd /home/falldetection/fall-detection-data-handler/backend
source ../venv/bin/activate
python backup_database.py
```

### Backup Storage
- Local backups are stored in `backups/` directory
- Backups include:
  - PostgreSQL dump (`.sql`)
  - JSON data export (`.json`)
  - Uploaded files archive (`.tar.gz`)
  - Backup manifest (`.json`)

### Off-site Backup (Recommended)
```bash
# Example: Sync to S3
aws s3 sync /home/falldetection/fall-detection-data-handler/backups/ s3://your-backup-bucket/falldetection/ --delete

# Or rsync to remote server
rsync -avz /home/falldetection/fall-detection-data-handler/backups/ user@backup-server:/backups/falldetection/
```

## Security Hardening

### 1. Firewall Configuration
```bash
# Allow only necessary ports
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Fail2ban Setup
```bash
sudo apt install fail2ban

# Create jail for the application
sudo nano /etc/fail2ban/jail.local
```

Add:
```ini
[falldetection]
enabled = true
port = 80,443
filter = falldetection
logpath = /home/falldetection/fall-detection-data-handler/backend/logs/access.log
maxretry = 5
bantime = 3600
```

### 3. Regular Updates
```bash
# Create update script
cat > /home/falldetection/update.sh << 'EOF'
#!/bin/bash
cd /home/falldetection/fall-detection-data-handler
git pull
source venv/bin/activate
cd backend
pip install -r requirements.txt
python migrate.py upgrade
sudo systemctl restart falldetection
EOF

chmod +x /home/falldetection/update.sh
```

## Monitoring & Maintenance

### Health Checks
```bash
# Create health check endpoint
curl https://yourdomain.com/api/health

# Monitor with systemd
systemctl status falldetection

# Check logs
journalctl -u falldetection -f
```

### Performance Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop

# PostgreSQL monitoring
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Disk usage
df -h
du -sh /home/falldetection/fall-detection-data-handler/uploads/
```

### Log Rotation
Create `/etc/logrotate.d/falldetection`:
```
/home/falldetection/fall-detection-data-handler/backend/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 0640 falldetection www-data
    sharedscripts
    postrotate
        systemctl reload falldetection > /dev/null
    endscript
}
```

## Disaster Recovery

### Restore from Backup
```bash
# Stop services
sudo systemctl stop falldetection

# Restore database
cd /home/falldetection/fall-detection-data-handler/backend
source ../venv/bin/activate
python restore_database.py

# Select backup and follow prompts
# Restart services
sudo systemctl start falldetection
```

### Emergency Rollback
```bash
# Keep previous version
git tag -a v1.0-stable -m "Stable version before update"

# If update fails
git checkout v1.0-stable
sudo systemctl restart falldetection
```

## Maintenance Checklist

### Daily
- [ ] Check application logs for errors
- [ ] Verify backup completion
- [ ] Monitor disk space

### Weekly
- [ ] Review user activity
- [ ] Check for security updates
- [ ] Test backup restoration (on staging)

### Monthly
- [ ] Update dependencies
- [ ] Review and optimize database
- [ ] Audit user permissions
- [ ] Test disaster recovery procedures

## Support

For production issues:
1. Check logs: `journalctl -u falldetection -n 100`
2. Test database connection: `python -c "from app import create_app; create_app('production')"`
3. Verify file permissions: `ls -la uploads/`
4. Check disk space: `df -h`

Remember to always test updates in a staging environment before deploying to production!