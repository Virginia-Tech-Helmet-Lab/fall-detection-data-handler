"""Simple videos endpoint to list uploaded videos."""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from .models import Video, User, UserRole, db

def register_videos_route(app):
    """Register videos route directly on the app."""
    
    @app.route('/api/videos', methods=['GET'])
    @jwt_required()
    def list_videos():
        try:
            # Get current user
            current_user_id = get_jwt_identity()
            current_user = User.query.get(int(current_user_id))
            user_role = current_user.role.value if hasattr(current_user.role, 'value') else current_user.role
            
            # Get filter parameters
            project_id = request.args.get('project_id', type=int)
            assigned_to = request.args.get('assigned_to', type=int)
            unassigned = request.args.get('unassigned', 'false').lower() == 'true'
            
            # Start with base query
            query = Video.query
            
            # Filter by project if specified
            if project_id:
                query = query.filter_by(project_id=project_id)
            
            # Filter by assignment
            if unassigned:
                query = query.filter(Video.assigned_to.is_(None))
            elif assigned_to:
                query = query.filter_by(assigned_to=assigned_to)
            elif user_role == 'annotator':
                # Annotators only see their assigned videos
                query = query.filter_by(assigned_to=current_user_id)
            
            # Get videos
            videos = query.all()
            
            # Convert to dict
            videos_data = []
            for video in videos:
                video_dict = {
                    'video_id': video.video_id,
                    'filename': video.filename,
                    'resolution': video.resolution,
                    'framerate': video.framerate,
                    'duration': video.duration,
                    'import_date': video.import_date.isoformat() if video.import_date else None,
                    'status': video.status,
                    'is_completed': video.is_completed,
                    'project_id': video.project_id,
                    'assigned_to': video.assigned_to,
                    'assignee_name': video.assignee.full_name if video.assignee else None
                }
                videos_data.append(video_dict)
            
            return jsonify({
                'videos': videos_data,
                'count': len(videos_data)
            })
            
        except Exception as e:
            print(f"Error listing videos: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500
    
    print(">>> Videos route registered at /api/videos")