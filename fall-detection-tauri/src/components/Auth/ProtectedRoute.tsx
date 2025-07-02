import React, { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!user) {
        // Redirect to login page with return url
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRole && !hasRequiredRole(user.role, requiredRole)) {
        return (
            <div className="access-denied">
                <h2>Access Denied</h2>
                <p>You don't have permission to access this page.</p>
                <p>Required role: {requiredRole}</p>
                <p>Your role: {user.role}</p>
            </div>
        );
    }

    return <>{children}</>;
};

// Helper function to check role permissions
const hasRequiredRole = (userRole: string, requiredRole: string): boolean => {
    const normalizedUserRole = userRole.toLowerCase();
    const normalizedRequiredRole = requiredRole.toLowerCase();
    
    // Admin can access everything
    if (normalizedUserRole === 'admin') {
        return true;
    }
    
    // Exact role match
    if (normalizedUserRole === normalizedRequiredRole) {
        return true;
    }
    
    return false;
};

export default ProtectedRoute;