"""Register the real normalize endpoints directly on app."""

from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import Video, db
from .services.normalization import normalize_video as process_video
from .normalization_progress import start_progress, update_progress, add_error, complete_progress, get_progress
import os
import uuid
import time

def register_real_normalize_routes(app):
    """Register the real normalization routes."""
    
    @app.route('/api/normalize-all', methods=['POST'])
    @jwt_required()
    def normalize_all_videos():
        """Normalize all pending videos."""
        try:
            data = request.get_json()
            settings = data.get('settings', {})
            force = data.get('force', False)  # Add force option
            
            if not settings:
                settings = {
                    'resolution': '224x224',
                    'framerate': 30,
                    'brightness': 1.0,
                    'contrast': 1.0,
                    'saturation': 1.0
                }
            
            # Get all videos that need normalization
            from sqlalchemy import or_, and_
            
            if force:
                # Force mode: re-normalize all videos
                videos = Video.query.all()
                print(f">>> FORCE MODE: Re-normalizing all videos")
            else:
                # Normal mode: only unnormalized videos
                videos = Video.query.filter(
                    or_(
                        Video.status == 'pending',
                        Video.status == None,
                        Video.status == '',
                        and_(
                            Video.status != 'ready',
                            Video.normalization_settings == None
                        )
                    )
                ).all()
            
            # Debug: Show all video statuses
            all_videos = Video.query.all()
            print(f">>> Total videos in database: {len(all_videos)}")
            status_counts = {}
            for v in all_videos:
                status = v.status or 'None'
                status_counts[status] = status_counts.get(status, 0) + 1
            print(f">>> Video status breakdown: {status_counts}")
            
            # Generate task ID for progress tracking
            task_id = str(uuid.uuid4())
            start_progress(task_id, len(videos))
            
            print(f">>> Starting normalization of {len(videos)} videos (task_id: {task_id})")
            print(f">>> Videos to normalize: {[v.filename for v in videos[:5]]}..." if videos else "No videos found!")
            
            processed = 0
            errors = []
            
            for idx, video in enumerate(videos):
                try:
                    print(f">>> Processing video {idx+1}/{len(videos)}: {video.filename}")
                    update_progress(task_id, processed, video.filename)
                    
                    # Process each video
                    source_path = os.path.join(current_app.config['UPLOAD_FOLDER'], video.filename)
                    normalized_filename = f"norm_{video.filename}"
                    normalized_path = os.path.join(current_app.config['UPLOAD_FOLDER'], normalized_filename)
                    
                    start_time = time.time()
                    
                    # Use the normalization service
                    process_video(
                        source_path, 
                        normalized_path, 
                        resolution=settings.get('resolution', '224x224'),
                        framerate=settings.get('framerate', 30),
                        brightness=settings.get('brightness', 1.0),
                        contrast=settings.get('contrast', 1.0),
                        saturation=settings.get('saturation', 1.0)
                    )
                    
                    processing_time = time.time() - start_time
                    print(f">>> Completed {video.filename} in {processing_time:.2f} seconds")
                    
                    # Update video record
                    video.status = 'ready'
                    video.normalization_settings = settings
                    
                    # Optionally unassign videos after normalization
                    if data.get('unassign_after_normalize', False):
                        video.assigned_to = None
                        print(f">>> Unassigned video: {video.filename}")
                    
                    processed += 1
                    
                    # Update progress
                    update_progress(task_id, processed, video.filename)
                    
                except Exception as e:
                    error_msg = f"Video {video.filename}: {str(e)}"
                    errors.append(error_msg)
                    add_error(task_id, error_msg)
                    print(f">>> ERROR: {error_msg}")
            
            db.session.commit()
            
            # Mark task as complete
            complete_progress(task_id)
            print(f">>> Normalization complete! Processed {processed}/{len(videos)} videos")
            
            response = {
                'success': True,
                'processed_count': processed,
                'total': len(videos),
                'task_id': task_id
            }
            
            if errors:
                response['errors'] = errors
                
            return jsonify(response)
            
        except Exception as e:
            print(f"Normalize all error: {str(e)}")
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/normalize', methods=['POST'])
    @jwt_required()
    def normalize_single_video():
        """Normalize a single video."""
        try:
            data = request.get_json()
            video_id = data.get('video_id')
            settings = data.get('settings', {})
            
            if not video_id:
                return jsonify({'error': 'Missing video_id'}), 400
            
            video = Video.query.get(video_id)
            if not video:
                return jsonify({'error': 'Video not found'}), 404
            
            # Process the video
            source_path = os.path.join(current_app.config['UPLOAD_FOLDER'], video.filename)
            normalized_filename = f"norm_{video.filename}"
            normalized_path = os.path.join(current_app.config['UPLOAD_FOLDER'], normalized_filename)
            
            try:
                process_video(
                    source_path, 
                    normalized_path, 
                    resolution=settings.get('resolution', '224x224'),
                    framerate=settings.get('framerate', 30),
                    brightness=settings.get('brightness', 1.0),
                    contrast=settings.get('contrast', 1.0),
                    saturation=settings.get('saturation', 1.0)
                )
                
                # Update video record
                video.status = 'ready'
                video.normalization_settings = settings
                video.resolution = settings.get('resolution', '224x224')
                video.framerate = settings.get('framerate', 30)
                
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'normalized_filename': normalized_filename
                })
                
            except Exception as e:
                if "FFmpeg" in str(e):
                    # FFmpeg not available, just mark as ready
                    video.status = 'ready'
                    video.normalization_settings = settings
                    db.session.commit()
                    
                    return jsonify({
                        'success': True,
                        'warning': 'FFmpeg not available, video marked as ready without processing',
                        'normalized_filename': video.filename
                    })
                else:
                    raise
                    
        except Exception as e:
            print(f"Normalize error: {str(e)}")
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/normalize/progress/<task_id>', methods=['GET'])
    @jwt_required()
    def get_normalization_progress(task_id):
        """Get progress for a normalization task."""
        progress = get_progress(task_id)
        if progress:
            return jsonify(progress)
        else:
            return jsonify({'error': 'Task not found'}), 404
    
    @app.route('/api/videos/status-check', methods=['GET'])
    @jwt_required()
    def check_video_status():
        """Debug endpoint to check video statuses."""
        all_videos = Video.query.all()
        status_counts = {}
        for v in all_videos:
            status = v.status or 'None'
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # Get sample videos by status
        samples = {}
        for status in status_counts.keys():
            if status == 'None':
                sample_videos = Video.query.filter(Video.status == None).limit(3).all()
            else:
                sample_videos = Video.query.filter_by(status=status).limit(3).all()
            samples[status] = [{
                'id': v.video_id,
                'filename': v.filename,
                'has_normalization_settings': v.normalization_settings is not None
            } for v in sample_videos]
        
        return jsonify({
            'total_videos': len(all_videos),
            'status_breakdown': status_counts,
            'samples': samples
        })
    
    print(">>> Real normalization routes registered")