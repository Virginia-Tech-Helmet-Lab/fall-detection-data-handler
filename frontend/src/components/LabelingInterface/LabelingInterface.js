import React, { useState, useEffect, useRef } from 'react';
import VideoList from './VideoList';
import VideoPlayer from './VideoPlayer';
import BoundingBoxTool from './BoundingBoxTool';
import AnnotationPanel from './AnnotationPanel';
import './LabelingInterface.css';

const LabelingInterface = () => {
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [boundingBoxes, setBoundingBoxes] = useState([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [frameRate, setFrameRate] = useState(30);
    const [duration, setDuration] = useState(0);
    
    // For bounding box mode
    const [boundingBoxActive, setBoundingBoxActive] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState('');
    
    // Create a ref for the AnnotationPanel to call its methods
    const annotationPanelRef = useRef();
    
    // Video dimensions - these should match the actual video display size
    const videoDisplayWidth = 640;
    const videoDisplayHeight = 480;
    
    const handleVideoSelect = (video) => {
        setSelectedVideo(video);
        setBoundingBoxes([]);
        setBoundingBoxActive(false);
        setSelectedLabel('');
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
        </div>
    );
};

export default LabelingInterface;
