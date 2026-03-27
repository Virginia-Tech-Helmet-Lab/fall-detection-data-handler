import os
import tempfile
import uuid
import logging
import traceback
from urllib.parse import urlparse

import httpx
from sqlalchemy.orm import Session
from werkzeug.utils import secure_filename

from ...models import Video
from ...services.video_processing import extract_metadata, ensure_browser_compatible


def import_from_urls(db: Session, urls, upload_folder):
    results = []
    os.makedirs(upload_folder, exist_ok=True)

    for url in urls:
        try:
            parsed_url = urlparse(url)
            path = parsed_url.path
            if path and '/' in path:
                filename = os.path.basename(path)
                if not filename or '.' not in filename:
                    filename = f"url_import_{uuid.uuid4().hex[:8]}.mp4"
            else:
                filename = f"url_import_{uuid.uuid4().hex[:8]}.mp4"

            with httpx.Client(timeout=30) as client:
                response = client.get(url)

            if response.status_code != 200:
                results.append({'url': url, 'status': 'error', 'message': f'Failed to download: HTTP {response.status_code}'})
                continue

            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                temp_file.write(response.content)
                temp_path = temp_file.name

            safe_filename = secure_filename(filename)
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
            results.append({'url': url, 'filename': web_filename, 'status': 'success', 'metadata': metadata})

        except Exception as e:
            logging.error(f"Error importing from URL {url}: {str(e)}")
            logging.error(traceback.format_exc())
            results.append({'url': url, 'status': 'error', 'message': str(e)})

    return results
