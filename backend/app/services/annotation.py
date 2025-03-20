from app.models import TemporalAnnotation
from app.database import db

def get_annotations(video_id):
    annotations = TemporalAnnotation.query.filter_by(video_id=video_id).all()
    return [{
        "annotation_id": a.annotation_id,
        "video_id": a.video_id,
        "start_time": a.start_time,
        "end_time": a.end_time,
        "label": a.label
    } for a in annotations]

def save_annotation(data):
    annotation = TemporalAnnotation(
        video_id=data.get('video_id'),
        start_time=data.get('start_time'),
        end_time=data.get('end_time'),
        start_frame=data.get('start_frame'),
        end_frame=data.get('end_frame'),
        label=data.get('label')
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
        "label": annotation.label
    }
