// services/dashboard/dashboardService.js - Dashboard Business Logic
const { ProductionBatch, MaterialInspection, ChemicalTest, QualityAlert, sequelize } = require('../../models');
const { Op } = require('sequelize');

class DashboardService {
  // คำนวณ Production Efficiency
  static async calculateProductionEfficiency(period = '30d') {
    try {
      let dateCondition = this.getDateCondition(period);

      const batches = await ProductionBatch.findAll({
        where: dateCondition,
        attributes: ['plannedQuantity', 'actualQuantity', 'status']
      });

      if (batches.length === 0) {
        return { efficiency: 0, totalPlanned: 0, totalActual: 0 };
      }

      const totalPlanned = batches.reduce((sum, batch) => sum + (parseFloat(batch.plannedQuantity) || 0), 0);
      const totalActual = batches.reduce((sum, batch) => sum + (parseFloat(batch.actualQuantity) || 0), 0);
      
      const efficiency = totalPlanned > 0 ? (totalActual / totalPlanned * 100) : 0;

      return {
        efficiency: Math.round(efficiency * 100) / 100, // Round to 2 decimal places
        totalPlanned,
        totalActual,
        completedBatches: batches.filter(b => b.status === 'completed').length,
        totalBatches: batches.length
      };
    } catch (error) {
      console.error('Calculate production efficiency error:', error);
      throw error;
    }
  }

  // คำนวณ Quality Metrics
  static async calculateQualityMetrics(period = '30d') {
    try {
      let dateCondition = this.getDateCondition(period);

      const [materialInspections, chemicalTests] = await Promise.all([
        MaterialInspection.findAll({
          where: {
            ...dateCondition,
            overallResult: { [Op.in]: ['pass', 'fail'] }
          },
          attributes: ['overallResult']
        }),
        ChemicalTest.findAll({
          where: {
            ...dateCondition,
            overallResult: { [Op.in]: ['pass', 'fail'] }
          },
          attributes: ['overallResult']
        })
      ]);

      const allInspections = [...materialInspections, ...chemicalTests];
      const passed = allInspections.filter(i => i.overallResult === 'pass').length;
      const failed = allInspections.filter(i => i.overallResult === 'fail').length;
      const total = passed + failed;

      const qualityRate = total > 0 ? (passed / total * 100) : 100;
      const defectRate = total > 0 ? (failed / total * 100) : 0;

      return {
        qualityRate: Math.round(qualityRate * 100) / 100,
        defectRate: Math.round(defectRate * 100) / 100,
        totalInspections: total,
        passedInspections: passed,
        failedInspections: failed
      };
    } catch (error) {
      console.error('Calculate quality metrics error:', error);
      throw error;
    }
  }

  // คำนวณ Alert Summary
  static async getAlertSummary() {
    try {
      const alerts = await QualityAlert.findAll({
        where: { status: { [Op.in]: ['open', 'investigating'] } },
        attributes: ['severity', 'status']
      });

      const summary = {
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length,
        total: alerts.length
      };

      return summary;
    } catch (error) {
      console.error('Get alert summary error:', error);
      throw error;
    }
  }

  // Helper function สำหรับ date condition
  static getDateCondition(period) {
    const now = new Date();
    let startDate;

    switch (period) {
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }

    return {
      createdAt: { [Op.gte]: startDate }
    };
  }

  // Real-time data aggregation
  static async getRealtimeMetrics() {
    try {
      const currentHour = new Date();
      currentHour.setMinutes(0, 0, 0);

      const [hourlyProduction, recentQuality, equipmentStatus] = await Promise.all([
        // Production this hour
        ProductionBatch.sum('actualQuantity', {
          where: {
            updatedAt: { [Op.gte]: currentHour }
          }
        }),
        
        // Quality rate last 24 hours
        this.calculateQualityMetrics('24h'),
        
        // Equipment efficiency (placeholder - would integrate with actual equipment data)
        Promise.resolve({ efficiency: 85 })
      ]);

      return {
        productionRate: Math.round(hourlyProduction || 0),
        qualityRate: Math.round(recentQuality.qualityRate),
        equipmentEfficiency: Math.round(equipmentStatus.efficiency),
        timestamp: new Date().toISOString(),
        lastUpdated: currentHour.toISOString()
      };
    } catch (error) {
      console.error('Get realtime metrics error:', error);
      throw error;
    }
  }
}

module.exports = DashboardService;