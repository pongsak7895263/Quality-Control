// src/components/debug/BackendStatus.js
import React, { useState, useEffect } from 'react';
import backendTester from '../../utils/backendTester';
import './BackendStatus.css';

const BackendStatus = () => {
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const runConnectionTest = async () => {
    setLoading(true);
    try {
      const results = await backendTester.testConnection();
      setTestResults(results);
    } catch (error) {
      setTestResults({
        api: { connected: false, error: error.message },
        websocket: { connected: false, error: error.message },
        recommendations: ['Failed to run connection test']
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runConnectionTest();
  }, []);

  const getStatusIcon = (connected) => {
    return connected ? '✅' : '❌';
  };

  const getStatusColor = (connected) => {
    return connected ? '#10b981' : '#ef4444';
  };

  return (
    <div className="backend-status">
      <div className="status-header">
        <h3>Backend Connection Status</h3>
        <button 
          className="btn btn-sm btn-secondary"
          onClick={runConnectionTest}
          disabled={loading}
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {testResults && (
        <div className="status-results">
          <div className="connection-status">
            <div className="status-item">
              <span className="status-icon">{getStatusIcon(testResults.api.connected)}</span>
              <div className="status-info">
                <strong>API Server</strong>
                <span style={{ color: getStatusColor(testResults.api.connected) }}>
                  {testResults.api.connected ? 'Connected' : 'Disconnected'}
                </span>
                {testResults.api.error && (
                  <small className="error-text">{testResults.api.error}</small>
                )}
              </div>
            </div>

            <div className="status-item">
              <span className="status-icon">{getStatusIcon(testResults.websocket.connected)}</span>
              <div className="status-info">
                <strong>WebSocket</strong>
                <span style={{ color: getStatusColor(testResults.websocket.connected) }}>
                  {testResults.websocket.connected ? 'Connected' : 'Disconnected'}
                </span>
                {testResults.websocket.error && (
                  <small className="error-text">{testResults.websocket.error}</small>
                )}
              </div>
            </div>
          </div>

          {testResults.api.endpoints && (
            <div className="endpoints-status">
              <button 
                className="toggle-details"
                onClick={() => setShowDetails(!showDetails)}
              >
                Endpoint Details {showDetails ? '↑' : '↓'}
              </button>
              
              {showDetails && (
                <div className="endpoints-list">
                  {Object.entries(testResults.api.endpoints).map(([endpoint, status]) => (
                    <div key={endpoint} className="endpoint-item">
                      <span className="endpoint-name">{endpoint}</span>
                      <span className="endpoint-status">{status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {testResults.recommendations.length > 0 && (
            <div className="recommendations">
              <h4>Recommendations:</h4>
              <ul>
                {testResults.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {(!testResults.api.connected || !testResults.websocket.connected) && (
            <div className="setup-instructions">
              <h4>Backend Setup Required:</h4>
              <div className="instructions-grid">
                <div className="instruction-section">
                  <h5>1. Backend Server</h5>
                  <ul>
                    <li>Start backend server on port 8080</li>
                    <li>Ensure CORS is configured</li>
                    <li>Implement required API endpoints</li>
                  </ul>
                </div>
                
                <div className="instruction-section">
                  <h5>2. Environment Variables</h5>
                  <div className="code-block">
                    REACT_APP_API_URL=http://localhost:8080/api<br/>
                    REACT_APP_WS_URL=ws://localhost:8080/ws
                  </div>
                </div>
              </div>
              
              <div className="helpful-commands">
                <h5>Quick Test Commands:</h5>
                <div className="command-list">
                  <code>curl http://localhost:8080/api/health</code>
                  <code>curl -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"email"}"test@test.com":"password":"test"'''</code>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BackendStatus;