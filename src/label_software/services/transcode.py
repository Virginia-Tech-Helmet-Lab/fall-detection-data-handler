"""Lazy AVI/non-H264 → H.264 MP4 transcoder with disk cache."""

import hashlib
import os
import subprocess

from ..config import settings

H264_PLAYABLE_EXTENSIONS = {'.mp4'}  # Only MP4 with h264 is reliably browser-playable


def get_playable_path(video_path: str) -> str:
    """Return a browser-playable path for the video. Transcodes and caches if needed."""
    ext = os.path.splitext(video_path)[1].lower()

    if ext in H264_PLAYABLE_EXTENSIONS:
        return video_path

    # Check cache
    cache_dir = settings.transcode_cache
    os.makedirs(cache_dir, exist_ok=True)
    cache_key = hashlib.md5(video_path.encode()).hexdigest()
    cached_path = os.path.join(cache_dir, f"{cache_key}.mp4")

    if os.path.exists(cached_path):
        return cached_path

    # Transcode
    try:
        subprocess.run(
            [
                "ffmpeg", "-i", video_path,
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "aac", "-movflags", "faststart",
                "-y", cached_path,
            ],
            check=True,
            capture_output=True,
            timeout=300,
        )
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        # If transcode fails, return original path and let the browser try
        return video_path

    return cached_path
