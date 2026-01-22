// hooks/index.js - Custom React Hooks for Material Inspection System

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import apiClient from '../utils/api';
//import mockData from '../data/mockData';

// ===== AUTHENTICATION HOOK =====
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const userData = localStorage.getItem('user');
          if (userData) {
            setUser(JSON.parse(userData));
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock login - in real app, call API
      const mockUser = mockData.users.find(u => u.email === credentials.email);
      if (mockUser && credentials.password === 'password') {
        const token = 'mock-jwt-token-' + Date.now();
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(mockUser));
        setUser(mockUser);
        return { success: true, user: mockUser };
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  const hasPermission = (permission) => {
    return user?.role?.permissions?.includes(permission) || false;
  };

  return {
    user,
    loading,
    error,
    login,
    logout,
    hasPermission,
    isAuthenticated: !!user
  };
};

// ===== MATERIAL INSPECTIONS HOOK =====
export const useMaterialInspections = (initialFilters = {}) => {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    materialType: '',
    supplier: '',
    inspector: '',
    lotNumber: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 10,
    ...initialFilters
  });
  const [pagination, setPagination] = useState({});

  const fetchInspections = useCallback(async (newFilters = filters) => {
    try {
      setLoading(true);
      setError(null);

      // Mock API call - replace with real API
      await mockData.simulateDelay(300);
      
      const filteredData = mockData.filterInspections(
        mockData.materialInspections,
        newFilters
      );
      
      const paginatedResult = mockData.paginateResults(
        filteredData,
        newFilters.page,
        newFilters.limit
      );

      setInspections(paginatedResult.data);
      setPagination(paginatedResult.pagination);

    } catch (error) {
      setError(error.message);
      console.error('Failed to fetch inspections:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFilters = useCallback((newFilters) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 };
    setFilters(updatedFilters);
    fetchInspections(updatedFilters);
  }, [filters, fetchInspections]);

  const changePage = useCallback((page) => {
    const updatedFilters = { ...filters, page };
    setFilters(updatedFilters);
    fetchInspections(updatedFilters);
  }, [filters, fetchInspections]);

  const changeLimit = useCallback((limit) => {
    const updatedFilters = { ...filters, limit, page: 1 };
    setFilters(updatedFilters);
    fetchInspections(updatedFilters);
  }, [filters, fetchInspections]);

  const refreshData = useCallback(() => {
    fetchInspections(filters);
  }, [filters, fetchInspections]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Initial fetch
  useEffect(() => {
    fetchInspections();
  }, []);

  return {
    inspections,
    loading,
    error,
    filters,
    pagination,
    updateFilters,
    changePage,
    changeLimit,
    refreshData
  };
};

// ===== INSPECTION DETAILS HOOK =====
export const useInspectionDetails = (inspectionId) => {
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInspectionDetails = useCallback(async () => {
    if (!inspectionId) return;

    try {
      setLoading(true);
      setError(null);

      // Mock API call
      await mockData.simulateDelay(200);
      const foundInspection = mockData.materialInspections.find(
        i => i.id === parseInt(inspectionId)
      );

      if (foundInspection) {
        setInspection(foundInspection);
      } else {
        throw new Error('Inspection not found');
      }

    } catch (error) {
      setError(error.message);
      console.error('Failed to fetch inspection details:', error);
    } finally {
      setLoading(false);
    }
  }, [inspectionId]);

  const updateInspection = useCallback((updatedData) => {
    setInspection(prev => ({ ...prev, ...updatedData }));
  }, []);

  useEffect(() => {
    fetchInspectionDetails();
  }, [fetchInspectionDetails]);

  return {
    inspection,
    loading,
    error,
    refreshInspection: fetchInspectionDetails,
    updateInspection
  };
};

// ===== REAL-TIME UPDATES HOOK =====
export const useRealTimeUpdates = (onUpdate) => {
  const eventSourceRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!onUpdate) return;

    // Setup Server-Sent Events connection
    try {
      eventSourceRef.current = apiClient.setupRealTimeUpdates((data) => {
        onUpdate(data);
      });

      if (eventSourceRef.current) {
        eventSourceRef.current.onopen = () => setConnected(true);
        eventSourceRef.current.onerror = () => setConnected(false);
      }
    } catch (error) {
      console.error('Real-time connection failed:', error);
    }

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        setConnected(false);
      }
    };
  }, [onUpdate]);

  return { connected };
};

// ===== STATISTICS HOOK =====
export const useStats = (filters = {}) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock API call
      await mockData.simulateDelay(400);
      
      const filteredInspections = mockData.filterInspections(
        mockData.materialInspections,
        filters
      );
      
      const calculatedStats = mockData.calculateStats(filteredInspections);
      
      setStats({
        ...calculatedStats,
        ...mockData.stats,
        trendsData: mockData.stats.trendsData,
        supplierPerformance: mockData.stats.supplierPerformance,
        inspectorPerformance: mockData.stats.inspectorPerformance,
        materialTypeStats: mockData.stats.materialTypeStats
      });

    } catch (error) {
      setError(error.message);
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refreshStats: fetchStats };
};

// ===== FILE UPLOAD HOOK =====
export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const uploadFiles = useCallback(async (files, type = 'general') => {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      // Simulate file upload progress
      const totalFiles = files.length;
      const uploadedFiles = [];

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        
        // Simulate upload delay
        await mockData.simulateDelay(200);
        
        // Create mock uploaded file response
        const uploadedFile = {
          id: Date.now() + i,
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          uploadedAt: new Date().toISOString()
        };
        
        uploadedFiles.push(uploadedFile);
        setProgress(((i + 1) / totalFiles) * 100);
      }

      return {
        success: true,
        data: uploadedFiles,
        message: `${totalFiles} file(s) uploaded successfully`
      };

    } catch (error) {
      setError(error.message);
      return {
        success: false,
        error: error.message
      };
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, []);

  return {
    uploading,
    progress,
    error,
    uploadFiles
  };
};

// ===== FORM VALIDATION HOOK =====
export const useFormValidation = (initialValues, validationRules) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = useCallback((fieldName, value) => {
    if (!validationRules[fieldName]) return '';

    const rules = validationRules[fieldName];
    
    for (const rule of rules) {
      const error = rule(value, values);
      if (error) return error;
    }
    
    return '';
  }, [validationRules, values]);

  const handleChange = useCallback((fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    if (touched[fieldName]) {
      const error = validate(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  }, [validate, touched]);

  const handleBlur = useCallback((fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    const error = validate(fieldName, values[fieldName]);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  }, [validate, values]);

  const validateAll = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(fieldName => {
      const error = validate(fieldName, values[fieldName]);
      newErrors[fieldName] = error;
      if (error) isValid = false;
    });

    setErrors(newErrors);
    setTouched(Object.keys(validationRules).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {}));

    return isValid;
  }, [validate, validationRules, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    isValid: Object.keys(errors).length === 0 || Object.values(errors).every(e => !e)
  };
};

// ===== LOCAL STORAGE HOOK =====
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
};

// ===== DEBOUNCE HOOK =====
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ===== PREVIOUS VALUE HOOK =====
export const usePrevious = (value) => {
  const ref = useRef();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
};

// ===== WINDOW SIZE HOOK =====
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

// ===== INTERSECTION OBSERVER HOOK =====
export const useIntersectionObserver = (elementRef, threshold = 0.1) => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [elementRef, threshold]);

  return isIntersecting;
};

// ===== INSPECTION CALCULATIONS HOOK =====
export const useInspectionCalculations = (measurements, specs) => {
  const calculatedResults = useMemo(() => {
    if (!measurements || !specs) return null;

    const results = {
      odCheck: { status: 'pending', value: null, withinTolerance: false },
      lengthCheck: { status: 'pending', value: null, withinTolerance: false },
      visualInspection: { status: 'pending', defects: [] },
      packagingCheck: { status: 'pending', issues: [] }
    };

    // OD Check calculation
    if (specs.odCheck?.required && measurements.od) {
      const tolerance = parseFloat(specs.odCheck.tolerance) || 0;
      const target = (parseFloat(specs.odCheck.minValue) + parseFloat(specs.odCheck.maxValue)) / 2;
      const diff = Math.abs(measurements.od - target);
      
      results.odCheck = {
        status: diff <= tolerance ? 'pass' : 'fail',
        value: measurements.od,
        withinTolerance: diff <= tolerance,
        deviation: diff
      };
    }

    // Length Check calculation
    if (specs.lengthCheck?.required && measurements.length) {
      const tolerance = parseFloat(specs.lengthCheck.tolerance) || 0;
      const target = (parseFloat(specs.lengthCheck.minValue) + parseFloat(specs.lengthCheck.maxValue)) / 2;
      const diff = Math.abs(measurements.length - target);
      
      results.lengthCheck = {
        status: diff <= tolerance ? 'pass' : 'fail',
        value: measurements.length,
        withinTolerance: diff <= tolerance,
        deviation: diff
      };
    }

    // Visual Inspection
    if (specs.visualInspection?.required) {
      const defects = [];
      if (measurements.hasCracks) defects.push('cracks');
      if (measurements.hasGrindingMarks) defects.push('grinding_marks');
      if (measurements.hasBurr) defects.push('burr');
      
      results.visualInspection = {
        status: defects.length === 0 ? 'pass' : 'fail',
        defects
      };
    }

    // Packaging Check
    if (specs.packagingCheck?.required) {
      const issues = [];
      if (measurements.packagingDamaged) issues.push('damaged_packaging');
      if (measurements.incorrectLabeling) issues.push('incorrect_labeling');
      
      results.packagingCheck = {
        status: issues.length === 0 ? 'pass' : 'fail',
        issues
      };
    }

    // Overall result calculation
    const allChecks = Object.values(results).filter(result => result.status !== 'pending');
    const failedChecks = allChecks.filter(result => result.status === 'fail');
    
    return {
      ...results,
      overallResult: failedChecks.length === 0 ? 'pass' : 'fail',
      passRate: allChecks.length > 0 ? ((allChecks.length - failedChecks.length) / allChecks.length * 100).toFixed(1) : 0
    };
  }, [measurements, specs]);

  return calculatedResults;
};

// ===== NOTIFICATION HOOK =====
export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now();
    const newNotification = {
      id,
      timestamp: new Date().toISOString(),
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll
  };
};

// ===== EXPORT ALL HOOKS =====
export default {
  useAuth,
  useMaterialInspections,
  useInspectionDetails,
  useRealTimeUpdates,
  useStats,
  useFileUpload,
  useFormValidation,
  useLocalStorage,
  useDebounce,
  usePrevious,
  useWindowSize,
  useIntersectionObserver,
  useInspectionCalculations,
  useNotifications
};