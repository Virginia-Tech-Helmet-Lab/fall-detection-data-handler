"""Review and Quality Control Service"""

from datetime import datetime
from typing import List, Dict, Optional, Tuple
from sqlalchemy import and_, or_, func
from ..database import db
from ..models import (
    ReviewQueue, ReviewStatus, ReviewFeedback,
    Video, User, TemporalAnnotation, BoundingBoxAnnotation,
    Project, UserRole
)
import logging

logger = logging.getLogger(__name__)

class ReviewService:
    """Service for managing review workflows and quality control"""
    
    @staticmethod
    def submit_for_review(video_id: int, annotator_id: int, auto_assign: bool = True) -> ReviewQueue:
        """Submit a video for review after annotation is complete"""
        try:
            # Check if video exists
            video = Video.query.get(video_id)
            if not video:
                raise ValueError(f"Video {video_id} not found")
            
            # Check if already in review queue
            existing_review = ReviewQueue.query.filter_by(
                video_id=video_id,
                annotator_id=annotator_id
            ).filter(ReviewQueue.status.in_([
                ReviewStatus.PENDING,
                ReviewStatus.IN_REVIEW
            ])).first()
            
            if existing_review:
                logger.warning(f"Video {video_id} already in review queue")
                return existing_review
            
            # Count annotations
            temporal_count = TemporalAnnotation.query.filter_by(video_id=video_id).count()
            bbox_count = BoundingBoxAnnotation.query.filter_by(video_id=video_id).count()
            
            # Create review queue entry
            review = ReviewQueue(
                video_id=video_id,
                project_id=video.project_id if hasattr(video, 'project_id') else None,
                annotator_id=annotator_id,
                status=ReviewStatus.PENDING,
                annotation_count=temporal_count,
                bbox_count=bbox_count,
                submitted_at=datetime.utcnow()
            )
            
            # Auto-assign reviewer if requested
            if auto_assign:
                reviewer = ReviewService._find_available_reviewer(
                    project_id=review.project_id,
                    exclude_user_id=annotator_id
                )
                if reviewer:
                    review.reviewer_id = reviewer.user_id
                    logger.info(f"Auto-assigned reviewer {reviewer.username} to video {video_id}")
            
            db.session.add(review)
            db.session.commit()
            
            logger.info(f"Video {video_id} submitted for review by annotator {annotator_id}")
            return review
            
        except Exception as e:
            logger.error(f"Error submitting video for review: {str(e)}")
            db.session.rollback()
            raise
    
    @staticmethod
    def _find_available_reviewer(project_id: Optional[int], exclude_user_id: int) -> Optional[User]:
        """Find an available reviewer for the project"""
        # Get all reviewers - handle both enum and string roles
        from sqlalchemy import or_
        reviewers = User.query.filter(
            or_(
                User.role == UserRole.REVIEWER,
                User.role == 'REVIEWER'
            ),
            User.is_active == True,
            User.user_id != exclude_user_id
        ).all()
        
        if not reviewers:
            return None
        
        # Find reviewer with least pending reviews
        reviewer_loads = []
        for reviewer in reviewers:
            pending_count = ReviewQueue.query.filter(
                ReviewQueue.reviewer_id == reviewer.user_id,
                ReviewQueue.status.in_([ReviewStatus.PENDING, ReviewStatus.IN_REVIEW])
            ).count()
            reviewer_loads.append((reviewer, pending_count))
        
        # Sort by load and return the least busy
        reviewer_loads.sort(key=lambda x: x[1])
        return reviewer_loads[0][0] if reviewer_loads else None
    
    @staticmethod
    def get_review_queue(reviewer_id: Optional[int] = None, 
                        project_id: Optional[int] = None,
                        status: Optional[ReviewStatus] = None) -> List[Dict]:
        """Get review queue items with filters"""
        query = ReviewQueue.query
        
        if reviewer_id:
            query = query.filter(ReviewQueue.reviewer_id == reviewer_id)
        
        if project_id:
            query = query.filter(ReviewQueue.project_id == project_id)
        
        if status:
            query = query.filter(ReviewQueue.status == status)
        
        # Order by priority and submission time
        reviews = query.order_by(
            ReviewQueue.priority.desc(),
            ReviewQueue.submitted_at
        ).all()
        
        # Convert to dict with additional info
        result = []
        for review in reviews:
            review_dict = review.to_dict()
            
            # Add video info
            if review.video:
                review_dict['video'] = {
                    'filename': review.video.filename,
                    'duration': review.video.duration,
                    'resolution': review.video.resolution
                }
            
            # Add annotator info
            if review.annotator:
                review_dict['annotator'] = {
                    'username': review.annotator.username,
                    'full_name': review.annotator.full_name
                }
            
            # Add reviewer info
            if review.reviewer:
                review_dict['reviewer'] = {
                    'username': review.reviewer.username,
                    'full_name': review.reviewer.full_name
                }
            
            result.append(review_dict)
        
        return result
    
    @staticmethod
    def start_review(review_id: int, reviewer_id: int) -> ReviewQueue:
        """Start reviewing a video"""
        review = ReviewQueue.query.get(review_id)
        if not review:
            raise ValueError(f"Review {review_id} not found")
        
        if review.status != ReviewStatus.PENDING:
            raise ValueError(f"Review is not in pending status")
        
        review.reviewer_id = reviewer_id
        review.status = ReviewStatus.IN_REVIEW
        review.review_started_at = datetime.utcnow()
        
        db.session.commit()
        logger.info(f"Review {review_id} started by reviewer {reviewer_id}")
        
        return review
    
    @staticmethod
    def complete_review(review_id: int, reviewer_id: int, 
                       status: ReviewStatus, 
                       quality_score: float,
                       review_comments: str,
                       feedback_items: List[Dict] = None) -> ReviewQueue:
        """Complete a review with feedback"""
        review = ReviewQueue.query.get(review_id)
        if not review:
            raise ValueError(f"Review {review_id} not found")
        
        if review.reviewer_id != reviewer_id:
            raise ValueError("You are not assigned to this review")
        
        if review.status != ReviewStatus.IN_REVIEW:
            raise ValueError("Review is not in progress")
        
        # Calculate review time
        if review.review_started_at:
            time_diff = datetime.utcnow() - review.review_started_at
            review.review_time_seconds = int(time_diff.total_seconds())
        
        # Update review
        review.status = status
        review.quality_score = quality_score
        review.review_comments = review_comments
        review.reviewed_at = datetime.utcnow()
        
        # Calculate accuracy and completeness scores based on feedback
        if feedback_items:
            critical_issues = sum(1 for f in feedback_items if f.get('severity') == 'critical')
            major_issues = sum(1 for f in feedback_items if f.get('severity') == 'major')
            minor_issues = sum(1 for f in feedback_items if f.get('severity') == 'minor')
            
            # Simple scoring algorithm
            review.accuracy_score = max(0, 1.0 - (critical_issues * 0.3 + major_issues * 0.1 + minor_issues * 0.03))
            review.completeness_score = 1.0 if (review.annotation_count > 0 or review.bbox_count > 0) else 0.0
            
            # Add feedback items
            for feedback_data in feedback_items:
                feedback = ReviewFeedback(
                    review_id=review_id,
                    annotation_type=feedback_data.get('annotation_type'),
                    annotation_id=feedback_data.get('annotation_id'),
                    issue_type=feedback_data.get('issue_type'),
                    severity=feedback_data.get('severity'),
                    comment=feedback_data.get('comment'),
                    suggestion=feedback_data.get('suggestion')
                )
                db.session.add(feedback)
        
        db.session.commit()
        logger.info(f"Review {review_id} completed with status {status.value}")
        
        return review
    
    @staticmethod
    def get_review_statistics(project_id: Optional[int] = None, 
                            user_id: Optional[int] = None,
                            user_type: str = 'annotator') -> Dict:
        """Get review statistics for a project or user"""
        query = ReviewQueue.query
        
        if project_id:
            query = query.filter(ReviewQueue.project_id == project_id)
        
        if user_id:
            if user_type == 'annotator':
                query = query.filter(ReviewQueue.annotator_id == user_id)
            else:  # reviewer
                query = query.filter(ReviewQueue.reviewer_id == user_id)
        
        # Get counts by status
        status_counts = {}
        for status in ReviewStatus:
            count = query.filter(ReviewQueue.status == status).count()
            status_counts[status.value] = count
        
        # Get quality metrics
        completed_reviews = query.filter(
            ReviewQueue.status.in_([ReviewStatus.APPROVED, ReviewStatus.REJECTED])
        ).all()
        
        if completed_reviews:
            avg_quality = sum(r.quality_score or 0 for r in completed_reviews) / len(completed_reviews)
            avg_accuracy = sum(r.accuracy_score or 0 for r in completed_reviews) / len(completed_reviews)
            avg_review_time = sum(r.review_time_seconds or 0 for r in completed_reviews) / len(completed_reviews)
        else:
            avg_quality = avg_accuracy = avg_review_time = 0
        
        return {
            'status_counts': status_counts,
            'total_reviews': query.count(),
            'average_quality_score': round(avg_quality, 2),
            'average_accuracy_score': round(avg_accuracy, 2),
            'average_review_time_seconds': int(avg_review_time),
            'completed_reviews': len(completed_reviews)
        }
    
    @staticmethod
    def get_annotations_for_review(video_id: int) -> Dict:
        """Get all annotations for a video to review"""
        temporal_annotations = TemporalAnnotation.query.filter_by(video_id=video_id).all()
        bbox_annotations = BoundingBoxAnnotation.query.filter_by(video_id=video_id).all()
        
        return {
            'temporal': [
                {
                    'annotation_id': ann.annotation_id,
                    'start_time': ann.start_time,
                    'end_time': ann.end_time,
                    'label': ann.label,
                    'start_frame': ann.start_frame,
                    'end_frame': ann.end_frame
                }
                for ann in temporal_annotations
            ],
            'bboxes': [
                {
                    'bbox_id': bbox.bbox_id,
                    'frame_index': bbox.frame_index,
                    'x': bbox.x,
                    'y': bbox.y,
                    'width': bbox.width,
                    'height': bbox.height,
                    'part_label': bbox.part_label
                }
                for bbox in bbox_annotations
            ]
        }