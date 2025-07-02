import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Radar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    RadialLinearScale,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { FaStar, FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaTags } from 'react-icons/fa';
import './DataQuality.css';

// Register ChartJS components
ChartJS.register(
    RadialLinearScale,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const DataQuality = ({ projectId }) => {
    const [qualityData, setQualityData] = useState(null);
    const [teamData, setTeamData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (projectId) {
            fetchQualityData();
            fetchTeamData();
        }
    }, [projectId]);

    const fetchQualityData = async () => {
        try {
            const response = await axios.get(
                `http://localhost:5000/api/analytics/quality/${projectId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }
            );
            setQualityData(response.data);
        } catch (err) {
            console.error('Error fetching quality data:', err);
            setError('Failed to load quality metrics');
        }
    };

    const fetchTeamData = async () => {
        try {
            const response = await axios.get(
                `http://localhost:5000/api/analytics/team/${projectId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }
            );
            setTeamData(response.data);
        } catch (err) {
            console.error('Error fetching team data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!projectId) {
        return <div className="no-project-selected">Please select a project to view quality metrics</div>;
    }

    if (loading) return <div className="loading-spinner">Loading quality metrics...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!qualityData) return null;

    const { quality_metrics, video_completion, annotations_per_video } = qualityData;

    // Prepare quality distribution chart
    const distributionData = {
        labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
        datasets: [{
            label: 'Review Scores',
            data: Object.values(quality_metrics.distribution),
            backgroundColor: [
                'rgba(255, 99, 132, 0.5)',
                'rgba(255, 159, 64, 0.5)',
                'rgba(255, 205, 86, 0.5)',
                'rgba(75, 192, 192, 0.5)',
                'rgba(54, 162, 235, 0.5)'
            ],
            borderColor: [
                'rgb(255, 99, 132)',
                'rgb(255, 159, 64)',
                'rgb(255, 205, 86)',
                'rgb(75, 192, 192)',
                'rgb(54, 162, 235)'
            ],
            borderWidth: 1
        }]
    };

    // Calculate team quality scores if available
    let teamQualityData = null;
    if (teamData && teamData.team_stats) {
        const annotators = teamData.team_stats.filter(m => m.total_annotations > 0);
        if (annotators.length > 0) {
            teamQualityData = {
                labels: annotators.map(m => m.username),
                datasets: [{
                    label: 'Productivity Score',
                    data: annotators.map(m => {
                        const completionRate = m.videos_assigned > 0 
                            ? (m.videos_completed / m.videos_assigned) * 100 
                            : 0;
                        return completionRate;
                    }),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            };
        }
    }

    const getQualityLevel = (score) => {
        if (score >= 4.5) return { level: 'Excellent', color: 'excellent' };
        if (score >= 3.5) return { level: 'Good', color: 'good' };
        if (score >= 2.5) return { level: 'Fair', color: 'fair' };
        return { level: 'Needs Improvement', color: 'poor' };
    };

    const qualityLevel = getQualityLevel(quality_metrics.average_score);

    return (
        <div className="data-quality">
            <div className="quality-header">
                <h2>Data Quality Metrics</h2>
            </div>

            <div className="quality-overview">
                <div className="quality-card main-score">
                    <div className="score-display">
                        <FaStar className="star-icon filled" />
                        <div className="score-value">{quality_metrics.average_score}</div>
                        <div className="score-max">/5.0</div>
                    </div>
                    <div className={`quality-level ${qualityLevel.color}`}>
                        {qualityLevel.level}
                    </div>
                    <div className="score-details">
                        Based on {quality_metrics.total_reviews} reviews
                    </div>
                </div>

                <div className="quality-card completion">
                    <FaCheckCircle className="card-icon success" />
                    <div className="card-content">
                        <h3>Video Completion</h3>
                        <div className="metric-value">{video_completion.toFixed(1)}%</div>
                        <div className="metric-label">Videos Completed</div>
                    </div>
                </div>

                <div className="quality-card density">
                    <FaTags className="card-icon" />
                    <div className="card-content">
                        <h3>Annotation Density</h3>
                        <div className="metric-value">{annotations_per_video}</div>
                        <div className="metric-label">Avg per Video</div>
                    </div>
                </div>
            </div>

            <div className="quality-charts">
                <div className="chart-container">
                    <h3>Quality Score Distribution</h3>
                    <div className="chart-wrapper">
                        <Bar 
                            data={distributionData} 
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        display: false
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: {
                                            stepSize: 1
                                        }
                                    }
                                }
                            }} 
                        />
                    </div>
                </div>

                {teamQualityData && (
                    <div className="chart-container">
                        <h3>Team Productivity</h3>
                        <div className="chart-wrapper">
                            <Bar 
                                data={teamQualityData} 
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            max: 100,
                                            ticks: {
                                                callback: function(value) {
                                                    return value + '%';
                                                }
                                            }
                                        }
                                    }
                                }} 
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="quality-indicators">
                <h3>Quality Indicators</h3>
                <div className="indicators-grid">
                    <div className="indicator">
                        <div className={`indicator-icon ${video_completion >= 80 ? 'good' : video_completion >= 50 ? 'warning' : 'poor'}`}>
                            {video_completion >= 80 ? <FaCheckCircle /> : 
                             video_completion >= 50 ? <FaExclamationTriangle /> : 
                             <FaTimesCircle />}
                        </div>
                        <div className="indicator-content">
                            <h4>Completion Rate</h4>
                            <p>
                                {video_completion >= 80 ? 'Excellent progress' : 
                                 video_completion >= 50 ? 'Good progress, keep going' : 
                                 'Needs attention'}
                            </p>
                        </div>
                    </div>

                    <div className="indicator">
                        <div className={`indicator-icon ${quality_metrics.average_score >= 4 ? 'good' : quality_metrics.average_score >= 3 ? 'warning' : 'poor'}`}>
                            {quality_metrics.average_score >= 4 ? <FaCheckCircle /> : 
                             quality_metrics.average_score >= 3 ? <FaExclamationTriangle /> : 
                             <FaTimesCircle />}
                        </div>
                        <div className="indicator-content">
                            <h4>Annotation Quality</h4>
                            <p>
                                {quality_metrics.average_score >= 4 ? 'High quality annotations' : 
                                 quality_metrics.average_score >= 3 ? 'Acceptable quality' : 
                                 'Quality improvement needed'}
                            </p>
                        </div>
                    </div>

                    <div className="indicator">
                        <div className={`indicator-icon ${annotations_per_video >= 5 ? 'good' : annotations_per_video >= 2 ? 'warning' : 'poor'}`}>
                            {annotations_per_video >= 5 ? <FaCheckCircle /> : 
                             annotations_per_video >= 2 ? <FaExclamationTriangle /> : 
                             <FaTimesCircle />}
                        </div>
                        <div className="indicator-content">
                            <h4>Annotation Coverage</h4>
                            <p>
                                {annotations_per_video >= 5 ? 'Comprehensive coverage' : 
                                 annotations_per_video >= 2 ? 'Moderate coverage' : 
                                 'Low annotation density'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="quality-recommendations">
                <h3>Recommendations</h3>
                <ul>
                    {video_completion < 80 && (
                        <li>Focus on completing remaining videos to reach project goals</li>
                    )}
                    {quality_metrics.average_score < 3.5 && (
                        <li>Review annotation guidelines with team to improve quality scores</li>
                    )}
                    {annotations_per_video < 3 && (
                        <li>Encourage more thorough annotation of each video</li>
                    )}
                    {quality_metrics.distribution['1'] + quality_metrics.distribution['2'] > quality_metrics.total_reviews * 0.3 && (
                        <li>Address videos with low quality scores through additional training or re-annotation</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default DataQuality;