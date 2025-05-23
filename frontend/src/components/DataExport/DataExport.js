import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaDownload, FaFileCode, FaFileCsv, FaFileArchive, FaCheckCircle, 
         FaFilter, FaEye, FaHistory, FaChartBar, FaCog, FaCalendarAlt,
         FaListUl, FaTags, FaCompress, FaClock, FaPython, FaRobot,
         FaCode, FaDatabase, FaPlug } from 'react-icons/fa';
import './DataExport.css';

const DataExport = () => {
    const [exportStats, setExportStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState('json');
    const [activeTab, setActiveTab] = useState('quick'); // 'quick', 'advanced', 'history', 'ml'
    const [selectedVideos, setSelectedVideos] = useState([]);
    const [videoList, setVideoList] = useState([]);
    const [showPreview, setShowPreview] = useState(false);
    const [exportHistory, setExportHistory] = useState([]);
    const [showApiKey, setShowApiKey] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    
    const [exportOptions, setExportOptions] = useState({
        includeVideoFiles: false,
        includeFrames: false,
        splitByVideo: false,
        onlyConfirmed: true,
        // Advanced options
        includeMetadata: true,
        includeNormalizationSettings: false,
        timestampFormat: 'seconds', // 'seconds', 'frames', 'both'
        coordinateFormat: 'absolute', // 'absolute', 'normalized'
        exportStructure: 'nested', // 'nested', 'flat'
        compressionLevel: 'none', // 'none', 'zip', 'tar'
        // Filtering options
        dateRange: { start: null, end: null },
        minAnnotations: 0,
        specificLabels: [],
        videoSelection: 'all' // 'all', 'selected', 'range'
    });

    const [mlOptions, setMlOptions] = useState({
        framework: 'pytorch', // 'pytorch', 'tensorflow', 'custom'
        datasetName: 'FallDetectionDataset',
        splitRatio: { train: 0.7, val: 0.15, test: 0.15 },
        splitStrategy: 'random', // 'random', 'stratified', 'temporal'
        augmentation: {
            enabled: false,
            flipHorizontal: false,
            rotation: false,
            brightness: false,
            noise: false
        },
        preprocessing: {
            resizeFrames: true,
            targetSize: [224, 224],
            normalizePixels: true,
            extractKeyframes: false,
            framesPerClip: 16
        },
        outputFormat: 'folder', // 'folder', 'hdf5', 'tfrecord'
        includeDataloader: true,
        batchSize: 32,
        numWorkers: 4,
        apiAccess: {
            enabled: false,
            endpoint: 'http://localhost:5000/api/ml/dataset',
            apiKey: '',
            webhookUrl: ''
        }
    });

    useEffect(() => {
        fetchExportStats();
        fetchVideoList();
        loadExportHistory();
    }, []);

    const fetchExportStats = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5000/api/export/stats');
            setExportStats(response.data);
        } catch (error) {
            console.error('Error fetching export stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVideoList = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/videos');
            setVideoList(response.data);
        } catch (error) {
            console.error('Error fetching video list:', error);
        }
    };

    const loadExportHistory = () => {
        // Load from localStorage for now
        const history = localStorage.getItem('exportHistory');
        if (history) {
            setExportHistory(JSON.parse(history));
        }
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            
            // Determine endpoint based on active tab
            const endpoint = activeTab === 'ml' 
                ? 'http://localhost:5000/api/export/ml-dataset'
                : 'http://localhost:5000/api/export';
            
            // Prepare export request
            const exportRequest = activeTab === 'ml' 
                ? { mlOptions }
                : {
                    format: selectedFormat,
                    options: {
                        ...exportOptions,
                        selectedVideoIds: exportOptions.videoSelection === 'selected' ? selectedVideos : []
                    }
                };
            
            const response = await axios.post(endpoint, exportRequest, {
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Set filename based on format and type
            const timestamp = new Date().toISOString().split('T')[0];
            let filename;
            if (activeTab === 'ml') {
                filename = `ml-dataset-${timestamp}.zip`;
            } else {
                const extension = selectedFormat === 'coco' ? 'json' : selectedFormat;
                filename = `fall-detection-annotations-${timestamp}.${extension}`;
            }
            link.setAttribute('download', filename);
            
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            // Save to export history
            const historyEntry = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                format: selectedFormat,
                options: exportOptions,
                stats: {
                    videos: exportStats.confirmedVideos,
                    annotations: exportStats.totalAnnotations
                }
            };
            
            const updatedHistory = [historyEntry, ...exportHistory].slice(0, 10); // Keep last 10
            setExportHistory(updatedHistory);
            localStorage.setItem('exportHistory', JSON.stringify(updatedHistory));
            
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Failed to export data. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const generatePreview = () => {
        // Generate a preview of what will be exported
        const preview = {
            format: selectedFormat,
            videos: exportOptions.videoSelection === 'all' 
                ? exportStats?.confirmedVideos 
                : selectedVideos.length,
            structure: exportOptions.exportStructure,
            includes: []
        };
        
        if (exportOptions.includeMetadata) preview.includes.push('Video metadata');
        if (exportOptions.includeNormalizationSettings) preview.includes.push('Normalization settings');
        if (exportOptions.includeFrames) preview.includes.push('Frame images');
        if (exportOptions.includeVideoFiles) preview.includes.push('Video files');
        
        return preview;
    };

    const formatDescriptions = {
        json: 'Standard JSON format with all annotation data',
        csv: 'Comma-separated values for spreadsheet analysis',
        coco: 'COCO format for computer vision models',
        yolo: 'YOLO format for object detection training'
    };

    const renderQuickExport = () => (
        <>
            <div className="export-options">
                <h3>Export Format</h3>
                <div className="format-options">
                    {Object.keys(formatDescriptions).map(format => (
                        <div 
                            key={format}
                            className={`format-option ${selectedFormat === format ? 'selected' : ''}`}
                            onClick={() => setSelectedFormat(format)}
                        >
                            <FaFileCode className="format-icon" />
                            <h4>{format.toUpperCase()}</h4>
                            <p>{formatDescriptions[format]}</p>
                        </div>
                    ))}
                </div>

                <h3>Quick Options</h3>
                <div className="export-settings">
                    <label className="export-checkbox">
                        <input 
                            type="checkbox" 
                            checked={exportOptions.onlyConfirmed}
                            onChange={(e) => setExportOptions({
                                ...exportOptions,
                                onlyConfirmed: e.target.checked
                            })}
                        />
                        <span>Only export confirmed videos</span>
                    </label>
                    <label className="export-checkbox">
                        <input 
                            type="checkbox" 
                            checked={exportOptions.splitByVideo}
                            onChange={(e) => setExportOptions({
                                ...exportOptions,
                                splitByVideo: e.target.checked
                            })}
                        />
                        <span>Split annotations by video</span>
                    </label>
                </div>
            </div>

            <div className="export-preview">
                <h3>Export Preview</h3>
                <div className="preview-content">
                    <p>Your export will include:</p>
                    <ul>
                        <li>{exportStats.confirmedVideos} confirmed videos</li>
                        <li>{exportStats.totalAnnotations} annotations total</li>
                        <li>{exportStats.fallEvents} fall events</li>
                        <li>{exportStats.boundingBoxes} bounding boxes</li>
                    </ul>
                </div>
            </div>
        </>
    );

    const renderAdvancedOptions = () => (
        <div className="advanced-export">
            <div className="advanced-section">
                <h3><FaFilter /> Data Selection</h3>
                <div className="option-group">
                    <label>Video Selection</label>
                    <select 
                        value={exportOptions.videoSelection}
                        onChange={(e) => setExportOptions({
                            ...exportOptions,
                            videoSelection: e.target.value
                        })}
                    >
                        <option value="all">All Videos</option>
                        <option value="selected">Selected Videos</option>
                        <option value="range">Date Range</option>
                    </select>
                </div>

                {exportOptions.videoSelection === 'selected' && (
                    <div className="video-selector">
                        <h4>Select Videos to Export</h4>
                        <div className="video-list-export">
                            {videoList.map(video => (
                                <label key={video.video_id} className="video-select-item">
                                    <input 
                                        type="checkbox"
                                        checked={selectedVideos.includes(video.video_id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedVideos([...selectedVideos, video.video_id]);
                                            } else {
                                                setSelectedVideos(selectedVideos.filter(id => id !== video.video_id));
                                            }
                                        }}
                                    />
                                    <span>{video.filename}</span>
                                    <span className="video-stats-small">
                                        {video.annotations?.length || 0} annotations
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="advanced-section">
                <h3><FaCog /> Export Settings</h3>
                <div className="settings-grid">
                    <div className="option-group">
                        <label><FaClock /> Timestamp Format</label>
                        <select 
                            value={exportOptions.timestampFormat}
                            onChange={(e) => setExportOptions({
                                ...exportOptions,
                                timestampFormat: e.target.value
                            })}
                        >
                            <option value="seconds">Seconds</option>
                            <option value="frames">Frame Numbers</option>
                            <option value="both">Both</option>
                        </select>
                    </div>

                    <div className="option-group">
                        <label>Coordinate Format</label>
                        <select 
                            value={exportOptions.coordinateFormat}
                            onChange={(e) => setExportOptions({
                                ...exportOptions,
                                coordinateFormat: e.target.value
                            })}
                        >
                            <option value="absolute">Absolute Pixels</option>
                            <option value="normalized">Normalized (0-1)</option>
                        </select>
                    </div>

                    <div className="option-group">
                        <label>Data Structure</label>
                        <select 
                            value={exportOptions.exportStructure}
                            onChange={(e) => setExportOptions({
                                ...exportOptions,
                                exportStructure: e.target.value
                            })}
                        >
                            <option value="nested">Nested (by video)</option>
                            <option value="flat">Flat (all annotations)</option>
                        </select>
                    </div>

                    <div className="option-group">
                        <label><FaCompress /> Compression</label>
                        <select 
                            value={exportOptions.compressionLevel}
                            onChange={(e) => setExportOptions({
                                ...exportOptions,
                                compressionLevel: e.target.value
                            })}
                        >
                            <option value="none">No Compression</option>
                            <option value="zip">ZIP Archive</option>
                            <option value="tar">TAR.GZ Archive</option>
                        </select>
                    </div>
                </div>

                <div className="include-options">
                    <h4>Include in Export</h4>
                    <label className="export-checkbox">
                        <input 
                            type="checkbox" 
                            checked={exportOptions.includeMetadata}
                            onChange={(e) => setExportOptions({
                                ...exportOptions,
                                includeMetadata: e.target.checked
                            })}
                        />
                        <span>Video Metadata (resolution, framerate, duration)</span>
                    </label>
                    <label className="export-checkbox">
                        <input 
                            type="checkbox" 
                            checked={exportOptions.includeNormalizationSettings}
                            onChange={(e) => setExportOptions({
                                ...exportOptions,
                                includeNormalizationSettings: e.target.checked
                            })}
                        />
                        <span>Normalization Settings</span>
                    </label>
                    <label className="export-checkbox">
                        <input 
                            type="checkbox" 
                            checked={exportOptions.includeFrames}
                            onChange={(e) => setExportOptions({
                                ...exportOptions,
                                includeFrames: e.target.checked
                            })}
                        />
                        <span>Extract Annotated Frames as Images</span>
                    </label>
                    <label className="export-checkbox">
                        <input 
                            type="checkbox" 
                            checked={exportOptions.includeVideoFiles}
                            onChange={(e) => setExportOptions({
                                ...exportOptions,
                                includeVideoFiles: e.target.checked
                            })}
                        />
                        <span>Include Original Video Files</span>
                    </label>
                </div>
            </div>

            <div className="advanced-section">
                <h3><FaTags /> Label Filtering</h3>
                <div className="label-filter">
                    <p>Export only specific annotation types:</p>
                    <label className="export-checkbox">
                        <input 
                            type="checkbox" 
                            checked={exportOptions.specificLabels.includes('Fall')}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setExportOptions({
                                        ...exportOptions,
                                        specificLabels: [...exportOptions.specificLabels, 'Fall']
                                    });
                                } else {
                                    setExportOptions({
                                        ...exportOptions,
                                        specificLabels: exportOptions.specificLabels.filter(l => l !== 'Fall')
                                    });
                                }
                            }}
                        />
                        <span>Fall Events</span>
                    </label>
                    <label className="export-checkbox">
                        <input 
                            type="checkbox" 
                            checked={exportOptions.specificLabels.includes('BoundingBox')}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setExportOptions({
                                        ...exportOptions,
                                        specificLabels: [...exportOptions.specificLabels, 'BoundingBox']
                                    });
                                } else {
                                    setExportOptions({
                                        ...exportOptions,
                                        specificLabels: exportOptions.specificLabels.filter(l => l !== 'BoundingBox')
                                    });
                                }
                            }}
                        />
                        <span>Bounding Boxes</span>
                    </label>
                </div>
            </div>
        </div>
    );

    const renderExportHistory = () => (
        <div className="export-history">
            <h3>Recent Exports</h3>
            {exportHistory.length === 0 ? (
                <p className="no-history">No export history available</p>
            ) : (
                <div className="history-list">
                    {exportHistory.map(entry => (
                        <div key={entry.id} className="history-item">
                            <div className="history-header">
                                <span className="history-date">
                                    {new Date(entry.timestamp).toLocaleDateString()} at {new Date(entry.timestamp).toLocaleTimeString()}
                                </span>
                                <span className="history-format">{entry.format.toUpperCase()}</span>
                            </div>
                            <div className="history-details">
                                <span>{entry.stats.videos} videos</span>
                                <span>{entry.stats.annotations} annotations</span>
                                {entry.options.compressionLevel !== 'none' && (
                                    <span>{entry.options.compressionLevel.toUpperCase()} compressed</span>
                                )}
                            </div>
                            <button 
                                className="repeat-export"
                                onClick={() => {
                                    setSelectedFormat(entry.format);
                                    setExportOptions(entry.options);
                                    setActiveTab('quick');
                                }}
                            >
                                Repeat Export
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const generatePyTorchCode = () => {
        const code = `
import torch
from torch.utils.data import Dataset, DataLoader
import cv2
import json
import numpy as np
from pathlib import Path

class ${mlOptions.datasetName}(Dataset):
    def __init__(self, data_path, split='train', transform=None):
        """
        Fall Detection Dataset for PyTorch
        Args:
            data_path: Path to the exported data
            split: 'train', 'val', or 'test'
            transform: Optional transform to be applied on a sample
        """
        self.data_path = Path(data_path)
        self.split = split
        self.transform = transform
        
        # Load annotations
        with open(self.data_path / f'{split}_annotations.json', 'r') as f:
            self.annotations = json.load(f)
        
        self.samples = []
        for video in self.annotations:
            for annotation in video['temporal_annotations']:
                self.samples.append({
                    'video_path': self.data_path / 'videos' / video['filename'],
                    'start_frame': annotation['start_frame'],
                    'end_frame': annotation['end_frame'],
                    'label': annotation['label'],
                    'bboxes': [bbox for bbox in video['bounding_box_annotations']
                              if annotation['start_frame'] <= bbox['frame_index'] <= annotation['end_frame']]
                })
    
    def __len__(self):
        return len(self.samples)
    
    def __getitem__(self, idx):
        sample = self.samples[idx]
        
        # Load video frames
        cap = cv2.VideoCapture(str(sample['video_path']))
        frames = []
        
        cap.set(cv2.CAP_PROP_POS_FRAMES, sample['start_frame'])
        for i in range(sample['start_frame'], sample['end_frame']):
            ret, frame = cap.read()
            if ret:
                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                ${mlOptions.preprocessing.resizeFrames ? `frame = cv2.resize(frame, (${mlOptions.preprocessing.targetSize[0]}, ${mlOptions.preprocessing.targetSize[1]}))` : ''}
                ${mlOptions.preprocessing.normalizePixels ? 'frame = frame.astype(np.float32) / 255.0' : ''}
                frames.append(frame)
        
        cap.release()
        
        # Convert to tensor
        frames = torch.from_numpy(np.stack(frames))
        frames = frames.permute(0, 3, 1, 2)  # NHWC -> NCHW
        
        # Get bounding boxes for this clip
        bboxes = torch.tensor([[bbox['x'], bbox['y'], bbox['width'], bbox['height']] 
                              for bbox in sample['bboxes']], dtype=torch.float32)
        
        if self.transform:
            frames = self.transform(frames)
        
        return {
            'frames': frames,
            'label': 1 if sample['label'] == 'Fall' else 0,
            'bboxes': bboxes,
            'metadata': {
                'video_path': str(sample['video_path']),
                'start_frame': sample['start_frame'],
                'end_frame': sample['end_frame']
            }
        }

# Create dataloaders
def create_dataloaders(data_path, batch_size=${mlOptions.batchSize}, num_workers=${mlOptions.numWorkers}):
    train_dataset = ${mlOptions.datasetName}(data_path, split='train')
    val_dataset = ${mlOptions.datasetName}(data_path, split='val')
    test_dataset = ${mlOptions.datasetName}(data_path, split='test')
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    
    return train_loader, val_loader, test_loader

# Example usage
if __name__ == "__main__":
    data_path = "./fall_detection_dataset"
    train_loader, val_loader, test_loader = create_dataloaders(data_path)
    
    # Print dataset statistics
    print(f"Training samples: {len(train_loader.dataset)}")
    print(f"Validation samples: {len(val_loader.dataset)}")
    print(f"Test samples: {len(test_loader.dataset)}")
    
    # Test loading a batch
    for batch in train_loader:
        print(f"Batch frames shape: {batch['frames'].shape}")
        print(f"Batch labels: {batch['label']}")
        break
`;
        return code;
    };

    const generateAPICode = () => {
        return `
import requests
import json

class FallDetectionAPIClient:
    def __init__(self, endpoint="${mlOptions.apiAccess.endpoint}", api_key="${mlOptions.apiAccess.apiKey}"):
        self.endpoint = endpoint
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def get_dataset_info(self):
        """Get information about the dataset"""
        response = requests.get(f"{self.endpoint}/info", headers=self.headers)
        return response.json()
    
    def get_batch(self, split='train', batch_size=32):
        """Get a batch of data"""
        params = {
            "split": split,
            "batch_size": batch_size
        }
        response = requests.get(f"{self.endpoint}/batch", headers=self.headers, params=params)
        return response.json()
    
    def stream_data(self, split='train', batch_size=32):
        """Stream data in batches"""
        params = {
            "split": split,
            "batch_size": batch_size,
            "stream": True
        }
        response = requests.get(f"{self.endpoint}/stream", headers=self.headers, params=params, stream=True)
        
        for line in response.iter_lines():
            if line:
                yield json.loads(line)

# Example usage
client = FallDetectionAPIClient()
info = client.get_dataset_info()
print(f"Dataset contains {info['total_videos']} videos with {info['total_annotations']} annotations")

# Stream data
for batch in client.stream_data(split='train', batch_size=16):
    # Process batch
    print(f"Received batch with {len(batch['samples'])} samples")
`;
    };

    const renderMLPipeline = () => (
        <div className="ml-pipeline">
            <div className="ml-section">
                <h3><FaPython /> Framework Selection</h3>
                <div className="framework-options">
                    <label className={`framework-option ${mlOptions.framework === 'pytorch' ? 'selected' : ''}`}>
                        <input 
                            type="radio"
                            name="framework"
                            value="pytorch"
                            checked={mlOptions.framework === 'pytorch'}
                            onChange={(e) => setMlOptions({...mlOptions, framework: e.target.value})}
                        />
                        <FaPython />
                        <span>PyTorch</span>
                    </label>
                    <label className={`framework-option ${mlOptions.framework === 'tensorflow' ? 'selected' : ''}`}>
                        <input 
                            type="radio"
                            name="framework"
                            value="tensorflow"
                            checked={mlOptions.framework === 'tensorflow'}
                            onChange={(e) => setMlOptions({...mlOptions, framework: e.target.value})}
                        />
                        <FaRobot />
                        <span>TensorFlow</span>
                    </label>
                    <label className={`framework-option ${mlOptions.framework === 'custom' ? 'selected' : ''}`}>
                        <input 
                            type="radio"
                            name="framework"
                            value="custom"
                            checked={mlOptions.framework === 'custom'}
                            onChange={(e) => setMlOptions({...mlOptions, framework: e.target.value})}
                        />
                        <FaCode />
                        <span>Custom API</span>
                    </label>
                </div>
            </div>

            <div className="ml-section">
                <h3><FaDatabase /> Dataset Configuration</h3>
                <div className="ml-config-grid">
                    <div className="config-item">
                        <label>Dataset Class Name</label>
                        <input 
                            type="text"
                            value={mlOptions.datasetName}
                            onChange={(e) => setMlOptions({...mlOptions, datasetName: e.target.value})}
                        />
                    </div>
                    
                    <div className="config-item">
                        <label>Split Strategy</label>
                        <select 
                            value={mlOptions.splitStrategy}
                            onChange={(e) => setMlOptions({...mlOptions, splitStrategy: e.target.value})}
                        >
                            <option value="random">Random Split</option>
                            <option value="stratified">Stratified (by label)</option>
                            <option value="temporal">Temporal (by date)</option>
                        </select>
                    </div>
                </div>

                <div className="split-ratio">
                    <h4>Train/Val/Test Split</h4>
                    <div className="ratio-controls">
                        <div className="ratio-input">
                            <label>Train: {(mlOptions.splitRatio.train * 100).toFixed(0)}%</label>
                            <input 
                                type="range"
                                min="0"
                                max="100"
                                value={mlOptions.splitRatio.train * 100}
                                onChange={(e) => {
                                    const train = parseInt(e.target.value) / 100;
                                    const remaining = 1 - train;
                                    const val = remaining * (mlOptions.splitRatio.val / (mlOptions.splitRatio.val + mlOptions.splitRatio.test));
                                    const test = remaining - val;
                                    setMlOptions({
                                        ...mlOptions,
                                        splitRatio: { train, val, test }
                                    });
                                }}
                            />
                        </div>
                        <div className="ratio-input">
                            <label>Val: {(mlOptions.splitRatio.val * 100).toFixed(0)}%</label>
                            <input 
                                type="range"
                                min="0"
                                max="100"
                                value={mlOptions.splitRatio.val * 100}
                                disabled
                            />
                        </div>
                        <div className="ratio-input">
                            <label>Test: {(mlOptions.splitRatio.test * 100).toFixed(0)}%</label>
                            <input 
                                type="range"
                                min="0"
                                max="100"
                                value={mlOptions.splitRatio.test * 100}
                                disabled
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="ml-section">
                <h3>Data Preprocessing</h3>
                <div className="preprocessing-options">
                    <label className="export-checkbox">
                        <input 
                            type="checkbox"
                            checked={mlOptions.preprocessing.resizeFrames}
                            onChange={(e) => setMlOptions({
                                ...mlOptions,
                                preprocessing: {...mlOptions.preprocessing, resizeFrames: e.target.checked}
                            })}
                        />
                        <span>Resize frames to: </span>
                        <input 
                            type="number"
                            value={mlOptions.preprocessing.targetSize[0]}
                            onChange={(e) => setMlOptions({
                                ...mlOptions,
                                preprocessing: {...mlOptions.preprocessing, targetSize: [parseInt(e.target.value), mlOptions.preprocessing.targetSize[1]]}
                            })}
                            style={{width: '60px', marginLeft: '10px'}}
                        />
                        <span> × </span>
                        <input 
                            type="number"
                            value={mlOptions.preprocessing.targetSize[1]}
                            onChange={(e) => setMlOptions({
                                ...mlOptions,
                                preprocessing: {...mlOptions.preprocessing, targetSize: [mlOptions.preprocessing.targetSize[0], parseInt(e.target.value)]}
                            })}
                            style={{width: '60px'}}
                        />
                    </label>
                    
                    <label className="export-checkbox">
                        <input 
                            type="checkbox"
                            checked={mlOptions.preprocessing.normalizePixels}
                            onChange={(e) => setMlOptions({
                                ...mlOptions,
                                preprocessing: {...mlOptions.preprocessing, normalizePixels: e.target.checked}
                            })}
                        />
                        <span>Normalize pixel values (0-1)</span>
                    </label>
                </div>
            </div>

            <div className="ml-section">
                <h3><FaPlug /> API Integration</h3>
                <label className="export-checkbox">
                    <input 
                        type="checkbox"
                        checked={mlOptions.apiAccess.enabled}
                        onChange={(e) => setMlOptions({
                            ...mlOptions,
                            apiAccess: {...mlOptions.apiAccess, enabled: e.target.checked}
                        })}
                    />
                    <span>Enable API Access</span>
                </label>
                
                {mlOptions.apiAccess.enabled && (
                    <div className="api-config">
                        <div className="config-item">
                            <label>API Endpoint</label>
                            <input 
                                type="text"
                                value={mlOptions.apiAccess.endpoint}
                                onChange={(e) => setMlOptions({
                                    ...mlOptions,
                                    apiAccess: {...mlOptions.apiAccess, endpoint: e.target.value}
                                })}
                            />
                        </div>
                        <div className="config-item">
                            <label>Webhook URL (for updates)</label>
                            <input 
                                type="text"
                                placeholder="https://your-server.com/webhook"
                                value={mlOptions.apiAccess.webhookUrl}
                                onChange={(e) => setMlOptions({
                                    ...mlOptions,
                                    apiAccess: {...mlOptions.apiAccess, webhookUrl: e.target.value}
                                })}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="ml-actions">
                <button 
                    className="generate-code-button"
                    onClick={() => {
                        const code = mlOptions.framework === 'pytorch' ? generatePyTorchCode() : generateAPICode();
                        setGeneratedCode(code);
                    }}
                >
                    <FaCode /> Generate Code
                </button>
                <button 
                    className="export-ml-button"
                    onClick={handleExport}
                    disabled={exporting}
                >
                    <FaDownload /> Export ML Dataset
                </button>
            </div>

            {generatedCode && (
                <div className="code-preview">
                    <h3>Generated Code</h3>
                    <div className="code-actions">
                        <button onClick={() => navigator.clipboard.writeText(generatedCode)}>
                            Copy to Clipboard
                        </button>
                        <button onClick={() => {
                            const blob = new Blob([generatedCode], { type: 'text/plain' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = mlOptions.framework === 'pytorch' ? 'dataset.py' : 'api_client.py';
                            a.click();
                        }}>
                            Download as .py
                        </button>
                    </div>
                    <pre>{generatedCode}</pre>
                </div>
            )}
        </div>
    );

    return (
        <div className="data-export">
            <h2>Export Annotation Data</h2>

            {loading ? (
                <div className="loading">Loading export information...</div>
            ) : exportStats && (
                <>
                    <div className="export-summary">
                        <h3>Export Summary</h3>
                        <div className="summary-grid">
                            <div className="summary-item">
                                <FaCheckCircle className="summary-icon confirmed" />
                                <div className="summary-content">
                                    <div className="summary-value">{exportStats.confirmedVideos}</div>
                                    <div className="summary-label">Confirmed Videos</div>
                                </div>
                            </div>
                            <div className="summary-item">
                                <FaChartBar className="summary-icon" />
                                <div className="summary-content">
                                    <div className="summary-value">{exportStats.totalAnnotations}</div>
                                    <div className="summary-label">Total Annotations</div>
                                </div>
                            </div>
                            <div className="summary-item">
                                <div className="summary-content">
                                    <div className="summary-value">{exportStats.fallEvents}</div>
                                    <div className="summary-label">Fall Events</div>
                                </div>
                            </div>
                            <div className="summary-item">
                                <div className="summary-content">
                                    <div className="summary-value">{exportStats.boundingBoxes}</div>
                                    <div className="summary-label">Bounding Boxes</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="export-tabs">
                        <button 
                            className={`tab-button ${activeTab === 'quick' ? 'active' : ''}`}
                            onClick={() => setActiveTab('quick')}
                        >
                            <FaDownload /> Quick Export
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'advanced' ? 'active' : ''}`}
                            onClick={() => setActiveTab('advanced')}
                        >
                            <FaCog /> Advanced Options
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'ml' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ml')}
                        >
                            <FaRobot /> ML Pipeline
                        </button>
                        <button 
                            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => setActiveTab('history')}
                        >
                            <FaHistory /> Export History
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="tab-content">
                        {activeTab === 'quick' && renderQuickExport()}
                        {activeTab === 'advanced' && renderAdvancedOptions()}
                        {activeTab === 'ml' && renderMLPipeline()}
                        {activeTab === 'history' && renderExportHistory()}
                    </div>

                    {/* Export Actions */}
                    {activeTab !== 'history' && activeTab !== 'ml' && (
                        <div className="export-actions">
                            <button 
                                className="preview-button"
                                onClick={() => setShowPreview(!showPreview)}
                            >
                                <FaEye /> {showPreview ? 'Hide' : 'Show'} Preview
                            </button>
                            <button 
                                className="export-button"
                                onClick={handleExport}
                                disabled={exporting}
                            >
                                {exporting ? (
                                    <>Exporting...</>
                                ) : (
                                    <>
                                        <FaDownload /> Export Data
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Preview Modal */}
                    {showPreview && (
                        <div className="preview-modal">
                            <div className="preview-header">
                                <h3>Export Preview</h3>
                                <button onClick={() => setShowPreview(false)}>×</button>
                            </div>
                            <div className="preview-body">
                                <pre>{JSON.stringify(generatePreview(), null, 2)}</pre>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default DataExport;