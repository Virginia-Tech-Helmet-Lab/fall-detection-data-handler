import React, { useState, useEffect } from 'react';
import { FaUsers, FaVideo, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';
import axios from 'axios';
import './VideoAssignment.css';

const VideoAssignment = ({ projectId, onClose, onAssignmentComplete }) => {
    const [videos, setVideos] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedVideos, setSelectedVideos] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState(null);
    const [assignmentStrategy, setAssignmentStrategy] = useState('equal'); // 'equal' or 'manual'

    useEffect(() => {
        fetchData();
    }, [projectId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Fetch unassigned videos for the project
            const videosResponse = await axios.get(
                `http://localhost:5000/api/videos?project_id=${projectId}&unassigned=true`
            );
            
            // Fetch project members
            const token = localStorage.getItem('access_token');
            const membersResponse = await axios.get(
                `http://localhost:5000/api/projects/${projectId}/members`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            
            setVideos(videosResponse.data);
            setUsers(membersResponse.data.members.filter(m => 
                m.role === 'annotator' || m.role === 'member'
            ));
            
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleVideoToggle = (videoId) => {
        setSelectedVideos(prev => {
            if (prev.includes(videoId)) {
                return prev.filter(id => id !== videoId);
            } else {
                return [...prev, videoId];
            }
        });
    };

    const handleUserToggle = (userId) => {
        setSelectedUsers(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    const selectAllVideos = () => {
        setSelectedVideos(videos.map(v => v.video_id));
    };

    const selectAllUsers = () => {
        setSelectedUsers(users.map(u => u.user_id));
    };

    const handleAssign = async () => {
        if (selectedVideos.length === 0 || selectedUsers.length === 0) {
            setError('Please select at least one video and one user');
            return;
        }

        try {
            setAssigning(true);
            setError(null);
            
            const token = localStorage.getItem('access_token');
            const response = await axios.post(
                `http://localhost:5000/api/projects/${projectId}/assign`,
                {
                    video_ids: selectedVideos,
                    user_ids: selectedUsers,
                    strategy: assignmentStrategy
                },
                {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (response.data.assignments) {
                const totalAssigned = Object.values(response.data.assignments)
                    .reduce((sum, count) => sum + count, 0);
                    
                alert(`Successfully assigned ${totalAssigned} videos to ${selectedUsers.length} users`);
                
                if (onAssignmentComplete) {
                    onAssignmentComplete();
                }
                
                if (onClose) {
                    onClose();
                }
            }
            
        } catch (error) {
            console.error('Error assigning videos:', error);
            setError(error.response?.data?.error || 'Failed to assign videos');
        } finally {
            setAssigning(false);
        }
    };

    if (loading) {
        return (
            <div className="video-assignment-modal">
                <div className="assignment-loading">
                    <FaSpinner className="spinner" />
                    <p>Loading assignment data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="video-assignment-modal">
            <div className="assignment-content">
                <div className="assignment-header">
                    <h2>Assign Videos to Users</h2>
                    <button className="close-button" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                {error && (
                    <div className="assignment-error">
                        {error}
                    </div>
                )}

                <div className="assignment-strategy">
                    <label>Assignment Strategy:</label>
                    <select 
                        value={assignmentStrategy} 
                        onChange={(e) => setAssignmentStrategy(e.target.value)}
                    >
                        <option value="equal">Distribute Equally</option>
                        <option value="random">Random Distribution</option>
                    </select>
                </div>

                <div className="assignment-panels">
                    {/* Videos Panel */}
                    <div className="selection-panel">
                        <div className="panel-header">
                            <h3><FaVideo /> Unassigned Videos ({videos.length})</h3>
                            <button 
                                className="select-all-btn"
                                onClick={selectAllVideos}
                            >
                                Select All
                            </button>
                        </div>
                        <div className="selection-list">
                            {videos.length === 0 ? (
                                <p className="no-items">No unassigned videos</p>
                            ) : (
                                videos.map(video => (
                                    <label key={video.video_id} className="selection-item">
                                        <input
                                            type="checkbox"
                                            checked={selectedVideos.includes(video.video_id)}
                                            onChange={() => handleVideoToggle(video.video_id)}
                                        />
                                        <div className="item-info">
                                            <span className="item-name">{video.filename}</span>
                                            <span className="item-meta">
                                                {video.duration ? `${video.duration.toFixed(1)}s` : 'Unknown duration'}
                                            </span>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                        <div className="panel-footer">
                            {selectedVideos.length} selected
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className="assignment-arrow">→</div>

                    {/* Users Panel */}
                    <div className="selection-panel">
                        <div className="panel-header">
                            <h3><FaUsers /> Available Annotators ({users.length})</h3>
                            <button 
                                className="select-all-btn"
                                onClick={selectAllUsers}
                            >
                                Select All
                            </button>
                        </div>
                        <div className="selection-list">
                            {users.length === 0 ? (
                                <p className="no-items">No annotators in project</p>
                            ) : (
                                users.map(user => (
                                    <label key={user.user_id} className="selection-item">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.user_id)}
                                            onChange={() => handleUserToggle(user.user_id)}
                                        />
                                        <div className="item-info">
                                            <span className="item-name">{user.full_name}</span>
                                            <span className="item-meta">
                                                {user.videos_assigned} assigned, {user.videos_completed} completed
                                            </span>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                        <div className="panel-footer">
                            {selectedUsers.length} selected
                        </div>
                    </div>
                </div>

                <div className="assignment-preview">
                    {selectedVideos.length > 0 && selectedUsers.length > 0 && (
                        <p>
                            Each user will receive approximately{' '}
                            <strong>{Math.ceil(selectedVideos.length / selectedUsers.length)}</strong> videos
                        </p>
                    )}
                </div>

                <div className="assignment-actions">
                    <button 
                        className="cancel-btn"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button 
                        className="assign-btn"
                        onClick={handleAssign}
                        disabled={assigning || selectedVideos.length === 0 || selectedUsers.length === 0}
                    >
                        {assigning ? (
                            <>
                                <FaSpinner className="spinner" />
                                Assigning...
                            </>
                        ) : (
                            <>
                                <FaCheck />
                                Assign Videos
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoAssignment;