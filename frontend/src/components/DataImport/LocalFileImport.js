import React, { useState, useRef } from 'react';
import axios from 'axios';
import './LocalFileImport.css';

const LocalFileImport = ({ setLoading, setMessage, onSuccess, onError }) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const files = e.target.files || e.dataTransfer.files;
        setSelectedFiles(Array.from(files));
        setMessage(`${files.length} file(s) selected`);
    };

    const handleUpload = async () => {
        if (!selectedFiles || selectedFiles.length === 0) {
            setMessage('Please select files first');
            return;
        }

        setLoading(true);
        setMessage('Uploading...');
        
        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('files', file);
        });
        
        try {
            console.log('Sending upload request to backend...');
            const response = await axios.post('http://localhost:5000/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            console.log('Upload response:', response.data);
            
            // Clear selected files after successful upload
            setSelectedFiles([]);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            
            onSuccess();
        } catch(error) {
            onError(error);
        } finally {
            setLoading(false);
        }
    };

    // Handle drag events
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) {
            setIsDragging(true);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        // Filter for video files
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type.startsWith('video/') || 
            ['.mp4', '.avi', '.mov', '.wmv', '.mkv'].some(ext => 
                file.name.toLowerCase().endsWith(ext)
            )
        );
        
        if (files.length === 0) {
            setMessage('Please drop video files only');
            return;
        }
        
        setSelectedFiles(files);
        setMessage(`${files.length} video file(s) selected`);
    };

    return (
        <div className="local-file-import">
            <div 
                className={`drop-zone ${isDragging ? 'dragging' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <div className="drop-zone-content">
                    <i className="fa fa-cloud-upload"></i>
                    <p>Drag & Drop video files here or</p>
                    <input 
                        type="file" 
                        multiple 
                        accept="video/*" 
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        id="file-input"
                        className="file-input"
                    />
                    <label htmlFor="file-input" className="file-input-label">
                        Browse Files
                    </label>
                </div>
            </div>

            <div className="file-list">
                {selectedFiles.map((file, index) => (
                    <div key={index} className="file-item">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                ))}
            </div>

            <button 
                onClick={handleUpload} 
                disabled={selectedFiles.length === 0}
                className="upload-button"
            >
                Upload Files
            </button>
        </div>
    );
};

export default LocalFileImport;
