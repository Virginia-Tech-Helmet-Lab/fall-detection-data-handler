#!/usr/bin/env python3
"""Add missing columns to videos table for multi-user support"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from sqlalchemy import text

def add_missing_columns():
    """Add project_id and assigned_to columns to videos table"""
    app = create_app()
    
    with app.app_context():
        try:
            print("Adding missing columns to videos table...")
            
            # Check if columns already exist
            result = db.session.execute(text("PRAGMA table_info(videos)"))
            columns = [row[1] for row in result]
            print(f"Current columns in videos table: {columns}")
            
            # Add project_id column if it doesn't exist
            if 'project_id' not in columns:
                print("Adding project_id column...")
                db.session.execute(text("ALTER TABLE videos ADD COLUMN project_id INTEGER"))
                print("✓ Added project_id column")
            else:
                print("✓ project_id column already exists")
            
            # Add assigned_to column if it doesn't exist
            if 'assigned_to' not in columns:
                print("Adding assigned_to column...")
                db.session.execute(text("ALTER TABLE videos ADD COLUMN assigned_to INTEGER"))
                print("✓ Added assigned_to column")
            else:
                print("✓ assigned_to column already exists")
            
            # Add is_completed column if it doesn't exist
            if 'is_completed' not in columns:
                print("Adding is_completed column...")
                db.session.execute(text("ALTER TABLE videos ADD COLUMN is_completed BOOLEAN DEFAULT 0"))
                print("✓ Added is_completed column")
            else:
                print("✓ is_completed column already exists")
                
            # Commit the changes
            db.session.commit()
            print("\nDatabase schema updated successfully!")
            
            # Verify the changes
            result = db.session.execute(text("PRAGMA table_info(videos)"))
            columns = [row[1] for row in result]
            print(f"\nUpdated columns in videos table: {columns}")
            
            # Assign all existing videos to the demo project if it exists
            print("\nChecking for existing videos to assign to demo project...")
            from app.models import Project, Video
            
            demo_project = Project.query.filter_by(name='Demo Fall Detection Project').first()
            if demo_project:
                # Update videos without a project
                result = db.session.execute(
                    text("UPDATE videos SET project_id = :project_id WHERE project_id IS NULL"),
                    {"project_id": demo_project.project_id}
                )
                if result.rowcount > 0:
                    print(f"✓ Assigned {result.rowcount} videos to demo project")
                    
                    # Update project video count
                    video_count = Video.query.filter_by(project_id=demo_project.project_id).count()
                    demo_project.total_videos = video_count
                    db.session.commit()
                    print(f"✓ Updated demo project video count to {video_count}")
                else:
                    print("✓ No unassigned videos found")
            else:
                print("! Demo project not found")
                
            print("\nMigration completed successfully!")
            
        except Exception as e:
            print(f"Error: {str(e)}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    add_missing_columns()