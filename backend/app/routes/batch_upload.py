"""Batch upload routes for handling multiple video uploads efficiently."""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os
import time
import threading
import uuid
from ..models import Video, Project, User, db
# Video processing imports will be added when those services exist

batch_upload_bp = Blueprint('batch_upload', __name__, url_prefix='/api/batch')

# Global dictionary to track upload progress
upload_progress = {}

def process_video_async(file_path, filename, project_id, user_id, upload_id, index, total):
    """Process a single video asynchronously."""
    try:
        # Update progress
        upload_progress[upload_id]['videos'][index] = {
            'filename': filename,
            'status': 'processing',
            'progress': 0
        }
        
        # Create video entry
        video = Video(
            filename=secure_filename(filename),
            original_filename=filename,
            file_path=file_path,
            project_id=project_id,
            assigned_to=user_id
        )
        
        # Process video (extract metadata, create preview, etc.)
        # TODO: Add video processing when service is available
        # For now, just get basic metadata
        try:
            import cv2
            cap = cv2.VideoCapture(file_path)
            if cap.isOpened():
                video.fps = cap.get(cv2.CAP_PROP_FPS)
                video.width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                video.height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                video.duration = frame_count / video.fps if video.fps > 0 else 0
                cap.release()
                success = True
            else:
                success = False
        except Exception as e:
            print(f"Error processing video: {e}")
            success = False
        
        if success:
            db.session.add(video)
            db.session.commit()
            
            upload_progress[upload_id]['videos'][index]['status'] = 'completed'
            upload_progress[upload_id]['videos'][index]['progress'] = 100
            upload_progress[upload_id]['videos'][index]['video_id'] = video.video_id
        else:
            upload_progress[upload_id]['videos'][index]['status'] = 'failed'
            upload_progress[upload_id]['videos'][index]['error'] = 'Processing failed'
            
    except Exception as e:
        upload_progress[upload_id]['videos'][index]['status'] = 'failed'
        upload_progress[upload_id]['videos'][index]['error'] = str(e)
    
    # Update overall progress
    completed = sum(1 for v in upload_progress[upload_id]['videos'].values() 
                   if v.get('status') in ['completed', 'failed'])
    upload_progress[upload_id]['completed'] = completed
    upload_progress[upload_id]['progress'] = int((completed / total) * 100)

@batch_upload_bp.route('/upload', methods=['POST'])
@jwt_required()
def batch_upload():
    """Handle batch upload of multiple videos."""
    user_id = get_jwt_identity()
    
    # Get project ID
    project_id = request.form.get('project_id')
    if not project_id:
        return jsonify({'error': 'Project ID required'}), 400
    
    # Check project access
    project = Project.query.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    # Get uploaded files
    files = request.files.getlist('videos')
    if not files:
        return jsonify({'error': 'No files uploaded'}), 400
    
    # Create upload session
    upload_id = str(uuid.uuid4())
    upload_progress[upload_id] = {
        'total': len(files),
        'completed': 0,
        'progress': 0,
        'videos': {}
    }
    
    # Process each video
    threads = []
    for index, file in enumerate(files):
        if file.filename:
            # Save file
            filename = secure_filename(file.filename)
            timestamp = str(int(time.time()))
            unique_filename = f"{timestamp}_{filename}"
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            
            try:
                file.save(file_path)
                
                # Start async processing
                thread = threading.Thread(
                    target=process_video_async,
                    args=(file_path, file.filename, project_id, user_id, upload_id, index, len(files))
                )
                thread.start()
                threads.append(thread)
                
            except Exception as e:
                upload_progress[upload_id]['videos'][index] = {
                    'filename': file.filename,
                    'status': 'failed',
                    'error': str(e)
                }
    
    # Return upload ID for progress tracking
    return jsonify({
        'upload_id': upload_id,
        'total_files': len(files),
        'message': 'Upload started. Use the progress endpoint to track status.'
    }), 202

@batch_upload_bp.route('/progress/<upload_id>', methods=['GET'])
@jwt_required()
def get_upload_progress(upload_id):
    """Get the progress of a batch upload."""
    if upload_id not in upload_progress:
        return jsonify({'error': 'Upload session not found'}), 404
    
    progress = upload_progress[upload_id]
    
    # Clean up completed uploads after 1 hour
    if progress['progress'] == 100:
        # TODO: Add timestamp and cleanup old sessions
        pass
    
    return jsonify(progress), 200

@batch_upload_bp.route('/chunk', methods=['POST'])
@jwt_required()
def chunked_upload():
    """Handle chunked upload for very large files."""
    chunk = request.files.get('chunk')
    chunk_number = int(request.form.get('chunkNumber', 0))
    total_chunks = int(request.form.get('totalChunks', 1))
    filename = request.form.get('filename')
    upload_id = request.form.get('uploadId')
    
    if not all([chunk, filename, upload_id]):
        return jsonify({'error': 'Missing required parameters'}), 400
    
    # Create temp directory for chunks
    temp_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], 'temp', upload_id)
    os.makedirs(temp_dir, exist_ok=True)
    
    # Save chunk
    chunk_path = os.path.join(temp_dir, f'chunk_{chunk_number}')
    chunk.save(chunk_path)
    
    # If all chunks received, combine them
    if chunk_number == total_chunks - 1:
        output_path = os.path.join(current_app.config['UPLOAD_FOLDER'], secure_filename(filename))
        
        # Combine chunks
        with open(output_path, 'wb') as output_file:
            for i in range(total_chunks):
                chunk_path = os.path.join(temp_dir, f'chunk_{i}')
                with open(chunk_path, 'rb') as chunk_file:
                    output_file.write(chunk_file.read())
                os.remove(chunk_path)
        
        # Clean up temp directory
        os.rmdir(temp_dir)
        
        return jsonify({
            'message': 'Upload complete',
            'filename': filename
        }), 200
    
    return jsonify({
        'message': f'Chunk {chunk_number + 1}/{total_chunks} received'
    }), 200

