# Fall Detection Data Handler - Multi-User Annotation Platform

A collaborative web application for researchers to import, normalize, and annotate videos for fall detection training data. Now featuring multi-user authentication, project management, and quality control workflows.

## 🎯 Key Features

### 🔐 Authentication & User Management
- **Multi-user system** with role-based access control (Admin, Annotator, Reviewer)
- **JWT authentication** with secure password hashing
- **User management dashboard** for administrators
- **Automatic account creation** (admin/admin123 on first run)

### 📁 Project Management
- **Project creation wizard** with annotation guidelines and team assignment
- **Video assignment system** with equal distribution algorithms
- **Progress tracking** at both user and project levels
- **Team collaboration** with role-based permissions

### 🏷️ Enhanced Labeling Interface
- **Personal annotation queues** for each user
- **Real-time progress tracking** with completion indicators
- **Keyboard navigation** between assigned videos
- **User context tracking** for all annotations (who created what, when)

### ✅ Review & Quality Control
- **Automatic review queue** when videos are completed
- **Smart reviewer assignment** to balance workload
- **Quality scoring system** (1-5 stars) with detailed feedback
- **Review workflow states** (pending → in_review → approved/rejected)

### 📊 Analytics & Reporting
- **Comprehensive analytics dashboard** with interactive charts
- **User performance metrics** and productivity tracking
- **Project progress visualization** with team comparisons
- **Data quality indicators** and improvement recommendations
- **Multi-format export** (JSON, CSV, YOLO, COCO) for machine learning

### 🔄 Core Annotation Features
- **Data Import**: Upload videos from local files, Dropbox, Google Drive, or URLs
- **Video Normalization**: Adjust resolution, framerate, brightness/contrast
- **Temporal Annotations**: Mark fall events with start/end times
- **Bounding Box Tools**: Detailed body part tracking (head, shoulder, hip, etc.)
- **Three-panel layout**: Video list, player, and annotation tools

## 🚀 Quick Start

### Default Login Credentials
On first run, the system automatically creates test accounts:
- **Admin**: `admin` / `admin123`
- **Annotator**: `annotator1` / `test123`
- **Reviewer**: `reviewer1` / `test123`

⚠️ **Change the admin password in production!**

### Windows Users
Use the provided batch files for easy startup:
```cmd
# Start both frontend and backend
scripts/start-all.bat

# Or start individually
scripts/start-backend.bat
scripts/start-frontend.bat
```

### Linux/Mac Users

#### Prerequisites
- Python 3.8+
- Node.js and npm
- FFmpeg (`sudo apt-get install ffmpeg` or `brew install ffmpeg`)

#### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python run.py  # Creates database and default users automatically
```

#### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## 🏗️ Architecture Overview

### Multi-User Workflow
```
1. Import Data → 2. Create Projects → 3. Assign Videos → 4. Annotate → 5. Review → 6. Export
```

### User Roles & Permissions

| Feature | Admin | Annotator | Reviewer |
|---------|-------|-----------|----------|
| User Management | ✅ | ❌ | ❌ |
| Project Creation | ✅ | ❌ | ❌ |
| Video Assignment | ✅ | ❌ | ❌ |
| Annotation | ✅ | ✅ | ✅ |
| Review Queue | ✅ | ❌ | ✅ |
| Analytics | ✅ | Limited | ✅ |
| Data Export | ✅ | ❌ | ✅ |

### Technology Stack
- **Backend**: Flask + SQLAlchemy + JWT + Bcrypt
- **Frontend**: React 19 + Chart.js + Axios
- **Database**: SQLite (dev) → PostgreSQL/MongoDB (production)
- **Video Processing**: FFmpeg + OpenCV
- **Authentication**: Flask-Login + Flask-JWT-Extended

## 📂 Project Structure

```
fall-detection-data-handler/
├── backend/                    # Flask API server
│   ├── app/
│   │   ├── __init__.py        # App initialization with auth setup
│   │   ├── models.py          # User, Project, Video, Annotation models
│   │   ├── auth.py            # Authentication endpoints
│   │   ├── routes/            # Feature-specific routes
│   │   │   ├── projects.py    # Project management API
│   │   │   ├── review.py      # Review workflow API
│   │   │   └── analytics.py   # Analytics and reporting API
│   │   └── services/          # Business logic
│   │       ├── project.py     # Project management service
│   │       ├── annotation.py  # Annotation CRUD operations
│   │       ├── analytics.py   # Analytics calculations
│   │       └── import_sources/ # Import integrations
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/          # Login and user management
│   │   │   ├── Projects/      # Project dashboard and creation
│   │   │   ├── LabelingInterface/ # Main annotation workspace
│   │   │   ├── ReviewDashboard/   # Review and quality control
│   │   │   ├── Analytics/     # Performance metrics and charts
│   │   │   └── Admin/         # User management (admin only)
│   │   ├── contexts/          # React context providers
│   │   │   ├── AuthContext.js # Authentication state
│   │   │   └── ProjectContext.js # Project state management
│   │   └── services/          # API integration services
├── scripts/                   # Windows batch files
├── MULTI_USER_IMPLEMENTATION.md # Complete implementation guide
├── WINDOWS_SETUP.md          # Windows setup instructions
└── CLAUDE.md                 # Development guide for AI assistants
```

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/login           # User login (returns JWT token)
POST /api/auth/logout          # User logout
GET  /api/auth/me              # Get current user info
POST /api/auth/register        # Register new user (admin only)
PUT  /api/auth/change-password # Change user password
```

### Project Management
```
GET  /api/projects             # List projects (role-filtered)
POST /api/projects             # Create project (admin only)
GET  /api/projects/{id}        # Get project details
PUT  /api/projects/{id}        # Update project (admin only)
POST /api/projects/{id}/assign # Assign videos to users
```

### Review System
```
GET  /api/review/queue         # Get review queue (reviewer only)
POST /api/review/{video_id}    # Submit review with quality score
GET  /api/review/stats         # Review statistics
```

### Analytics
```
GET  /api/analytics/overview   # System-wide metrics (admin/reviewer)
GET  /api/analytics/user/{id}  # User performance metrics
GET  /api/analytics/project/{id} # Project analytics
```

## 🗄️ Database Schema

The system uses a comprehensive multi-user database schema:

- **Users**: Authentication, roles, activity tracking
- **Projects**: Organization containers with settings and team management
- **ProjectMembers**: User assignments to projects with roles
- **Videos**: Enhanced with project association and assignment tracking
- **Annotations**: All types now track creator and timestamps
- **ReviewQueue**: Quality control workflow with scoring
- **ReviewFeedback**: Detailed feedback and improvement suggestions

## 🧪 Development & Testing

### Test Data Setup
```bash
# Create test videos and populate database
cd backend
python create_test_videos.py    # Generate sample videos
python add_test_videos_to_db.py # Add to database with annotations
```

### Database Issues
If you encounter database errors:
```bash
cd backend
python fix_all_database_issues.py  # Comprehensive database repair
```

### Testing Accounts
- Login with different roles to test workflows
- Demo project automatically created with sample data
- All test users are pre-assigned to the demo project

## 📈 Usage Workflow

### For Administrators
1. **Login** with admin credentials
2. **Create projects** using the project creation wizard
3. **Import videos** and assign to project
4. **Assign videos** to annotators using the assignment interface
5. **Monitor progress** via analytics dashboard
6. **Export data** when annotation and review are complete

### For Annotators
1. **Login** with annotator credentials
2. **Select project** from dashboard
3. **Access personal queue** of assigned videos
4. **Annotate videos** with temporal events and bounding boxes
5. **Mark complete** when finished to send for review
6. **Track progress** via personal dashboard

### For Reviewers
1. **Login** with reviewer credentials
2. **Access review queue** of completed annotations
3. **Review annotations** with side-by-side comparison
4. **Provide feedback** and quality scores (1-5 stars)
5. **Approve or request revisions** for annotations
6. **Monitor quality metrics** via analytics dashboard

## 🎯 Export Formats

The system supports multiple export formats for machine learning:

- **JSON**: Complete metadata with annotations
- **CSV**: Tabular data for analysis
- **YOLO**: Object detection format with bounding boxes
- **COCO**: Common Objects in Context format
- **Custom**: Configurable export with metadata options

## 🔧 Configuration

### Environment Variables
```bash
# Backend (Flask)
SECRET_KEY=your-secret-key-here           # Flask session secret
JWT_SECRET_KEY=your-jwt-secret-here       # JWT token signing key

# Frontend (React)
REACT_APP_API_URL=http://localhost:5000   # Backend API URL
```

### Production Deployment
- Set secure SECRET_KEY and JWT_SECRET_KEY
- Configure HTTPS enforcement
- Set up proper CORS policies
- Use PostgreSQL or MongoDB for production database
- Configure file storage (AWS S3, etc.) for video uploads

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Issues**: Report bugs and feature requests via GitHub Issues
- **Documentation**: See MULTI_USER_IMPLEMENTATION.md for detailed implementation notes
- **Setup Help**: Check WINDOWS_SETUP.md for Windows-specific instructions
- **Development**: See CLAUDE.md for AI assistant development guidelines

---

**🎉 The Fall Detection Data Handler is now a fully-featured collaborative annotation platform supporting teams of researchers with comprehensive quality control and analytics!**