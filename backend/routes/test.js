// backend/routes/test.js - Backend Test Endpoints
const express = require('express');
const router = express.Router();

// Health Check Endpoint
router.get('/health', (req, res) => {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
    }
  };
  
  console.log('✅ Health check requested:', new Date().toLocaleString());
  res.json(healthData);
});

// Database Connection Test
router.get('/api/test/database', async (req, res) => {
  try {
    // ตัวอย่างการทดสอบ Database (ปรับตาม ORM ที่ใช้)
    
    // สำหรับ PostgreSQL + pg
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    client.release();
    
    res.json({
      status: 'connected',
      timestamp: result.rows[0].current_time,
      database_version: result.rows[0].db_version,
      connection_count: pool.totalCount
    });
    
    console.log('✅ Database test successful');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: error.message,
      code: error.code
    });
  }
});

// CORS Test Endpoint
router.post('/api/test/cors', (req, res) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.CLIENT_URL || 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  };
  
  // Set CORS headers
  Object.keys(corsHeaders).forEach(header => {
    res.setHeader(header, corsHeaders[header]);
  });
  
  console.log('✅ CORS test successful, Origin:', req.headers.origin);
  
  res.json({
    status: 'cors_ok',
    origin: req.headers.origin,
    method: req.method,
    headers: corsHeaders,
    body_received: req.body
  });
});

// API Endpoints Test
router.get('/api/test/endpoints', (req, res) => {
  const availableEndpoints = [
    { method: 'GET', path: '/health', description: 'Health check' },
    { method: 'GET', path: '/api/test/database', description: 'Database connection test' },
    { method: 'POST', path: '/api/test/cors', description: 'CORS configuration test' },
    { method: 'GET', path: '/api/test/endpoints', description: 'Available endpoints list' },
    { method: 'POST', path: '/api/auth/login', description: 'User authentication' },
    { method: 'GET', path: '/api/users', description: 'Get users list' },
    { method: 'GET', path: '/api/products', description: 'Get products list' },
    { method: 'POST', path: '/api/quality-checks', description: 'Create quality check' }
  ];
  
  console.log('✅ Endpoints test requested');
  
  res.json({
    status: 'available',
    endpoints: availableEndpoints.length,
    list: availableEndpoints,
    server_time: new Date().toISOString()
  });
});

// Complete Connection Test (All in one)
router.get('/api/test/complete', async (req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };
  
  try {
    // Test 1: Basic Server
    results.tests.server = {
      status: 'success',
      message: 'Server is running',
      uptime: process.uptime()
    };
    
    // Test 2: Environment Variables
    const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'JWT_SECRET', 'CLIENT_URL'];
    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    results.tests.environment = {
      status: missingVars.length === 0 ? 'success' : 'warning',
      message: missingVars.length === 0 ? 'All required environment variables set' : `Missing: ${missingVars.join(', ')}`,
      missing_vars: missingVars
    };
    
    // Test 3: Database (simple version)
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      });
      
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      results.tests.database = {
        status: 'success',
        message: 'Database connection successful'
      };
    } catch (dbError) {
      results.tests.database = {
        status: 'error',
        message: `Database error: ${dbError.message}`
      };
    }
    
    console.log('✅ Complete test finished');
    res.json(results);
    
  } catch (error) {
    console.error('❌ Complete test failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: error.message,
      tests: results.tests
    });
  }
});

module.exports = router;

// ===========================================
// การใช้งานใน main server file (app.js หรือ server.js)
// ===========================================

/*
// app.js หรือ server.js
const express = require('express');
const cors = require('cors');
const testRoutes = require('./routes/test');

const app = express();

// CORS Configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Test Routes
app.use('/', testRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    status: 'error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check available at: http://localhost:${PORT}/health`);
  console.log(`🔧 Test endpoints available at: http://localhost:${PORT}/api/test/`);
});
*/