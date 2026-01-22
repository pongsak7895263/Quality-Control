// routes/charts.js - Charts Routes
const express = require('express');
const router = express.Router();
const productionChartController = require('../controllers/charts/productionChartController');
const qualityChartController = require('../controllers/charts/qualityChartController');
const efficiencyChartController = require('../controllers/charts/efficiencyChartController');
const auth = require('../middleware/auth');
const permission = require('../middleware/permission');

// GET /api/charts/production
router.get('/production', 
  auth, 
  permission('dashboard_view'),
  productionChartController.getProductionChart
);

// GET /api/charts/quality
router.get('/quality', 
  auth, 
  permission('dashboard_view'),
  qualityChartController.getQualityChart
);

// GET /api/charts/efficiency
router.get('/efficiency', 
  auth, 
  permission('dashboard_view'),
  efficiencyChartController.getEfficiencyChart
);

module.exports = router;