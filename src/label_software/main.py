"""FastAPI application entry point."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import init_db, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs(settings.upload_folder, exist_ok=True)
    os.makedirs(settings.preview_dir, exist_ok=True)
    os.makedirs(settings.thumbnail_cache, exist_ok=True)
    os.makedirs(settings.transcode_cache, exist_ok=True)
    os.makedirs(os.path.dirname(settings.database_url.replace("sqlite:///", "")), exist_ok=True)
    init_db(settings.database_url)
    yield
    # Shutdown
    if engine:
        engine.dispose()


app = FastAPI(title="Label Software", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from .routers import videos, annotations, projects, export, review, images, progress, catalog

app.include_router(videos.router, prefix="/api")
app.include_router(annotations.router, prefix="/api")
app.include_router(projects.router, prefix="/api/projects")
app.include_router(export.router, prefix="/api")
app.include_router(review.router, prefix="/api")
app.include_router(images.router, prefix="/api")
app.include_router(progress.router, prefix="/api")
app.include_router(catalog.router, prefix="/api")

# Serve frontend in production (if built)
frontend_dist = os.path.normpath(settings.frontend_dist)
if os.path.isdir(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """SPA fallback: serve index.html for any non-API route."""
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
