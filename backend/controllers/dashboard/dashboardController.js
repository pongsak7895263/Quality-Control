// controllers/dashboard/dashboardController.js
const { ProductionBatch, MaterialInspection, ChemicalTest, FinalInspection, QualityAlert } = require('../../models');
const { Op } = require('sequelize');

const dashboardController = {
  // GET /api/dashboard/stats - สำหรับ StatsGrid Component
  getStats: async (req, res) => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const [
        totalBatches,
        activeBatches,
        completedBatches,
        pendingInspections,
        passedInspections,
        failedInspections,
        criticalAlerts,
        monthlyProduction
      ] = await Promise.all([
        ProductionBatch.count(),
        ProductionBatch.count({ where: { status: 'in_progress' } }),
        ProductionBatch.count({ where: { status: 'completed' } }),
        MaterialInspection.count({ where: { overallResult: 'pending' } }),
        MaterialInspection.count({ where: { overallResult: 'pass' } }),
        MaterialInspection.count({ where: { overallResult: 'fail' } }),
        QualityAlert.count({ where: { severity: 'critical', status: 'open' } }),
        ProductionBatch.sum('actualQuantity', {
          where: {
            createdAt: { [Op.gte]: startOfMonth }
          }
        })
      ]);

      // คำนวณ Quality Rate
      const totalInspections = passedInspections + failedInspections;
      const qualityRate = totalInspections > 0 ? (passedInspections / totalInspections * 100).toFixed(1) : 0;

      // คำนวณ Production Efficiency
      const plannedQuantity = await ProductionBatch.sum('plannedQuantity', {
        where: { createdAt: { [Op.gte]: startOfMonth } }
      });
      const efficiency = plannedQuantity > 0 ? (monthlyProduction / plannedQuantity * 100).toFixed(1) : 0;

      res.json({
        success: true,
        data: {
          production: {
            totalBatches,
            activeBatches,
            completedBatches,
            monthlyProduction: monthlyProduction || 0,
            efficiency: parseFloat(efficiency)
          },
          quality: {
            qualityRate: parseFloat(qualityRate),
            pendingInspections,
            passedInspections,
            failedInspections,
            criticalAlerts
          }
        }
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics',
        error: error.message
      });
    }
  },

  // GET /api/dashboard/recent-activity - สำหรับ ActivityFeed Component
  getRecentActivity: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;

      const recentInspections = await MaterialInspection.findAll({
        limit,
        order: [['updatedAt', 'DESC']],
        include: [
          { model: ProductionBatch, as: 'batch', attributes: ['batchNumber'] },
          { model: User, as: 'inspector', attributes: ['firstName', 'lastName'] }
        ],
        attributes: ['id', 'inspectionNumber', 'overallResult', 'updatedAt']
      });

      const recentAlerts = await QualityAlert.findAll({
        limit,
        order: [['createdAt', 'DESC']],
        include: [
          { model: User, as: 'detector', attributes: ['firstName', 'lastName'] }
        ],
        attributes: ['id', 'alertCode', 'severity', 'title', 'status', 'createdAt']
      });

      // รวมและเรียงลำดับกิจกรรม
      const activities = [
        ...recentInspections.map(inspection => ({
          id: `inspection_${inspection.id}`,
          type: 'inspection',
          title: `Material Inspection: ${inspection.inspectionNumber}`,
          description: `Batch: ${inspection.batch?.batchNumber || 'N/A'}`,
          status: inspection.overallResult,
          user: inspection.inspector ? 
            `${inspection.inspector.firstName} ${inspection.inspector.lastName}` : 'Unknown',
          timestamp: inspection.updatedAt
        })),
        ...recentAlerts.map(alert => ({
          id: `alert_${alert.id}`,
          type: 'alert',
          title: alert.title,
          description: `Alert Code: ${alert.alertCode}`,
          status: alert.status,
          severity: alert.severity,
          user: alert.detector ? 
            `${alert.detector.firstName} ${alert.detector.lastName}` : 'System',
          timestamp: alert.createdAt
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
       .slice(0, limit);

      res.json({
        success: true,
        data: activities
      });
    } catch (error) {
      console.error('Recent activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch recent activities',
        error: error.message
      });
    }
  },

  // GET /api/dashboard/realtime-data - สำหรับ RealtimeMonitor Component
  getRealtimeData: async (req, res) => {
    try {
      const currentHour = new Date();
      currentHour.setMinutes(0, 0, 0);

      // Production Rate (ชิ้น/ชั่วโมง)
      const productionRate = await ProductionBatch.sum('actualQuantity', {
        where: {
          updatedAt: { [Op.gte]: currentHour }
        }
      }) || 0;

      // Quality Rate (%)
      const recentTests = await ChemicalTest.findAll({
        where: {
          createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        attributes: ['overallResult']
      });
      
      const passedTests = recentTests.filter(test => test.overallResult === 'pass').length;
      const qualityRate = recentTests.length > 0 ? 
        (passedTests / recentTests.length * 100) : 100;

      // Equipment Efficiency (%)
      const activeEquipment = await Equipment.count({ where: { status: 'active' } });
      const totalEquipment = await Equipment.count();
      const equipmentEfficiency = totalEquipment > 0 ? 
        (activeEquipment / totalEquipment * 100) : 0;

      res.json({
        success: true,
        data: {
          productionRate: Math.round(productionRate),
          qualityRate: Math.round(qualityRate),
          equipmentEfficiency: Math.round(equipmentEfficiency),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Realtime data error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch realtime data',
        error: error.message
      });
    }
  }
};

module.exports = dashboardController;