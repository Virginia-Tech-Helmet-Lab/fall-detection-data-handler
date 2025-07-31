"""Track normalization progress."""

import time
from datetime import datetime

# Simple in-memory progress tracking
# In production, use Redis or database
progress_data = {}

def start_progress(task_id, total_videos):
    """Start tracking progress for a task."""
    progress_data[task_id] = {
        'total': total_videos,
        'processed': 0,
        'current_video': None,
        'errors': [],
        'started_at': datetime.now().isoformat(),
        'status': 'processing'
    }
    
def update_progress(task_id, processed, current_video=None):
    """Update progress for a task."""
    if task_id in progress_data:
        progress_data[task_id]['processed'] = processed
        progress_data[task_id]['current_video'] = current_video
        progress_data[task_id]['last_update'] = datetime.now().isoformat()
        
def add_error(task_id, error_msg):
    """Add an error to the task."""
    if task_id in progress_data:
        progress_data[task_id]['errors'].append(error_msg)
        
def complete_progress(task_id):
    """Mark task as complete."""
    if task_id in progress_data:
        progress_data[task_id]['status'] = 'completed'
        progress_data[task_id]['completed_at'] = datetime.now().isoformat()
        
def get_progress(task_id):
    """Get progress for a task."""
    return progress_data.get(task_id, None)