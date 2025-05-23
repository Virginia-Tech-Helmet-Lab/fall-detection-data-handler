import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaFolder, FaUsers, FaChartLine, FaClock, FaArchive } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import ProjectCard from './ProjectCard';
import './ProjectDashboard.css';

const ProjectDashboard = () => {
    const { user } = useAuth();
    const { projects, loading, error, fetchProjects, switchProject } = useProject();
    const navigate = useNavigate();
    const [showArchived, setShowArchived] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchProjects(showArchived);
    }, [fetchProjects, showArchived]);

    const handleProjectClick = (project) => {
        switchProject(project);
        navigate('/');
    };

    const handleCreateProject = () => {
        navigate('/projects/new');
    };

    // Filter projects based on status
    const filteredProjects = projects.filter(project => {
        if (filterStatus === 'all') return true;
        return project.status === filterStatus;
    });

    // Calculate statistics
    const stats = {
        total: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        completed: projects.filter(p => p.status === 'completed').length,
        setup: projects.filter(p => p.status === 'setup').length,
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
                {user?.role === 'admin' && (
                    <button className="create-project-btn" onClick={handleCreateProject}>
                        <FaPlus /> New Project
                    </button>
                )}
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
                <div className="stat-card setup">
                    <div className="stat-icon">
                        <FaUsers />
                    </div>
                    <div className="stat-content">
                        <h3>{stats.setup}</h3>
                        <p>In Setup</p>
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
                        <option value="setup">Setup</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={showArchived}
                            onChange={(e) => setShowArchived(e.target.checked)}
                        />
                        <FaArchive /> Show Archived
                    </label>
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
                                : user?.role === 'admin' 
                                    ? 'Get started by creating your first project.'
                                    : 'No projects assigned to you yet.'
                            }
                        </p>
                        {user?.role === 'admin' && filterStatus === 'all' && (
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
                            userRole={user?.role}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default ProjectDashboard;