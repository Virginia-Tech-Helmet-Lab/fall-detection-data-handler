import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCheckCircle, FaClock, FaCircle } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import './ProgressTracker.css';

const ProgressTracker = () => {
    const { user } = useAuth();
    const { currentProject } = useProject();
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (currentProject && user) {
            fetchProgress();
        }
    }, [currentProject, user]);

    const fetchProgress = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `http://localhost:5000/api/user-progress/${currentProject.project_id}`,
                {
                    withCredentials: true,
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }
            );
            setProgress(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching progress:', err);
            setError('Failed to load progress');
        } finally {
            setLoading(false);
        }
    };

    if (!currentProject || !user) {
        return null;
    }

    if (loading) {
        return (
            <div className="progress-tracker loading">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="progress-tracker error">
                <p>{error}</p>
            </div>
        );
    }

    if (!progress) {
        return null;
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <FaCheckCircle className="status-icon completed" />;
            case 'in_progress':
                return <FaClock className="status-icon in-progress" />;
            default:
                return <FaCircle className="status-icon not-started" />;
        }
    };

    return (
        <div className="progress-tracker">
            <h3>Your Progress</h3>
            
            <div className="progress-summary">
                <div className="progress-bar-container">
                    <div className="progress-bar">
                        <div 
                            className="progress-fill"
                            style={{ width: `${progress.completion_percentage}%` }}
                        />
                    </div>
                    <span className="progress-percentage">{progress.completion_percentage}%</span>
                </div>
                
                <div className="progress-stats">
                    <div className="stat-item">
                        <FaCheckCircle className="stat-icon completed" />
                        <span>{progress.completed} Completed</span>
                    </div>
                    <div className="stat-item">
                        <FaClock className="stat-icon in-progress" />
                        <span>{progress.in_progress} In Progress</span>
                    </div>
                    <div className="stat-item">
                        <FaCircle className="stat-icon not-started" />
                        <span>{progress.not_started} Not Started</span>
                    </div>
                </div>
            </div>

            <div className="video-progress-list">
                <h4>Video Status</h4>
                <div className="video-items">
                    {progress.videos.map(video => (
                        <div key={video.video_id} className="video-progress-item">
                            {getStatusIcon(video.status)}
                            <span className="video-name">{video.filename}</span>
                            <div className="annotation-counts">
                                <span className="count">{video.temporal_annotations} temporal</span>
                                <span className="count">{video.bbox_annotations} bbox</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProgressTracker;