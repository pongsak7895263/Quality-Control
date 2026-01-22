// routes/index.js - Main Routes
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const dashboardRoutes = require('./dashboard');
const inspectionsRoutes = require('./inspections');
const chartsRoutes = require('./charts');
const reportsRoutes = require('./reports');
const settingsRoutes = require('./settings');

// API Routes
router.use('/api/v1/auth', authRoutes);
router.use('/api/v1/dashboard', dashboardRoutes);
router.use('/api/v1/inspections', inspectionsRoutes);
router.use('/api/v1/charts', chartsRoutes);
router.use('/api/v1/reports', reportsRoutes);
router.use('/api/v1/settings', settingsRoutes);

// Health check
router.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0'
  });
});

module.exports = router;