import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DataImport.css';
import { useProject } from '../../contexts/ProjectContext';
import { FaFolder, FaExclamationTriangle } from 'react-icons/fa';

// Import source-specific components
import LocalFileImport from './LocalFileImport';
import GoogleDriveImport from './GoogleDriveImport';
import DropboxImport from './DropboxImport';
import UrlImport from './UrlImport';

const DataImport = () => {
    const [activeTab, setActiveTab] = useState('local');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const { currentProject, projects, switchProject } = useProject();

    // Debug logging
    console.log('DataImport: Current project:', currentProject);
    console.log('DataImport: Available projects:', projects);
    console.log('DataImport: Number of projects:', projects?.length || 0);

    // Common success handler for all import methods
    const handleImportSuccess = () => {
        setMessage('Upload successful! Redirecting to normalization...');
        setTimeout(() => navigate('/normalize'), 2000);
    };

    // Common error handler for all import methods
    const handleImportError = (error) => {
        console.error('Upload error:', error);
        setMessage(`Upload failed: ${error.response?.data?.message || error.message}`);
    };

    return (
        <div className="data-import-container">
            <h2>Fall Detection Video Upload</h2>
            <p>Select video files to upload for fall detection analysis</p>
            
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
            
            <div className="import-tabs">
                <div 
                    className={`tab ${activeTab === 'local' ? 'active' : ''}`}
                    onClick={() => setActiveTab('local')}
                >
                    Local Files
                </div>
                <div 
                    className={`tab ${activeTab === 'google-drive' ? 'active' : ''}`}
                    onClick={() => setActiveTab('google-drive')}
                >
                    Google Drive
                </div>
                <div 
                    className={`tab ${activeTab === 'dropbox' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dropbox')}
                >
                    Dropbox
                </div>
                <div 
                    className={`tab ${activeTab === 'url' ? 'active' : ''}`}
                    onClick={() => setActiveTab('url')}
                >
                    URL Import
                </div>
            </div>
            
            <div className="tab-content">
                {activeTab === 'local' && (
                    <LocalFileImport 
                        setLoading={setLoading}
                        setMessage={setMessage}
                        onSuccess={handleImportSuccess}
                        onError={handleImportError}
                        projectId={currentProject?.project_id}
                    />
                )}
                
                {activeTab === 'google-drive' && (
                    <GoogleDriveImport 
                        setLoading={setLoading}
                        setMessage={setMessage}
                        onSuccess={handleImportSuccess}
                        onError={handleImportError}
                    />
                )}
                
                {activeTab === 'dropbox' && (
                    <DropboxImport 
                        setLoading={setLoading}
                        setMessage={setMessage}
                        onSuccess={handleImportSuccess}
                        onError={handleImportError}
                    />
                )}
                
                {activeTab === 'url' && (
                    <UrlImport 
                        setLoading={setLoading}
                        setMessage={setMessage}
                        onSuccess={handleImportSuccess}
                        onError={handleImportError}
                    />
                )}
            </div>
            
            {message && (
                <div className={`message ${message.includes('failed') ? 'error' : message.includes('success') ? 'success' : ''}`}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default DataImport;
