from app.models import TemporalAnnotation
from app.database import db
from flask import g

def get_annotations(video_id):
    annotations = TemporalAnnotation.query.filter_by(video_id=video_id).all()
    return [{
        "annotation_id": a.annotation_id,
        "video_id": a.video_id,
        "start_time": a.start_time,
        "end_time": a.end_time,
        "label": a.label,
        "created_by": a.created_by,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "annotator_name": a.annotator.full_name if a.annotator else None
    } for a in annotations]

def save_annotation(data, user_id=None):
    annotation = TemporalAnnotation(
        video_id=data.get('video_id'),
        start_time=data.get('start_time'),
        end_time=data.get('end_time'),
        start_frame=data.get('start_frame'),
        end_frame=data.get('end_frame'),
        label=data.get('label'),
        created_by=user_id or getattr(g, 'user_id', None)
    )
    db.session.add(annotation)
    db.session.commit()
    return {
        "status": "saved", 
        "annotation_id": annotation.annotation_id,
        "start_time": annotation.start_time,
        "end_time": annotation.end_time,
        "start_frame": annotation.start_frame,
        "end_frame": annotation.end_frame,
        "label": annotation.label,
        "created_by": annotation.created_by,
        "created_at": annotation.created_at.isoformat() if annotation.created_at else None
    }
