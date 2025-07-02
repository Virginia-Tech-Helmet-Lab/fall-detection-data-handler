// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Remove trailing slash if present
const API_BASE_URL = API_URL.replace(/\/$/, '');

export default API_BASE_URL;

// Helper function to build API endpoints
export const getApiUrl = (endpoint) => {
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}${cleanEndpoint}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
    // Auth
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
    REGISTER: '/api/auth/register',
    CHANGE_PASSWORD: '/api/auth/change-password',
    
    // Projects
    PROJECTS: '/api/projects',
    
    // Videos
    VIDEOS: '/api/videos',
    UPLOAD: '/api/upload',
    
    // Annotations
    ANNOTATIONS: '/api/annotations',
    TEMPORAL_ANNOTATIONS: '/api/temporal_annotations',
    BBOX_ANNOTATIONS: '/api/bbox_annotations',
    
    // Analytics
    ANALYTICS_OVERVIEW: '/api/analytics/overview',
    ANALYTICS_PROJECTS: '/api/analytics/projects',
    ANALYTICS_USERS: '/api/analytics/users',
    ANALYTICS_QUALITY: '/api/analytics/quality',
    
    // Review
    REVIEW_QUEUE: '/api/review/queue',
    REVIEW_STATISTICS: '/api/review/statistics',
    
    // Export
    EXPORT: '/api/export',
    
    // Normalization
    NORMALIZE: '/api/normalize',
};