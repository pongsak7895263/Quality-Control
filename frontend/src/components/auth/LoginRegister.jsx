import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Login.css';

const LoginRegister = () => {
    const { login, register, isAuthenticated, loading: authLoading, error: authError } = useAuth();
    //const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.0.26:5000';
    const API_URL = 'http://192.168.0.26:5000';
    const [mode, setMode] = useState('login');
    const [formData, setFormData] = useState({
        identifier: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: ''
    });
    
    const [formState, setFormState] = useState({
        loading: false,
        error: '',
        success: '',
        showPassword: false,
        showConfirmPassword: false,
        serverStatus: 'checking',
    });

    useEffect(() => {
        const checkServerStatus = () => {
            fetch(`${API_URL}/health`)
                .then(response => setFormState(prev => ({ 
                    ...prev, 
                    serverStatus: response.ok ? 'online' : 'error' 
                })))
                .catch(() => setFormState(prev => ({ 
                    ...prev, 
                    serverStatus: 'offline' 
                })));
        };
        checkServerStatus();
    }, [API_URL]);

    useEffect(() => {
        setFormData({
            identifier: '',
            username: '',
            email: '',
            password: '',
            confirmPassword: '',
            firstName: '',
            lastName: ''
        });
        setFormState(prev => ({ 
            ...prev, 
            error: '', 
            success: '',
            showPassword: false,
            showConfirmPassword: false
        }));
    }, [mode]);

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formState.error || authError || formState.success) {
            setFormState(prev => ({ ...prev, error: '', success: '' }));
        }
    };

    const validateLoginForm = () => {
        if (!formData.identifier.trim()) {
            setFormState(prev => ({ ...prev, error: 'Please enter your email or username' }));
            return false;
        }
        if (!formData.password.trim()) {
            setFormState(prev => ({ ...prev, error: 'Please enter your password' }));
            return false;
        }
        return true;
    };

    const validateRegisterForm = () => {
        if (!formData.username.trim()) {
            setFormState(prev => ({ ...prev, error: 'Username is required' }));
            return false;
        }
        if (formData.username.length < 4 || formData.username.length > 20) {
            setFormState(prev => ({ ...prev, error: 'Username must be 4-20 characters' }));
            return false;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            setFormState(prev => ({ ...prev, error: 'Username can only contain letters, numbers, and underscores' }));
            return false;
        }
        if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
            setFormState(prev => ({ ...prev, error: 'Please enter a valid email' }));
            return false;
        }
        if (formData.password.length < 8) {
            setFormState(prev => ({ ...prev, error: 'Password must be at least 8 characters' }));
            return false;
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
            setFormState(prev => ({ ...prev, error: 'Password must contain uppercase, lowercase, and number' }));
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setFormState(prev => ({ ...prev, error: 'Passwords do not match' }));
            return false;
        }
        return true;
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        if (!validateLoginForm() || formState.serverStatus !== 'online') return;
        await login(formData.identifier, formData.password);
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        if (!validateRegisterForm() || formState.serverStatus !== 'online') return;

        setFormState(prev => ({ ...prev, loading: true }));

        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    firstName: formData.firstName || undefined,
                    lastName: formData.lastName || undefined,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setFormState(prev => ({ 
                    ...prev, 
                    loading: false, 
                    success: 'Registration successful! Please login.',
                    error: ''
                }));
                setTimeout(() => setMode('login'), 2000);
            } else {
                setFormState(prev => ({ 
                    ...prev, 
                    loading: false, 
                    error: data.message || 'Registration failed'
                }));
            }
        } catch (error) {
            setFormState(prev => ({ 
                ...prev, 
                loading: false, 
                error: 'Network error'
            }));
        }
    };

    const currentError = authError || formState.error;
    const isLoading = authLoading || formState.loading;

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo"><div className="logo-icon">QC</div></div>
                    <h1 className="app-title">Quality Control System</h1>
                    <p className="app-subtitle">Manufacturing Quality Control</p>
                </div>

                <div className="mode-switch">
                    <button
                        type="button"
                        className={`mode-button ${mode === 'login' ? 'active' : ''}`}
                        onClick={() => setMode('login')}
                        disabled={isLoading}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        className={`mode-button ${mode === 'register' ? 'active' : ''}`}
                        onClick={() => setMode('register')}
                        disabled={isLoading}
                    >
                        Sign Up
                    </button>
                </div>

                {currentError && (
                    <div className="error-card">
                        <span className="error-icon">⚠️</span>
                        <span className="error-text">{currentError}</span>
                    </div>
                )}

                {formState.success && (
                    <div className="success-card">
                        <span className="success-icon">✓</span>
                        <span className="success-text">{formState.success}</span>
                    </div>
                )}

                {mode === 'login' ? (
                    <form onSubmit={handleLoginSubmit} className="login-form">
                        <div className="form-group">
                            <label htmlFor="identifier">Email or Username</label>
                            <input
                                id="identifier"
                                name="identifier"
                                type="text"
                                value={formData.identifier}
                                onChange={handleInputChange}
                                className="form-input"
                                placeholder="Enter your email or username"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    id="password"
                                    name="password"
                                    type={formState.showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Enter your password"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setFormState(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                                    className="password-toggle"
                                >
                                    {formState.showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading} className="submit-button">
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegisterSubmit} className="login-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="firstName">First Name</label>
                                <input id="firstName" name="firstName" type="text" value={formData.firstName} onChange={handleInputChange} className="form-input" placeholder="First name (optional)" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="lastName">Last Name</label>
                                <input id="lastName" name="lastName" type="text" value={formData.lastName} onChange={handleInputChange} className="form-input" placeholder="Last name (optional)" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="username">Username *</label>
                            <input id="username" name="username" type="text" value={formData.username} onChange={handleInputChange} className="form-input" placeholder="4-20 characters" disabled={isLoading} />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email *</label>
                            <input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="form-input" placeholder="Enter your email" disabled={isLoading} />
                        </div>

                        <div className="form-group">
                            <label htmlFor="register-password">Password *</label>
                            <div className="password-input-wrapper">
                                <input id="register-password" name="password" type={formState.showPassword ? "text" : "password"} value={formData.password} onChange={handleInputChange} className="form-input" placeholder="Min 8 chars, 1 uppercase, 1 number" />
                                <button type="button" onClick={() => setFormState(prev => ({ ...prev, showPassword: !prev.showPassword }))} className="password-toggle">{formState.showPassword ? '🙈' : '👁️'}</button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password *</label>
                            <div className="password-input-wrapper">
                                <input id="confirmPassword" name="confirmPassword" type={formState.showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={handleInputChange} className="form-input" placeholder="Re-enter password" />
                                <button type="button" onClick={() => setFormState(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))} className="password-toggle">{formState.showConfirmPassword ? '🙈' : '👁️'}</button>
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading} className="submit-button">
                            {isLoading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default LoginRegister;