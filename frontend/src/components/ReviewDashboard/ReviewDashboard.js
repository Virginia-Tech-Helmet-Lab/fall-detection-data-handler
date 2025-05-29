import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    FaCheckCircle, FaTimesCircle, FaClock, FaPlay, FaEdit,
    FaUser, FaCalendar, FaFilter, FaSearch, FaChartBar,
    FaStar, FaExclamationTriangle, FaThumbsUp, FaThumbsDown
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import ReviewQueue from './ReviewQueue';
import AnnotationComparison from './AnnotationComparison';
import ReviewFeedback from './ReviewFeedback';
import ReviewStatistics from './ReviewStatistics';
import './ReviewDashboard.css';

const ReviewDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('queue');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Review state
    const [reviewQueue, setReviewQueue] = useState([]);
    const [selectedReview, setSelectedReview] = useState(null);
    const [reviewInProgress, setReviewInProgress] = useState(null);
    const [statistics, setStatistics] = useState(null);
    
    // Filters
    const [filters, setFilters] = useState({
        status: 'all',
        project: 'all',
        myReviewsOnly: false
    });

    // Check user role (handle both uppercase and lowercase)
    const userRole = user?.role?.toUpperCase();
    const isReviewer = userRole === 'REVIEWER' || userRole === 'ADMIN';
    const isAnnotator = userRole === 'ANNOTATOR';

    useEffect(() => {
        fetchReviewQueue();
        fetchStatistics();
    }, [filters]);

    const fetchReviewQueue = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            
            if (filters.status !== 'all') params.append('status', filters.status);
            if (filters.project !== 'all') params.append('project_id', filters.project);
            if (filters.myReviewsOnly) params.append('my_reviews_only', 'true');
            
            const response = await axios.get(
                `http://localhost:5000/api/review/queue?${params}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }
            );
            
            setReviewQueue(response.data.reviews || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching review queue:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Failed to load review queue';
            setError(`Review queue error: ${errorMessage}`);
            console.error('Full error details:', err.response);
        } finally {
            setLoading(false);
        }
    };

    const fetchStatistics = async () => {
        try {
            const response = await axios.get(
                'http://localhost:5000/api/review/statistics',
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }
            );
            
            setStatistics(response.data);
        } catch (err) {
            console.error('Error fetching statistics:', err);
        }
    };

    const handleStartReview = async (reviewId) => {
        if (!isReviewer) {
            alert('Only reviewers can start reviews');
            return;
        }

        try {
            const response = await axios.post(
                `http://localhost:5000/api/review/${reviewId}/start`,
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }
            );
            
            setReviewInProgress(response.data.review);
            setActiveTab('compare');
            fetchReviewQueue(); // Refresh the queue
        } catch (err) {
            console.error('Error starting review:', err);
            alert('Failed to start review');
        }
    };

    const handleCompleteReview = async (reviewId, reviewData) => {
        try {
            await axios.post(
                `http://localhost:5000/api/review/${reviewId}/complete`,
                reviewData,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }
            );
            
            alert('Review completed successfully!');
            setReviewInProgress(null);
            setActiveTab('queue');
            fetchReviewQueue();
            fetchStatistics();
        } catch (err) {
            console.error('Error completing review:', err);
            alert('Failed to complete review');
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending':
                return <FaClock className="status-icon pending" />;
            case 'in_review':
                return <FaEdit className="status-icon in-review" />;
            case 'approved':
                return <FaCheckCircle className="status-icon approved" />;
            case 'rejected':
                return <FaTimesCircle className="status-icon rejected" />;
            case 'needs_revision':
                return <FaExclamationTriangle className="status-icon revision" />;
            default:
                return null;
        }
    };

    const renderTabs = () => {
        const tabs = [
            { id: 'queue', label: 'Review Queue', icon: <FaClock /> },
            { id: 'statistics', label: 'Statistics', icon: <FaChartBar /> }
        ];

        if (reviewInProgress) {
            tabs.splice(1, 0, { 
                id: 'compare', 
                label: 'Review in Progress', 
                icon: <FaEdit />,
                highlight: true 
            });
        }

        return (
            <div className="review-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-button ${activeTab === tab.id ? 'active' : ''} ${tab.highlight ? 'highlight' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="review-dashboard">
            <div className="dashboard-header">
                <h1>Review & Quality Control</h1>
                <div className="header-info">
                    <span className="user-role">
                        <FaUser /> {user?.full_name} ({user?.role})
                    </span>
                </div>
            </div>

            {/* Statistics Summary */}
            {statistics && (
                <div className="statistics-summary">
                    <div className="stat-card">
                        <div className="stat-value">{statistics.total_reviews}</div>
                        <div className="stat-label">Total Reviews</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{statistics.status_counts?.pending || 0}</div>
                        <div className="stat-label">Pending</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{statistics.status_counts?.in_review || 0}</div>
                        <div className="stat-label">In Progress</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{statistics.completed_reviews}</div>
                        <div className="stat-label">Completed</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{statistics.average_quality_score}/5</div>
                        <div className="stat-label">Avg Quality</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="review-filters">
                <div className="filter-group">
                    <label>
                        <FaFilter /> Status:
                        <select 
                            value={filters.status} 
                            onChange={(e) => setFilters({...filters, status: e.target.value})}
                        >
                            <option value="all">All</option>
                            <option value="pending">Pending</option>
                            <option value="in_review">In Review</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="needs_revision">Needs Revision</option>
                        </select>
                    </label>
                </div>
                
                {isReviewer && (
                    <div className="filter-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={filters.myReviewsOnly}
                                onChange={(e) => setFilters({...filters, myReviewsOnly: e.target.checked})}
                            />
                            My Reviews Only
                        </label>
                    </div>
                )}
            </div>

            {/* Tabs */}
            {renderTabs()}

            {/* Tab Content */}
            <div className="tab-content">
                {loading && <div className="loading">Loading...</div>}
                {error && <div className="error-message">{error}</div>}

                {!loading && activeTab === 'queue' && (
                    <ReviewQueue
                        reviews={reviewQueue}
                        onStartReview={handleStartReview}
                        onSelectReview={setSelectedReview}
                        selectedReview={selectedReview}
                        isReviewer={isReviewer}
                        currentUser={user}
                    />
                )}

                {!loading && activeTab === 'compare' && reviewInProgress && (
                    <div className="review-workspace">
                        <AnnotationComparison
                            review={reviewInProgress}
                            onComplete={handleCompleteReview}
                        />
                    </div>
                )}

                {!loading && activeTab === 'statistics' && (
                    <ReviewStatistics
                        statistics={statistics}
                        userRole={user?.role}
                    />
                )}
            </div>
        </div>
    );
};

export default ReviewDashboard;