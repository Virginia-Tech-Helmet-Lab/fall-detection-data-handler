"""Export routes: JSON, CSV, ML dataset."""

import io
import csv
import json
import random
import zipfile
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Video, TemporalAnnotation, BoundingBoxAnnotation
from ..schemas import ExportRequest, MLDatasetRequest

router = APIRouter()


@router.get("/export")
def export_annotations_get(db: Session = Depends(get_db)):
    temporal = db.query(TemporalAnnotation).all()
    bboxes = db.query(BoundingBoxAnnotation).all()
    return {
        'temporal_annotations': [{
            'annotation_id': a.annotation_id, 'video_id': a.video_id,
            'start_time': a.start_time, 'end_time': a.end_time,
            'start_frame': a.start_frame, 'end_frame': a.end_frame,
            'label': a.label, 'annotator_name': a.annotator_name,
        } for a in temporal],
        'bounding_box_annotations': [{
            'bbox_id': b.bbox_id, 'video_id': b.video_id,
            'frame_index': b.frame_index, 'x': b.x, 'y': b.y,
            'width': b.width, 'height': b.height,
            'part_label': b.part_label, 'annotator_name': b.annotator_name,
        } for b in bboxes],
    }


@router.get("/export/stats")
def get_export_stats(db: Session = Depends(get_db)):
    return {
        'confirmedVideos': db.query(Video).filter_by(status='confirmed').count(),
        'totalVideos': db.query(Video).count(),
        'fallEvents': db.query(TemporalAnnotation).filter_by(label='Fall').count(),
        'totalAnnotations': db.query(TemporalAnnotation).count(),
        'boundingBoxes': db.query(BoundingBoxAnnotation).count(),
    }


@router.post("/export")
def export_data(body: ExportRequest, db: Session = Depends(get_db)):
    video_query = db.query(Video)
    if body.options.get('onlyConfirmed', True):
        video_query = video_query.filter_by(status='confirmed')
    videos = video_query.all()

    if body.format == 'json':
        export = []
        for video in videos:
            vd = {
                'video_id': video.video_id, 'filename': video.filename,
                'resolution': video.resolution, 'framerate': video.framerate,
                'duration': video.duration, 'status': video.status,
                'temporal_annotations': [{
                    'label': a.label, 'start_time': a.start_time, 'end_time': a.end_time,
                    'start_frame': a.start_frame, 'end_frame': a.end_frame, 'annotator_name': a.annotator_name,
                } for a in db.query(TemporalAnnotation).filter_by(video_id=video.video_id).all()],
                'bounding_box_annotations': [{
                    'frame_index': b.frame_index, 'x': b.x, 'y': b.y,
                    'width': b.width, 'height': b.height,
                    'part_label': b.part_label, 'annotator_name': b.annotator_name,
                } for b in db.query(BoundingBoxAnnotation).filter_by(video_id=video.video_id).all()],
            }
            export.append(vd)
        return export

    elif body.format == 'csv':
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['video_id', 'filename', 'resolution', 'framerate', 'duration',
                         'annotation_type', 'label', 'start_time', 'end_time',
                         'start_frame', 'end_frame', 'frame_index', 'x', 'y',
                         'width', 'height', 'part_label', 'annotator_name'])
        for video in videos:
            for a in db.query(TemporalAnnotation).filter_by(video_id=video.video_id).all():
                writer.writerow([video.video_id, video.filename, video.resolution,
                                 video.framerate, video.duration, 'temporal',
                                 a.label, a.start_time, a.end_time, a.start_frame, a.end_frame,
                                 '', '', '', '', '', '', a.annotator_name])
            for b in db.query(BoundingBoxAnnotation).filter_by(video_id=video.video_id).all():
                writer.writerow([video.video_id, video.filename, video.resolution,
                                 video.framerate, video.duration, 'bounding_box',
                                 '', '', '', '', '', b.frame_index, b.x, b.y,
                                 b.width, b.height, b.part_label, b.annotator_name])
        output.seek(0)
        return Response(content=output.getvalue(), media_type="text/csv",
                        headers={"Content-Disposition": "attachment; filename=export.csv"})
    else:
        raise HTTPException(501, detail=f"{body.format} format export not yet implemented")


@router.post("/export/ml-dataset")
def export_ml_dataset(body: MLDatasetRequest, db: Session = Depends(get_db)):
    ml_options = body.mlOptions
    videos = list(db.query(Video).filter_by(status='confirmed').all())
    split_ratio = ml_options.get('splitRatio', {'train': 0.7, 'val': 0.15, 'test': 0.15})

    if ml_options.get('splitStrategy', 'random') == 'random':
        random.shuffle(videos)

    n = len(videos)
    t = int(n * split_ratio['train'])
    v = int(n * split_ratio['val'])
    splits = {'train': videos[:t], 'val': videos[t:t + v], 'test': videos[t + v:]}

    dataset = {}
    for name, vids in splits.items():
        entries = []
        for video in vids:
            entries.append({
                'video_id': video.video_id, 'filename': video.filename,
                'resolution': video.resolution, 'framerate': video.framerate, 'duration': video.duration,
                'temporal_annotations': [{
                    'label': a.label, 'start_time': a.start_time, 'end_time': a.end_time,
                    'start_frame': a.start_frame, 'end_frame': a.end_frame,
                } for a in db.query(TemporalAnnotation).filter_by(video_id=video.video_id).all()],
                'bounding_box_annotations': [{
                    'frame_index': b.frame_index, 'x': b.x, 'y': b.y,
                    'width': b.width, 'height': b.height, 'part_label': b.part_label,
                } for b in db.query(BoundingBoxAnnotation).filter_by(video_id=video.video_id).all()],
            })
        dataset[name] = {'videos': entries, 'total_annotations': sum(len(e['temporal_annotations']) for e in entries)}

    if ml_options.get('outputFormat') == 'folder':
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            for name in ['train', 'val', 'test']:
                zf.writestr(f'{name}_annotations.json', json.dumps(dataset[name]['videos'], indent=2))
            zf.writestr('dataset_info.json', json.dumps({
                'dataset_name': ml_options.get('datasetName', 'FallDetectionDataset'),
                'splits': {k: len(v) for k, v in splits.items()},
                'created_at': datetime.now().isoformat(),
            }, indent=2))
        buf.seek(0)
        return Response(
            content=buf.getvalue(), media_type="application/zip",
            headers={'Content-Disposition': f'attachment; filename=ml_dataset_{datetime.now().strftime("%Y%m%d_%H%M%S")}.zip'},
        )
    else:
        return dataset
