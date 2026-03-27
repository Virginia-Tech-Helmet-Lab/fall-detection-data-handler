"""Review routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Video, TemporalAnnotation, BoundingBoxAnnotation

router = APIRouter()


@router.get("/review")
def get_review_data(db: Session = Depends(get_db)):
    videos = db.query(Video).all()
    review_data = []
    for video in videos:
        temporal = db.query(TemporalAnnotation).filter_by(video_id=video.video_id).all()
        bboxes = db.query(BoundingBoxAnnotation).filter_by(video_id=video.video_id).all()
        review_data.append({
            'video_id': video.video_id, 'filename': video.filename,
            'resolution': video.resolution, 'framerate': video.framerate,
            'duration': video.duration, 'status': video.status or 'pending',
            'annotations': [{
                'annotation_id': a.annotation_id, 'start_time': a.start_time,
                'end_time': a.end_time, 'start_frame': a.start_frame,
                'end_frame': a.end_frame, 'label': a.label,
            } for a in temporal],
            'bboxAnnotations': [{
                'bbox_id': b.bbox_id, 'frame_index': b.frame_index,
                'x': b.x, 'y': b.y, 'width': b.width, 'height': b.height,
                'part_label': b.part_label,
            } for b in bboxes],
        })
    return review_data


@router.post("/videos/{video_id}/confirm")
def confirm_video(video_id: int, db: Session = Depends(get_db)):
    video = db.get(Video, video_id)
    if not video:
        raise HTTPException(404, detail="Video not found")
    video.status = 'confirmed'
    db.commit()
    return {'status': 'success', 'message': 'Video confirmed'}


@router.post("/review/complete")
def complete_review(db: Session = Depends(get_db)):
    pending = db.query(Video).filter_by(status='pending').all()
    for v in pending:
        v.status = 'confirmed'
    db.commit()
    return {'status': 'success', 'confirmed_count': len(pending)}
