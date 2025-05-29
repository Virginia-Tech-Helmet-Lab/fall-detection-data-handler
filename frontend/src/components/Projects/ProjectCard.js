import React, { useState } from 'react';
import { FaUsers, FaVideo, FaClock, FaChartLine, FaEdit, FaCog, FaTasks } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import VideoAssignment from './VideoAssignment';
import './ProjectCard.css';

const ProjectCard = ({ project, onClick, userRole }) => {
    const navigate = useNavigate();
    const [showAssignment, setShowAssignment] = useState(false);

    const handleSettingsClick = (e) => {
        e.stopPropagation();
        navigate(`/projects/${project.project_id}/settings`);
    };

    const handleAssignClick = (e) => {
        e.stopPropagation();
        setShowAssignment(true);
    };

    const getStatusClass = (status) => {
        return `status-badge status-${status}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No deadline';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    };

    const getProgressColor = (percentage) => {
        if (percentage >= 80) return '#28a745';
        if (percentage >= 50) return '#ffc107';
        return '#dc3545';
    };

    return (
        <div className="project-card" onClick={onClick}>
            <div className="project-card-header">
                <h3>{project.name}</h3>
                <div className="project-actions">
                    {userRole === 'admin' && project.status === 'active' && (
                        <button 
                            className="project-assign-btn"
                            onClick={handleAssignClick}
                            title="Assign Videos"
                        >
                            <FaTasks />
                        </button>
                    )}
                    {(userRole === 'admin' || project.user_role === 'lead') && (
                        <button 
                            className="project-settings-btn"
                            onClick={handleSettingsClick}
                            title="Project Settings"
                        >
                            <FaCog />
                        </button>
                    )}
                </div>
            </div>

            <div className={getStatusClass(project.status)}>
                {project.status.toUpperCase()}
            </div>

            <p className="project-description">
                {project.description || 'No description available'}
            </p>

            <div className="project-stats">
                <div className="stat-item">
                    <FaVideo />
                    <span>{project.total_videos || 0} videos</span>
                </div>
                <div className="stat-item">
                    <FaUsers />
                    <span>{project.member_count || 0} members</span>
                </div>
                <div className="stat-item">
                    <FaClock />
                    <span>{formatDate(project.deadline)}</span>
                </div>
            </div>

            <div className="project-progress">
                <div className="progress-header">
                    <span>Progress</span>
                    <span>{project.progress_percentage || 0}%</span>
                </div>
                <div className="progress-bar">
                    <div 
                        className="progress-fill"
                        style={{ 
                            width: `${project.progress_percentage || 0}%`,
                            backgroundColor: getProgressColor(project.progress_percentage || 0)
                        }}
                    />
                </div>
                <div className="progress-details">
                    <span>{project.completed_videos || 0} of {project.total_videos || 0} completed</span>
                </div>
            </div>

            <div className="project-footer">
                <div className="created-by">
                    Created by {project.creator_name || 'Unknown'}
                </div>
                <div className="last-activity">
                    Last activity: {project.last_activity ? new Date(project.last_activity).toLocaleDateString() : 'Never'}
                </div>
            </div>

            {showAssignment && (
                <VideoAssignment
                    projectId={project.project_id}
                    projectName={project.name}
                    onClose={() => setShowAssignment(false)}
                />
            )}
        </div>
    );
};

export default ProjectCard;