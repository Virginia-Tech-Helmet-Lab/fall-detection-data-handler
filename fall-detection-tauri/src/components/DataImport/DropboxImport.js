import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DropboxImport.css';

const DropboxImport = ({ setLoading, setMessage, onSuccess, onError }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dropboxFiles, setDropboxFiles] = useState([]);

    useEffect(() => {
        // Check if Dropbox SDK is already loaded
        if (window.Dropbox) {
            initDropboxClient();
        } else {
            // Load Dropbox SDK
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/dropbox@10.34.0/dist/Dropbox-sdk.min.js';
            script.async = true;
            script.onload = initDropboxClient;
            document.body.appendChild(script);
        }
    }, []);

    const initDropboxClient = () => {
        // Check if token exists in localStorage
        const accessToken = localStorage.getItem('dropbox_access_token');
        if (accessToken) {
            setIsAuthenticated(true);
            fetchFiles();
        }
    };

    const handleAuth = () => {
        // Dropbox app key should be stored in environment variable
        const clientId = process.env.REACT_APP_DROPBOX_APP_KEY;
        const redirectUri = window.location.origin + '/auth/dropbox/callback';
        
        // Store current location to redirect back after auth
        localStorage.setItem('dropbox_auth_redirect', window.location.href);
        
        // Redirect to Dropbox OAuth
        window.location.href = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}`;
    };

    const fetchFiles = async () => {
        try {
            setLoading(true);
            setMessage('Fetching files from Dropbox...');
            
            const accessToken = localStorage.getItem('dropbox_access_token');
            
            // In a real app, you'd use the Dropbox SDK to list files
            // This is a simplified implementation
            const response = await axios.post(
                'https://api.dropboxapi.com/2/files/search_v2',
                {
                    query: searchQuery || "",
                    file_extensions: ["mp4", "avi", "mov", "wmv", "mkv"],
                    file_categories: ["video"]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            const files = response.data.matches.map(match => match.metadata.metadata);
            setDropboxFiles(files);
            setMessage(`Found ${files.length} video files on Dropbox`);
        } catch (error) {
            // If token is expired, log out
            if (error.response?.status === 401) {
                localStorage.removeItem('dropbox_access_token');
                setIsAuthenticated(false);
                setMessage('Dropbox session expired. Please log in again.');
            } else {
                onError(error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelection = (file) => {
        setSelectedFiles(prev => {
            // If already selected, remove it
            if (prev.some(f => f.id === file.id)) {
                return prev.filter(f => f.id !== file.id);
            }
            // Otherwise add it
            return [...prev, file];
        });
    };

    const handleImport = async () => {
        if (selectedFiles.length === 0) {
            setMessage('Please select files first');
            return;
        }

        setLoading(true);
        setMessage(`Importing ${selectedFiles.length} files from Dropbox...`);

        try {
            // Send file paths to backend for import
            const response = await axios.post('http://localhost:5000/api/import/dropbox', {
                files: selectedFiles.map(file => ({
                    path: file.path_display,
                    name: file.name
                })),
                accessToken: localStorage.getItem('dropbox_access_token')
            });
            
            console.log('Import response:', response.data);
            setSelectedFiles([]);
            onSuccess();
        } catch (error) {
            onError(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchFiles();
    };

    return (
        <div className="dropbox-import">
            {!isAuthenticated ? (
                <div className="auth-section">
                    <p>Connect to your Dropbox to import videos</p>
                    <button 
                        onClick={handleAuth}
                        className="dropbox-auth-button"
                    >
                        Connect to Dropbox
                    </button>
                </div>
            ) : (
                <>
                    <form className="dropbox-controls" onSubmit={handleSearchSubmit}>
                        <input
                            type="text"
                            placeholder="Search videos..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="dropbox-search"
                        />
                        <button type="submit" className="search-button">
                            Search
                        </button>
                        <button type="button" onClick={fetchFiles} className="refresh-button">
                            Refresh
                        </button>
                    </form>

                    <div className="dropbox-files-list">
                        {dropboxFiles.length === 0 ? (
                            <div className="no-files">No video files found</div>
                        ) : (
                            dropboxFiles.map(file => (
                                <div 
                                    key={file.id}
                                    className={`dropbox-file-item ${selectedFiles.some(f => f.id === file.id) ? 'selected' : ''}`}
                                    onClick={() => handleFileSelection(file)}
                                >
                                    <div className="file-icon">
                                        <span>Video</span>
                                    </div>
                                    <div className="file-details">
                                        <div className="file-name">{file.name}</div>
                                        <div className="file-path">{file.path_display}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="import-actions">
                        <span className="selected-count">
                            {selectedFiles.length} files selected
                        </span>
                        <button 
                            onClick={handleImport}
                            disabled={selectedFiles.length === 0}
                            className="import-button"
                        >
                            Import Selected Files
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default DropboxImport;
