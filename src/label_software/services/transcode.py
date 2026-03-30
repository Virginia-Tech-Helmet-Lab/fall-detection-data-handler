"""Lazy non-H264 → H.264 MP4 transcoder with disk cache."""

import hashlib
import os
import shutil
import subprocess

from ..config import settings

# Try to find ffmpeg - check common HPC module paths
FFMPEG_BIN = shutil.which("ffmpeg") or "/apps/arch/software/FFmpeg/7.1.2-GCCcore-14.3.0/bin/ffmpeg"


def _is_h264(video_path: str) -> bool:
    """Check if a video file is already H.264 encoded."""
    try:
        result = subprocess.run(
            [FFMPEG_BIN, "-i", video_path],
            capture_output=True, text=True, timeout=10,
        )
        # ffmpeg prints codec info to stderr
        return "h264" in result.stderr.lower()
    except Exception:
        return False


def get_playable_path(video_path: str) -> str:
    """Return a browser-playable path for the video. Transcodes and caches if needed."""
    if not os.path.isfile(video_path):
        return video_path

    # Check cache first (fast path)
    cache_dir = settings.transcode_cache
    os.makedirs(cache_dir, exist_ok=True)
    cache_key = hashlib.md5(video_path.encode()).hexdigest()
    cached_path = os.path.join(cache_dir, f"{cache_key}.mp4")

    if os.path.exists(cached_path) and os.path.getsize(cached_path) > 0:
        return cached_path

    # Check if already H.264 -- no transcode needed
    if _is_h264(video_path):
        return video_path

    # Transcode to H.264
    if not os.path.isfile(FFMPEG_BIN):
        return video_path

    try:
        subprocess.run(
            [
                FFMPEG_BIN, "-i", video_path,
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "aac", "-movflags", "faststart",
                "-y", cached_path,
            ],
            check=True,
            capture_output=True,
            timeout=300,
        )
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        # Clean up partial file
        if os.path.exists(cached_path):
            os.remove(cached_path)
        return video_path

    return cached_path
