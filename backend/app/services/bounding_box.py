from app.models import BoundingBoxAnnotation
from app.database import db

def get_bbox_annotations(video_id):
    """Get all bounding box annotations for a video"""
    bboxes = BoundingBoxAnnotation.query.filter_by(video_id=video_id).all()
    return [{
        'bbox_id': bbox.bbox_id,
        'video_id': bbox.video_id,
        'frame_index': bbox.frame_index,
        'x': bbox.x,
        'y': bbox.y,
        'width': bbox.width,
        'height': bbox.height,
        'part_label': bbox.part_label,
        'created_by': bbox.created_by,
        'created_at': bbox.created_at.isoformat() if bbox.created_at else None,
        'annotator_name': bbox.annotator.full_name if bbox.annotator else None
    } for bbox in bboxes]

def save_bbox_annotation(data, user_id=None):
    """Save a new bounding box annotation"""
    bbox = BoundingBoxAnnotation(
        video_id=data.get('video_id'),
        frame_index=data.get('frame_index'),
        x=data.get('x'),
        y=data.get('y'),
        width=data.get('width'),
        height=data.get('height'),
        part_label=data.get('part_label'),
        created_by=user_id
    )
    db.session.add(bbox)
    db.session.commit()
    return {
        'status': 'saved',
        'bbox_id': bbox.bbox_id,
        'created_by': bbox.created_by,
        'created_at': bbox.created_at.isoformat() if bbox.created_at else None
    }
