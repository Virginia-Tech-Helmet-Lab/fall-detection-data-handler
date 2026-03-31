"""Project management routes."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging

from ..database import get_db
from ..models import Project, ProjectStatus, Video, TemporalAnnotation, BoundingBoxAnnotation
from ..schemas import ProjectCreate, ProjectUpdate, AssignVideosRequest, StatusUpdateRequest

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
def get_projects(include_archived: str = "false", db: Session = Depends(get_db)):
    query = db.query(Project)
    if include_archived.lower() != 'true':
        query = query.filter(Project.status != ProjectStatus.ARCHIVED)
    projects = query.all()
    return {'projects': [p.to_dict() for p in projects], 'count': len(projects)}


@router.post("", status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    if not body.name:
        raise HTTPException(400, detail="Project name is required")

    deadline = None
    if body.deadline:
        try:
            deadline = datetime.fromisoformat(body.deadline.replace('Z', '+00:00'))
        except Exception:
            raise HTTPException(400, detail="Invalid deadline format")

    project = Project(
        name=body.name,
        description=body.description,
        deadline=deadline,
        status=ProjectStatus.ACTIVE,
        annotation_schema=body.annotation_schema,
        normalization_settings=body.normalization_settings,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return {'message': 'Project created', 'project': project.to_dict()}


@router.get("/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, detail="Project not found")
    return project.to_dict()


@router.put("/{project_id}")
def update_project(project_id: int, body: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, detail="Project not found")

    data = body.model_dump(exclude_unset=True)
    if 'name' in data:
        project.name = data['name']
    if 'description' in data:
        project.description = data['description']
    if 'deadline' in data:
        project.deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00')) if data['deadline'] else None
    if 'annotation_schema' in data:
        project.annotation_schema = data['annotation_schema']
    if 'normalization_settings' in data:
        project.normalization_settings = data['normalization_settings']
    if 'quality_threshold' in data:
        project.quality_threshold = data['quality_threshold']
    if 'status' in data:
        try:
            project.status = ProjectStatus(data['status'])
        except ValueError:
            pass

    project.last_activity = datetime.utcnow()
    db.commit()
    return {'message': 'Project updated', 'project': project.to_dict()}


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, detail="Project not found")
    name = project.name
    db.delete(project)
    db.commit()
    return {'message': f'Project "{name}" deleted', 'success': True}


@router.post("/{project_id}/videos")
def assign_videos_to_project(project_id: int, body: AssignVideosRequest, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, detail="Project not found")

    if not body.video_ids:
        raise HTTPException(400, detail="video_ids array is required")

    count = 0
    for vid in body.video_ids:
        video = db.get(Video, vid)
        if video:
            video.project_id = project_id
            count += 1

    project.total_videos = db.query(Video).filter_by(project_id=project_id).count()
    project.last_activity = datetime.utcnow()
    db.commit()
    return {'message': f'{count} videos assigned', 'assigned_count': count}


@router.put("/{project_id}/status")
def update_project_status(project_id: int, body: StatusUpdateRequest, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, detail="Project not found")
    try:
        project.status = ProjectStatus(body.status)
    except ValueError:
        raise HTTPException(400, detail="Invalid status value")

    project.last_activity = datetime.utcnow()
    db.commit()
    return {'message': 'Status updated', 'status': project.status.value}


@router.get("/{project_id}/stats")
def get_project_statistics(project_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, detail="Project not found")

    videos = db.query(Video).filter_by(project_id=project_id).all()
    video_ids = [v.video_id for v in videos]

    t_count = db.query(TemporalAnnotation).filter(TemporalAnnotation.video_id.in_(video_ids)).count() if video_ids else 0
    b_count = db.query(BoundingBoxAnnotation).filter(BoundingBoxAnnotation.video_id.in_(video_ids)).count() if video_ids else 0
    completed = sum(1 for v in videos if v.is_completed)

    return {
        'total_videos': len(videos),
        'completed_videos': completed,
        'total_temporal_annotations': t_count,
        'total_bbox_annotations': b_count,
        'completion_percentage': round((completed / len(videos)) * 100, 1) if videos else 0,
    }


@router.get("/{project_id}/datasets")
def list_project_datasets(project_id: int, db: Session = Depends(get_db)):
    """List distinct catalog datasets linked to this project via its videos."""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, detail="Project not found")

    # Group videos by catalog_dataset_id
    videos = db.query(Video).filter_by(project_id=project_id).filter(Video.catalog_dataset_id.isnot(None)).all()
    datasets = {}
    for v in videos:
        ds_id = v.catalog_dataset_id
        if ds_id not in datasets:
            datasets[ds_id] = {'dataset_id': ds_id, 'video_count': 0, 'has_annotations': False}
        datasets[ds_id]['video_count'] += 1
        # Check for annotations on this video
        t = db.query(TemporalAnnotation).filter_by(video_id=v.video_id).count()
        b = db.query(BoundingBoxAnnotation).filter_by(video_id=v.video_id).count()
        if t > 0 or b > 0:
            datasets[ds_id]['has_annotations'] = True

    # Enrich with catalog names
    try:
        from ..services import catalog as catalog_svc
        for ds_id, info in datasets.items():
            ds = catalog_svc.get_dataset(ds_id)
            info['dataset_name'] = ds['name'] if ds else f'Dataset {ds_id}'
    except Exception:
        for ds_id, info in datasets.items():
            info['dataset_name'] = f'Dataset {ds_id}'

    return list(datasets.values())


@router.delete("/{project_id}/datasets/{dataset_id}")
def unlink_dataset(project_id: int, dataset_id: int, db: Session = Depends(get_db)):
    """Remove all videos from a specific catalog dataset, only if none have annotations."""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(404, detail="Project not found")

    videos = db.query(Video).filter_by(project_id=project_id, catalog_dataset_id=dataset_id).all()
    if not videos:
        raise HTTPException(404, detail="No videos from this dataset in the project")

    # Safety check — refuse if any video has annotations
    annotated = []
    for v in videos:
        t = db.query(TemporalAnnotation).filter_by(video_id=v.video_id).count()
        b = db.query(BoundingBoxAnnotation).filter_by(video_id=v.video_id).count()
        if t > 0 or b > 0:
            annotated.append(v.filename)

    if annotated:
        raise HTTPException(400, detail=f"Cannot unlink: {len(annotated)} video(s) have annotations. Delete annotations first.")

    # Safe to remove
    count = len(videos)
    for v in videos:
        db.delete(v)

    # Update project metadata
    project.total_videos = db.query(Video).filter_by(project_id=project_id).count() - count
    remaining = db.query(Video).filter_by(project_id=project_id).filter(Video.catalog_dataset_id != dataset_id).first()
    if not remaining:
        project.catalog_dataset_id = None
        project.catalog_dataset_name = None
    project.last_activity = datetime.utcnow()

    db.commit()
    return {'success': True, 'removed': count, 'dataset_id': dataset_id}
