import React, { useRef, useState, useEffect, useCallback } from 'react';
import './VideoPlayer.css';

const VideoPlayer = ({ videoUrl, onPositionChange }) => {
    const videoRef = useRef(null);
    const wrapperRef = useRef(null);
    const canvasRef = useRef(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
    const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });
    const [frameRate, setFrameRate] = useState(30);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [frameThumbnails, setFrameThumbnails] = useState({});
    const [showFrameSelector, setShowFrameSelector] = useState(false);
    
    useEffect(() => {
        // Reset playback rate and zoom when video changes
        if (videoRef.current) {
            videoRef.current.playbackRate = 1;
            setPlaybackRate(1);
            setZoom(1);
            setPanPosition({ x: 0, y: 0 });
            setCurrentTime(0);
            setCurrentFrame(0);
            setIsPlaying(false);
            setFrameThumbnails({});
        }
    }, [videoUrl]);

    const handleMetadataLoaded = (e) => {
        setDuration(e.target.duration);
        // Use an even more conservative frame rate to ensure frames are within range
        setFrameRate(15); // Lower this from 20 to 15 to be even safer
        
        // Clear any previous thumbnails when loading a new video
        setFrameThumbnails({});
        setError(null);
    };

    const handleTimeUpdate = () => {
        const time = videoRef.current.currentTime;
        setCurrentTime(time);
        const frame = Math.floor(time * frameRate);
        setCurrentFrame(frame);
        
        // Notify parent component of position change
        if (onPositionChange) {
            onPositionChange(time, frame, frameRate, duration);
        }
    };

    const handleVideoError = () => {
        setError("Failed to load video. Please check the file format.");
    };

    // Pan functionality
    const handleMouseDown = (e) => {
        if (zoom > 1) {
            setIsDragging(true);
            setLastMousePosition({ x: e.clientX, y: e.clientY });
            document.body.style.cursor = 'grabbing';
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging && zoom > 1) {
            const deltaX = e.clientX - lastMousePosition.x;
            const deltaY = e.clientY - lastMousePosition.y;
            
            // Calculate the boundaries for panning
            const contentWidth = videoRef.current?.offsetWidth || 0;
            const contentHeight = videoRef.current?.offsetHeight || 0;
            
            const maxPanX = (zoom - 1) * contentWidth / 2;
            const maxPanY = (zoom - 1) * contentHeight / 2;
            
            const newX = Math.max(-maxPanX, Math.min(maxPanX, panPosition.x + deltaX));
            const newY = Math.max(-maxPanY, Math.min(maxPanY, panPosition.y + deltaY));
            
            setPanPosition({ x: newX, y: newY });
            setLastMousePosition({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            document.body.style.cursor = '';
        }
    };

    const handleMouseLeave = () => {
        if (isDragging) {
            setIsDragging(false);
            document.body.style.cursor = '';
        }
    };

    // Add useEffect to clean up event listeners
    useEffect(() => {
        // Clean up function to ensure cursor is reset if component unmounts while dragging
        return () => {
            document.body.style.cursor = '';
        };
    }, []);

    // Frame-based navigation
    const goToFrame = (frameNumber) => {
        const newTime = frameNumber / frameRate;
        if (videoRef.current && newTime >= 0 && newTime <= duration) {
            videoRef.current.currentTime = newTime;
            setCurrentFrame(frameNumber);
            setCurrentTime(newTime);
            
            // Notify parent
            if (onPositionChange) {
                onPositionChange(newTime, frameNumber, frameRate, duration);
            }
        }
    };

    const handlePlaybackRateChange = (e) => {
        const newRate = parseFloat(e.target.value);
        setPlaybackRate(newRate);
        videoRef.current.playbackRate = newRate;
    };

    const handleZoomChange = (e) => {
        const newZoom = parseFloat(e.target.value);
        setZoom(newZoom);
        
        if (newZoom <= 1) {
            // Reset pan position when zoomed out to normal
            setPanPosition({ x: 0, y: 0 });
        }
    };

    const formatTime = (timeInSeconds) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const milliseconds = Math.floor((timeInSeconds % 1) * 100);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    };

    // Calculate frame indices for filmstrip using useMemo
    const prevFrames = React.useMemo(() => {
        return showFrameSelector ? 
            [currentFrame - 2, currentFrame - 1].filter(f => f >= 0) : [];
    }, [currentFrame, showFrameSelector]);

    const nextFrames = React.useMemo(() => {
        return showFrameSelector ? 
            [currentFrame + 1, currentFrame + 2].filter(f => f <= Math.floor(duration * frameRate)) : [];
    }, [currentFrame, showFrameSelector, duration, frameRate]);

    // Add this function to handle thumbnail errors
    const handleThumbnailError = (frameNumber) => {
        // Mark this frame as having failed to load
        setFrameThumbnails(prev => ({
            ...prev,
            [frameNumber]: { error: true }
        }));
    };

    // Add this function to test with a placeholder image
    const testWithPlaceholder = (frameNumber) => {
        // This creates a colored placeholder based on the frame number
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = `hsl(${frameNumber % 360}, 70%, 50%)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Frame ${frameNumber}`, canvas.width/2, canvas.height/2);
        
        return canvas.toDataURL();
    };

    // Add this function near the top of your component
    const debugImageBlob = async (blob, frameNumber) => {
        try {
            // Create an image URL from blob
            const url = URL.createObjectURL(blob);
            console.log(`Debug URL created for frame ${frameNumber}: ${url}`);
            
            // Log blob details
            console.log(`Blob type: ${blob.type}, size: ${blob.size} bytes`);
            
            // If it's not an image blob, log a warning
            if (!blob.type.startsWith('image/')) {
                console.warn(`Warning: Blob for frame ${frameNumber} is not an image type (${blob.type})`);
            }
            
            // Free the URL
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Error in debug function:', e);
        }
    };

    // In your React app, determine the image server URL dynamically
    const getImageServerBaseUrl = () => {
        // In production, this might be a CDN or dedicated image domain
        if (process.env.NODE_ENV === 'production') {
            return process.env.REACT_APP_IMAGE_SERVER_URL || '/image-api';
        }
        // In development, use the local server
        return 'http://localhost:5002';
    };

    // Final version of generateThumbnail 
    const generateThumbnail = useCallback(async (frameNumber) => {
        // Skip already processed frames
        if (frameThumbnails[frameNumber]?.url || 
            frameThumbnails[frameNumber]?.loading || 
            frameThumbnails[frameNumber]?.error) {
            return;
        }
        
        // Set loading state
        setFrameThumbnails(prev => ({
            ...prev,
            [frameNumber]: { loading: true }
        }));
        
        console.log(`Generating thumbnail for frame ${frameNumber}`);
        
        try {
            // Extract filename from URL
            const videoFilename = videoUrl.split('/').pop();
            const safeFilename = encodeURIComponent(videoFilename);
            
            // Use the dedicated image server instead of the main API
            const requestUrl = `${getImageServerBaseUrl()}/images/${safeFilename}/${frameNumber}`;
            
            console.log(`Requesting from: ${requestUrl}`);
            
            // Try with fetch first to check the response
            const response = await fetch(requestUrl);
            console.log(`Response status: ${response.status}, content-type: ${response.headers.get('content-type')}`);
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            // Test if image data is valid
            const blob = await response.blob();
            console.log(`Received blob: type=${blob.type}, size=${blob.size} bytes`);
            
            if (blob.size === 0) {
                throw new Error('Empty image data received');
            }
            
            if (!blob.type.includes('image')) {
                throw new Error(`Wrong content type: ${blob.type}`);
            }
            
            // Create object URL from blob
            const objectUrl = URL.createObjectURL(blob);
            
            // Try to load image to verify it's valid
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = () => {
                    console.log(`Image loaded successfully: ${img.width}x${img.height}`);
                    resolve();
                };
                img.onerror = (e) => {
                    console.error(`Image failed to load: ${e}`);
                    reject(new Error(`Failed to load image: ${e.type}`));
                };
                img.src = objectUrl;
            });
            
            // Update state with the thumbnail URL
            setFrameThumbnails(prev => ({
                ...prev,
                [frameNumber]: { url: objectUrl, loading: false, error: false }
            }));
        } catch (e) {
            console.error(`Error fetching thumbnail for frame ${frameNumber}:`, e);
            
            // Create error thumbnail
            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 120;
            const ctx = canvas.getContext('2d');
            
            // Red background
            ctx.fillStyle = "#ff6666";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Add error text
            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            ctx.textAlign = "center";
            ctx.fillText(`Frame ${frameNumber}`, canvas.width/2, 40);
            ctx.fillText("Error", canvas.width/2, 60);
            ctx.fillText(e.message.substring(0, 20), canvas.width/2, 80);
            
            setFrameThumbnails(prev => ({
                ...prev, 
                [frameNumber]: { 
                    url: canvas.toDataURL('image/jpeg'),
                    error: true, 
                    loading: false, 
                    errorMessage: e.message 
                }
            }));
        }
    }, [frameThumbnails, videoUrl]);

    // Toggle frame selector visibility
    const toggleFrameSelector = () => {
        setShowFrameSelector(prev => !prev);
    };

    // Use effect to load thumbnails when they're needed
    useEffect(() => {
        if (showFrameSelector && !isPlaying) {
            // Load current frame thumbnail
            generateThumbnail(currentFrame);
            
            // Load thumbnails for visible frames
            prevFrames.forEach(frame => generateThumbnail(frame));
            nextFrames.forEach(frame => generateThumbnail(frame));
        }
    }, [currentFrame, showFrameSelector, generateThumbnail, prevFrames, nextFrames, isPlaying]);

    // Add this effect to clean up object URLs
    useEffect(() => {
        return () => {
            // Clean up function to revoke object URLs when component unmounts
            Object.values(frameThumbnails).forEach(thumbnail => {
                if (thumbnail.url) {
                    URL.revokeObjectURL(thumbnail.url);
                }
            });
        };
    }, [frameThumbnails]);

    return (
        <div className="video-player-container">
            {error ? (
                <div className="error-message">{error}</div>
            ) : (
                <>
                    <div className="video-info">
                        <span className="time-display">
                            Frame: {currentFrame} | Time: {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>
                    <div 
                        ref={wrapperRef} 
                        className={`video-wrapper ${zoom > 1 ? 'zoomable' : ''} ${isDragging ? 'dragging' : ''}`}
                        style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                    >
                        {/* This container masks the video but not controls */}
                        <div className="video-zoom-container">
                            {/* This container gets transformed */}
                            <div 
                                className="video-content"
                                style={{
                                    transform: `scale(${zoom})`,
                                    transformOrigin: 'center center',
                                    marginTop: `${zoom > 1 ? panPosition.y : 0}px`,
                                    marginLeft: `${zoom > 1 ? panPosition.x : 0}px`,
                                }}
                            >
                                {/* Video without controls */}
                                <video 
                                    ref={videoRef} 
                                    src={videoUrl} 
                                    className="video-element"
                                    controls={false}
                                    onLoadedMetadata={handleMetadataLoaded}
                                    onTimeUpdate={handleTimeUpdate}
                                    onError={handleVideoError}
                                />
                            </div>
                        </div>
                        
                        {/* Separate video element with controls only */}
                        <div className="controls-container">
                            <div className="custom-controls">
                                <button 
                                    className="play-pause-btn" 
                                    onClick={() => {
                                        if (isPlaying) {
                                            videoRef.current.pause();
                                            setIsPlaying(false);
                                        } else {
                                            videoRef.current.play();
                                            setIsPlaying(true);
                                        }
                                    }}
                                >
                                    {isPlaying ? '⏸' : '▶️'}
                                </button>
                                
                                <div 
                                    className="progress-container"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const pos = (e.clientX - rect.left) / rect.width;
                                        const newTime = pos * duration;
                                        videoRef.current.currentTime = newTime;
                                        setCurrentTime(newTime);
                                        const newFrame = Math.floor(newTime * frameRate);
                                        setCurrentFrame(newFrame);
                                        
                                        // Notify parent
                                        if (onPositionChange) {
                                            onPositionChange(newTime, newFrame, frameRate, duration);
                                        }
                                    }}
                                >
                                    <div 
                                        className="progress-bar" 
                                        style={{ width: `${(currentTime / duration) * 100}%` }}
                                    ></div>
                                </div>
                                
                                <div className="time-display-custom">
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="frame-selector-toggle">
                        <button 
                            onClick={toggleFrameSelector}
                            className={`toggle-button ${showFrameSelector ? 'active' : ''}`}
                        >
                            {showFrameSelector ? 'Hide Frame Selector' : 'Show Frame Selector'}
                        </button>
                    </div>
                    
                    {showFrameSelector && (
                        <div className="frame-filmstrip">
                            {prevFrames.map(frameNum => (
                                <div 
                                    key={`prev-${frameNum}`} 
                                    className={`filmstrip-frame prev-frame ${currentFrame === frameNum ? 'current-frame' : ''}`}
                                    onClick={() => goToFrame(frameNum)}
                                >
                                    {frameThumbnails[frameNum]?.url ? (
                                        <img 
                                            src={frameThumbnails[frameNum].url} 
                                            alt={`Frame ${frameNum}`} 
                                            className="frame-thumbnail" 
                                        />
                                    ) : frameThumbnails[frameNum]?.error ? (
                                        <div className="thumbnail-error">
                                            Error<br/>Frame {frameNum}
                                        </div>
                                    ) : frameThumbnails[frameNum]?.loading ? (
                                        <div className="thumbnail-loading">
                                            Loading<br/>Frame {frameNum}
                                        </div>
                                    ) : (
                                        <div className="frame-placeholder">
                                            Frame {frameNum}
                                        </div>
                                    )}
                                </div>
                            ))}
                            
                            <div className="filmstrip-frame current-frame">
                                {frameThumbnails[currentFrame]?.url ? (
                                    <img 
                                        src={frameThumbnails[currentFrame].url} 
                                        alt={`Frame ${currentFrame}`} 
                                        className="frame-thumbnail" 
                                    />
                                ) : frameThumbnails[currentFrame]?.error ? (
                                    <div className="thumbnail-error">
                                        Error<br/>Frame {currentFrame}
                                    </div>
                                ) : frameThumbnails[currentFrame]?.loading ? (
                                    <div className="thumbnail-loading">
                                        Loading<br/>Frame {currentFrame}
                                    </div>
                                ) : (
                                    <div className="frame-placeholder">{currentFrame}</div>
                                )}
                            </div>
                            
                            {nextFrames.map(frame => (
                                <div 
                                    key={`next-${frame}`} 
                                    className="filmstrip-frame next-frame"
                                    onClick={() => goToFrame(frame)}
                                >
                                    {frameThumbnails[frame]?.url ? (
                                        <img 
                                            src={frameThumbnails[frame].url} 
                                            alt={`Frame ${frame}`} 
                                            className="frame-thumbnail" 
                                        />
                                    ) : frameThumbnails[frame]?.error ? (
                                        <div className="thumbnail-error">
                                            Error<br/>Frame {frame}
                                        </div>
                                    ) : frameThumbnails[frame]?.loading ? (
                                        <div className="thumbnail-loading">
                                            Loading<br/>Frame {frame}
                                        </div>
                                    ) : (
                                        <div className="frame-placeholder">{frame}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="control-panel">
                        <div className="slider-control">
                            <label>
                                Speed:
                                <span className="speed-value">{playbackRate.toFixed(1)}x</span>
                            </label>
                            <input 
                                type="range" 
                                min="0.25" 
                                max="2" 
                                step="0.25" 
                                value={playbackRate} 
                                onChange={handlePlaybackRateChange}
                            />
                        </div>
                        
                        <div className="slider-control">
                            <label>
                                Zoom:
                                <span className="zoom-value">{zoom.toFixed(1)}x</span>
                            </label>
                            <input 
                                type="range" 
                                min="0.5" 
                                max="2" 
                                step="0.1" 
                                value={zoom} 
                                onChange={handleZoomChange}
                            />
                        </div>
                    </div>
                    
                    {/* Hidden canvas for thumbnail generation */}
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </>
            )}
        </div>
    );
};

export default VideoPlayer;
