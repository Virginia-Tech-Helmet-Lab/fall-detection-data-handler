"""Review and Quality Control Routes"""

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import ReviewQueue, ReviewStatus, User, UserRole, Video
from ..services.review import ReviewService
from ..database import db
import logging

logger = logging.getLogger(__name__)

# Create blueprint
review_bp = Blueprint('review', __name__, url_prefix='/api/review')

def require_reviewer():
    """Decorator to require reviewer role"""
    def decorator(f):
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                # Try JWT authentication
                user_id = get_jwt_identity()
                if not user_id:
                    return jsonify({'error': 'Authentication required'}), 401
                user = User.query.get(int(user_id))
            else:
                user = current_user
            
            # Handle both enum and string role values
            user_role = user.role.value if hasattr(user.role, 'value') else user.role
            allowed_roles = ['REVIEWER', 'ADMIN']
            
            if not user or user_role not in allowed_roles:
                return jsonify({'error': 'Reviewer access required'}), 403
            
            return f(*args, **kwargs)
        
        decorated_function.__name__ = f.__name__
        return decorated_function
    return decorator

@review_bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_for_review():
    """Submit a video for review"""
    try:
        user_id = get_jwt_identity()
        data = request.json
        
        video_id = data.get('video_id')
        if not video_id:
            return jsonify({'error': 'video_id required'}), 400
        
        # Submit for review
        review = ReviewService.submit_for_review(
            video_id=video_id,
            annotator_id=int(user_id),
            auto_assign=data.get('auto_assign', True)
        )
        
        return jsonify({
            'message': 'Video submitted for review',
            'review': review.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Error submitting for review: {str(e)}")
        return jsonify({'error': 'Failed to submit for review'}), 500

@review_bp.route('/queue', methods=['GET'])
@jwt_required()
def get_review_queue():
    """Get review queue with filters"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        
        # Get query parameters
        project_id = request.args.get('project_id', type=int)
        status = request.args.get('status')
        my_reviews_only = request.args.get('my_reviews_only', 'false').lower() == 'true'
        
        # Convert status string to enum
        status_enum = None
        if status:
            try:
                status_enum = ReviewStatus(status)
            except ValueError:
                return jsonify({'error': f'Invalid status: {status}'}), 400
        
        # Get reviews
        user_role = user.role.value if hasattr(user.role, 'value') else user.role
        
        if my_reviews_only or user_role == 'ANNOTATOR':
            # Annotators only see their own submissions
            reviews = ReviewService.get_review_queue(
                reviewer_id=int(user_id) if user_role == 'REVIEWER' else None,
                project_id=project_id,
                status=status_enum
            )
        else:
            # Reviewers and admins see all
            reviews = ReviewService.get_review_queue(
                project_id=project_id,
                status=status_enum
            )
        
        return jsonify({
            'reviews': reviews,
            'total': len(reviews)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting review queue: {str(e)}", exc_info=True)
        return jsonify({'error': f'Failed to get review queue: {str(e)}'}), 500

@review_bp.route('/<int:review_id>/start', methods=['POST'])
@jwt_required()
@require_reviewer()
def start_review(review_id):
    """Start reviewing a video"""
    try:
        user_id = get_jwt_identity()
        
        review = ReviewService.start_review(
            review_id=review_id,
            reviewer_id=int(user_id)
        )
        
        return jsonify({
            'message': 'Review started',
            'review': review.to_dict()
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Error starting review: {str(e)}")
        return jsonify({'error': 'Failed to start review'}), 500

@review_bp.route('/<int:review_id>/complete', methods=['POST'])
@jwt_required()
@require_reviewer()
def complete_review(review_id):
    """Complete a review with feedback"""
    try:
        user_id = get_jwt_identity()
        data = request.json
        
        # Validate required fields
        status = data.get('status')
        if not status:
            return jsonify({'error': 'status required'}), 400
        
        try:
            status_enum = ReviewStatus(status)
        except ValueError:
            return jsonify({'error': f'Invalid status: {status}'}), 400
        
        quality_score = data.get('quality_score', 3.0)
        if not 0 <= quality_score <= 5:
            return jsonify({'error': 'quality_score must be between 0 and 5'}), 400
        
        review = ReviewService.complete_review(
            review_id=review_id,
            reviewer_id=int(user_id),
            status=status_enum,
            quality_score=quality_score,
            review_comments=data.get('review_comments', ''),
            feedback_items=data.get('feedback_items', [])
        )
        
        return jsonify({
            'message': 'Review completed',
            'review': review.to_dict()
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Error completing review: {str(e)}")
        return jsonify({'error': 'Failed to complete review'}), 500

@review_bp.route('/<int:review_id>/annotations', methods=['GET'])
@jwt_required()
def get_review_annotations(review_id):
    """Get annotations for a video under review"""
    try:
        # Get the review
        review = ReviewQueue.query.get(review_id)
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        # Check access
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        
        user_role = user.role.value if hasattr(user.role, 'value') else user.role
        if user_role == 'ANNOTATOR' and review.annotator_id != int(user_id):
            return jsonify({'error': 'Access denied'}), 403
        
        annotations = ReviewService.get_annotations_for_review(review.video_id)
        
        return jsonify({
            'video_id': review.video_id,
            'annotations': annotations
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting review annotations: {str(e)}")
        return jsonify({'error': 'Failed to get annotations'}), 500

@review_bp.route('/statistics', methods=['GET'])
@jwt_required()
def get_review_statistics():
    """Get review statistics"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        
        # Get query parameters
        project_id = request.args.get('project_id', type=int)
        target_user_id = request.args.get('user_id', type=int)
        user_type = request.args.get('user_type', 'annotator')
        
        # Check permissions
        if target_user_id and target_user_id != int(user_id):
            user_role = user.role.value if hasattr(user.role, 'value') else user.role
            if user_role not in ['ADMIN', 'REVIEWER']:
                return jsonify({'error': 'Access denied'}), 403
        
        stats = ReviewService.get_review_statistics(
            project_id=project_id,
            user_id=target_user_id or int(user_id),
            user_type=user_type
        )
        
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"Error getting review statistics: {str(e)}")
        return jsonify({'error': 'Failed to get statistics'}), 500

@review_bp.route('/feedback-types', methods=['GET'])
def get_feedback_types():
    """Get available feedback types and severities"""
    return jsonify({
        'issue_types': [
            'missed_event',
            'incorrect_timing',
            'wrong_label',
            'inaccurate_bbox',
            'missing_bbox',
            'extra_annotation',
            'unclear_event',
            'technical_issue'
        ],
        'severities': [
            'minor',
            'major',
            'critical'
        ]
    }), 200