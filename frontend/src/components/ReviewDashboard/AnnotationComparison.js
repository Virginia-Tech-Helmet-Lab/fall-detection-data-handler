import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    FaPlay, FaPause, FaStepForward, FaStepBackward,
    FaCheckCircle, FaTimesCircle, FaExclamationTriangle,
    FaStar, FaRegStar
} from 'react-icons/fa';

const AnnotationComparison = ({ review, onComplete }) => {
    const [annotations, setAnnotations] = useState(null);
    const [qualityScore, setQualityScore] = useState(3);
    const [reviewStatus, setReviewStatus] = useState('approved');
    const [reviewComments, setReviewComments] = useState('');
    const [feedbackItems, setFeedbackItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [activeAnnotation, setActiveAnnotation] = useState(null);
    
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        fetchAnnotations();
    }, [review]);

    useEffect(() => {
        // Draw bounding boxes on canvas when video time updates
        if (canvasRef.current && videoRef.current && annotations?.bboxes) {
            drawBoundingBoxes();
        }
    }, [currentTime, annotations]);

    const fetchAnnotations = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `http://localhost:5000/api/review/${review.review_id}/annotations`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }
            );
            setAnnotations(response.data.annotations);
        } catch (err) {
            console.error('Error fetching annotations:', err);
        } finally {
            setLoading(false);
        }
    };

    const drawBoundingBoxes = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Find bboxes for current frame
        const currentFrame = Math.floor(currentTime * 30); // Assuming 30fps
        const currentBboxes = annotations.bboxes.filter(
            bbox => bbox.frame_index === currentFrame
        );
        
        // Draw each bbox
        currentBboxes.forEach(bbox => {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
            
            // Draw label
            ctx.fillStyle = '#00ff00';
            ctx.font = '14px Arial';
            ctx.fillText(bbox.part_label, bbox.x, bbox.y - 5);
        });
    };

    const handleVideoTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            
            // Check if we're in an annotation
            const current = annotations?.temporal.find(ann => 
                videoRef.current.currentTime >= ann.start_time && 
                videoRef.current.currentTime <= ann.end_time
            );
            setActiveAnnotation(current);
        }
    };

    const seekToAnnotation = (annotation) => {
        if (videoRef.current) {
            videoRef.current.currentTime = annotation.start_time;
            setActiveAnnotation(annotation);
        }
    };

    const addFeedback = (type, severity, annotationId = null) => {
        const newFeedback = {
            annotation_type: type,
            annotation_id: annotationId,
            issue_type: '',
            severity: severity,
            comment: '',
            suggestion: ''
        };
        setFeedbackItems([...feedbackItems, newFeedback]);
    };

    const updateFeedback = (index, field, value) => {
        const updated = [...feedbackItems];
        updated[index][field] = value;
        setFeedbackItems(updated);
    };

    const removeFeedback = (index) => {
        setFeedbackItems(feedbackItems.filter((_, i) => i !== index));
    };

    const handleSubmitReview = () => {
        const reviewData = {
            status: reviewStatus,
            quality_score: qualityScore,
            review_comments: reviewComments,
            feedback_items: feedbackItems
        };
        
        onComplete(review.review_id, reviewData);
    };

    const renderStarRating = () => {
        return (
            <div className="star-rating">
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        onClick={() => setQualityScore(star)}
                        className="star-button"
                    >
                        {star <= qualityScore ? <FaStar /> : <FaRegStar />}
                    </button>
                ))}
                <span className="score-text">{qualityScore}/5</span>
            </div>
        );
    };

    if (loading) {
        return <div className="loading">Loading annotations...</div>;
    }

    return (
        <div className="annotation-comparison">
            <div className="comparison-header">
                <h2>Reviewing: {review.video?.filename}</h2>
                <div className="annotator-info">
                    Annotated by: {review.annotator?.full_name || 'Unknown'}
                </div>
            </div>

            <div className="comparison-content">
                <div className="video-section">
                    <div className="video-container">
                        <video
                            ref={videoRef}
                            src={`http://localhost:5000/api/static/${review.video?.filename}`}
                            onTimeUpdate={handleVideoTimeUpdate}
                            onLoadedMetadata={() => {
                                if (canvasRef.current && videoRef.current) {
                                    canvasRef.current.width = videoRef.current.videoWidth;
                                    canvasRef.current.height = videoRef.current.videoHeight;
                                }
                            }}
                        />
                        <canvas
                            ref={canvasRef}
                            className="bbox-overlay"
                        />
                    </div>
                    
                    <div className="video-controls">
                        <button onClick={() => videoRef.current?.play()}>
                            <FaPlay /> Play
                        </button>
                        <button onClick={() => videoRef.current?.pause()}>
                            <FaPause /> Pause
                        </button>
                        <span className="time-display">
                            {currentTime.toFixed(2)}s / {videoRef.current?.duration?.toFixed(2)}s
                        </span>
                    </div>

                    {activeAnnotation && (
                        <div className="active-annotation-display">
                            <strong>Current:</strong> {activeAnnotation.label} 
                            ({activeAnnotation.start_time.toFixed(2)}s - {activeAnnotation.end_time.toFixed(2)}s)
                        </div>
                    )}
                </div>

                <div className="annotations-section">
                    <h3>Temporal Annotations ({annotations?.temporal?.length || 0})</h3>
                    <div className="annotation-list">
                        {annotations?.temporal?.map((ann, idx) => (
                            <div 
                                key={idx}
                                className={`annotation-item ${activeAnnotation === ann ? 'active' : ''}`}
                                onClick={() => seekToAnnotation(ann)}
                            >
                                <div className="annotation-header">
                                    <span className="annotation-label">{ann.label}</span>
                                    <button 
                                        className="feedback-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            addFeedback('temporal', 'minor', ann.annotation_id);
                                        }}
                                    >
                                        Add Feedback
                                    </button>
                                </div>
                                <div className="annotation-details">
                                    <span>{ann.start_time.toFixed(2)}s - {ann.end_time.toFixed(2)}s</span>
                                    <span>Frames: {ann.start_frame} - {ann.end_frame}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <h3>Bounding Boxes ({annotations?.bboxes?.length || 0})</h3>
                    <div className="bbox-summary">
                        {annotations?.bboxes?.length > 0 ? (
                            <p>{annotations.bboxes.length} bounding boxes across frames</p>
                        ) : (
                            <p>No bounding boxes annotated</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="review-section">
                <h3>Review Decision</h3>
                
                <div className="review-decision">
                    <label>
                        <input
                            type="radio"
                            value="approved"
                            checked={reviewStatus === 'approved'}
                            onChange={(e) => setReviewStatus(e.target.value)}
                        />
                        <FaCheckCircle className="status-icon approved" />
                        Approve
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="needs_revision"
                            checked={reviewStatus === 'needs_revision'}
                            onChange={(e) => setReviewStatus(e.target.value)}
                        />
                        <FaExclamationTriangle className="status-icon revision" />
                        Needs Revision
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="rejected"
                            checked={reviewStatus === 'rejected'}
                            onChange={(e) => setReviewStatus(e.target.value)}
                        />
                        <FaTimesCircle className="status-icon rejected" />
                        Reject
                    </label>
                </div>

                <div className="quality-rating">
                    <label>Quality Score:</label>
                    {renderStarRating()}
                </div>

                <div className="review-comments">
                    <label>Review Comments:</label>
                    <textarea
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        placeholder="Provide feedback on the annotations..."
                        rows={4}
                    />
                </div>

                {feedbackItems.length > 0 && (
                    <div className="feedback-items">
                        <h4>Specific Feedback</h4>
                        {feedbackItems.map((item, idx) => (
                            <div key={idx} className="feedback-item">
                                <select
                                    value={item.issue_type}
                                    onChange={(e) => updateFeedback(idx, 'issue_type', e.target.value)}
                                >
                                    <option value="">Select issue type</option>
                                    <option value="missed_event">Missed Event</option>
                                    <option value="incorrect_timing">Incorrect Timing</option>
                                    <option value="wrong_label">Wrong Label</option>
                                    <option value="inaccurate_bbox">Inaccurate Bbox</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Comment"
                                    value={item.comment}
                                    onChange={(e) => updateFeedback(idx, 'comment', e.target.value)}
                                />
                                <button onClick={() => removeFeedback(idx)}>Remove</button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="review-actions">
                    <button 
                        className="submit-review-btn"
                        onClick={handleSubmitReview}
                    >
                        Submit Review
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnnotationComparison;