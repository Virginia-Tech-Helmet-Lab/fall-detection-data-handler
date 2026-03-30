import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { basePath } from '../../api/client';
import { useProject } from '../../contexts/ProjectContext';
import { LABEL_TEMPLATES } from '../../data/labelTemplates';
import './AnnotationPanel.css';

const fallDetectionTemplate = LABEL_TEMPLATES.find(t => t.id === 'fall_detection');
const DEFAULT_EVENT_TYPES = fallDetectionTemplate.schema.event_types;
const DEFAULT_BODY_PARTS = fallDetectionTemplate.schema.body_parts;

const AnnotationPanel = forwardRef(({
  videoId,
  currentFrame,
  currentTime,
  frameRate,
  duration,
  onBoundingBoxActivate,
  isBoundingBoxActive
}, ref) => {
  const { currentProject, updateProject } = useProject();

  // Annotator identity (persisted in localStorage)
  const [annotatorName, setAnnotatorName] = useState(
    () => localStorage.getItem('annotator_name') || ''
  );

  const handleAnnotatorNameChange = (e) => {
    const name = e.target.value;
    setAnnotatorName(name);
    localStorage.setItem('annotator_name', name);
  };

  // Dynamic label types (loaded from project, fallback to defaults)
  const [eventTypes, setEventTypes] = useState(DEFAULT_EVENT_TYPES);
  const [bodyParts, setBodyParts] = useState(DEFAULT_BODY_PARTS);
  const [showAddEventType, setShowAddEventType] = useState(false);
  const [showAddBodyPart, setShowAddBodyPart] = useState(false);
  const [newEventType, setNewEventType] = useState('');
  const [newBodyPart, setNewBodyPart] = useState('');
  const [showTemplateLoader, setShowTemplateLoader] = useState(false);

  // States for temporal annotation
  const [temporalAnnotations, setTemporalAnnotations] = useState([]);
  const [bboxAnnotations, setBboxAnnotations] = useState([]);
  const [annotationLabel, setAnnotationLabel] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [startFrame, setStartFrame] = useState(null);
  const [endFrame, setEndFrame] = useState(null);

  // States for bounding box annotation
  const [selectedBodyPart, setSelectedBodyPart] = useState('head');

  // Load label config from project
  useEffect(() => {
    if (currentProject?.annotation_schema) {
      const schema = currentProject.annotation_schema;
      if (schema.event_types) {
        setEventTypes(schema.event_types);
      }
      if (schema.body_parts) {
        setBodyParts(schema.body_parts);
        if (schema.body_parts.length > 0) {
          setSelectedBodyPart(schema.body_parts[0]);
        }
      }
    } else {
      setEventTypes(DEFAULT_EVENT_TYPES);
      setBodyParts(DEFAULT_BODY_PARTS);
    }
  }, [currentProject?.project_id]);

  const persistSchema = async (updatedEventTypes, updatedBodyParts) => {
    if (!currentProject?.project_id) return;
    try {
      await updateProject(currentProject.project_id, {
        annotation_schema: {
          event_types: updatedEventTypes,
          body_parts: updatedBodyParts,
        }
      });
    } catch (error) {
      console.error('Error saving annotation schema:', error);
    }
  };

  const handleAddEventType = () => {
    const trimmed = newEventType.trim();
    if (!trimmed) return;
    if (eventTypes.includes(trimmed)) return;
    const updated = [...eventTypes, trimmed];
    setEventTypes(updated);
    persistSchema(updated, bodyParts);
    setNewEventType('');
    setShowAddEventType(false);
  };

  const handleAddBodyPart = () => {
    const trimmed = newBodyPart.trim().toLowerCase();
    if (!trimmed) return;
    if (bodyParts.includes(trimmed)) return;
    const updated = [...bodyParts, trimmed];
    setBodyParts(updated);
    persistSchema(eventTypes, updated);
    setNewBodyPart('');
    setShowAddBodyPart(false);
  };

  const [templateTarget, setTemplateTarget] = useState(null); // { template, target: 'temporal'|'bbox'|'both' }

  const applyTemplate = (template, target) => {
    const label = target === 'both' ? 'temporal and bounding box labels'
      : target === 'temporal' ? 'temporal labels' : 'bounding box labels';
    if (!window.confirm(`Replace ${label} with "${template.name}"? Existing annotations won't be affected.`)) return;

    let newEventTypes = eventTypes;
    let newBodyParts = bodyParts;
    if (target === 'temporal' || target === 'both') {
      newEventTypes = template.schema.event_types;
      setEventTypes(newEventTypes);
    }
    if (target === 'bbox' || target === 'both') {
      newBodyParts = template.schema.body_parts;
      setBodyParts(newBodyParts);
      if (newBodyParts.length > 0) {
        setSelectedBodyPart(newBodyParts[0]);
      }
    }
    persistSchema(newEventTypes, newBodyParts);
    setShowTemplateLoader(false);
    setTemplateTarget(null);
  };

  // Fetch annotations when video changes
  useEffect(() => {
    if (videoId) {
      fetchTemporalAnnotations();
      fetchBboxAnnotations();
    }
  }, [videoId]);

  // Poll for bbox updates when bbox mode is active
  useEffect(() => {
    if (videoId && isBoundingBoxActive) {
      const interval = setInterval(() => {
        fetchBboxAnnotations();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [videoId, isBoundingBoxActive]);

  const fetchTemporalAnnotations = async () => {
    try {
      const response = await fetch(`${basePath}/api/annotations/${videoId}`);
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
      const response = await fetch(`${basePath}/api/bbox-annotations/${videoId}`);
      if (response.ok) {
        const data = await response.json();
        setBboxAnnotations(data);
      } else {
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
  };

  const handleSaveTemporalAnnotation = async () => {
    if (!annotationLabel || startTime === null || endTime === null) {
      alert('Please fill in all fields for temporal annotation');
      return;
    }

    try {
      const response = await fetch(`${basePath}/api/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: videoId,
          start_time: startTime,
          end_time: endTime,
          start_frame: startFrame,
          end_frame: endFrame,
          label: annotationLabel,
          annotator_name: annotatorName || null,
        }),
      });

      if (response.ok) {
        setAnnotationLabel('');
        setStartTime(null);
        setEndTime(null);
        setStartFrame(null);
        setEndFrame(null);
        fetchTemporalAnnotations();
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
    if (!window.confirm('Are you sure you want to delete this annotation?')) return;

    try {
      const response = await fetch(`${basePath}/api/annotations/${annotationId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchTemporalAnnotations();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete annotation: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting annotation:', error);
    }
  };

  const handleDeleteBbox = async (bboxId) => {
    if (!window.confirm('Are you sure you want to delete this bounding box?')) return;
    try {
      const response = await fetch(`${basePath}/api/delete-bbox/${bboxId}`);
      if (response.ok) {
        setBboxAnnotations(prev => prev.filter(box => box.bbox_id !== bboxId));
      }
    } catch (error) {
      console.error('Error deleting bounding box:', error);
    }
  };

  const handleBodyPartChange = (e) => {
    setSelectedBodyPart(e.target.value);
    if (isBoundingBoxActive) {
      onBoundingBoxActivate(true, e.target.value);
    }
  };

  const toggleBoundingBoxMode = () => {
    const newState = !isBoundingBoxActive;
    onBoundingBoxActivate(newState, selectedBodyPart);
  };

  useImperativeHandle(ref, () => ({
    fetchBboxAnnotations
  }));

  return (
    <div className="annotation-panel">

      {/* Annotator Identity */}
      <div className="annotator-name-section">
        <label>Annotator:</label>
        <input
          type="text"
          value={annotatorName}
          onChange={handleAnnotatorNameChange}
          placeholder="Your name (signs your annotations)"
          className="annotator-name-input"
        />
      </div>

      {/* Template Loader */}
      <div className="template-loader-section">
        <button
          className="load-template-btn"
          onClick={() => { setShowTemplateLoader(!showTemplateLoader); setTemplateTarget(null); }}
          type="button"
        >
          {showTemplateLoader ? 'Cancel' : 'Load Template'}
        </button>
        {showTemplateLoader && !templateTarget && (
          <div className="template-loader">
            {LABEL_TEMPLATES.map(template => (
              <button
                key={template.id}
                className="template-loader-item"
                onClick={() => setTemplateTarget(template)}
              >
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </button>
            ))}
          </div>
        )}
        {showTemplateLoader && templateTarget && (
          <div className="template-loader">
            <div className="template-apply-header">Apply "{templateTarget.name}" to:</div>
            <button className="template-loader-item" onClick={() => applyTemplate(templateTarget, 'temporal')}>
              <strong>Temporal Labels</strong>
              <span>{templateTarget.schema.event_types.length > 0 ? templateTarget.schema.event_types.join(', ') : 'Empty'}</span>
            </button>
            <button className="template-loader-item" onClick={() => applyTemplate(templateTarget, 'bbox')}>
              <strong>Bounding Box Labels</strong>
              <span>{templateTarget.schema.body_parts.length > 0 ? templateTarget.schema.body_parts.slice(0, 5).join(', ') + (templateTarget.schema.body_parts.length > 5 ? '...' : '') : 'Empty'}</span>
            </button>
            <button className="template-loader-item apply-both" onClick={() => applyTemplate(templateTarget, 'both')}>
              <strong>Both</strong>
              <span>Apply all labels from this template</span>
            </button>
          </div>
        )}
      </div>

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
        <div className="label-select-row">
          <select value={annotationLabel} onChange={handleLabelChange}>
            <option value="">Select an event type</option>
            {eventTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <button
            className="add-label-btn"
            onClick={() => setShowAddEventType(!showAddEventType)}
            title="Add custom event type"
            type="button"
          >+</button>
        </div>
        {showAddEventType && (
          <div className="add-label-form">
            <input
              type="text"
              value={newEventType}
              onChange={(e) => setNewEventType(e.target.value)}
              placeholder="New event type"
              onKeyDown={(e) => e.key === 'Enter' && handleAddEventType()}
            />
            <button onClick={handleAddEventType} type="button">Add</button>
          </div>
        )}
      </div>

      <div className="frame-marking-buttons">
        <button className="mark-start-btn" onClick={handleSetStart}>
          Set Start {startFrame ? `(${startFrame})` : "(Not Set)"}
        </button>
        <button className="mark-end-btn" onClick={handleSetEnd}>
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
        <div className="label-select-row">
          <select value={selectedBodyPart} onChange={handleBodyPartChange}>
            {bodyParts.map(part => (
              <option key={part} value={part}>{part}</option>
            ))}
          </select>
          <button
            className="add-label-btn"
            onClick={() => setShowAddBodyPart(!showAddBodyPart)}
            title="Add custom body part"
            type="button"
          >+</button>
        </div>
        {showAddBodyPart && (
          <div className="add-label-form">
            <input
              type="text"
              value={newBodyPart}
              onChange={(e) => setNewBodyPart(e.target.value)}
              placeholder="New body part"
              onKeyDown={(e) => e.key === 'Enter' && handleAddBodyPart()}
            />
            <button onClick={handleAddBodyPart} type="button">Add</button>
          </div>
        )}
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
                {anno.annotator_name && (
                  <span className="annotation-signed">by {anno.annotator_name}</span>
                )}
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
