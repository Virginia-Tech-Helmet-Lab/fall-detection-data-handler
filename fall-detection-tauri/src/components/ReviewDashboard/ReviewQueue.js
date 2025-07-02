import React from 'react';
import { 
    FaClock, FaPlay, FaUser, FaVideo, FaCalendar,
    FaCheckCircle, FaTimesCircle, FaExclamationTriangle
} from 'react-icons/fa';

const ReviewQueue = ({ 
    reviews, 
    onStartReview, 
    onSelectReview, 
    selectedReview,
    isReviewer,
    currentUser 
}) => {
    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { icon: <FaClock />, className: 'pending', label: 'Pending' },
            in_review: { icon: <FaPlay />, className: 'in-review', label: 'In Review' },
            approved: { icon: <FaCheckCircle />, className: 'approved', label: 'Approved' },
            rejected: { icon: <FaTimesCircle />, className: 'rejected', label: 'Rejected' },
            needs_revision: { icon: <FaExclamationTriangle />, className: 'revision', label: 'Needs Revision' }
        };
        
        const config = statusConfig[status] || statusConfig.pending;
        
        return (
            <span className={`status-badge ${config.className}`}>
                {config.icon}
                <span>{config.label}</span>
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const canStartReview = (review) => {
        return isReviewer && 
               review.status === 'pending' && 
               (!review.reviewer_id || review.reviewer_id === currentUser?.user_id);
    };

    if (reviews.length === 0) {
        return (
            <div className="empty-queue">
                <FaVideo className="empty-icon" />
                <h3>No reviews in queue</h3>
                <p>Videos will appear here when they are submitted for review.</p>
            </div>
        );
    }

    return (
        <div className="review-queue">
            <div className="queue-list">
                {reviews.map(review => (
                    <div 
                        key={review.review_id}
                        className={`review-item ${selectedReview?.review_id === review.review_id ? 'selected' : ''}`}
                        onClick={() => onSelectReview(review)}
                    >
                        <div className="review-header">
                            <h3 className="video-name">
                                <FaVideo /> {review.video?.filename || `Video ${review.video_id}`}
                            </h3>
                            {getStatusBadge(review.status)}
                        </div>
                        
                        <div className="review-info">
                            <div className="info-row">
                                <span className="label">
                                    <FaUser /> Annotator:
                                </span>
                                <span className="value">
                                    {review.annotator?.full_name || review.annotator?.username || 'Unknown'}
                                </span>
                            </div>
                            
                            {review.reviewer && (
                                <div className="info-row">
                                    <span className="label">
                                        <FaUser /> Reviewer:
                                    </span>
                                    <span className="value">
                                        {review.reviewer?.full_name || review.reviewer?.username}
                                    </span>
                                </div>
                            )}
                            
                            <div className="info-row">
                                <span className="label">
                                    <FaCalendar /> Submitted:
                                </span>
                                <span className="value">
                                    {formatDate(review.submitted_at)}
                                </span>
                            </div>
                            
                            <div className="annotation-counts">
                                <span className="count">
                                    {review.annotation_count} temporal
                                </span>
                                <span className="count">
                                    {review.bbox_count} bounding boxes
                                </span>
                            </div>
                        </div>
                        
                        {review.quality_score && (
                            <div className="quality-score">
                                <span className="score-label">Quality Score:</span>
                                <div className="score-bar">
                                    <div 
                                        className="score-fill"
                                        style={{ width: `${(review.quality_score / 5) * 100}%` }}
                                    />
                                </div>
                                <span className="score-value">{review.quality_score}/5</span>
                            </div>
                        )}
                        
                        <div className="review-actions">
                            {canStartReview(review) && (
                                <button 
                                    className="start-review-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onStartReview(review.review_id);
                                    }}
                                >
                                    <FaPlay /> Start Review
                                </button>
                            )}
                            
                            {review.status === 'in_review' && review.reviewer_id === currentUser?.user_id && (
                                <button 
                                    className="continue-review-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onStartReview(review.review_id);
                                    }}
                                >
                                    Continue Review
                                </button>
                            )}
                            
                            {review.status === 'approved' && (
                                <div className="review-result approved">
                                    <FaCheckCircle /> Approved
                                </div>
                            )}
                            
                            {review.status === 'rejected' && (
                                <div className="review-result rejected">
                                    <FaTimesCircle /> Rejected
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            {selectedReview && (
                <div className="review-details">
                    <h3>Review Details</h3>
                    
                    {selectedReview.review_comments && (
                        <div className="review-comments">
                            <h4>Review Comments:</h4>
                            <p>{selectedReview.review_comments}</p>
                        </div>
                    )}
                    
                    {selectedReview.revision_notes && (
                        <div className="revision-notes">
                            <h4>Revision Notes:</h4>
                            <p>{selectedReview.revision_notes}</p>
                        </div>
                    )}
                    
                    {selectedReview.reviewed_at && (
                        <div className="review-metadata">
                            <p>Reviewed on: {formatDate(selectedReview.reviewed_at)}</p>
                            {selectedReview.review_time_seconds && (
                                <p>Review time: {Math.round(selectedReview.review_time_seconds / 60)} minutes</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReviewQueue;