"""Video management routes: upload, list, complete, file serving, thumbnails."""

import io
import os
from urllib.parse import unquote

import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from werkzeug.utils import secure_filename

from ..config import settings
from ..database import get_db
from ..models import Video, Project
from ..services.video_processing import extract_metadata, ensure_browser_compatible, extract_video_frame
from datetime import datetime

router = APIRouter()

ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'wmv', 'mkv'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@router.post("/upload")
def upload_video(
    files: list[UploadFile] = File(...),
    project_id: int | None = Form(None),
    db: Session = Depends(get_db),
):
    if not files or files[0].filename == '':
        raise HTTPException(400, detail="No files selected")

    project = None
    if project_id is not None:
        project = db.get(Project, project_id)
        if not project:
            raise HTTPException(404, detail=f"Project {project_id} not found")

    upload_folder = settings.upload_folder
    os.makedirs(upload_folder, exist_ok=True)

    results = []
    for file in files:
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(upload_folder, filename)

            with open(filepath, "wb") as f:
                import shutil
                shutil.copyfileobj(file.file, f)

            web_filename = ensure_browser_compatible(filename, upload_folder)

            try:
                metadata = extract_metadata(filepath)
            except Exception:
                metadata = {'resolution': 'unknown', 'width': 0, 'height': 0, 'framerate': 0, 'duration': 0}

            video = Video(
                filename=web_filename,
                resolution=metadata.get('resolution', 'unknown'),
                framerate=metadata.get('framerate', 0),
                duration=metadata.get('duration', 0),
                project_id=project_id,
            )
            db.add(video)

            if project:
                project.total_videos = db.query(Video).filter_by(project_id=project_id).count() + 1
                project.last_activity = datetime.utcnow()

            results.append({'filename': web_filename, 'status': 'success', 'metadata': metadata})
        else:
            results.append({'filename': getattr(file, 'filename', 'unknown'), 'status': 'error', 'message': 'Invalid file type'})

    db.commit()
    return {'uploaded': results}


@router.get("/videos")
def list_videos(
    project_id: int | None = None,
    page: int = 1,
    per_page: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(Video)
    if project_id:
        query = query.filter_by(project_id=project_id)

    total = query.count()
    videos = query.offset((page - 1) * per_page).limit(per_page).all()
    return {
        'videos': [{
            'video_id': v.video_id, 'filename': v.filename,
            'resolution': v.resolution, 'framerate': v.framerate,
            'duration': v.duration, 'status': v.status,
            'is_completed': v.is_completed, 'project_id': v.project_id,
            'source_type': v.source_type, 'catalog_path': v.catalog_path,
        } for v in videos],
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page,
    }


@router.post("/videos/{video_id}/complete")
def mark_video_complete(video_id: int, db: Session = Depends(get_db)):
    video = db.get(Video, video_id)
    if not video:
        raise HTTPException(404, detail="Video not found")
    video.is_completed = True
    video.status = 'completed'
    db.commit()
    return {'message': 'Video marked as complete', 'status': 'completed'}


@router.get("/video-file/{video_id}")
def serve_video_file(video_id: int, db: Session = Depends(get_db)):
    """Unified video serving -- resolves path from DB, handles catalog + upload videos."""
    video = db.get(Video, video_id)
    if not video:
        raise HTTPException(404, detail="Video not found")

    if video.source_type == "catalog" and video.catalog_path:
        video_path = video.catalog_path
    else:
        video_path = os.path.join(settings.upload_folder, video.filename)

    if not os.path.isfile(video_path):
        raise HTTPException(404, detail=f"Video file not found: {video.filename}")

    # Transcode if needed (AVI, MKV, etc.)
    from ..services.transcode import get_playable_path
    playable_path = get_playable_path(video_path)

    return FileResponse(playable_path, media_type="video/mp4")


@router.get("/video-thumbnail/{video_id}/{frame_number}")
def get_video_thumbnail(video_id: int, frame_number: int, db: Session = Depends(get_db)):
    """Thumbnail extraction using video_id (works for both catalog and upload videos)."""
    video = db.get(Video, video_id)
    if not video:
        raise HTTPException(404, detail="Video not found")

    if video.source_type == "catalog" and video.catalog_path:
        video_path = video.catalog_path
    else:
        video_path = os.path.join(settings.upload_folder, video.filename)

    if os.path.isfile(video_path):
        thumbnail_path = extract_video_frame(
            os.path.basename(video_path), frame_number,
            os.path.dirname(video_path), settings.thumbnail_cache,
        )
        if thumbnail_path and os.path.exists(thumbnail_path):
            return FileResponse(thumbnail_path, media_type="image/jpeg")

    # Fallback
    img = np.zeros((120, 160, 3), dtype=np.uint8)
    img[:, :, 2] = 255
    cv2.putText(img, "Not found", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    _, buffer = cv2.imencode('.jpg', img)
    return Response(content=buffer.tobytes(), media_type="image/jpeg")


@router.get("/static/{filename:path}")
def serve_static(filename: str):
    filepath = os.path.join(settings.upload_folder, filename)
    if not os.path.isfile(filepath):
        raise HTTPException(404, detail="File not found")
    return FileResponse(filepath)


@router.get("/preview/{filename:path}")
def serve_preview(filename: str):
    filepath = os.path.join(settings.preview_dir, filename)
    if not os.path.isfile(filepath):
        raise HTTPException(404, detail="File not found")
    return FileResponse(filepath)


@router.get("/thumbnail/{video_filename:path}/{frame_number}")
def get_thumbnail(video_filename: str, frame_number: int):
    try:
        video_filename = unquote(video_filename)
        video_path = os.path.join(settings.upload_folder, video_filename)

        if os.path.exists(video_path):
            thumbnail_path = extract_video_frame(
                video_filename, frame_number,
                settings.upload_folder, settings.thumbnail_cache,
            )
            if thumbnail_path and os.path.exists(thumbnail_path):
                return FileResponse(thumbnail_path, media_type="image/jpeg")

        # Fallback error image
        img = np.zeros((120, 160, 3), dtype=np.uint8)
        if not os.path.exists(video_path):
            img[:, :, 2] = 255
            cv2.putText(img, "File not found", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        else:
            img[:, :, 1] = 255
            cv2.putText(img, "Extract failed", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        _, buffer = cv2.imencode('.jpg', img)
        return Response(content=buffer.tobytes(), media_type="image/jpeg")
    except Exception:
        img = np.zeros((120, 160, 3), dtype=np.uint8)
        img[:, :, 0] = 255
        img[:, :, 2] = 255
        cv2.putText(img, "Error", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        _, buffer = cv2.imencode('.jpg', img)
        return Response(content=buffer.tobytes(), media_type="image/jpeg")
