"""Simple upload endpoint to bypass route registration issues."""

from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os
from .models import Video, Project, db
import time
import traceback

def register_upload_route(app):
    """Register upload route directly on the app."""
    
    @app.route('/api/upload', methods=['POST'])
    @jwt_required()
    def upload_video():
        try:
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
            
            # Get current user
            current_user_id = get_jwt_identity()
            
            upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
            os.makedirs(upload_folder, exist_ok=True)
            
            results = []
            for file in files:
                if file and file.filename:
                    # Generate unique filename
                    filename = secure_filename(file.filename)
                    timestamp = str(int(time.time() * 1000))
                    unique_filename = f"{timestamp}_{filename}"
                    filepath = os.path.join(upload_folder, unique_filename)
                    
                    # Save file
                    file.save(filepath)
                    
                    # Create video record
                    video = Video(
                        filename=unique_filename,
                        project_id=project_id,
                        assigned_to=int(current_user_id) if current_user_id else None,
                        status='pending'
                    )
                    
                    # Try to get video metadata
                    try:
                        import cv2
                        cap = cv2.VideoCapture(filepath)
                        if cap.isOpened():
                            video.framerate = cap.get(cv2.CAP_PROP_FPS)
                            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                            video.resolution = f"{width}x{height}"
                            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                            video.duration = frame_count / video.framerate if video.framerate > 0 else 0
                            cap.release()
                    except Exception as e:
                        print(f"Error extracting video metadata: {e}")
                    
                    db.session.add(video)
                    
                    results.append({
                        'filename': unique_filename,
                        'original_filename': file.filename,
                        'status': 'success'
                    })
                else:
                    results.append({
                        'filename': file.filename if file else 'unknown',
                        'status': 'error',
                        'message': 'Invalid file'
                    })
            
            db.session.commit()
            return jsonify({'uploaded': results})
            
        except Exception as e:
            print(f"Upload error: {str(e)}")
            print(traceback.format_exc())
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    print(">>> Upload route registered at /api/upload")