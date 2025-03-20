from flask import Flask, Response, send_file, jsonify
import cv2
import numpy as np
import os
import sys
import logging
import time
from flask_limiter import Limiter
import argparse
import threading
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Add command-line arguments
parser = argparse.ArgumentParser(description='Image server for video frame extraction')
parser.add_argument('--upload-dir', type=str, default=os.path.join(os.getcwd(), 'uploads'),
                   help='Path to the uploads directory containing videos')
parser.add_argument('--port', type=int, default=5002,
                   help='Port to run the server on')
parser.add_argument('--host', type=str, default='127.0.0.1',
                   help='Host to run the server on')
parser.add_argument('--backend-dir', type=str, default=None,
                   help='Path to the backend directory')

args = parser.parse_args()

# Use the arguments
UPLOAD_FOLDER = args.upload_dir
THUMBNAIL_CACHE = os.path.join(UPLOAD_FOLDER, 'thumbnails')
PORT = args.port
HOST = args.host
BACKEND_DIR = args.backend_dir or os.path.join(os.getcwd(), 'backend')

# Create a dedicated image server with absolutely minimal configuration
img_app = Flask(__name__)

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(THUMBNAIL_CACHE, exist_ok=True)

# Add proper error handling and logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('image_server')

# Add rate limiting
limiter = Limiter(img_app)

# Keep track of available videos
available_videos = set()

# Create a video watcher class
class VideoDirectoryWatcher(FileSystemEventHandler):
    def __init__(self, directories_to_watch):
        self.directories = directories_to_watch
        self.video_extensions = {'.mp4', '.avi', '.mov', '.wmv', '.mkv'}
        self.refresh_videos()
        
    def refresh_videos(self):
        """Scan all directories and update the available videos set"""
        global available_videos
        new_videos = set()
        
        for directory in self.directories:
            if os.path.exists(directory):
                logger.info(f"Scanning directory: {directory}")
                for filename in os.listdir(directory):
                    if any(filename.lower().endswith(ext) for ext in self.video_extensions):
                        full_path = os.path.join(directory, filename)
                        new_videos.add(filename)
                        if filename not in available_videos:
                            logger.info(f"New video found: {filename} at {full_path}")
        
        # Update the available videos
        available_videos = new_videos
        logger.info(f"Video library refreshed. {len(available_videos)} videos available.")
    
    def on_created(self, event):
        if not event.is_directory and any(event.src_path.lower().endswith(ext) for ext in self.video_extensions):
            logger.info(f"New video file detected: {event.src_path}")
            self.refresh_videos()
    
    def on_deleted(self, event):
        if not event.is_directory and any(event.src_path.lower().endswith(ext) for ext in self.video_extensions):
            logger.info(f"Video file removed: {event.src_path}")
            self.refresh_videos()

def extract_video_frame(video_filename, frame_number):
    """Extract a frame from a video and save it as a JPEG"""
    from urllib.parse import unquote
    
    # Decode URL-encoded filename
    video_filename = unquote(video_filename)
    
    # Build paths - try multiple potential locations
    search_locations = [
        os.path.join(UPLOAD_FOLDER, video_filename),
        os.path.join(UPLOAD_FOLDER, os.path.basename(video_filename)),
        os.path.join(BACKEND_DIR, 'uploads', video_filename),
        os.path.join(BACKEND_DIR, 'uploads', os.path.basename(video_filename)),
        os.path.join(os.getcwd(), 'backend', 'uploads', video_filename),
        os.path.join(os.path.dirname(os.getcwd()), 'backend', 'uploads', video_filename),
        os.path.join(UPLOAD_FOLDER, 'processed', video_filename)
    ]
    
    # Build thumbnail path
    thumbnail_filename = f"{os.path.splitext(video_filename)[0]}_frame_{frame_number}.jpg"
    thumbnail_path = os.path.join(THUMBNAIL_CACHE, thumbnail_filename)
    
    # Check if thumbnail already exists
    if os.path.exists(thumbnail_path):
        print(f">>> Using cached thumbnail: {thumbnail_path}", file=sys.stderr)
        return thumbnail_path
    
    # Try to find the video in multiple locations
    video_path = None
    for location in search_locations:
        if os.path.exists(location):
            video_path = location
            print(f">>> Found video at: {video_path}", file=sys.stderr)
            break
    
    # If video not found in any location
    if not video_path:
        logger.error(f"Video not found in any search location: {video_filename}")
        logger.info(f"Tried locations: {search_locations}")
        logger.info(f"Current working directory: {os.getcwd()}")
        logger.info(f"Files in upload directory: {os.listdir(UPLOAD_FOLDER)}")
        logger.info(f"Available videos: {available_videos}")
        return None
    
    try:
        # Extract frame using OpenCV
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Check if frame number is valid
        if frame_number < 0 or frame_number >= total_frames:
            print(f">>> Invalid frame number {frame_number}, video has {total_frames} frames", 
                  file=sys.stderr)
            return None
        
        # Seek to the frame
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        success, frame = cap.read()
        cap.release()
        
        if not success:
            print(f">>> Failed to extract frame {frame_number}", file=sys.stderr)
            return None
        
        # Save the frame
        cv2.imwrite(thumbnail_path, frame)
        print(f">>> Saved thumbnail: {thumbnail_path}", file=sys.stderr)
        return thumbnail_path
    
    except Exception as e:
        print(f">>> Error extracting frame: {str(e)}", file=sys.stderr)
        return None

# Add an endpoint to manually refresh videos
@img_app.route('/refresh-videos', methods=['GET'])
def refresh_videos_endpoint():
    """Force a refresh of the video library"""
    try:
        video_watcher.refresh_videos()
        return jsonify({
            'status': 'success',
            'message': f'Video library refreshed. {len(available_videos)} videos available.',
            'videos': list(available_videos)
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error refreshing videos: {str(e)}'
        }), 500

@img_app.route('/images/<path:video_filename>/<int:frame_number>', methods=['GET'])
@limiter.limit("60 per minute")
def serve_frame(video_filename, frame_number):
    """Serve video frames with zero middleware"""
    try:
        print(f">>> Image server: Request for {video_filename}, frame {frame_number}", 
              file=sys.stderr)
        
        # Extract the frame
        thumbnail_path = extract_video_frame(video_filename, frame_number)
        
        if thumbnail_path and os.path.exists(thumbnail_path):
            print(f">>> Image server: Sending file {thumbnail_path}", file=sys.stderr)
            
            # Read the image directly to bytes
            with open(thumbnail_path, 'rb') as f:
                img_data = f.read()
            
            # Send the raw bytes
            return Response(
                img_data,
                mimetype='image/jpeg',
                headers={
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            )
        else:
            # Create a simple error image
            img = np.zeros((120, 160, 3), dtype=np.uint8)
            img[:, :, 0] = 255  # Red background
            
            # Add error text
            cv2.putText(img, f"Frame {frame_number}", (30, 40), 
                      cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            cv2.putText(img, "Error", (60, 70), 
                      cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # Convert to JPEG bytes
            _, buffer = cv2.imencode('.jpg', img)
            img_bytes = buffer.tobytes()
            
            return Response(
                img_bytes,
                mimetype='image/jpeg',
                headers={
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache'
                }
            )
    
    except Exception as e:
        print(f">>> Image server error: {str(e)}", file=sys.stderr)
        
        # Create an error image instead of returning text
        img = np.zeros((120, 160, 3), dtype=np.uint8)
        img[:, :, 0] = 200  # Blue
        img[:, :, 2] = 200  # Red
        
        # Add error text
        cv2.putText(img, "Error", (60, 50), 
                  cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)
        cv2.putText(img, str(e)[:10], (40, 80), 
                  cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        
        # Convert to JPEG bytes
        _, buffer = cv2.imencode('.jpg', img)
        img_bytes = buffer.tobytes()
        
        return Response(
            img_bytes,
            mimetype='image/jpeg',
            headers={
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            }
        )

# Add a test endpoint
@img_app.route('/test', methods=['GET'])
def test_image():
    """Simple test endpoint that always returns a valid image"""
    # Create a test image
    img = np.zeros((120, 160, 3), dtype=np.uint8)
    img[:, :, 1] = 255  # Green
    cv2.putText(img, "TEST", (60, 60), 
              cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
    
    # Convert to JPEG bytes
    _, buffer = cv2.imencode('.jpg', img)
    img_bytes = buffer.tobytes()
    
    return Response(
        img_bytes,
        mimetype='image/jpeg',
        headers={
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
        }
    )

if __name__ == '__main__':
    # Directories to monitor
    directories_to_watch = [
        UPLOAD_FOLDER,
        os.path.join(BACKEND_DIR, 'uploads'),
        os.path.join(os.getcwd(), 'backend', 'uploads'),
    ]
    
    # Initialize video watcher
    video_watcher = VideoDirectoryWatcher(directories_to_watch)
    
    # Set up watchdog observers for all directories
    observers = []
    for directory in directories_to_watch:
        if os.path.exists(directory):
            observer = Observer()
            observer.schedule(video_watcher, directory, recursive=False)
            observer.start()
            observers.append(observer)
            logger.info(f"Started watching directory: {directory}")
    
    try:
        print(f"Starting image server on {HOST}:{PORT}")
        print(f"Monitoring {len(observers)} video directories")
        img_app.run(host=HOST, port=PORT, debug=False)
    except KeyboardInterrupt:
        # Stop all observers on exit
        for observer in observers:
            observer.stop()
    
    # Wait for all observer threads to finish
    for observer in observers:
        observer.join()
