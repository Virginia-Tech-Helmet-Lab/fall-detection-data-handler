import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import './CatalogImport.css';
import { FaDatabase, FaVideo, FaChevronLeft, FaChevronRight, FaCheck, FaBan, FaSpinner } from 'react-icons/fa';

const CatalogImport = ({ projectId, onSuccess, onError, setMessage }) => {
    const [datasets, setDatasets] = useState([]);
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [datasetVideos, setDatasetVideos] = useState([]);
    const [videoPage, setVideoPage] = useState(1);
    const [videoTotal, setVideoTotal] = useState(0);
    const [videoTotalPages, setVideoTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        fetchDatasets();
    }, []);

    const fetchDatasets = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/api/catalog/datasets');
            setDatasets(response.data);
        } catch (err) {
            console.error('Error fetching catalog datasets:', err);
            if (onError) onError(err);
        } finally {
            setLoading(false);
        }
    };

    const selectDataset = async (dataset) => {
        setSelectedDataset(dataset);
        setVideoPage(1);
        await fetchDatasetVideos(dataset.id, 1);
    };

    const fetchDatasetVideos = async (datasetId, page) => {
        setLoading(true);
        try {
            const response = await apiClient.get(`/api/catalog/datasets/${datasetId}/videos?page=${page}&per_page=50`);
            setDatasetVideos(response.data.videos || []);
            setVideoTotal(response.data.total || 0);
            setVideoTotalPages(response.data.total_pages || 1);
        } catch (err) {
            console.error('Error fetching dataset videos:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        setVideoPage(newPage);
        if (selectedDataset) {
            fetchDatasetVideos(selectedDataset.id, newPage);
        }
    };

    const handleImportAll = async () => {
        if (!selectedDataset || !projectId) {
            setMessage && setMessage('Please select a project first');
            return;
        }
        setImporting(true);
        try {
            const response = await apiClient.post('/api/catalog/import', {
                dataset_id: selectedDataset.id,
                project_id: projectId,
                import_all: true,
            });
            const data = response.data;
            setMessage && setMessage(
                `Imported ${data.imported} videos from "${data.dataset_name}" (${data.skipped} already imported)`
            );
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error('Error importing from catalog:', err);
            if (onError) onError(err);
        } finally {
            setImporting(false);
        }
    };

    const formatSize = (gb) => {
        if (!gb) return '?';
        return gb >= 1 ? `${gb} GB` : `${Math.round(gb * 1024)} MB`;
    };

    // Dataset list view
    if (!selectedDataset) {
        return (
            <div className="catalog-import">
                <div className="catalog-header">
                    <FaDatabase className="catalog-icon" />
                    <div>
                        <h3>Data Catalog</h3>
                        <p>Browse and import datasets from the Helmet Lab ground truth catalog</p>
                    </div>
                </div>

                {loading && <div className="catalog-loading"><FaSpinner className="spin" /> Loading datasets...</div>}

                <div className="dataset-grid">
                    {datasets.map(ds => (
                        <div
                            key={ds.id}
                            className={`dataset-card ${ds.is_annotatable ? 'annotatable' : 'disabled'}`}
                            onClick={() => ds.is_annotatable && selectDataset(ds)}
                        >
                            <div className="dataset-card-header">
                                <h4>{ds.name}</h4>
                                {ds.is_annotatable ? (
                                    <span className="badge annotatable"><FaCheck /> Annotatable</span>
                                ) : (
                                    <span className="badge not-annotatable"><FaBan /> {ds.format}</span>
                                )}
                            </div>
                            <p className="dataset-description">{ds.description || 'No description'}</p>
                            <div className="dataset-meta">
                                <span className="meta-tag modality">{ds.modality}</span>
                                <span className="meta-tag domain">{ds.domain}</span>
                                <span className="meta-tag format">{ds.format}</span>
                                {ds.num_samples && <span className="meta-tag samples">{ds.num_samples} samples</span>}
                                {ds.total_size_gb && <span className="meta-tag size">{formatSize(ds.total_size_gb)}</span>}
                            </div>
                        </div>
                    ))}
                </div>

                {!loading && datasets.length === 0 && (
                    <div className="catalog-empty">
                        <p>No datasets found in catalog. Check that catalog.db exists at the configured path.</p>
                    </div>
                )}
            </div>
        );
    }

    // Dataset detail + video list view
    return (
        <div className="catalog-import">
            <div className="catalog-header">
                <button className="back-btn" onClick={() => { setSelectedDataset(null); setDatasetVideos([]); }}>
                    <FaChevronLeft /> Back to Catalog
                </button>
                <div>
                    <h3>{selectedDataset.name}</h3>
                    <p>{selectedDataset.description}</p>
                </div>
            </div>

            <div className="import-actions">
                <div className="import-summary">
                    <strong>{videoTotal}</strong> video files found
                    {selectedDataset.total_size_gb && (
                        <span> &middot; {formatSize(selectedDataset.total_size_gb)} total</span>
                    )}
                </div>
                <button
                    className="import-all-btn"
                    onClick={handleImportAll}
                    disabled={importing || !projectId || videoTotal === 0}
                >
                    {importing ? (
                        <><FaSpinner className="spin" /> Importing...</>
                    ) : (
                        <><FaDatabase /> Import All {videoTotal} Videos</>
                    )}
                </button>
                {!projectId && (
                    <span className="import-warning">Select a project first</span>
                )}
            </div>

            {loading && <div className="catalog-loading"><FaSpinner className="spin" /> Loading videos...</div>}

            <div className="video-file-list">
                {datasetVideos.map((vf, i) => (
                    <div key={i} className="video-file-item">
                        <FaVideo className="vf-icon" />
                        <span className="vf-name">{vf.relative_path || vf.filename}</span>
                        <span className="vf-size">
                            {vf.size_bytes ? `${(vf.size_bytes / (1024 * 1024)).toFixed(1)} MB` : ''}
                        </span>
                    </div>
                ))}
            </div>

            {videoTotalPages > 1 && (
                <div className="pagination-controls">
                    <button
                        onClick={() => handlePageChange(Math.max(1, videoPage - 1))}
                        disabled={videoPage <= 1}
                        className="page-btn"
                    >
                        <FaChevronLeft />
                    </button>
                    <span className="page-info">
                        Page {videoPage} of {videoTotalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(Math.min(videoTotalPages, videoPage + 1))}
                        disabled={videoPage >= videoTotalPages}
                        className="page-btn"
                    >
                        <FaChevronRight />
                    </button>
                </div>
            )}
        </div>
    );
};

export default CatalogImport;
