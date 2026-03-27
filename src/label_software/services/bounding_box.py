from sqlalchemy.orm import Session
from ..models import BoundingBoxAnnotation


def get_bbox_annotations(db: Session, video_id):
    bboxes = db.query(BoundingBoxAnnotation).filter_by(video_id=video_id).all()
    return [{
        'bbox_id': bbox.bbox_id,
        'video_id': bbox.video_id,
        'frame_index': bbox.frame_index,
        'x': bbox.x,
        'y': bbox.y,
        'width': bbox.width,
        'height': bbox.height,
        'part_label': bbox.part_label,
        'annotator_name': bbox.annotator_name,
        'created_at': bbox.created_at.isoformat() if bbox.created_at else None,
    } for bbox in bboxes]


def save_bbox_annotation(db: Session, data, annotator_name=None):
    bbox = BoundingBoxAnnotation(
        video_id=data.get('video_id'),
        frame_index=data.get('frame_index'),
        x=data.get('x'),
        y=data.get('y'),
        width=data.get('width'),
        height=data.get('height'),
        part_label=data.get('part_label'),
        annotator_name=annotator_name,
    )
    db.add(bbox)
    db.commit()
    db.refresh(bbox)
    return {
        'status': 'saved',
        'bbox_id': bbox.bbox_id,
        'annotator_name': bbox.annotator_name,
        'created_at': bbox.created_at.isoformat() if bbox.created_at else None,
    }
