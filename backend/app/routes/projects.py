"""
Project management API endpoints
"""

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from ..models import User, UserRole, ProjectStatus, ProjectMemberRole
from ..services.project import ProjectService
from ..auth import jwt_role_required
import logging

logger = logging.getLogger(__name__)

# Create blueprint
projects_bp = Blueprint('projects', __name__, url_prefix='/api/projects')

@projects_bp.route('', methods=['GET'])
@jwt_required()
def get_projects():
    """Get all projects accessible to the current user"""
    try:
        user_id = get_jwt_identity()
        include_archived = request.args.get('include_archived', 'false').lower() == 'true'
        
        projects = ProjectService.get_user_projects(user_id, include_archived)
        
        return jsonify({
            'projects': [p.to_dict() for p in projects],
            'count': len(projects)
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching projects: {str(e)}")
        return jsonify({'error': 'Failed to fetch projects'}), 500

@projects_bp.route('', methods=['POST'])
@jwt_role_required('admin')
def create_project():
    """Create a new project (admin only)"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Project name is required'}), 400
        
        # Parse deadline if provided
        deadline = None
        if data.get('deadline'):
            try:
                deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
            except:
                return jsonify({'error': 'Invalid deadline format'}), 400
        
        # Create project
        project, error = ProjectService.create_project(
            user_id=user_id,
            name=data['name'],
            description=data.get('description'),
            deadline=deadline,
            annotation_schema=data.get('annotation_schema'),
            normalization_settings=data.get('normalization_settings')
        )
        
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({
            'message': 'Project created successfully',
            'project': project.to_dict()
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating project: {str(e)}")
        return jsonify({'error': 'Failed to create project'}), 500

@projects_bp.route('/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    """Get project details"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        # Get project
        from ..models import Project
        project = Project.query.get(project_id)
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Check access
        if user.role != UserRole.ADMIN and not project.is_user_member(user_id):
            return jsonify({'error': 'Access denied'}), 403
        
        # Get detailed statistics
        stats = ProjectService.get_project_statistics(project_id)
        
        project_data = project.to_dict()
        project_data['statistics'] = stats
        
        return jsonify(project_data), 200
        
    except Exception as e:
        logger.error(f"Error fetching project: {str(e)}")
        return jsonify({'error': 'Failed to fetch project'}), 500

@projects_bp.route('/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    """Update project details"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        data = request.get_json()
        
        # Get project
        from ..models import Project
        project = Project.query.get(project_id)
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Check permission (admin or project lead)
        user_role = project.get_user_role(user_id)
        if user.role != UserRole.ADMIN and user_role != ProjectMemberRole.LEAD:
            return jsonify({'error': 'Only project leads or admins can update projects'}), 403
        
        # Update fields
        if 'name' in data:
            project.name = data['name']
        if 'description' in data:
            project.description = data['description']
        if 'deadline' in data:
            if data['deadline']:
                project.deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
            else:
                project.deadline = None
        if 'annotation_schema' in data:
            project.annotation_schema = data['annotation_schema']
        if 'normalization_settings' in data:
            project.normalization_settings = data['normalization_settings']
        if 'quality_threshold' in data:
            project.quality_threshold = data['quality_threshold']
        
        project.last_activity = datetime.utcnow()
        
        from ..database import db
        db.session.commit()
        
        return jsonify({
            'message': 'Project updated successfully',
            'project': project.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating project: {str(e)}")
        return jsonify({'error': 'Failed to update project'}), 500

@projects_bp.route('/<int:project_id>/members', methods=['GET'])
@jwt_required()
def get_project_members(project_id):
    """Get project members"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        # Get project
        from ..models import Project
        project = Project.query.get(project_id)
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Check access
        if user.role != UserRole.ADMIN and not project.is_user_member(user_id):
            return jsonify({'error': 'Access denied'}), 403
        
        members = [m.to_dict() for m in project.members]
        
        return jsonify({
            'project_id': project_id,
            'members': members,
            'count': len(members)
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching project members: {str(e)}")
        return jsonify({'error': 'Failed to fetch members'}), 500

@projects_bp.route('/<int:project_id>/members', methods=['POST'])
@jwt_required()
def add_project_member(project_id):
    """Add member to project"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        data = request.get_json()
        
        # Validate input
        if not data.get('user_id'):
            return jsonify({'error': 'user_id is required'}), 400
        
        # Get project
        from ..models import Project
        project = Project.query.get(project_id)
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Check permission (admin or project lead)
        user_role = project.get_user_role(user_id)
        if user.role != UserRole.ADMIN and user_role != ProjectMemberRole.LEAD:
            return jsonify({'error': 'Only project leads or admins can add members'}), 403
        
        # Parse role
        role = ProjectMemberRole.MEMBER
        if data.get('role') == 'lead':
            role = ProjectMemberRole.LEAD
        
        # Add member
        membership, error = ProjectService.add_project_member(
            project_id=project_id,
            user_id=data['user_id'],
            role=role
        )
        
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({
            'message': 'Member added successfully',
            'membership': membership.to_dict()
        }), 201
        
    except Exception as e:
        logger.error(f"Error adding project member: {str(e)}")
        return jsonify({'error': 'Failed to add member'}), 500

@projects_bp.route('/<int:project_id>/videos', methods=['POST'])
@jwt_required()
def assign_videos_to_project(project_id):
    """Assign videos to project"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        data = request.get_json()
        
        # Validate input
        if not data.get('video_ids') or not isinstance(data['video_ids'], list):
            return jsonify({'error': 'video_ids array is required'}), 400
        
        # Get project
        from ..models import Project
        project = Project.query.get(project_id)
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Check permission (admin or project lead)
        user_role = project.get_user_role(user_id)
        if user.role != UserRole.ADMIN and user_role != ProjectMemberRole.LEAD:
            return jsonify({'error': 'Only project leads or admins can assign videos'}), 403
        
        # Assign videos
        count, error = ProjectService.assign_videos_to_project(
            project_id=project_id,
            video_ids=data['video_ids']
        )
        
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({
            'message': f'{count} videos assigned to project',
            'assigned_count': count
        }), 200
        
    except Exception as e:
        logger.error(f"Error assigning videos: {str(e)}")
        return jsonify({'error': 'Failed to assign videos'}), 500

@projects_bp.route('/<int:project_id>/assign', methods=['POST'])
@jwt_required()
def distribute_project_videos(project_id):
    """Distribute project videos among members"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        data = request.get_json()
        
        # Validate input
        if not data.get('user_ids') or not isinstance(data['user_ids'], list):
            return jsonify({'error': 'user_ids array is required'}), 400
        
        # Get project
        from ..models import Project
        project = Project.query.get(project_id)
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Check permission (admin or project lead)
        user_role = project.get_user_role(user_id)
        if user.role != UserRole.ADMIN and user_role != ProjectMemberRole.LEAD:
            return jsonify({'error': 'Only project leads or admins can distribute videos'}), 403
        
        # Get video_ids if provided, otherwise distribute all unassigned
        video_ids = data.get('video_ids', [])
        
        # Distribute videos
        if video_ids:
            # Distribute specific videos
            assignments, error = ProjectService.distribute_specific_videos(
                project_id=project_id,
                video_ids=video_ids,
                member_ids=data['user_ids']
            )
        else:
            # Distribute all unassigned videos
            assignments, error = ProjectService.distribute_videos_equally(
                project_id=project_id,
                member_ids=data['user_ids']
            )
        
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({
            'message': 'Videos distributed successfully',
            'assignments': assignments
        }), 200
        
    except Exception as e:
        logger.error(f"Error distributing videos: {str(e)}")
        return jsonify({'error': 'Failed to distribute videos'}), 500

@projects_bp.route('/<int:project_id>/status', methods=['PUT'])
@jwt_role_required('admin')
def update_project_status(project_id):
    """Update project status (admin only)"""
    try:
        data = request.get_json()
        
        # Validate status
        if not data.get('status'):
            return jsonify({'error': 'status is required'}), 400
        
        try:
            status = ProjectStatus(data['status'])
        except ValueError:
            return jsonify({'error': 'Invalid status value'}), 400
        
        # Update status
        success, error = ProjectService.update_project_status(project_id, status)
        
        if not success:
            return jsonify({'error': error}), 400
        
        return jsonify({
            'message': 'Project status updated successfully',
            'status': status.value
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating project status: {str(e)}")
        return jsonify({'error': 'Failed to update status'}), 500

@projects_bp.route('/<int:project_id>/stats', methods=['GET'])
@jwt_required()
def get_project_statistics(project_id):
    """Get detailed project statistics"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        # Get project
        from ..models import Project
        project = Project.query.get(project_id)
        
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Check access
        if user.role != UserRole.ADMIN and not project.is_user_member(user_id):
            return jsonify({'error': 'Access denied'}), 403
        
        stats = ProjectService.get_project_statistics(project_id)
        
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"Error fetching project statistics: {str(e)}")
        return jsonify({'error': 'Failed to fetch statistics'}), 500