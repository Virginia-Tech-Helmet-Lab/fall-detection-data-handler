#!/usr/bin/env python
"""Database restore script for Fall Detection Data Handler."""

import os
import sys
import json
import shutil
import subprocess
import tarfile
from datetime import datetime
from pathlib import Path
from app import create_app
from app.database import db
from app.models import (
    User, Project, Video, Annotation, TemporalAnnotation,
    BoundingBoxAnnotation, ProjectMember, ReviewQueue, ReviewFeedback,
    UserRole, ProjectStatus, ProjectMemberRole, ReviewStatus
)

class DatabaseRestore:
    def __init__(self):
        self.backup_dir = Path("backups")
        
    def list_backups(self):
        """List available backups."""
        manifests = sorted(self.backup_dir.glob("backup_manifest_*.json"), reverse=True)
        backups = []
        
        for manifest_path in manifests:
            with open(manifest_path) as f:
                manifest = json.load(f)
                backups.append({
                    'path': manifest_path,
                    'timestamp': manifest['timestamp'],
                    'created_at': manifest['created_at'],
                    'has_db': manifest.get('database_backup') is not None,
                    'has_json': manifest.get('json_export') is not None,
                    'has_uploads': manifest.get('uploads_backup') is not None
                })
                
        return backups
        
    def restore_sqlite(self, backup_path, app):
        """Restore SQLite database."""
        if not os.path.exists(backup_path):
            print(f"Backup file not found: {backup_path}")
            return False
            
        db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
        
        # Create backup of current database
        if os.path.exists(db_path):
            shutil.copy2(db_path, f"{db_path}.before_restore")
            
        # Restore database
        shutil.copy2(backup_path, db_path)
        print(f"SQLite database restored from: {backup_path}")
        return True
        
    def restore_postgresql(self, backup_path, app):
        """Restore PostgreSQL database."""
        if not os.path.exists(backup_path):
            print(f"Backup file not found: {backup_path}")
            return False
            
        db_uri = app.config['SQLALCHEMY_DATABASE_URI']
        
        # Extract connection details
        import re
        match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', db_uri)
        if not match:
            print("Invalid PostgreSQL URI")
            return False
            
        user, password, host, port, dbname = match.groups()
        
        # Create psql command
        env = os.environ.copy()
        env['PGPASSWORD'] = password
        
        cmd = [
            'psql',
            '-h', host,
            '-p', port,
            '-U', user,
            '-d', dbname,
            '-f', backup_path
        ]
        
        try:
            subprocess.run(cmd, env=env, check=True)
            print(f"PostgreSQL database restored from: {backup_path}")
            return True
        except subprocess.CalledProcessError as e:
            print(f"PostgreSQL restore failed: {e}")
            return False
            
    def restore_from_json(self, json_path, app):
        """Restore data from JSON export."""
        if not os.path.exists(json_path):
            print(f"JSON export not found: {json_path}")
            return False
            
        with open(json_path) as f:
            data = json.load(f)
            
        with app.app_context():
            try:
                # Clear existing data (be careful!)
                print("Clearing existing data...")
                db.session.query(ReviewFeedback).delete()
                db.session.query(ReviewQueue).delete()
                db.session.query(BoundingBoxAnnotation).delete()
                db.session.query(TemporalAnnotation).delete()
                db.session.query(Annotation).delete()
                db.session.query(Video).delete()
                db.session.query(ProjectMember).delete()
                db.session.query(Project).delete()
                db.session.query(User).delete()
                db.session.commit()
                
                # Restore users
                print(f"Restoring {len(data['users'])} users...")
                user_map = {}
                for user_data in data['users']:
                    user = User(
                        username=user_data['username'],
                        email=user_data['email'],
                        full_name=user_data['full_name'],
                        role=UserRole(user_data['role']),
                        is_active=user_data['is_active']
                    )
                    # Set a temporary password - users will need to reset
                    user.set_password('TempPassword123!')
                    db.session.add(user)
                    db.session.flush()
                    user_map[user_data['user_id']] = user.user_id
                    
                # Restore projects
                print(f"Restoring {len(data['projects'])} projects...")
                project_map = {}
                for proj_data in data['projects']:
                    project = Project(
                        name=proj_data['name'],
                        description=proj_data['description'],
                        created_by=user_map.get(proj_data['created_by']),
                        status=ProjectStatus(proj_data['status']),
                        annotation_schema=proj_data['annotation_schema'],
                        normalization_settings=proj_data['normalization_settings']
                    )
                    db.session.add(project)
                    db.session.flush()
                    project_map[proj_data['project_id']] = project.project_id
                    
                # Restore videos
                print(f"Restoring {len(data['videos'])} videos...")
                video_map = {}
                for video_data in data['videos']:
                    video = Video(
                        filename=video_data['filename'],
                        original_filename=video_data['original_filename'],
                        file_path=video_data['file_path'],
                        preview_path=video_data['preview_path'],
                        thumbnail_path=video_data['thumbnail_path'],
                        duration=video_data['duration'],
                        fps=video_data['fps'],
                        width=video_data['width'],
                        height=video_data['height'],
                        project_id=project_map.get(video_data['project_id']),
                        assigned_to=user_map.get(video_data['assigned_to']),
                        status=video_data['status']
                    )
                    db.session.add(video)
                    db.session.flush()
                    video_map[video_data['video_id']] = video.video_id
                    
                # Restore annotations
                print(f"Restoring {len(data['annotations'])} annotations...")
                annotation_map = {}
                for ann_data in data['annotations']:
                    annotation = Annotation(
                        video_id=video_map.get(ann_data['video_id']),
                        created_by=user_map.get(ann_data['created_by']),
                        is_completed=ann_data['is_completed']
                    )
                    if ann_data.get('completed_at'):
                        annotation.completed_at = datetime.fromisoformat(ann_data['completed_at'])
                    db.session.add(annotation)
                    db.session.flush()
                    annotation_map[ann_data['annotation_id']] = annotation.annotation_id
                    
                # Restore temporal annotations
                print(f"Restoring {len(data['temporal_annotations'])} temporal annotations...")
                for temp_data in data['temporal_annotations']:
                    temp_ann = TemporalAnnotation(
                        annotation_id=annotation_map.get(temp_data['annotation_id']),
                        label=temp_data['label'],
                        start_time=temp_data['start_time'],
                        end_time=temp_data['end_time'],
                        confidence=temp_data['confidence'],
                        notes=temp_data['notes']
                    )
                    db.session.add(temp_ann)
                    
                # Restore bounding box annotations
                print(f"Restoring {len(data['bounding_box_annotations'])} bounding box annotations...")
                for bbox_data in data['bounding_box_annotations']:
                    bbox = BoundingBoxAnnotation(
                        annotation_id=annotation_map.get(bbox_data['annotation_id']),
                        frame_number=bbox_data['frame_number'],
                        x=bbox_data['x'],
                        y=bbox_data['y'],
                        width=bbox_data['width'],
                        height=bbox_data['height'],
                        label=bbox_data['label'],
                        confidence=bbox_data['confidence']
                    )
                    db.session.add(bbox)
                    
                # Restore project members
                print(f"Restoring {len(data['project_members'])} project members...")
                for member_data in data['project_members']:
                    member = ProjectMember(
                        project_id=project_map.get(member_data['project_id']),
                        user_id=user_map.get(member_data['user_id']),
                        role=ProjectMemberRole(member_data['role'])
                    )
                    db.session.add(member)
                    
                # Restore review queue
                print(f"Restoring {len(data['review_queue'])} review items...")
                review_map = {}
                for review_data in data['review_queue']:
                    review = ReviewQueue(
                        video_id=video_map.get(review_data['video_id']),
                        annotation_id=annotation_map.get(review_data['annotation_id']),
                        reviewer_id=user_map.get(review_data['reviewer_id']),
                        status=ReviewStatus(review_data['status']),
                        quality_score=review_data['quality_score']
                    )
                    db.session.add(review)
                    db.session.flush()
                    review_map[review_data['id']] = review.id
                    
                # Restore review feedback
                print(f"Restoring {len(data['review_feedback'])} feedback items...")
                for feedback_data in data['review_feedback']:
                    feedback = ReviewFeedback(
                        review_id=review_map.get(feedback_data['review_id']),
                        feedback_text=feedback_data['feedback_text'],
                        feedback_type=feedback_data['feedback_type']
                    )
                    db.session.add(feedback)
                    
                db.session.commit()
                print("Data restoration complete!")
                return True
                
            except Exception as e:
                db.session.rollback()
                print(f"Restoration failed: {e}")
                import traceback
                traceback.print_exc()
                return False
                
    def restore_uploads(self, backup_path):
        """Restore uploaded files."""
        if not os.path.exists(backup_path):
            print(f"Uploads backup not found: {backup_path}")
            return False
            
        # Backup current uploads
        if os.path.exists("uploads"):
            shutil.move("uploads", f"uploads.before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
            
        # Extract uploads
        try:
            with tarfile.open(backup_path, "r:gz") as tar:
                tar.extractall(".")
            print(f"Uploads restored from: {backup_path}")
            return True
        except Exception as e:
            print(f"Uploads restoration failed: {e}")
            return False
            
    def restore_from_manifest(self, manifest_path, app, restore_uploads=True):
        """Restore from a backup manifest."""
        with open(manifest_path) as f:
            manifest = json.load(f)
            
        print(f"\n=== Restoring from backup {manifest['timestamp']} ===")
        print(f"Created at: {manifest['created_at']}")
        
        success = True
        
        # Restore database
        if manifest.get('database_backup'):
            db_backup = Path(manifest['database_backup'])
            if db_backup.exists():
                db_uri = app.config['SQLALCHEMY_DATABASE_URI']
                if db_uri.startswith('sqlite'):
                    success &= self.restore_sqlite(db_backup, app)
                elif db_uri.startswith('postgresql'):
                    success &= self.restore_postgresql(db_backup, app)
            else:
                print(f"Database backup file not found: {db_backup}")
                # Try JSON restore as fallback
                if manifest.get('json_export'):
                    json_path = Path(manifest['json_export'])
                    if json_path.exists():
                        print("Attempting restore from JSON export...")
                        success &= self.restore_from_json(json_path, app)
                        
        # Restore uploads
        if restore_uploads and manifest.get('uploads_backup'):
            uploads_backup = Path(manifest['uploads_backup'])
            if uploads_backup.exists():
                success &= self.restore_uploads(uploads_backup)
                
        print("=== Restoration Complete ===\n")
        return success

def main():
    """Main restore function."""
    restore = DatabaseRestore()
    
    # List available backups
    backups = restore.list_backups()
    if not backups:
        print("No backups found!")
        return
        
    print("\nAvailable backups:")
    for i, backup in enumerate(backups):
        features = []
        if backup['has_db']: features.append("DB")
        if backup['has_json']: features.append("JSON")
        if backup['has_uploads']: features.append("Uploads")
        print(f"{i+1}. {backup['timestamp']} - {backup['created_at']} [{', '.join(features)}]")
        
    # Get user selection
    try:
        choice = int(input("\nSelect backup to restore (number): ")) - 1
        if choice < 0 or choice >= len(backups):
            print("Invalid selection")
            return
    except ValueError:
        print("Invalid input")
        return
        
    selected_backup = backups[choice]
    
    # Confirm restoration
    print(f"\nYou selected: {selected_backup['timestamp']}")
    print("WARNING: This will replace your current database!")
    confirm = input("Are you sure? (yes/no): ").lower()
    
    if confirm != 'yes':
        print("Restoration cancelled")
        return
        
    # Ask about uploads
    restore_uploads = True
    if selected_backup['has_uploads']:
        restore_uploads = input("Restore uploaded files too? (yes/no): ").lower() == 'yes'
        
    # Perform restoration
    env = os.environ.get('FLASK_ENV', 'development')
    app = create_app(env)
    
    restore.restore_from_manifest(selected_backup['path'], app, restore_uploads)

if __name__ == '__main__':
    main()