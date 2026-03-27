"""Normalization routes: preview and normalize videos via FFmpeg."""

import os
import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Video
from ..schemas import NormalizeRequest, NormalizeAllRequest
from ..services.normalization import normalize_video, generate_preview

router = APIRouter()


@router.post("/preview-normalize")
def preview_normalize(body: NormalizeRequest, db: Session = Depends(get_db)):
    video = db.get(Video, body.video_id)
    if not video:
        raise HTTPException(404, detail="Video not found")

    try:
        preview_dir = settings.preview_dir
        os.makedirs(preview_dir, exist_ok=True)
        source_path = os.path.join(settings.upload_folder, video.filename)
        preview_filename = f"preview_{body.video_id}_{int(time.time())}.mp4"
        preview_path = os.path.join(preview_dir, preview_filename)
        generate_preview(source_path, preview_path, body.settings)
        return {'preview_filename': f'preview/{preview_filename}'}
    except Exception as e:
        raise HTTPException(500, detail=str(e))


@router.post("/normalize")
def normalize_video_endpoint(body: NormalizeRequest, db: Session = Depends(get_db)):
    video = db.get(Video, body.video_id)
    if not video:
        raise HTTPException(404, detail="Video not found")

    try:
        source_path = os.path.join(settings.upload_folder, video.filename)
        normalized_filename = f"norm_{video.filename}"
        normalized_path = os.path.join(settings.upload_folder, normalized_filename)
        normalize_video(
            source_path, normalized_path,
            resolution=body.settings.get('resolution', '224x224'),
            framerate=body.settings.get('framerate', 30),
            brightness=body.settings.get('brightness', 1.0),
            contrast=body.settings.get('contrast', 1.0),
            saturation=body.settings.get('saturation', 1.0),
        )
        video.resolution = body.settings.get('resolution', '224x224')
        video.framerate = body.settings.get('framerate', 30)
        db.commit()
        return {'success': True, 'normalized_filename': normalized_filename}
    except Exception as e:
        raise HTTPException(500, detail=str(e))


@router.post("/normalize-all")
def normalize_all_videos(body: NormalizeAllRequest, db: Session = Depends(get_db)):
    videos = db.query(Video).all()
    if not videos:
        raise HTTPException(404, detail="No videos found")

    processed_count = 0
    errors = []
    for video in videos:
        try:
            source_path = os.path.join(settings.upload_folder, video.filename)
            normalized_filename = f"norm_{video.filename}"
            normalized_path = os.path.join(settings.upload_folder, normalized_filename)
            normalize_video(
                source_path, normalized_path,
                resolution=body.settings.get('resolution', '224x224'),
                framerate=body.settings.get('framerate', 30),
                brightness=body.settings.get('brightness', 1.0),
                contrast=body.settings.get('contrast', 1.0),
                saturation=body.settings.get('saturation', 1.0),
            )
            video.resolution = body.settings.get('resolution', '224x224')
            video.framerate = body.settings.get('framerate', 30)
            processed_count += 1
        except Exception as e:
            errors.append({'video_id': video.video_id, 'filename': video.filename, 'error': str(e)})

    db.commit()
    return {'success': True, 'processed_count': processed_count, 'errors': errors}
