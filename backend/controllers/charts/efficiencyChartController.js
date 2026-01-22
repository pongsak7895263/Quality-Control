// controllers/charts/efficiencyChartController.js - Efficiency Chart Controller
const { ProductionBatch, Equipment, sequelize } = require('../../models');
const { Op } = require('sequelize');

const efficiencyChartController = {
  // GET /api/charts/efficiency
  getEfficiencyChart: async (req, res) => {
    try {
      const { period = '30d', startDate, endDate } = req.query;
      
      let dateCondition = {};
      let groupBy = '';
      let dateFormat = '';

      // Determine period and grouping
      switch (period) {
        case '7d':
          dateCondition = {
            createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          };
          groupBy = "DATE_TRUNC('day', created_at)";
          dateFormat = 'YYYY-MM-DD';
          break;
        case '30d':
          dateCondition = {
            createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          };
          groupBy = "DATE_TRUNC('day', created_at)";
          dateFormat = 'YYYY-MM-DD';
          break;
        case '90d':
          dateCondition = {
            createdAt: { [Op.gte]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
          };
          groupBy = "DATE_TRUNC('week', created_at)";
          dateFormat = 'YYYY-WW';
          break;
        case 'custom':
          if (startDate && endDate) {
            dateCondition = {
              createdAt: { [Op.between]: [new Date(startDate), new Date(endDate)] }
            };
            groupBy = "DATE_TRUNC('day', created_at)";
            dateFormat = 'YYYY-MM-DD';
          }
          break;
      }

      // Get production efficiency data
      const efficiencyData = await sequelize.query(`
        SELECT 
          ${groupBy} as date,
          TO_CHAR(${groupBy}, '${dateFormat}') as formatted_date,
          SUM(COALESCE(planned_quantity, 0)) as total_planned,
          SUM(COALESCE(actual_quantity, 0)) as total_actual,
          CASE 
            WHEN SUM(COALESCE(planned_quantity, 0)) > 0 
            THEN ROUND((SUM(COALESCE(actual_quantity, 0)) / SUM(COALESCE(planned_quantity, 0)) * 100)::numeric, 2)
            ELSE 0 
          END as production_efficiency,
          COUNT(*) as total_batches,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_batches
        FROM production_batches 
        WHERE created_at >= :startDate
        GROUP BY ${groupBy}
        ORDER BY date ASC
      `, {
        replacements: { 
          startDate: Object.values(dateCondition.createdAt)[0] 
        },
        type: sequelize.QueryTypes.SELECT
      });

      // Get equipment efficiency data
      const equipmentEfficiencyData = await Equipment.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status']
      });

      const equipmentStats = {
        active: 0,
        maintenance: 0,
        inactive: 0,
        total: 0
      };

      equipmentEfficiencyData.forEach(item => {
        equipmentStats[item.status] = parseInt(item.dataValues.count);
        equipmentStats.total += parseInt(item.dataValues.count);
      });

      const equipmentEfficiency = equipmentStats.total > 0 ? 
        Math.round((equipmentStats.active / equipmentStats.total) * 100) : 0;

      // Format chart data
      const chartData = efficiencyData.map(item => ({
        date: item.formatted_date,
        productionEfficiency: parseFloat(item.production_efficiency) || 0,
        totalPlanned: parseFloat(item.total_planned) || 0,
        totalActual: parseFloat(item.total_actual) || 0,
        completionRate: item.total_batches > 0 ? 
          Math.round((parseInt(item.completed_batches) / parseInt(item.total_batches)) * 100) : 0
      }));

      // Calculate averages
      const avgProductionEfficiency = chartData.length > 0 ?
        Math.round(chartData.reduce((sum, item) => sum + item.productionEfficiency, 0) / chartData.length) : 0;
      
      const avgCompletionRate = chartData.length > 0 ?
        Math.round(chartData.reduce((sum, item) => sum + item.completionRate, 0) / chartData.length) : 0;

      res.json({
        success: true,
        data: {
          chartData,
          summary: {
            avgProductionEfficiency,
            avgCompletionRate,
            equipmentEfficiency,
            period: period
          },
          equipmentStats
        }
      });
    } catch (error) {
      console.error('Efficiency chart error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch efficiency chart data',
        error: error.message
      });
    }
  }
};

module.exports = efficiencyChartController;