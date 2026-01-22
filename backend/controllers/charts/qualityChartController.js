// controllers/charts/qualityChartController.js
const { MaterialInspection, ChemicalTest, FinalInspection, sequelize } = require('../../models');

const qualityChartController = {
  // GET /api/charts/quality - สำหรับ QualityChart Component (Pie Chart)
  getQualityChart: async (req, res) => {
    try {
      const { period = '30d' } = req.query;
      
      let dateCondition = {};
      switch (period) {
        case '7d':
          dateCondition = {
            createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          };
          break;
        case '30d':
          dateCondition = {
            createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          };
          break;
        case '90d':
          dateCondition = {
            createdAt: { [Op.gte]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
          };
          break;
      }

      // รวมข้อมูลการตรวจสอบทุกประเภท
      const [materialResults, chemicalResults, finalResults] = await Promise.all([
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
        }),
        FinalInspection.findAll({
          where: { 
            ...dateCondition, 
            overallResult: { [Op.in]: ['pass', 'fail'] }
          },
          attributes: ['overallResult']
        })
      ]);

      // รวมผลการตรวจสอบ
      const allResults = [
        ...materialResults.map(r => r.overallResult),
        ...chemicalResults.map(r => r.overallResult),
        ...finalResults.map(r => r.overallResult)
      ];

      const passed = allResults.filter(result => result === 'pass').length;
      const failed = allResults.filter(result => result === 'fail').length;
      const total = passed + failed;

      const passRate = total > 0 ? (passed / total * 100) : 100;
      const failRate = total > 0 ? (failed / total * 100) : 0;

      const chartData = [
        { name: 'Passed', value: passed, percentage: passRate.toFixed(1) },
        { name: 'Failed', value: failed, percentage: failRate.toFixed(1) }
      ];

      // ข้อมูลแยกตามประเภทการตรวจสอบ
      const detailData = {
        materialInspection: {
          passed: materialResults.filter(r => r.overallResult === 'pass').length,
          failed: materialResults.filter(r => r.overallResult === 'fail').length
        },
        chemicalTest: {
          passed: chemicalResults.filter(r => r.overallResult === 'pass').length,
          failed: chemicalResults.filter(r => r.overallResult === 'fail').length
        },
        finalInspection: {
          passed: finalResults.filter(r => r.overallResult === 'pass').length,
          failed: finalResults.filter(r => r.overallResult === 'fail').length
        }
      };

      res.json({
        success: true,
        data: {
          chartData,
          summary: {
            totalInspections: total,
            passRate: passRate.toFixed(1),
            failRate: failRate.toFixed(1),
            period: period
          },
          detail: detailData
        }
      });
    } catch (error) {
      console.error('Quality chart error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quality chart data',
        error: error.message
      });
    }
  }
};

module.exports = qualityChartController;