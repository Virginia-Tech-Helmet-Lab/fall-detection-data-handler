from .database import db
from datetime import datetime
from flask_login import UserMixin
from flask_bcrypt import generate_password_hash, check_password_hash
import enum

class UserRole(enum.Enum):
    """User roles for the application"""
    ADMIN = 'admin'
    ANNOTATOR = 'annotator'
    REVIEWER = 'reviewer'

class User(UserMixin, db.Model):
    """User model for authentication and role management"""
    __tablename__ = 'users'
    
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(100), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.ANNOTATOR)
    full_name = db.Column(db.String(100), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_active = db.Column(db.DateTime, default=datetime.utcnow)
    
    def get_id(self):
        """Required by Flask-Login"""
        return str(self.user_id)
    
    def set_password(self, password):
        """Hash and set user password"""
        self.password_hash = generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def update_last_active(self):
        """Update last active timestamp"""
        self.last_active = datetime.utcnow()
        db.session.commit()
    
    def to_dict(self):
        """Convert user to dictionary (excluding sensitive data)"""
        return {
            'user_id': self.user_id,
            'username': self.username,
            'email': self.email,
            'role': self.role.value if isinstance(self.role, UserRole) else self.role,
            'full_name': self.full_name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_active': self.last_active.isoformat() if self.last_active else None
        }
    
    def __repr__(self):
        return f'<User {self.username} ({self.role.value if isinstance(self.role, UserRole) else self.role})>'

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
