import os
import tempfile
import logging

from sqlalchemy.orm import Session
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

from ...models import Video
from ...services.video_processing import extract_metadata, ensure_browser_compatible


def get_drive_service():
    credentials = Credentials.from_authorized_user_info({
        "token": os.environ.get("GOOGLE_ACCESS_TOKEN"),
        "refresh_token": os.environ.get("GOOGLE_REFRESH_TOKEN"),
        "client_id": os.environ.get("GOOGLE_CLIENT_ID"),
        "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET"),
        "token_uri": "https://oauth2.googleapis.com/token",
    })
    return build('drive', 'v3', credentials=credentials)


def import_from_google_drive(db: Session, file_ids, upload_folder):
    results = []
    os.makedirs(upload_folder, exist_ok=True)

    try:
        drive_service = get_drive_service()
    except Exception as e:
        raise Exception(f"Failed to connect to Google Drive: {str(e)}")

    for file_id in file_ids:
        try:
            file_metadata = drive_service.files().get(fileId=file_id, fields="name,mimeType,size").execute()

            if not file_metadata['mimeType'].startswith('video/'):
                results.append({'file_id': file_id, 'status': 'error', 'message': 'Not a video file'})
                continue

            request = drive_service.files().get_media(fileId=file_id)
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                downloader = MediaIoBaseDownload(temp_file, request)
                done = False
                while not done:
                    status, done = downloader.next_chunk()
                temp_path = temp_file.name

            filename = file_metadata['name']
            safe_filename = ''.join(c for c in filename if c.isalnum() or c in '._- ').replace(' ', '_')
            filepath = os.path.join(upload_folder, safe_filename)

            if os.path.exists(filepath):
                base, ext = os.path.splitext(safe_filename)
                safe_filename = f"{base}_{file_id[:8]}{ext}"
                filepath = os.path.join(upload_folder, safe_filename)

            os.rename(temp_path, filepath)
            web_filename = ensure_browser_compatible(safe_filename, upload_folder)

            try:
                metadata = extract_metadata(filepath)
            except Exception:
                metadata = {'resolution': 'unknown', 'width': 0, 'height': 0, 'framerate': 0, 'duration': 0}

            video = Video(
                filename=web_filename,
                resolution=metadata.get('resolution', 'unknown'),
                framerate=metadata.get('framerate', 0),
                duration=metadata.get('duration', 0),
            )
            db.add(video)
            results.append({'file_id': file_id, 'filename': web_filename, 'status': 'success', 'metadata': metadata})

        except Exception as e:
            results.append({'file_id': file_id, 'status': 'error', 'message': str(e)})

    return results
