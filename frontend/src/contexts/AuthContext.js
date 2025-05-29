import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Configure axios defaults
    useEffect(() => {
        axios.defaults.withCredentials = true;
        axios.defaults.baseURL = 'http://localhost:5000';
        
        // Add response interceptor to handle auth errors
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    // Unauthorized - clear user data
                    setUser(null);
                    localStorage.removeItem('access_token');
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, []);

    // Check authentication status on app load
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const token = localStorage.getItem('access_token');
            if (token) {
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }

            const response = await axios.get('/api/auth/me');
            setUser(response.data.user);
        } catch (error) {
            console.log('Not authenticated or session expired');
            setUser(null);
            localStorage.removeItem('access_token');
            delete axios.defaults.headers.common['Authorization'];
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        try {
            setLoading(true);
            setError(null);

            const response = await axios.post('/api/auth/login', {
                username,
                password
            });

            const { user: userData, access_token } = response.data;
            
            // Store token and set user
            localStorage.setItem('access_token', access_token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
            setUser(userData);

            return { success: true, user: userData };
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Login failed';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await axios.post('/api/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local state regardless of server response
            setUser(null);
            setError(null);
            localStorage.removeItem('access_token');
            delete axios.defaults.headers.common['Authorization'];
        }
    };

    const register = async (userData) => {
        try {
            setLoading(true);
            setError(null);

            const response = await axios.post('/api/auth/register', userData);
            return { success: true, user: response.data.user };
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Registration failed';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    const updateUser = async (userId, userData) => {
        try {
            setLoading(true);
            setError(null);

            const response = await axios.put(`/api/auth/users/${userId}`, userData);
            
            // If updating current user, update context
            if (user && user.user_id === userId) {
                setUser(response.data.user);
            }

            return { success: true, user: response.data.user };
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Update failed';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    const getUsers = async () => {
        try {
            const response = await axios.get('/api/auth/users');
            return { success: true, users: response.data.users };
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Failed to fetch users';
            return { success: false, error: errorMessage };
        }
    };

    const deleteUser = async (userId) => {
        try {
            await axios.delete(`/api/auth/users/${userId}`);
            return { success: true };
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Failed to delete user';
            return { success: false, error: errorMessage };
        }
    };

    const changePassword = async (currentPassword, newPassword) => {
        try {
            setLoading(true);
            setError(null);

            const response = await axios.post('/api/auth/change-password', {
                current_password: currentPassword,
                new_password: newPassword
            });

            return { success: true, message: response.data.message };
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Password change failed';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    // Helper functions
    const isAuthenticated = () => !!user;
    const hasRole = (role) => user?.role === role || user?.role === role.toUpperCase();
    const isAdmin = () => hasRole('admin') || hasRole('ADMIN');
    const isAnnotator = () => hasRole('annotator') || hasRole('ANNOTATOR');
    const isReviewer = () => hasRole('reviewer') || hasRole('REVIEWER');

    const value = {
        // State
        user,
        token: localStorage.getItem('access_token'), // Add token to context
        loading,
        error,

        // Authentication functions
        login,
        logout,
        register,
        checkAuthStatus,

        // User management functions (admin only)
        updateUser,
        getUsers,
        deleteUser,

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