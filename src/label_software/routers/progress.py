"""Progress tracking routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Video, TemporalAnnotation, BoundingBoxAnnotation

router = APIRouter()


@router.get("/progress/{project_id}")
def get_project_progress(project_id: int, db: Session = Depends(get_db)):
    videos = db.query(Video).filter_by(project_id=project_id).all()
    progress = {'total': len(videos), 'completed': 0, 'in_progress': 0, 'not_started': 0, 'videos': []}

    for video in videos:
        t_count = db.query(TemporalAnnotation).filter_by(video_id=video.video_id).count()
        b_count = db.query(BoundingBoxAnnotation).filter_by(video_id=video.video_id).count()

        if video.is_completed:
            status = 'completed'
            progress['completed'] += 1
        elif t_count > 0 or b_count > 0:
            status = 'in_progress'
            progress['in_progress'] += 1
        else:
            status = 'not_started'
            progress['not_started'] += 1

        progress['videos'].append({
            'video_id': video.video_id, 'filename': video.filename, 'status': status,
            'temporal_annotations': t_count, 'bbox_annotations': b_count,
        })

    progress['completion_percentage'] = (
        round((progress['completed'] / progress['total']) * 100, 1) if progress['total'] > 0 else 0
    )
    return progress
