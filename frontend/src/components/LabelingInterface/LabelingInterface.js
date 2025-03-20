import React, { useState, useEffect, useRef } from 'react';
import VideoList from './VideoList';
import VideoPlayer from './VideoPlayer';
import BoundingBoxTool from './BoundingBoxTool';
import AnnotationPanel from './AnnotationPanel';
import './LabelingInterface.css';
import { useNavigate } from 'react-router-dom';
import { FaClipboardCheck } from 'react-icons/fa';

const LabelingInterface = () => {
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [boundingBoxes, setBoundingBoxes] = useState([]);
    const [temporalAnnotations, setTemporalAnnotations] = useState([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [frameRate, setFrameRate] = useState(30);
    const [duration, setDuration] = useState(0);
    
    // For bounding box mode
    const [boundingBoxActive, setBoundingBoxActive] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState('');
    
    // Create a ref for the AnnotationPanel to call its methods
    const annotationPanelRef = useRef();
    
    // Replace hardcoded dimensions with dynamic state
    const [videoDisplayWidth, setVideoDisplayWidth] = useState(640);
    const [videoDisplayHeight, setVideoDisplayHeight] = useState(480);
    
    // Create a ref for the video container
    const videoContainerRef = useRef(null);
    
    // Add navigate hook
    const navigate = useNavigate();
    
    // Add this to existing state
    const [hasAnnotations, setHasAnnotations] = useState(false);
    
    // Add this effect to check if annotations exist
    useEffect(() => {
        if (selectedVideo && 
            (temporalAnnotations.length > 0 || boundingBoxes.length > 0)) {
            setHasAnnotations(true);
        } else {
            setHasAnnotations(false);
        }
    }, [selectedVideo, temporalAnnotations, boundingBoxes]);
    
    // Add a function to update dimensions
    const updateVideoDimensions = () => {
        if (videoContainerRef.current) {
            const videoElement = videoContainerRef.current.querySelector('video');
            if (videoElement) {
                // Get the actual rendered dimensions of the video
                const rect = videoElement.getBoundingClientRect();
                setVideoDisplayWidth(rect.width);
                setVideoDisplayHeight(rect.height);
            }
        }
    };
    
    // Update dimensions when video is selected or window is resized
    useEffect(() => {
        if (selectedVideo) {
            // Add a small delay to ensure video is rendered
            const timer = setTimeout(updateVideoDimensions, 100);
            
            // Add resize event listener
            window.addEventListener('resize', updateVideoDimensions);
            
            // Listen for our custom event
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
        
        // Fetch temporal annotations for the selected video
        if (video && video.video_id) {
            fetchTemporalAnnotations(video.video_id);
        }
    };
    
    const handleBoxesUpdate = (boxes) => {
        setBoundingBoxes(boxes);
        // Refresh the annotations in the panel
        if (annotationPanelRef.current) {
            annotationPanelRef.current.fetchBboxAnnotations();
        }
    };
    
    const handlePositionChange = (time, frame, rate, totalDuration) => {
        setCurrentTime(time);
        setCurrentFrame(frame);
        setFrameRate(rate);
        setDuration(totalDuration);
    };
    
    const handleBoundingBoxActivate = (isActive, label) => {
        console.log("Bounding box activated:", isActive, label);
        setBoundingBoxActive(isActive);
        setSelectedLabel(label);
    };
    
    // Add this function to handle transition to review
    const handleReviewTransition = () => {
        if (window.confirm('Are you ready to review your annotations? You can still return to edit them later.')) {
            navigate('/review');
        }
    };
    
    // Add this function to fetch temporal annotations
    const fetchTemporalAnnotations = async (videoId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/annotations/${videoId}`);
            if (response.ok) {
                const data = await response.json();
                setTemporalAnnotations(data);
            }
        } catch (error) {
            console.error('Error fetching temporal annotations:', error);
            setTemporalAnnotations([]);
        }
    };
    
    return (
        <div className="labeling-container">
            <div className="video-list-panel">
                <VideoList onVideoSelect={handleVideoSelect} />
            </div>
            <div className="video-display-panel">
                {selectedVideo ? (
                    <div className="video-player-container" style={{ position: 'relative' }}>
                        <VideoPlayer 
                            videoUrl={`http://localhost:5000/api/static/${selectedVideo.filename}`} 
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
                    </div>
                ) : (
                    <p className="select-prompt">Please select a video from the list.</p>
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
            {hasAnnotations && (
                <button 
                    className="floating-review-button"
                    onClick={handleReviewTransition}
                    title="Review your annotations"
                >
                    <FaClipboardCheck /> Review
                </button>
            )}
        </div>
    );
};

export default LabelingInterface;
