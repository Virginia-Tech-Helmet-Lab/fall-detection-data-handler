"""Image server routes (absorbed from standalone image_server.py)."""

import os
import io

import cv2
import numpy as np
from fastapi import APIRouter
from fastapi.responses import Response

from ..config import settings
from ..services.video_processing import extract_video_frame

router = APIRouter()


@router.get("/images/{video_filename:path}/{frame_number}")
def serve_frame(video_filename: str, frame_number: int):
    """Extract and serve a single frame from a video as JPEG."""
    thumbnail_path = extract_video_frame(
        video_filename, frame_number,
        settings.upload_folder, settings.thumbnail_cache,
    )
    if thumbnail_path and os.path.exists(thumbnail_path):
        with open(thumbnail_path, "rb") as f:
            return Response(content=f.read(), media_type="image/jpeg")

    # Fallback: return a small error image
    img = np.zeros((120, 160, 3), dtype=np.uint8)
    img[:, :, 2] = 128
    cv2.putText(img, "No frame", (30, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    _, buffer = cv2.imencode('.jpg', img)
    return Response(content=buffer.tobytes(), media_type="image/jpeg")
