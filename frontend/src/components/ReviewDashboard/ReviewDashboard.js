import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ReviewDashboard = () => {
    const [reviewData, setReviewData] = useState([]);

    useEffect(() => {
        // Fetch review data from the backend
        const fetchReviewData = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/review');
                setReviewData(response.data);
            } catch(error) {
                console.error("Error fetching review data:", error);
            }
        };
        fetchReviewData();
    }, []);

    return (
        <div>
            <h2>Review Dashboard</h2>
            {reviewData.length === 0 ? (
                <p>No review data available.</p>
            ) : (
                reviewData.map((video, index) => (
                    <div key={index} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
                        <h3>{video.filename}</h3>
                        <p>Annotations: {JSON.stringify(video.annotations)}</p>
                        <button>Edit</button>
                        <button>Confirm</button>
                    </div>
                ))
            )}
        </div>
    );
};

export default ReviewDashboard;
