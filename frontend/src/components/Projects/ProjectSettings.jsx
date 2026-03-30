import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaArrowLeft, FaTrash } from 'react-icons/fa';
import { useProject } from '../../contexts/ProjectContext';
import { LABEL_TEMPLATES } from '../../data/labelTemplates';
import './ProjectSettings.css';

const ProjectSettings = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { getProjectDetails, updateProject, fetchProjects } = useProject();

    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        deadline: '',
        status: '',
        annotation_schema: { event_types: [], body_parts: [] },
    });

    useEffect(() => {
        loadProject();
    }, [projectId]);

    const loadProject = async () => {
        try {
            setLoading(true);
            const result = await getProjectDetails(projectId);
            if (result.success) {
                setProject(result.project);
                const schema = result.project.annotation_schema || { event_types: [], body_parts: [] };
                setFormData({
                    name: result.project.name || '',
                    description: result.project.description || '',
                    deadline: result.project.deadline ? result.project.deadline.split('T')[0] : '',
                    status: result.project.status || 'setup',
                    annotation_schema: {
                        event_types: schema.event_types || [],
                        body_parts: schema.body_parts || [],
                    },
                });
            } else {
                setMessage({ type: 'error', text: 'Failed to load project' });
            }
        } catch (error) {
            console.error('Error loading project:', error);
            setMessage({ type: 'error', text: 'Error loading project' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const result = await updateProject(projectId, formData);
            if (result.success) {
                setProject(result.project);
                setMessage({ type: 'success', text: 'Settings saved!' });
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to save' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error saving settings' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            const apiClient = (await import('../../api/client')).default;
            await apiClient.delete(`/api/projects/${projectId}`);
            await fetchProjects();
            navigate('/projects');
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to delete project' });
        }
        setShowDeleteConfirm(false);
    };

    // Template helpers
    const applyTemporalTemplate = (template) => {
        setFormData(prev => ({
            ...prev,
            annotation_schema: { ...prev.annotation_schema, event_types: [...template.schema.event_types] },
        }));
    };

    const applyBboxTemplate = (template) => {
        setFormData(prev => ({
            ...prev,
            annotation_schema: { ...prev.annotation_schema, body_parts: [...template.schema.body_parts] },
        }));
    };

    const removeLabel = (type, index) => {
        setFormData(prev => ({
            ...prev,
            annotation_schema: {
                ...prev.annotation_schema,
                [type]: prev.annotation_schema[type].filter((_, i) => i !== index),
            },
        }));
    };

    const addLabel = (type, value) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        if (formData.annotation_schema[type].includes(trimmed)) return;
        setFormData(prev => ({
            ...prev,
            annotation_schema: {
                ...prev.annotation_schema,
                [type]: [...prev.annotation_schema[type], trimmed],
            },
        }));
    };

    const [newEventType, setNewEventType] = useState('');
    const [newBodyPart, setNewBodyPart] = useState('');

    const temporalTemplates = LABEL_TEMPLATES.filter(t => t.schema.event_types.length > 0 || t.id === 'custom');
    const bboxTemplates = LABEL_TEMPLATES.filter(t => t.schema.body_parts.length > 0 || t.id === 'custom');

    if (loading) {
        return <div className="settings-loading"><p>Loading project settings...</p></div>;
    }

    if (!project) {
        return (
            <div className="settings-error">
                <p>Project not found</p>
                <button onClick={() => navigate('/projects')}>Back to Projects</button>
            </div>
        );
    }

    return (
        <div className="project-settings">
            <div className="settings-header">
                <div className="settings-header-top">
                    <button className="back-button" onClick={() => navigate('/projects')}>
                        <FaArrowLeft /> Back
                    </button>
                    <h1>{project.name}</h1>
                    <button className="save-button" onClick={handleSave} disabled={saving}>
                        <FaSave /> {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            {message.text && (
                <div className={`message ${message.type}`}>{message.text}</div>
            )}

            <div className="settings-content">
                {/* General */}
                <section className="settings-section">
                    <h2>General</h2>
                    <div className="form-group">
                        <label>Project Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea name="description" value={formData.description} onChange={handleInputChange} rows={3} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Status</label>
                            <select name="status" value={formData.status} onChange={handleInputChange}>
                                <option value="setup">Setup</option>
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Deadline</label>
                            <input type="date" name="deadline" value={formData.deadline} onChange={handleInputChange} />
                        </div>
                    </div>
                </section>

                {/* Annotation Schema */}
                <section className="settings-section">
                    <h2>Annotation Labels</h2>

                    <div className="schema-group">
                        <div className="schema-header">
                            <h3>Event Types (Temporal)</h3>
                            <div className="template-quick-select">
                                {temporalTemplates.map(t => (
                                    <button
                                        key={t.id}
                                        className="template-quick-btn"
                                        onClick={() => applyTemporalTemplate(t)}
                                        title={t.description}
                                    >{t.name}</button>
                                ))}
                            </div>
                        </div>
                        <div className="label-pills">
                            {formData.annotation_schema.event_types.map((label, i) => (
                                <span key={label} className="label-pill event">
                                    {label}
                                    <button onClick={() => removeLabel('event_types', i)}>&times;</button>
                                </span>
                            ))}
                            {formData.annotation_schema.event_types.length === 0 && (
                                <span className="label-empty">No event types — add below or load a template</span>
                            )}
                        </div>
                        <div className="add-label-row">
                            <input
                                type="text"
                                value={newEventType}
                                onChange={(e) => setNewEventType(e.target.value)}
                                placeholder="Add event type..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') { addLabel('event_types', newEventType); setNewEventType(''); }
                                }}
                            />
                            <button onClick={() => { addLabel('event_types', newEventType); setNewEventType(''); }}>Add</button>
                        </div>
                    </div>

                    <div className="schema-group">
                        <div className="schema-header">
                            <h3>Body Parts (Bounding Box)</h3>
                            <div className="template-quick-select">
                                {bboxTemplates.map(t => (
                                    <button
                                        key={t.id}
                                        className="template-quick-btn"
                                        onClick={() => applyBboxTemplate(t)}
                                        title={t.description}
                                    >{t.name}</button>
                                ))}
                            </div>
                        </div>
                        <div className="label-pills">
                            {formData.annotation_schema.body_parts.map((label, i) => (
                                <span key={label} className="label-pill bbox">
                                    {label}
                                    <button onClick={() => removeLabel('body_parts', i)}>&times;</button>
                                </span>
                            ))}
                            {formData.annotation_schema.body_parts.length === 0 && (
                                <span className="label-empty">No body parts — add below or load a template</span>
                            )}
                        </div>
                        <div className="add-label-row">
                            <input
                                type="text"
                                value={newBodyPart}
                                onChange={(e) => setNewBodyPart(e.target.value)}
                                placeholder="Add body part..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') { addLabel('body_parts', newBodyPart); setNewBodyPart(''); }
                                }}
                            />
                            <button onClick={() => { addLabel('body_parts', newBodyPart); setNewBodyPart(''); }}>Add</button>
                        </div>
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="settings-section danger-zone">
                    <h2>Danger Zone</h2>
                    <div className="danger-action">
                        <div>
                            <strong>Delete this project</strong>
                            <p>Permanently delete this project and all associated annotations. This cannot be undone.</p>
                        </div>
                        <button className="delete-btn" onClick={() => setShowDeleteConfirm(true)}>
                            <FaTrash /> Delete
                        </button>
                    </div>
                </section>
            </div>

            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Delete Project?</h3>
                        <p>Permanently delete "{project.name}" and all its data?</p>
                        <div className="modal-actions">
                            <button className="cancel-button" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                            <button className="confirm-delete-button" onClick={handleDelete}>Delete Project</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectSettings;
