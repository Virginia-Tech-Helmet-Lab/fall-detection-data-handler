"""Analytics API Routes"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import User, UserRole
from ..services.analytics import AnalyticsService
import logging

logger = logging.getLogger(__name__)

# Create blueprint
analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

def require_admin_or_reviewer():
    """Helper to check if user is admin or reviewer"""
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        logger.error(f"User not found for id: {user_id}")
        return None
    
    user_role = user.role.value if hasattr(user.role, 'value') else user.role
    logger.info(f"User {user.username} has role: {user_role} (type: {type(user_role)})")
    
    if user_role not in ['ADMIN', 'REVIEWER']:
        logger.warning(f"Access denied for user {user.username} with role {user_role}")
        return None
    
    return user

@analytics_bp.route('/user/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_analytics(user_id):
    """Get performance analytics for a specific user"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(int(current_user_id))
        
        # Users can view their own analytics, admins/reviewers can view anyone's
        current_role = current_user.role.value if hasattr(current_user.role, 'value') else current_user.role
        if int(current_user_id) != user_id and current_role not in ['ADMIN', 'REVIEWER']:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get query parameters
        project_id = request.args.get('project_id', type=int)
        days = request.args.get('days', 30, type=int)
        
        # Get analytics
        analytics = AnalyticsService.get_user_performance(
            user_id=user_id,
            project_id=project_id,
            days=days
        )
        
        return jsonify(analytics), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        logger.error(f"Error getting user analytics: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to get user analytics'}), 500

@analytics_bp.route('/project/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project_analytics(project_id):
    """Get comprehensive analytics for a project"""
    try:
        # Any authenticated user can view project analytics
        analytics = AnalyticsService.get_project_analytics(project_id)
        return jsonify(analytics), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        logger.error(f"Error getting project analytics: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to get project analytics'}), 500

@analytics_bp.route('/overview', methods=['GET'])
@jwt_required()
def get_system_overview():
    """Get system-wide analytics overview"""
    try:
        # Get current user to check role on frontend
        user_id = get_jwt_identity()
        current_user = User.query.get(int(user_id))
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Let frontend handle role restrictions, backend provides data
        user_role = current_user.role.value if hasattr(current_user.role, 'value') else current_user.role
        logger.info(f"System overview requested by user {current_user.username} with role {user_role}")
        
        overview = AnalyticsService.get_system_overview()
        return jsonify(overview), 200
        
    except Exception as e:
        logger.error(f"Error getting system overview: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to get system overview'}), 500

@analytics_bp.route('/export/<int:project_id>', methods=['GET'])
@jwt_required()
def export_project_data(project_id):
    """Generate comprehensive export data for a project"""
    try:
        # Get query parameters
        include_reviews = request.args.get('include_reviews', 'true').lower() == 'true'
        
        # Generate export report
        export_data = AnalyticsService.generate_export_report(
            project_id=project_id,
            include_reviews=include_reviews
        )
        
        return jsonify(export_data), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        logger.error(f"Error generating export: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to generate export'}), 500

@analytics_bp.route('/team/<int:project_id>', methods=['GET'])
@jwt_required()
def get_team_performance(project_id):
    """Get team performance metrics for a project"""
    try:
        # This is a subset of project analytics focused on team
        analytics = AnalyticsService.get_project_analytics(project_id)
        
        # Extract just team-related data
        team_data = {
            'project': analytics['project'],
            'team_stats': analytics['team_stats'],
            'overall_progress': {
                'videos': analytics['video_stats'],
                'annotations': analytics['annotation_stats']
            }
        }
        
        return jsonify(team_data), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        logger.error(f"Error getting team performance: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to get team performance'}), 500

@analytics_bp.route('/quality/<int:project_id>', methods=['GET'])
@jwt_required()
def get_quality_metrics(project_id):
    """Get quality metrics from reviews"""
    try:
        # Get project analytics and extract quality data
        analytics = AnalyticsService.get_project_analytics(project_id)
        
        quality_data = {
            'project': analytics['project'],
            'quality_metrics': analytics['quality_metrics'],
            'video_completion': analytics['video_stats']['completion_rate'],
            'annotations_per_video': analytics['annotation_stats']['average_per_video']
        }
        
        return jsonify(quality_data), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        logger.error(f"Error getting quality metrics: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to get quality metrics'}), 500