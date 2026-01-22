// routes/dashboard.js - Dashboard Routes
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard/dashboardController');
const auth = require('../middleware/auth');
const permission = require('../middleware/permission');

// GET /api/dashboard/stats
router.get('/stats', 
  auth, 
  permission('dashboard_view'),
  dashboardController.getStats
);

// GET /api/dashboard/recent-activity
router.get('/recent-activity', 
  auth, 
  permission('dashboard_view'),
  dashboardController.getRecentActivity
);

// GET /api/dashboard/realtime-data
router.get('/realtime-data', 
  auth, 
  permission('dashboard_view'),
  dashboardController.getRealtimeData
);

module.exports = router;
