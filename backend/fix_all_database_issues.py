#!/usr/bin/env python3
"""Fix all database issues - roles and missing columns"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from sqlalchemy import text

def fix_all_database_issues():
    """Fix role enums and add missing columns"""
    app = create_app()
    
    with app.app_context():
        try:
            print("=== FIXING DATABASE ISSUES ===\n")
            
            # 1. Fix role values
            print("1. Fixing user role values...")
            
            # First check current roles
            result = db.session.execute(text("SELECT user_id, username, role FROM users"))
            users = result.fetchall()
            print(f"   Found {len(users)} users")
            
            # Fix each incorrect role
            role_fixes = [
                ("UPDATE users SET role = 'ADMIN' WHERE role = 'admin'", 'admin → ADMIN'),
                ("UPDATE users SET role = 'ANNOTATOR' WHERE role = 'annotator'", 'annotator → ANNOTATOR'),
                ("UPDATE users SET role = 'REVIEWER' WHERE role = 'reviewer'", 'reviewer → REVIEWER'),
            ]
            
            for query, description in role_fixes:
                result = db.session.execute(text(query))
                if result.rowcount > 0:
                    print(f"   ✓ Fixed {result.rowcount} users: {description}")
            
            db.session.commit()
            
            # 2. Add missing columns to videos table
            print("\n2. Adding missing columns to videos table...")
            
            # Check current columns
            result = db.session.execute(text("PRAGMA table_info(videos)"))
            columns = [row[1] for row in result]
            print(f"   Current columns: {', '.join(columns)}")
            
            # Add missing columns
            missing_columns = [
                ('project_id', 'ALTER TABLE videos ADD COLUMN project_id INTEGER'),
                ('assigned_to', 'ALTER TABLE videos ADD COLUMN assigned_to INTEGER'),
                ('is_completed', 'ALTER TABLE videos ADD COLUMN is_completed BOOLEAN DEFAULT 0')
            ]
            
            for col_name, query in missing_columns:
                if col_name not in columns:
                    db.session.execute(text(query))
                    print(f"   ✓ Added {col_name} column")
                else:
                    print(f"   ✓ {col_name} column already exists")
            
            db.session.commit()
            
            # 3. Assign videos to demo project
            print("\n3. Assigning unassigned videos to demo project...")
            
            from app.models import Project
            demo_project = Project.query.filter_by(name='Demo Fall Detection Project').first()
            
            if demo_project:
                result = db.session.execute(
                    text("UPDATE videos SET project_id = :pid WHERE project_id IS NULL"),
                    {"pid": demo_project.project_id}
                )
                if result.rowcount > 0:
                    print(f"   ✓ Assigned {result.rowcount} videos to demo project")
                    
                    # Update project video count
                    video_count = db.session.execute(
                        text("SELECT COUNT(*) FROM videos WHERE project_id = :pid"),
                        {"pid": demo_project.project_id}
                    ).scalar()
                    
                    db.session.execute(
                        text("UPDATE projects SET total_videos = :count WHERE project_id = :pid"),
                        {"count": video_count, "pid": demo_project.project_id}
                    )
                    print(f"   ✓ Updated project video count to {video_count}")
                else:
                    print("   ✓ No unassigned videos found")
            else:
                print("   ! Demo project not found")
            
            db.session.commit()
            
            # 4. Create review tables if they don't exist
            print("\n4. Creating review tables if needed...")
            
            # Check if review_queue table exists
            result = db.session.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='review_queue'"
            ))
            if not result.fetchone():
                print("   Creating review tables...")
                # Import models to ensure they're registered
                from app.models import ReviewQueue, ReviewFeedback
                
                # Create all tables (this will only create missing ones)
                db.create_all()
                print("   ✓ Review tables created")
            else:
                print("   ✓ Review tables already exist")
            
            db.session.commit()
            
            # 5. Verify everything works
            print("\n5. Verifying fixes...")
            
            # Check roles
            result = db.session.execute(text("SELECT DISTINCT role FROM users"))
            roles = [row[0] for row in result]
            print(f"   Distinct roles in database: {roles}")
            
            # Check if we can load users through SQLAlchemy
            try:
                from app.models import User
                users = User.query.all()
                print(f"   ✓ Successfully loaded {len(users)} users through SQLAlchemy")
            except Exception as e:
                print(f"   ✗ Error loading users: {str(e)}")
            
            print("\n=== DATABASE FIXES COMPLETE ===")
            
        except Exception as e:
            print(f"\n✗ Error: {str(e)}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    fix_all_database_issues()