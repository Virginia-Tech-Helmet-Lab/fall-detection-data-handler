"""
Project management service layer
Handles CRUD operations and business logic for projects
"""

from datetime import datetime
from typing import List, Dict, Optional, Tuple
from ..database import db
from ..models import Project, ProjectMember, User, Video, ProjectStatus, ProjectMemberRole, UserRole
import logging

logger = logging.getLogger(__name__)

class ProjectService:
    """Service class for project management operations"""
    
    @staticmethod
    def create_project(user_id: int, name: str, description: str = None, 
                      deadline: datetime = None, annotation_schema: dict = None,
                      normalization_settings: dict = None) -> Tuple[Optional[Project], Optional[str]]:
        """
        Create a new project
        
        Args:
            user_id: ID of the user creating the project
            name: Project name
            description: Project description
            deadline: Project deadline
            annotation_schema: JSON schema for annotations
            normalization_settings: Default video normalization settings
            
        Returns:
            Tuple of (Project, error_message)
        """
        try:
            # Create the project
            project = Project(
                name=name,
                description=description,
                created_by=user_id,
                deadline=deadline,
                annotation_schema=annotation_schema,
                normalization_settings=normalization_settings,
                status=ProjectStatus.SETUP
            )
            
            db.session.add(project)
            db.session.flush()  # Get the project ID before creating membership
            
            # Add creator as project lead
            creator_membership = ProjectMember(
                project_id=project.project_id,
                user_id=user_id,
                role=ProjectMemberRole.LEAD
            )
            
            db.session.add(creator_membership)
            db.session.commit()
            
            logger.info(f"Project '{name}' created by user {user_id}")
            return project, None
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating project: {str(e)}")
            return None, str(e)
    
    @staticmethod
    def get_user_projects(user_id: int, include_archived: bool = False) -> List[Project]:
        """
        Get all projects accessible to a user
        
        Args:
            user_id: User ID
            include_archived: Whether to include archived projects
            
        Returns:
            List of projects
        """
        try:
            user = User.query.get(user_id)
            if not user:
                return []
            
            # Admins can see all projects
            if user.role == UserRole.ADMIN:
                query = Project.query
            else:
                # Other users see only projects they're members of
                query = Project.query.join(ProjectMember).filter(
                    ProjectMember.user_id == user_id
                )
            
            if not include_archived:
                query = query.filter(Project.status != ProjectStatus.ARCHIVED)
            
            return query.order_by(Project.last_activity.desc()).all()
            
        except Exception as e:
            logger.error(f"Error getting user projects: {str(e)}")
            return []
    
    @staticmethod
    def add_project_member(project_id: int, user_id: int, role: ProjectMemberRole = ProjectMemberRole.MEMBER) -> Tuple[Optional[ProjectMember], Optional[str]]:
        """
        Add a user to a project
        
        Args:
            project_id: Project ID
            user_id: User ID to add
            role: Role within the project
            
        Returns:
            Tuple of (ProjectMember, error_message)
        """
        try:
            # Check if project exists
            project = Project.query.get(project_id)
            if not project:
                return None, "Project not found"
            
            # Check if user exists
            user = User.query.get(user_id)
            if not user:
                return None, "User not found"
            
            # Check if already a member
            existing = ProjectMember.query.filter_by(
                project_id=project_id, 
                user_id=user_id
            ).first()
            
            if existing:
                return None, "User is already a member of this project"
            
            # Create membership
            membership = ProjectMember(
                project_id=project_id,
                user_id=user_id,
                role=role
            )
            
            db.session.add(membership)
            db.session.commit()
            
            logger.info(f"User {user_id} added to project {project_id} as {role.value}")
            return membership, None
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error adding project member: {str(e)}")
            return None, str(e)
    
    @staticmethod
    def assign_videos_to_project(project_id: int, video_ids: List[int]) -> Tuple[int, Optional[str]]:
        """
        Assign videos to a project
        
        Args:
            project_id: Project ID
            video_ids: List of video IDs to assign
            
        Returns:
            Tuple of (number_assigned, error_message)
        """
        try:
            project = Project.query.get(project_id)
            if not project:
                return 0, "Project not found"
            
            count = 0
            for video_id in video_ids:
                video = Video.query.get(video_id)
                if video and not video.project_id:
                    video.project_id = project_id
                    count += 1
            
            # Update project video count
            project.total_videos = Video.query.filter_by(project_id=project_id).count()
            project.last_activity = datetime.utcnow()
            
            db.session.commit()
            
            logger.info(f"Assigned {count} videos to project {project_id}")
            return count, None
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error assigning videos to project: {str(e)}")
            return 0, str(e)
    
    @staticmethod
    def distribute_videos_equally(project_id: int, member_ids: List[int]) -> Tuple[Dict[int, int], Optional[str]]:
        """
        Distribute project videos equally among members
        
        Args:
            project_id: Project ID
            member_ids: List of member user IDs
            
        Returns:
            Tuple of (assignment_dict, error_message)
            assignment_dict maps user_id to number of videos assigned
        """
        try:
            # Get unassigned videos in the project
            unassigned_videos = Video.query.filter_by(
                project_id=project_id,
                assigned_to=None
            ).all()
            
            if not unassigned_videos:
                return {}, "No unassigned videos in project"
            
            if not member_ids:
                return {}, "No members specified"
            
            # Distribute videos in round-robin fashion
            assignments = {member_id: 0 for member_id in member_ids}
            
            for i, video in enumerate(unassigned_videos):
                member_id = member_ids[i % len(member_ids)]
                video.assigned_to = member_id
                assignments[member_id] += 1
                
                # Update member's assigned count
                membership = ProjectMember.query.filter_by(
                    project_id=project_id,
                    user_id=member_id
                ).first()
                
                if membership:
                    membership.videos_assigned += 1
            
            db.session.commit()
            
            logger.info(f"Distributed {len(unassigned_videos)} videos among {len(member_ids)} members")
            return assignments, None
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error distributing videos: {str(e)}")
            return {}, str(e)
    
    @staticmethod
    def update_project_status(project_id: int, status: ProjectStatus) -> Tuple[bool, Optional[str]]:
        """
        Update project status
        
        Args:
            project_id: Project ID
            status: New status
            
        Returns:
            Tuple of (success, error_message)
        """
        try:
            project = Project.query.get(project_id)
            if not project:
                return False, "Project not found"
            
            project.status = status
            project.last_activity = datetime.utcnow()
            
            db.session.commit()
            
            logger.info(f"Project {project_id} status updated to {status.value}")
            return True, None
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating project status: {str(e)}")
            return False, str(e)
    
    @staticmethod
    def get_project_statistics(project_id: int) -> Dict:
        """
        Get detailed project statistics
        
        Args:
            project_id: Project ID
            
        Returns:
            Dictionary of statistics
        """
        try:
            project = Project.query.get(project_id)
            if not project:
                return {}
            
            # Get member statistics
            members = ProjectMember.query.filter_by(project_id=project_id).all()
            member_stats = []
            
            for member in members:
                member_stats.append({
                    'user_id': member.user_id,
                    'username': member.user.username,
                    'role': member.role.value,
                    'videos_assigned': member.videos_assigned,
                    'videos_completed': member.videos_completed,
                    'completion_rate': member.get_completion_rate()
                })
            
            # Get video statistics
            total_videos = Video.query.filter_by(project_id=project_id).count()
            assigned_videos = Video.query.filter_by(project_id=project_id).filter(
                Video.assigned_to.isnot(None)
            ).count()
            completed_videos = Video.query.filter_by(
                project_id=project_id,
                status='completed'
            ).count()
            
            return {
                'project_id': project_id,
                'project_name': project.name,
                'status': project.status.value,
                'progress_percentage': project.get_progress_percentage(),
                'total_videos': total_videos,
                'assigned_videos': assigned_videos,
                'completed_videos': completed_videos,
                'unassigned_videos': total_videos - assigned_videos,
                'member_count': len(members),
                'member_statistics': member_stats,
                'created_at': project.created_at.isoformat() if project.created_at else None,
                'deadline': project.deadline.isoformat() if project.deadline else None,
                'last_activity': project.last_activity.isoformat() if project.last_activity else None
            }
            
        except Exception as e:
            logger.error(f"Error getting project statistics: {str(e)}")
            return {}