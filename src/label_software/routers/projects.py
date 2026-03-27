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
