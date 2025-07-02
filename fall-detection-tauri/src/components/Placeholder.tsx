import React from 'react';

interface PlaceholderProps {
    title: string;
    description?: string;
    icon?: string;
}

const Placeholder: React.FC<PlaceholderProps> = ({ title, description, icon = "🚧" }) => {
    return (
        <div className="placeholder-container">
            <div className="placeholder-content">
                <div className="placeholder-icon">{icon}</div>
                <h1>{title}</h1>
                {description && <p>{description}</p>}
                <div className="placeholder-note">
                    <p><strong>Note:</strong> This component is being migrated from the original web application.</p>
                    <p>The full functionality will be available once the component is properly adapted for Tauri.</p>
                </div>
            </div>
        </div>
    );
};

// Individual component exports
export const ProjectDashboard: React.FC = () => (
    <Placeholder 
        title="Project Dashboard" 
        description="Manage and organize your fall detection annotation projects"
        icon="📁"
    />
);

export const ProjectCreation: React.FC = () => (
    <Placeholder 
        title="Create New Project" 
        description="Set up a new fall detection annotation project"
        icon="➕"
    />
);

export const ProjectSettings: React.FC = () => (
    <Placeholder 
        title="Project Settings" 
        description="Configure project parameters and team access"
        icon="⚙️"
    />
);

export const UserManagement: React.FC = () => (
    <Placeholder 
        title="User Management" 
        description="Manage system users and permissions"
        icon="👥"
    />
);

export const DataImport: React.FC = () => (
    <Placeholder 
        title="Data Import" 
        description="Import video files using native file dialogs"
        icon="📥"
    />
);

export const NormalizationPanel: React.FC = () => (
    <Placeholder 
        title="Video Normalization" 
        description="Normalize video files for consistent processing"
        icon="🎬"
    />
);

export const LabelingInterface: React.FC = () => (
    <Placeholder 
        title="Labeling Interface" 
        description="Annotate fall detection events in video files"
        icon="🎯"
    />
);

export const ReviewDashboard: React.FC = () => (
    <Placeholder 
        title="Review Dashboard" 
        description="Review and validate annotations for quality assurance"
        icon="✅"
    />
);

export const DataExport: React.FC = () => (
    <Placeholder 
        title="Data Export" 
        description="Export annotated data in various formats"
        icon="📤"
    />
);

export const AnalyticsDashboard: React.FC = () => (
    <Placeholder 
        title="Analytics Dashboard" 
        description="View project statistics and performance metrics"
        icon="📊"
    />
);

export default Placeholder;