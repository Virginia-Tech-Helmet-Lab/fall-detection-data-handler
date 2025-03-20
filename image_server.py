from flask import Flask, Response, send_file
import cv2
import numpy as np
import os
import sys
import logging
from flask_limiter import Limiter

# Create a dedicated image server with absolutely minimal configuration
img_app = Flask(__name__)

# Path to your videos - adjust if needed
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
THUMBNAIL_CACHE = os.path.join(UPLOAD_FOLDER, 'thumbnails')

# Ensure directories exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(THUMBNAIL_CACHE, exist_ok=True)

# Add proper error handling and logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('image_server')

# Add rate limiting
limiter = Limiter(img_app)

# Get port from environment or use default
PORT = int(os.environ.get('IMAGE_SERVER_PORT', 5002))

# Get host from environment or use default
HOST = os.environ.get('IMAGE_SERVER_HOST', '127.0.0.1')

def extract_video_frame(video_filename, frame_number):
    """Extract a frame from a video and save it as a JPEG"""
    from urllib.parse import unquote
    
    # Decode URL-encoded filename
    video_filename = unquote(video_filename)
    
    # Build paths
    video_path = os.path.join(UPLOAD_FOLDER, video_filename)
    thumbnail_filename = f"{os.path.splitext(video_filename)[0]}_frame_{frame_number}.jpg"
    thumbnail_path = os.path.join(THUMBNAIL_CACHE, thumbnail_filename)
    
    # Check if thumbnail already exists
    if os.path.exists(thumbnail_path):
        print(f">>> Using cached thumbnail: {thumbnail_path}", file=sys.stderr)
        return thumbnail_path
    
    # Check if video exists
    if not os.path.exists(video_path):
        print(f">>> Video not found: {video_path}", file=sys.stderr)
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
    print(f"Starting image server on {HOST}:{PORT}")
    img_app.run(host=HOST, port=PORT, debug=False)
