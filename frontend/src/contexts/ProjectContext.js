import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const ProjectContext = createContext();

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};

export const ProjectProvider = ({ children }) => {
    const { user, token } = useAuth();
    const [projects, setProjects] = useState([]);
    const [currentProject, setCurrentProject] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Configure axios defaults for project requests
    const projectApi = axios.create({
        baseURL: 'http://localhost:5000/api/projects',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    // Add auth token to requests
    projectApi.interceptors.request.use(
        (config) => {
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Fetch all projects
    const fetchProjects = useCallback(async (includeArchived = false) => {
        console.log('=== fetchProjects called ===');
        console.log('Token available?', token ? 'Yes' : 'No');
        console.log('Token value:', token);
        
        if (!token) {
            console.log('❌ No token available, skipping fetch');
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            console.log('Fetching projects with token:', token ? 'Present' : 'Missing');
            console.log('Current user:', user);
            console.log('Making API call to:', projectApi.defaults.baseURL);
            
            const response = await projectApi.get('', {
                params: { include_archived: includeArchived }
            });
            
            console.log('Projects API response:', response.data);
            console.log('Number of projects returned:', response.data.projects?.length || 0);
            setProjects(response.data.projects || []);
            return response.data.projects || [];
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to fetch projects';
            setError(message);
            console.error('Error fetching projects:', err);
            console.error('Error details:', {
                status: err.response?.status,
                data: err.response?.data,
                headers: err.response?.headers
            });
            
            // Don't clear projects on error - keep existing ones
            return projects;
        } finally {
            setLoading(false);
        }
    }, [token]);

    // Create a new project
    const createProject = useCallback(async (projectData) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await projectApi.post('', projectData);
            const newProject = response.data.project;
            
            // Refresh the entire project list to ensure consistency
            await fetchProjects();
            
            return { success: true, project: newProject };
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to create project';
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, [fetchProjects]);

    // Update project
    const updateProject = useCallback(async (projectId, updates) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await projectApi.put(`/${projectId}`, updates);
            const updatedProject = response.data.project;
            
            setProjects(prev => prev.map(p => 
                p.project_id === projectId ? updatedProject : p
            ));
            
            if (currentProject?.project_id === projectId) {
                setCurrentProject(updatedProject);
            }
            
            return { success: true, project: updatedProject };
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to update project';
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, [currentProject]);

    // Get project details with statistics
    const getProjectDetails = useCallback(async (projectId) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await projectApi.get(`/${projectId}`);
            return { success: true, project: response.data };
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to fetch project details';
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    // Add member to project
    const addProjectMember = useCallback(async (projectId, userId, role = 'member') => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await projectApi.post(`/${projectId}/members`, {
                user_id: userId,
                role: role
            });
            return { success: true, membership: response.data.membership };
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to add member';
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    // Assign videos to project
    const assignVideosToProject = useCallback(async (projectId, videoIds) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await projectApi.post(`/${projectId}/videos`, {
                video_ids: videoIds
            });
            return { success: true, count: response.data.assigned_count };
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to assign videos';
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    // Distribute videos among members
    const distributeVideos = useCallback(async (projectId, memberIds) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await projectApi.post(`/${projectId}/assign`, {
                member_ids: memberIds
            });
            return { success: true, assignments: response.data.assignments };
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to distribute videos';
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    // Get project statistics
    const getProjectStats = useCallback(async (projectId) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await projectApi.get(`/${projectId}/stats`);
            return { success: true, stats: response.data };
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to fetch statistics';
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    // Switch current project
    const switchProject = useCallback((project) => {
        setCurrentProject(project);
        // Store in localStorage for persistence
        if (project) {
            localStorage.setItem('currentProjectId', project.project_id);
        } else {
            localStorage.removeItem('currentProjectId');
        }
    }, []);

    // Load projects on mount or when user changes
    useEffect(() => {
        if (user && token) {
            fetchProjects();
            
            // Restore current project from localStorage
            const savedProjectId = localStorage.getItem('currentProjectId');
            if (savedProjectId && projects.length > 0) {
                const savedProject = projects.find(p => p.project_id === parseInt(savedProjectId));
                if (savedProject) {
                    setCurrentProject(savedProject);
                }
            }
        } else {
            setProjects([]);
            setCurrentProject(null);
        }
    }, [user, token, fetchProjects]);

    const value = {
        // State
        projects,
        currentProject,
        loading,
        error,
        
        // Actions
        fetchProjects,
        createProject,
        updateProject,
        getProjectDetails,
        addProjectMember,
        assignVideosToProject,
        distributeVideos,
        getProjectStats,
        switchProject,
        
        // Utilities
        clearError: () => setError(null)
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};

export default ProjectContext;