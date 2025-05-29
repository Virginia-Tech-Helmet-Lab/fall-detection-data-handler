import React from 'react';
import { FaExclamationCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';

const ReviewFeedback = ({ feedbackItems = [] }) => {
    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'critical':
                return <FaExclamationCircle className="severity-icon critical" />;
            case 'major':
                return <FaExclamationTriangle className="severity-icon major" />;
            case 'minor':
                return <FaInfoCircle className="severity-icon minor" />;
            default:
                return null;
        }
    };

    const getIssueTypeLabel = (issueType) => {
        const labels = {
            'missed_event': 'Missed Event',
            'incorrect_timing': 'Incorrect Timing',
            'wrong_label': 'Wrong Label',
            'inaccurate_bbox': 'Inaccurate Bounding Box',
            'missing_bbox': 'Missing Bounding Box',
            'extra_annotation': 'Extra Annotation',
            'unclear_event': 'Unclear Event',
            'technical_issue': 'Technical Issue'
        };
        return labels[issueType] || issueType;
    };

    if (feedbackItems.length === 0) {
        return (
            <div className="review-feedback empty">
                <p>No specific feedback provided.</p>
            </div>
        );
    }

    return (
        <div className="review-feedback">
            <h3>Detailed Feedback</h3>
            <div className="feedback-list">
                {feedbackItems.map((item, idx) => (
                    <div key={idx} className={`feedback-item severity-${item.severity}`}>
                        <div className="feedback-header">
                            {getSeverityIcon(item.severity)}
                            <span className="issue-type">
                                {getIssueTypeLabel(item.issue_type)}
                            </span>
                            <span className="annotation-type">
                                ({item.annotation_type})
                            </span>
                        </div>
                        
                        {item.comment && (
                            <div className="feedback-comment">
                                <strong>Comment:</strong> {item.comment}
                            </div>
                        )}
                        
                        {item.suggestion && (
                            <div className="feedback-suggestion">
                                <strong>Suggestion:</strong> {item.suggestion}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReviewFeedback;