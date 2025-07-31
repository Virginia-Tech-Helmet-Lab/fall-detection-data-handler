#!/usr/bin/env python
"""Database backup script for Fall Detection Data Handler."""

import os
import sys
import json
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from app import create_app
from app.models import (
    User, Project, Video, Annotation, TemporalAnnotation,
    BoundingBoxAnnotation, ProjectMember, ReviewQueue, ReviewFeedback
)
from app.database import db

class DatabaseBackup:
    def __init__(self, backup_dir="backups"):
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(exist_ok=True)
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
    def backup_sqlite(self, app):
        """Backup SQLite database."""
        db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
        if not os.path.exists(db_path):
            print(f"Database file not found: {db_path}")
            return None
            
        backup_path = self.backup_dir / f"falldetection_backup_{self.timestamp}.db"
        shutil.copy2(db_path, backup_path)
        print(f"SQLite backup created: {backup_path}")
        return backup_path
        
    def backup_postgresql(self, app):
        """Backup PostgreSQL database."""
        db_uri = app.config['SQLALCHEMY_DATABASE_URI']
        backup_path = self.backup_dir / f"falldetection_backup_{self.timestamp}.sql"
        
        # Extract connection details
        import re
        match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', db_uri)
        if not match:
            print("Invalid PostgreSQL URI")
            return None
            
        user, password, host, port, dbname = match.groups()
        
        # Create pg_dump command
        env = os.environ.copy()
        env['PGPASSWORD'] = password
        
        cmd = [
            'pg_dump',
            '-h', host,
            '-p', port,
            '-U', user,
            '-d', dbname,
            '-f', str(backup_path),
            '--verbose',
            '--clean',
            '--if-exists'
        ]
        
        try:
            subprocess.run(cmd, env=env, check=True)
            print(f"PostgreSQL backup created: {backup_path}")
            return backup_path
        except subprocess.CalledProcessError as e:
            print(f"PostgreSQL backup failed: {e}")
            return None
            
    def export_data_json(self, app):
        """Export all data to JSON format."""
        export_path = self.backup_dir / f"falldetection_export_{self.timestamp}.json"
        
        with app.app_context():
            data = {
                'export_date': datetime.now().isoformat(),
                'users': [],
                'projects': [],
                'videos': [],
                'annotations': [],
                'temporal_annotations': [],
                'bounding_box_annotations': [],
                'project_members': [],
                'review_queue': [],
                'review_feedback': []
            }
            
            # Export users (excluding passwords)
            for user in User.query.all():
                data['users'].append({
                    'user_id': user.user_id,
                    'username': user.username,
                    'email': user.email,
                    'full_name': user.full_name,
                    'role': user.role.value,
                    'is_active': user.is_active,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'last_login': user.last_login.isoformat() if user.last_login else None
                })
            
            # Export projects
            for project in Project.query.all():
                data['projects'].append({
                    'project_id': project.project_id,
                    'name': project.name,
                    'description': project.description,
                    'created_by': project.created_by,
                    'created_at': project.created_at.isoformat() if project.created_at else None,
                    'status': project.status.value,
                    'annotation_schema': project.annotation_schema,
                    'normalization_settings': project.normalization_settings
                })
            
            # Export videos
            for video in Video.query.all():
                data['videos'].append({
                    'video_id': video.video_id,
                    'filename': video.filename,
                    'original_filename': video.original_filename,
                    'file_path': video.file_path,
                    'preview_path': video.preview_path,
                    'thumbnail_path': video.thumbnail_path,
                    'duration': video.duration,
                    'fps': video.fps,
                    'width': video.width,
                    'height': video.height,
                    'upload_date': video.upload_date.isoformat() if video.upload_date else None,
                    'project_id': video.project_id,
                    'assigned_to': video.assigned_to,
                    'status': video.status
                })
            
            # Export annotations
            for ann in Annotation.query.all():
                data['annotations'].append({
                    'annotation_id': ann.annotation_id,
                    'video_id': ann.video_id,
                    'created_by': ann.created_by,
                    'created_at': ann.created_at.isoformat() if ann.created_at else None,
                    'updated_at': ann.updated_at.isoformat() if ann.updated_at else None,
                    'is_completed': ann.is_completed,
                    'completed_at': ann.completed_at.isoformat() if ann.completed_at else None
                })
            
            # Export temporal annotations
            for temp_ann in TemporalAnnotation.query.all():
                data['temporal_annotations'].append({
                    'id': temp_ann.id,
                    'annotation_id': temp_ann.annotation_id,
                    'label': temp_ann.label,
                    'start_time': temp_ann.start_time,
                    'end_time': temp_ann.end_time,
                    'confidence': temp_ann.confidence,
                    'notes': temp_ann.notes
                })
            
            # Export bounding box annotations
            for bbox in BoundingBoxAnnotation.query.all():
                data['bounding_box_annotations'].append({
                    'id': bbox.id,
                    'annotation_id': bbox.annotation_id,
                    'frame_number': bbox.frame_number,
                    'x': bbox.x,
                    'y': bbox.y,
                    'width': bbox.width,
                    'height': bbox.height,
                    'label': bbox.label,
                    'confidence': bbox.confidence
                })
            
            # Export project members
            for member in ProjectMember.query.all():
                data['project_members'].append({
                    'id': member.id,
                    'project_id': member.project_id,
                    'user_id': member.user_id,
                    'role': member.role.value,
                    'joined_at': member.joined_at.isoformat() if member.joined_at else None
                })
            
            # Export review queue
            for review in ReviewQueue.query.all():
                data['review_queue'].append({
                    'id': review.id,
                    'video_id': review.video_id,
                    'annotation_id': review.annotation_id,
                    'reviewer_id': review.reviewer_id,
                    'status': review.status.value,
                    'assigned_at': review.assigned_at.isoformat() if review.assigned_at else None,
                    'completed_at': review.completed_at.isoformat() if review.completed_at else None,
                    'quality_score': review.quality_score
                })
            
            # Export review feedback
            for feedback in ReviewFeedback.query.all():
                data['review_feedback'].append({
                    'id': feedback.id,
                    'review_id': feedback.review_id,
                    'feedback_text': feedback.feedback_text,
                    'feedback_type': feedback.feedback_type,
                    'created_at': feedback.created_at.isoformat() if feedback.created_at else None
                })
            
            # Save to file
            with open(export_path, 'w') as f:
                json.dump(data, f, indent=2)
                
            print(f"Data export created: {export_path}")
            print(f"Exported {len(data['users'])} users, {len(data['projects'])} projects, "
                  f"{len(data['videos'])} videos, {len(data['annotations'])} annotations")
            
            return export_path
            
    def backup_uploads(self):
        """Backup uploaded video files."""
        upload_dir = Path("uploads")
        if not upload_dir.exists():
            print("No uploads directory found")
            return None
            
        backup_path = self.backup_dir / f"uploads_backup_{self.timestamp}.tar.gz"
        
        try:
            import tarfile
            with tarfile.open(backup_path, "w:gz") as tar:
                tar.add(upload_dir, arcname="uploads")
            print(f"Uploads backup created: {backup_path}")
            return backup_path
        except Exception as e:
            print(f"Uploads backup failed: {e}")
            return None
            
    def create_full_backup(self, app):
        """Create a complete backup of database and uploads."""
        print(f"\n=== Creating Full Backup - {self.timestamp} ===")
        
        # Determine database type and backup
        db_uri = app.config['SQLALCHEMY_DATABASE_URI']
        if db_uri.startswith('sqlite'):
            db_backup = self.backup_sqlite(app)
        elif db_uri.startswith('postgresql'):
            db_backup = self.backup_postgresql(app)
        else:
            print(f"Unsupported database type: {db_uri}")
            db_backup = None
            
        # Export data to JSON
        json_backup = self.export_data_json(app)
        
        # Backup uploads
        uploads_backup = self.backup_uploads()
        
        # Create backup manifest
        manifest = {
            'timestamp': self.timestamp,
            'created_at': datetime.now().isoformat(),
            'database_backup': str(db_backup) if db_backup else None,
            'json_export': str(json_backup) if json_backup else None,
            'uploads_backup': str(uploads_backup) if uploads_backup else None,
            'app_config': {
                'database_type': 'sqlite' if db_uri.startswith('sqlite') else 'postgresql',
                'flask_env': os.environ.get('FLASK_ENV', 'development')
            }
        }
        
        manifest_path = self.backup_dir / f"backup_manifest_{self.timestamp}.json"
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
            
        print(f"\nBackup manifest: {manifest_path}")
        print("=== Backup Complete ===\n")
        
        return manifest

def main():
    """Main backup function."""
    env = os.environ.get('FLASK_ENV', 'development')
    app = create_app(env)
    
    backup = DatabaseBackup()
    backup.create_full_backup(app)
    
    # List recent backups
    print("\nRecent backups:")
    backups = sorted(Path("backups").glob("backup_manifest_*.json"), reverse=True)[:5]
    for backup_file in backups:
        with open(backup_file) as f:
            manifest = json.load(f)
            print(f"  - {manifest['timestamp']} ({manifest['created_at']})")

if __name__ == '__main__':
    main()