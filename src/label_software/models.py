from .database import Base
from datetime import datetime
import enum

from sqlalchemy import Integer, String, Float, Boolean, DateTime, Date, Enum, JSON, ForeignKey, Text
from sqlalchemy.orm import mapped_column, relationship


class ProjectStatus(enum.Enum):
    SETUP = 'setup'
    ACTIVE = 'active'
    COMPLETED = 'completed'
    ARCHIVED = 'archived'


class Project(Base):
    __tablename__ = 'projects'

    project_id = mapped_column(Integer, primary_key=True)
    name = mapped_column(String(200), nullable=False)
    description = mapped_column(Text)
    created_at = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    deadline = mapped_column(Date)
    status = mapped_column(Enum(ProjectStatus), default=ProjectStatus.SETUP, nullable=False)
    annotation_schema = mapped_column(JSON)
    normalization_settings = mapped_column(JSON)
    quality_threshold = mapped_column(Float, default=0.8)
    total_videos = mapped_column(Integer, default=0)
    completed_videos = mapped_column(Integer, default=0)
    last_activity = mapped_column(DateTime, default=datetime.utcnow)

    # Catalog integration
    catalog_dataset_id = mapped_column(Integer, nullable=True)
    catalog_dataset_name = mapped_column(String(200), nullable=True)

    videos = relationship('Video', back_populates='project')

    def get_progress_percentage(self):
        if self.total_videos == 0:
            return 0
        return round((self.completed_videos / self.total_videos) * 100, 1)

    def to_dict(self, include_stats=True):
        data = {
            'project_id': self.project_id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'status': self.status.value if isinstance(self.status, ProjectStatus) else self.status,
            'quality_threshold': self.quality_threshold,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None,
            'catalog_dataset_id': self.catalog_dataset_id,
            'catalog_dataset_name': self.catalog_dataset_name,
            'annotation_schema': self.annotation_schema,
        }
        if include_stats:
            data.update({
                'total_videos': self.total_videos,
                'completed_videos': self.completed_videos,
                'progress_percentage': self.get_progress_percentage(),
            })
        return data

    def __repr__(self):
        return f'<Project {self.name} ({self.status.value})>'


class Video(Base):
    __tablename__ = 'videos'

    video_id = mapped_column(Integer, primary_key=True)
    filename = mapped_column(String(255))
    resolution = mapped_column(String(50))
    framerate = mapped_column(Float)
    duration = mapped_column(Float)
    import_date = mapped_column(DateTime, default=datetime.utcnow)
    normalization_settings = mapped_column(JSON)
    status = mapped_column(String(20), nullable=True, default='pending')
    is_completed = mapped_column(Boolean, default=False, nullable=False)

    project_id = mapped_column(Integer, ForeignKey('projects.project_id'))
    project = relationship('Project', back_populates='videos')

    # Catalog integration
    source_type = mapped_column(String(20), default='upload', nullable=False)
    catalog_path = mapped_column(Text, nullable=True)
    catalog_dataset_id = mapped_column(Integer, nullable=True)


class TemporalAnnotation(Base):
    __tablename__ = 'temporal_annotations'

    annotation_id = mapped_column(Integer, primary_key=True)
    video_id = mapped_column(Integer, ForeignKey('videos.video_id'), nullable=False)
    start_time = mapped_column(Float, nullable=False)
    end_time = mapped_column(Float, nullable=False)
    start_frame = mapped_column(Integer, nullable=False)
    end_frame = mapped_column(Integer, nullable=False)
    label = mapped_column(String(50), nullable=False)
    annotator_name = mapped_column(String(100))
    created_at = mapped_column(DateTime, default=datetime.utcnow)


class BoundingBoxAnnotation(Base):
    __tablename__ = 'bbox_annotations'

    bbox_id = mapped_column(Integer, primary_key=True)
    video_id = mapped_column(Integer, ForeignKey('videos.video_id'))
    frame_index = mapped_column(Integer)
    x = mapped_column(Float)
    y = mapped_column(Float)
    width = mapped_column(Float)
    height = mapped_column(Float)
    part_label = mapped_column(String(50))
    annotator_name = mapped_column(String(100))
    created_at = mapped_column(DateTime, default=datetime.utcnow)
