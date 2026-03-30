import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaFolder, FaChartLine, FaClock, FaSync } from 'react-icons/fa';
import { useProject } from '../../contexts/ProjectContext';
import ProjectCard from './ProjectCard';
import './ProjectDashboard.css';

const ProjectDashboard = () => {
    const { projects, loading, error, fetchProjects, switchProject } = useProject();
    const navigate = useNavigate();
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleProjectClick = (project) => {
        switchProject(project);
        navigate('/');
    };

    const handleCreateProject = () => {
        navigate('/projects/new');
    };

    const filteredProjects = projects.filter(project => {
        if (filterStatus === 'all') return true;
        return project.status === filterStatus;
    });

    const stats = {
        total: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        completed: projects.filter(p => p.status === 'completed').length,
    };

    if (loading) {
        return (
            <div className="project-dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading projects...</p>
            </div>
        );
    }

    return (
        <div className="project-dashboard">
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>Projects</h1>
                    <p>Manage your fall detection annotation projects</p>
                </div>
                <div className="header-actions">
                    <button className="refresh-btn" onClick={() => fetchProjects()}>
                        <FaSync /> Refresh
                    </button>
                    <button className="create-project-btn" onClick={handleCreateProject}>
                        <FaPlus /> New Project
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-icon">
                        <FaFolder />
                    </div>
                    <div className="stat-content">
                        <h3>{stats.total}</h3>
                        <p>Total Projects</p>
                    </div>
                </div>
                <div className="stat-card active">
                    <div className="stat-icon">
                        <FaChartLine />
                    </div>
                    <div className="stat-content">
                        <h3>{stats.active}</h3>
                        <p>Active Projects</p>
                    </div>
                </div>
                <div className="stat-card completed">
                    <div className="stat-icon">
                        <FaClock />
                    </div>
                    <div className="stat-content">
                        <h3>{stats.completed}</h3>
                        <p>Completed</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="dashboard-filters">
                <div className="filter-group">
                    <label>Status:</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Projects</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="error-message">
                    <p>Error: {error}</p>
                </div>
            )}

            {/* Projects Grid */}
            <div className="projects-grid">
                {filteredProjects.length === 0 ? (
                    <div className="no-projects">
                        <FaFolder className="no-projects-icon" />
                        <h3>No projects found</h3>
                        <p>
                            {filterStatus !== 'all'
                                ? `No ${filterStatus} projects available.`
                                : 'Get started by creating your first project.'
                            }
                        </p>
                        {filterStatus === 'all' && (
                            <button className="create-first-project-btn" onClick={handleCreateProject}>
                                <FaPlus /> Create First Project
                            </button>
                        )}
                    </div>
                ) : (
                    filteredProjects.map(project => (
                        <ProjectCard
                            key={project.project_id}
                            project={project}
                            onClick={() => handleProjectClick(project)}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default ProjectDashboard;
