import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null }) => {
    const { user, loading, isAuthenticated, hasRole } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <div className="auth-loading">
                <div className="loading-spinner"></div>
                <p>Checking authentication...</p>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated()) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check role requirements
    if (requiredRole && !hasRole(requiredRole)) {
        return (
            <div className="access-denied">
                <h2>Access Denied</h2>
                <p>You don't have permission to access this page.</p>
                <p>Required role: {requiredRole}</p>
                <p>Your role: {user?.role}</p>
            </div>
        );
    }

    // User is authenticated and has required role
    return children;
};

export default ProtectedRoute;