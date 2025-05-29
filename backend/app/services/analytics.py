"""Analytics Service for comprehensive reporting and insights"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_
from ..models import (
    User, Video, Project, ProjectMember, 
    TemporalAnnotation, BoundingBoxAnnotation,
    ReviewQueue, ReviewStatus, UserRole, ProjectStatus
)
from ..database import db
import logging

logger = logging.getLogger(__name__)

class AnalyticsService:
    """Service for generating analytics and reports"""
    
    @staticmethod
    def get_user_performance(user_id: int, project_id: Optional[int] = None, 
                           days: int = 30) -> Dict:
        """Get detailed performance metrics for a user"""
        try:
            user = User.query.get(user_id)
            if not user:
                raise ValueError(f"User {user_id} not found")
            
            # Calculate date range
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Base query filters
            video_query = Video.query.filter(Video.assigned_to == user_id)
            if project_id:
                video_query = video_query.filter(Video.project_id == project_id)
            
            # Get video statistics
            total_assigned = video_query.count()
            completed = video_query.filter(Video.is_completed == True).count()
            in_progress = total_assigned - completed
            
            # Get annotation statistics
            temporal_query = TemporalAnnotation.query.filter(
                TemporalAnnotation.created_by == user_id,
                TemporalAnnotation.created_at >= start_date
            )
            bbox_query = BoundingBoxAnnotation.query.filter(
                BoundingBoxAnnotation.created_by == user_id,
                BoundingBoxAnnotation.created_at >= start_date
            )
            
            if project_id:
                temporal_query = temporal_query.join(Video).filter(Video.project_id == project_id)
                bbox_query = bbox_query.join(Video).filter(Video.project_id == project_id)
            
            total_temporal = temporal_query.count()
            total_bbox = bbox_query.count()
            
            # Calculate productivity metrics
            daily_annotations = []
            for i in range(days):
                date = start_date + timedelta(days=i)
                next_date = date + timedelta(days=1)
                
                day_temporal = temporal_query.filter(
                    TemporalAnnotation.created_at >= date,
                    TemporalAnnotation.created_at < next_date
                ).count()
                
                day_bbox = bbox_query.filter(
                    BoundingBoxAnnotation.created_at >= date,
                    BoundingBoxAnnotation.created_at < next_date
                ).count()
                
                daily_annotations.append({
                    'date': date.isoformat(),
                    'temporal': day_temporal,
                    'bbox': day_bbox,
                    'total': day_temporal + day_bbox
                })
            
            # Get review statistics if user is an annotator
            review_stats = None
            if user.role == UserRole.ANNOTATOR or user.role == 'ANNOTATOR':
                reviews = ReviewQueue.query.filter(
                    ReviewQueue.annotator_id == user_id
                )
                if project_id:
                    reviews = reviews.filter(ReviewQueue.project_id == project_id)
                
                total_reviews = reviews.count()
                approved = reviews.filter(ReviewQueue.status == ReviewStatus.APPROVED).count()
                rejected = reviews.filter(ReviewQueue.status == ReviewStatus.REJECTED).count()
                pending = reviews.filter(ReviewQueue.status == ReviewStatus.PENDING).count()
                
                # Calculate average quality score
                completed_reviews = reviews.filter(
                    ReviewQueue.quality_score.isnot(None)
                ).all()
                
                avg_quality = 0
                if completed_reviews:
                    avg_quality = sum(r.quality_score for r in completed_reviews) / len(completed_reviews)
                
                review_stats = {
                    'total_reviews': total_reviews,
                    'approved': approved,
                    'rejected': rejected,
                    'pending': pending,
                    'approval_rate': (approved / total_reviews * 100) if total_reviews > 0 else 0,
                    'average_quality_score': round(avg_quality, 2)
                }
            
            # Get reviewer statistics if user is a reviewer
            reviewer_stats = None
            if user.role == UserRole.REVIEWER or user.role == 'REVIEWER':
                reviews = ReviewQueue.query.filter(
                    ReviewQueue.reviewer_id == user_id
                )
                if project_id:
                    reviews = reviews.filter(ReviewQueue.project_id == project_id)
                
                total_reviewed = reviews.filter(
                    ReviewQueue.status.in_([ReviewStatus.APPROVED, ReviewStatus.REJECTED])
                ).count()
                
                in_review = reviews.filter(
                    ReviewQueue.status == ReviewStatus.IN_REVIEW
                ).count()
                
                # Calculate average review time
                completed_reviews = reviews.filter(
                    ReviewQueue.review_time_seconds.isnot(None)
                ).all()
                
                avg_review_time = 0
                if completed_reviews:
                    avg_review_time = sum(r.review_time_seconds for r in completed_reviews) / len(completed_reviews)
                
                reviewer_stats = {
                    'total_reviewed': total_reviewed,
                    'in_review': in_review,
                    'average_review_time': int(avg_review_time),
                    'reviews_per_day': round(total_reviewed / days, 2)
                }
            
            return {
                'user': {
                    'id': user.user_id,
                    'username': user.username,
                    'full_name': user.full_name,
                    'role': user.role.value if hasattr(user.role, 'value') else user.role
                },
                'video_stats': {
                    'total_assigned': total_assigned,
                    'completed': completed,
                    'in_progress': in_progress,
                    'completion_rate': (completed / total_assigned * 100) if total_assigned > 0 else 0
                },
                'annotation_stats': {
                    'total_temporal': total_temporal,
                    'total_bbox': total_bbox,
                    'total_annotations': total_temporal + total_bbox,
                    'daily_average': round((total_temporal + total_bbox) / days, 2)
                },
                'daily_annotations': daily_annotations,
                'review_stats': review_stats,
                'reviewer_stats': reviewer_stats,
                'time_period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat(),
                    'days': days
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting user performance: {str(e)}", exc_info=True)
            raise
    
    @staticmethod
    def get_project_analytics(project_id: int) -> Dict:
        """Get comprehensive analytics for a project"""
        try:
            project = Project.query.get(project_id)
            if not project:
                raise ValueError(f"Project {project_id} not found")
            
            # Get video statistics
            videos = Video.query.filter(Video.project_id == project_id).all()
            total_videos = len(videos)
            completed_videos = sum(1 for v in videos if v.is_completed)
            
            # Calculate total duration
            total_duration = sum(v.duration or 0 for v in videos)
            
            # Get team statistics
            members = ProjectMember.query.filter(
                ProjectMember.project_id == project_id
            ).all()
            
            team_stats = []
            for member in members:
                user = member.user
                assigned = Video.query.filter(
                    Video.project_id == project_id,
                    Video.assigned_to == user.user_id
                ).count()
                
                completed = Video.query.filter(
                    Video.project_id == project_id,
                    Video.assigned_to == user.user_id,
                    Video.is_completed == True
                ).count()
                
                # Get annotation counts
                temporal_count = TemporalAnnotation.query.join(Video).filter(
                    Video.project_id == project_id,
                    TemporalAnnotation.created_by == user.user_id
                ).count()
                
                bbox_count = BoundingBoxAnnotation.query.join(Video).filter(
                    Video.project_id == project_id,
                    BoundingBoxAnnotation.created_by == user.user_id
                ).count()
                
                team_stats.append({
                    'user_id': user.user_id,
                    'username': user.username,
                    'full_name': user.full_name,
                    'role': member.role.value if hasattr(member.role, 'value') else member.role,
                    'videos_assigned': assigned,
                    'videos_completed': completed,
                    'temporal_annotations': temporal_count,
                    'bbox_annotations': bbox_count,
                    'total_annotations': temporal_count + bbox_count
                })
            
            # Get annotation statistics
            total_temporal = TemporalAnnotation.query.join(Video).filter(
                Video.project_id == project_id
            ).count()
            
            total_bbox = BoundingBoxAnnotation.query.join(Video).filter(
                Video.project_id == project_id
            ).count()
            
            # Get quality metrics from reviews
            reviews = ReviewQueue.query.filter(
                ReviewQueue.project_id == project_id,
                ReviewQueue.quality_score.isnot(None)
            ).all()
            
            avg_quality = 0
            quality_distribution = {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0}
            
            if reviews:
                avg_quality = sum(r.quality_score for r in reviews) / len(reviews)
                for review in reviews:
                    score_key = str(int(review.quality_score))
                    quality_distribution[score_key] += 1
            
            # Calculate timeline data
            timeline_data = []
            if videos:
                # Get date range from first to last video
                min_date = min(v.import_date for v in videos if v.import_date)
                max_date = datetime.utcnow()
                
                # Generate daily progress
                current_date = min_date.date()
                end_date = max_date.date()
                
                while current_date <= end_date:
                    next_date = current_date + timedelta(days=1)
                    
                    # Count videos completed on this day
                    day_completed = sum(1 for v in videos 
                                      if v.is_completed and 
                                      v.import_date.date() <= current_date)
                    
                    timeline_data.append({
                        'date': current_date.isoformat(),
                        'completed': day_completed,
                        'total': total_videos
                    })
                    
                    current_date = next_date
            
            return {
                'project': {
                    'id': project.project_id,
                    'name': project.name,
                    'description': project.description,
                    'status': project.status.value if hasattr(project.status, 'value') else project.status,
                    'created_at': project.created_at.isoformat() if project.created_at else None
                },
                'video_stats': {
                    'total': total_videos,
                    'completed': completed_videos,
                    'in_progress': total_videos - completed_videos,
                    'completion_rate': (completed_videos / total_videos * 100) if total_videos > 0 else 0,
                    'total_duration_seconds': int(total_duration),
                    'total_duration_formatted': f"{int(total_duration // 3600)}h {int((total_duration % 3600) // 60)}m"
                },
                'annotation_stats': {
                    'total_temporal': total_temporal,
                    'total_bbox': total_bbox,
                    'total_annotations': total_temporal + total_bbox,
                    'average_per_video': round((total_temporal + total_bbox) / total_videos, 2) if total_videos > 0 else 0
                },
                'quality_metrics': {
                    'average_score': round(avg_quality, 2),
                    'distribution': quality_distribution,
                    'total_reviews': len(reviews)
                },
                'team_stats': team_stats,
                'timeline_data': timeline_data
            }
            
        except Exception as e:
            logger.error(f"Error getting project analytics: {str(e)}", exc_info=True)
            raise
    
    @staticmethod
    def get_system_overview() -> Dict:
        """Get system-wide analytics overview"""
        try:
            logger.info("Starting system overview generation")
            
            # User statistics - simplified query
            total_users = User.query.count()
            active_users = User.query.filter(User.is_active == True).count()
            users_by_role = {}
            
            # Get role counts more simply
            try:
                admin_count = User.query.filter(User.role == UserRole.ADMIN).count()
                annotator_count = User.query.filter(User.role == UserRole.ANNOTATOR).count() 
                reviewer_count = User.query.filter(User.role == UserRole.REVIEWER).count()
                
                users_by_role = {
                    'admin': admin_count,
                    'annotator': annotator_count,
                    'reviewer': reviewer_count
                }
                logger.info(f"User counts: {users_by_role}")
            except Exception as e:
                logger.error(f"Error getting user role counts: {e}")
                users_by_role = {'admin': 0, 'annotator': 0, 'reviewer': 0}
            
            # Project statistics
            try:
                total_projects = Project.query.count()
                active_projects = Project.query.filter(
                    Project.status == ProjectStatus.ACTIVE
                ).count()
                logger.info(f"Project counts: total={total_projects}, active={active_projects}")
            except Exception as e:
                logger.error(f"Error getting project stats: {e}")
                total_projects = active_projects = 0
            
            # Video statistics
            try:
                total_videos = Video.query.count()
                completed_videos = Video.query.filter(Video.is_completed == True).count()
                unassigned_videos = Video.query.filter(Video.assigned_to == None).count()
                logger.info(f"Video counts: total={total_videos}, completed={completed_videos}, unassigned={unassigned_videos}")
            except Exception as e:
                logger.error(f"Error getting video stats: {e}")
                total_videos = completed_videos = unassigned_videos = 0
            
            # Annotation statistics
            try:
                total_temporal = TemporalAnnotation.query.count()
                total_bbox = BoundingBoxAnnotation.query.count()
                logger.info(f"Annotation counts: temporal={total_temporal}, bbox={total_bbox}")
            except Exception as e:
                logger.error(f"Error getting annotation stats: {e}")
                total_temporal = total_bbox = 0
            
            # Review statistics
            try:
                total_reviews = ReviewQueue.query.count()
                pending_reviews = ReviewQueue.query.filter(
                    ReviewQueue.status == ReviewStatus.PENDING
                ).count()
                logger.info(f"Review counts: total={total_reviews}, pending={pending_reviews}")
            except Exception as e:
                logger.error(f"Error getting review stats: {e}")
                total_reviews = pending_reviews = 0
            
            # Calculate system health metrics
            health_metrics = {
                'assignment_coverage': ((total_videos - unassigned_videos) / total_videos * 100) if total_videos > 0 else 100,
                'completion_rate': (completed_videos / total_videos * 100) if total_videos > 0 else 0,
                'review_backlog': pending_reviews,
                'active_user_rate': (active_users / total_users * 100) if total_users > 0 else 0
            }
            
            # Get recent activity (simplified)
            recent_annotations = []
            try:
                recent_temporal = TemporalAnnotation.query.order_by(
                    TemporalAnnotation.created_at.desc()
                ).limit(5).all()
                
                for ann in recent_temporal:
                    try:
                        user = User.query.get(ann.created_by) if ann.created_by else None
                        video = Video.query.get(ann.video_id) if ann.video_id else None
                        recent_annotations.append({
                            'type': 'temporal',
                            'label': ann.label or 'Unknown',
                            'video': video.filename if video else 'Unknown',
                            'user': user.username if user else 'Unknown',
                            'created_at': ann.created_at.isoformat() if ann.created_at else None
                        })
                    except Exception as e:
                        logger.warning(f"Error processing recent annotation: {e}")
                        continue
                        
                logger.info(f"Retrieved {len(recent_annotations)} recent annotations")
            except Exception as e:
                logger.error(f"Error getting recent activity: {e}")
                recent_annotations = []
            
            result = {
                'user_stats': {
                    'total': total_users,
                    'active': active_users,
                    'by_role': users_by_role
                },
                'project_stats': {
                    'total': total_projects,
                    'active': active_projects
                },
                'video_stats': {
                    'total': total_videos,
                    'completed': completed_videos,
                    'unassigned': unassigned_videos,
                    'in_progress': total_videos - completed_videos - unassigned_videos
                },
                'annotation_stats': {
                    'total_temporal': total_temporal,
                    'total_bbox': total_bbox,
                    'total': total_temporal + total_bbox
                },
                'review_stats': {
                    'total': total_reviews,
                    'pending': pending_reviews
                },
                'health_metrics': health_metrics,
                'recent_activity': recent_annotations
            }
            
            logger.info("System overview generation completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error getting system overview: {str(e)}", exc_info=True)
            raise
    
    @staticmethod
    def generate_export_report(project_id: int, include_reviews: bool = True) -> Dict:
        """Generate comprehensive export report for a project"""
        try:
            project = Project.query.get(project_id)
            if not project:
                raise ValueError(f"Project {project_id} not found")
            
            # Get all videos with annotations
            videos = Video.query.filter(Video.project_id == project_id).all()
            
            export_data = {
                'project_info': {
                    'id': project.project_id,
                    'name': project.name,
                    'export_date': datetime.utcnow().isoformat(),
                    'total_videos': len(videos)
                },
                'videos': []
            }
            
            for video in videos:
                video_data = {
                    'video_id': video.video_id,
                    'filename': video.filename,
                    'duration': video.duration,
                    'resolution': video.resolution,
                    'framerate': video.framerate,
                    'assigned_to': None,
                    'completed': video.is_completed,
                    'temporal_annotations': [],
                    'bbox_annotations': []
                }
                
                # Add user info
                if video.assigned_to:
                    user = User.query.get(video.assigned_to)
                    video_data['assigned_to'] = {
                        'id': user.user_id,
                        'username': user.username,
                        'full_name': user.full_name
                    }
                
                # Add temporal annotations
                temporal_anns = TemporalAnnotation.query.filter(
                    TemporalAnnotation.video_id == video.video_id
                ).all()
                
                for ann in temporal_anns:
                    ann_user = User.query.get(ann.created_by)
                    video_data['temporal_annotations'].append({
                        'id': ann.annotation_id,
                        'label': ann.label,
                        'start_time': ann.start_time,
                        'end_time': ann.end_time,
                        'start_frame': ann.start_frame,
                        'end_frame': ann.end_frame,
                        'created_by': ann_user.username if ann_user else 'Unknown',
                        'created_at': ann.created_at.isoformat() if ann.created_at else None
                    })
                
                # Add bbox annotations
                bbox_anns = BoundingBoxAnnotation.query.filter(
                    BoundingBoxAnnotation.video_id == video.video_id
                ).all()
                
                for bbox in bbox_anns:
                    bbox_user = User.query.get(bbox.created_by)
                    video_data['bbox_annotations'].append({
                        'id': bbox.bbox_id,
                        'frame_number': bbox.frame_number,
                        'x': bbox.x,
                        'y': bbox.y,
                        'width': bbox.width,
                        'height': bbox.height,
                        'label': bbox.label,
                        'created_by': bbox_user.username if bbox_user else 'Unknown',
                        'created_at': bbox.created_at.isoformat() if bbox.created_at else None
                    })
                
                # Add review information if requested
                if include_reviews:
                    review = ReviewQueue.query.filter(
                        ReviewQueue.video_id == video.video_id
                    ).first()
                    
                    if review:
                        reviewer = User.query.get(review.reviewer_id) if review.reviewer_id else None
                        video_data['review'] = {
                            'status': review.status.value if hasattr(review.status, 'value') else review.status,
                            'quality_score': review.quality_score,
                            'reviewer': reviewer.username if reviewer else None,
                            'review_comments': review.review_comments,
                            'reviewed_at': review.reviewed_at.isoformat() if review.reviewed_at else None
                        }
                
                export_data['videos'].append(video_data)
            
            # Add summary statistics
            total_temporal = sum(len(v['temporal_annotations']) for v in export_data['videos'])
            total_bbox = sum(len(v['bbox_annotations']) for v in export_data['videos'])
            
            export_data['summary'] = {
                'total_videos': len(videos),
                'completed_videos': sum(1 for v in videos if v.is_completed),
                'total_temporal_annotations': total_temporal,
                'total_bbox_annotations': total_bbox,
                'total_annotations': total_temporal + total_bbox
            }
            
            return export_data
            
        except Exception as e:
            logger.error(f"Error generating export report: {str(e)}", exc_info=True)
            raise