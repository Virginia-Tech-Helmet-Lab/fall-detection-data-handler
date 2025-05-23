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

class ProjectStatus(enum.Enum):
    """Project lifecycle status"""
    SETUP = 'setup'
    ACTIVE = 'active'
    COMPLETED = 'completed'
    ARCHIVED = 'archived'

class ProjectMemberRole(enum.Enum):
    """Roles within a project"""
    LEAD = 'lead'
    MEMBER = 'member'

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
        # Handle role conversion safely
        role_value = self.role
        if isinstance(self.role, UserRole):
            role_value = self.role.value
        elif isinstance(self.role, str):
            # Convert uppercase enum values to lowercase
            if self.role in ['ADMIN', 'ANNOTATOR', 'REVIEWER']:
                role_value = self.role.lower()
            else:
                role_value = self.role
        
        return {
            'user_id': self.user_id,
            'username': self.username,
            'email': self.email,
            'role': role_value,
            'full_name': self.full_name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_active': self.last_active.isoformat() if self.last_active else None
        }
    
    def __repr__(self):
        return f'<User {self.username} ({self.role.value if isinstance(self.role, UserRole) else self.role})>'

class Project(db.Model):
    """Project model for organizing datasets and annotation efforts"""
    __tablename__ = 'projects'
    
    project_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    deadline = db.Column(db.Date)
    status = db.Column(db.Enum(ProjectStatus), default=ProjectStatus.SETUP, nullable=False)
    annotation_schema = db.Column(db.JSON)  # Stores what should be annotated
    normalization_settings = db.Column(db.JSON)  # Default video processing settings
    quality_threshold = db.Column(db.Float, default=0.8)
    total_videos = db.Column(db.Integer, default=0)
    completed_videos = db.Column(db.Integer, default=0)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', backref='created_projects', foreign_keys=[created_by])
    members = db.relationship('ProjectMember', back_populates='project', cascade='all, delete-orphan')
    # TODO: Uncomment after running migration script
    # videos = db.relationship('Video', back_populates='project')
    
    def get_progress_percentage(self):
        """Calculate project completion percentage"""
        if self.total_videos == 0:
            return 0
        return round((self.completed_videos / self.total_videos) * 100, 1)
    
    def is_user_member(self, user_id):
        """Check if a user is a member of this project"""
        return any(member.user_id == user_id for member in self.members)
    
    def get_user_role(self, user_id):
        """Get a user's role within the project"""
        member = next((m for m in self.members if m.user_id == user_id), None)
        return member.role if member else None
    
    def to_dict(self, include_stats=True):
        """Convert project to dictionary"""
        data = {
            'project_id': self.project_id,
            'name': self.name,
            'description': self.description,
            'created_by': self.created_by,
            'creator_name': self.creator.full_name if self.creator else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'status': self.status.value if isinstance(self.status, ProjectStatus) else self.status,
            'quality_threshold': self.quality_threshold,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None
        }
        
        if include_stats:
            data.update({
                'total_videos': self.total_videos,
                'completed_videos': self.completed_videos,
                'progress_percentage': self.get_progress_percentage(),
                'member_count': len(self.members)
            })
        
        return data
    
    def __repr__(self):
        return f'<Project {self.name} ({self.status.value})>'

class ProjectMember(db.Model):
    """Association between users and projects with roles"""
    __tablename__ = 'project_members'
    
    membership_id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.project_id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    role = db.Column(db.Enum(ProjectMemberRole), default=ProjectMemberRole.MEMBER, nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_active = db.Column(db.DateTime, default=datetime.utcnow)
    videos_assigned = db.Column(db.Integer, default=0)
    videos_completed = db.Column(db.Integer, default=0)
    
    # Relationships
    project = db.relationship('Project', back_populates='members')
    user = db.relationship('User', backref='project_memberships')
    
    # Unique constraint to prevent duplicate memberships
    __table_args__ = (db.UniqueConstraint('project_id', 'user_id'),)
    
    def get_completion_rate(self):
        """Calculate member's completion rate"""
        if self.videos_assigned == 0:
            return 0
        return round((self.videos_completed / self.videos_assigned) * 100, 1)
    
    def to_dict(self):
        """Convert membership to dictionary"""
        return {
            'membership_id': self.membership_id,
            'project_id': self.project_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'full_name': self.user.full_name if self.user else None,
            'role': self.role.value if isinstance(self.role, ProjectMemberRole) else self.role,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'last_active': self.last_active.isoformat() if self.last_active else None,
            'videos_assigned': self.videos_assigned,
            'videos_completed': self.videos_completed,
            'completion_rate': self.get_completion_rate()
        }
    
    def __repr__(self):
        return f'<ProjectMember {self.user.username if self.user else "Unknown"} in {self.project.name if self.project else "Unknown"} ({self.role.value})>'

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
    
    # Project association
    # TODO: Uncomment after running migration script
    # project_id = db.Column(db.Integer, db.ForeignKey('projects.project_id'))
    # project = db.relationship('Project', back_populates='videos')
    
    # Assignment tracking
    # TODO: Uncomment after running migration script
    # assigned_to = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    # assignee = db.relationship('User', backref='assigned_videos')

class TemporalAnnotation(db.Model):
    __tablename__ = 'temporal_annotations'
    annotation_id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.Integer, db.ForeignKey('videos.video_id'), nullable=False)
    start_time = db.Column(db.Float, nullable=False)
    end_time = db.Column(db.Float, nullable=False)
    start_frame = db.Column(db.Integer, nullable=False)
    end_frame = db.Column(db.Integer, nullable=False)
    label = db.Column(db.String(50), nullable=False)
    
    # Track who created this annotation
    # TODO: Uncomment after running migration script
    # created_by = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    # created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # annotator = db.relationship('User', backref='temporal_annotations')

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
    
    # Track who created this annotation
    # TODO: Uncomment after running migration script
    # created_by = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    # created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # annotator = db.relationship('User', backref='bbox_annotations')
