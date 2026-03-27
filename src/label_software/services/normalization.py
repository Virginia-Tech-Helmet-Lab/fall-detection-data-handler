import subprocess
import logging
import shutil


def normalize_video(input_path, output_path, resolution='224x224', framerate=30,
                    brightness=1.0, contrast=1.0, saturation=1.0):
    if not shutil.which('ffmpeg'):
        logging.warning("FFmpeg not found. Video normalization is not available.")
        try:
            shutil.copy2(input_path, output_path)
            return True
        except Exception as e:
            logging.error(f"Error copying file: {str(e)}")
            raise RuntimeError("FFmpeg is required for video normalization. Please install FFmpeg.")

    try:
        width, height = resolution.split('x')
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-vf', f'scale={width}:{height},fps={framerate},eq=brightness={brightness-1}:contrast={contrast}:saturation={saturation}',
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-c:a', 'aac',
            '-strict', 'experimental',
            '-b:a', '128k',
            '-y',
            output_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError as e:
        logging.error(f"FFmpeg error: {e.stderr.decode()}")
        raise RuntimeError(f"Failed to normalize video: {e.stderr.decode()}")
    except Exception as e:
        logging.error(f"Normalization error: {str(e)}")
        raise RuntimeError(f"Failed to normalize video: {str(e)}")


def generate_preview(input_path, output_path, settings):
    if not shutil.which('ffmpeg'):
        raise RuntimeError("FFmpeg is required for preview generation. Please install FFmpeg.")

    try:
        resolution = settings.get('resolution', '224x224')
        width, height = resolution.split('x')
        framerate = int(settings.get('framerate', 30))
        brightness = float(settings.get('brightness', 1.0))
        contrast = float(settings.get('contrast', 1.0))
        saturation = float(settings.get('saturation', 1.0))

        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-ss', '0',
            '-t', '5',
            '-vf', f'scale={width}:{height},fps={framerate},eq=brightness={brightness-1}:contrast={contrast}:saturation={saturation}',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-c:a', 'aac',
            '-strict', 'experimental',
            '-b:a', '128k',
            '-y',
            output_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError as e:
        logging.error(f"FFmpeg preview generation error: {e.stderr.decode()}")
        raise RuntimeError(f"Failed to generate preview: {e.stderr.decode()}")
    except Exception as e:
        logging.error(f"Preview generation error: {str(e)}")
        raise RuntimeError(f"Failed to generate preview: {str(e)}")
