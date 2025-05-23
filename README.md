# Fall Detection Data Handler

A web application for researchers to import, normalize, and annotate videos for fall detection training data.

## Features

- **Data Import**: Upload videos from local files, Dropbox, Google Drive, or URLs
- **Video Normalization**: Adjust resolution, framerate, brightness/contrast
- **Labeling Interface**: Three-panel layout with video player, temporal annotations, and bounding box tools
- **Review Dashboard**: Final review and validation of annotations

## Quick Start

### Windows Users
See [WINDOWS_SETUP.md](WINDOWS_SETUP.md) for detailed Windows installation instructions.

Quick start with batch files:
```cmd
# Start both frontend and backend
start-all.bat

# Or start individually
start-backend.bat
start-frontend.bat
```

### Linux/Mac Users

#### Prerequisites
- Python 3.8+
- Node.js and npm
- FFmpeg (install with `sudo apt-get install ffmpeg` on Ubuntu or `brew install ffmpeg` on Mac)

#### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python run.py
```

#### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Project Structure

```
fall-detection-data-handler/
├── backend/              # Flask API server
│   ├── app/
│   │   ├── __init__.py         # Flask app initialization
│   │   ├── models.py           # Data models for video metadata, annotations
│   │   ├── routes.py           # RESTful API endpoints
│   │   ├── services/           # Business logic and processing
│   │   │   ├── normalization.py  # Video normalization with FFmpeg
│   │   │   └── annotation.py     # CRUD for annotations
│   │   └── utils/              # Helper modules
│   │       └── video_processing.py
│   ├── requirements.txt        # Python dependencies
│   └── run.py                  # Application entry point
├── frontend/             # React application
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── DataImport/     # File upload interface
│   │   │   ├── Normalization/  # Video adjustment controls
│   │   │   ├── LabelingInterface/  # Main annotation interface
│   │   │   └── ReviewDashboard/    # Final review interface
│   │   ├── App.js              # Main application component
│   │   └── routes.js           # Client-side routing
│   └── package.json            # Node dependencies
├── docs/                 # Design specifications
├── WINDOWS_SETUP.md      # Windows setup guide
└── CLAUDE.md            # Development guide for Claude AI
```

## Development

- Backend runs on `http://localhost:5000`
- Frontend runs on `http://localhost:3000`
- API endpoints are prefixed with `/api`

## Requirements

- **FFmpeg**: Required for video processing
- **Python packages**: See `backend/requirements.txt`
- **Node packages**: See `frontend/package.json`

## API Endpoints

- `POST /api/upload` - Upload video files
- `POST /api/normalize` - Apply normalization settings
- `GET/POST/PUT /api/annotations` - Manage annotations
- `GET /api/review` - Fetch review data

## Database

Currently uses SQLite for development. Configured for easy migration to PostgreSQL or MongoDB for production.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request