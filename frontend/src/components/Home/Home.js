import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUpload, FaCog, FaTags, FaCheckCircle, FaDownload, FaArrowRight, FaPlayCircle, FaBookOpen } from 'react-icons/fa';
import './Home.css';
import axios from 'axios';

const Home = () => {
    const navigate = useNavigate();
    const [projectStats, setProjectStats] = useState(null);
    const [currentStage, setCurrentStage] = useState('import');

    useEffect(() => {
        fetchProjectStats();
    }, []);

    const fetchProjectStats = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/export/stats');
            const stats = response.data;
            
            // Determine current stage based on data
            if (stats.totalVideos === 0) {
                setCurrentStage('import');
            } else if (stats.totalAnnotations === 0) {
                setCurrentStage('label');
            } else if (stats.confirmedVideos < stats.totalVideos) {
                setCurrentStage('review');
            } else {
                setCurrentStage('export');
            }
            
            setProjectStats(stats);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const stages = [
        {
            id: 'import',
            name: 'Import Data',
            icon: <FaUpload />,
            description: 'Upload videos from your computer, Dropbox, Google Drive, or URLs',
            route: '/import',
            color: '#660000'
        },
        {
            id: 'normalize',
            name: 'Normalize',
            icon: <FaCog />,
            description: 'Standardize video resolution, framerate, and quality settings',
            route: '/normalize',
            color: '#990000'
        },
        {
            id: 'label',
            name: 'Label',
            icon: <FaTags />,
            description: 'Annotate fall events and mark body positions with bounding boxes',
            route: '/labeling',
            color: '#CC0000'
        },
        {
            id: 'review',
            name: 'Review',
            icon: <FaCheckCircle />,
            description: 'Verify annotations and ensure data quality before export',
            route: '/review',
            color: '#990000'
        },
        {
            id: 'export',
            name: 'Export',
            icon: <FaDownload />,
            description: 'Download annotated data in various formats or prepare ML datasets',
            route: '/export',
            color: '#660000'
        }
    ];

    const getStageStatus = (stageId) => {
        const stageOrder = ['import', 'normalize', 'label', 'review', 'export'];
        const currentIndex = stageOrder.indexOf(currentStage);
        const stageIndex = stageOrder.indexOf(stageId);
        
        if (stageIndex < currentIndex) return 'completed';
        if (stageIndex === currentIndex) return 'current';
        return 'upcoming';
    };

    return (
        <div className="home-container">
            <header className="home-header">
                <div className="header-content">
                    <h1 className="main-title">Fall Detection Data Handler</h1>
                    <div className="subtitle-container">
                        <span className="vt-label">VT Helmet Lab</span>
                        <span className="software-label">Data Processing Software</span>
                    </div>
                </div>
            </header>

            <section className="welcome-section">
                <div className="welcome-content">
                    <h2>Welcome to the Fall Detection Annotation System</h2>
                    <p>
                        This tool helps researchers prepare video data for fall detection AI models. 
                        Follow the 5-step workflow below to import, process, annotate, and export your data.
                    </p>
                    
                    {projectStats && (
                        <div className="quick-stats">
                            <div className="stat-item">
                                <span className="stat-value">{projectStats.totalVideos}</span>
                                <span className="stat-label">Videos</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{projectStats.totalAnnotations}</span>
                                <span className="stat-label">Annotations</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{projectStats.confirmedVideos}</span>
                                <span className="stat-label">Confirmed</span>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section className="workflow-section">
                <h2>Annotation Workflow</h2>
                <div className="workflow-stages">
                    {stages.map((stage, index) => {
                        const status = getStageStatus(stage.id);
                        return (
                            <div key={stage.id} className="stage-container">
                                <div 
                                    className={`stage-card ${status}`}
                                    onClick={() => navigate(stage.route)}
                                    style={{'--stage-color': stage.color}}
                                >
                                    <div className="stage-number">{index + 1}</div>
                                    <div className="stage-icon">{stage.icon}</div>
                                    <h3>{stage.name}</h3>
                                    <p>{stage.description}</p>
                                    {status === 'current' && (
                                        <div className="current-indicator">
                                            <FaPlayCircle /> Current Step
                                        </div>
                                    )}
                                    {status === 'completed' && (
                                        <div className="completed-indicator">
                                            <FaCheckCircle /> Completed
                                        </div>
                                    )}
                                </div>
                                {index < stages.length - 1 && (
                                    <div className={`stage-arrow ${status === 'completed' ? 'active' : ''}`}>
                                        <FaArrowRight />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="instructions-section">
                <h2><FaBookOpen /> How to Use This Tool</h2>
                <div className="instructions-grid">
                    <div className="instruction-card">
                        <h3>1. Import Your Videos</h3>
                        <ul>
                            <li>Click on "Import Data" to begin</li>
                            <li>Upload videos from your computer, cloud storage, or paste URLs</li>
                            <li>Supported formats: MP4, AVI, MOV, WMV</li>
                            <li>Videos will be automatically processed and thumbnails generated</li>
                        </ul>
                    </div>
                    
                    <div className="instruction-card">
                        <h3>2. Normalize Videos</h3>
                        <ul>
                            <li>Standardize video properties for consistent analysis</li>
                            <li>Adjust resolution, framerate, and quality</li>
                            <li>Apply brightness/contrast corrections if needed</li>
                            <li>This step ensures all videos have similar characteristics</li>
                        </ul>
                    </div>
                    
                    <div className="instruction-card">
                        <h3>3. Label Fall Events</h3>
                        <ul>
                            <li>Mark the start and end times of fall events</li>
                            <li>Draw bounding boxes around body parts (head, torso, etc.)</li>
                            <li>Use keyboard shortcuts for faster annotation</li>
                            <li>Save annotations automatically as you work</li>
                        </ul>
                    </div>
                    
                    <div className="instruction-card">
                        <h3>4. Review Annotations</h3>
                        <ul>
                            <li>Verify all annotations are accurate</li>
                            <li>Check temporal alignment of fall events</li>
                            <li>Ensure bounding boxes are properly placed</li>
                            <li>Confirm videos before proceeding to export</li>
                        </ul>
                    </div>
                    
                    <div className="instruction-card">
                        <h3>5. Export Your Data</h3>
                        <ul>
                            <li>Choose from multiple export formats (JSON, CSV, COCO, YOLO)</li>
                            <li>Generate ML-ready datasets with train/val/test splits</li>
                            <li>Create PyTorch or TensorFlow compatible datasets</li>
                            <li>Download processed videos with annotations</li>
                        </ul>
                    </div>
                    
                    <div className="instruction-card tips">
                        <h3>💡 Pro Tips</h3>
                        <ul>
                            <li><strong>Batch Processing:</strong> Import multiple videos at once</li>
                            <li><strong>Keyboard Shortcuts:</strong> Use spacebar to play/pause, arrow keys to navigate</li>
                            <li><strong>Auto-Save:</strong> Annotations are saved automatically</li>
                            <li><strong>ML Pipeline:</strong> Export directly to PyTorch datasets for training</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="getting-started">
                <h2>Ready to Get Started?</h2>
                <button 
                    className="start-button"
                    onClick={() => navigate(stages.find(s => s.id === currentStage)?.route || '/import')}
                >
                    <FaPlayCircle /> 
                    {currentStage === 'import' ? 'Start Importing Videos' : `Continue to ${stages.find(s => s.id === currentStage)?.name}`}
                </button>
            </section>
        </div>
    );
};

export default Home;