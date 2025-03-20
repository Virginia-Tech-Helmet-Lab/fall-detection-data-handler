from .database import db
from datetime import datetime

class Video(db.Model):
    __tablename__ = 'videos'
    video_id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255))
    resolution = db.Column(db.String(50))
    framerate = db.Column(db.Float)
    duration = db.Column(db.Float)
    import_date = db.Column(db.DateTime, default=datetime.utcnow)
    normalization_settings = db.Column(db.JSON)
    status = db.Column(db.String(20), nullable=True, default='pending')

class TemporalAnnotation(db.Model):
    __tablename__ = 'temporal_annotations'
    annotation_id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.Integer, db.ForeignKey('videos.video_id'), nullable=False)
    start_time = db.Column(db.Float, nullable=False)
    end_time = db.Column(db.Float, nullable=False)
    start_frame = db.Column(db.Integer, nullable=False)
    end_frame = db.Column(db.Integer, nullable=False)
    label = db.Column(db.String(50), nullable=False)

class BoundingBoxAnnotation(db.Model):
    __tablename__ = 'bbox_annotations'
    bbox_id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.Integer, db.ForeignKey('videos.video_id'))
    frame_index = db.Column(db.Integer)
    x = db.Column(db.Float)
    y = db.Column(db.Float)
    width = db.Column(db.Float)
    height = db.Column(db.Float)
    part_label = db.Column(db.String(50))
