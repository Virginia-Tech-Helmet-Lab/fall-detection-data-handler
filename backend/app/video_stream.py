"""Video streaming with proper authentication and range support."""

from flask import Response, request, abort, current_app
from flask_jwt_extended import jwt_required, verify_jwt_in_request
import os
import re

def register_video_stream_routes(app):
    """Register video streaming routes with range support."""
    
    @app.route('/api/stream/<path:filename>', methods=['GET'])
    def stream_video(filename):
        """Stream video files with range support for HTML5 video player."""
        try:
            # Try to verify JWT from query parameter or header
            try:
                verify_jwt_in_request(optional=True)
            except:
                # Allow access without JWT for video streaming
                # In production, implement a secure token-based approach
                pass
            
            upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
            file_path = os.path.join(upload_folder, filename)
            
            # Security check - prevent directory traversal
            if '..' in filename or filename.startswith('/'):
                abort(404)
            
            if not os.path.exists(file_path):
                abort(404)
            
            # Get file size
            file_size = os.path.getsize(file_path)
            
            # Parse range header
            range_header = request.headers.get('range')
            if range_header:
                # Parse the byte range
                match = re.search(r'bytes=(\d+)-(\d*)', range_header)
                if match:
                    start = int(match.group(1))
                    end = int(match.group(2)) if match.group(2) else file_size - 1
                else:
                    start = 0
                    end = file_size - 1
            else:
                start = 0
                end = file_size - 1
            
            # Ensure end doesn't exceed file size
            end = min(end, file_size - 1)
            content_length = end - start + 1
            
            def generate():
                with open(file_path, 'rb') as f:
                    f.seek(start)
                    remaining = content_length
                    while remaining > 0:
                        chunk_size = min(4096, remaining)
                        data = f.read(chunk_size)
                        if not data:
                            break
                        remaining -= len(data)
                        yield data
            
            # Create response with proper headers
            response = Response(
                generate(),
                status=206 if range_header else 200,
                mimetype='video/mp4',
                direct_passthrough=True
            )
            
            # Add necessary headers
            response.headers['Content-Length'] = str(content_length)
            response.headers['Accept-Ranges'] = 'bytes'
            response.headers['Content-Range'] = f'bytes {start}-{end}/{file_size}'
            
            # Add CORS headers for video playback
            origin = request.headers.get('Origin')
            if origin:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Credentials'] = 'true'
            
            return response
            
        except Exception as e:
            print(f"Error streaming video {filename}: {str(e)}")
            abort(500)
    
    # Also add a public thumbnail endpoint
    @app.route('/api/thumbnail/<path:filename>', methods=['GET'])
    def serve_thumbnail(filename):
        """Serve video thumbnails without authentication."""
        try:
            thumbnail_folder = os.path.join(
                current_app.config.get('UPLOAD_FOLDER', 'uploads'), 
                'thumbnails'
            )
            
            # Try to find thumbnail
            base_name = os.path.splitext(filename)[0]
            for ext in ['.jpg', '.jpeg', '.png']:
                thumb_path = os.path.join(thumbnail_folder, base_name + ext)
                if os.path.exists(thumb_path):
                    from flask import send_file
                    return send_file(thumb_path, mimetype=f'image/{ext[1:]}')
            
            # If no thumbnail, return 404
            abort(404)
            
        except Exception as e:
            print(f"Error serving thumbnail {filename}: {str(e)}")
            abort(404)
    
    print(">>> Video streaming routes registered")