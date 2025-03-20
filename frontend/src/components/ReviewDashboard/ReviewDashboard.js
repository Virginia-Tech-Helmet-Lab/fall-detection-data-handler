import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ReviewDashboard.css';

const ReviewDashboard = () => {
    const [reviewData, setReviewData] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeAnnotation, setActiveAnnotation] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchReviewData();
    }, []);

    const fetchReviewData = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5000/api/review');
            setReviewData(response.data);
            setError(null);
        } catch(error) {
            console.error("Error fetching review data:", error);
            setError("Failed to load review data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectVideo = (video) => {
        setSelectedVideo(video);
        setActiveAnnotation(null);
    };

    const handleEditVideo = (videoId) => {
        // Navigate back to labeling interface with the selected video
        navigate(`/label?videoId=${videoId}`);
    };

    const handleConfirmVideo = async (videoId) => {
        try {
            await axios.post(`http://localhost:5000/api/videos/${videoId}/confirm`);
            
            // Update the local state to reflect the change
            setReviewData(reviewData.map(video => {
                if (video.video_id === videoId) {
                    return { ...video, status: 'confirmed' };
                }
                return video;
            }));
            
            alert('Video annotations confirmed successfully!');
        } catch (error) {
            console.error("Error confirming video:", error);
            alert('Failed to confirm video annotations. Please try again.');
        }
    };

    const handleCompleteReview = async () => {
        // Check if all videos are confirmed
        const allConfirmed = reviewData.every(video => video.status === 'confirmed');
        
        if (!allConfirmed) {
            if (!window.confirm('Some videos have not been confirmed. Are you sure you want to complete the review?')) {
                return;
            }
        }
        
        try {
            await axios.post('http://localhost:5000/api/review/complete');
            alert('Review completed successfully! You can now start a new batch or export the results.');
            navigate('/');
        } catch (error) {
            console.error("Error completing review:", error);
            alert('Failed to complete review. Please try again.');
        }
    };

    const handleSeekToAnnotation = (annotation) => {
        setActiveAnnotation(annotation);
        
        // If there's a video player, seek to the annotation start time
        const videoPlayer = document.querySelector('.review-video-player');
        if (videoPlayer && annotation.start_time) {
            videoPlayer.currentTime = annotation.start_time;
            videoPlayer.play();
        }
    };

    // Count confirmed and pending videos
    const confirmedCount = reviewData.filter(v => v.status === 'confirmed').length;
    const pendingCount = reviewData.length - confirmedCount;

    return (
        <div className="review-dashboard">
            <h2>Review Dashboard</h2>
            
            {loading && <p className="loading-message">Loading review data...</p>}
            {error && <p className="error-message">{error}</p>}
            
            {!loading && !error && (
                <>
                    <div className="review-summary">
                        <h3>Annotation Summary</h3>
                        <div className="summary-stats">
                            <div className="stat-item">
                                <span className="stat-label">Total Videos</span>
                                <span className="stat-value">{reviewData.length}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Confirmed</span>
                                <span className="stat-value">{confirmedCount}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Pending Review</span>
                                <span className="stat-value">{pendingCount}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="videos-container">
                        <div className="video-list-panel">
                            <h3>Videos</h3>
                            {reviewData.length === 0 ? (
                                <p className="no-videos">No videos available for review.</p>
                            ) : (
                                <ul className="video-list">
                                    {reviewData.map((video) => (
                                        <li 
                                            key={video.video_id} 
                                            className={`video-item ${selectedVideo?.video_id === video.video_id ? 'selected' : ''} ${video.status === 'confirmed' ? 'confirmed' : ''}`}
                                            onClick={() => handleSelectVideo(video)}
                                        >
                                            <div className="video-name">{video.filename}</div>
                                            <div className="video-stats">
                                                <span>Falls: {video.annotations?.filter(a => a.label === 'Fall').length || 0}</span>
                                                <span>Bbox: {video.bboxAnnotations?.length || 0}</span>
                                            </div>
                                            {video.status === 'confirmed' && (
                                                <div className="status-badge confirmed">Confirmed</div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        
                        <div className="video-detail-panel">
                            {selectedVideo ? (
                                <div className="video-details">
                                    <h3>{selectedVideo.filename}</h3>
                                    
                                    <div className="video-preview">
                                        <video 
                                            controls 
                                            src={`http://localhost:5000/api/static/${selectedVideo.filename}`}
                                            className="review-video-player"
                                        />
                                    </div>
                                    
                                    <div className="annotation-details">
                                        <h4>Fall Events</h4>
                                        {selectedVideo.annotations?.length > 0 ? (
                                            <ul className="annotation-list">
                                                {selectedVideo.annotations.map((annotation, index) => (
                                                    <li 
                                                        key={index} 
                                                        className={`annotation-item ${activeAnnotation === annotation ? 'active' : ''}`}
                                                        onClick={() => handleSeekToAnnotation(annotation)}
                                                    >
                                                        <div className="annotation-label">{annotation.label}</div>
                                                        <div className="annotation-time">
                                                            {annotation.start_time.toFixed(2)}s - {annotation.end_time.toFixed(2)}s
                                                        </div>
                                                        <div className="annotation-frames">
                                                            Frames: {annotation.start_frame} - {annotation.end_frame}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="no-annotations">No fall events annotated.</p>
                                        )}
                                        
                                        <h4>Bounding Box Annotations</h4>
                                        {selectedVideo.bboxAnnotations?.length > 0 ? (
                                            <ul className="annotation-list">
                                                {selectedVideo.bboxAnnotations.map((bbox, index) => (
                                                    <li key={index} className="annotation-item">
                                                        <div className="annotation-label">{bbox.part_label}</div>
                                                        <div>Frame: {bbox.frame_index}</div>
                                                        <div>Position: ({Math.round(bbox.x)}, {Math.round(bbox.y)})</div>
                                                        <div>Size: {Math.round(bbox.width)} x {Math.round(bbox.height)}</div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="no-annotations">No bounding boxes annotated.</p>
                                        )}
                                    </div>
                                    
                                    <div className="video-actions">
                                        <button 
                                            className="edit-button"
                                            onClick={() => handleEditVideo(selectedVideo.video_id)}
                                        >
                                            Edit Annotations
                                        </button>
                                        <button 
                                            className="confirm-button"
                                            onClick={() => handleConfirmVideo(selectedVideo.video_id)}
                                            disabled={selectedVideo.status === 'confirmed'}
                                        >
                                            {selectedVideo.status === 'confirmed' ? 'Confirmed' : 'Confirm Annotations'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="select-prompt">
                                    <p>Select a video from the list to review its annotations.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="review-actions">
                        <button 
                            className="complete-review-button"
                            onClick={handleCompleteReview}
                            disabled={reviewData.length === 0}
                        >
                            Complete Review
                        </button>
                        <button 
                            className="return-labeling-button"
                            onClick={() => navigate('/label')}
                        >
                            Return to Labeling
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ReviewDashboard;
