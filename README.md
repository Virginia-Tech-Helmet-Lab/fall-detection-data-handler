# Label Software - Video Annotation Platform

A web application for importing, normalizing, and annotating videos for fall detection research.

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy + OpenCV + FFmpeg
- **Frontend**: React 19 + Vite + Chart.js + Axios
- **Database**: SQLite (dev) / PostgreSQL (production)
- **Package Management**: uv (Python), npm (JavaScript)

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+ and npm
- FFmpeg (optional, for video normalization and codec conversion)

### Setup

```bash
# Install Python dependencies
uv sync

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Development

```bash
# Start both backend (port 8000) and frontend (port 3000)
uv run label-dev
```

The Vite dev server proxies `/api/*` requests to the FastAPI backend automatically.

### Production

```bash
# Build the frontend
uv run label-build

# Serve everything from FastAPI (single process, port 8000)
uv run label-serve
```

## Project Structure

```
Label-Software/
  pyproject.toml              # Python project config (uv)
  src/
    label_software/           # FastAPI backend
      main.py                 # App entry point, CORS, router registration
      config.py               # Settings (pydantic-settings)
      database.py             # SQLAlchemy engine + session
      models.py               # Project, Video, TemporalAnnotation, BoundingBoxAnnotation
      schemas.py              # Pydantic request models
      cli.py                  # CLI: label-dev, label-serve, label-build
      routers/                # API routes
      services/               # Business logic, FFmpeg, OpenCV
  frontend/
    vite.config.js            # Vite config with dev proxy
    index.html                # Entry HTML
    src/
      api/client.js           # Centralized axios instance
      App.jsx                 # Routes and layout
      components/             # React components
      contexts/               # React context providers
```

## API

FastAPI auto-generates API docs at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Features

- **Data Import**: Upload videos from local files, Dropbox, Google Drive, or URLs
- **Video Normalization**: Adjust resolution, framerate, brightness/contrast via FFmpeg
- **Temporal Annotations**: Mark fall events with start/end times and frames
- **Bounding Box Tools**: Body part tracking (head, shoulder, hip, etc.)
- **Project Management**: Organize videos into projects with progress tracking
- **Analytics Dashboard**: Interactive charts for project and annotation metrics
- **Multi-format Export**: JSON, CSV, and ML dataset export (train/val/test splits)
