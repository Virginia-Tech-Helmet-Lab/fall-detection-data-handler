"""Simple static file serving for videos."""

from flask import send_from_directory, abort, current_app
from flask_jwt_extended import jwt_required
import os

def register_static_routes(app):
    """Register static file routes directly on the app."""
    
    @app.route('/api/static/<path:filename>', methods=['GET'])
    @jwt_required()
    def serve_video(filename):
        """Serve video files from the uploads directory."""
        try:
            upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
            file_path = os.path.join(upload_folder, filename)
            
            # Security check - prevent directory traversal
            if '..' in filename or filename.startswith('/'):
                abort(404)
            
            if os.path.exists(file_path):
                return send_from_directory(upload_folder, filename)
            else:
                abort(404)
                
        except Exception as e:
            print(f"Error serving video {filename}: {str(e)}")
            abort(500)
    
    @app.route('/api/video/<path:filename>', methods=['GET'])
    @jwt_required()
    def serve_video_alt(filename):
        """Alternative video serving endpoint."""
        try:
            upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
            return send_from_directory(upload_folder, filename)
        except Exception as e:
            print(f"Error serving video {filename}: {str(e)}")
            abort(500)
    
    @app.route('/api/preview/<path:filename>', methods=['GET'])
    @jwt_required()
    def serve_preview(filename):
        """Serve preview videos."""
        try:
            preview_folder = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'preview')
            return send_from_directory(preview_folder, filename)
        except Exception as e:
            print(f"Error serving preview {filename}: {str(e)}")
            abort(500)
    
    print(">>> Static file routes registered")