import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { FaVideo, FaTags, FaStar, FaClock } from 'react-icons/fa';
import './UserPerformance.css';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const UserPerformance = ({ userId, projectId = null }) => {
    const [performance, setPerformance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState(30); // days

    useEffect(() => {
        if (userId) {
            fetchUserPerformance();
        }
    }, [userId, projectId, timeRange]);

    const fetchUserPerformance = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                days: timeRange
            });
            if (projectId) {
                params.append('project_id', projectId);
            }

            const response = await axios.get(
                `http://localhost:5000/api/analytics/user/${userId}?${params}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }
            );
            setPerformance(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching user performance:', err);
            setError('Failed to load performance data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-spinner">Loading performance data...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!performance) return null;

    const { user, video_stats, annotation_stats, daily_annotations, review_stats, reviewer_stats } = performance;

    // Prepare chart data
    const chartData = {
        labels: daily_annotations.map(d => new Date(d.date).toLocaleDateString()),
        datasets: [
            {
                label: 'Temporal Annotations',
                data: daily_annotations.map(d => d.temporal),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.1
            },
            {
                label: 'Bounding Box Annotations',
                data: daily_annotations.map(d => d.bbox),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                tension: 0.1
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Daily Annotation Activity'
            }
        },
        scales: {
            y: {
                beginAtZero: true
            }
        }
    };

    return (
        <div className="user-performance">
            <div className="performance-header">
                <h2>{user.full_name}'s Performance</h2>
                <div className="time-range-selector">
                    <label>Time Range:</label>
                    <select value={timeRange} onChange={(e) => setTimeRange(parseInt(e.target.value))}>
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                </div>
            </div>

            <div className="performance-cards">
                <div className="perf-card video-stats">
                    <FaVideo className="card-icon" />
                    <div className="card-content">
                        <h3>Video Progress</h3>
                        <div className="stat-grid">
                            <div className="stat">
                                <span className="stat-value">{video_stats.total_assigned}</span>
                                <span className="stat-label">Assigned</span>
                            </div>
                            <div className="stat">
                                <span className="stat-value">{video_stats.completed}</span>
                                <span className="stat-label">Completed</span>
                            </div>
                            <div className="stat">
                                <span className="stat-value">{video_stats.in_progress}</span>
                                <span className="stat-label">In Progress</span>
                            </div>
                        </div>
                        <div className="completion-rate">
                            <span>Completion Rate:</span>
                            <strong>{video_stats.completion_rate.toFixed(1)}%</strong>
                        </div>
                    </div>
                </div>

                <div className="perf-card annotation-stats">
                    <FaTags className="card-icon" />
                    <div className="card-content">
                        <h3>Annotation Activity</h3>
                        <div className="stat-grid">
                            <div className="stat">
                                <span className="stat-value">{annotation_stats.total_temporal}</span>
                                <span className="stat-label">Temporal</span>
                            </div>
                            <div className="stat">
                                <span className="stat-value">{annotation_stats.total_bbox}</span>
                                <span className="stat-label">Bounding Box</span>
                            </div>
                            <div className="stat">
                                <span className="stat-value">{annotation_stats.daily_average}</span>
                                <span className="stat-label">Daily Avg</span>
                            </div>
                        </div>
                    </div>
                </div>

                {review_stats && (
                    <div className="perf-card review-stats">
                        <FaStar className="card-icon" />
                        <div className="card-content">
                            <h3>Review Performance</h3>
                            <div className="stat-grid">
                                <div className="stat">
                                    <span className="stat-value">{review_stats.approved}</span>
                                    <span className="stat-label">Approved</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">{review_stats.rejected}</span>
                                    <span className="stat-label">Rejected</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">{review_stats.pending}</span>
                                    <span className="stat-label">Pending</span>
                                </div>
                            </div>
                            <div className="quality-score">
                                <span>Quality Score:</span>
                                <div className="score-display">
                                    <strong>{review_stats.average_quality_score}</strong>
                                    <span className="score-max">/5.0</span>
                                </div>
                            </div>
                            <div className="approval-rate">
                                <span>Approval Rate:</span>
                                <strong>{review_stats.approval_rate.toFixed(1)}%</strong>
                            </div>
                        </div>
                    </div>
                )}

                {reviewer_stats && (
                    <div className="perf-card reviewer-stats">
                        <FaClock className="card-icon" />
                        <div className="card-content">
                            <h3>Reviewer Activity</h3>
                            <div className="stat-grid">
                                <div className="stat">
                                    <span className="stat-value">{reviewer_stats.total_reviewed}</span>
                                    <span className="stat-label">Reviewed</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">{reviewer_stats.in_review}</span>
                                    <span className="stat-label">In Review</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">{reviewer_stats.reviews_per_day}</span>
                                    <span className="stat-label">Per Day</span>
                                </div>
                            </div>
                            <div className="avg-time">
                                <span>Avg Review Time:</span>
                                <strong>{Math.floor(reviewer_stats.average_review_time / 60)}m {reviewer_stats.average_review_time % 60}s</strong>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="activity-chart">
                <Line data={chartData} options={chartOptions} />
            </div>

            <div className="performance-summary">
                <h3>Summary</h3>
                <div className="summary-content">
                    <p>
                        Over the last {timeRange} days, {user.full_name} has completed{' '}
                        <strong>{video_stats.completed}</strong> out of{' '}
                        <strong>{video_stats.total_assigned}</strong> assigned videos
                        ({video_stats.completion_rate.toFixed(1)}% completion rate).
                    </p>
                    <p>
                        Total annotations created: <strong>{annotation_stats.total_annotations}</strong>{' '}
                        ({annotation_stats.total_temporal} temporal, {annotation_stats.total_bbox} bounding box),
                        averaging <strong>{annotation_stats.daily_average}</strong> annotations per day.
                    </p>
                    {review_stats && (
                        <p>
                            Work quality: <strong>{review_stats.average_quality_score}/5.0</strong> average score
                            with <strong>{review_stats.approval_rate.toFixed(1)}%</strong> approval rate.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserPerformance;