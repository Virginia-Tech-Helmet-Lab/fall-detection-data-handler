import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './AnnotationPanel.css';

const AnnotationPanel = forwardRef(({ 
  videoId, 
  currentFrame, 
  currentTime, 
  frameRate, 
  duration,
  onBoundingBoxActivate,
  isBoundingBoxActive
}, ref) => {
  // States for temporal annotation
  const [temporalAnnotations, setTemporalAnnotations] = useState([]);
  const [bboxAnnotations, setBboxAnnotations] = useState([]);
  const [annotationLabel, setAnnotationLabel] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [startFrame, setStartFrame] = useState(null);
  const [endFrame, setEndFrame] = useState(null);
  const [customLabel, setCustomLabel] = useState('');
  
  // States for bounding box annotation
  const [selectedBodyPart, setSelectedBodyPart] = useState('head');
  
  // Section visibility states
  const [temporalSectionOpen, setTemporalSectionOpen] = useState(true);
  const [boundingBoxSectionOpen, setBoundingBoxSectionOpen] = useState(true);
  const [existingAnnotationsOpen, setExistingAnnotationsOpen] = useState(true);
  
  // Predefined body parts
  const bodyParts = ['head', 'shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'];
  
  // Predefined event types for temporal annotations
  const eventTypes = ['Fall'];

  // Fetch annotations when video changes
  useEffect(() => {
    if (videoId) {
      fetchTemporalAnnotations();
      fetchBboxAnnotations();
    }
  }, [videoId]);

  // Add a useEffect that refetches bounding box annotations when the component updates
  useEffect(() => {
    if (videoId && isBoundingBoxActive) {
      // Poll for new annotations when bounding box mode is active
      const interval = setInterval(() => {
        fetchBboxAnnotations();
      }, 3000); // Check every 3 seconds
      
      return () => clearInterval(interval);
    }
  }, [videoId, isBoundingBoxActive]);

  const fetchTemporalAnnotations = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/annotations/${videoId}`);
      if (response.ok) {
        const data = await response.json();
        setTemporalAnnotations(data);
      }
    } catch (error) {
      console.error('Error fetching temporal annotations:', error);
    }
  };

  const fetchBboxAnnotations = async () => {
    try {
      console.log(`Fetching bbox annotations for video ${videoId}`);
      const response = await fetch(`http://localhost:5000/api/bbox-annotations/${videoId}`);
      
      console.log("Response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Received bbox annotations:", data);
        setBboxAnnotations(data);
      } else {
        console.error('Failed to fetch bounding box annotations:', 
                     response.status, response.statusText);
        
        // If empty response is given, set an empty array
        setBboxAnnotations([]);
      }
    } catch (error) {
      console.error('Error fetching bounding box annotations:', error);
      setBboxAnnotations([]);
    }
  };

  const handleSetStart = () => {
    setStartTime(currentTime);
    setStartFrame(currentFrame);
  };

  const handleSetEnd = () => {
    setEndTime(currentTime);
    setEndFrame(currentFrame);
  };

  const handleLabelChange = (e) => {
    setAnnotationLabel(e.target.value);
    if (e.target.value !== 'Other') {
      setCustomLabel('');
    }
  };

  const handleCustomLabelChange = (e) => {
    setCustomLabel(e.target.value);
  };

  const handleSaveTemporalAnnotation = async () => {
    if (!annotationLabel || startTime === null || endTime === null) {
      alert('Please fill in all fields for temporal annotation');
      return;
    }

    // Use the custom label if "Other" is selected
    const finalLabel = annotationLabel === 'Other' ? customLabel : annotationLabel;
    
    if (annotationLabel === 'Other' && !customLabel) {
      alert('Please enter a custom label');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_id: videoId,
          start_time: startTime,
          end_time: endTime,
          start_frame: startFrame,
          end_frame: endFrame,
          label: finalLabel
        }),
      });

      if (response.ok) {
        // Successfully saved, reset form and refresh the list
        setAnnotationLabel('');
        setStartTime(null);
        setEndTime(null);
        setStartFrame(null);
        setEndFrame(null);
        
        // Fetch updated annotations
        fetchTemporalAnnotations();
        
        alert('Annotation saved successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to save annotation: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving annotation:', error);
      alert('Error saving annotation');
    }
  };

  const handleDeleteAnnotation = async (annotationId) => {
    if (!window.confirm('Are you sure you want to delete this annotation?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/annotations/${annotationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the list
        fetchTemporalAnnotations();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete annotation: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting annotation:', error);
      alert('Error deleting annotation');
    }
  };

  const handleDeleteBbox = async (bboxId) => {
    if (window.confirm('Are you sure you want to delete this bounding box?')) {
      try {
        console.log(`Attempting to delete bbox with ID ${bboxId}`);
        
        // Use the GET endpoint instead of DELETE to avoid CORS issues
        const response = await fetch(`http://localhost:5000/api/delete-bbox/${bboxId}`);
        
        if (response.ok) {
          // Success - update the UI
          setBboxAnnotations(prevBoxes => 
            prevBoxes.filter(box => box.bbox_id !== bboxId)
          );
        } else {
          console.error('Failed to delete bounding box:', 
                       response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error deleting bounding box:', error);
      }
    }
  };

  const handleBodyPartChange = (e) => {
    setSelectedBodyPart(e.target.value);
    
    // If bounding box mode is active, update it with the new label
    if (isBoundingBoxActive) {
      onBoundingBoxActivate(true, e.target.value);
    }
  };

  const toggleBoundingBoxMode = () => {
    const newState = !isBoundingBoxActive;
    onBoundingBoxActivate(newState, selectedBodyPart);
  };

  // Make the fetchBboxAnnotations function available via ref
  useImperativeHandle(ref, () => ({
    fetchBboxAnnotations
  }));

  return (
    <div className="annotation-panel">
      
      {/* Current Frame/Time Information */}
      <div className="current-frame-info">
        <div className="frame-indicator">
          <span>Current Frame:</span>
          <span>{currentFrame}</span>
        </div>
        <div className="frame-indicator">
          <span>Current Time:</span>
          <span>{currentTime.toFixed(2)}s</span>
        </div>
      </div>
      
      {/* Temporal Annotation Section */}
      <h3>Temporal Annotation</h3>
      <div className="form-group">
        <label>Label:</label>
        <select 
          value={annotationLabel} 
          onChange={handleLabelChange}
        >
          <option value="">Select an event type</option>
          {eventTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>
      
      {annotationLabel === 'Other' && (
        <div className="form-group">
          <label>Custom Label:</label>
          <input 
            type="text" 
            value={customLabel} 
            onChange={handleCustomLabelChange} 
            placeholder="Enter custom label"
          />
        </div>
      )}
      
      <div className="frame-marking-buttons">
        <button 
          className="mark-start-btn" 
          onClick={handleSetStart}
        >
          Set Start {startFrame ? `(${startFrame})` : "(Not Set)"}
        </button>
        
        <button 
          className="mark-end-btn" 
          onClick={handleSetEnd}
        >
          Set End {endFrame ? `(${endFrame})` : "(Not Set)"}
        </button>
      </div>
      
      {startTime !== null && (
        <div className="frame-indicator start-frame">
          <span>Start Time:</span>
          <span>{startTime.toFixed(2)}s (Frame {startFrame})</span>
        </div>
      )}
      
      {endTime !== null && (
        <div className="frame-indicator end-frame">
          <span>End Time:</span>
          <span>{endTime.toFixed(2)}s (Frame {endFrame})</span>
        </div>
      )}
      
      <button 
        className="save-button" 
        onClick={handleSaveTemporalAnnotation}
        disabled={!annotationLabel || startTime === null || endTime === null}
      >
        Save Temporal Annotation
      </button>
      
      {/* Bounding Box Annotation Section */}
      <h3>Bounding Box Annotation</h3>
      <div className="form-group">
        <label>Body Part:</label>
        <select 
          value={selectedBodyPart} 
          onChange={handleBodyPartChange}
        >
          {bodyParts.map(part => (
            <option key={part} value={part}>{part}</option>
          ))}
        </select>
      </div>
      
      <button 
        className={`bbox-button ${isBoundingBoxActive ? 'active' : ''}`} 
        onClick={toggleBoundingBoxMode}
      >
        {isBoundingBoxActive ? 'Disable' : 'Enable'} Bounding Box Mode
      </button>
      
      {isBoundingBoxActive && (
        <div className="bbox-instructions">
          <p>Click and drag on the video to create a bounding box for "{selectedBodyPart}"</p>
        </div>
      )}
      
      {/* Existing Annotations Section */}
      <h3>Existing Annotations</h3>
      
      {/* Temporal Annotations List */}
      <h4>Temporal Annotations</h4>
      {temporalAnnotations.length > 0 ? (
        <ul className="annotation-list">
          {temporalAnnotations.map(anno => (
            <li key={anno.annotation_id} className="annotation-item">
              <div className="annotation-details">
                <span className="annotation-label">{anno.label}</span>
                <span className="annotation-time">
                  {anno.start_time.toFixed(2)}s - {anno.end_time.toFixed(2)}s
                </span>
                <span className="annotation-frames">
                  Frames: {anno.start_frame} - {anno.end_frame}
                </span>
              </div>
              <button 
                onClick={() => handleDeleteAnnotation(anno.annotation_id)}
                className="delete-button"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No temporal annotations yet.</p>
      )}
      
      {/* Bounding Box Annotations List */}
      <h4>Bounding Box Annotations</h4>
      {bboxAnnotations.length > 0 ? (
        <ul className="annotation-list">
          {bboxAnnotations.map(bbox => (
            <li key={bbox.bbox_id} className="annotation-item">
              <div className="annotation-details">
                <span className="annotation-label">{bbox.part_label}</span>
                <span>Frame: {bbox.frame_index}</span>
                <span>Position: ({Math.round(bbox.x)}, {Math.round(bbox.y)})</span>
                <span>Size: {Math.round(bbox.width)} x {Math.round(bbox.height)}</span>
              </div>
              <button 
                onClick={() => handleDeleteBbox(bbox.bbox_id)}
                className="delete-button"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No bounding box annotations yet.</p>
      )}
    </div>
  );
});

export default AnnotationPanel;
