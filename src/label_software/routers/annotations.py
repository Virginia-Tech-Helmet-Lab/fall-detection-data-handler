"""Annotation routes: temporal annotations and bounding boxes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging

from ..database import get_db
from ..models import TemporalAnnotation, BoundingBoxAnnotation
from ..schemas import AnnotationCreate, BboxAnnotationCreate
from ..services.annotation import get_annotations, save_annotation
from ..services.bounding_box import save_bbox_annotation

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/annotations/{video_id}")
def get_video_annotations(video_id: int, db: Session = Depends(get_db)):
    return get_annotations(db, video_id)


@router.post("/annotations")
def create_annotation(body: AnnotationCreate, db: Session = Depends(get_db)):
    # Validate: need either frame_index (single-frame) or start_frame+end_frame (range)
    has_frame = body.frame_index is not None
    has_range = body.start_frame is not None and body.end_frame is not None
    if not has_frame and not has_range:
        raise HTTPException(400, detail="Provide frame_index (single-frame) or start_frame + end_frame (range)")
    try:
        data = body.model_dump()
        result = save_annotation(db, data, annotator_name=body.annotator_name)
        return result
    except Exception as e:
        logger.error(f"Error saving annotation: {e}", exc_info=True)
        raise HTTPException(500, detail=str(e))


@router.delete("/annotations/{annotation_id}")
def delete_annotation(annotation_id: int, db: Session = Depends(get_db)):
    annotation = db.get(TemporalAnnotation, annotation_id)
    if not annotation:
        raise HTTPException(404, detail="Annotation not found")
    db.delete(annotation)
    db.commit()
    return {'status': 'deleted'}


@router.post("/bbox-annotations")
def create_bbox_annotation(body: BboxAnnotationCreate, db: Session = Depends(get_db)):
    try:
        data = body.model_dump()
        result = save_bbox_annotation(db, data, annotator_name=body.annotator_name)
        return result
    except Exception as e:
        logger.error(f"Error saving bbox annotation: {e}", exc_info=True)
        raise HTTPException(500, detail=str(e))


@router.get("/bbox-annotations/{video_id}")
def get_bbox_annotations(video_id: int, db: Session = Depends(get_db)):
    bboxes = db.query(BoundingBoxAnnotation).filter_by(video_id=video_id).all()
    return [{
        'bbox_id': b.bbox_id, 'video_id': b.video_id, 'frame_index': b.frame_index,
        'x': b.x, 'y': b.y, 'width': b.width, 'height': b.height, 'part_label': b.part_label,
    } for b in bboxes]


@router.get("/delete-bbox/{bbox_id}")
@router.get("/remove-bbox/{bbox_id}")
def delete_bbox_get(bbox_id: int, db: Session = Depends(get_db)):
    bbox = db.get(BoundingBoxAnnotation, bbox_id)
    if not bbox:
        raise HTTPException(404, detail="Bounding box not found")
    video_id = bbox.video_id
    db.delete(bbox)
    db.commit()
    return {'status': 'success', 'bbox_id': bbox_id, 'video_id': video_id}
