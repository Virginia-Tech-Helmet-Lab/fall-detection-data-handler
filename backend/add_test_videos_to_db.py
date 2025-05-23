#!/usr/bin/env python3
"""
Add test videos directly to the database for the demo project
Run this after create_test_videos.py
"""

import os
import sys
from datetime import datetime

# Add the app directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.database import db
from app.models import Video, Project, TemporalAnnotation, User
from app.utils.video_processing import extract_metadata

def add_test_videos():
    """Add test videos to the demo project"""
    app = create_app()
    
    with app.app_context():
        # Find the demo project
        demo_project = Project.query.filter_by(name='Demo Fall Detection Project').first()
        if not demo_project:
            print("❌ Demo project not found! Please restart the backend to create it.")
            return
        
        print(f"✅ Found demo project: {demo_project.name}")
        
        # Find admin user for annotations
        admin_user = User.query.filter_by(username='admin').first()
        if not admin_user:
            print("❌ Admin user not found!")
            return
        
        # Test videos info
        test_videos = [
            {
                "filename": "test_fall_video_1.mp4",
                "annotations": [
                    {"start": 5.0, "end": 7.0, "label": "fall"}
                ]
            },
            {
                "filename": "test_fall_video_2.mp4",
                "annotations": [
                    {"start": 8.0, "end": 10.0, "label": "fall"},
                    {"start": 15.0, "end": 17.0, "label": "fall"}
                ]
            },
            {
                "filename": "test_normal_activity_1.mp4",
                "annotations": []  # No falls
            },
            {
                "filename": "test_near_fall_1.mp4",
                "annotations": [
                    {"start": 10.0, "end": 12.0, "label": "near-fall"}
                ]
            },
            {
                "filename": "test_multiple_falls.mp4",
                "annotations": [
                    {"start": 5.0, "end": 7.0, "label": "fall"},
                    {"start": 12.0, "end": 14.0, "label": "fall"},
                    {"start": 20.0, "end": 22.0, "label": "fall"}
                ]
            }
        ]
        
        upload_dir = "uploads"
        videos_added = 0
        annotations_added = 0
        
        for video_info in test_videos:
            filepath = os.path.join(upload_dir, video_info["filename"])
            
            # Check if video already exists
            existing_video = Video.query.filter_by(filename=video_info["filename"]).first()
            if existing_video:
                print(f"⚠️  Video already exists: {video_info['filename']}")
                video = existing_video
            else:
                # Extract metadata
                if os.path.exists(filepath):
                    try:
                        metadata = extract_metadata(filepath)
                    except:
                        metadata = {
                            'resolution': '640x480',
                            'framerate': 30.0,
                            'duration': 10.0
                        }
                else:
                    # Use default metadata if file doesn't exist
                    metadata = {
                        'resolution': '640x480',
                        'framerate': 30.0,
                        'duration': video_info.get('duration', 10.0)
                    }
                
                # Create video entry
                video = Video(
                    filename=video_info["filename"],
                    resolution=metadata.get('resolution', '640x480'),
                    framerate=metadata.get('framerate', 30.0),
                    duration=metadata.get('duration', 10.0),
                    project_id=demo_project.project_id,
                    status='pending'
                )
                db.session.add(video)
                db.session.flush()  # Get video ID
                videos_added += 1
                print(f"✅ Added video: {video_info['filename']}")
            
            # Add annotations
            for ann in video_info["annotations"]:
                # Check if annotation already exists
                existing_ann = TemporalAnnotation.query.filter_by(
                    video_id=video.video_id,
                    start_time=ann["start"],
                    end_time=ann["end"]
                ).first()
                
                if not existing_ann:
                    annotation = TemporalAnnotation(
                        video_id=video.video_id,
                        start_time=ann["start"],
                        end_time=ann["end"],
                        start_frame=int(ann["start"] * 30),  # Assuming 30 fps
                        end_frame=int(ann["end"] * 30),
                        label=ann["label"],
                        created_by=admin_user.user_id,
                        created_at=datetime.utcnow()
                    )
                    db.session.add(annotation)
                    annotations_added += 1
                    print(f"  → Added {ann['label']} annotation: {ann['start']}s - {ann['end']}s")
        
        # Update project statistics
        demo_project.total_videos = Video.query.filter_by(project_id=demo_project.project_id).count()
        demo_project.last_activity = datetime.utcnow()
        
        # Commit all changes
        db.session.commit()
        
        print("\n" + "=" * 60)
        print(f"✅ Successfully added {videos_added} videos and {annotations_added} annotations")
        print(f"📊 Demo project now has {demo_project.total_videos} total videos")
        print("\nYou can now:")
        print("1. Login to the web interface")
        print("2. Navigate to the Labeling interface to see the videos")
        print("3. View and edit the annotations")
        print("4. Test the review functionality")

if __name__ == "__main__":
    add_test_videos()