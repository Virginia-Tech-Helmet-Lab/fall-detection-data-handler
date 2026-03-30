import React, { useState, useEffect, useRef, useCallback } from 'react';
import { basePath } from '../../api/client';
import apiClient from '../../api/client';
import VideoList from './VideoList';
import VideoPlayer from './VideoPlayer';
import BoundingBoxTool from './BoundingBoxTool';
import AnnotationPanel from './AnnotationPanel';
import './LabelingInterface.css';
import { useProject } from '../../contexts/ProjectContext';

const LabelingInterface = () => {
    const { currentProject } = useProject();
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [boundingBoxes, setBoundingBoxes] = useState([]);
    const [temporalAnnotations, setTemporalAnnotations] = useState([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [frameRate, setFrameRate] = useState(30);
    const [duration, setDuration] = useState(0);
    const [boundingBoxActive, setBoundingBoxActive] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState('');
    const [viewerOpen, setViewerOpen] = useState(false);
    const annotationPanelRef = useRef();
    const [videoDisplayWidth, setVideoDisplayWidth] = useState(640);
    const [videoDisplayHeight, setVideoDisplayHeight] = useState(480);
    const videoContainerRef = useRef(null);

    // Video list for navigation
    const [videos, setVideos] = useState([]);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(-1);

    // Fetch video list
    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const params = new URLSearchParams();
                if (currentProject?.project_id) params.append('project_id', currentProject.project_id);
                params.append('per_page', '10000');
                const response = await apiClient.get(`/api/videos?${params}`);
                setVideos(response.data.videos || []);
            } catch (err) {
                console.error('Error fetching videos:', err);
            }
        };
        fetchVideos();
    }, [currentProject?.project_id]);

    // Track current index when video changes
    useEffect(() => {
        if (selectedVideo && videos.length > 0) {
            const idx = videos.findIndex(v => v.video_id === selectedVideo.video_id);
            setCurrentVideoIndex(idx);
        }
    }, [selectedVideo, videos]);

    const updateVideoDimensions = () => {
        if (videoContainerRef.current) {
            const videoElement = videoContainerRef.current.querySelector('video');
            if (videoElement) {
                const rect = videoElement.getBoundingClientRect();
                setVideoDisplayWidth(rect.width);
                setVideoDisplayHeight(rect.height);
            }
        }
    };

    useEffect(() => {
        if (selectedVideo) {
            const timer = setTimeout(updateVideoDimensions, 100);
            window.addEventListener('resize', updateVideoDimensions);
            window.addEventListener('videodimensionsupdate', updateVideoDimensions);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updateVideoDimensions);
                window.removeEventListener('videodimensionsupdate', updateVideoDimensions);
            };
        }
    }, [selectedVideo]);

    const handleVideoSelect = (video) => {
        setSelectedVideo(video);
        setBoundingBoxes([]);
        setTemporalAnnotations([]);
        setBoundingBoxActive(false);
        setSelectedLabel('');
        if (video && video.video_id) {
            fetchTemporalAnnotations(video.video_id);
            fetchBboxAnnotations(video.video_id);
        }
    };

    const goToPrevVideo = useCallback(() => {
        if (currentVideoIndex > 0) {
            handleVideoSelect(videos[currentVideoIndex - 1]);
        }
    }, [currentVideoIndex, videos]);

    const goToNextVideo = useCallback(() => {
        if (currentVideoIndex < videos.length - 1) {
            handleVideoSelect(videos[currentVideoIndex + 1]);
        }
    }, [currentVideoIndex, videos]);

    const handleBoxesUpdate = (boxes) => {
        if (selectedVideo) fetchBboxAnnotations(selectedVideo.video_id);
    };

    const handlePositionChange = (time, frame, rate, totalDuration) => {
        setCurrentTime(time);
        setCurrentFrame(frame);
        setFrameRate(rate);
        setDuration(totalDuration);
    };

    const handleBoundingBoxActivate = (isActive, label) => {
        setBoundingBoxActive(isActive);
        setSelectedLabel(label);
    };

    const fetchTemporalAnnotations = async (videoId) => {
        try {
            const response = await fetch(`${basePath}/api/annotations/${videoId}`);
            if (response.ok) {
                const data = await response.json();
                setTemporalAnnotations(data);
            }
        } catch (error) {
            console.error('Error fetching temporal annotations:', error);
            setTemporalAnnotations([]);
        }
    };

    const fetchBboxAnnotations = async (videoId) => {
        try {
            const response = await fetch(`${basePath}/api/bbox-annotations/${videoId}`);
            if (response.ok) {
                const data = await response.json();
                setBoundingBoxes(data);
            }
        } catch (error) {
            console.error('Error fetching bbox annotations:', error);
            setBoundingBoxes([]);
        }
    };

    const handleDeleteAnnotation = async (annotationId) => {
        if (!window.confirm('Delete this annotation?')) return;
        try {
            const response = await fetch(`${basePath}/api/annotations/${annotationId}`, { method: 'DELETE' });
            if (response.ok && selectedVideo) fetchTemporalAnnotations(selectedVideo.video_id);
        } catch (error) {
            console.error('Error deleting annotation:', error);
        }
    };

    const handleDeleteBbox = async (bboxId) => {
        if (!window.confirm('Delete this bounding box?')) return;
        try {
            const response = await fetch(`${basePath}/api/delete-bbox/${bboxId}`);
            if (response.ok) setBoundingBoxes(prev => prev.filter(b => b.bbox_id !== bboxId));
        } catch (error) {
            console.error('Error deleting bbox:', error);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeydown = (event) => {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
                return;
            }

            switch (event.key) {
                case 'ArrowLeft':
                    if (event.shiftKey) {
                        event.preventDefault();
                        goToPrevVideo();
                    }
                    break;
                case 'ArrowRight':
                    if (event.shiftKey) {
                        event.preventDefault();
                        goToNextVideo();
                    }
                    break;
                case 'b':
                case 'B':
                    event.preventDefault();
                    handleBoundingBoxActivate(!boundingBoxActive, selectedLabel);
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    }, [goToPrevVideo, goToNextVideo, boundingBoxActive, selectedLabel]);

    return (
        <div className="labeling-layout">
            <div className="labeling-container">
                <div className="video-list-panel">
                    <VideoList
                        onVideoSelect={handleVideoSelect}
                        projectId={currentProject?.project_id}
                    />
                </div>
                <div className="video-display-panel">
                    {/* Video Navigation Bar */}
                    {selectedVideo && videos.length > 0 && (
                        <div className="video-nav-bar">
                            <button
                                className="nav-btn"
                                onClick={goToPrevVideo}
                                disabled={currentVideoIndex <= 0}
                                title="Previous video (Shift+Left)"
                            >
                                &larr; Prev
                            </button>
                            <span className="nav-counter">
                                Video {currentVideoIndex + 1} / {videos.length}
                            </span>
                            <button
                                className="nav-btn"
                                onClick={goToNextVideo}
                                disabled={currentVideoIndex >= videos.length - 1}
                                title="Next video (Shift+Right)"
                            >
                                Next &rarr;
                            </button>
                        </div>
                    )}

                    {selectedVideo ? (
                        <div className="video-player-wrapper" ref={videoContainerRef}>
                            <VideoPlayer
                                videoUrl={`${basePath}/api/video-file/${selectedVideo.video_id}`}
                                onPositionChange={handlePositionChange}
                            />
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                pointerEvents: boundingBoxActive ? 'auto' : 'none',
                            }}>
                                <BoundingBoxTool
                                    canvasWidth={videoDisplayWidth}
                                    canvasHeight={videoDisplayHeight}
                                    onBoxesUpdate={handleBoxesUpdate}
                                    isActive={boundingBoxActive}
                                    currentFrame={currentFrame}
                                    videoId={selectedVideo.video_id}
                                    selectedLabel={selectedLabel}
                                />
                            </div>
                            {/* Hotkey Footer */}
                            <div className="hotkey-footer">
                                <div className="hotkey-group">
                                    <kbd>Space</kbd> <span>Play / Pause</span>
                                </div>
                                <div className="hotkey-group">
                                    <kbd>&larr;</kbd> <kbd>&rarr;</kbd> <span>Seek</span>
                                </div>
                                <div className="hotkey-group">
                                    <kbd>Shift</kbd>+<kbd>&larr;</kbd> <kbd>&rarr;</kbd> <span>Prev / Next video</span>
                                </div>
                                <div className="hotkey-group">
                                    <kbd>B</kbd> <span>Bbox mode</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="select-prompt">Select a video from the list to begin annotating.</p>
                    )}
                </div>
                <div className="annotation-panel-container">
                    {selectedVideo ? (
                        <AnnotationPanel
                            ref={annotationPanelRef}
                            videoId={selectedVideo.video_id}
                            currentFrame={currentFrame}
                            currentTime={currentTime}
                            frameRate={frameRate}
                            duration={duration}
                            onBoundingBoxActivate={handleBoundingBoxActivate}
                            isBoundingBoxActive={boundingBoxActive}
                        />
                    ) : (
                        <p>No video selected.</p>
                    )}
                </div>

                {/* Annotations Viewer Toggle Tab */}
                <div
                    className={`viewer-tab ${viewerOpen ? 'open' : ''}`}
                    onClick={() => setViewerOpen(!viewerOpen)}
                    title={viewerOpen ? 'Hide annotations' : 'Show annotations'}
                >
                    <span className="viewer-tab-label">Annotations</span>
                    <span className="viewer-tab-caret">{viewerOpen ? '\u203A' : '\u2039'}</span>
                </div>

                {/* Collapsible Annotations Viewer */}
                {viewerOpen && (
                    <div className="annotations-viewer">
                        <div className="viewer-header">
                            <h3>Annotations</h3>
                            <span className="viewer-counts">
                                {temporalAnnotations.length + boundingBoxes.length} total
                            </span>
                        </div>

                        <div className="viewer-section">
                            <h4>Labels ({temporalAnnotations.length})</h4>
                            {temporalAnnotations.length > 0 ? (
                                <ul className="viewer-list">
                                    {temporalAnnotations.map(anno => (
                                        <li key={anno.annotation_id} className="viewer-item">
                                            <div className="viewer-item-info">
                                                <span className="viewer-item-label">{anno.label}</span>
                                                {anno.frame_index != null ? (
                                                    <span className="viewer-item-meta">Frame {anno.frame_index}</span>
                                                ) : anno.start_frame != null && anno.end_frame != null ? (
                                                    <span className="viewer-item-meta">Frames {anno.start_frame}-{anno.end_frame}</span>
                                                ) : null}
                                            </div>
                                            <button className="viewer-delete" onClick={() => handleDeleteAnnotation(anno.annotation_id)}>&times;</button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="viewer-empty">None yet</p>
                            )}
                        </div>

                        <div className="viewer-section">
                            <h4>Bounding Boxes ({boundingBoxes.length})</h4>
                            {boundingBoxes.length > 0 ? (
                                <ul className="viewer-list">
                                    {boundingBoxes.map(bbox => (
                                        <li key={bbox.bbox_id} className="viewer-item">
                                            <div className="viewer-item-info">
                                                <span className="viewer-item-label">{bbox.part_label}</span>
                                                <span className="viewer-item-meta">Frame {bbox.frame_index}</span>
                                            </div>
                                            <button className="viewer-delete" onClick={() => handleDeleteBbox(bbox.bbox_id)}>&times;</button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="viewer-empty">None yet</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LabelingInterface;
