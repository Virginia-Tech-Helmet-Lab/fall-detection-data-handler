import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaSort, FaSortUp, FaSortDown, FaFilter, FaSearch } from 'react-icons/fa';
import './ReviewDashboard.css';

const ReviewDashboard = () => {
    const [reviewData, setReviewData] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeAnnotation, setActiveAnnotation] = useState(null);
    const navigate = useNavigate();
    
    // Add filter and sort state
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'confirmed', 'pending'
    const [sortConfig, setSortConfig] = useState({ key: 'filename', direction: 'asc' });
    
    // Add selected videos state for batch operations
    const [selectedVideos, setSelectedVideos] = useState(new Set());
    const [selectMode, setSelectMode] = useState(false);
    
    // Add state for timeline
    const [showTimeline, setShowTimeline] = useState(false);
    const [playingAnnotation, setPlayingAnnotation] = useState(null);
    const videoRef = useRef(null);
    
    // Fetch review data
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
    
    // Sort function
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    
    // Filtered and sorted videos
    const filteredVideos = useMemo(() => {
        // First filter by status
        let filtered = [...reviewData];
        if (statusFilter !== 'all') {
            filtered = filtered.filter(video => video.status === statusFilter);
        }
        
        // Then filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(video => 
                video.filename.toLowerCase().includes(term) ||
                video.annotations?.some(a => a.label.toLowerCase().includes(term))
            );
        }
        
        // Then sort
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                // Handle nested properties like 'annotations.length'
                if (sortConfig.key === 'annotations') {
                    return (a.annotations?.length || 0) - (b.annotations?.length || 0);
                } else if (sortConfig.key === 'bboxAnnotations') {
                    return (a.bboxAnnotations?.length || 0) - (b.bboxAnnotations?.length || 0);
                }
                
                // Standard sort for regular properties
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        
        return filtered;
    }, [reviewData, searchTerm, statusFilter, sortConfig]);

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

    // Toggle select mode
    const toggleSelectMode = () => {
        setSelectMode(!selectMode);
        // Clear selections when exiting select mode
        if (selectMode) {
            setSelectedVideos(new Set());
        }
    };
    
    // Toggle video selection for batch operations
    const toggleVideoSelection = (videoId, e) => {
        e.stopPropagation(); // Prevent triggering the video selection
        
        setSelectedVideos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(videoId)) {
                newSet.delete(videoId);
            } else {
                newSet.add(videoId);
            }
            return newSet;
        });
    };
    
    // Batch confirm selected videos
    const confirmSelectedVideos = async () => {
        if (selectedVideos.size === 0) return;
        
        if (!window.confirm(`Are you sure you want to confirm ${selectedVideos.size} videos?`)) {
            return;
        }
        
        setLoading(true);
        let successCount = 0;
        let errorCount = 0;
        
        for (const videoId of selectedVideos) {
            try {
                await axios.post(`http://localhost:5000/api/videos/${videoId}/confirm`);
                successCount++;
                
                // Update local state
                setReviewData(prev => prev.map(video => {
                    if (video.video_id === videoId) {
                        return { ...video, status: 'confirmed' };
                    }
                    return video;
                }));
            } catch (error) {
                console.error(`Error confirming video ${videoId}:`, error);
                errorCount++;
            }
        }
        
        setLoading(false);
        setSelectedVideos(new Set());
        
        if (errorCount === 0) {
            alert(`Successfully confirmed ${successCount} videos.`);
        } else {
            alert(`Confirmed ${successCount} videos. Failed to confirm ${errorCount} videos.`);
        }
    };

    // Create more detailed statistics
    const stats = useMemo(() => {
        if (reviewData.length === 0) return null;
        
        let totalFalls = 0;
        let totalBboxes = 0;
        let videosWithFalls = 0;
        let videosWithBboxes = 0;
        
        reviewData.forEach(video => {
            const fallCount = video.annotations?.filter(a => a.label === 'Fall').length || 0;
            const bboxCount = video.bboxAnnotations?.length || 0;
            
            totalFalls += fallCount;
            totalBboxes += bboxCount;
            
            if (fallCount > 0) videosWithFalls++;
            if (bboxCount > 0) videosWithBboxes++;
        });
        
        return {
            totalVideos: reviewData.length,
            confirmedCount: reviewData.filter(v => v.status === 'confirmed').length,
            pendingCount: reviewData.length - reviewData.filter(v => v.status === 'confirmed').length,
            totalFalls,
            totalBboxes,
            videosWithFalls,
            videosWithBboxes,
            avgFallsPerVideo: totalFalls / (videosWithFalls || 1),
            avgBboxesPerVideo: totalBboxes / (videosWithBboxes || 1)
        };
    }, [reviewData]);

    // Function to play specific annotation
    const playAnnotation = (annotation) => {
        setActiveAnnotation(annotation);
        setPlayingAnnotation(annotation);
        
        if (videoRef.current) {
            videoRef.current.currentTime = annotation.start_time;
            videoRef.current.play();
            
            // Set a timeout to pause at the end of the annotation
            const duration = annotation.end_time - annotation.start_time;
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.pause();
                    setPlayingAnnotation(null);
                }
            }, duration * 1000);
        }
    };

    return (
        <div className="review-dashboard">
            <h2>Review Dashboard</h2>
            
            {/* Add search and filters */}
            {!loading && !error && (
                <div className="dashboard-controls">
                    <div className="search-container">
                        <FaSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search videos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    
                    <div className="filter-controls">
                        <label className="filter-label">
                            <FaFilter className="filter-icon" />
                            Status:
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="status-filter"
                            >
                                <option value="all">All</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="pending">Pending</option>
                            </select>
                        </label>
                        
                        <div className="sort-buttons">
                            <button 
                                onClick={() => requestSort('filename')} 
                                className={`sort-button ${sortConfig.key === 'filename' ? 'active' : ''}`}
                            >
                                Name
                                {sortConfig.key === 'filename' && (
                                    sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
                                )}
                            </button>
                            <button 
                                onClick={() => requestSort('annotations')} 
                                className={`sort-button ${sortConfig.key === 'annotations' ? 'active' : ''}`}
                            >
                                Falls
                                {sortConfig.key === 'annotations' && (
                                    sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {!loading && !error && (
                <div className="batch-actions">
                    <button 
                        className={`select-mode-button ${selectMode ? 'active' : ''}`}
                        onClick={toggleSelectMode}
                    >
                        {selectMode ? 'Exit Select Mode' : 'Select Multiple'}
                    </button>
                    
                    {selectMode && (
                        <>
                            <span className="selected-count">{selectedVideos.size} selected</span>
                            <button 
                                className="batch-confirm-button"
                                disabled={selectedVideos.size === 0}
                                onClick={confirmSelectedVideos}
                            >
                                Confirm Selected
                            </button>
                        </>
                    )}
                </div>
            )}
            
            {loading && <p className="loading-message">Loading review data...</p>}
            {error && <p className="error-message">{error}</p>}
            
            {!loading && !error && stats && (
                <div className="dashboard-metrics">
                    <div className="metrics-panel">
                        <h3>Project Metrics</h3>
                        <div className="metrics-grid">
                            <div className="metric-card">
                                <div className="metric-value">{stats.totalVideos}</div>
                                <div className="metric-label">Total Videos</div>
                            </div>
                            <div className="metric-card confirmed">
                                <div className="metric-value">{stats.confirmedCount}</div>
                                <div className="metric-label">Confirmed</div>
                                <div className="metric-percentage">
                                    {stats.totalVideos ? Math.round((stats.confirmedCount / stats.totalVideos) * 100) : 0}%
                                </div>
                            </div>
                            <div className="metric-card pending">
                                <div className="metric-value">{stats.pendingCount}</div>
                                <div className="metric-label">Pending</div>
                                <div className="metric-percentage">
                                    {stats.totalVideos ? Math.round((stats.pendingCount / stats.totalVideos) * 100) : 0}%
                                </div>
                            </div>
                            <div className="metric-card falls">
                                <div className="metric-value">{stats.totalFalls}</div>
                                <div className="metric-label">Falls Annotated</div>
                                <div className="metric-secondary">
                                    Avg: {stats.avgFallsPerVideo.toFixed(1)} per video
                                </div>
                            </div>
                            <div className="metric-card bboxes">
                                <div className="metric-value">{stats.totalBboxes}</div>
                                <div className="metric-label">Bounding Boxes</div>
                                <div className="metric-secondary">
                                    In {stats.videosWithBboxes} videos
                                </div>
                            </div>
                            <div className="metric-card progress">
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill" 
                                        style={{width: `${stats.totalVideos ? (stats.confirmedCount / stats.totalVideos) * 100 : 0}%`}}
                                    ></div>
                                </div>
                                <div className="metric-label">Overall Progress</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Visual progress indicators */}
                    <div className="progress-chart">
                        {reviewData.map((video, index) => (
                            <div 
                                key={video.video_id}
                                className={`progress-item ${video.status === 'confirmed' ? 'confirmed' : 'pending'}`}
                                title={`${video.filename} (${video.status})`}
                                onClick={() => handleSelectVideo(video)}
                            ></div>
                        ))}
                    </div>
                </div>
            )}
            
            {!loading && !error && (
                <>
                    <div className="videos-container">
                        <div className="video-list-panel">
                            <h3>Videos</h3>
                            {filteredVideos.length === 0 ? (
                                <p className="no-videos">No videos match your filters.</p>
                            ) : (
                                <ul className="video-list">
                                    {filteredVideos.map((video) => (
                                        <li 
                                            key={video.video_id} 
                                            className={`video-item ${selectedVideo?.video_id === video.video_id ? 'selected' : ''} ${video.status === 'confirmed' ? 'confirmed' : ''}`}
                                            onClick={selectMode ? null : () => handleSelectVideo(video)}
                                        >
                                            {selectMode && (
                                                <div className="select-checkbox">
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedVideos.has(video.video_id)}
                                                        onChange={(e) => toggleVideoSelection(video.video_id, e)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            )}
                                            
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
                                            ref={videoRef}
                                            controls 
                                            src={`http://localhost:5000/api/static/${selectedVideo.filename}`}
                                            className="review-video-player"
                                            onTimeUpdate={() => {
                                                // Check if we're past the annotation end time
                                                if (playingAnnotation && videoRef.current && 
                                                    videoRef.current.currentTime > playingAnnotation.end_time) {
                                                    videoRef.current.pause();
                                                    setPlayingAnnotation(null);
                                                }
                                            }}
                                        />
                                        
                                        {/* Add video timeline visualization */}
                                        <button 
                                            className="timeline-toggle"
                                            onClick={() => setShowTimeline(!showTimeline)}
                                        >
                                            {showTimeline ? 'Hide Timeline' : 'Show Timeline'}
                                        </button>
                                        
                                        {showTimeline && selectedVideo.duration && (
                                            <div className="video-timeline">
                                                <div className="timeline-track">
                                                    {selectedVideo.annotations?.map((annotation, index) => {
                                                        const startPercent = (annotation.start_time / selectedVideo.duration) * 100;
                                                        const widthPercent = ((annotation.end_time - annotation.start_time) / selectedVideo.duration) * 100;
                                                        
                                                        return (
                                                            <div 
                                                                key={index}
                                                                className={`timeline-annotation ${activeAnnotation === annotation ? 'active' : ''}`}
                                                                style={{
                                                                    left: `${startPercent}%`,
                                                                    width: `${widthPercent}%`
                                                                }}
                                                                onClick={() => playAnnotation(annotation)}
                                                                title={`${annotation.label}: ${annotation.start_time.toFixed(2)}s - ${annotation.end_time.toFixed(2)}s`}
                                                            ></div>
                                                        );
                                                    })}
                                                    
                                                    {/* Current time indicator */}
                                                    {videoRef.current && (
                                                        <div 
                                                            className="timeline-playhead"
                                                            style={{
                                                                left: `${(videoRef.current.currentTime / selectedVideo.duration) * 100}%`
                                                            }}
                                                        ></div>
                                                    )}
                                                </div>
                                                <div className="timeline-scale">
                                                    {Array.from({length: 10}).map((_, i) => (
                                                        <div key={i} className="timeline-marker">
                                                            <div className="marker-tick"></div>
                                                            <div className="marker-label">
                                                                {((selectedVideo.duration * i) / 10).toFixed(1)}s
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
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
