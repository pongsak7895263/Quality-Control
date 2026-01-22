// src/components/common/ConnectionManager.js
import React, { useState, useEffect } from 'react';
import './ConnectionManager.css';

const ConnectionManager = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [apiConnected, setApiConnected] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);

  // Check API connectivity
  const checkApiConnection = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      setApiConnected(response.ok);
      setLastCheck(new Date());
    } catch (error) {
      setApiConnected(false);
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    // Monitor online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check API connection on mount and periodically
    checkApiConnection();
    const interval = setInterval(checkApiConnection, 30000); // Check every 30s

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const showConnectionWarning = !isOnline || !apiConnected;

  return (
    <div className="connection-manager">
      {showConnectionWarning && (
        <div className="connection-warning">
          <div className="warning-content">
            <span className="warning-icon">⚠️</span>
            <div className="warning-text">
              {!isOnline ? (
                <>
                  <strong>No Internet Connection</strong>
                  <span>Please check your network connection.</span>
                </>
              ) : (
                <>
                  <strong>Backend API Unavailable</strong>
                  <span>
                    Cannot connect to server. Using offline mode.
                    {lastCheck && (
                      <span> Last checked: {lastCheck.toLocaleTimeString()}</span>
                    )}
                  </span>
                </>
              )}
            </div>
            <button 
              className="retry-button"
              onClick={checkApiConnection}
            >
              Retry
            </button>
          </div>
        </div>
      )}
      
      <div className={`app-content ${showConnectionWarning ? 'with-warning' : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default ConnectionManager;