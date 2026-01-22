// services/inspections/inspectionService.js - Inspection Business Logic
const { MaterialInspection, ChemicalTest, QualityStandard, QualityAlert } = require('../../models');
const NotificationService = require('../notifications/notificationService');

class InspectionService {
  // ตรวจสอบและสร้าง Quality Alert อัตโนมัติ
  static async checkQualityDeviations(inspectionType, inspectionData) {
    try {
      let shouldCreateAlert = false;
      let alertDetails = {};

      switch (inspectionType) {
        case 'material_inspection':
          if (inspectionData.overallResult === 'fail') {
            shouldCreateAlert = true;
            alertDetails = {
              alertType: 'quality_deviation',
              severity: 'high',
              title: `Material Inspection Failed: ${inspectionData.inspectionNumber}`,
              description: `Material inspection failed for batch ${inspectionData.batch?.batchNumber}`,
              processStage: 'material_inspection',
              sourceTable: 'material_inspections',
              sourceRecordId: inspectionData.id,
              batchId: inspectionData.batchId
            };
          }
          break;

        case 'chemical_test':
          if (inspectionData.overallResult === 'fail') {
            shouldCreateAlert = true;
            alertDetails = {
              alertType: 'quality_deviation',
              severity: 'critical',
              title: `Chemical Test Failed: ${inspectionData.testNumber}`,
              description: `Chemical composition does not meet specifications for ${inspectionData.materialGrade}`,
              processStage: 'chemical_test',
              sourceTable: 'chemical_tests',
              sourceRecordId: inspectionData.id,
              batchId: inspectionData.batchId
            };
          }
          break;
      }

      if (shouldCreateAlert) {
        await this.createQualityAlert(alertDetails);
      }
    } catch (error) {
      console.error('Check quality deviations error:', error);
    }
  }

  // สร้าง Quality Alert
  static async createQualityAlert(alertDetails) {
    try {
      const alertCount = await QualityAlert.count();
      const alertCode = `QA${new Date().getFullYear()}${String(alertCount + 1).padStart(6, '0')}`;

      const alert = await QualityAlert.create({
        ...alertDetails,
        alertCode,
        detectedAt: new Date(),
        status: 'open'
      });

      // ส่งการแจ้งเตือน
      await NotificationService.sendQualityAlert(alert);

      return alert;
    } catch (error) {
      console.error('Create quality alert error:', error);
      throw error;
    }
  }

  // คำนวณสถิติการตรวจสอบ
  static async calculateInspectionStats(inspectionType, period = '30d') {
    try {
      let Model;
      switch (inspectionType) {
        case 'material':
          Model = MaterialInspection;
          break;
        case 'chemical':
          Model = ChemicalTest;
          break;
        default:
          throw new Error('Invalid inspection type');
      }

      const dateCondition = this.getDateCondition(period);

      const [total, passed, failed, pending] = await Promise.all([
        Model.count({ where: dateCondition }),
        Model.count({ where: { ...dateCondition, overallResult: 'pass' } }),
        Model.count({ where: { ...dateCondition, overallResult: 'fail' } }),
        Model.count({ where: { ...dateCondition, overallResult: 'pending' } })
      ]);

      const completedInspections = passed + failed;
      const passRate = completedInspections > 0 ? (passed / completedInspections * 100) : 0;
      const failRate = completedInspections > 0 ? (failed / completedInspections * 100) : 0;

      return {
        total,
        passed,
        failed,
        pending,
        passRate: Math.round(passRate * 100) / 100,
        failRate: Math.round(failRate * 100) / 100,
        completionRate: total > 0 ? (completedInspections / total * 100) : 0
      };
    } catch (error) {
      console.error('Calculate inspection stats error:', error);
      throw error;
    }
  }

  // Helper function
  static getDateCondition(period) {
    const now = new Date();
    let startDate;

    switch (period) {
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
}

module.exports = InspectionService;