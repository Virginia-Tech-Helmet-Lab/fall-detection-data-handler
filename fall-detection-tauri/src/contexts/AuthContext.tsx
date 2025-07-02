import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, User } from '../services/api';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (username: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
    logout: () => Promise<void>;
    register: (userData: any) => Promise<{ success: boolean; user?: User; error?: string }>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
    checkAuthStatus: () => Promise<void>;
    isAuthenticated: () => boolean;
    hasRole: (role: string) => boolean;
    isAdmin: () => boolean;
    isAnnotator: () => boolean;
    isReviewer: () => boolean;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize user session from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('current_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Failed to parse stored user data:', error);
                localStorage.removeItem('current_user');
            }
        }
        setLoading(false);
    }, []);

    // Check authentication status on app load
    useEffect(() => {
        if (user) {
            checkAuthStatus();
        }
    }, []);

    const checkAuthStatus = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const storedUser = localStorage.getItem('current_user');
            if (storedUser) {
                const userData = JSON.parse(storedUser);
                const currentUser = await authAPI.getCurrentUser(userData.user_id);
                setUser(currentUser);
                localStorage.setItem('current_user', JSON.stringify(currentUser));
            }
        } catch (error) {
            console.log('Not authenticated or session expired');
            setUser(null);
            localStorage.removeItem('current_user');
        } finally {
            setLoading(false);
        }
    };

    const login = async (username: string, password: string) => {
        try {
            setLoading(true);
            setError(null);

            const userData = await authAPI.login({ username, password });
            
            // Store user data locally
            localStorage.setItem('current_user', JSON.stringify(userData));
            setUser(userData);

            return { success: true, user: userData };
        } catch (error) {
            const errorMessage = typeof error === 'string' ? error : 'Login failed';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local state regardless of server response
            setUser(null);
            setError(null);
            localStorage.removeItem('current_user');
        }
    };

    const register = async (userData: any) => {
        try {
            setLoading(true);
            setError(null);

            const newUser = await authAPI.register(userData);
            return { success: true, user: newUser };
        } catch (error) {
            const errorMessage = typeof error === 'string' ? error : 'Registration failed';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    const changePassword = async (currentPassword: string, newPassword: string) => {
        try {
            setLoading(true);
            setError(null);

            if (!user) {
                throw new Error('No user logged in');
            }

            await authAPI.changePassword(user.user_id, {
                current_password: currentPassword,
                new_password: newPassword
            });

            return { success: true, message: 'Password changed successfully' };
        } catch (error) {
            const errorMessage = typeof error === 'string' ? error : 'Password change failed';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // Helper functions
    const isAuthenticated = () => !!user;
    const hasRole = (role: string) => user?.role === role || user?.role === role.toUpperCase();
    const isAdmin = () => hasRole('admin') || hasRole('ADMIN');
    const isAnnotator = () => hasRole('annotator') || hasRole('ANNOTATOR');
    const isReviewer = () => hasRole('reviewer') || hasRole('REVIEWER');

    const value: AuthContextType = {
        // State
        user,
        loading,
        error,

        // Authentication functions
        login,
        logout,
        register,
        checkAuthStatus,

        // User functions
        changePassword,

        // Helper functions
        isAuthenticated,
        hasRole,
        isAdmin,
        isAnnotator,
        isReviewer,

        // Clear error
        clearError: () => setError(null)
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};