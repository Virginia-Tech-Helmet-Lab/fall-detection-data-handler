import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const DockingBar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="docking-bar">
            <div className="docking-brand">
                <h2>Fall Detection</h2>
                <span>Data Handler</span>
            </div>

            <nav className="docking-nav">
                <Link 
                    to="/" 
                    className={`nav-item ${isActive('/') ? 'active' : ''}`}
                >
                    🏠 Home
                </Link>
                
                <Link 
                    to="/projects" 
                    className={`nav-item ${isActive('/projects') ? 'active' : ''}`}
                >
                    📁 Projects
                </Link>
                
                <Link 
                    to="/import" 
                    className={`nav-item ${isActive('/import') ? 'active' : ''}`}
                >
                    📥 Import
                </Link>
                
                <Link 
                    to="/labeling" 
                    className={`nav-item ${isActive('/labeling') ? 'active' : ''}`}
                >
                    🎯 Labeling
                </Link>
                
                <Link 
                    to="/review" 
                    className={`nav-item ${isActive('/review') ? 'active' : ''}`}
                >
                    ✅ Review
                </Link>
                
                <Link 
                    to="/analytics" 
                    className={`nav-item ${isActive('/analytics') ? 'active' : ''}`}
                >
                    📊 Analytics
                </Link>
                
                <Link 
                    to="/export" 
                    className={`nav-item ${isActive('/export') ? 'active' : ''}`}
                >
                    📤 Export
                </Link>

                {user?.role === 'admin' && (
                    <Link 
                        to="/users" 
                        className={`nav-item ${isActive('/users') ? 'active' : ''}`}
                    >
                        👥 Users
                    </Link>
                )}
            </nav>

            <div className="docking-user">
                {user && (
                    <>
                        <span className="user-info">
                            {user.full_name} ({user.role})
                        </span>
                        <button 
                            onClick={handleLogout}
                            className="logout-btn"
                        >
                            Logout
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default DockingBar;