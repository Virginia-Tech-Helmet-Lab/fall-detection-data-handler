import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Doughnut, Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { FaVideo, FaTags, FaUsers, FaClock, FaChartLine } from 'react-icons/fa';
import './ProjectMetrics.css';

// Register ChartJS components
ChartJS.register(
    ArcElement,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const ProjectMetrics = ({ projectId }) => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (projectId) {
            fetchProjectMetrics();
        }
    }, [projectId]);

    const fetchProjectMetrics = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `http://localhost:5000/api/analytics/project/${projectId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }
            );
            setMetrics(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching project metrics:', err);
            setError('Failed to load project metrics');
        } finally {
            setLoading(false);
        }
    };

    if (!projectId) {
        return <div className="no-project-selected">Please select a project to view metrics</div>;
    }

    if (loading) return <div className="loading-spinner">Loading project metrics...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!metrics) return null;

    const { project, video_stats, annotation_stats, quality_metrics, team_stats, timeline_data } = metrics;

    // Prepare completion chart data
    const completionData = {
        labels: ['Completed', 'In Progress'],
        datasets: [{
            data: [video_stats.completed, video_stats.in_progress],
            backgroundColor: ['#28a745', '#ffc107'],
            borderWidth: 0
        }]
    };

    // Prepare timeline chart data
    const timelineChartData = {
        labels: timeline_data.map(d => new Date(d.date).toLocaleDateString()),
        datasets: [{
            label: 'Videos Completed',
            data: timeline_data.map(d => d.completed),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            tension: 0.1
        }]
    };

    // Prepare team performance data
    const teamChartData = {
        labels: team_stats.map(member => member.username),
        datasets: [
            {
                label: 'Videos Completed',
                data: team_stats.map(member => member.videos_completed),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            },
            {
                label: 'Total Annotations',
                data: team_stats.map(member => member.total_annotations),
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            }
        }
    };

    return (
        <div className="project-metrics">
            <div className="metrics-header">
                <h2>{project.name} - Project Metrics</h2>
                <div className="project-status">
                    Status: <span className={`status-badge ${project.status.toLowerCase()}`}>
                        {project.status}
                    </span>
                </div>
            </div>

            <div className="metrics-overview">
                <div className="metric-card">
                    <FaVideo className="metric-icon" />
                    <div className="metric-content">
                        <h3>Video Progress</h3>
                        <div className="metric-value">{video_stats.completed}/{video_stats.total}</div>
                        <div className="metric-label">Videos Completed</div>
                        <div className="progress-bar">
                            <div 
                                className="progress-fill"
                                style={{ width: `${video_stats.completion_rate}%` }}
                            />
                        </div>
                        <span className="progress-text">{video_stats.completion_rate.toFixed(1)}%</span>
                    </div>
                </div>

                <div className="metric-card">
                    <FaTags className="metric-icon" />
                    <div className="metric-content">
                        <h3>Annotations</h3>
                        <div className="metric-value">{annotation_stats.total_annotations}</div>
                        <div className="metric-label">Total Annotations</div>
                        <div className="annotation-breakdown">
                            <span>Temporal: {annotation_stats.total_temporal}</span>
                            <span>Bounding Box: {annotation_stats.total_bbox}</span>
                        </div>
                        <div className="avg-annotations">
                            <span>Average per video: {annotation_stats.average_per_video}</span>
                        </div>
                    </div>
                </div>

                <div className="metric-card">
                    <FaClock className="metric-icon" />
                    <div className="metric-content">
                        <h3>Duration</h3>
                        <div className="metric-value">{video_stats.total_duration_formatted}</div>
                        <div className="metric-label">Total Video Time</div>
                    </div>
                </div>

                <div className="metric-card">
                    <FaUsers className="metric-icon" />
                    <div className="metric-content">
                        <h3>Team Size</h3>
                        <div className="metric-value">{team_stats.length}</div>
                        <div className="metric-label">Team Members</div>
                    </div>
                </div>
            </div>

            <div className="charts-grid">
                <div className="chart-container completion-chart">
                    <h3>Completion Status</h3>
                    <div className="chart-wrapper">
                        <Doughnut data={completionData} options={chartOptions} />
                    </div>
                </div>

                <div className="chart-container timeline-chart">
                    <h3>Project Timeline</h3>
                    <div className="chart-wrapper">
                        <Line data={timelineChartData} options={chartOptions} />
                    </div>
                </div>
            </div>

            <div className="team-performance">
                <h3>Team Performance</h3>
                <div className="team-chart">
                    <Bar data={teamChartData} options={chartOptions} />
                </div>
                
                <div className="team-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Team Member</th>
                                <th>Role</th>
                                <th>Assigned</th>
                                <th>Completed</th>
                                <th>Annotations</th>
                                <th>Productivity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {team_stats.map(member => (
                                <tr key={member.user_id}>
                                    <td>{member.full_name}</td>
                                    <td>
                                        <span className={`role-badge ${member.role.toLowerCase()}`}>
                                            {member.role}
                                        </span>
                                    </td>
                                    <td>{member.videos_assigned}</td>
                                    <td>{member.videos_completed}</td>
                                    <td>{member.total_annotations}</td>
                                    <td>
                                        {member.videos_assigned > 0 
                                            ? `${((member.videos_completed / member.videos_assigned) * 100).toFixed(1)}%`
                                            : 'N/A'
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="project-insights">
                <h3>Insights</h3>
                <div className="insights-grid">
                    <div className="insight">
                        <FaChartLine className="insight-icon" />
                        <div className="insight-content">
                            <h4>Completion Trend</h4>
                            <p>
                                Project is {video_stats.completion_rate >= 75 ? 'on track' : 
                                         video_stats.completion_rate >= 50 ? 'progressing steadily' : 
                                         'in early stages'} with {video_stats.completion_rate.toFixed(1)}% completion.
                            </p>
                        </div>
                    </div>
                    
                    <div className="insight">
                        <FaUsers className="insight-icon" />
                        <div className="insight-content">
                            <h4>Team Efficiency</h4>
                            <p>
                                Average annotations per video: {annotation_stats.average_per_video}.
                                {annotation_stats.average_per_video > 5 ? ' High annotation density.' : 
                                 annotation_stats.average_per_video > 2 ? ' Moderate annotation density.' : 
                                 ' Low annotation density.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectMetrics;