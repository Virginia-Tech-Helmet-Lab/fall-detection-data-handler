import os
import requests
import tempfile
import uuid
from urllib.parse import urlparse
from flask import current_app
from ...models import Video
from ...database import db
from ...utils.video_processing import extract_metadata, ensure_browser_compatible

def import_from_urls(urls):
    """Import videos from URLs"""
    results = []
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    
    for url in urls:
        try:
            # Parse URL to get filename
            parsed_url = urlparse(url)
            path = parsed_url.path
            
            # Extract filename from URL or generate one
            if path and '/' in path:
                filename = os.path.basename(path)
                if not filename or '.' not in filename:
                    filename = f"url_import_{uuid.uuid4().hex[:8]}.mp4"
            else:
                filename = f"url_import_{uuid.uuid4().hex[:8]}.mp4"
            
            # Request the file with streaming enabled
            response = requests.get(url, stream=True, timeout=30)
            
            # Check if request was successful
            if response.status_code != 200:
                results.append({
                    'url': url,
                    'status': 'error',
                    'message': f'Failed to download: HTTP {response.status_code}'
                })
                continue
            
            # Check content type (optional)
            content_type = response.headers.get('content-type', '')
            content_length = response.headers.get('content-length')
            
            # Download to temporary file
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        temp_file.write(chunk)
                temp_path = temp_file.name
            
            # Create safe filename
            from werkzeug.utils import secure_filename
            safe_filename = secure_filename(filename)
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
                filename=web_filename,
                resolution=metadata.get('resolution', 'unknown'),
                framerate=metadata.get('framerate', 0),
                duration=metadata.get('duration', 0)
            )
            db.session.add(video)
            
            results.append({
                'url': url,
                'filename': web_filename,
                'status': 'success',
                'metadata': metadata
            })
        
        except Exception as e:
            import traceback
            print(f"Error importing from URL {url}: {str(e)}")
            print(traceback.format_exc())
            results.append({
                'url': url,
                'status': 'error',
                'message': str(e)
            })
    
    return results
