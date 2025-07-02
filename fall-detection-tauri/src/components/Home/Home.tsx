import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Home: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="home-container">
            <div className="welcome-section">
                <h1>Welcome to Fall Detection Data Handler</h1>
                <p>Native Tauri Desktop Application</p>
                
                {user && (
                    <div className="user-info">
                        <h3>Logged in as: {user.full_name} ({user.role})</h3>
                    </div>
                )}
            </div>

            <div className="features-grid">
                <div className="feature-card">
                    <h3>📁 Data Import</h3>
                    <p>Import video files from your local system using native file dialogs</p>
                </div>

                <div className="feature-card">
                    <h3>🎯 Video Annotation</h3>
                    <p>Annotate fall detection events with temporal and bounding box annotations</p>
                </div>

                <div className="feature-card">
                    <h3>📊 Analytics</h3>
                    <p>View project statistics and user performance metrics</p>
                </div>

                <div className="feature-card">
                    <h3>📤 Data Export</h3>
                    <p>Export annotated data in various formats for machine learning</p>
                </div>

                <div className="feature-card">
                    <h3>👥 Project Management</h3>
                    <p>Organize your annotation work into projects with team collaboration</p>
                </div>

                <div className="feature-card">
                    <h3>✅ Quality Review</h3>
                    <p>Review and validate annotations for quality assurance</p>
                </div>
            </div>

            <div className="conversion-info">
                <h2>🚀 Tauri Native Benefits</h2>
                <ul>
                    <li><strong>Native Performance:</strong> Rust backend with direct system access</li>
                    <li><strong>Native File Access:</strong> Direct filesystem operations without uploads</li>
                    <li><strong>Offline Operation:</strong> No internet connection required</li>
                    <li><strong>Cross-Platform:</strong> Works on Windows, macOS, and Linux</li>
                    <li><strong>Secure:</strong> Local data processing and storage</li>
                </ul>
            </div>
        </div>
    );
};

export default Home;