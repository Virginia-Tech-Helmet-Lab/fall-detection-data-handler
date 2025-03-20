import subprocess
import os
import logging

def normalize_video(input_path, output_path, resolution='224x224', framerate=30, 
                   brightness=1.0, contrast=1.0, saturation=1.0):
    """
    Normalize a video using FFmpeg with the specified parameters.
    
    Args:
        input_path: Path to the input video file
        output_path: Path where the normalized video will be saved
        resolution: Target resolution as 'WIDTHxHEIGHT'
        framerate: Target frame rate in fps
        brightness: Brightness adjustment factor (1.0 is unchanged)
        contrast: Contrast adjustment factor (1.0 is unchanged)
        saturation: Saturation adjustment factor (1.0 is unchanged)
    
    Returns:
        True if successful, raises an exception otherwise
    """
    try:
        # Parse resolution
        width, height = resolution.split('x')
        
        # Build FFmpeg command
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-vf', f'scale={width}:{height},fps={framerate},eq=brightness={brightness-1}:contrast={contrast}:saturation={saturation}',
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-c:a', 'aac',
            '-strict', 'experimental',
            '-b:a', '128k',
            '-y',  # Overwrite output file if it exists
            output_path
        ]
        
        # Execute FFmpeg command
        subprocess.run(cmd, check=True, capture_output=True)
        return True
        
    except subprocess.CalledProcessError as e:
        logging.error(f"FFmpeg error: {e.stderr.decode()}")
        raise RuntimeError(f"Failed to normalize video: {e.stderr.decode()}")
    except Exception as e:
        logging.error(f"Normalization error: {str(e)}")
        raise RuntimeError(f"Failed to normalize video: {str(e)}")

def generate_preview(input_path, output_path, settings):
    """
    Generate a shorter preview version of the video with normalization settings applied
    """
    try:
        # Parse settings
        resolution = settings.get('resolution', '224x224')
        width, height = resolution.split('x')
        framerate = int(settings.get('framerate', 30))
        brightness = float(settings.get('brightness', 1.0))
        contrast = float(settings.get('contrast', 1.0))
        saturation = float(settings.get('saturation', 1.0))
        
        # For preview, we'll take a shorter clip (first 5 seconds)
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-ss', '0',  # Start from beginning
            '-t', '5',   # Take only 5 seconds
            '-vf', f'scale={width}:{height},fps={framerate},eq=brightness={brightness-1}:contrast={contrast}:saturation={saturation}',
            '-c:v', 'libx264',
            '-preset', 'fast',  # Use fast preset for quicker preview generation
            '-c:a', 'aac',
            '-strict', 'experimental',
            '-b:a', '128k',
            '-y',
            output_path
        ]
        
        # Execute FFmpeg command
        subprocess.run(cmd, check=True, capture_output=True)
        return True
        
    except subprocess.CalledProcessError as e:
        logging.error(f"FFmpeg preview generation error: {e.stderr.decode()}")
        raise RuntimeError(f"Failed to generate preview: {e.stderr.decode()}")
    except Exception as e:
        logging.error(f"Preview generation error: {str(e)}")
        raise RuntimeError(f"Failed to generate preview: {str(e)}")
