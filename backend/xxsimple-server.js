const express = require('express');
const cors = require('cors');
const app = express();

// บังคับส่ง JSON เสมอ
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  console.log('✅ Health check requested');
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    server: 'Simple QC Backend'
  });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login request:', req.body);
  
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    res.json({
      success: true,
      message: 'Login successful',
      token: 'simple-token-123',
      user: { username: 'admin', role: 'admin' }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// 404 handler - ส่ง JSON เสมอ
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

const PORT = 8888;
app.listen(PORT, () => {
  console.log(`🚀 Simple Server: http://localhost:${PORT}`);
  console.log('✅ This server ONLY sends JSON!');
});
