import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaArrowLeft, FaArrowRight, FaList } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import './VideoQueue.css';

const VideoQueue = ({ selectedVideo, onVideoSelect }) => {
    const { user } = useAuth();
    const { currentProject } = useProject();
    const [assignedVideos, setAssignedVideos] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (currentProject && user) {
            fetchAssignedVideos();
        }
    }, [currentProject, user]);

    useEffect(() => {
        if (selectedVideo && assignedVideos.length > 0) {
            const index = assignedVideos.findIndex(v => v.video_id === selectedVideo.video_id);
            setCurrentIndex(index);
        }
    }, [selectedVideo, assignedVideos]);

    const fetchAssignedVideos = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (currentProject?.project_id) {
                params.append('project_id', currentProject.project_id);
            }
            if (user?.user_id) {
                params.append('assigned_to', user.user_id);
            }

            const response = await axios.get(
                `http://localhost:5000/api/videos?${params.toString()}`,
                { withCredentials: true }
            );

            setAssignedVideos(response.data || []);
        } catch (error) {
            console.error('Error fetching assigned videos:', error);
            setAssignedVideos([]);
        } finally {
            setLoading(false);
        }
    };

    const goToPrevious = () => {
        if (currentIndex > 0) {
            const prevVideo = assignedVideos[currentIndex - 1];
            onVideoSelect(prevVideo);
        }
    };

    const goToNext = () => {
        if (currentIndex < assignedVideos.length - 1) {
            const nextVideo = assignedVideos[currentIndex + 1];
            onVideoSelect(nextVideo);
        }
    };

    const goToVideo = (index) => {
        if (index >= 0 && index < assignedVideos.length) {
            const video = assignedVideos[index];
            onVideoSelect(video);
        }
    };

    if (loading || !user || assignedVideos.length === 0) {
        return null;
    }

    return (
        <div className="video-queue">
            <div className="queue-header">
                <FaList className="queue-icon" />
                <span>Video Queue ({currentIndex + 1} of {assignedVideos.length})</span>
            </div>

            <div className="queue-navigation">
                <button 
                    className="nav-btn prev-btn"
                    onClick={goToPrevious}
                    disabled={currentIndex <= 0}
                    title="Previous Video"
                >
                    <FaArrowLeft />
                </button>

                <div className="video-indicator">
                    <span className="current-video">
                        {selectedVideo ? selectedVideo.filename : 'No video selected'}
                    </span>
                    <div className="video-dots">
                        {assignedVideos.map((video, index) => (
                            <button
                                key={video.video_id}
                                className={`video-dot ${index === currentIndex ? 'active' : ''}`}
                                onClick={() => goToVideo(index)}
                                title={video.filename}
                            />
                        ))}
                    </div>
                </div>

                <button 
                    className="nav-btn next-btn"
                    onClick={goToNext}
                    disabled={currentIndex >= assignedVideos.length - 1}
                    title="Next Video"
                >
                    <FaArrowRight />
                </button>
            </div>

            <div className="queue-shortcuts">
                <span className="shortcut-hint">
                    Use ← → arrow keys to navigate
                </span>
            </div>
        </div>
    );
};

export default VideoQueue;