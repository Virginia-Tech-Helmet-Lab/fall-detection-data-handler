import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { FaArrowLeft, FaTimes } from 'react-icons/fa';
import { useProject } from '../../contexts/ProjectContext';
import { LABEL_TEMPLATES } from '../../data/labelTemplates';
import './ProjectCreation.css';

const ProjectCreation = () => {
    const navigate = useNavigate();
    const { fetchProjects } = useProject();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [temporalTemplate, setTemporalTemplate] = useState('fall_detection');
    const [bboxTemplate, setBboxTemplate] = useState('fall_detection');
    const [projectData, setProjectData] = useState({
        name: '',
        description: '',
        deadline: '',
    });

    const handleInputChange = (field, value) => {
        setProjectData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!projectData.name.trim()) {
            setError('Project name is required');
            return;
        }
        setError(null);

        const tTemplate = LABEL_TEMPLATES.find(t => t.id === temporalTemplate);
        const bTemplate = LABEL_TEMPLATES.find(t => t.id === bboxTemplate);
        const payload = {
            ...projectData,
            annotation_schema: {
                event_types: tTemplate?.schema.event_types || [],
                body_parts: bTemplate?.schema.body_parts || [],
            },
        };

        try {
            setLoading(true);
            await apiClient.post('/api/projects', payload);
            await fetchProjects();
            navigate('/projects');
        } catch (err) {
            console.error('Error creating project:', err);
            setError(err.response?.data?.error || 'Failed to create project');
        } finally {
            setLoading(false);
        }
    };

    const temporalTemplates = LABEL_TEMPLATES.filter(t => t.schema.event_types.length > 0 || t.id === 'custom');
    const bboxTemplates = LABEL_TEMPLATES.filter(t => t.schema.body_parts.length > 0 || t.id === 'custom');

    return (
        <div className="project-creation">
            <div className="creation-header">
                <button className="back-btn" onClick={() => navigate('/projects')}>
                    <FaArrowLeft /> Back to Projects
                </button>
                <h1>Create New Project</h1>
            </div>

            <div className="creation-wizard">
                <div className="wizard-content">
                    {error && (
                        <div className="error-message">
                            <FaTimes /> {error}
                        </div>
                    )}

                    <div className="step-content">
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

                        <div className="template-sections">
                            <div className="form-group">
                                <label>Temporal Label Template</label>
                                <p className="form-hint">Event types for marking time-based annotations</p>
                                <div className="template-selector">
                                    {temporalTemplates.map(template => (
                                        <div
                                            key={template.id}
                                            className={`template-card ${temporalTemplate === template.id ? 'selected' : ''}`}
                                            onClick={() => setTemporalTemplate(template.id)}
                                        >
                                            <h4>{template.name}</h4>
                                            <div className="template-labels">
                                                {template.schema.event_types.length > 0 ? (
                                                    template.schema.event_types.map(et => (
                                                        <span key={et} className="template-pill event">{et}</span>
                                                    ))
                                                ) : (
                                                    <span className="template-pill more">Empty — add your own</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Bounding Box Label Template</label>
                                <p className="form-hint">Body part labels for spatial annotations</p>
                                <div className="template-selector">
                                    {bboxTemplates.map(template => (
                                        <div
                                            key={template.id}
                                            className={`template-card ${bboxTemplate === template.id ? 'selected' : ''}`}
                                            onClick={() => setBboxTemplate(template.id)}
                                        >
                                            <h4>{template.name}</h4>
                                            <div className="template-labels">
                                                {template.schema.body_parts.slice(0, 6).map(bp => (
                                                    <span key={bp} className="template-pill">{bp}</span>
                                                ))}
                                                {template.schema.body_parts.length > 6 && (
                                                    <span className="template-pill more">+{template.schema.body_parts.length - 6} more</span>
                                                )}
                                                {template.schema.body_parts.length === 0 && (
                                                    <span className="template-pill more">Empty — add your own</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="wizard-actions">
                        <div></div>
                        <button
                            className="btn btn-success"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create Project'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectCreation;
