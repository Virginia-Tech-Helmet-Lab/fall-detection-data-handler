import os
import tempfile
import uuid
import logging
import traceback

from sqlalchemy.orm import Session
from werkzeug.utils import secure_filename

from ...models import Video
from ...services.video_processing import extract_metadata, ensure_browser_compatible


def import_from_dropbox(db: Session, files, upload_folder):
    """Import videos from Dropbox (placeholder implementation)."""
    results = []
    os.makedirs(upload_folder, exist_ok=True)

    for file in files:
        try:
            original_filename = file.get('name', f"dropbox_import_{uuid.uuid4().hex[:8]}.mp4")

            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
                temp_file.write(b'Placeholder video data')
                temp_path = temp_file.name

            safe_filename = secure_filename(original_filename)
            filepath = os.path.join(upload_folder, safe_filename)
            if os.path.exists(filepath):
                base, ext = os.path.splitext(safe_filename)
                safe_filename = f"{base}_{uuid.uuid4().hex[:8]}{ext}"
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
            results.append({'dropbox_file_id': file.get('id'), 'filename': web_filename, 'status': 'success', 'metadata': metadata})

        except Exception as e:
            logging.error(f"Error importing from Dropbox: {str(e)}")
            logging.error(traceback.format_exc())
            results.append({'dropbox_file_id': file.get('id', 'unknown'), 'status': 'error', 'message': str(e)})

    return results
