import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaFileDownload, FaFileCsv, FaFileCode, FaFileExcel, FaCheckCircle, FaCog } from 'react-icons/fa';
import './ExportReports.css';

const ExportReports = ({ projectId }) => {
    const [projectData, setProjectData] = useState(null);
    const [exportOptions, setExportOptions] = useState({
        includeReviews: true,
        format: 'json',
        includeMetadata: true,
        separateFiles: false
    });
    const [exporting, setExporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (projectId) {
            fetchProjectInfo();
        }
    }, [projectId]);

    const fetchProjectInfo = async () => {
        try {
            const response = await axios.get(
                `http://localhost:5000/api/projects/${projectId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }
            );
            setProjectData(response.data.project);
        } catch (err) {
            console.error('Error fetching project info:', err);
        }
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            setError(null);
            setExportSuccess(false);

            const params = new URLSearchParams({
                include_reviews: exportOptions.includeReviews
            });

            const response = await axios.get(
                `http://localhost:5000/api/analytics/export/${projectId}?${params}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }
            );

            const exportData = response.data;

            // Process export based on format
            switch (exportOptions.format) {
                case 'json':
                    downloadJSON(exportData);
                    break;
                case 'csv':
                    downloadCSV(exportData);
                    break;
                case 'yolo':
                    downloadYOLO(exportData);
                    break;
                case 'coco':
                    downloadCOCO(exportData);
                    break;
                default:
                    downloadJSON(exportData);
            }

            setExportSuccess(true);
            setTimeout(() => setExportSuccess(false), 5000);

        } catch (err) {
            console.error('Error exporting data:', err);
            setError('Failed to export data. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const downloadJSON = (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectData?.name || 'project'}_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadCSV = (data) => {
        // Convert to CSV format
        let csv = 'Video ID,Filename,Duration,Resolution,Assigned To,Completed,Annotation Type,Label,Start Time,End Time,Frame,X,Y,Width,Height,Created By,Quality Score\n';
        
        data.videos.forEach(video => {
            // Add temporal annotations
            video.temporal_annotations.forEach(ann => {
                csv += `${video.video_id},"${video.filename}",${video.duration},"${video.resolution}","${video.assigned_to?.username || ''}",${video.completed},temporal,"${ann.label}",${ann.start_time},${ann.end_time},,,,,,"${ann.created_by}",${video.review?.quality_score || ''}\n`;
            });
            
            // Add bbox annotations
            video.bbox_annotations.forEach(bbox => {
                csv += `${video.video_id},"${video.filename}",${video.duration},"${video.resolution}","${video.assigned_to?.username || ''}",${video.completed},bbox,"${bbox.label}",,,${bbox.frame_number},${bbox.x},${bbox.y},${bbox.width},${bbox.height},"${bbox.created_by}",${video.review?.quality_score || ''}\n`;
            });
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectData?.name || 'project'}_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadYOLO = (data) => {
        // Convert to YOLO format (simplified)
        let yoloData = '';
        const classNames = new Set();
        
        data.videos.forEach(video => {
            video.bbox_annotations.forEach(bbox => {
                classNames.add(bbox.label);
            });
        });
        
        const classMap = {};
        Array.from(classNames).forEach((name, idx) => {
            classMap[name] = idx;
        });
        
        // Create classes file content
        const classesContent = Array.from(classNames).join('\n');
        
        // Create annotations in YOLO format
        data.videos.forEach(video => {
            let videoAnnotations = '';
            video.bbox_annotations.forEach(bbox => {
                // Convert to YOLO format (normalized coordinates)
                // This is simplified - real implementation would need video dimensions
                const classId = classMap[bbox.label];
                const centerX = (bbox.x + bbox.width / 2) / 1920; // Assuming 1920 width
                const centerY = (bbox.y + bbox.height / 2) / 1080; // Assuming 1080 height
                const width = bbox.width / 1920;
                const height = bbox.height / 1080;
                
                videoAnnotations += `${classId} ${centerX.toFixed(6)} ${centerY.toFixed(6)} ${width.toFixed(6)} ${height.toFixed(6)}\n`;
            });
            
            if (videoAnnotations) {
                yoloData += `# ${video.filename}\n${videoAnnotations}\n`;
            }
        });

        // For simplicity, combine into one file
        const fullContent = `# Classes\n${classesContent}\n\n# Annotations\n${yoloData}`;
        
        const blob = new Blob([fullContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectData?.name || 'project'}_yolo_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadCOCO = (data) => {
        // Convert to COCO format
        const cocoData = {
            info: {
                description: projectData?.name || 'Fall Detection Dataset',
                version: '1.0',
                year: new Date().getFullYear(),
                date_created: new Date().toISOString()
            },
            licenses: [],
            images: [],
            annotations: [],
            categories: []
        };

        // Build categories
        const categoryMap = {};
        const categories = new Set();
        
        data.videos.forEach(video => {
            video.temporal_annotations.forEach(ann => categories.add(ann.label));
            video.bbox_annotations.forEach(bbox => categories.add(bbox.label));
        });
        
        Array.from(categories).forEach((cat, idx) => {
            categoryMap[cat] = idx + 1;
            cocoData.categories.push({
                id: idx + 1,
                name: cat,
                supercategory: 'event'
            });
        });

        // Build images and annotations
        let annotationId = 1;
        
        data.videos.forEach((video, videoIdx) => {
            const imageId = videoIdx + 1;
            
            cocoData.images.push({
                id: imageId,
                file_name: video.filename,
                width: 1920, // Would need actual dimensions
                height: 1080,
                duration: video.duration
            });

            // Add bbox annotations
            video.bbox_annotations.forEach(bbox => {
                cocoData.annotations.push({
                    id: annotationId++,
                    image_id: imageId,
                    category_id: categoryMap[bbox.label],
                    bbox: [bbox.x, bbox.y, bbox.width, bbox.height],
                    area: bbox.width * bbox.height,
                    iscrowd: 0,
                    frame_number: bbox.frame_number
                });
            });
        });

        const blob = new Blob([JSON.stringify(cocoData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectData?.name || 'project'}_coco_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!projectId) {
        return <div className="no-project-selected">Please select a project to export data</div>;
    }

    return (
        <div className="export-reports">
            <div className="export-header">
                <h2>Export Project Data</h2>
                {projectData && (
                    <div className="project-info">
                        <span className="project-name">{projectData.name}</span>
                    </div>
                )}
            </div>

            <div className="export-options">
                <h3>Export Options</h3>
                
                <div className="option-group">
                    <label>Export Format:</label>
                    <div className="format-buttons">
                        <button 
                            className={`format-btn ${exportOptions.format === 'json' ? 'active' : ''}`}
                            onClick={() => setExportOptions({...exportOptions, format: 'json'})}
                        >
                            <FaFileCode />
                            <span>JSON</span>
                        </button>
                        <button 
                            className={`format-btn ${exportOptions.format === 'csv' ? 'active' : ''}`}
                            onClick={() => setExportOptions({...exportOptions, format: 'csv'})}
                        >
                            <FaFileCsv />
                            <span>CSV</span>
                        </button>
                        <button 
                            className={`format-btn ${exportOptions.format === 'yolo' ? 'active' : ''}`}
                            onClick={() => setExportOptions({...exportOptions, format: 'yolo'})}
                        >
                            <FaFileExcel />
                            <span>YOLO</span>
                        </button>
                        <button 
                            className={`format-btn ${exportOptions.format === 'coco' ? 'active' : ''}`}
                            onClick={() => setExportOptions({...exportOptions, format: 'coco'})}
                        >
                            <FaFileCode />
                            <span>COCO</span>
                        </button>
                    </div>
                </div>

                <div className="option-group">
                    <label className="checkbox-label">
                        <input 
                            type="checkbox" 
                            checked={exportOptions.includeReviews}
                            onChange={(e) => setExportOptions({...exportOptions, includeReviews: e.target.checked})}
                        />
                        <span>Include Review Data</span>
                    </label>
                    <p className="option-description">
                        Include quality scores and review comments in the export
                    </p>
                </div>

                <div className="option-group">
                    <label className="checkbox-label">
                        <input 
                            type="checkbox" 
                            checked={exportOptions.includeMetadata}
                            onChange={(e) => setExportOptions({...exportOptions, includeMetadata: e.target.checked})}
                        />
                        <span>Include Metadata</span>
                    </label>
                    <p className="option-description">
                        Include video metadata, user information, and timestamps
                    </p>
                </div>
            </div>

            <div className="export-summary">
                <h3>Export Summary</h3>
                <div className="summary-content">
                    <p>This export will include:</p>
                    <ul>
                        <li>All videos and annotations from the project</li>
                        <li>User attribution for each annotation</li>
                        {exportOptions.includeReviews && <li>Review scores and feedback</li>}
                        {exportOptions.includeMetadata && <li>Complete metadata and timestamps</li>}
                        <li>Format: {exportOptions.format.toUpperCase()}</li>
                    </ul>
                </div>
            </div>

            <div className="export-actions">
                <button 
                    className="export-button"
                    onClick={handleExport}
                    disabled={exporting}
                >
                    {exporting ? (
                        <>
                            <FaCog className="spinning" />
                            <span>Exporting...</span>
                        </>
                    ) : (
                        <>
                            <FaFileDownload />
                            <span>Export Data</span>
                        </>
                    )}
                </button>

                {exportSuccess && (
                    <div className="success-message">
                        <FaCheckCircle />
                        <span>Export completed successfully!</span>
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}
            </div>

            <div className="export-notes">
                <h3>Export Notes</h3>
                <ul>
                    <li><strong>JSON:</strong> Complete data structure with all relationships preserved</li>
                    <li><strong>CSV:</strong> Flattened format suitable for spreadsheet analysis</li>
                    <li><strong>YOLO:</strong> Bounding box annotations in YOLO format for training</li>
                    <li><strong>COCO:</strong> COCO format for object detection frameworks</li>
                </ul>
            </div>
        </div>
    );
};

export default ExportReports;