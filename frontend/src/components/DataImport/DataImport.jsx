import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DataImport.css';
import { useProject } from '../../contexts/ProjectContext';
import { FaFolder, FaExclamationTriangle } from 'react-icons/fa';
import CatalogImport from './CatalogImport';

const DataImport = () => {
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const { currentProject, projects, switchProject } = useProject();

    const handleImportSuccess = () => {
        setMessage('Import successful! Redirecting to labeling...');
        setTimeout(() => navigate('/labeling'), 2000);
    };

    const handleImportError = (error) => {
        console.error('Import error:', error);
        setMessage(`Import failed: ${error.response?.data?.message || error.message}`);
    };

    return (
        <div className="data-import-container">
            <h2>Import Videos from Data Catalog</h2>
            <p>Browse and import videos from the centralized data catalog</p>

            {/* Project Context */}
            <div className="import-project-context">
                <div className="project-warning">
                    <FaFolder className="project-icon" />
                    <div className="project-info">
                        {currentProject ? (
                            <>
                                <span>Importing to project:</span>
                                <strong>{currentProject.name}</strong>
                                <span className={`project-status ${currentProject.status}`}>
                                    {currentProject.status}
                                </span>
                            </>
                        ) : (
                            <>
                                <FaExclamationTriangle className="warning-icon" />
                                <span className="no-project-warning">
                                    No project selected! Videos will not be assigned to any project.
                                </span>
                            </>
                        )}
                    </div>
                    {projects && projects.length > 0 && (
                        <div className="project-selector-compact">
                            <select
                                value={currentProject?.project_id || ''}
                                onChange={(e) => {
                                    const project = projects.find(p => p.project_id === parseInt(e.target.value));
                                    if (project) switchProject(project);
                                }}
                                className="project-select"
                            >
                                <option value="">No project</option>
                                {projects.map(project => (
                                    <option key={project.project_id} value={project.project_id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <CatalogImport
                projectId={currentProject?.project_id}
                setMessage={setMessage}
                onSuccess={handleImportSuccess}
                onError={handleImportError}
            />

            {message && (
                <div className={`message ${message.includes('failed') ? 'error' : message.includes('success') ? 'success' : ''}`}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default DataImport;
