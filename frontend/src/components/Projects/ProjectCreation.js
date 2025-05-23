import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaArrowRight, FaCheck, FaTimes } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import './ProjectCreation.css';

const ProjectCreation = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { fetchProjects } = useProject();
    
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Form data
    const [projectData, setProjectData] = useState({
        // Step 1: Basic Info
        name: '',
        description: '',
        deadline: '',
        
        // Step 2: Annotation Settings
        annotationTypes: {
            temporal: true,
            boundingBox: true
        },
        bodyParts: ['head', 'shoulder', 'hip', 'knee', 'ankle'],
        fallTypes: ['forward', 'backward', 'sideways', 'sit-to-fall'],
        
        // Step 3: Normalization Defaults
        normalization: {
            resolution: '224x224',
            framerate: 30,
            brightness: 1.0,
            contrast: 1.0,
            saturation: 1.0
        },
        
        // Step 4: Team Selection
        teamMembers: [],
        
        // Step 5: Quality Settings
        qualityThreshold: 0.8,
        requireReview: true,
        minAnnotatorsPerVideo: 1
    });

    const steps = [
        { number: 1, title: 'Basic Information', icon: '📋' },
        { number: 2, title: 'Annotation Settings', icon: '🏷️' },
        { number: 3, title: 'Video Normalization', icon: '🎥' },
        { number: 4, title: 'Team Selection', icon: '👥' },
        { number: 5, title: 'Quality Settings', icon: '✅' }
    ];

    const handleInputChange = (field, value) => {
        setProjectData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleNestedChange = (parent, field, value) => {
        setProjectData(prev => ({
            ...prev,
            [parent]: {
                ...prev[parent],
                [field]: value
            }
        }));
    };

    const handleArrayChange = (field, value, checked) => {
        setProjectData(prev => {
            const array = [...prev[field]];
            if (checked && !array.includes(value)) {
                array.push(value);
            } else if (!checked) {
                const index = array.indexOf(value);
                if (index > -1) array.splice(index, 1);
            }
            return { ...prev, [field]: array };
        });
    };

    const validateStep = () => {
        switch (currentStep) {
            case 1:
                if (!projectData.name.trim()) {
                    setError('Project name is required');
                    return false;
                }
                if (!projectData.description.trim()) {
                    setError('Project description is required');
                    return false;
                }
                break;
            case 2:
                if (!projectData.annotationTypes.temporal && !projectData.annotationTypes.boundingBox) {
                    setError('At least one annotation type must be selected');
                    return false;
                }
                break;
            case 4:
                if (projectData.teamMembers.length === 0) {
                    setError('At least one team member must be selected');
                    return false;
                }
                break;
        }
        setError(null);
        return true;
    };

    const handleNext = () => {
        if (validateStep()) {
            setCurrentStep(prev => Math.min(prev + 1, steps.length));
        }
    };

    const handlePrevious = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
        setError(null);
    };

    const handleSubmit = async () => {
        if (!validateStep()) return;

        try {
            setLoading(true);
            setError(null);

            const response = await axios.post(
                'http://localhost:5000/api/projects',
                projectData,
                {
                    withCredentials: true,
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }
            );

            // Refresh projects list
            await fetchProjects();
            
            // Navigate to project dashboard
            navigate('/projects');
        } catch (err) {
            console.error('Error creating project:', err);
            setError(err.response?.data?.error || 'Failed to create project');
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="step-content">
                        <h3>Basic Project Information</h3>
                        <div className="form-group">
                            <label>Project Name *</label>
                            <input
                                type="text"
                                value={projectData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                placeholder="e.g., Fall Detection Study 2024"
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label>Description *</label>
                            <textarea
                                value={projectData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Describe the project goals and requirements..."
                                className="form-control"
                                rows={4}
                            />
                        </div>
                        <div className="form-group">
                            <label>Deadline</label>
                            <input
                                type="date"
                                value={projectData.deadline}
                                onChange={(e) => handleInputChange('deadline', e.target.value)}
                                className="form-control"
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="step-content">
                        <h3>Annotation Settings</h3>
                        <div className="form-group">
                            <label>Annotation Types</label>
                            <div className="checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={projectData.annotationTypes.temporal}
                                        onChange={(e) => handleNestedChange('annotationTypes', 'temporal', e.target.checked)}
                                    />
                                    Temporal Annotations (Fall Events)
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={projectData.annotationTypes.boundingBox}
                                        onChange={(e) => handleNestedChange('annotationTypes', 'boundingBox', e.target.checked)}
                                    />
                                    Bounding Box Annotations (Body Parts)
                                </label>
                            </div>
                        </div>
                        
                        {projectData.annotationTypes.boundingBox && (
                            <div className="form-group">
                                <label>Body Parts to Annotate</label>
                                <div className="tags-input">
                                    {['head', 'shoulder', 'hip', 'knee', 'ankle', 'elbow', 'wrist'].map(part => (
                                        <label key={part} className="tag-label">
                                            <input
                                                type="checkbox"
                                                checked={projectData.bodyParts.includes(part)}
                                                onChange={(e) => handleArrayChange('bodyParts', part, e.target.checked)}
                                            />
                                            {part}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {projectData.annotationTypes.temporal && (
                            <div className="form-group">
                                <label>Fall Types to Track</label>
                                <div className="tags-input">
                                    {['forward', 'backward', 'sideways', 'sit-to-fall', 'trip', 'slip'].map(type => (
                                        <label key={type} className="tag-label">
                                            <input
                                                type="checkbox"
                                                checked={projectData.fallTypes.includes(type)}
                                                onChange={(e) => handleArrayChange('fallTypes', type, e.target.checked)}
                                            />
                                            {type}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 3:
                return (
                    <div className="step-content">
                        <h3>Video Normalization Defaults</h3>
                        <div className="form-group">
                            <label>Resolution</label>
                            <select
                                value={projectData.normalization.resolution}
                                onChange={(e) => handleNestedChange('normalization', 'resolution', e.target.value)}
                                className="form-control"
                            >
                                <option value="224x224">224x224</option>
                                <option value="256x256">256x256</option>
                                <option value="320x240">320x240</option>
                                <option value="640x480">640x480</option>
                                <option value="1280x720">1280x720 (HD)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Frame Rate</label>
                            <select
                                value={projectData.normalization.framerate}
                                onChange={(e) => handleNestedChange('normalization', 'framerate', parseInt(e.target.value))}
                                className="form-control"
                            >
                                <option value="15">15 fps</option>
                                <option value="24">24 fps</option>
                                <option value="30">30 fps</option>
                                <option value="60">60 fps</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Default Adjustments</label>
                            <div className="slider-group">
                                <div className="slider-item">
                                    <span>Brightness: {projectData.normalization.brightness}</span>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.1"
                                        value={projectData.normalization.brightness}
                                        onChange={(e) => handleNestedChange('normalization', 'brightness', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="slider-item">
                                    <span>Contrast: {projectData.normalization.contrast}</span>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.1"
                                        value={projectData.normalization.contrast}
                                        onChange={(e) => handleNestedChange('normalization', 'contrast', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="slider-item">
                                    <span>Saturation: {projectData.normalization.saturation}</span>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.1"
                                        value={projectData.normalization.saturation}
                                        onChange={(e) => handleNestedChange('normalization', 'saturation', parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="step-content">
                        <h3>Team Selection</h3>
                        <TeamSelector
                            selectedMembers={projectData.teamMembers}
                            onMembersChange={(members) => handleInputChange('teamMembers', members)}
                        />
                    </div>
                );

            case 5:
                return (
                    <div className="step-content">
                        <h3>Quality Settings</h3>
                        <div className="form-group">
                            <label>Quality Threshold</label>
                            <div className="slider-item">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={projectData.qualityThreshold}
                                    onChange={(e) => handleInputChange('qualityThreshold', parseFloat(e.target.value))}
                                />
                                <span>{(projectData.qualityThreshold * 100).toFixed(0)}%</span>
                            </div>
                            <small>Minimum annotation quality score required</small>
                        </div>
                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={projectData.requireReview}
                                    onChange={(e) => handleInputChange('requireReview', e.target.checked)}
                                />
                                Require review before completion
                            </label>
                        </div>
                        <div className="form-group">
                            <label>Minimum Annotators per Video</label>
                            <input
                                type="number"
                                min="1"
                                max="5"
                                value={projectData.minAnnotatorsPerVideo}
                                onChange={(e) => handleInputChange('minAnnotatorsPerVideo', parseInt(e.target.value))}
                                className="form-control small"
                            />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="project-creation">
            <div className="creation-header">
                <button className="back-btn" onClick={() => navigate('/projects')}>
                    <FaArrowLeft /> Back to Projects
                </button>
                <h1>Create New Project</h1>
            </div>

            <div className="creation-wizard">
                <div className="wizard-steps">
                    {steps.map((step) => (
                        <div
                            key={step.number}
                            className={`wizard-step ${currentStep === step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}
                        >
                            <div className="step-number">
                                {currentStep > step.number ? <FaCheck /> : step.icon}
                            </div>
                            <div className="step-title">{step.title}</div>
                        </div>
                    ))}
                </div>

                <div className="wizard-content">
                    {error && (
                        <div className="error-message">
                            <FaTimes /> {error}
                        </div>
                    )}

                    {renderStepContent()}

                    <div className="wizard-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={handlePrevious}
                            disabled={currentStep === 1}
                        >
                            <FaArrowLeft /> Previous
                        </button>

                        {currentStep < steps.length ? (
                            <button
                                className="btn btn-primary"
                                onClick={handleNext}
                            >
                                Next <FaArrowRight />
                            </button>
                        ) : (
                            <button
                                className="btn btn-success"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Project'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Team Selector Component
const TeamSelector = ({ selectedMembers, onMembersChange }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/auth/users', {
                withCredentials: true,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            setUsers(response.data.users || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleUser = (userId) => {
        const members = [...selectedMembers];
        const index = members.findIndex(m => m.user_id === userId);
        
        if (index > -1) {
            members.splice(index, 1);
        } else {
            const user = users.find(u => u.user_id === userId);
            members.push({
                user_id: userId,
                role: user.role === 'admin' ? 'lead' : 'member'
            });
        }
        
        onMembersChange(members);
    };

    const isSelected = (userId) => {
        return selectedMembers.some(m => m.user_id === userId);
    };

    if (loading) {
        return <div className="loading">Loading users...</div>;
    }

    return (
        <div className="team-selector">
            <p>Select team members for this project</p>
            <div className="user-grid">
                {users.map(user => (
                    <div
                        key={user.user_id}
                        className={`user-card ${isSelected(user.user_id) ? 'selected' : ''}`}
                        onClick={() => toggleUser(user.user_id)}
                    >
                        <div className="user-avatar">
                            {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-info">
                            <div className="user-name">{user.full_name}</div>
                            <div className="user-role">{user.role}</div>
                        </div>
                        {isSelected(user.user_id) && (
                            <FaCheck className="selected-icon" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProjectCreation;