import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaArrowLeft, FaUsers, FaCog, FaTrash, FaUserPlus, FaArchive, FaPlay } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import axios from 'axios';
import './ProjectSettings.css';

const ProjectSettings = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { getProjectDetails, updateProject, addProjectMember } = useProject();
    
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // Form states
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        deadline: '',
        status: '',
        quality_threshold: 0.8,
        annotation_schema: {
            temporal_labels: [],
            body_parts: []
        },
        normalization_settings: {
            target_resolution: '720p',
            target_fps: 30,
            brightness: 1.0,
            contrast: 1.0
        }
    });
    
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('member');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

    useEffect(() => {
        loadProjectDetails();
    }, [projectId]);

    const loadProjectDetails = async () => {
        try {
            setLoading(true);
            console.log('Loading project details for ID:', projectId);
            const result = await getProjectDetails(projectId);
            console.log('Project details result:', result);
            if (result.success) {
                setProject(result.project);
                setFormData({
                    name: result.project.name || '',
                    description: result.project.description || '',
                    deadline: result.project.deadline ? result.project.deadline.split('T')[0] : '',
                    status: result.project.status || 'setup',
                    quality_threshold: result.project.quality_threshold || 0.8,
                    annotation_schema: result.project.annotation_schema || {
                        temporal_labels: ['fall', 'near-fall', 'normal'],
                        body_parts: ['head', 'shoulder', 'hip', 'knee', 'ankle']
                    },
                    normalization_settings: result.project.normalization_settings || {
                        target_resolution: '720p',
                        target_fps: 30,
                        brightness: 1.0,
                        contrast: 1.0
                    }
                });
            } else {
                setMessage({ type: 'error', text: 'Failed to load project details' });
            }
        } catch (error) {
            console.error('Error loading project:', error);
            setMessage({ type: 'error', text: 'Error loading project details' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSchemaChange = (type, value) => {
        setFormData(prev => ({
            ...prev,
            annotation_schema: {
                ...prev.annotation_schema,
                [type]: value.split(',').map(item => item.trim()).filter(item => item)
            }
        }));
    };

    const handleNormalizationChange = (setting, value) => {
        setFormData(prev => ({
            ...prev,
            normalization_settings: {
                ...prev.normalization_settings,
                [setting]: value
            }
        }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const result = await updateProject(projectId, formData);
            if (result.success) {
                setMessage({ type: 'success', text: 'Project settings saved successfully!' });
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to save settings' });
            }
        } catch (error) {
            console.error('Error saving project:', error);
            setMessage({ type: 'error', text: 'Error saving project settings' });
        } finally {
            setSaving(false);
        }
    };

    const handleAddMember = async () => {
        if (!newMemberEmail) {
            setMessage({ type: 'error', text: 'Please enter an email address' });
            return;
        }

        try {
            // First, find the user by email
            const token = localStorage.getItem('access_token');
            const usersResponse = await axios.get('http://localhost:5000/api/auth/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const user = usersResponse.data.users.find(u => u.email === newMemberEmail);
            if (!user) {
                setMessage({ type: 'error', text: 'No user found with that email address' });
                return;
            }

            // Check if user is already a member
            if (project.members && project.members.some(m => m.user_id === user.user_id)) {
                setMessage({ type: 'error', text: 'User is already a member of this project' });
                return;
            }

            const result = await addProjectMember(projectId, user.user_id, newMemberRole);
            if (result.success) {
                setMessage({ type: 'success', text: 'Member added successfully!' });
                setNewMemberEmail('');
                loadProjectDetails(); // Reload to show new member
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to add member' });
            }
        } catch (error) {
            console.error('Error adding member:', error);
            setMessage({ type: 'error', text: 'Error adding team member' });
        }
    };

    const handleActivateProject = async () => {
        try {
            const result = await updateProject(projectId, { ...formData, status: 'active' });
            if (result.success) {
                setMessage({ type: 'success', text: 'Project activated successfully!' });
                setFormData(prev => ({ ...prev, status: 'active' }));
                loadProjectDetails();
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to activate project' });
            }
        } catch (error) {
            console.error('Error activating project:', error);
            setMessage({ type: 'error', text: 'Error activating project' });
        }
    };

    const handleArchiveProject = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.post(
                `http://localhost:5000/api/projects/${projectId}/archive`,
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            
            if (response.data) {
                setMessage({ type: 'success', text: 'Project archived successfully!' });
                setTimeout(() => navigate('/projects'), 2000);
            }
        } catch (error) {
            console.error('Error archiving project:', error);
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to archive project' });
        }
        setShowArchiveConfirm(false);
    };

    const handleDeleteProject = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.delete(
                `http://localhost:5000/api/projects/${projectId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            
            if (response.data) {
                setMessage({ type: 'success', text: 'Project deleted successfully!' });
                setTimeout(() => navigate('/projects'), 1500);
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to delete project' });
        }
        setShowDeleteConfirm(false);
    };

    if (loading) {
        return (
            <div className="settings-loading">
                <div className="loading-spinner"></div>
                <p>Loading project settings...</p>
            </div>
        );
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
                        <FaArrowLeft /> Back to Projects
                    </button>
                    <h1>Project Settings</h1>
                    <button 
                        className="save-button" 
                        onClick={handleSave}
                        disabled={saving}
                    >
                        <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
                {project && (
                    <div className="project-title-bar">
                        <h2>{project.name}</h2>
                        <span className={`status-badge ${formData.status}`}>
                            {formData.status}
                        </span>
                    </div>
                )}
            </div>

            {message.text && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="settings-tabs">
                <button 
                    className={`tab ${activeTab === 'general' ? 'active' : ''}`}
                    onClick={() => setActiveTab('general')}
                >
                    <FaCog /> General
                </button>
                <button 
                    className={`tab ${activeTab === 'team' ? 'active' : ''}`}
                    onClick={() => setActiveTab('team')}
                >
                    <FaUsers /> Team
                </button>
                <button 
                    className={`tab ${activeTab === 'schema' ? 'active' : ''}`}
                    onClick={() => setActiveTab('schema')}
                >
                    <FaCog /> Annotation Schema
                </button>
                <button 
                    className={`tab ${activeTab === 'normalization' ? 'active' : ''}`}
                    onClick={() => setActiveTab('normalization')}
                >
                    <FaCog /> Normalization
                </button>
            </div>

            <div className="settings-content">
                {activeTab === 'general' && (
                    <div className="general-settings">
                        <h2>General Settings</h2>
                        
                        <div className="form-group">
                            <label>Project Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="Enter project name"
                            />
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Enter project description"
                                rows={4}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                >
                                    <option value="setup">Setup</option>
                                    <option value="active">Active</option>
                                    <option value="completed">Completed</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Deadline</label>
                                <input
                                    type="date"
                                    name="deadline"
                                    value={formData.deadline}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Quality Threshold ({Math.round(formData.quality_threshold * 100)}%)</label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={formData.quality_threshold}
                                onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    quality_threshold: parseFloat(e.target.value) 
                                }))}
                            />
                        </div>

                        {/* Project Actions */}
                        <div className="project-actions">
                            <h3>Project Actions</h3>
                            
                            {formData.status === 'setup' && (
                                <div className="action-item">
                                    <div className="action-info">
                                        <h4>Activate Project</h4>
                                        <p>Make this project active and ready for video assignment and annotation.</p>
                                    </div>
                                    <button 
                                        className="action-button activate"
                                        onClick={handleActivateProject}
                                    >
                                        <FaPlay /> Activate Project
                                    </button>
                                </div>
                            )}

                            {formData.status !== 'archived' && (
                                <div className="action-item">
                                    <div className="action-info">
                                        <h4>Archive Project</h4>
                                        <p>Archive this project. It will be hidden from the main dashboard but can be restored.</p>
                                    </div>
                                    <button 
                                        className="action-button archive"
                                        onClick={() => setShowArchiveConfirm(true)}
                                    >
                                        <FaArchive /> Archive Project
                                    </button>
                                </div>
                            )}

                            <div className="action-item danger">
                                <div className="action-info">
                                    <h4>Delete Project</h4>
                                    <p>Permanently delete this project and all associated data. This action cannot be undone.</p>
                                </div>
                                <button 
                                    className="action-button delete"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    <FaTrash /> Delete Project
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'team' && (
                    <div className="team-settings">
                        <h2>Team Members</h2>
                        
                        <div className="add-member-form">
                            <input
                                type="email"
                                placeholder="Enter email address"
                                value={newMemberEmail}
                                onChange={(e) => setNewMemberEmail(e.target.value)}
                            />
                            <select
                                value={newMemberRole}
                                onChange={(e) => setNewMemberRole(e.target.value)}
                            >
                                <option value="member">Member</option>
                                <option value="lead">Lead</option>
                            </select>
                            <button onClick={handleAddMember}>
                                <FaUserPlus /> Add Member
                            </button>
                        </div>

                        <div className="members-list">
                            {project.members && project.members.map(member => (
                                <div key={member.membership_id} className="member-item">
                                    <div className="member-info">
                                        <h4>{member.full_name || member.username}</h4>
                                        <p>{member.email}</p>
                                        <span className={`role ${member.role}`}>{member.role}</span>
                                    </div>
                                    <div className="member-stats">
                                        <span>{member.videos_assigned || 0} assigned</span>
                                        <span>{member.videos_completed || 0} completed</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'schema' && (
                    <div className="schema-settings">
                        <h2>Annotation Schema</h2>
                        
                        <div className="form-group">
                            <label>Temporal Labels (comma-separated)</label>
                            <input
                                type="text"
                                value={formData.annotation_schema.temporal_labels.join(', ')}
                                onChange={(e) => handleSchemaChange('temporal_labels', e.target.value)}
                                placeholder="e.g., fall, near-fall, normal"
                            />
                            <small>Labels that annotators can use for temporal events</small>
                        </div>

                        <div className="form-group">
                            <label>Body Parts (comma-separated)</label>
                            <input
                                type="text"
                                value={formData.annotation_schema.body_parts.join(', ')}
                                onChange={(e) => handleSchemaChange('body_parts', e.target.value)}
                                placeholder="e.g., head, shoulder, hip, knee, ankle"
                            />
                            <small>Body parts for bounding box annotations</small>
                        </div>
                    </div>
                )}

                {activeTab === 'normalization' && (
                    <div className="normalization-settings">
                        <h2>Default Video Normalization</h2>
                        
                        <div className="form-group">
                            <label>Target Resolution</label>
                            <select
                                value={formData.normalization_settings.target_resolution}
                                onChange={(e) => handleNormalizationChange('target_resolution', e.target.value)}
                            >
                                <option value="480p">480p</option>
                                <option value="720p">720p</option>
                                <option value="1080p">1080p</option>
                                <option value="original">Original</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Target FPS</label>
                            <select
                                value={formData.normalization_settings.target_fps}
                                onChange={(e) => handleNormalizationChange('target_fps', parseInt(e.target.value))}
                            >
                                <option value="15">15 FPS</option>
                                <option value="24">24 FPS</option>
                                <option value="30">30 FPS</option>
                                <option value="60">60 FPS</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Brightness ({formData.normalization_settings.brightness})</label>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={formData.normalization_settings.brightness}
                                onChange={(e) => handleNormalizationChange('brightness', parseFloat(e.target.value))}
                            />
                        </div>

                        <div className="form-group">
                            <label>Contrast ({formData.normalization_settings.contrast})</label>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={formData.normalization_settings.contrast}
                                onChange={(e) => handleNormalizationChange('contrast', parseFloat(e.target.value))}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Delete Project?</h3>
                        <p>Are you sure you want to permanently delete "{project.name}"?</p>
                        <p className="warning">This will delete all videos, annotations, and data associated with this project. This action cannot be undone!</p>
                        <div className="modal-actions">
                            <button 
                                className="cancel-button"
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="confirm-delete-button"
                                onClick={handleDeleteProject}
                            >
                                Delete Project
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Archive Confirmation Modal */}
            {showArchiveConfirm && (
                <div className="modal-overlay" onClick={() => setShowArchiveConfirm(false)}>
                    <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Archive Project?</h3>
                        <p>Are you sure you want to archive "{project.name}"?</p>
                        <p>Archived projects are hidden from the main dashboard but can be restored later.</p>
                        <div className="modal-actions">
                            <button 
                                className="cancel-button"
                                onClick={() => setShowArchiveConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="confirm-archive-button"
                                onClick={handleArchiveProject}
                            >
                                Archive Project
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectSettings;