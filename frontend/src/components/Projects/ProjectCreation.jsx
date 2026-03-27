import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { FaArrowLeft, FaArrowRight, FaCheck, FaTimes } from 'react-icons/fa';
import { useProject } from '../../contexts/ProjectContext';
import './ProjectCreation.css';

const ProjectCreation = () => {
    const navigate = useNavigate();
    const { fetchProjects } = useProject();

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [projectData, setProjectData] = useState({
        name: '',
        description: '',
        deadline: '',
        annotationTypes: {
            temporal: true,
            boundingBox: true
        },
        bodyParts: ['head', 'shoulder', 'hip', 'knee', 'ankle'],
        fallTypes: ['forward', 'backward', 'sideways', 'sit-to-fall'],
    });

    const steps = [
        { number: 1, title: 'Basic Information', icon: '1' },
        { number: 2, title: 'Annotation Settings', icon: '2' },
    ];

    const handleInputChange = (field, value) => {
        setProjectData(prev => ({ ...prev, [field]: value }));
    };

    const handleNestedChange = (parent, field, value) => {
        setProjectData(prev => ({
            ...prev,
            [parent]: { ...prev[parent], [field]: value }
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
        if (currentStep === 1) {
            if (!projectData.name.trim()) {
                setError('Project name is required');
                return false;
            }
        }
        if (currentStep === 2) {
            if (!projectData.annotationTypes.temporal && !projectData.annotationTypes.boundingBox) {
                setError('At least one annotation type must be selected');
                return false;
            }
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
            await apiClient.post('/api/projects', projectData);
            await fetchProjects();
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
                            <label>Description</label>
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
                    {steps.map((step, index) => (
                        <React.Fragment key={step.number}>
                            <div
                                className={`wizard-step ${currentStep === step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}
                            >
                                <div className="step-number">
                                    {currentStep > step.number ? <FaCheck /> : step.icon}
                                </div>
                                <div className="step-title">{step.title}</div>
                            </div>
                            {index < steps.length - 1 && <div className="wizard-step-connector" />}
                        </React.Fragment>
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

export default ProjectCreation;
