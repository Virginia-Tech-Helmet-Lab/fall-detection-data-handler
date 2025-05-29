# Deployment Guide - Fall Detection Data Handler

This guide explains how to deploy the Fall Detection Data Handler for team collaboration, from local testing to production deployment.

## Table of Contents
- [Quick Start (Local Testing)](#quick-start-local-testing)
- [Option 1: Local Network Deployment](#option-1-local-network-deployment)
- [Option 2: Temporary Public Access (ngrok)](#option-2-temporary-public-access-ngrok)
- [Option 3: Cloud Deployment](#option-3-cloud-deployment)
- [Option 4: Docker Deployment](#option-4-docker-deployment)
- [Production Considerations](#production-considerations)
- [Troubleshooting](#troubleshooting)

## Quick Start (Local Testing)

For immediate testing with your team on the same network:

```bash
# Backend (allow external connections)
cd backend
python run.py --host=0.0.0.0

# Frontend (in another terminal)
cd frontend
npm start
```

Team members can access via your computer's IP address: `http://YOUR_IP:3000`

## Option 1: Local Network Deployment

Best for teams in the same office/lab/network.

### Step 1: Find Your IP Address

```bash
# Windows
ipconfig
# Look for IPv4 Address (e.g., 192.168.1.100)

# Mac/Linux
ifconfig
# or
ip addr show
```

### Step 2: Configure Backend for Network Access

1. Update CORS settings in `backend/app/__init__.py`:
```python
# Replace the CORS line with:
CORS(app, origins=[
    'http://localhost:3000',
    'http://localhost:5000',
    'http://YOUR_IP:3000',
    'http://YOUR_IP:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000'
], supports_credentials=True)
```

2. Create a startup script `backend/run_network.py`:
```python
from app import create_app

if __name__ == '__main__':
    app = create_app()
    # Allow connections from any IP on your network
    app.run(host='0.0.0.0', port=5000, debug=True)
```

### Step 3: Configure Frontend for Network Access

1. Create a configuration file `frontend/src/config.js`:
```javascript
const config = {
    // Change this to your computer's IP address
    API_BASE_URL: process.env.REACT_APP_API_URL || 'http://192.168.1.100:5000'
};

export default config;
```

2. Update all API calls to use the config:
```javascript
// Example: In ProjectContext.js
import config from '../config';

const projectApi = axios.create({
    baseURL: `${config.API_BASE_URL}/api/projects`,
    headers: {
        'Content-Type': 'application/json',
    }
});
```

### Step 4: Windows Firewall Configuration

Allow Python and Node through Windows Firewall:

1. Open Windows Defender Firewall
2. Click "Allow an app or feature..."
3. Add Python.exe and Node.js
4. Check both Private and Public networks

### Step 5: Start the Application

```bash
# Backend
cd backend
python run_network.py

# Frontend (new terminal)
cd frontend
npm start
```

### Step 6: Team Access

Team members can now access:
- Frontend: `http://YOUR_IP:3000`
- Backend API: `http://YOUR_IP:5000`

## Option 2: Temporary Public Access (ngrok)

Perfect for quick demos or remote team testing.

### Step 1: Install ngrok

```bash
# Download from https://ngrok.com/download
# Or use npm
npm install -g ngrok
```

### Step 2: Start Your Application

```bash
# Terminal 1: Backend
cd backend
python run.py

# Terminal 2: Frontend
cd frontend
npm start
```

### Step 3: Create Public Tunnels

```bash
# Terminal 3: Expose backend
ngrok http 5000
# Note the HTTPS URL (e.g., https://abc123.ngrok.io)

# Terminal 4: Expose frontend
ngrok http 3000
# Note the HTTPS URL (e.g., https://xyz789.ngrok.io)
```

### Step 4: Update Frontend Configuration

Temporarily update the API URL to use ngrok backend:
```javascript
// In frontend/src/config.js
const config = {
    API_BASE_URL: 'https://abc123.ngrok.io'  // Your ngrok backend URL
};
```

### Step 5: Share URLs

Send your team:
- Frontend URL: `https://xyz789.ngrok.io`
- Default login: admin/admin123

**Note**: ngrok URLs expire after 8 hours on free plan.

## Option 3: Cloud Deployment

For production use with remote teams.

### Heroku Deployment (Free Tier Available)

#### Backend Deployment

1. **Prepare Backend**:
```bash
cd backend

# Create requirements.txt with production server
echo "gunicorn==20.1.0" >> requirements.txt

# Create Procfile
echo "web: gunicorn app:create_app()" > Procfile

# Create runtime.txt
echo "python-3.9.16" > runtime.txt
```

2. **Update Database Configuration**:
```python
# In backend/app/__init__.py
import os

# Replace SQLite config with:
if os.environ.get('DATABASE_URL'):
    # Heroku PostgreSQL
    uri = os.environ.get('DATABASE_URL')
    if uri.startswith("postgres://"):
        uri = uri.replace("postgres://", "postgresql://", 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = uri
else:
    # Local SQLite
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///fall_detection.db'
```

3. **Deploy to Heroku**:
```bash
# Install Heroku CLI
# Create Heroku app
heroku create your-app-name-backend

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set SECRET_KEY="your-secret-key-here"
heroku config:set JWT_SECRET_KEY="your-jwt-secret-key-here"

# Deploy
git add .
git commit -m "Prepare for Heroku deployment"
git push heroku main

# Run database migrations
heroku run python -c "from app import create_app, db; app=create_app(); app.app_context().push(); db.create_all()"
```

#### Frontend Deployment (Netlify)

1. **Update API URL**:
```javascript
// frontend/src/config.js
const config = {
    API_BASE_URL: process.env.REACT_APP_API_URL || 'https://your-app-name-backend.herokuapp.com'
};
```

2. **Build and Deploy**:
```bash
cd frontend

# Create .env.production
echo "REACT_APP_API_URL=https://your-app-name-backend.herokuapp.com" > .env.production

# Build
npm run build

# Deploy to Netlify
# 1. Go to https://netlify.com
# 2. Drag 'build' folder to Netlify
# 3. Set environment variables in Netlify dashboard
```

### AWS Deployment

#### EC2 + RDS Setup

1. **Launch EC2 Instance** (Ubuntu 20.04)
2. **Create RDS PostgreSQL** instance
3. **Configure Security Groups**:
   - Backend: Allow ports 5000, 22
   - Database: Allow port 5432 from EC2

4. **Deploy Backend**:
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install dependencies
sudo apt update
sudo apt install python3-pip python3-venv nginx

# Clone repository
git clone https://github.com/your-repo/fall-detection-data-handler.git
cd fall-detection-data-handler/backend

# Setup virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# Configure environment
export DATABASE_URL="postgresql://user:pass@your-rds-endpoint:5432/dbname"
export SECRET_KEY="your-secret-key"
export JWT_SECRET_KEY="your-jwt-secret"

# Run with gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```

5. **Setup Nginx**:
```nginx
# /etc/nginx/sites-available/fall-detection
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

6. **Deploy Frontend to S3**:
```bash
# Build frontend
cd frontend
npm run build

# Upload to S3
aws s3 sync build/ s3://your-bucket-name --delete

# Enable static hosting
aws s3 website s3://your-bucket-name --index-document index.html
```

## Option 4: Docker Deployment

Most scalable and consistent deployment method.

### Step 1: Create Docker Configuration

1. **Backend Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Copy application
COPY . .

# Expose port
EXPOSE 5000

# Run the application
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:create_app()"]
```

2. **Frontend Dockerfile** (`frontend/Dockerfile`):
```dockerfile
FROM node:16-alpine as build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application
COPY . .

# Build
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

3. **Frontend Nginx Config** (`frontend/nginx.conf`):
```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

4. **Docker Compose** (`docker-compose.yml`):
```yaml
version: '3.8'

services:
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: falldetection
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:postgres123@db:5432/falldetection
      SECRET_KEY: your-secret-key-here
      JWT_SECRET_KEY: your-jwt-secret-key-here
    depends_on:
      - db
    ports:
      - "5000:5000"
    volumes:
      - ./backend/uploads:/app/uploads

  frontend:
    build: ./frontend
    environment:
      REACT_APP_API_URL: http://localhost:5000
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  postgres_data:
  uploads:
```

### Step 2: Deploy with Docker

```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Step 3: Deploy to Cloud with Docker

#### Using Docker on AWS/DigitalOcean:
```bash
# On your VPS/EC2 instance
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install docker-compose

# Clone repository
git clone https://github.com/your-repo/fall-detection-data-handler.git
cd fall-detection-data-handler

# Start application
docker-compose up -d
```

## Production Considerations

### 1. Security

```python
# backend/app/__init__.py
import secrets

# Generate secure keys
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', secrets.token_hex(32))

# Force HTTPS in production
if os.environ.get('ENVIRONMENT') == 'production':
    app.config['SESSION_COOKIE_SECURE'] = True
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
```

### 2. Database Migrations

Use Flask-Migrate for database versioning:
```bash
pip install Flask-Migrate

# In app/__init__.py
from flask_migrate import Migrate
migrate = Migrate(app, db)

# Initialize migrations
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

### 3. File Storage (Videos)

For production, use cloud storage instead of local filesystem:

```python
# backend/app/services/storage.py
import boto3
from werkzeug.utils import secure_filename

class S3Storage:
    def __init__(self):
        self.s3 = boto3.client('s3',
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_KEY')
        )
        self.bucket = os.environ.get('S3_BUCKET', 'fall-detection-videos')
    
    def upload_video(self, file, filename):
        secure_name = secure_filename(filename)
        self.s3.upload_fileobj(file, self.bucket, secure_name)
        return f"https://{self.bucket}.s3.amazonaws.com/{secure_name}"
```

### 4. Environment Variables

Create `.env` files for different environments:

```bash
# .env.production
# Backend
DATABASE_URL=postgresql://user:pass@localhost/falldetection
SECRET_KEY=your-production-secret-key
JWT_SECRET_KEY=your-production-jwt-key
ENVIRONMENT=production
AWS_ACCESS_KEY=your-aws-key
AWS_SECRET_KEY=your-aws-secret
S3_BUCKET=your-s3-bucket

# Frontend
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENVIRONMENT=production
```

### 5. Monitoring

Add logging and monitoring:

```python
# backend/app/__init__.py
import logging
from logging.handlers import RotatingFileHandler

if not app.debug:
    file_handler = RotatingFileHandler('logs/falldetection.log', 
                                     maxBytes=10240000, 
                                     backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
```

### 6. Backup Strategy

Automated PostgreSQL backups:
```bash
# backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
DATABASE_URL="postgresql://user:pass@localhost/falldetection"

# Backup database
pg_dump $DATABASE_URL > backups/falldetection_$DATE.sql

# Upload to S3
aws s3 cp backups/falldetection_$DATE.sql s3://your-backup-bucket/

# Keep only last 7 days locally
find backups/ -type f -mtime +7 -delete
```

### 7. SSL/HTTPS

For production, always use HTTPS:

#### Using Let's Encrypt:
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure frontend URL is in backend CORS origins
   - Check for trailing slashes in URLs
   - Verify credentials are included in requests

2. **Database Connection Issues**
   - Check DATABASE_URL format
   - Verify PostgreSQL is running
   - Check firewall/security group rules

3. **Video Upload Failures**
   - Increase nginx client_max_body_size
   - Check disk space
   - Verify upload directory permissions

4. **Authentication Problems**
   - Ensure JWT_SECRET_KEY is consistent
   - Check token expiration settings
   - Verify CORS credentials setting

### Debug Commands

```bash
# Check backend logs
docker-compose logs backend

# Test database connection
docker-compose exec backend python -c "from app import db; print(db.engine.url)"

# List all routes
docker-compose exec backend python -c "from app import create_app; app=create_app(); print(app.url_map)"

# Create admin user manually
docker-compose exec backend python -c "
from app import create_app, db
from app.models import User, UserRole
app = create_app()
with app.app_context():
    admin = User(username='admin', email='admin@example.com', 
                 full_name='Admin User', role=UserRole.ADMIN)
    admin.set_password('secure-password')
    db.session.add(admin)
    db.session.commit()
"
```

## Performance Optimization

### 1. Frontend Build Optimization
```json
// package.json
"scripts": {
  "build": "GENERATE_SOURCEMAP=false react-scripts build"
}
```

### 2. Backend Caching
```python
from flask_caching import Cache

cache = Cache(app, config={'CACHE_TYPE': 'simple'})

@cache.cached(timeout=300)
def get_project_stats(project_id):
    # Expensive calculation cached for 5 minutes
    return calculate_stats(project_id)
```

### 3. Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_videos_project_assigned ON videos(project_id, assigned_to);
CREATE INDEX idx_annotations_video_user ON temporal_annotations(video_id, created_by);
```

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (nginx/HAProxy)
- Multiple backend instances
- Redis for session management
- Shared file storage (S3/NFS)

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Use connection pooling
- Implement caching layer

## Conclusion

Start with Option 1 (Local Network) for immediate testing, then progress to cloud deployment as your team grows. The application is designed to handle concurrent users with:

- JWT authentication for secure sessions
- Role-based access control
- Database transactions for data integrity
- User-specific views and assignments

For production deployment, prioritize:
1. Secure environment variables
2. HTTPS encryption
3. Regular backups
4. Monitoring and logging
5. Scalable file storage

Need help with deployment? Check the [Troubleshooting](#troubleshooting) section or open an issue on GitHub!