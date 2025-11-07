import os
import subprocess
import json
from flask import current_app
import logging
import cv2
import tempfile
import sys

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'backend', 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def save_file(file, upload_folder=None):
    """Save uploaded file to the uploads folder."""
    if upload_folder is None:
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    
    # Ensure the upload folder exists
    os.makedirs(upload_folder, exist_ok=True)
    
    filename = file.filename
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)
    return filepath

def extract_metadata(video_path):
    """Extract video metadata using ffprobe."""
    import shutil
    
    # Check if FFmpeg is available
    if not shutil.which('ffprobe'):
        logging.warning("FFprobe not found. Using OpenCV for metadata extraction.")
        # Fallback to OpenCV for basic metadata
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
                    'width': width,
                    'height': height,
                    'framerate': round(framerate, 2) if framerate > 0 else 0,
                    'duration': duration
                }
        except Exception as e:
            logging.error(f"Error using OpenCV for metadata: {str(e)}")
            return {
                'resolution': 'unknown',
                'width': 0,
                'height': 0,
                'framerate': 0,
                'duration': 0
            }
    
    try:
        # Use ffprobe to get video information
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height,avg_frame_rate,duration',
            '-of', 'default=noprint_wrappers=1',
            video_path
        ]
        
        output = subprocess.check_output(cmd, stderr=subprocess.STDOUT, universal_newlines=True, timeout=10)
        
        # Parse the output
        metadata = {}
        for line in output.split('\n'):
            if '=' in line:
                key, value = line.split('=', 1)
                metadata[key.strip()] = value.strip()
        
        # Convert and format the values
        width = int(metadata.get('width', 0))
        height = int(metadata.get('height', 0))
        resolution = f"{width}x{height}" if width and height else "unknown"
        
        # Parse framerate which might be in format "30000/1001"
        framerate = metadata.get('avg_frame_rate', '0/1')
        if '/' in framerate:
            num, den = map(int, framerate.split('/'))
            framerate = round(num / den, 2) if den != 0 else 0
        else:
            try:
                framerate = float(framerate)
            except ValueError:
                framerate = 0
        
        # Duration might be a string
        try:
            duration = float(metadata.get('duration', 0))
        except ValueError:
            duration = 0
        
        return {
            'resolution': resolution,
            'width': width,
            'height': height,
            'framerate': framerate,
            'duration': duration
        }
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        logging.error(f"Metadata extraction error: {str(e)}")
        # Try OpenCV as fallback
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
                    'width': width,
                    'height': height,
                    'framerate': round(framerate, 2) if framerate > 0 else 0,
                    'duration': duration
                }
        except:
            pass
        
        # Return default values instead of raising an error
        return {
            'resolution': 'unknown',
            'width': 0,
            'height': 0,
            'framerate': 0,
            'duration': 0
        }
    except Exception as e:
        logging.error(f"Unexpected error during metadata extraction: {str(e)}")
        return {
            'resolution': 'unknown',
            'width': 0,
            'height': 0,
            'framerate': 0,
            'duration': 0
        }

def ensure_browser_compatible(filename):
    """
    Ensures a video is in a browser-compatible format (MP4 with H.264 video codec)
    Returns the path to the browser-compatible version
    """
    import shutil
    import logging
    
    # Process the video normally
    # logging.info(f"Skipping video conversion for testing: {filename}")
    # return filename
    
    # Check if FFmpeg is available
    if not shutil.which('ffmpeg'):
        logging.warning("FFmpeg not found. Video conversion skipped. Install FFmpeg for better compatibility.")
        print("WARNING: FFmpeg not installed. Videos may not play in browser. Install from: https://ffmpeg.org/download.html", file=sys.stderr)
        return filename
    
    upload_folder = current_app.config['UPLOAD_FOLDER']
    input_path = os.path.join(upload_folder, filename)
    
    # Check if the file is already in a compatible format
    try:
        # Use ffprobe to check the format
        cmd = [
            'ffprobe', 
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=codec_name',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            input_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        codec = result.stdout.strip()
        
        # If it's already H.264, we don't need to convert it
        if codec == 'h264':
            return filename
    except (subprocess.CalledProcessError, FileNotFoundError):
        # If ffprobe fails, we'll convert the file to be safe
        pass
    
    # Create a browser-compatible version
    base_name = os.path.splitext(filename)[0]
    compatible_filename = f"web_{base_name}.mp4"
    output_path = os.path.join(upload_folder, compatible_filename)
    
    try:
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-c:v', 'libx264',  # Use H.264 video codec
            '-c:a', 'aac',      # Use AAC audio codec
            '-strict', 'experimental',
            '-movflags', 'faststart',  # Optimize for web streaming
            '-y',               # Overwrite if exists
            '-loglevel', 'error',  # Only show errors to prevent buffer overflow
            output_path
        ]
        result = subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=60)
        logging.info(f"Successfully created browser-compatible version: {compatible_filename}")
        return compatible_filename
    except subprocess.TimeoutExpired:
        logging.error(f"FFmpeg timeout after 60 seconds converting {filename}")
        # Return original filename if conversion times out
        return filename
    except subprocess.CalledProcessError as e:
        logging.error(f"FFmpeg error creating browser-compatible version: {e.stderr}")
        # Return original filename if conversion fails
        return filename
    except FileNotFoundError as e:
        logging.error(f"FFmpeg not found: {str(e)}")
        # Return original filename if conversion fails
        return filename

def extract_video_frame(filename, frame_number, output_size=(160, 120)):
    """Extract a frame from a video file"""
    from flask import current_app
    import tempfile
    import logging
    import os
    
    # Log the request
    print(f">>> EXTRACTING FRAME {frame_number} FROM {filename}", file=sys.stderr)
    
    # Create a proper temp file with .jpg extension
    temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
    output_path = temp_file.name
    temp_file.close()
    
    try:
        # Get uploads folder - handle if outside app context
        try:
            upload_folder = current_app.config.get('UPLOAD_FOLDER')
        except RuntimeError:
            # Outside app context - use default
            upload_folder = os.path.join(os.getcwd(), 'uploads')
        
        print(f">>> UPLOAD FOLDER: {upload_folder}", file=sys.stderr)
        input_path = os.path.join(upload_folder, filename)
        print(f">>> INPUT PATH: {input_path}", file=sys.stderr)
        
        if not os.path.exists(input_path):
            print(f">>> INPUT VIDEO DOES NOT EXIST", file=sys.stderr)
            return None
            
        # Open the video file
        cap = cv2.VideoCapture(input_path)
        
        # Check if the video opened successfully
        if not cap.isOpened():
            print(f">>> COULD NOT OPEN VIDEO", file=sys.stderr)
            return None
        
        # Get video properties for better debugging
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        print(f">>> VIDEO HAS {total_frames} FRAMES AT {fps} FPS", file=sys.stderr)
        
        # Check if frame number is valid
        if frame_number < 0 or frame_number >= total_frames:
            print(f">>> FRAME {frame_number} OUT OF RANGE (0-{total_frames-1})", file=sys.stderr)
            return None
        
        # Get the frame rate
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            fps = 30  # Default to 30fps if unable to determine
        
        # Set position to the target frame
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        
        # Read the frame
        ret, frame = cap.read()
        if not ret:
            logging.error(f"Failed to read frame {frame_number} from {input_path}")
            cap.release()
            return None
        
        # Resize the frame
        if output_size:
            frame = cv2.resize(frame, output_size)
        
        # Save the frame as JPEG
        cv2.imwrite(output_path, frame)
        
        # Release the video
        cap.release()
        
        # For the cache directory, handle the app context issue
        try:
            cache_dir = current_app.config.get('THUMBNAIL_CACHE')
        except RuntimeError:
            cache_dir = os.path.join(upload_folder, 'thumbnails')
            
        os.makedirs(cache_dir, exist_ok=True)
        
        # Create a predictable filename for caching
        cache_filename = f"frame_{os.path.basename(filename).split('.')[0]}_{frame_number}.jpg"
        cache_path = os.path.join(cache_dir, cache_filename)
        
        # Copy the temporary file to the cache location
        try:
            import shutil
            shutil.copy(output_path, cache_path)
            # Clean up temp file
            os.unlink(output_path)
            return cache_path
        except Exception as e:
            logging.error(f"Error copying thumbnail to cache: {str(e)}")
            # If copying fails, return the temporary file path
            return output_path
        
    except Exception as e:
        logging.error(f"Error extracting frame: {str(e)}")
        if os.path.exists(output_path):
            os.unlink(output_path)
        return None
