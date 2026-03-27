import React, { useState, useRef, useEffect } from 'react';
import { FaVideo, FaClock, FaEllipsisV, FaTrash, FaCog, FaDatabase } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useProject } from '../../contexts/ProjectContext';
import './ProjectCard.css';

const ProjectCard = ({ project, onClick }) => {
    const navigate = useNavigate();
    const { fetchProjects } = useProject();
    const [menuOpen, setMenuOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMenuToggle = (e) => {
        e.stopPropagation();
        setMenuOpen(prev => !prev);
    };

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;

        try {
            setDeleting(true);
            await apiClient.delete(`/api/projects/${project.project_id}`);
            await fetchProjects();
        } catch (err) {
            console.error('Error deleting project:', err);
            alert('Failed to delete project');
        } finally {
            setDeleting(false);
            setMenuOpen(false);
        }
    };

    const handleSettings = (e) => {
        e.stopPropagation();
        setMenuOpen(false);
        navigate(`/projects/${project.project_id}/settings`);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No deadline';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
                <div className="project-menu-wrapper" ref={menuRef}>
                    <button className="project-menu-btn" onClick={handleMenuToggle} title="Options">
                        <FaEllipsisV />
                    </button>
                    {menuOpen && (
                        <div className="project-menu-dropdown">
                            <button onClick={handleSettings}>
                                <FaCog /> Settings
                            </button>
                            <button className="danger" onClick={handleDelete} disabled={deleting}>
                                <FaTrash /> {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className={`status-badge status-${project.status}`}>
                {project.status.toUpperCase()}
            </div>

            {project.catalog_dataset_name && (
                <div className="catalog-link-badge">
                    <FaDatabase /> Linked to: {project.catalog_dataset_name}
                </div>
            )}

            <p className="project-description">
                {project.description || 'No description available'}
            </p>

            <div className="project-stats">
                <div className="stat-item">
                    <FaVideo />
                    <span>{project.total_videos || 0} videos</span>
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
                <div className="last-activity">
                    Last activity: {project.last_activity ? new Date(project.last_activity).toLocaleDateString() : 'Never'}
                </div>
            </div>
        </div>
    );
};

export default ProjectCard;
