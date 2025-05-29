import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import axios from 'axios';
import { FaChartBar, FaUsers, FaProjectDiagram, FaFileExport, FaStar, FaUserClock } from 'react-icons/fa';
import UserPerformance from './UserPerformance';
import ProjectMetrics from './ProjectMetrics';
import DataQuality from './DataQuality';
import ExportReports from './ExportReports';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = () => {
    const { user, isAdmin, isReviewer } = useAuth();
    const { currentProject, projects } = useProject();
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedProject, setSelectedProject] = useState(currentProject?.project_id || null);
    const [systemOverview, setSystemOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isAdmin() || isReviewer()) {
            fetchSystemOverview();
        }
    }, [user]);

    useEffect(() => {
        if (currentProject && !selectedProject) {
            setSelectedProject(currentProject.project_id);
        }
    }, [currentProject]);

    const fetchSystemOverview = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5000/api/analytics/overview', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            setSystemOverview(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching system overview:', err);
            setError('Failed to load system overview');
        } finally {
            setLoading(false);
        }
    };

    const renderOverview = () => {
        if (!systemOverview) return null;

        return (
            <div className="analytics-overview">
                <h2>System Overview</h2>
                
                <div className="overview-cards">
                    <div className="overview-card users">
                        <FaUsers className="card-icon" />
                        <div className="card-content">
                            <h3>Users</h3>
                            <div className="stat-value">{systemOverview.user_stats.total}</div>
                            <div className="stat-details">
                                <span>{systemOverview.user_stats.active} active</span>
                                <div className="role-breakdown">
                                    <span>Admin: {systemOverview.user_stats.by_role.admin}</span>
                                    <span>Annotators: {systemOverview.user_stats.by_role.annotator}</span>
                                    <span>Reviewers: {systemOverview.user_stats.by_role.reviewer}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="overview-card projects">
                        <FaProjectDiagram className="card-icon" />
                        <div className="card-content">
                            <h3>Projects</h3>
                            <div className="stat-value">{systemOverview.project_stats.total}</div>
                            <div className="stat-details">
                                <span>{systemOverview.project_stats.active} active</span>
                            </div>
                        </div>
                    </div>

                    <div className="overview-card videos">
                        <FaChartBar className="card-icon" />
                        <div className="card-content">
                            <h3>Videos</h3>
                            <div className="stat-value">{systemOverview.video_stats.total}</div>
                            <div className="stat-details">
                                <span>{systemOverview.video_stats.completed} completed</span>
                                <span>{systemOverview.video_stats.in_progress} in progress</span>
                            </div>
                        </div>
                    </div>

                    <div className="overview-card quality">
                        <FaStar className="card-icon" />
                        <div className="card-content">
                            <h3>Quality</h3>
                            <div className="stat-value">
                                {systemOverview.health_metrics.completion_rate.toFixed(1)}%
                            </div>
                            <div className="stat-details">
                                <span>Completion Rate</span>
                                <span>{systemOverview.review_stats.pending} pending reviews</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="health-metrics">
                    <h3>System Health</h3>
                    <div className="health-grid">
                        <div className="health-metric">
                            <span className="metric-label">Assignment Coverage</span>
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill"
                                    style={{ width: `${systemOverview.health_metrics.assignment_coverage}%` }}
                                />
                            </div>
                            <span className="metric-value">
                                {systemOverview.health_metrics.assignment_coverage.toFixed(1)}%
                            </span>
                        </div>

                        <div className="health-metric">
                            <span className="metric-label">Active User Rate</span>
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill"
                                    style={{ width: `${systemOverview.health_metrics.active_user_rate}%` }}
                                />
                            </div>
                            <span className="metric-value">
                                {systemOverview.health_metrics.active_user_rate.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>

                <div className="recent-activity">
                    <h3>Recent Activity</h3>
                    <div className="activity-list">
                        {systemOverview.recent_activity.map((activity, index) => (
                            <div key={index} className="activity-item">
                                <FaUserClock className="activity-icon" />
                                <div className="activity-details">
                                    <span className="activity-user">{activity.user}</span>
                                    <span className="activity-action">
                                        added {activity.type} annotation "{activity.label}"
                                    </span>
                                    <span className="activity-video">in {activity.video}</span>
                                </div>
                                <span className="activity-time">
                                    {new Date(activity.created_at).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return isAdmin() || isReviewer() ? renderOverview() : (
                    <UserPerformance userId={user.user_id} />
                );
            case 'user':
                return <UserPerformance userId={user.user_id} projectId={selectedProject} />;
            case 'project':
                return <ProjectMetrics projectId={selectedProject} />;
            case 'quality':
                return <DataQuality projectId={selectedProject} />;
            case 'export':
                return <ExportReports projectId={selectedProject} />;
            default:
                return null;
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <FaChartBar />, roles: ['admin', 'reviewer', 'annotator'] },
        { id: 'user', label: 'My Performance', icon: <FaUserClock />, roles: ['annotator', 'reviewer'] },
        { id: 'project', label: 'Project Metrics', icon: <FaProjectDiagram />, roles: ['admin', 'reviewer', 'annotator'] },
        { id: 'quality', label: 'Data Quality', icon: <FaStar />, roles: ['admin', 'reviewer'] },
        { id: 'export', label: 'Export Reports', icon: <FaFileExport />, roles: ['admin', 'reviewer'] }
    ];

    const userRole = user?.role?.toLowerCase() || 'annotator';
    const availableTabs = tabs.filter(tab => tab.roles.includes(userRole));

    return (
        <div className="analytics-dashboard">
            <div className="dashboard-header">
                <h1>Analytics & Reporting</h1>
                {projects.length > 0 && (
                    <div className="project-selector">
                        <label>Project:</label>
                        <select 
                            value={selectedProject || ''} 
                            onChange={(e) => setSelectedProject(parseInt(e.target.value))}
                        >
                            <option value="">All Projects</option>
                            {projects.map(project => (
                                <option key={project.project_id} value={project.project_id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="analytics-tabs">
                {availableTabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="analytics-content">
                {loading && activeTab === 'overview' ? (
                    <div className="loading-spinner">Loading analytics...</div>
                ) : error && activeTab === 'overview' ? (
                    <div className="error-message">{error}</div>
                ) : (
                    renderTabContent()
                )}
            </div>
        </div>
    );
};

export default AnalyticsDashboard;