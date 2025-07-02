import React, { useState } from 'react';
import axios from 'axios';
import './UrlImport.css';

const UrlImport = ({ setLoading, setMessage, onSuccess, onError }) => {
    const [urls, setUrls] = useState('');
    const [validatedUrls, setValidatedUrls] = useState([]);
    const [invalidUrls, setInvalidUrls] = useState([]);

    const validateUrls = () => {
        // Split by newlines and clean up
        const urlList = urls.split('\n')
            .map(url => url.trim())
            .filter(url => url !== '');
        
        // Basic URL validation
        const urlRegex = /^(https?:\/\/)([\w.-]+)\.([a-z.]{2,6})(\/[\w.-]*)*\/?$/i;
        
        const valid = [];
        const invalid = [];
        
        urlList.forEach(url => {
            if (urlRegex.test(url) || url.toLowerCase().match(/\.(mp4|avi|mov|wmv|mkv)$/)) {
                valid.push(url);
            } else {
                invalid.push(url);
            }
        });
        
        setValidatedUrls(valid);
        setInvalidUrls(invalid);
        
        if (valid.length > 0) {
            setMessage(`${valid.length} valid URL(s) ready to import`);
        } else if (urlList.length > 0) {
            setMessage('No valid URLs found. Please check the format.');
        }
        
        return valid.length > 0;
    };

    const handleImport = async () => {
        if (!validateUrls()) {
            return;
        }

        setLoading(true);
        setMessage(`Importing ${validatedUrls.length} videos from URLs...`);

        try {
            const response = await axios.post('http://localhost:5000/api/import/url', {
                urls: validatedUrls
            });
            
            console.log('URL import response:', response.data);
            setUrls('');
            setValidatedUrls([]);
            setInvalidUrls([]);
            onSuccess();
        } catch (error) {
            onError(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="url-import">
            <div className="url-instructions">
                <p>Enter the URLs of videos to import (one per line). Supported formats: MP4, AVI, MOV, WMV, MKV</p>
                <p className="example">Example: https://example.com/video.mp4</p>
            </div>
            
            <textarea
                className="url-input"
                placeholder="https://example.com/video1.mp4&#10;https://example.com/video2.mp4"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                rows={6}
            />
            
            {invalidUrls.length > 0 && (
                <div className="invalid-urls">
                    <p>Invalid URLs:</p>
                    <ul>
                        {invalidUrls.map((url, index) => (
                            <li key={index}>{url}</li>
                        ))}
                    </ul>
                </div>
            )}
            
            <div className="url-actions">
                <button 
                    onClick={validateUrls}
                    className="validate-button"
                >
                    Validate URLs
                </button>
                
                <button 
                    onClick={handleImport}
                    disabled={validatedUrls.length === 0}
                    className="import-button"
                >
                    Import Videos
                </button>
            </div>
        </div>
    );
};

export default UrlImport;
