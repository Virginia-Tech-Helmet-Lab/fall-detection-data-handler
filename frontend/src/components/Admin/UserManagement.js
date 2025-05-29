import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    FaUserPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaSearch, FaFilter, 
    FaUserShield, FaUserCheck, FaUserClock, FaEye, FaEyeSlash, FaKey,
    FaDownload, FaEnvelope, FaHistory, FaSortUp, FaSortDown, FaSort
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import './UserManagement.css';

const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        admins: 0,
        annotators: 0,
        reviewers: 0,
        active: 0,
        inactive: 0
    });
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        calculateStats();
    }, [users]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5000/api/auth/users', {
                withCredentials: true,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            setUsers(response.data.users || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        const newStats = {
            total: users.length,
            admins: users.filter(u => u.role === 'admin').length,
            annotators: users.filter(u => u.role === 'annotator').length,
            reviewers: users.filter(u => u.role === 'reviewer').length,
            active: users.filter(u => u.is_active).length,
            inactive: users.filter(u => !u.is_active).length
        };
        setStats(newStats);
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        try {
            await axios.delete(`http://localhost:5000/api/auth/users/${userId}`, {
                withCredentials: true,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });
            fetchUsers();
        } catch (err) {
            console.error('Error deleting user:', err);
            alert('Failed to delete user');
        }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        try {
            await axios.put(
                `http://localhost:5000/api/auth/users/${userId}`,
                { is_active: !currentStatus },
                {
                    withCredentials: true,
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }
            );
            fetchUsers();
        } catch (err) {
            console.error('Error updating user status:', err);
            alert('Failed to update user status');
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        const matchesStatus = filterStatus === 'all' || 
                            (filterStatus === 'active' && user.is_active) ||
                            (filterStatus === 'inactive' && !user.is_active);
        
        return matchesSearch && matchesRole && matchesStatus;
    });

    const getRoleIcon = (role) => {
        switch (role) {
            case 'admin':
                return <FaUserShield className="role-icon admin" />;
            case 'reviewer':
                return <FaUserCheck className="role-icon reviewer" />;
            case 'annotator':
                return <FaUserClock className="role-icon annotator" />;
            default:
                return null;
        }
    };

    const formatLastActive = (lastActive) => {
        if (!lastActive) return 'Never';
        const date = new Date(lastActive);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
    };

    const handleViewUserDetails = (user) => {
        // Show user details in a modal or expand the row
        alert(`User Details:\n\nID: ${user.user_id}\nUsername: ${user.username}\nEmail: ${user.email}\nRole: ${user.role}\nCreated: ${new Date(user.created_at).toLocaleString()}\nLast Active: ${user.last_active ? new Date(user.last_active).toLocaleString() : 'Never'}`);
    };

    const handleResetPassword = async (user) => {
        if (!window.confirm(`Reset password for ${user.username}?`)) return;
        
        try {
            // Generate a temporary password
            const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
            
            const response = await axios.put(
                `http://localhost:5000/api/auth/users/${user.user_id}/reset-password`,
                { temporary_password: tempPassword },
                {
                    withCredentials: true,
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                }
            );
            
            alert(`Password reset successful!\n\nTemporary password: ${tempPassword}\n\nPlease share this with the user securely.`);
        } catch (error) {
            console.error('Error resetting password:', error);
            alert('Failed to reset password');
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (!sortConfig.key) return 0;
        
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const getSortIcon = (column) => {
        if (sortConfig.key !== column) return <FaSort />;
        return sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />;
    };

    const handleExportUsers = () => {
        // Create CSV content
        const headers = ['Username', 'Email', 'Full Name', 'Role', 'Status', 'Created At', 'Last Active'];
        const rows = sortedUsers.map(user => [
            user.username,
            user.email,
            user.full_name,
            user.role,
            user.is_active ? 'Active' : 'Inactive',
            new Date(user.created_at).toLocaleDateString(),
            user.last_active ? new Date(user.last_active).toLocaleDateString() : 'Never'
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleViewActivityLog = () => {
        // In a real app, this would open a modal with user activity logs
        alert('Activity Log feature coming soon!\n\nThis will show:\n• Login history\n• Password changes\n• User modifications\n• System actions');
    };

    if (loading) {
        return (
            <div className="user-management-loading">
                <div className="loading-spinner"></div>
                <p>Loading users...</p>
            </div>
        );
    }

    return (
        <div className="user-management">
            <div className="management-header">
                <div className="header-content">
                    <h1>User Management</h1>
                    <p>Manage system users and permissions</p>
                </div>
                <button className="create-user-btn" onClick={() => setShowCreateModal(true)}>
                    <FaUserPlus /> Add User
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="user-stats">
                <div className="stat-card">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Total Users</div>
                </div>
                <div className="stat-card admin">
                    <div className="stat-value">{stats.admins}</div>
                    <div className="stat-label">Admins</div>
                </div>
                <div className="stat-card annotator">
                    <div className="stat-value">{stats.annotators}</div>
                    <div className="stat-label">Annotators</div>
                </div>
                <div className="stat-card reviewer">
                    <div className="stat-value">{stats.reviewers}</div>
                    <div className="stat-label">Reviewers</div>
                </div>
                <div className="stat-card active">
                    <div className="stat-value">{stats.active}</div>
                    <div className="stat-label">Active</div>
                </div>
            </div>

            {/* Filters */}
            <div className="user-filters">
                <div className="search-box">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                <div className="filter-group">
                    <FaFilter className="filter-icon" />
                    <select 
                        value={filterRole} 
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="annotator">Annotator</option>
                        <option value="reviewer">Reviewer</option>
                    </select>
                    <select 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
                <div className="action-group">
                    <button 
                        className="export-btn"
                        onClick={handleExportUsers}
                        title="Export user list to CSV"
                    >
                        <FaDownload /> Export
                    </button>
                    <button 
                        className="activity-btn"
                        onClick={handleViewActivityLog}
                        title="View activity log"
                    >
                        <FaHistory /> Activity Log
                    </button>
                </div>
            </div>

            {/* Success/Error Messages */}
            {successMessage && (
                <div className="success-message">
                    <FaCheck /> {successMessage}
                </div>
            )}
            {error && (
                <div className="error-message">
                    <FaTimes /> {error}
                </div>
            )}

            {/* Users Table */}
            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('full_name')} className="sortable">
                                User {getSortIcon('full_name')}
                            </th>
                            <th onClick={() => handleSort('username')} className="sortable">
                                Username {getSortIcon('username')}
                            </th>
                            <th onClick={() => handleSort('email')} className="sortable">
                                Email {getSortIcon('email')}
                            </th>
                            <th onClick={() => handleSort('role')} className="sortable">
                                Role {getSortIcon('role')}
                            </th>
                            <th onClick={() => handleSort('is_active')} className="sortable">
                                Status {getSortIcon('is_active')}
                            </th>
                            <th onClick={() => handleSort('last_active')} className="sortable">
                                Last Active {getSortIcon('last_active')}
                            </th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedUsers.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="no-users">
                                    No users found matching your criteria
                                </td>
                            </tr>
                        ) : (
                            sortedUsers.map(user => (
                                <tr key={user.user_id} className={!user.is_active ? 'inactive' : ''}>
                                    <td>
                                        <div className="user-info">
                                            <div className="user-avatar">
                                                {user.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="user-name">{user.full_name}</span>
                                        </div>
                                    </td>
                                    <td>{user.username}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        <div className="role-badge">
                                            {getRoleIcon(user.role)}
                                            <span>{user.role}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            className={`status-toggle ${user.is_active ? 'active' : 'inactive'}`}
                                            onClick={() => handleToggleStatus(user.user_id, user.is_active)}
                                            disabled={user.user_id === currentUser?.user_id}
                                        >
                                            {user.is_active ? <FaCheck /> : <FaTimes />}
                                            <span>{user.is_active ? 'Active' : 'Inactive'}</span>
                                        </button>
                                    </td>
                                    <td>{formatLastActive(user.last_active)}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="action-btn view"
                                                onClick={() => handleViewUserDetails(user)}
                                                title="View details"
                                            >
                                                <FaEye />
                                            </button>
                                            <button
                                                className="action-btn edit"
                                                onClick={() => setEditingUser(user)}
                                                title="Edit user"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                className="action-btn reset-password"
                                                onClick={() => handleResetPassword(user)}
                                                title="Reset password"
                                            >
                                                <FaKey />
                                            </button>
                                            <button
                                                className="action-btn delete"
                                                onClick={() => handleDeleteUser(user.user_id)}
                                                disabled={user.user_id === currentUser?.user_id}
                                                title={user.user_id === currentUser?.user_id ? "Cannot delete yourself" : "Delete user"}
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit User Modal */}
            {(showCreateModal || editingUser) && (
                <UserModal
                    user={editingUser}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingUser(null);
                    }}
                    onSuccess={(message) => {
                        setShowCreateModal(false);
                        setEditingUser(null);
                        setSuccessMessage(message || 'User saved successfully!');
                        // Small delay to ensure backend has processed the change
                        setTimeout(() => {
                            fetchUsers();
                        }, 100);
                        // Clear success message after 3 seconds
                        setTimeout(() => setSuccessMessage(null), 3000);
                    }}
                />
            )}
        </div>
    );
};

// User Modal Component
const UserModal = ({ user, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        full_name: user?.full_name || '',
        role: user?.role || 'annotator',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate passwords for new users
        if (!user && formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        if (!user && formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const payload = {
                username: formData.username,
                email: formData.email,
                full_name: formData.full_name,
                role: formData.role
            };

            if (!user || formData.password) {
                payload.password = formData.password;
            }

            // Log the request details
            const token = localStorage.getItem('access_token');
            console.log('Creating user with payload:', payload);
            console.log('Using token:', token ? `${token.substring(0, 20)}...` : 'No token');

            if (user) {
                // Update existing user
                await axios.put(
                    `http://localhost:5000/api/auth/users/${user.user_id}`,
                    payload,
                    {
                        withCredentials: true,
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                        }
                    }
                );
            } else {
                // Create new user
                const response = await axios.post(
                    'http://localhost:5000/api/auth/register',
                    payload,
                    {
                        withCredentials: true,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                        }
                    }
                );
                console.log('User created successfully:', response.data);
            }

            // Pass success message based on action
            const successMsg = user 
                ? `User ${formData.username} updated successfully!`
                : `User ${formData.username} created successfully!`;
            onSuccess(successMsg);
        } catch (err) {
            console.error('Error saving user:', err);
            console.error('Error response:', err.response?.data);
            console.error('Error status:', err.response?.status);
            
            // Extract error message from response
            let errorMessage = 'Failed to save user';
            if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.response?.data) {
                errorMessage = JSON.stringify(err.response.data);
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{user ? 'Edit User' : 'Create New User'}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="user-form">
                    {error && (
                        <div className="form-error">
                            <FaTimes /> {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label>Full Name *</label>
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            required
                            className="form-control"
                        />
                    </div>

                    <div className="form-group">
                        <label>Username *</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                            className="form-control"
                            disabled={user !== null}
                        />
                    </div>

                    <div className="form-group">
                        <label>Email *</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="form-control"
                        />
                    </div>

                    <div className="form-group">
                        <label>Role *</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="form-control"
                        >
                            <option value="annotator">Annotator</option>
                            <option value="reviewer">Reviewer</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    {!user && (
                        <>
                            <div className="form-group">
                                <label>Password *</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    className="form-control"
                                    minLength={6}
                                />
                            </div>

                            <div className="form-group">
                                <label>Confirm Password *</label>
                                <input
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                    className="form-control"
                                />
                            </div>
                        </>
                    )}

                    {user && (
                        <div className="form-group">
                            <label>New Password (leave blank to keep current)</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="form-control"
                                minLength={6}
                            />
                        </div>
                    )}

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : (user ? 'Update User' : 'Create User')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserManagement;