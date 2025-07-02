import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Project } from '../services/api';

interface ProjectContextType {
    currentProject: Project | null;
    setCurrentProject: (project: Project | null) => void;
    projects: Project[];
    setProjects: (projects: Project[]) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};

interface ProjectProviderProps {
    children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);

    const value: ProjectContextType = {
        currentProject,
        setCurrentProject,
        projects,
        setProjects,
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};