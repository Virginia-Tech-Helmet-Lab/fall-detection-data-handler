from sqlalchemy.orm import Session
from ..models import TemporalAnnotation


def get_annotations(db: Session, video_id):
    annotations = db.query(TemporalAnnotation).filter_by(video_id=video_id).all()
    return [{
        "annotation_id": a.annotation_id,
        "video_id": a.video_id,
        "start_time": a.start_time,
        "end_time": a.end_time,
        "start_frame": a.start_frame,
        "end_frame": a.end_frame,
        "label": a.label,
        "annotator_name": a.annotator_name,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in annotations]


def save_annotation(db: Session, data, annotator_name=None):
    annotation = TemporalAnnotation(
        video_id=data.get('video_id'),
        start_time=data.get('start_time'),
        end_time=data.get('end_time'),
        start_frame=data.get('start_frame'),
        end_frame=data.get('end_frame'),
        label=data.get('label'),
        annotator_name=annotator_name,
    )
    db.add(annotation)
    db.commit()
    db.refresh(annotation)
    return {
        "status": "saved",
        "annotation_id": annotation.annotation_id,
        "start_time": annotation.start_time,
        "end_time": annotation.end_time,
        "start_frame": annotation.start_frame,
        "end_frame": annotation.end_frame,
        "label": annotation.label,
        "annotator_name": annotation.annotator_name,
        "created_at": annotation.created_at.isoformat() if annotation.created_at else None,
    }
