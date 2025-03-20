import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './NormalizationPanel.css';

const NormalizationPanel = () => {
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [normalizedPreviewUrl, setNormalizedPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [applyToAll, setApplyToAll] = useState(false);
    const navigate = useNavigate();
    
    const [settings, setSettings] = useState({
        resolution: '224x224',
        framerate: 30,
        brightness: 1.0,
        contrast: 1.0,
        saturation: 1.0
    });

    // Fetch videos on component mount
    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/videos');
                setVideos(response.data);
                if (response.data.length > 0) {
                    setSelectedVideo(response.data[0]);
                }
            } catch (error) {
                console.error('Error fetching videos:', error);
                setMessage('Failed to load videos: ' + error.message);
            }
        };
        
        fetchVideos();
    }, []);

    // Update preview URL when selected video changes
    useEffect(() => {
        if (selectedVideo) {
            // Use the API endpoint for serving videos
            setPreviewUrl(`http://localhost:5000/api/static/${selectedVideo.filename}`);
            setNormalizedPreviewUrl(null); // Reset normalized preview
        }
    }, [selectedVideo]);

    const handleVideoSelect = (video) => {
        setSelectedVideo(video);
    };

    const handleSettingChange = (e) => {
        const { name, value } = e.target;
        setSettings({...settings, [name]: value});
        // Reset normalized preview when settings change
        setNormalizedPreviewUrl(null);
    };

    const generatePreview = async () => {
        if (!selectedVideo) return;
        
        setLoading(true);
        setMessage('Generating preview...');
        
        try {
            const response = await axios.post('http://localhost:5000/api/preview-normalize', {
                video_id: selectedVideo.video_id,
                settings: settings
            });
            
            // Use the API endpoint for serving preview videos
            setNormalizedPreviewUrl(`http://localhost:5000/api/preview/${response.data.preview_filename.split('/').pop()}?t=${Date.now()}`);
            setMessage('Preview generated successfully!');
        } catch (error) {
            console.error('Preview generation error:', error);
            setMessage(`Failed to generate preview: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const applyNormalization = async () => {
        if (!selectedVideo && !applyToAll) {
            setMessage('Please select a video first');
            return;
        }
        
        setLoading(true);
        setMessage('Applying normalization...');
        
        try {
            if (applyToAll) {
                const response = await axios.post('http://localhost:5000/api/normalize-all', {
                    settings: settings
                });
                setMessage(`Normalized ${response.data.processed_count} videos successfully!`);
            } else {
                const response = await axios.post('http://localhost:5000/api/normalize', {
                    video_id: selectedVideo.video_id,
                    settings: settings
                });
                setMessage('Normalization applied successfully!');
            }
            
            // Navigate to labeling interface after a delay
            setTimeout(() => navigate('/label'), 2000);
        } catch (error) {
            console.error('Normalization error:', error);
            setMessage(`Normalization failed: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Parse resolution to width and height
    const getResolutionDimensions = () => {
        if (settings.resolution.includes('x')) {
            const [width, height] = settings.resolution.split('x');
            return { width: parseInt(width), height: parseInt(height) };
        }
        return { width: 224, height: 224 }; // Default
    };

    return (
        <div className="normalization-container">
            <h2>Video Normalization</h2>
            <p>Standardize your videos before annotation</p>
            
            <div className="normalization-layout">
                <div className="video-list-panel">
                    <h3>Available Videos</h3>
                    {videos.length === 0 ? (
                        <p>No videos available. Please upload videos first.</p>
                    ) : (
                        <ul className="video-list">
                            {videos.map(video => (
                                <li 
                                    key={video.video_id} 
                                    className={selectedVideo?.video_id === video.video_id ? 'selected' : ''}
                                    onClick={() => handleVideoSelect(video)}
                                >
                                    <span className="video-name">{video.filename}</span>
                                    <span className="video-info">
                                        {video.resolution}, {video.framerate} fps, {video.duration.toFixed(1)}s
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    
                    <div className="batch-controls">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={applyToAll} 
                                onChange={() => setApplyToAll(!applyToAll)} 
                            />
                            Apply to all videos
                        </label>
                    </div>
                </div>
                
                <div className="settings-panel">
                    <h3>Normalization Settings</h3>
                    
                    <div className="setting-group">
                        <label>Resolution:</label>
                        <select name="resolution" value={settings.resolution} onChange={handleSettingChange}>
                            <option value="224x224">224x224 (Square)</option>
                            <option value="320x240">320x240 (4:3)</option>
                            <option value="640x480">640x480 (4:3)</option>
                            <option value="1280x720">1280x720 (720p)</option>
                            <option value="1920x1080">1920x1080 (1080p)</option>
                        </select>
                    </div>
                    
                    <div className="setting-group">
                        <label>Frame Rate: {settings.framerate} fps</label>
                        <input 
                            type="range" 
                            name="framerate" 
                            min="10" 
                            max="60" 
                            step="5"
                            value={settings.framerate} 
                            onChange={handleSettingChange} 
                        />
                    </div>
                    
                    <div className="setting-group">
                        <label>Brightness: {settings.brightness}</label>
                        <input 
                            type="range" 
                            name="brightness" 
                            min="0.5" 
                            max="1.5" 
                            step="0.1"
                            value={settings.brightness} 
                            onChange={handleSettingChange} 
                        />
                    </div>
                    
                    <div className="setting-group">
                        <label>Contrast: {settings.contrast}</label>
                        <input 
                            type="range" 
                            name="contrast" 
                            min="0.5" 
                            max="1.5" 
                            step="0.1"
                            value={settings.contrast} 
                            onChange={handleSettingChange} 
                        />
                    </div>
                    
                    <div className="setting-group">
                        <label>Saturation: {settings.saturation}</label>
                        <input 
                            type="range" 
                            name="saturation" 
                            min="0.5" 
                            max="1.5" 
                            step="0.1"
                            value={settings.saturation} 
                            onChange={handleSettingChange} 
                        />
                    </div>
                    
                    <div className="button-group">
                        <button 
                            className="preview-button" 
                            onClick={generatePreview} 
                            disabled={loading || !selectedVideo}
                        >
                            Generate Preview
                        </button>
                        
                        <button 
                            className="apply-button" 
                            onClick={applyNormalization} 
                            disabled={loading || (!selectedVideo && !applyToAll)}
                        >
                            {applyToAll ? 'Apply to All Videos' : 'Apply Normalization'}
                        </button>
                    </div>
                </div>
                
                <div className="preview-panel">
                    <h3>Preview</h3>
                    
                    {selectedVideo ? (
                        <div className="preview-container">
                            <div className="preview-original">
                                <h4>Original</h4>
                                {previewUrl && (
                                    <video 
                                        src={previewUrl} 
                                        controls 
                                        width={getResolutionDimensions().width}
                                        height={getResolutionDimensions().height}
                                    />
                                )}
                            </div>
                            
                            <div className="preview-normalized">
                                <h4>Normalized</h4>
                                {normalizedPreviewUrl ? (
                                    <video 
                                        src={normalizedPreviewUrl} 
                                        controls 
                                        width={getResolutionDimensions().width}
                                        height={getResolutionDimensions().height}
                                    />
                                ) : (
                                    <div className="no-preview">
                                        <p>Click "Generate Preview" to see the normalized result</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p>Select a video to preview normalization</p>
                    )}
                    
                    {message && (
                        <div className={`message ${message.includes('failed') ? 'error' : message.includes('success') ? 'success' : ''}`}>
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NormalizationPanel;
