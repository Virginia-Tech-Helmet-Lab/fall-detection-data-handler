import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import './VideoList.css';
import { FaVideo, FaFolder, FaChevronLeft, FaChevronRight, FaDatabase } from 'react-icons/fa';

const VideoList = ({ onVideoSelect, projectId }) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const perPage = 50;

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (projectId) params.append('project_id', projectId);
                params.append('page', page);
                params.append('per_page', perPage);

                const response = await apiClient.get(`/api/videos?${params}`);
                setVideos(response.data.videos || []);
                setTotal(response.data.total || 0);
                setTotalPages(response.data.total_pages || 1);
                setError(null);
            } catch (err) {
                console.error("Error fetching videos:", err);
                setError("Failed to load videos.");
            } finally {
                setLoading(false);
            }
        };
        fetchVideos();
    }, [projectId, page]);

    return (
        <div className="video-list">
            <div className="video-list-header">
                <h3>Video Queue</h3>
                {projectId && (
                    <div className="project-indicator">
                        <FaFolder /> Project Active
                    </div>
                )}
            </div>

            {loading && <p className="loading">Loading videos...</p>}
            {error && <p className="error">{error}</p>}

            {!loading && !error && videos.length === 0 && (
                <div className="no-videos">
                    <FaVideo />
                    <p>No videos available.</p>
                    <small>Import videos from the Data Catalog or upload files.</small>
                </div>
            )}

            <ul className="video-items">
                {videos.map(video => (
                    <li key={video.video_id} className={`video-item ${video.status}`}>
                        <button onClick={() => onVideoSelect(video)}>
                            <div className="video-info">
                                <div className="video-name">
                                    {video.source_type === 'catalog' ? <FaDatabase /> : <FaVideo />}
                                    {' '}{video.filename}
                                </div>
                                <div className="video-specs">
                                    {video.resolution && `${video.resolution}, `}
                                    {video.framerate && `${video.framerate} fps`}
                                    {video.duration && `, ${parseFloat(video.duration).toFixed(1)}s`}
                                </div>
                            </div>
                            <div className="video-status">
                                <span className={`status-badge ${video.is_completed ? 'completed' : video.status === 'confirmed' ? 'completed' : 'ready'}`}>
                                    {video.is_completed ? 'Done' : video.status === 'confirmed' ? 'Confirmed' : 'Ready'}
                                </span>
                            </div>
                        </button>
                    </li>
                ))}
            </ul>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="page-btn"
                    >
                        <FaChevronLeft />
                    </button>
                    <span className="page-info">
                        Page {page} of {totalPages} ({total} videos)
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="page-btn"
                    >
                        <FaChevronRight />
                    </button>
                </div>
            )}

            <div className="queue-stats">
                <small>Showing {videos.length} of {total} video{total !== 1 ? 's' : ''}</small>
            </div>
        </div>
    );
};

export default VideoList;
