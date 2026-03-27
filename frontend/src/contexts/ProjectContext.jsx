import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import apiClient from '../api/client';

const ProjectContext = createContext();

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};

export const ProjectProvider = ({ children }) => {
    const [projects, setProjects] = useState([]);
    const [currentProject, setCurrentProject] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchProjects = useCallback(async (includeArchived = false) => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get('/api/projects', {
                params: { include_archived: includeArchived }
            });
            setProjects(response.data.projects || []);
            return response.data.projects || [];
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to fetch projects';
            setError(message);
            return projects;
        } finally {
            setLoading(false);
        }
    }, []);

    const createProject = useCallback(async (projectData) => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.post('/api/projects', projectData);
            await fetchProjects();
            return { success: true, project: response.data.project };
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to create project';
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, [fetchProjects]);

    const updateProject = useCallback(async (projectId, updates) => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.put(`/api/projects/${projectId}`, updates);
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

    const getProjectDetails = useCallback(async (projectId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get(`/api/projects/${projectId}`);
            return { success: true, project: response.data };
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to fetch project details';
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    const assignVideosToProject = useCallback(async (projectId, videoIds) => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.post(`/api/projects/${projectId}/videos`, { video_ids: videoIds });
            return { success: true, count: response.data.assigned_count };
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to assign videos';
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    const getProjectStats = useCallback(async (projectId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get(`/api/projects/${projectId}/stats`);
            return { success: true, stats: response.data };
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to fetch statistics';
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    const switchProject = useCallback((project) => {
        setCurrentProject(project);
        if (project) {
            localStorage.setItem('currentProjectId', project.project_id);
        } else {
            localStorage.removeItem('currentProjectId');
        }
    }, []);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const value = {
        projects, currentProject, loading, error,
        fetchProjects, createProject, updateProject, getProjectDetails,
        assignVideosToProject, getProjectStats, switchProject,
        clearError: () => setError(null),
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};

export default ProjectContext;
