import os
import subprocess
import shutil
import sys
import logging
import tempfile
import cv2


def save_file(file, upload_folder):
    """Save an uploaded file (FastAPI UploadFile) to disk."""
    os.makedirs(upload_folder, exist_ok=True)
    filename = file.filename
    filepath = os.path.join(upload_folder, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return filepath


def extract_metadata(video_path):
    """Extract video metadata using ffprobe with OpenCV fallback."""
    if not shutil.which('ffprobe'):
        logging.warning("FFprobe not found. Using OpenCV for metadata extraction.")
        try:
            cap = cv2.VideoCapture(video_path)
            if cap.isOpened():
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                framerate = cap.get(cv2.CAP_PROP_FPS)
                frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                duration = frame_count / framerate if framerate > 0 else 0
                cap.release()
                return {
                    'resolution': f"{width}x{height}",
                    'width': width, 'height': height,
                    'framerate': round(framerate, 2) if framerate > 0 else 0,
                    'duration': duration,
                }
        except Exception as e:
            logging.error(f"Error using OpenCV for metadata: {str(e)}")
        return {'resolution': 'unknown', 'width': 0, 'height': 0, 'framerate': 0, 'duration': 0}

    try:
        cmd = [
            'ffprobe', '-v', 'error', '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height,avg_frame_rate,duration',
            '-of', 'default=noprint_wrappers=1', video_path
        ]
        output = subprocess.check_output(cmd, stderr=subprocess.STDOUT, universal_newlines=True, timeout=10)

        metadata = {}
        for line in output.split('\n'):
            if '=' in line:
                key, value = line.split('=', 1)
                metadata[key.strip()] = value.strip()

        width = int(metadata.get('width', 0))
        height = int(metadata.get('height', 0))
        resolution = f"{width}x{height}" if width and height else "unknown"

        framerate = metadata.get('avg_frame_rate', '0/1')
        if '/' in framerate:
            num, den = map(int, framerate.split('/'))
            framerate = round(num / den, 2) if den != 0 else 0
        else:
            try:
                framerate = float(framerate)
            except ValueError:
                framerate = 0

        try:
            duration = float(metadata.get('duration', 0))
        except ValueError:
            duration = 0

        return {'resolution': resolution, 'width': width, 'height': height, 'framerate': framerate, 'duration': duration}
    except (subprocess.CalledProcessError, FileNotFoundError):
        try:
            cap = cv2.VideoCapture(video_path)
            if cap.isOpened():
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                framerate = cap.get(cv2.CAP_PROP_FPS)
                frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                duration = frame_count / framerate if framerate > 0 else 0
                cap.release()
                return {
                    'resolution': f"{width}x{height}",
                    'width': width, 'height': height,
                    'framerate': round(framerate, 2) if framerate > 0 else 0,
                    'duration': duration,
                }
        except Exception:
            pass
        return {'resolution': 'unknown', 'width': 0, 'height': 0, 'framerate': 0, 'duration': 0}
    except Exception:
        return {'resolution': 'unknown', 'width': 0, 'height': 0, 'framerate': 0, 'duration': 0}


def ensure_browser_compatible(filename, upload_folder):
    """Ensure video is browser-compatible (H.264). Returns the filename to use."""
    if not shutil.which('ffmpeg'):
        logging.warning("FFmpeg not found. Video conversion skipped.")
        print("WARNING: FFmpeg not installed. Videos may not play in browser.", file=sys.stderr)
        return filename

    input_path = os.path.join(upload_folder, filename)

    try:
        cmd = [
            'ffprobe', '-v', 'error', '-select_streams', 'v:0',
            '-show_entries', 'stream=codec_name',
            '-of', 'default=noprint_wrappers=1:nokey=1', input_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        codec = result.stdout.strip()
        if codec == 'h264':
            return filename
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    base_name = os.path.splitext(filename)[0]
    compatible_filename = f"web_{base_name}.mp4"
    output_path = os.path.join(upload_folder, compatible_filename)

    try:
        cmd = [
            'ffmpeg', '-i', input_path,
            '-c:v', 'libx264', '-c:a', 'aac',
            '-strict', 'experimental', '-movflags', 'faststart',
            '-y', '-loglevel', 'error', output_path
        ]
        subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=60)
        logging.info(f"Successfully created browser-compatible version: {compatible_filename}")
        return compatible_filename
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError) as e:
        logging.error(f"FFmpeg conversion failed: {e}")
        return filename


def extract_video_frame(filename, frame_number, upload_folder, thumbnail_cache, output_size=(160, 120)):
    """Extract a frame from a video file and cache it."""
    temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
    output_path = temp_file.name
    temp_file.close()

    try:
        input_path = os.path.join(upload_folder, filename)
        if not os.path.exists(input_path):
            return None

        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            return None

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if frame_number < 0 or frame_number >= total_frames:
            cap.release()
            return None

        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        ret, frame = cap.read()
        cap.release()
        if not ret:
            return None

        if output_size:
            frame = cv2.resize(frame, output_size)
        cv2.imwrite(output_path, frame)

        os.makedirs(thumbnail_cache, exist_ok=True)
        cache_filename = f"frame_{os.path.basename(filename).split('.')[0]}_{frame_number}.jpg"
        cache_path = os.path.join(thumbnail_cache, cache_filename)

        try:
            shutil.copy(output_path, cache_path)
            os.unlink(output_path)
            return cache_path
        except Exception:
            return output_path

    except Exception as e:
        logging.error(f"Error extracting frame: {str(e)}")
        if os.path.exists(output_path):
            os.unlink(output_path)
        return None
