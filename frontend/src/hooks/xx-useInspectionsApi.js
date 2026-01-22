// src/hooks/useInspectionsApi.js
import { useState, useCallback } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const useInspectionsApi = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const apiCall = useCallback(async (endpoint, options = {}) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");
            const headers = { ...options.headers };

            if (options.body instanceof FormData) {
                delete headers['Content-Type'];
            } else {
                headers['Content-Type'] = 'application/json';
            }

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            } else {
                // If no token for protected routes, throw an error early
                if (!options.isPublic) {
                    throw new Error("Access token is required.");
                }
            }
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP Error ${response.status}` }));
                throw new Error(errorData.message || "An unknown error occurred.");
            }
            
            if (response.status === 204) return null; // Handle No Content response
            
            return await response.json();

        } catch (err) {
            setError(err.message);
            throw err; // Re-throw for component-level handling
        } finally {
            setLoading(false);
        }
    }, []);

    const getInspections = (filters) => {
        const params = new URLSearchParams(filters).toString();
        return apiCall(`/api/v1/inspections?${params}`);
    };

    const getStats = () => {
        return apiCall('/api/v1/inspections/stats/summary');
    };

    const createInspection = (formData) => {
        return apiCall('/api/v1/inspections', {
            method: 'POST',
            body: formData,
        });
    };

    const updateInspection = (id, data) => {
         return apiCall(`/api/v1/inspections/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    };
    
    const deleteInspection = (id) => {
        return apiCall(`/api/v1/inspections/${id}`, {
            method: 'DELETE',
        });
    };

    return { 
        loading, 
        error, 
        getInspections, 
        getStats,
        createInspection,
        updateInspection,
        deleteInspection
    };
};

export default useInspectionsApi;