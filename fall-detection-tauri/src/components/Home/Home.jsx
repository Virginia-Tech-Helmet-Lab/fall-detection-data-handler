import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUpload, FaCog, FaTags, FaCheckCircle, FaDownload, FaArrowRight, FaPlayCircle, FaBookOpen, FaBug, FaLightbulb, FaGithub, FaPaperPlane, FaUser, FaEnvelope, FaCopy, FaShare, FaFolder, FaExchangeAlt } from 'react-icons/fa';
import './Home.css';
import axios from 'axios';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';

const Home = () => {
    const navigate = useNavigate();
    const { currentProject, projects, switchProject } = useProject();
    const { user } = useAuth();
    const [projectStats, setProjectStats] = useState(null);
    const [currentStage, setCurrentStage] = useState('import');
    
    // Feedback form state
    const [feedbackForm, setFeedbackForm] = useState({
        type: 'feature', // 'feature' or 'bug'
        title: '',
        description: '',
        name: '',
        email: '',
        priority: 'medium'
    });
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [submissionMethod, setSubmissionMethod] = useState('github'); // 'github' or 'email'
    const [showEmailSuccess, setShowEmailSuccess] = useState(false);

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

    const generateEmailBody = () => {
        const emailBody = `
Subject: [Fall Detection Data Handler] ${feedbackForm.type === 'feature' ? 'Feature Request' : 'Bug Report'}: ${feedbackForm.title}

Submitted by: ${feedbackForm.name || 'Anonymous'} ${feedbackForm.email ? `(${feedbackForm.email})` : ''}
Type: ${feedbackForm.type === 'feature' ? 'Feature Request' : 'Bug Report'}
Priority: ${feedbackForm.priority}

Description:
${feedbackForm.description}

---
This feedback was submitted from the Fall Detection Data Handler application.
        `.trim();
        
        return emailBody;
    };

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        setSubmittingFeedback(true);
        
        try {
            if (submissionMethod === 'github') {
                // GitHub submission method
                const issueBody = `
**Submitted by:** ${feedbackForm.name || 'Anonymous'} ${feedbackForm.email ? `(${feedbackForm.email})` : ''}
**Type:** ${feedbackForm.type === 'feature' ? 'Feature Request' : 'Bug Report'}
**Priority:** ${feedbackForm.priority}

## Description
${feedbackForm.description}

---
*This issue was automatically created from the Fall Detection Data Handler application.*
                `.trim();
                
                const labels = [
                    feedbackForm.type === 'feature' ? 'enhancement' : 'bug',
                    `priority-${feedbackForm.priority}`
                ];
                
                const githubUrl = `https://github.com/Virginia-Tech-Helmet-Lab/fall-detection-data-handler/issues/new?` +
                    `title=${encodeURIComponent(feedbackForm.title)}&` +
                    `body=${encodeURIComponent(issueBody)}&` +
                    `labels=${encodeURIComponent(labels.join(','))}`;
                
                window.open(githubUrl, '_blank');
                setFeedbackSubmitted(true);
                
            } else {
                // Email submission method
                const emailBody = generateEmailBody();
                const mailtoUrl = `mailto:ethan02@vt.edu?${new URLSearchParams({
                    subject: `[Fall Detection Data Handler] ${feedbackForm.type === 'feature' ? 'Feature Request' : 'Bug Report'}: ${feedbackForm.title}`,
                    body: emailBody
                }).toString()}`;
                
                // Copy to clipboard as backup
                if (navigator.clipboard) {
                    await navigator.clipboard.writeText(emailBody);
                }
                
                window.location.href = mailtoUrl;
                setShowEmailSuccess(true);
                setTimeout(() => setShowEmailSuccess(false), 8000);
            }
            
            setFeedbackForm({
                type: 'feature',
                title: '',
                description: '',
                name: '',
                email: '',
                priority: 'medium'
            });
            
            setTimeout(() => {
                setFeedbackSubmitted(false);
                setShowEmailSuccess(false);
            }, 5000);
            
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('There was an error submitting your feedback. Please try again.');
        } finally {
            setSubmittingFeedback(false);
        }
    };

    const handleFeedbackChange = (field, value) => {
        setFeedbackForm(prev => ({
            ...prev,
            [field]: value
        }));
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
                    
                    {/* Project Selector */}
                    <div className="project-selector">
                        <div className="current-project-info">
                            <FaFolder className="project-icon" />
                            <div className="project-details">
                                <label>Current Project:</label>
                                {currentProject ? (
                                    <>
                                        <h3>{currentProject.name}</h3>
                                        <span className={`project-status ${currentProject.status}`}>
                                            {currentProject.status}
                                        </span>
                                    </>
                                ) : (
                                    <p className="no-project">No project selected</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="project-actions">
                            {projects && projects.length > 1 && (
                                <select 
                                    className="project-dropdown"
                                    value={currentProject?.project_id || ''}
                                    onChange={(e) => {
                                        const project = projects.find(p => p.project_id === parseInt(e.target.value));
                                        if (project) switchProject(project);
                                    }}
                                >
                                    <option value="">Select a project...</option>
                                    {projects.map(project => (
                                        <option key={project.project_id} value={project.project_id}>
                                            {project.name} ({project.status})
                                        </option>
                                    ))}
                                </select>
                            )}
                            <button 
                                className="view-projects-btn"
                                onClick={() => navigate('/projects')}
                            >
                                <FaExchangeAlt /> View All Projects
                            </button>
                        </div>
                    </div>
                    
                    {currentProject && currentProject.progress_percentage !== undefined && (
                        <div className="project-progress-bar">
                            <div className="progress-header">
                                <span>Project Progress</span>
                                <span>{currentProject.progress_percentage}%</span>
                            </div>
                            <div className="progress-track">
                                <div 
                                    className="progress-fill"
                                    style={{ width: `${currentProject.progress_percentage}%` }}
                                />
                            </div>
                        </div>
                    )}
                    
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

            <section className="feedback-section">
                <div className="feedback-container">
                    <div className="feedback-header">
                        <h2><FaGithub /> Feedback & Feature Requests</h2>
                        <p>Help us improve the Fall Detection Data Handler! Your feedback drives our development.</p>
                    </div>

                    {feedbackSubmitted && submissionMethod === 'github' ? (
                        <div className="feedback-success">
                            <FaCheckCircle />
                            <h3>Thank you for your feedback!</h3>
                            <p>Your GitHub issue has been opened in a new tab. You can track its progress on GitHub.</p>
                        </div>
                    ) : showEmailSuccess ? (
                        <div className="feedback-success">
                            <FaCheckCircle />
                            <h3>Email opened successfully!</h3>
                            <p>Your email client should have opened with a pre-filled message. The feedback has also been copied to your clipboard as a backup.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleFeedbackSubmit} className="feedback-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Feedback Type</label>
                                    <div className="feedback-type-buttons">
                                        <button
                                            type="button"
                                            className={`type-button ${feedbackForm.type === 'feature' ? 'active' : ''}`}
                                            onClick={() => handleFeedbackChange('type', 'feature')}
                                        >
                                            <FaLightbulb /> Feature Request
                                        </button>
                                        <button
                                            type="button"
                                            className={`type-button ${feedbackForm.type === 'bug' ? 'active' : ''}`}
                                            onClick={() => handleFeedbackChange('type', 'bug')}
                                        >
                                            <FaBug /> Bug Report
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label>Priority</label>
                                    <select
                                        value={feedbackForm.priority}
                                        onChange={(e) => handleFeedbackChange('priority', e.target.value)}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Submission Method</label>
                                <div className="submission-method-buttons">
                                    <button
                                        type="button"
                                        className={`method-button ${submissionMethod === 'github' ? 'active' : ''}`}
                                        onClick={() => setSubmissionMethod('github')}
                                    >
                                        <FaGithub /> GitHub Issue
                                        <small>Requires GitHub account</small>
                                    </button>
                                    <button
                                        type="button"
                                        className={`method-button ${submissionMethod === 'email' ? 'active' : ''}`}
                                        onClick={() => setSubmissionMethod('email')}
                                    >
                                        <FaEnvelope /> Email
                                        <small>No account needed</small>
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    value={feedbackForm.title}
                                    onChange={(e) => handleFeedbackChange('title', e.target.value)}
                                    placeholder={feedbackForm.type === 'feature' ? 'Brief description of your feature idea' : 'Brief description of the bug'}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Description *</label>
                                <textarea
                                    value={feedbackForm.description}
                                    onChange={(e) => handleFeedbackChange('description', e.target.value)}
                                    placeholder={feedbackForm.type === 'feature' 
                                        ? 'Describe the feature you\'d like to see. What problem would it solve? How should it work?' 
                                        : 'Describe the bug in detail. What were you doing when it occurred? What did you expect to happen vs. what actually happened?'}
                                    rows={5}
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label><FaUser /> Your Name (Optional)</label>
                                    <input
                                        type="text"
                                        value={feedbackForm.name}
                                        onChange={(e) => handleFeedbackChange('name', e.target.value)}
                                        placeholder="How should we credit you?"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label><FaEnvelope /> Email (Optional)</label>
                                    <input
                                        type="email"
                                        value={feedbackForm.email}
                                        onChange={(e) => handleFeedbackChange('email', e.target.value)}
                                        placeholder="For follow-up questions"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="submit-feedback-button"
                                disabled={submittingFeedback || !feedbackForm.title.trim() || !feedbackForm.description.trim()}
                            >
                                {submittingFeedback ? (
                                    <>Submitting...</>
                                ) : submissionMethod === 'github' ? (
                                    <>
                                        <FaGithub /> Submit to GitHub
                                    </>
                                ) : (
                                    <>
                                        <FaEnvelope /> Send Email
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    <div className="feedback-footer">
                        {submissionMethod === 'github' ? (
                            <p>
                                <FaGithub /> This will open a pre-filled GitHub issue for tracking and discussion.
                                You can also browse existing issues and feature requests on our{' '}
                                <a 
                                    href="https://github.com/Virginia-Tech-Helmet-Lab/fall-detection-data-handler/issues" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                >
                                    GitHub repository
                                </a>.
                            </p>
                        ) : (
                            <p>
                                <FaEnvelope /> This will open your email client with a pre-filled message to the VT Helmet Lab team.
                                The message will also be copied to your clipboard as a backup. You can send the email to:{' '}
                                <a href="mailto:ethan02@vt.edu">ethan02@vt.edu</a>
                            </p>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;