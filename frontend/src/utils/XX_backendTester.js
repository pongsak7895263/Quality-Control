// src/utils/backendTester.js
class BackendTester {
    constructor() {
      this.apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
      this.wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws';
    }
  
    async testConnection() {
      const results = {
        api: { connected: false, error: null, endpoints: {} },
        websocket: { connected: false, error: null },
        recommendations: []
      };
  
      // Test API connection
      try {
        // Test health endpoint
        const healthResponse = await fetch(`${this.apiUrl}/health`, {
          method: 'GET',
          timeout: 5000
        });
        
        if (healthResponse.ok) {
          results.api.connected = true;
          results.api.endpoints.health = 'OK';
        } else {
          results.api.error = `Health check failed: ${healthResponse.status}`;
        }
      } catch (error) {
        results.api.error = error.message;
        
        if (error.message.includes('fetch')) {
          results.recommendations.push('Backend server is not running. Start your backend server on port 8080.');
        } else if (error.message.includes('CORS')) {
          results.recommendations.push('CORS error detected. Configure your backend to allow requests from this origin.');
        }
      }
  
      // Test auth endpoint
      try {
        const authResponse = await fetch(`${this.apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@test.com', password: 'test' })
        });
        
        results.api.endpoints.auth = authResponse.status === 401 ? 'OK (Unauthorized)' : `Status: ${authResponse.status}`;
      } catch (error) {
        results.api.endpoints.auth = 'Failed';
      }
  
      // Test WebSocket connection
      try {
        const ws = new WebSocket(this.wsUrl);
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('WebSocket connection timeout'));
          }, 5000);
  
          ws.onopen = () => {
            clearTimeout(timeout);
            results.websocket.connected = true;
            ws.close();
            resolve();
          };
  
          ws.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
        });
      } catch (error) {
        results.websocket.error = error.message;
        results.recommendations.push('WebSocket server is not running or not accessible.');
      }
  
      // Generate recommendations
      if (!results.api.connected && !results.websocket.connected) {
        results.recommendations.push('Complete backend setup required. Check the Backend API Requirements document.');
      }
  
      return results;
    }
  
    async testSpecificEndpoint(endpoint, method = 'GET', body = null) {
      try {
        const options = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          }
        };
  
        if (body) {
          options.body = JSON.stringify(body);
        }
  
        const response = await fetch(`${this.apiUrl}${endpoint}`, options);
        const data = await response.json();
  
        return {
          success: response.ok,
          status: response.status,
          data: data,
          error: response.ok ? null : data.message || data.error
        };
      } catch (error) {
        return {
          success: false,
          status: 0,
          data: null,
          error: error.message
        };
      }
    }
  
    getSetupInstructions() {
      return {
        backend: [
          '1. Install backend dependencies (Express.js, WebSocket, JWT)',
          '2. Configure CORS to allow requests from http://localhost:3000 and http://localhost:5000',
          '3. Set up authentication with JWT tokens',
          '4. Implement required API endpoints (see Backend API Requirements)',
          '5. Set up WebSocket server for real-time updates',
          '6. Start server on port 8080'
        ],
        database: [
          '1. Set up database (PostgreSQL, MySQL, or MongoDB)',
          '2. Create tables for: users, inspections, production_lines, quality_reports',
          '3. Set up database migrations',
          '4. Configure database connection in backend'
        ],
        testing: [
          '1. Test health endpoint: curl http://localhost:8080/api/health',
          '2. Test login endpoint with valid credentials',
          '3. Test WebSocket connection',
          '4. Verify CORS headers in browser network tab'
        ]
      };
    }
  }
  
  const backendTester = new BackendTester();
  export default backendTester;