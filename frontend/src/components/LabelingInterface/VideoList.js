import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VideoList.css';

const VideoList = ({ onVideoSelect }) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                setLoading(true);
                const response = await axios.get('http://localhost:5000/api/videos');
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
    }, []);

    return (
        <div className="video-list">
            <h3>Available Videos</h3>
            
            {loading && <p className="loading">Loading videos...</p>}
            {error && <p className="error">{error}</p>}
            
            {!loading && !error && videos.length === 0 && (
                <p className="no-videos">No videos available. Please upload and normalize videos first.</p>
            )}
            
            <ul className="video-items">
                {videos.map(video => (
                    <li key={video.video_id} className="video-item">
                        <button onClick={() => onVideoSelect(video)}>
                            <div className="video-name">{video.filename}</div>
                            <div className="video-specs">
                                {video.resolution}, {video.framerate} fps
                                {video.duration && `, ${parseFloat(video.duration).toFixed(1)}s`}
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default VideoList;
