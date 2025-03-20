import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GoogleDriveImport.css';

const GoogleDriveImport = ({ setLoading, setMessage, onSuccess, onError }) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [driveFiles, setDriveFiles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [scriptLoaded, setScriptLoaded] = useState(false);
    
    // Desktop applications use a different OAuth flow
    // Use your Google Cloud Console client ID here - it's safe to include
    // this in distributed code as authentication still requires user permission
    const CLIENT_ID = '123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com';
    
    useEffect(() => {
        // Load the Google API script
        const loadGoogleApi = () => {
            setMessage('Loading Google Drive integration...');
            
            // Check if script is already loaded
            if (document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
                setScriptLoaded(true);
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                setScriptLoaded(true);
                setMessage('Ready to connect to Google Drive');
            };
            script.onerror = () => {
                setMessage('Failed to load Google Drive integration');
                onError(new Error("Failed to load Google API"));
            };
            document.body.appendChild(script);
        };

        loadGoogleApi();
    }, [setMessage, onError]);

    const openPicker = () => {
        if (!scriptLoaded) {
            setMessage('Google Drive is still loading. Please try again in a moment.');
            return;
        }

        setLoading(true);
        setMessage('Opening Google Drive...');

        // Load the auth and picker libraries
        window.gapi.load('auth2:picker', () => {
            let authInstance;
            
            try {
                authInstance = window.gapi.auth2.getAuthInstance();
                if (!authInstance) {
                    // For desktop applications, use the proper client ID
                    // and set redirect_uri to 'postmessage' for the picker flow
                    window.gapi.auth2.init({
                        client_id: CLIENT_ID,
                        scope: 'https://www.googleapis.com/auth/drive.readonly',
                        // For desktop apps, we use a different auth approach
                        ux_mode: 'popup'
                    }).then(() => {
                        authInstance = window.gapi.auth2.getAuthInstance();
                        handleAuth(authInstance);
                    }).catch(error => {
                        console.error('Error initializing auth:', error);
                        setLoading(false);
                        setMessage('Failed to initialize Google authentication');
                        onError(error);
                    });
                } else {
                    // Already initialized, use it directly
                    handleAuth(authInstance);
                }
            } catch (error) {
                console.error('Error getting auth instance:', error);
                setLoading(false);
                setMessage('Failed to initialize Google authentication');
                onError(error);
            }
        });
    };

    // Separate function to handle authentication
    const handleAuth = (authInstance) => {
        authInstance.signIn({
            scope: 'https://www.googleapis.com/auth/drive.readonly'
        }).then(user => {
            const authToken = user.getAuthResponse().access_token;
            
            // Load the picker API
            createPicker(authToken);
        }).catch(error => {
            console.error('Authentication error:', error);
            setLoading(false);
            setMessage('Could not authenticate with Google Drive');
            onError(error);
        });
    };

    const createPicker = (authToken) => {
        window.gapi.load('picker', () => {
            // Create a simple callback implementation
            window.pickerCallback = data => pickerCallback(data);
            
            // Create picker view
            const view = new window.google.picker.View(window.google.picker.ViewId.VIDEOS);
            
            // Create the picker object
            const picker = new window.google.picker.PickerBuilder()
                .addView(view)
                .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
                .setOAuthToken(authToken)
                .setCallback(window.pickerCallback)
                .setTitle('Select videos from Google Drive')
                .build();
            
            picker.setVisible(true);
            setLoading(false);
        });
    };

    const pickerCallback = (data) => {
        if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
            const files = data[window.google.picker.Response.DOCUMENTS];
            setDriveFiles(files);
            setMessage(`Selected ${files.length} video files from Google Drive`);
        } else if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.CANCEL) {
            setMessage('Google Drive selection canceled');
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
        setMessage(`Importing ${selectedFiles.length} files from Google Drive...`);

        try {
            // Use appropriate localhost URL for desktop applications
            const response = await axios.post('http://localhost:5000/api/import/google-drive', {
                fileIds: selectedFiles.map(file => ({
                    id: file.id,
                    name: file.name
                }))
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

    const filteredFiles = driveFiles.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="google-drive-import">
            <div className="auth-section">
                <p>Select videos from your Google Drive account</p>
                <button 
                    onClick={openPicker}
                    className="google-auth-button"
                    disabled={!scriptLoaded}
                >
                    Open Google Drive
                </button>
            </div>

            {driveFiles.length > 0 && (
                <>
                    <div className="drive-controls">
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="drive-search"
                        />
                    </div>

                    <div className="drive-files-list">
                        {filteredFiles.length === 0 ? (
                            <div className="no-files">No video files found</div>
                        ) : (
                            filteredFiles.map(file => (
                                <div 
                                    key={file.id}
                                    className={`drive-file-item ${selectedFiles.some(f => f.id === file.id) ? 'selected' : ''}`}
                                    onClick={() => handleFileSelection(file)}
                                >
                                    {file.thumbnailLink ? (
                                        <img src={file.thumbnailLink} alt="" className="file-thumbnail" />
                                    ) : (
                                        <div className="file-icon">
                                            <span>Video</span>
                                        </div>
                                    )}
                                    <div className="file-details">
                                        <div className="file-name">{file.name}</div>
                                        <div className="file-size">
                                            {file.sizeBytes ? `${(parseInt(file.sizeBytes) / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                                        </div>
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

export default GoogleDriveImport;
