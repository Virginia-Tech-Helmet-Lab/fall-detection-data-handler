# Label Software

Video annotation platform for the VT Helmet Lab. Designed around the [Data Catalog](../Data-Catalog) as the single source of truth for datasets and annotations.

## Architecture

- **Backend**: FastAPI, SQLAlchemy, OpenCV, Python 3.12+
- **Frontend**: React 19, Vite, Axios
- **Database**: SQLite (label storage), Data Catalog SQLite (ground truth)
- **Package Management**: uv (Python), npm (JavaScript)

The backend serves a built React SPA and a REST API from a single process. Videos are referenced by path from the Data Catalog -- no file duplication.

## Setup

Prerequisites: Python 3.12+, Node.js 18+, npm.

```bash
uv sync
cd frontend && npm install && cd ..
```

On HPC systems (e.g., ARC), load the Node.js module first:

```bash
module load nodejs
```

## Running

```bash
# Build frontend and serve (production)
cd frontend && npm run build && cd ..
uv run label

# Or use the explicit commands
uv run label-build    # build frontend
uv run label-serve    # start server on port 8888
uv run label-dev      # dev mode (FastAPI + Vite hot reload)
```

Access via Open OnDemand at `https://ood.arc.vt.edu/rnode/<host>/<session>/proxy/8888/`.

## Project Structure

```
Label-Software/
  pyproject.toml
  src/label_software/
    main.py              # FastAPI app, lifespan, CORS, SPA serving
    config.py            # Settings (pydantic-settings, env prefix LABEL_)
    database.py          # SQLAlchemy engine, session, migrations
    models.py            # Project, Video, TemporalAnnotation, BoundingBoxAnnotation
    schemas.py           # Pydantic request models
    cli.py               # CLI entry points (label, label-dev, label-build)
    routers/
      catalog.py         # Data Catalog browse, import, publish
      videos.py          # Video serving, upload, thumbnails
      annotations.py     # Temporal + bounding box CRUD
      projects.py        # Project CRUD, status, stats
      export.py          # JSON/CSV export, stats
      review.py          # Review workflow
      images.py          # Frame extraction (OpenCV)
      progress.py        # Project progress tracking
    services/
      catalog.py         # Read-only catalog DB queries
      catalog_export.py  # Publish annotations to catalog (versioned JSON)
      video_processing.py
      annotation.py
      bounding_box.py
      project.py
  frontend/
    vite.config.js       # Dev proxy, base path for OOD
    index.html
    src/
      api/client.js      # Axios instance with OOD base path detection
      data/labelTemplates.js  # Label template definitions
      App.jsx            # HashRouter, routes
      components/
        Home/            # Landing page, workflow overview
        Projects/        # Dashboard, creation, settings, cards
        DataImport/      # Catalog import
        LabelingInterface/  # Video player, annotation panel, bbox tool
        DataExport/      # Catalog publish, JSON/CSV download
      contexts/
        ProjectContext.jsx  # Global project state
```

## Data Flow

```
Data Catalog (datasets, videos)
      |
      | Import by reference (no copy)
      v
Label Software (projects, annotations)
      |
      | Publish (versioned JSON)
      v
Data Catalog (annotations/ directory, registered in catalog.db)
```

Videos are never copied. Import creates `Video` records with `source_type="catalog"` and `catalog_path` pointing to the original file. Annotations are stored in the Label Software database during active labeling, then published back to the Data Catalog as versioned JSON files.

## Annotation Types

**Temporal annotations**: Mark time-based events (e.g., falls) with start/end times and frame numbers.

**Bounding box annotations**: Mark spatial regions per frame with a body part label and pixel coordinates.

## Label Templates

Projects can be initialized with predefined label sets:

| Template | Event Types | Body Parts |
|----------|-------------|------------|
| Fall Detection | Fall | head, shoulder, elbow, wrist, hip, knee, ankle |
| COCO Keypoints | COCO supercategories | 17-point skeleton |
| Activity Recognition | Walking, Running, Sitting, Standing, etc. | head, torso, arms, legs |
| Custom (Blank) | (empty) | (empty) |

Labels are project-scoped and extensible. New labels can be added from the labeling interface and persist to the project's annotation schema.

## API

Interactive docs available at `/docs` (Swagger) and `/redoc` when the server is running.

Key endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /api/catalog/datasets` | List datasets from Data Catalog |
| `POST /api/catalog/import` | Import videos by reference |
| `POST /api/catalog/publish/{project_id}` | Publish annotations to catalog |
| `GET /api/catalog/annotations/{dataset_id}` | List published annotation versions |
| `GET /api/videos` | List videos (paginated) |
| `GET /api/video-file/{video_id}` | Serve video (handles catalog paths + transcoding) |
| `POST /api/annotations` | Create temporal annotation |
| `POST /api/bbox-annotations` | Create bounding box annotation |
| `GET /api/projects` | List projects |
| `POST /api/export` | Export annotations (JSON/CSV) |

## Configuration

Environment variables (prefix `LABEL_`):

| Variable | Default | Description |
|----------|---------|-------------|
| `LABEL_DATABASE_URL` | `sqlite:///instance/fall_detection.db` | Label database |
| `LABEL_UPLOAD_FOLDER` | `./uploads` | Upload directory |
| `LABEL_CATALOG_DB_PATH` | `/projects/helmetlab1/Data-Catalog/catalog.db` | Catalog database |
| `LABEL_CATALOG_DATA_ROOT` | `/projects/helmetlab1/Data-Catalog/data` | Catalog data root |

## Contact

Feature requests, bugs, or questions: ethan02@vt.edu
