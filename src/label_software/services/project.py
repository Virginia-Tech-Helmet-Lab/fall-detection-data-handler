from sqlalchemy.orm import Session
from ..models import Project, Video, TemporalAnnotation, BoundingBoxAnnotation, ProjectStatus
from datetime import datetime


class ProjectService:

    @staticmethod
    def get_all_projects(db: Session, include_archived=False):
        query = db.query(Project)
        if not include_archived:
            query = query.filter(Project.status != ProjectStatus.ARCHIVED)
        return query.all()

    @staticmethod
    def get_project_statistics(db: Session, project_id):
        project = db.get(Project, project_id)
        if not project:
            return None

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

    @staticmethod
    def assign_videos_to_project(db: Session, project_id, video_ids):
        project = db.get(Project, project_id)
        if not project:
            return 0, 'Project not found'

        count = 0
        for vid in video_ids:
            video = db.get(Video, vid)
            if video:
                video.project_id = project_id
                count += 1

        project.total_videos = db.query(Video).filter_by(project_id=project_id).count()
        project.last_activity = datetime.utcnow()
        db.commit()
        return count, None

    @staticmethod
    def update_project_status(db: Session, project_id, status):
        project = db.get(Project, project_id)
        if not project:
            return False, 'Project not found'
        project.status = status
        project.last_activity = datetime.utcnow()
        db.commit()
        return True, None
