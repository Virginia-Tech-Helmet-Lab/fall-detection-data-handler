import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VideoList.css';
import { FaVideo, FaUser, FaFolder, FaExclamationTriangle } from 'react-icons/fa';

const VideoList = ({ onVideoSelect, userId, projectId, userRole }) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('assigned'); // 'all', 'assigned', 'unassigned'

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                setLoading(true);
                // Updated API endpoint to include filters
                const params = new URLSearchParams();
                if (projectId) params.append('project_id', projectId);
                if (userId && filter === 'assigned') params.append('assigned_to', userId);
                if (filter === 'unassigned') params.append('unassigned', 'true');
                
                const response = await axios.get(`http://localhost:5000/api/videos?${params}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                });
                setVideos(response.data);
                setError(null);
            } catch (error) {
                console.error("Error fetching videos:", error);
                setError("Failed to load videos. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchVideos();
    }, [userId, projectId, filter]);

    return (
        <div className="video-list">
            <div className="video-list-header">
                <h3>Video Queue</h3>
                {projectId && (
                    <div className="project-indicator">
                        <FaFolder /> Project Active
                    </div>
                )}
            </div>
            
            {/* Filter tabs for admin/reviewer */}
            {userRole && (userRole.toUpperCase() === 'ADMIN' || userRole.toUpperCase() === 'REVIEWER') && (
                <div className="filter-tabs">
                    <button 
                        className={`filter-tab ${filter === 'assigned' ? 'active' : ''}`}
                        onClick={() => setFilter('assigned')}
                    >
                        My Videos
                    </button>
                    <button 
                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All Videos
                    </button>
                    <button 
                        className={`filter-tab ${filter === 'unassigned' ? 'active' : ''}`}
                        onClick={() => setFilter('unassigned')}
                    >
                        Unassigned
                    </button>
                </div>
            )}
            
            {loading && <p className="loading">Loading videos...</p>}
            {error && <p className="error">{error}</p>}
            
            {!loading && !error && videos.length === 0 && (
                <div className="no-videos">
                    {filter === 'assigned' ? (
                        <>
                            <FaExclamationTriangle />
                            <p>No videos assigned to you.</p>
                            <small>Contact your project admin for video assignments.</small>
                        </>
                    ) : (
                        <>
                            <FaVideo />
                            <p>No videos available.</p>
                            <small>Please upload and normalize videos first.</small>
                        </>
                    )}
                </div>
            )}
            
            <ul className="video-items">
                {videos.map(video => (
                    <li key={video.video_id} className={`video-item ${video.status}`}>
                        <button onClick={() => onVideoSelect(video)}>
                            <div className="video-info">
                                <div className="video-name">
                                    <FaVideo /> {video.filename}
                                </div>
                                <div className="video-specs">
                                    {video.resolution}, {video.framerate} fps
                                    {video.duration && `, ${parseFloat(video.duration).toFixed(1)}s`}
                                </div>
                                {video.assigned_to_name && (
                                    <div className="assignment-info">
                                        <FaUser /> {video.assigned_to_name}
                                    </div>
                                )}
                            </div>
                            <div className="video-status">
                                <span className={`status-badge ${video.status || 'pending'}`}>
                                    {video.status || 'Pending'}
                                </span>
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
            
            <div className="queue-stats">
                <small>Showing {videos.length} video{videos.length !== 1 ? 's' : ''}</small>
            </div>
        </div>
    );
};

export default VideoList;
