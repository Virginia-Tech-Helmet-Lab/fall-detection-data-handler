"""Analytics routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Project, Video, TemporalAnnotation, BoundingBoxAnnotation

router = APIRouter()


@router.get("/project/{project_id}")
def get_project_analytics(project_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, detail="Project not found")

    videos = db.query(Video).filter_by(project_id=project_id).all()
    video_ids = [v.video_id for v in videos]

    t_count = db.query(TemporalAnnotation).filter(TemporalAnnotation.video_id.in_(video_ids)).count() if video_ids else 0
    b_count = db.query(BoundingBoxAnnotation).filter(BoundingBoxAnnotation.video_id.in_(video_ids)).count() if video_ids else 0
    completed = sum(1 for v in videos if v.is_completed)

    return {
        'project': project.to_dict(),
        'video_stats': {
            'total': len(videos),
            'completed': completed,
            'completion_rate': round((completed / len(videos)) * 100, 1) if videos else 0,
        },
        'annotation_stats': {
            'total_temporal': t_count,
            'total_bbox': b_count,
            'average_per_video': round(t_count / len(videos), 1) if videos else 0,
        },
    }


@router.get("/overview")
def get_system_overview(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    return {
        'projects': len(projects),
        'total_videos': db.query(Video).count(),
        'completed_videos': db.query(Video).filter_by(is_completed=True).count(),
        'total_temporal_annotations': db.query(TemporalAnnotation).count(),
        'total_bbox_annotations': db.query(BoundingBoxAnnotation).count(),
    }
