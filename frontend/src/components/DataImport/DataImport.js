import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './DataImport.css';

const DataImport = () => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleFileChange = (e) => {
        setSelectedFiles(e.target.files);
        setMessage(`${e.target.files.length} file(s) selected`);
    };

    const handleUpload = async () => {
        if (!selectedFiles || selectedFiles.length === 0) {
            setMessage('Please select files first');
            return;
        }

        setLoading(true);
        setMessage('Uploading...');
        
        const formData = new FormData();
        Array.from(selectedFiles).forEach(file => {
            formData.append('files', file);
        });
        
        try {
            console.log('Sending upload request to backend...');
            const response = await axios.post('http://localhost:5000/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            console.log('Upload response:', response.data);
            setMessage('Upload successful! Redirecting to normalization...');
            
            // Navigate to the normalization page after successful upload
            setTimeout(() => navigate('/normalize'), 2000);
        } catch(error) {
            console.error('Upload error:', error);
            setMessage(`Upload failed: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="data-import-container">
            <h2>Fall Detection Video Upload</h2>
            <p>Select video files to upload for fall detection analysis</p>
            
            <div className="upload-section">
                <input 
                    type="file" 
                    multiple 
                    accept="video/*" 
                    onChange={handleFileChange} 
                    disabled={loading}
                />
                <button 
                    onClick={handleUpload} 
                    disabled={loading || !selectedFiles.length}
                    className="upload-button"
                >
                    {loading ? 'Uploading...' : 'Upload'}
                </button>
            </div>
            
            {message && (
                <div className={`message ${message.includes('failed') ? 'error' : message.includes('success') ? 'success' : ''}`}>
                    {message}
                </div>
            )}
            
            <div className="file-list">
                {selectedFiles && Array.from(selectedFiles).map((file, index) => (
                    <div key={index} className="file-item">
                        <span>{file.name}</span>
                        <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DataImport;
