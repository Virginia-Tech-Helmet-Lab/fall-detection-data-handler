import os
import requests
import tempfile
import uuid
from flask import current_app
from ...models import Video
from ...database import db
from ...utils.video_processing import extract_metadata, ensure_browser_compatible

def import_from_dropbox(files):
    """Import videos from Dropbox
    
    Args:
        files: List of file objects from Dropbox with at least id, name, and path_display
    
    Returns:
        List of import results
    """
    results = []
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    
    # This function is a placeholder for actual Dropbox API integration
    # In a real app, you would use the Dropbox API to download files
    
    for file in files:
        try:
            # Create a meaningful filename
            original_filename = file.get('name', f"dropbox_import_{uuid.uuid4().hex[:8]}.mp4")
            
            # In a real implementation, you would download from Dropbox here
            # For this placeholder, we'll just create a dummy file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
                temp_file.write(b'Placeholder video data')
                temp_path = temp_file.name
            
            # Create safe filename
            from werkzeug.utils import secure_filename
            safe_filename = secure_filename(original_filename)
            filepath = os.path.join(upload_folder, safe_filename)
            
            # Ensure no name conflicts
            if os.path.exists(filepath):
                base, ext = os.path.splitext(safe_filename)
                safe_filename = f"{base}_{uuid.uuid4().hex[:8]}{ext}"
                filepath = os.path.join(upload_folder, safe_filename)
            
            # Move the file from temp location
            os.rename(temp_path, filepath)
            
            # Generate browser-compatible version
            web_filename = ensure_browser_compatible(safe_filename)
            
            # Extract metadata (this will fail on our dummy file, but would work with real videos)
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
                filename=web_filename,
                resolution=metadata.get('resolution', 'unknown'),
                framerate=metadata.get('framerate', 0),
                duration=metadata.get('duration', 0)
            )
            db.session.add(video)
            
            results.append({
                'dropbox_file_id': file.get('id'),
                'filename': web_filename,
                'status': 'success',
                'metadata': metadata
            })
        
        except Exception as e:
            import traceback
            print(f"Error importing from Dropbox: {str(e)}")
            print(traceback.format_exc())
            results.append({
                'dropbox_file_id': file.get('id', 'unknown'),
                'status': 'error',
                'message': str(e)
            })
    
    return results
