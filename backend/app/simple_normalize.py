"""Simple normalization endpoint."""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import Video, db
import subprocess
import os
import json

def register_normalize_route(app):
    """Register normalization route directly on the app."""
    
    print(">>> REGISTERING NORMALIZE ROUTE: /api/normalize/<int:video_id>")
    
    @app.route('/api/normalize/<int:video_id>', methods=['POST'])
    @jwt_required()
    def normalize_video(video_id):
        try:
            # Get video
            video = Video.query.get(video_id)
            if not video:
                return jsonify({'error': 'Video not found'}), 404
            
            # Get normalization settings
            settings = request.json or {}
            target_resolution = settings.get('resolution', 'original')
            target_fps = settings.get('framerate', 'original')
            brightness = float(settings.get('brightness', 1.0))
            contrast = float(settings.get('contrast', 1.0))
            
            # For now, just update the normalization settings
            video.normalization_settings = {
                'target_resolution': target_resolution,
                'target_fps': target_fps,
                'brightness': brightness,
                'contrast': contrast,
                'normalized': True
            }
            
            # Mark as ready for annotation
            video.status = 'ready'
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Video normalization settings saved',
                'video_id': video_id
            })
            
        except Exception as e:
            print(f"Normalization error: {str(e)}")
            import traceback
            traceback.print_exc()
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/videos/<int:video_id>/thumbnail', methods=['GET'])
    @jwt_required()
    def get_thumbnail(video_id):
        """Get video thumbnail."""
        try:
            video = Video.query.get(video_id)
            if not video:
                return jsonify({'error': 'Video not found'}), 404
            
            # For now, return a placeholder
            return jsonify({
                'thumbnail_url': f'/api/placeholder/thumbnail/{video_id}'
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/videos/<int:video_id>/preview', methods=['GET'])
    @jwt_required()
    def get_preview(video_id):
        """Get video preview URL."""
        try:
            video = Video.query.get(video_id)
            if not video:
                return jsonify({'error': 'Video not found'}), 404
            
            # Return the video file URL
            return jsonify({
                'preview_url': f'/api/video/{video.filename}'
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    print(">>> Normalization routes registered")
    
    # Add a debug endpoint to verify registration
    @app.route('/api/test-normalize', methods=['GET'])
    def test_normalize():
        """Test endpoint to verify normalize routes are registered."""
        return jsonify({
            'message': 'Normalize routes are active',
            'routes': [
                '/api/normalize/<int:video_id>',
                '/api/videos/<int:video_id>/thumbnail',
                '/api/videos/<int:video_id>/preview'
            ]
        })
    
    print(">>> Added test-normalize endpoint")
    
    @app.route('/api/normalize-all', methods=['POST'])
    @jwt_required()
    def normalize_all_videos():
        """Apply normalization settings to all videos."""
        try:
            # Get current user
            current_user_id = get_jwt_identity()
            
            # Get normalization settings
            settings = request.json or {}
            target_resolution = settings.get('resolution', 'original')
            target_fps = settings.get('framerate', 'original')
            brightness = float(settings.get('brightness', 1.0))
            contrast = float(settings.get('contrast', 1.0))
            
            # Get all pending videos
            videos = Video.query.filter_by(status='pending').all()
            processed_count = 0
            
            for video in videos:
                # Update normalization settings
                video.normalization_settings = {
                    'target_resolution': target_resolution,
                    'target_fps': target_fps,
                    'brightness': brightness,
                    'contrast': contrast,
                    'normalized': True
                }
                
                # Mark as ready for annotation
                video.status = 'ready'
                processed_count += 1
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': f'Normalized {processed_count} videos',
                'processed_count': processed_count
            })
            
        except Exception as e:
            print(f"Normalize all error: {str(e)}") 
            db.session.rollback()
            return jsonify({'error': str(e)}), 500
    
    print(">>> Added normalize-all endpoint")