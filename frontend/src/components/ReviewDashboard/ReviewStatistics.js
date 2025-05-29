import React from 'react';
import { 
    FaChartBar, FaCheckCircle, FaTimesCircle, 
    FaClock, FaStar, FaExclamationTriangle 
} from 'react-icons/fa';

const ReviewStatistics = ({ statistics, userRole }) => {
    if (!statistics) {
        return <div className="loading">Loading statistics...</div>;
    }

    const { status_counts = {}, average_quality_score, average_accuracy_score, average_review_time_seconds } = statistics;

    const formatTime = (seconds) => {
        if (!seconds) return '0m';
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m`;
    };

    const getPercentage = (count, total) => {
        if (!total) return 0;
        return Math.round((count / total) * 100);
    };

    return (
        <div className="review-statistics">
            <h2>Review Statistics</h2>

            <div className="stats-grid">
                <div className="stat-section">
                    <h3>
                        <FaChartBar /> Status Distribution
                    </h3>
                    <div className="status-distribution">
                        <div className="status-item pending">
                            <FaClock />
                            <span className="label">Pending</span>
                            <span className="count">{status_counts.pending || 0}</span>
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill"
                                    style={{ width: `${getPercentage(status_counts.pending, statistics.total_reviews)}%` }}
                                />
                            </div>
                        </div>
                        
                        <div className="status-item in-review">
                            <FaClock />
                            <span className="label">In Review</span>
                            <span className="count">{status_counts.in_review || 0}</span>
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill"
                                    style={{ width: `${getPercentage(status_counts.in_review, statistics.total_reviews)}%` }}
                                />
                            </div>
                        </div>
                        
                        <div className="status-item approved">
                            <FaCheckCircle />
                            <span className="label">Approved</span>
                            <span className="count">{status_counts.approved || 0}</span>
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill"
                                    style={{ width: `${getPercentage(status_counts.approved, statistics.total_reviews)}%` }}
                                />
                            </div>
                        </div>
                        
                        <div className="status-item rejected">
                            <FaTimesCircle />
                            <span className="label">Rejected</span>
                            <span className="count">{status_counts.rejected || 0}</span>
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill"
                                    style={{ width: `${getPercentage(status_counts.rejected, statistics.total_reviews)}%` }}
                                />
                            </div>
                        </div>
                        
                        <div className="status-item revision">
                            <FaExclamationTriangle />
                            <span className="label">Needs Revision</span>
                            <span className="count">{status_counts.needs_revision || 0}</span>
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill"
                                    style={{ width: `${getPercentage(status_counts.needs_revision, statistics.total_reviews)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="stat-section">
                    <h3>
                        <FaStar /> Quality Metrics
                    </h3>
                    <div className="quality-metrics">
                        <div className="metric-card">
                            <div className="metric-label">Average Quality Score</div>
                            <div className="metric-value">
                                <FaStar className="star-icon" />
                                {average_quality_score.toFixed(1)}/5.0
                            </div>
                            <div className="quality-bar">
                                <div 
                                    className="quality-fill"
                                    style={{ width: `${(average_quality_score / 5) * 100}%` }}
                                />
                            </div>
                        </div>
                        
                        <div className="metric-card">
                            <div className="metric-label">Average Accuracy</div>
                            <div className="metric-value">
                                {(average_accuracy_score * 100).toFixed(0)}%
                            </div>
                            <div className="accuracy-bar">
                                <div 
                                    className="accuracy-fill"
                                    style={{ width: `${average_accuracy_score * 100}%` }}
                                />
                            </div>
                        </div>
                        
                        <div className="metric-card">
                            <div className="metric-label">Avg Review Time</div>
                            <div className="metric-value">
                                <FaClock />
                                {formatTime(average_review_time_seconds)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="stat-section">
                    <h3>Performance Overview</h3>
                    <div className="performance-summary">
                        <div className="summary-item">
                            <span className="label">Total Reviews:</span>
                            <span className="value">{statistics.total_reviews}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Completed Reviews:</span>
                            <span className="value">{statistics.completed_reviews}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Completion Rate:</span>
                            <span className="value">
                                {getPercentage(statistics.completed_reviews, statistics.total_reviews)}%
                            </span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Approval Rate:</span>
                            <span className="value">
                                {getPercentage(
                                    status_counts.approved, 
                                    (status_counts.approved || 0) + (status_counts.rejected || 0)
                                )}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {userRole === 'reviewer' && (
                <div className="reviewer-tips">
                    <h3>Review Guidelines</h3>
                    <ul>
                        <li>Check for accurate temporal boundaries on fall events</li>
                        <li>Verify bounding boxes cover the relevant body parts</li>
                        <li>Ensure consistent labeling across similar events</li>
                        <li>Provide constructive feedback for improvements</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ReviewStatistics;