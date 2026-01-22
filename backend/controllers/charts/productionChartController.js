// controllers/charts/productionChartController.js
const { ProductionBatch, sequelize } = require('../../models');
const { Op } = require('sequelize');

const productionChartController = {
  // GET /api/charts/production - สำหรับ ProductionChart Component
  getProductionChart: async (req, res) => {
    try {
      const { period = '7d', startDate, endDate } = req.query;
      
      let dateCondition = {};
      let groupBy = '';
      let dateFormat = '';

      // กำหนด period และ format
      switch (period) {
        case '24h':
          dateCondition = {
            createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          };
          groupBy = "DATE_TRUNC('hour', created_at)";
          dateFormat = 'YYYY-MM-DD HH24:00';
          break;
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

      const productionData = await sequelize.query(`
        SELECT 
          ${groupBy} as date,
          TO_CHAR(${groupBy}, '${dateFormat}') as formatted_date,
          SUM(COALESCE(actual_quantity, 0)) as total_quantity,
          COUNT(*) as batch_count,
          SUM(CASE WHEN status = 'completed' THEN actual_quantity ELSE 0 END) as completed_quantity,
          SUM(CASE WHEN status = 'in_progress' THEN actual_quantity ELSE 0 END) as in_progress_quantity
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

      const chartData = productionData.map(item => ({
        date: item.formatted_date,
        totalQuantity: parseFloat(item.total_quantity) || 0,
        completedQuantity: parseFloat(item.completed_quantity) || 0,
        inProgressQuantity: parseFloat(item.in_progress_quantity) || 0,
        batchCount: parseInt(item.batch_count) || 0
      }));

      res.json({
        success: true,
        data: {
          chartData,
          summary: {
            totalProduced: chartData.reduce((sum, item) => sum + item.totalQuantity, 0),
            totalBatches: chartData.reduce((sum, item) => sum + item.batchCount, 0),
            period: period
          }
        }
      });
    } catch (error) {
      console.error('Production chart error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch production chart data',
        error: error.message
      });
    }
  }
};

module.exports = productionChartController;