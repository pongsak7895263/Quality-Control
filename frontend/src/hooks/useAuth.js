// hooks/useAuth.js
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.0.26:5000';


// Create Auth Context
const AuthContext = createContext(null);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [state, setState] = useState({
        user: null,
        token: null,
        isAuthenticated: false,
        loading: true,
        error: null
    });

    // Initialize auth state from localStorage
    useEffect(() => {
        const initAuth = () => {
            try {
                const token = localStorage.getItem('authToken');
                const userStr = localStorage.getItem('user');
                
                if (token && userStr) {
                    const user = JSON.parse(userStr);
                    setState({
                        user,
                        token,
                        isAuthenticated: true,
                        loading: false,
                        error: null
                    });
                } else {
                    setState(prev => ({ ...prev, loading: false }));
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setState(prev => ({ ...prev, loading: false }));
            }
        };

        initAuth();
    }, []);

    // Login function
    const login = useCallback(async (identifier, password) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const { token, user } = data.data;
                
                localStorage.setItem('authToken', token);
                localStorage.setItem('user', JSON.stringify(user));

                setState({
                    user,
                    token,
                    isAuthenticated: true,
                    loading: false,
                    error: null
                });

                navigate('/dashboard');
                return { success: true };
            } else {
                const errorMessage = data.message || 'Login failed';
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: errorMessage
                }));
                return { success: false, error: errorMessage };
            }
        } catch (error) {
            const errorMessage = 'Network error. Please check your connection.';
            setState(prev => ({
                ...prev,
                loading: false,
                error: errorMessage
            }));
            return { success: false, error: errorMessage };
        }
    }, [navigate]);

    // Register function
    const register = useCallback(async (userData) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setState(prev => ({ ...prev, loading: false, error: null }));
                return { success: true, message: 'Registration successful!' };
            } else {
                const errorMessage = data.message || 'Registration failed';
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: errorMessage
                }));
                return { success: false, error: errorMessage };
            }
        } catch (error) {
            const errorMessage = 'Network error. Please check your connection.';
            setState(prev => ({
                ...prev,
                loading: false,
                error: errorMessage
            }));
            return { success: false, error: errorMessage };
        }
    }, []);

    // Logout function
    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        setState({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            error: null
        });

        navigate('/login');
    }, [navigate]);

    // Get profile function
    const getProfile = useCallback(async () => {
        if (!state.token) return { success: false, error: 'No token' };

        try {
            const response = await fetch(`${API_URL}/api/auth/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${state.token}`,
                    'Content-Type': 'application/json'
                },
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const updatedUser = data.data;
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setState(prev => ({ ...prev, user: updatedUser }));
                return { success: true, user: updatedUser };
            } else {
                if (response.status === 401) {
                    logout();
                }
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }, [state.token, logout]);

    // Update profile function
    const updateProfile = useCallback(async (updates) => {
        if (!state.token) return { success: false, error: 'No token' };

        try {
            const response = await fetch(`${API_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${state.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const updatedUser = data.data;
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setState(prev => ({ ...prev, user: updatedUser }));
                return { success: true, user: updatedUser };
            } else {
                if (response.status === 401) {
                    logout();
                }
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }, [state.token, logout]);

    // Change password function
    const changePassword = useCallback(async (currentPassword, newPassword) => {
        if (!state.token) return { success: false, error: 'No token' };

        try {
            const response = await fetch(`${API_URL}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${state.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                return { success: true, message: data.message };
            } else {
                if (response.status === 401) {
                    logout();
                }
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }, [state.token, logout]);

    const value = {
        ...state,
        login,
        register,
        logout,
        getProfile,
        updateProfile,
        changePassword
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

// Default export for backward compatibility
export default useAuth;