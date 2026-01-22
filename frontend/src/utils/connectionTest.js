// utils/connectionTest.js - Utility สำหรับทดสอบการเชื่อมต่อ
class ConnectionTester {
    constructor(serverUrl = 'http://localhost:5000') {
      this.serverUrl = serverUrl;
      this.results = {};
    }
  
    async testConnection(testName, testFunction) {
      const startTime = Date.now();
      try {
        console.log(`🔄 Testing ${testName}...`);
        const result = await testFunction();
        const duration = Date.now() - startTime;
        
        this.results[testName] = {
          status: 'success',
          duration,
          result
        };
        
        console.log(`✅ ${testName} passed (${duration}ms)`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        this.results[testName] = {
          status: 'error',
          duration,
          error: error.message
        };
        
        console.error(`❌ ${testName} failed (${duration}ms):`, error.message);
        throw error;
      }
    }
  
    async testBackendHealth() {
      return this.testConnection('Backend Health', async () => {
        const response = await fetch(`${this.serverUrl}/health`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      });
    }
  
    async testDatabase() {
      return this.testConnection('Database', async () => {
        const response = await fetch(`${this.serverUrl}/api/test/database`);
        if (!response.ok) {
          throw new Error(`Database test failed: ${response.statusText}`);
        }
        return await response.json();
      });
    }
  
    async testCORS() {
      return this.testConnection('CORS', async () => {
        const response = await fetch(`${this.serverUrl}/api/test/cors`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'http://localhost:3000'
          },
          body: JSON.stringify({ test: 'cors_check' })
        });
        
        if (!response.ok) {
          throw new Error(`CORS test failed: ${response.statusText}`);
        }
        return await response.json();
      });
    }
  
    async testAPIEndpoints() {
      return this.testConnection('API Endpoints', async () => {
        const response = await fetch(`${this.serverUrl}/api/test/endpoints`);
        if (!response.ok) {
          throw new Error(`API endpoints test failed: ${response.statusText}`);
        }
        return await response.json();
      });
    }
  
    async runAllTests() {
      console.log('\n🚀 Starting Frontend-Backend Connection Tests...\n');
      console.log(`📡 Server URL: ${this.serverUrl}\n`);
      
      try {
        // Test 1: Backend Health (Required for other tests)
        await this.testBackendHealth();
        
        // Test 2-4: Run in parallel if backend is healthy
        await Promise.allSettled([
          this.testDatabase(),
          this.testCORS(),
          this.testAPIEndpoints()
        ]);
        
      } catch (error) {
        console.error('\n❌ Critical error - Backend not accessible');
      }
      
      this.printSummary();
      return this.results;
    }
  
    printSummary() {
      console.log('\n📊 Connection Test Summary:');
      console.log('================================');
      
      const totalTests = Object.keys(this.results).length;
      const successfulTests = Object.values(this.results).filter(r => r.status === 'success').length;
      const failedTests = totalTests - successfulTests;
      
      console.log(`✅ Successful: ${successfulTests}/${totalTests}`);
      console.log(`❌ Failed: ${failedTests}/${totalTests}`);
      
      if (successfulTests === totalTests) {
        console.log('\n🎉 All tests passed! Frontend-Backend connection is working properly.');
      } else {
        console.log('\n⚠️  Some tests failed. Check the errors above.');
      }
      
      console.log('\nDetailed Results:');
      Object.entries(this.results).forEach(([test, result]) => {
        const icon = result.status === 'success' ? '✅' : '❌';
        console.log(`${icon} ${test}: ${result.duration}ms`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      });
    }
  }
  
  // Quick test function for browser console
  window.testConnection = async (serverUrl = 'http://localhost:5000') => {
    const tester = new ConnectionTester(serverUrl);
    return await tester.runAllTests();
  };
  
  // Export for Node.js usage
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConnectionTester;
  }
  
  // ===========================================
  // Node.js Standalone Test Script
  // ===========================================
  
  // test-connection.js - สำหรับรันใน terminal
  const fetch = require('node-fetch'); // npm install node-fetch@2
  
  class NodeConnectionTester {
    constructor(serverUrl = 'http://localhost:5000') {
      this.serverUrl = serverUrl;
    }
  
    async testFromNode() {
      console.log('🔧 Testing from Node.js...\n');
      
      const tests = [
        {
          name: 'Backend Health',
          url: `${this.serverUrl}/health`,
          method: 'GET'
        },
        {
          name: 'Database Test',
          url: `${this.serverUrl}/api/test/database`,
          method: 'GET'
        },
        {
          name: 'CORS Test',
          url: `${this.serverUrl}/api/test/cors`,
          method: 'POST',
          body: { test: 'node_cors_check' }
        },
        {
          name: 'API Endpoints',
          url: `${this.serverUrl}/api/test/endpoints`,
          method: 'GET'
        }
      ];
  
      for (const test of tests) {
        const startTime = Date.now();
        try {
          const options = {
            method: test.method,
            headers: { 'Content-Type': 'application/json' }
          };
          
          if (test.body) {
            options.body = JSON.stringify(test.body);
          }
          
          const response = await fetch(test.url, options);
          const duration = Date.now() - startTime;
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ ${test.name}: OK (${duration}ms)`);
            console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 200) + '...\n');
          } else {
            console.log(`❌ ${test.name}: Failed (${duration}ms)`);
            console.log(`   Status: ${response.status} ${response.statusText}\n`);
          }
        } catch (error) {
          const duration = Date.now() - startTime;
          console.log(`❌ ${test.name}: Error (${duration}ms)`);
          console.log(`   Error: ${error.message}\n`);
        }
      }
    }
  }
  
  // Run test if this file is executed directly
  if (require.main === module) {
    const tester = new NodeConnectionTester(process.argv[2]);
    tester.testFromNode();
  }
  
  // ===========================================
  // Package.json Scripts (เพิ่มใน package.json)
  // ===========================================
  
  /*
  {
    "scripts": {
      "test:connection": "node test-connection.js",
      "test:connection:prod": "node test-connection.js http://your-production-url.com",
      "dev": "concurrently \"npm run server\" \"npm run client\"",
      "server": "nodemon server.js",
      "client": "npm start",
      "test:health": "curl -X GET http://localhost:5000/health",
      "test:db": "curl -X GET http://localhost:5000/api/test/database",
      "test:cors": "curl -X POST http://localhost:5000/api/test/cors -H 'Content-Type: application/json' -d '{\"test\":\"curl_cors\"}'",
      "test:api": "curl -X GET http://localhost:5000/api/test/endpoints"
    }
  }
  */
  
  // ===========================================
  // วิธีใช้งาน:
  // ===========================================
  
  /*
  1. ใน Frontend (React Component):
     - Import และใช้ ConnectionTest component
     - หรือเปิด browser console แล้วพิมพ์: testConnection()
  
  2. ใน Terminal (Backend):
     - npm run test:connection
     - หรือ node test-connection.js
  
  3. ใช้ curl commands:
     - npm run test:health
     - npm run test:db
     - npm run test:cors
     - npm run test:api
  
  4. ใน Browser Console:
     - testConnection('http://localhost:5000')
  */