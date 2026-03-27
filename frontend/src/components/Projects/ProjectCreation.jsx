import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { FaArrowLeft, FaTimes } from 'react-icons/fa';
import { useProject } from '../../contexts/ProjectContext';
import './ProjectCreation.css';

const ProjectCreation = () => {
    const navigate = useNavigate();
    const { fetchProjects } = useProject();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
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

        try {
            setLoading(true);
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
