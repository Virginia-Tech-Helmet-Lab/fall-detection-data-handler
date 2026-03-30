import React, { useState, useEffect } from 'react';
import { FaDatabase, FaDownload, FaCheckCircle, FaExclamationTriangle, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import apiClient from '../../api/client';
import { useProject } from '../../contexts/ProjectContext';
import './DataExport.css';

const DataExport = () => {
    const { currentProject } = useProject();
    const [exportStats, setExportStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [publishResult, setPublishResult] = useState(null);
    const [annotations, setAnnotations] = useState([]);
    const [showDownload, setShowDownload] = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        if (currentProject?.catalog_dataset_id) {
            fetchAnnotations(currentProject.catalog_dataset_id);
        } else {
            setAnnotations([]);
        }
    }, [currentProject?.project_id]);

    const fetchStats = async () => {
        try {
            const response = await apiClient.get('/api/export/stats');
            setExportStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAnnotations = async (datasetId) => {
        try {
            const response = await apiClient.get(`/api/catalog/annotations/${datasetId}`);
            setAnnotations(response.data);
        } catch (error) {
            console.error('Error fetching annotations:', error);
        }
    };

    const handlePublish = async () => {
        if (!currentProject?.project_id) return;
        setPublishing(true);
        setPublishResult(null);
        try {
            const response = await apiClient.post(`/api/catalog/publish/${currentProject.project_id}`);
            setPublishResult(response.data);
            // Refresh annotations list
            if (currentProject.catalog_dataset_id) {
                fetchAnnotations(currentProject.catalog_dataset_id);
            }
        } catch (err) {
            setPublishResult({ error: err.response?.data?.detail || err.message });
        } finally {
            setPublishing(false);
        }
    };

    const handleDownloadJSON = async () => {
        setDownloading(true);
        try {
            const response = await apiClient.post('/api/export', {
                format: 'json',
                options: { onlyConfirmed: false },
            });
            const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `annotations_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading:', error);
        } finally {
            setDownloading(false);
        }
    };

    const handleDownloadCSV = async () => {
        setDownloading(true);
        try {
            const response = await apiClient.post('/api/export', {
                format: 'csv',
                options: { onlyConfirmed: false },
            }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `annotations_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading:', error);
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return <div className="export-page"><p>Loading...</p></div>;
    }

    const isLinked = !!currentProject?.catalog_dataset_id;

    return (
        <div className="export-page">
            <h2>Export Annotations</h2>

            {/* Summary Stats */}
            {exportStats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{exportStats.totalVideos}</div>
                        <div className="stat-label">Videos</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{exportStats.totalAnnotations}</div>
                        <div className="stat-label">Temporal Annotations</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{exportStats.boundingBoxes}</div>
                        <div className="stat-label">Bounding Boxes</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{exportStats.confirmedVideos}</div>
                        <div className="stat-label">Confirmed</div>
                    </div>
                </div>
            )}

            {/* Publish to Catalog — Primary Action */}
            <section className="publish-section">
                <h3><FaDatabase /> Publish to Data Catalog</h3>

                {!currentProject ? (
                    <div className="publish-warning">
                        <FaExclamationTriangle />
                        <span>No project selected. Select a project from the Home page to publish annotations.</span>
                    </div>
                ) : !isLinked ? (
                    <div className="publish-warning">
                        <FaExclamationTriangle />
                        <span>
                            Project "{currentProject.name}" is not linked to a catalog dataset.
                            Import videos from the Data Catalog first.
                        </span>
                    </div>
                ) : (
                    <>
                        <div className="publish-info">
                            <div className="publish-project">
                                <span className="label">Project:</span>
                                <strong>{currentProject.name}</strong>
                            </div>
                            <div className="publish-dataset">
                                <span className="label">Catalog Dataset:</span>
                                <strong>{currentProject.catalog_dataset_name}</strong>
                            </div>
                        </div>

                        <p className="publish-description">
                            Publish creates a new versioned annotation file in the catalog dataset's storage
                            and registers it as ground truth. Each publish creates a new version — previous versions are preserved.
                        </p>

                        <button
                            className="publish-btn"
                            onClick={handlePublish}
                            disabled={publishing}
                        >
                            <FaDatabase /> {publishing ? 'Publishing...' : 'Publish to Catalog'}
                        </button>

                        {publishResult && !publishResult.error && (
                            <div className="publish-success">
                                <FaCheckCircle />
                                <div>
                                    <strong>Published successfully!</strong>
                                    <p>Version: {publishResult.version} — {publishResult.annotation_count} annotations ({publishResult.temporal_count} temporal, {publishResult.bbox_count} bbox) across {publishResult.video_count} videos</p>
                                </div>
                            </div>
                        )}

                        {publishResult?.error && (
                            <div className="publish-error">
                                <p>{publishResult.error}</p>
                            </div>
                        )}

                        {/* Published Versions */}
                        {annotations.length > 0 && (
                            <div className="published-versions">
                                <h4>Published Versions</h4>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Type</th>
                                            <th>Annotations</th>
                                            <th>Created By</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {annotations.map((ann, i) => (
                                            <tr key={ann.id || i}>
                                                <td className="ann-name">{ann.name}</td>
                                                <td><span className="ann-type">{ann.annotation_type}</span></td>
                                                <td>{ann.num_annotations}</td>
                                                <td>{ann.created_by}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* Download Section — Secondary */}
            <section className="download-section">
                <button
                    className="download-toggle"
                    onClick={() => setShowDownload(!showDownload)}
                >
                    <FaDownload /> Download Locally
                    {showDownload ? <FaChevronUp /> : <FaChevronDown />}
                </button>

                {showDownload && (
                    <div className="download-options">
                        <p>Download annotations directly to your machine.</p>
                        <div className="download-buttons">
                            <button onClick={handleDownloadJSON} disabled={downloading}>
                                <FaDownload /> {downloading ? 'Downloading...' : 'JSON'}
                            </button>
                            <button onClick={handleDownloadCSV} disabled={downloading}>
                                <FaDownload /> {downloading ? 'Downloading...' : 'CSV'}
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
};

export default DataExport;
