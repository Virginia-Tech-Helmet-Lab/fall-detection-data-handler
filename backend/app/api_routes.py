from flask import Blueprint, request, jsonify, current_app, send_from_directory, Response, send_file
from .services.normalization import normalize_video, generate_preview
from .services.annotation import get_annotations, save_annotation
from flask_login import current_user
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import Video, db, User, TemporalAnnotation, BoundingBoxAnnotation, Project
from .utils.video_processing import save_file, extract_metadata, ensure_browser_compatible, extract_video_frame
import os
from werkzeug.utils import secure_filename
import time
from urllib.parse import unquote
import numpy as np
from datetime import datetime
import cv2
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import traceback
import json
import io
import sys
from flask_cors import CORS, cross_origin
from .blueprints import api_bp, api_routes_registered
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Debug prints at module level
print("\n" + "="*60)
print("DEBUG: routes.py is being imported")
print(f"DEBUG: __name__ = {__name__}")
print(f"DEBUG: api_bp object = {api_bp}")
print(f"DEBUG: api_bp type = {type(api_bp)}")
print(f"DEBUG: api_bp name = {getattr(api_bp, 'name', 'NO NAME ATTRIBUTE')}")
print(f"DEBUG: api_routes_registered = {api_routes_registered}")
print("="*60 + "\n")

# Enable CORS for all routes in the blueprint
CORS(api_bp, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
print(f"DEBUG: CORS enabled for api_bp")

# Debug: List all methods/attributes of api_bp
print("\nDEBUG: api_bp methods and attributes:")
for attr in dir(api_bp):
    if not attr.startswith('_'):
        print(f"  - {attr}")
print()

# Add this function to check for allowed file extensions
def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'wmv', 'mkv'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Routes are now registered directly without guard
# The blueprint system in Flask already prevents duplicate registration

print("\nDEBUG: About to register routes with api_bp")
print(f"DEBUG: api_bp.route = {api_bp.route}")
print("DEBUG: Decorating upload_video route...")

@api_bp.route('/upload', methods=['POST', 'OPTIONS'])
@cross_origin(origins=['http://localhost:3000', 'http://127.0.0.1:3000'], supports_credentials=True)
def upload_video():
    logger.debug(f"Upload endpoint called with method: {request.method}")
    if 'files' not in request.files:
        return jsonify({'error': 'No files part in the request'}), 400
    
    files = request.files.getlist('files')
    if not files or files[0].filename == '':
        return jsonify({'error': 'No files selected'}), 400
    
    # Get optional project_id from form data
    project_id = request.form.get('project_id')
    if project_id:
        try:
            project_id = int(project_id)
            # Verify project exists
            project = Project.query.get(project_id)
            if not project:
                return jsonify({'error': f'Project {project_id} not found'}), 404
        except ValueError:
            return jsonify({'error': 'Invalid project_id'}), 400
    else:
        project_id = None
    
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    
    results = []
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(upload_folder, filename)
            logger.debug(f"Saving file: {filename} to {filepath}")
            file.save(filepath)
            
            # Generate web-compatible version
            logger.debug(f"Converting {filename} to browser-compatible format...")
            web_filename = ensure_browser_compatible(filename)
            logger.debug(f"Conversion complete. Web filename: {web_filename}")
            
            # Extract metadata
            try:
                metadata = extract_metadata(filepath)
            except Exception as e:
                metadata = {
                    'resolution': 'unknown',
                    'width': 0,
                    'height': 0,
                    'framerate': 0,
                    'duration': 0
                }
                
            # Save to database
            video = Video(
                filename=web_filename,  # Use web-compatible filename
                resolution=metadata.get('resolution', 'unknown'),
                framerate=metadata.get('framerate', 0),
                duration=metadata.get('duration', 0),
                project_id=project_id  # Associate with project if provided
            )
            db.session.add(video)
            
            # Update project statistics if video is assigned to a project
            if project_id:
                project.total_videos = Video.query.filter_by(project_id=project_id).count() + 1
                project.last_activity = datetime.utcnow()
            
            results.append({
                'filename': web_filename,
                'status': 'success',
                'metadata': metadata
            })
        else:
            results.append({
                'filename': file.filename if file else 'unknown',
                'status': 'error',
                'message': 'Invalid file type'
            })
    
    db.session.commit()
    return jsonify({'uploaded': results})

print("DEBUG: upload_video route decorated successfully")

# Existing endpoints remain...

print("DEBUG: Decorating list_videos route...")
@api_bp.route('/videos', methods=['GET'])
@jwt_required(optional=True)
def list_videos():
    # Get current user
    current_user_id = get_jwt_identity()
    
    # Handle case when no JWT token is provided
    if current_user_id:
        current_user = User.query.get(int(current_user_id))
        # Get role as string, handling both enum and string values
        if hasattr(current_user.role, 'value'):
            user_role = current_user.role.value
        else:
            user_role = str(current_user.role)
        # Normalize to uppercase for comparison
        user_role = user_role.upper() if user_role else None
    else:
        # No authentication - return all videos (or you can restrict this)
        current_user = None
        user_role = None
    
    # Get filter parameters
    project_id = request.args.get('project_id', type=int)
    assigned_to = request.args.get('assigned_to', type=int)
    unassigned = request.args.get('unassigned', 'false').lower() == 'true'
    
    # Start with base query
    query = Video.query
    
    # Filter by project if specified
    if project_id:
        query = query.filter_by(project_id=project_id)
    
    # Filter by assignment
    if unassigned:
        query = query.filter(Video.assigned_to.is_(None))
    elif assigned_to:
        query = query.filter_by(assigned_to=assigned_to)
    # For admin/reviewer users or no auth, show all videos by default
    # For regular users, only show their assigned videos
    elif current_user_id and user_role and user_role not in ['ADMIN', 'REVIEWER']:
        logger.debug(f"Filtering videos for non-admin user {current_user_id}")
        query = query.filter_by(assigned_to=int(current_user_id))
    else:
        logger.debug(f"Showing all videos - User ID: {current_user_id}, Role: {user_role}")
    
    videos = query.all()
    
    # Include assignee information if available
    video_list = []
    for video in videos:
        video_data = {
            "video_id": video.video_id,
            "filename": video.filename,
            "resolution": video.resolution,
            "framerate": video.framerate,
            "duration": video.duration,
            "status": video.status,
            "project_id": video.project_id,
            "assigned_to": video.assigned_to
        }
        
        # Add assignee name if video is assigned
        if video.assigned_to:
            assignee = User.query.get(video.assigned_to)
            if assignee:
                video_data["assigned_to_name"] = assignee.full_name
        
        video_list.append(video_data)
    
    return jsonify(video_list)

@api_bp.route('/export', methods=['GET'])
def export_annotations():
    # Export all annotations (both temporal and bounding boxes) as JSON.
    temporal_annotations = TemporalAnnotation.query.all()
    bbox_annotations = BoundingBoxAnnotation.query.all()
    export_data = {
        "temporal_annotations": [{
            "annotation_id": a.annotation_id,
            "video_id": a.video_id,
            "start_time": a.start_time,
            "end_time": a.end_time,
            "start_frame": a.start_frame,
            "end_frame": a.end_frame,
            "label": a.label
        } for a in temporal_annotations],
        "bounding_box_annotations": [{
            "bbox_id": b.bbox_id,
            "video_id": b.video_id,
            "frame_index": b.frame_index,
            "x": b.x,
            "y": b.y,
            "width": b.width,
            "height": b.height,
            "part_label": b.part_label
        } for b in bbox_annotations]
    }
    return jsonify(export_data)

@api_bp.route('/preview-normalize', methods=['POST'])
def preview_normalize():
    data = request.get_json()
    video_id = data.get('video_id')
    settings = data.get('settings')
    
    if not video_id or not settings:
        return jsonify({'error': 'Missing video_id or settings'}), 400
    
    # Get the video from database
    video = Video.query.get(video_id)
    if not video:
        return jsonify({'error': 'Video not found'}), 404
    
    try:
        # Create a preview directory if it doesn't exist
        preview_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'preview')
        os.makedirs(preview_dir, exist_ok=True)
        
        # Create a preview version with the specified settings
        source_path = os.path.join(current_app.config['UPLOAD_FOLDER'], video.filename)
        preview_filename = f"preview_{video_id}_{int(time.time())}.mp4"
        preview_path = os.path.join(preview_dir, preview_filename)
        
        # Use the normalization service but generate a smaller/shorter preview
        generate_preview(source_path, preview_path, settings)
        
        return jsonify({'preview_filename': f'preview/{preview_filename}'})
    except Exception as e:
        error_msg = str(e)
        if "FFmpeg" in error_msg:
            return jsonify({
                'error': 'Video normalization requires FFmpeg. Please install FFmpeg to use this feature.',
                'details': error_msg
            }), 500
        return jsonify({'error': error_msg}), 500

# Add these routes to properly serve static files with correct MIME types
@api_bp.route('/static/<path:filename>')
def serve_static(filename):
    """Serve files from the upload folder with proper MIME types"""
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

@api_bp.route('/preview/<path:filename>')
def serve_preview(filename):
    """Serve preview files from the preview subfolder"""
    preview_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'preview')
    return send_from_directory(preview_dir, filename)

@api_bp.route('/normalize', methods=['POST'])
def normalize_video_endpoint():
    data = request.get_json()
    video_id = data.get('video_id')
    settings = data.get('settings')
    
    if not video_id or not settings:
        return jsonify({'error': 'Missing video_id or settings'}), 400
    
    # Get the video from database
    video = Video.query.get(video_id)
    if not video:
        return jsonify({'error': 'Video not found'}), 404
    
    try:
        # Apply normalization
        source_path = os.path.join(current_app.config['UPLOAD_FOLDER'], video.filename)
        normalized_filename = f"norm_{video.filename}"
        normalized_path = os.path.join(current_app.config['UPLOAD_FOLDER'], normalized_filename)
        
        # Use the normalization service
        normalize_video(
            source_path, 
            normalized_path, 
            resolution=settings.get('resolution', '224x224'),
            framerate=settings.get('framerate', 30),
            brightness=settings.get('brightness', 1.0),
            contrast=settings.get('contrast', 1.0),
            saturation=settings.get('saturation', 1.0)
        )
        
        # Update the video record with new metadata
        video.normalized_path = normalized_path
        video.resolution = settings.get('resolution', '224x224') 
        video.framerate = settings.get('framerate', 30)
        db.session.commit()
        
        return jsonify({'success': True, 'normalized_filename': normalized_filename})
    except Exception as e:
        error_msg = str(e)
        if "FFmpeg" in error_msg:
            return jsonify({
                'error': 'Video normalization requires FFmpeg. Please install FFmpeg to use this feature.',
                'details': error_msg
            }), 500
        return jsonify({'error': error_msg}), 500

@api_bp.route('/normalize-all', methods=['POST'])
def normalize_all_videos():
    data = request.get_json()
    settings = data.get('settings')
    
    if not settings:
        return jsonify({'error': 'Missing settings'}), 400
    
    # Get all videos from database
    videos = Video.query.all()
    if not videos:
        return jsonify({'error': 'No videos found'}), 404
    
    processed_count = 0
    errors = []
    
    for video in videos:
        try:
            # Apply normalization
            source_path = os.path.join(current_app.config['UPLOAD_FOLDER'], video.filename)
            normalized_filename = f"norm_{video.filename}"
            normalized_path = os.path.join(current_app.config['UPLOAD_FOLDER'], normalized_filename)
            
            # Use the normalization service
            normalize_video(
                source_path, 
                normalized_path, 
                resolution=settings.get('resolution', '224x224'),
                framerate=settings.get('framerate', 30),
                brightness=settings.get('brightness', 1.0),
                contrast=settings.get('contrast', 1.0),
                saturation=settings.get('saturation', 1.0)
            )
            
            # Update the video record with new metadata
            video.normalized_path = normalized_path
            video.resolution = settings.get('resolution', '224x224') 
            video.framerate = settings.get('framerate', 30)
            processed_count += 1
        except Exception as e:
            errors.append({
                'video_id': video.video_id,
                'filename': video.filename,
                'error': str(e)
            })
    
    db.session.commit()
    
    return jsonify({
        'success': True, 
        'processed_count': processed_count,
        'errors': errors
    })

@api_bp.route('/thumbnail/<path:video_filename>/<int:frame_number>', methods=['GET'])
def get_thumbnail(video_filename, frame_number):
    """API endpoint to get a specific video frame"""
    from flask import send_file, current_app
    import os
    from urllib.parse import unquote
    import io
    import sys
    
    print(f">>> THUMBNAIL REQUEST: {video_filename}, frame={frame_number}", file=sys.stderr)
    
    try:
        # URL decode the filename
        video_filename = unquote(video_filename)
        print(f">>> DECODED FILENAME: {video_filename}", file=sys.stderr)
        
        # Create a fallback image
        img = np.zeros((120, 160, 3), dtype=np.uint8)
        
        # Try to get actual frame
        upload_folder = current_app.config.get('UPLOAD_FOLDER')
        video_path = os.path.join(upload_folder, video_filename)
        print(f">>> VIDEO PATH: {video_path}", file=sys.stderr)
        print(f">>> PATH EXISTS: {os.path.exists(video_path)}", file=sys.stderr)
        
        if os.path.exists(video_path):
            # Extract video metadata to verify frame is valid
            import cv2
            cap = cv2.VideoCapture(video_path)
            if cap.isOpened():
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                print(f">>> VIDEO HAS {total_frames} TOTAL FRAMES", file=sys.stderr)
                cap.release()
            
            print(f">>> CALLING extract_video_frame({video_filename}, {frame_number})", file=sys.stderr)
            thumbnail_path = extract_video_frame(video_filename, frame_number)
            print(f">>> RETURNED PATH: {thumbnail_path}", file=sys.stderr)
            
            if thumbnail_path and os.path.exists(thumbnail_path):
                print(f">>> PATH EXISTS: {os.path.exists(thumbnail_path)}", file=sys.stderr)
                print(f">>> FILE SIZE: {os.path.getsize(thumbnail_path)} bytes", file=sys.stderr)
                
                # Add CORS headers explicitly
                response = send_file(thumbnail_path, 
                               mimetype='image/jpeg',
                               as_attachment=False,
                               download_name=f"frame_{frame_number}.jpg")
                
                # Explicitly add CORS headers
                response.headers['Access-Control-Allow-Origin'] = '*'
                response.headers['Access-Control-Allow-Methods'] = 'GET'
                response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                
                print(f">>> SENDING FILE: {thumbnail_path}", file=sys.stderr)
                print(f">>> RESPONSE HEADERS: {response.headers}", file=sys.stderr)
                return response
        
        # For error cases, create a colored image based on the error type
        if not os.path.exists(video_path):
            # Red for file not found
            img[:, :, 2] = 255
            text = "File not found"
        else:
            # Green for extraction failed
            img[:, :, 1] = 255
            text = "Extract failed"
            
        cv2.putText(img, text, (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(img, f"Frame {frame_number}", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        
    except Exception as e:
        # Purple for exception
        img = np.zeros((120, 160, 3), dtype=np.uint8)
        img[:, :, 0] = 255  # Blue
        img[:, :, 2] = 255  # Red
        cv2.putText(img, "Error", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(img, str(e)[:15], (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
    
    # Convert image to bytes for all error cases
    _, buffer = cv2.imencode('.jpg', img)
    byte_io = io.BytesIO(buffer.tobytes())
    byte_io.seek(0)
    
    # Return the bytes as a file
    print("THUMBNAIL: Returning in-memory file")
    return send_file(byte_io, 
                   mimetype='image/jpeg',
                   as_attachment=False,
                   download_name=f"error_{frame_number}.jpg")

@api_bp.route('/annotations/<video_id>', methods=['GET', 'OPTIONS'])
def get_video_annotations(video_id):
    if request.method == 'OPTIONS':
        # Handle CORS preflight request
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
    
    # Handle GET request
    result = get_annotations(video_id)
    return jsonify(result)

@api_bp.route('/test-image', methods=['GET'])
def test_image():
    """Simplest possible image endpoint using send_file"""
    try:
        # Create a simple image
        img = np.zeros((120, 160, 3), dtype=np.uint8)
        img[:, :, 0] = 255  # Blue
        cv2.putText(img, "Test Image", (30, 60), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        
        # Convert to bytes
        _, buffer = cv2.imencode('.jpg', img)
        byte_io = io.BytesIO(buffer.tobytes())
        byte_io.seek(0)
        
        # Send the image as a file
        return send_file(
            byte_io,
            mimetype='image/jpeg',
            as_attachment=False,
            download_name='test.jpg'
        )
    except Exception as e:
        print(f"TEST IMAGE ERROR: {str(e)}")
        return str(e), 500

@api_bp.route('/static-test-image', methods=['GET'])
def static_test_image():
    """Simplest possible endpoint - direct file serving"""
    import os
    
    # Point to a real JPEG file on your system
    test_image_path = os.path.join(os.path.dirname(__file__), 'static', 'test.jpg')
    
    # If you don't have an image, create one
    if not os.path.exists(test_image_path):
        os.makedirs(os.path.dirname(test_image_path), exist_ok=True)
        img = np.zeros((120, 160, 3), dtype=np.uint8)
        img[:, :, 0] = 255  # Blue image
        cv2.putText(img, "TEST", (60, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
        cv2.imwrite(test_image_path, img)
    
    # Log that we're sending this specific file
    print(f">>> SERVING STATIC FILE: {test_image_path}", file=sys.stderr)
    print(f">>> FILE EXISTS: {os.path.exists(test_image_path)}", file=sys.stderr)
    print(f">>> FILE SIZE: {os.path.getsize(test_image_path)}", file=sys.stderr)
    
    # Direct file transfer with minimum Flask processing
    return send_file(
        test_image_path,
        mimetype='image/jpeg',
        etag=False,
        last_modified=None,
        max_age=0
    )

@api_bp.route('/raw-test-image', methods=['GET'])
def raw_test_image():
    """Direct image endpoint that bypasses most Flask processing"""
    from flask import Response
    import cv2
    import numpy as np
    
    # Create simple test image
    img = np.zeros((120, 160, 3), dtype=np.uint8)
    img[:, :, 0] = 255  # Blue color
    
    # Draw text on image
    cv2.putText(img, "Raw Test", (30, 60), 
            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
    
    # Convert to bytes
    _, buffer = cv2.imencode('.jpg', img)
    img_bytes = buffer.tobytes()
    
    # Build response directly with minimal Flask processing
    headers = {
        'Content-Type': 'image/jpeg',
        'Content-Length': str(len(img_bytes)),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
    }
    
    return Response(img_bytes, status=200, headers=headers, direct_passthrough=True)

@api_bp.route('/annotations', methods=['POST', 'OPTIONS'])
def create_annotation():
    if request.method == 'OPTIONS':
        # Handle CORS preflight request
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
    
    # Handle POST request
    try:
        data = request.json
        print("Received annotation data:", data)  # Debug logging
        
        # Validate required fields
        required_fields = ['video_id', 'start_time', 'end_time', 'start_frame', 'end_frame', 'label']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Pass current user ID if authenticated
        user_id = current_user.user_id if current_user.is_authenticated else None
        result = save_annotation(data, user_id=user_id)
        return jsonify(result)
    except Exception as e:
        import traceback
        print("Error saving annotation:", str(e))
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@api_bp.route('/bbox-annotations', methods=['POST', 'OPTIONS'])
def create_bbox_annotation():
    if request.method == 'OPTIONS':
        # Handle CORS preflight request
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
    
    # Handle POST request
    try:
        data = request.json
        print("Received bbox annotation data:", data)  # Debug logging
        
        # Validate required fields
        required_fields = ['video_id', 'frame_index', 'x', 'y', 'width', 'height', 'part_label']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        from .services.bounding_box import save_bbox_annotation
        # Pass current user ID if authenticated
        user_id = current_user.user_id if current_user.is_authenticated else None
        result = save_bbox_annotation(data, user_id=user_id)
        return jsonify(result)
    except Exception as e:
        import traceback
        print("Error saving bbox annotation:", str(e))
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@api_bp.route('/bbox-annotations/<int:video_id>', methods=['GET', 'OPTIONS'])
def get_bbox_annotations(video_id):
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response
    
    """Get all bounding box annotations for a specific video"""
    logger.debug(f"GET request received for bbox-annotations with video_id={video_id}")
    try:
        
        logger.debug("Querying database for bounding box annotations")
        bboxes = BoundingBoxAnnotation.query.filter_by(video_id=video_id).all()
        logger.debug(f"Found {len(bboxes)} bounding box annotations")
        
        result = [{
            'bbox_id': bbox.bbox_id,
            'video_id': bbox.video_id,
            'frame_index': bbox.frame_index,
            'x': bbox.x,
            'y': bbox.y,
            'width': bbox.width,
            'height': bbox.height,
            'part_label': bbox.part_label
        } for bbox in bboxes]
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in get_bbox_annotations: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@api_bp.route('/delete-bbox/<int:bbox_id>', methods=['GET'])
def delete_bbox_get(bbox_id):
    """Delete a bounding box annotation via GET request (avoids CORS preflight)"""
    logger.debug(f"GET request received to delete bbox with id={bbox_id}")
    try:
        
        # Find the bbox annotation
        bbox = BoundingBoxAnnotation.query.get(bbox_id)
        if not bbox:
            logger.error(f"Bounding box with id {bbox_id} not found")
            return jsonify({'error': 'Bounding box not found'}), 404
        
        # Store video_id for response
        video_id = bbox.video_id
        
        # Delete the bbox
        db.session.delete(bbox)
        db.session.commit()
        
        logger.debug(f"Successfully deleted bounding box with id {bbox_id}")
        return jsonify({
            'status': 'success', 
            'message': 'Bounding box deleted successfully',
            'bbox_id': bbox_id,
            'video_id': video_id
        })
    except Exception as e:
        logger.error(f"Error deleting bounding box: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/annotations/<int:annotation_id>', methods=['DELETE', 'OPTIONS'])
def delete_annotation(annotation_id):
    """Delete a temporal annotation"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'DELETE,OPTIONS')
        return response
    
    try:
        
        annotation = TemporalAnnotation.query.get(annotation_id)
        if not annotation:
            return jsonify({'error': 'Annotation not found'}), 404
        
        db.session.delete(annotation)
        db.session.commit()
        
        return jsonify({'status': 'deleted'})
    except Exception as e:
        logger.error(f"Error deleting annotation: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@api_bp.route('/videos/<int:video_id>/complete', methods=['POST'])
@jwt_required()
def mark_video_complete(video_id):
    """Mark a video as complete and submit for review"""
    try:
        user_id = get_jwt_identity()
        
        # Get the video
        video = Video.query.get(video_id)
        if not video:
            return jsonify({'error': 'Video not found'}), 404
        
        # Check if user is assigned to this video
        # if hasattr(video, 'assigned_to') and video.assigned_to != int(user_id):
        #     return jsonify({'error': 'You are not assigned to this video'}), 403
        
        # Mark as completed
        if hasattr(video, 'is_completed'):
            video.is_completed = True
        
        # Submit for review
        from .services.review import ReviewService
        review = ReviewService.submit_for_review(
            video_id=video_id,
            annotator_id=int(user_id),
            auto_assign=True
        )
        
        db.session.commit()
        
        return jsonify({
            'message': 'Video marked as complete and submitted for review',
            'review_id': review.review_id,
            'status': 'submitted'
        }), 200
        
    except Exception as e:
        logger.error(f"Error marking video complete: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/user-progress/<int:project_id>', methods=['GET'])
def get_user_progress(project_id):
    """Get annotation progress for the current user in a project"""
    try:
        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get videos assigned to the user in this project
        videos = Video.query.filter_by(
            project_id=project_id,
            assigned_to=current_user.user_id
        ).all()
        
        progress_data = {
            'total_assigned': len(videos),
            'completed': 0,
            'in_progress': 0,
            'not_started': 0,
            'videos': []
        }
        
        for video in videos:
            # Check if video has any annotations from this user
            temporal_count = TemporalAnnotation.query.filter_by(
                video_id=video.video_id,
                created_by=current_user.user_id
            ).count()
            
            bbox_count = BoundingBoxAnnotation.query.filter_by(
                video_id=video.video_id,
                created_by=current_user.user_id
            ).count()
            
            # Determine status
            if temporal_count > 0 or bbox_count > 0:
                if video.is_completed:
                    status = 'completed'
                    progress_data['completed'] += 1
                else:
                    status = 'in_progress'
                    progress_data['in_progress'] += 1
            else:
                status = 'not_started'
                progress_data['not_started'] += 1
            
            progress_data['videos'].append({
                'video_id': video.video_id,
                'filename': video.filename,
                'status': status,
                'temporal_annotations': temporal_count,
                'bbox_annotations': bbox_count
            })
        
        # Calculate percentage
        if progress_data['total_assigned'] > 0:
            progress_data['completion_percentage'] = round(
                (progress_data['completed'] / progress_data['total_assigned']) * 100, 1
            )
        else:
            progress_data['completion_percentage'] = 0
        
        return jsonify(progress_data)
        
    except Exception as e:
        logger.error(f"Error getting user progress: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/import/google-drive', methods=['POST'])
def import_from_google_drive():
    """Import videos from Google Drive"""
    if not request.json or 'fileIds' not in request.json:
        return jsonify({'error': 'No file IDs provided'}), 400
    
    # For MVP, redirect to front-end hosted Google Drive Picker
    # This is a placeholder - a full implementation would use OAuth2 and Google Drive API
    return jsonify({
        'status': 'redirect',
        'message': 'Please authorize with Google Drive in the browser'
    })

@api_bp.route('/import/url', methods=['POST'])
def import_from_url():
    """Import videos from URLs"""
    from .services.import_sources.url_import import import_from_urls
    
    if not request.json or 'urls' not in request.json:
        return jsonify({'error': 'No URLs provided'}), 400
    
    urls = request.json['urls']
    
    try:
        results = import_from_urls(urls)
        db.session.commit()
        return jsonify({'imported': results})
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error in URL import: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@api_bp.route('/import/dropbox', methods=['POST'])
def import_from_dropbox():
    """Import videos from Dropbox"""
    from .services.import_sources.dropbox import import_from_dropbox
    
    if not request.json or 'files' not in request.json:
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.json['files']
    
    try:
        results = import_from_dropbox(files)
        db.session.commit()
        return jsonify({'imported': results})
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error in Dropbox import: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@api_bp.route('/review', methods=['GET'])
def get_review_data():
    """Get all videos with their annotations for review"""
    try:
        
        # Get all videos
        videos = Video.query.all()
        
        review_data = []
        for video in videos:
            # Get temporal annotations for this video
            temporal_annotations = TemporalAnnotation.query.filter_by(video_id=video.video_id).all()
            temporal_data = [{
                'annotation_id': anno.annotation_id,
                'start_time': anno.start_time,
                'end_time': anno.end_time,
                'start_frame': anno.start_frame,
                'end_frame': anno.end_frame,
                'label': anno.label
            } for anno in temporal_annotations]
            
            # Get bounding box annotations for this video
            bbox_annotations = BoundingBoxAnnotation.query.filter_by(video_id=video.video_id).all()
            bbox_data = [{
                'bbox_id': bbox.bbox_id,
                'frame_index': bbox.frame_index,
                'x': bbox.x,
                'y': bbox.y,
                'width': bbox.width,
                'height': bbox.height,
                'part_label': bbox.part_label
            } for bbox in bbox_annotations]
            
            review_data.append({
                'video_id': video.video_id,
                'filename': video.filename,
                'resolution': video.resolution,
                'framerate': video.framerate,
                'duration': video.duration,
                'status': video.status if hasattr(video, 'status') else 'pending',
                'annotations': temporal_data,
                'bboxAnnotations': bbox_data
            })
        
        return jsonify(review_data)
    except Exception as e:
        logger.error(f"Error in get_review_data: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@api_bp.route('/videos/<int:video_id>/confirm', methods=['POST'])
def confirm_video(video_id):
    """Mark a video as confirmed after review"""
    try:
        
        video = Video.query.get(video_id)
        if not video:
            return jsonify({'error': 'Video not found'}), 404
        
        # Add status field if it doesn't exist yet (you may need to update your model)
        video.status = 'confirmed'
        db.session.commit()
        
        return jsonify({'status': 'success', 'message': 'Video confirmed successfully'})
    except Exception as e:
        logger.error(f"Error confirming video: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/review/complete', methods=['POST'])
def complete_review():
    """Mark the review process as complete for the current batch"""
    try:
        
        # Update all pending videos to confirmed status
        pending_videos = Video.query.filter_by(status='pending').all()
        for video in pending_videos:
            video.status = 'confirmed'
        
        # You might want to add a batch tracking system later
        # For now, just mark all videos as part of the completed batch
        db.session.commit()
        
        return jsonify({
            'status': 'success', 
            'message': 'Review completed successfully',
            'confirmed_count': len(pending_videos)
        })
    except Exception as e:
        logger.error(f"Error completing review: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/export/stats', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_export_stats():
    """Get statistics about data available for export"""
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response
        
    try:
        
        confirmed_videos = Video.query.filter_by(status='confirmed').count()
        all_videos = Video.query.count()
        
        # Count fall events
        fall_events = TemporalAnnotation.query.filter_by(label='Fall').count()
        total_annotations = TemporalAnnotation.query.count()
        
        # Count bounding boxes
        bounding_boxes = BoundingBoxAnnotation.query.count()
        
        return jsonify({
            'confirmedVideos': confirmed_videos,
            'totalVideos': all_videos,
            'fallEvents': fall_events,
            'totalAnnotations': total_annotations,
            'boundingBoxes': bounding_boxes
        })
    except Exception as e:
        logger.error(f"Error getting export stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/export', methods=['POST'])
def export_data():
    """Export annotation data in various formats"""
    try:
        data = request.json
        format_type = data.get('format', 'json')
        options = data.get('options', {})
        
        
        # Query data based on options
        video_query = Video.query
        if options.get('onlyConfirmed', True):
            video_query = video_query.filter_by(status='confirmed')
        
        videos = video_query.all()
        
        if format_type == 'json':
            # Create JSON export
            export_data = []
            for video in videos:
                video_data = {
                    'video_id': video.video_id,
                    'filename': video.filename,
                    'resolution': video.resolution,
                    'framerate': video.framerate,
                    'duration': video.duration,
                    'status': video.status,
                    'temporal_annotations': [],
                    'bounding_box_annotations': []
                }
                
                # Add temporal annotations
                temporal_anns = TemporalAnnotation.query.filter_by(video_id=video.video_id).all()
                for ann in temporal_anns:
                    video_data['temporal_annotations'].append({
                        'label': ann.label,
                        'start_time': ann.start_time,
                        'end_time': ann.end_time,
                        'start_frame': ann.start_frame,
                        'end_frame': ann.end_frame
                    })
                
                # Add bounding box annotations
                bbox_anns = BoundingBoxAnnotation.query.filter_by(video_id=video.video_id).all()
                for bbox in bbox_anns:
                    video_data['bounding_box_annotations'].append({
                        'frame_index': bbox.frame_index,
                        'x': bbox.x,
                        'y': bbox.y,
                        'width': bbox.width,
                        'height': bbox.height,
                        'part_label': bbox.part_label
                    })
                
                export_data.append(video_data)
            
            return jsonify(export_data)
            
        elif format_type == 'csv':
            # Create CSV export
            import csv
            import io
            from flask import Response
            
            # Create CSV in memory
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write headers
            writer.writerow(['video_id', 'filename', 'resolution', 'framerate', 'duration', 
                           'annotation_type', 'label', 'start_time', 'end_time', 
                           'start_frame', 'end_frame', 'frame_index', 'x', 'y', 
                           'width', 'height', 'part_label'])
            
            for video in videos:
                # Write temporal annotations
                temporal_anns = TemporalAnnotation.query.filter_by(video_id=video.video_id).all()
                for ann in temporal_anns:
                    writer.writerow([
                        video.video_id, video.filename, video.resolution, 
                        video.framerate, video.duration, 'temporal',
                        ann.label, ann.start_time, ann.end_time,
                        ann.start_frame, ann.end_frame, '', '', '', '', '', ''
                    ])
                
                # Write bounding box annotations
                bbox_anns = BoundingBoxAnnotation.query.filter_by(video_id=video.video_id).all()
                for bbox in bbox_anns:
                    writer.writerow([
                        video.video_id, video.filename, video.resolution,
                        video.framerate, video.duration, 'bounding_box',
                        '', '', '', '', '', bbox.frame_index, bbox.x, bbox.y,
                        bbox.width, bbox.height, bbox.part_label
                    ])
            
            # Create response
            output.seek(0)
            return Response(
                output.getvalue(),
                mimetype='text/csv',
                headers={"Content-Disposition": "attachment;filename=export.csv"}
            )
            
        else:
            # For COCO and YOLO formats, return placeholder
            return jsonify({
                'error': f'{format_type} format export not yet implemented'
            }), 501
            
    except Exception as e:
        logger.error(f"Error exporting data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/export/ml-dataset', methods=['POST'])
def export_ml_dataset():
    """Export data in ML-ready format with train/val/test splits"""
    try:
        data = request.json
        ml_options = data.get('mlOptions', {})
        
        import random
        import zipfile
        from io import BytesIO
        
        # Get videos
        videos = Video.query.filter_by(status='confirmed').all()
        
        # Split videos into train/val/test
        split_ratio = ml_options.get('splitRatio', {'train': 0.7, 'val': 0.15, 'test': 0.15})
        split_strategy = ml_options.get('splitStrategy', 'random')
        
        # Shuffle videos for random split
        if split_strategy == 'random':
            random.shuffle(videos)
        
        total_videos = len(videos)
        train_count = int(total_videos * split_ratio['train'])
        val_count = int(total_videos * split_ratio['val'])
        
        train_videos = videos[:train_count]
        val_videos = videos[train_count:train_count + val_count]
        test_videos = videos[train_count + val_count:]
        
        # Create dataset structure
        dataset = {
            'train': {'videos': [], 'total_annotations': 0},
            'val': {'videos': [], 'total_annotations': 0},
            'test': {'videos': [], 'total_annotations': 0}
        }
        
        # Process each split
        for split_name, split_videos in [('train', train_videos), ('val', val_videos), ('test', test_videos)]:
            for video in split_videos:
                video_data = {
                    'video_id': video.video_id,
                    'filename': video.filename,
                    'resolution': video.resolution,
                    'framerate': video.framerate,
                    'duration': video.duration,
                    'temporal_annotations': [],
                    'bounding_box_annotations': []
                }
                
                # Get annotations
                temporal_anns = TemporalAnnotation.query.filter_by(video_id=video.video_id).all()
                for ann in temporal_anns:
                    video_data['temporal_annotations'].append({
                        'label': ann.label,
                        'start_time': ann.start_time,
                        'end_time': ann.end_time,
                        'start_frame': ann.start_frame,
                        'end_frame': ann.end_frame
                    })
                
                bbox_anns = BoundingBoxAnnotation.query.filter_by(video_id=video.video_id).all()
                for bbox in bbox_anns:
                    video_data['bounding_box_annotations'].append({
                        'frame_index': bbox.frame_index,
                        'x': bbox.x,
                        'y': bbox.y,
                        'width': bbox.width,
                        'height': bbox.height,
                        'part_label': bbox.part_label
                    })
                
                dataset[split_name]['videos'].append(video_data)
                dataset[split_name]['total_annotations'] += len(temporal_anns)
        
        # Create response based on format
        if ml_options.get('outputFormat') == 'folder':
            # Create a zip file with folder structure
            zip_buffer = BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # Add split JSON files
                for split_name in ['train', 'val', 'test']:
                    json_data = json.dumps(dataset[split_name]['videos'], indent=2)
                    zip_file.writestr(f'{split_name}_annotations.json', json_data)
                
                # Add dataset info
                info = {
                    'dataset_name': ml_options.get('datasetName', 'FallDetectionDataset'),
                    'splits': {
                        'train': len(train_videos),
                        'val': len(val_videos),
                        'test': len(test_videos)
                    },
                    'preprocessing': ml_options.get('preprocessing', {}),
                    'created_at': datetime.now().isoformat()
                }
                zip_file.writestr('dataset_info.json', json.dumps(info, indent=2))
                
                # Add README
                readme = f"""# {ml_options.get('datasetName', 'Fall Detection Dataset')}

## Dataset Structure
- train_annotations.json: Training set annotations ({len(train_videos)} videos)
- val_annotations.json: Validation set annotations ({len(val_videos)} videos)
- test_annotations.json: Test set annotations ({len(test_videos)} videos)
- dataset_info.json: Dataset metadata and configuration

## Usage
Use the generated PyTorch dataset class to load this data.
"""
                zip_file.writestr('README.md', readme)
            
            zip_buffer.seek(0)
            
            return Response(
                zip_buffer.getvalue(),
                mimetype='application/zip',
                headers={
                    'Content-Disposition': f'attachment; filename=ml_dataset_{datetime.now().strftime("%Y%m%d_%H%M%S")}.zip'
                }
            )
        else:
            # Return JSON response
            return jsonify(dataset)
            
    except Exception as e:
        logger.error(f"Error exporting ML dataset: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.errorhandler(404)
@api_bp.errorhandler(500)
def handle_error(error):
    """Convert HTML error pages to JSON for API consistency"""
    from flask import request, jsonify
    
    # Don't modify image responses
    if request.path.startswith('/api/thumbnail/'):
        return error
    
    # For other API routes, return JSON
    if request.path.startswith('/api/'):
        return jsonify({"error": str(error)}), error.code
    
    # For non-API routes, return the original error
    return error

@api_bp.before_request
def log_request_info():
    logger.debug('Headers: %s', request.headers)
    logger.debug('Body: %s', request.get_data())
    logger.debug('Route: %s %s', request.method, request.path)

# Debug output to check route registration
print("\n=== REGISTERED ROUTES ===")
print("Note: Routes will be fully registered when the blueprint is attached to the Flask app")
for route in [route for route in dir(api_bp) if 'route' in route]:
    print(f"Blueprint route: {route}")
print("=========================\n")

# At the end of all route definitions:
api_routes_registered = True

print("\nDEBUG: routes.py - All routes have been decorated")
print(f"DEBUG: api_routes_registered is now = {api_routes_registered}")
print(f"DEBUG: api_bp has {len([r for r in dir(api_bp) if 'route' in r])} route-related attributes")
print("DEBUG: routes.py module loading complete\n")
