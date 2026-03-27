"""Catalog browsing, import, and publish endpoints."""

import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Video, Project
from ..schemas import CatalogImportRequest, CatalogPublishRequest
from ..services import catalog as catalog_svc
from ..services.catalog_export import publish_to_catalog

router = APIRouter()


@router.get("/catalog/datasets")
def list_catalog_datasets(modality: str | None = None, domain: str | None = None):
    return catalog_svc.list_datasets(modality=modality, domain=domain)


@router.get("/catalog/datasets/{dataset_id}")
def get_catalog_dataset(dataset_id: int):
    ds = catalog_svc.get_dataset(dataset_id)
    if not ds:
        raise HTTPException(404, "Dataset not found in catalog")
    return ds


@router.get("/catalog/datasets/{dataset_id}/videos")
def list_catalog_dataset_videos(dataset_id: int, page: int = 1, per_page: int = 50):
    return catalog_svc.list_dataset_videos(dataset_id, page=page, per_page=per_page)


@router.post("/catalog/import")
def import_from_catalog(req: CatalogImportRequest, db: Session = Depends(get_db)):
    # Validate project exists
    project = db.query(Project).get(req.project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    # Validate dataset exists in catalog
    ds = catalog_svc.get_dataset(req.dataset_id)
    if not ds:
        raise HTTPException(404, "Dataset not found in catalog")

    # Determine which files to import
    if req.import_all:
        result = catalog_svc.list_dataset_videos(req.dataset_id, page=1, per_page=100_000)
        video_files = result["videos"]
    elif req.video_paths:
        video_files = [{"filename": os.path.basename(p), "path": p} for p in req.video_paths]
    else:
        raise HTTPException(400, "Provide video_paths or set import_all=true")

    # Create Video records by reference (no file copy)
    imported = 0
    for vf in video_files:
        abs_path = vf["path"]
        if not os.path.isfile(abs_path):
            continue

        # Skip if already imported (same catalog_path in this project)
        existing = db.query(Video).filter_by(
            catalog_path=abs_path, project_id=req.project_id
        ).first()
        if existing:
            continue

        video = Video(
            filename=vf["filename"],
            source_type="catalog",
            catalog_path=abs_path,
            catalog_dataset_id=req.dataset_id,
            project_id=req.project_id,
            status="pending",
        )

        # Optional eager metadata extraction
        if req.extract_metadata:
            try:
                from ..services.video_processing import extract_metadata
                meta = extract_metadata(abs_path)
                video.resolution = meta.get("resolution", "unknown")
                video.framerate = meta.get("framerate", 0)
                video.duration = meta.get("duration", 0)
            except Exception:
                pass

        db.add(video)
        imported += 1

    # Update project
    project.catalog_dataset_id = req.dataset_id
    project.catalog_dataset_name = ds["name"]
    project.total_videos = db.query(Video).filter_by(project_id=req.project_id).count() + imported
    project.last_activity = datetime.utcnow()

    db.commit()

    return {
        "success": True,
        "imported": imported,
        "skipped": len(video_files) - imported,
        "dataset_name": ds["name"],
        "project_id": req.project_id,
    }


@router.post("/catalog/publish/{project_id}")
def publish_project_to_catalog(
    project_id: int,
    req: CatalogPublishRequest = CatalogPublishRequest(),
    db: Session = Depends(get_db),
):
    try:
        result = publish_to_catalog(db, project_id, version=req.version)
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))
