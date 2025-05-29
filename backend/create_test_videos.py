#!/usr/bin/env python3
"""
Create test videos for the Fall Detection Data Handler demo project
This creates simple placeholder videos for testing the system
"""

import cv2
import numpy as np
import os
from datetime import datetime
import sys

def create_test_video(filename, duration=10, fps=30, width=640, height=480, text="Test Video"):
    """
    Create a simple test video with text overlay
    
    Args:
        filename: Output filename
        duration: Duration in seconds
        fps: Frames per second
        width: Video width
        height: Video height
        text: Text to display on video
    """
    # Create video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(filename, fourcc, fps, (width, height))
    
    total_frames = int(duration * fps)
    
    for frame_num in range(total_frames):
        # Create a frame with gradient background
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Add gradient effect
        for y in range(height):
            color_val = int(255 * (y / height))
            frame[y, :] = [color_val, 100, 255 - color_val]
        
        # Add timestamp
        timestamp = frame_num / fps
        time_text = f"{timestamp:.1f}s"
        
        # Add main text
        font = cv2.FONT_HERSHEY_SIMPLEX
        cv2.putText(frame, text, (50, height//2 - 50), font, 1.5, (255, 255, 255), 3)
        cv2.putText(frame, time_text, (50, height//2 + 50), font, 1, (255, 255, 255), 2)
        cv2.putText(frame, f"Frame {frame_num}/{total_frames}", (50, height - 50), font, 0.5, (255, 255, 255), 1)
        
        # Simulate movement - moving circle
        circle_x = int(width * (0.2 + 0.6 * (frame_num / total_frames)))
        circle_y = int(height * (0.5 + 0.3 * np.sin(2 * np.pi * frame_num / fps)))
        cv2.circle(frame, (circle_x, circle_y), 30, (0, 255, 0), -1)
        
        out.write(frame)
    
    out.release()
    print(f"Created: {filename}")

def main():
    # Create uploads directory if it doesn't exist
    upload_dir = "uploads"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
    
    # Test videos to create
    test_videos = [
        {
            "filename": "test_fall_video_1.mp4",
            "text": "Fall Event Test 1",
            "duration": 15
        },
        {
            "filename": "test_fall_video_2.mp4", 
            "text": "Fall Event Test 2",
            "duration": 20
        },
        {
            "filename": "test_normal_activity_1.mp4",
            "text": "Normal Activity 1",
            "duration": 12
        },
        {
            "filename": "test_near_fall_1.mp4",
            "text": "Near Fall Test",
            "duration": 18
        },
        {
            "filename": "test_multiple_falls.mp4",
            "text": "Multiple Falls",
            "duration": 30
        }
    ]
    
    print("Creating test videos for Fall Detection Data Handler")
    print("=" * 60)
    
    for video_info in test_videos:
        filepath = os.path.join(upload_dir, video_info["filename"])
        create_test_video(
            filepath,
            duration=video_info["duration"],
            text=video_info["text"]
        )
    
    print("\n" + "=" * 60)
    print("Test videos created successfully!")
    print("\nNext steps:")
    print("1. Start the backend server: cd backend && python run.py")
    print("2. Start the frontend: cd frontend && npm start")
    print("3. Login as admin")
    print("4. Go to Import Data and upload these test videos")
    print("5. The videos will be automatically assigned to the Demo Project")
    
    # Also create a script to add these videos to the database directly
    print("\nAlternatively, run add_test_videos_to_db.py to add them directly to the database")

if __name__ == "__main__":
    main()