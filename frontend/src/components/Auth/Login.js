import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaUser, FaLock, FaSignInAlt, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Login = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { login, error, clearError } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Get the intended destination or default to home
    const from = location.state?.from?.pathname || '/';

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear any existing errors when user starts typing
        if (error) {
            clearError();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const result = await login(formData.username, formData.password);
        
        if (result.success) {
            // Redirect to intended page or home
            navigate(from, { replace: true });
        }
        
        setIsLoading(false);
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>Fall Detection Data Handler</h1>
                    <h2>Sign In</h2>
                    <p>Access the annotation platform</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && (
                        <div className="auth-error">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="username">
                            <FaUser /> Username or Email
                        </label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            placeholder="Enter your username or email"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">
                            <FaLock /> Password
                        </label>
                        <div className="password-input-container">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="Enter your password"
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={togglePasswordVisibility}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="auth-submit-button"
                        disabled={isLoading || !formData.username || !formData.password}
                    >
                        {isLoading ? (
                            <>Signing in...</>
                        ) : (
                            <>
                                <FaSignInAlt /> Sign In
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <div className="demo-credentials">
                        <h4>Demo Credentials</h4>
                        <p><strong>Admin:</strong> admin / admin123</p>
                        <small>Default credentials for testing</small>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;