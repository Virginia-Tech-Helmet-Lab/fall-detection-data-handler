import os
import tempfile
import requests
from flask import current_app
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from ...models import Video
from ...database import db
from ...utils.video_processing import extract_metadata, ensure_browser_compatible

def get_drive_service():
    """Get an authorized Google Drive service instance"""
    # This would require proper OAuth handling
    # For simplicity, we're assuming credentials are available
    # In a real implementation, you'd need to handle OAuth flow
    credentials = Credentials.from_authorized_user_info({
        "token": os.environ.get("GOOGLE_ACCESS_TOKEN"),
        "refresh_token": os.environ.get("GOOGLE_REFRESH_TOKEN"),
        "client_id": os.environ.get("GOOGLE_CLIENT_ID"),
        "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET"),
        "token_uri": "https://oauth2.googleapis.com/token",
    })
    
    return build('drive', 'v3', credentials=credentials)

def import_from_google_drive(file_ids):
    """Import videos from Google Drive by file IDs"""
    results = []
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    
    # Get Drive service
    try:
        drive_service = get_drive_service()
    except Exception as e:
        raise Exception(f"Failed to connect to Google Drive: {str(e)}")
    
    for file_id in file_ids:
        try:
            # Get file metadata
            file_metadata = drive_service.files().get(fileId=file_id, fields="name,mimeType,size").execute()
            
            # Check if it's a video file
            if not file_metadata['mimeType'].startswith('video/'):
                results.append({
                    'file_id': file_id,
                    'status': 'error',
                    'message': 'Not a video file'
                })
                continue
            
            # Download the file
            request = drive_service.files().get_media(fileId=file_id)
            
            # Use a temporary file for download
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                downloader = MediaIoBaseDownload(temp_file, request)
                done = False
                while not done:
                    status, done = downloader.next_chunk()
                
                temp_path = temp_file.name
            
            # Move file to upload folder with original name
            filename = file_metadata['name']
            safe_filename = ''.join(c for c in filename if c.isalnum() or c in '._- ').replace(' ', '_')
            filepath = os.path.join(upload_folder, safe_filename)
            
            # Ensure no name conflicts
            if os.path.exists(filepath):
                base, ext = os.path.splitext(safe_filename)
                safe_filename = f"{base}_{file_id[:8]}{ext}"
                filepath = os.path.join(upload_folder, safe_filename)
            
            # Move the file from temp location
            os.rename(temp_path, filepath)
            
            # Create web-compatible version
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
                'file_id': file_id,
                'filename': web_filename,
                'status': 'success',
                'metadata': metadata
            })
        
        except Exception as e:
            results.append({
                'file_id': file_id,
                'status': 'error',
                'message': str(e)
            })
    
    return results
