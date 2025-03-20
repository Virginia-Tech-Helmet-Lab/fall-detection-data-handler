import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DataImport.css';

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
