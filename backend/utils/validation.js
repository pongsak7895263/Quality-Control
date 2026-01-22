// utils/validation.js - Validation Schemas
const { body, param, query } = require('express-validator');

const validationSchemas = {
  // User validation
  createUser: [
    body('username')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .isEmail()
      .withMessage('Must be a valid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('firstName')
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ max: 50 })
      .withMessage('First name must be less than 50 characters'),
    body('lastName')
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ max: 50 })
      .withMessage('Last name must be less than 50 characters'),
    body('roleId')
      .isInt({ min: 1 })
      .withMessage('Valid role ID is required'),
    body('employeeId')
      .optional()
      .isLength({ max: 20 })
      .withMessage('Employee ID must be less than 20 characters'),
    body('department')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Department must be less than 100 characters')
  ],

  // Material inspection validation
  createMaterialInspection: [
    body('batchId')
      .isInt({ min: 1 })
      .withMessage('Valid batch ID is required'),
    body('supplierName')
      .notEmpty()
      .withMessage('Supplier name is required')
      .isLength({ max: 100 })
      .withMessage('Supplier name must be less than 100 characters'),
    body('materialType')
      .isIn(['steel_bar', 'steel_billet', 'raw_material'])
      .withMessage('Material type must be one of: steel_bar, steel_billet, raw_material'),
    body('materialGrade')
      .notEmpty()
      .withMessage('Material grade is required')
      .isLength({ max: 50 })
      .withMessage('Material grade must be less than 50 characters'),
    body('receivedQuantity')
      .isFloat({ min: 0 })
      .withMessage('Received quantity must be a positive number'),
    body('receivedDate')
      .isISO8601()
      .withMessage('Received date must be a valid date'),
    body('certificateNumber')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Certificate number must be less than 100 characters'),
    body('visualInspectionResult')
      .optional()
      .isIn(['pass', 'fail', 'pending'])
      .withMessage('Visual inspection result must be pass, fail, or pending'),
    body('dimensionalCheckResult')
      .optional()
      .isIn(['pass', 'fail', 'pending'])
      .withMessage('Dimensional check result must be pass, fail, or pending'),
    body('surfaceConditionResult')
      .optional()
      .isIn(['pass', 'fail', 'pending'])
      .withMessage('Surface condition result must be pass, fail, or pending')
  ],

  // Chemical test validation
  createChemicalTest: [
    body('sampleId')
      .notEmpty()
      .withMessage('Sample ID is required')
      .isLength({ max: 50 })
      .withMessage('Sample ID must be less than 50 characters'),
    body('testType')
      .isIn(['incoming_material', 'process_control', 'final_product'])
      .withMessage('Test type must be incoming_material, process_control, or final_product'),
    body('materialGrade')
      .notEmpty()
      .withMessage('Material grade is required'),
    body('testMethod')
      .isIn(['spectroscopy', 'wet_chemistry'])
      .withMessage('Test method must be spectroscopy or wet_chemistry'),
    body('testTemperature')
      .optional()
      .isFloat()
      .withMessage('Test temperature must be a number'),
    body('elementResults')
      .isArray({ min: 1 })
      .withMessage('At least one element result is required'),
    body('elementResults.*.elementSymbol')
      .notEmpty()
      .withMessage('Element symbol is required')
      .isLength({ max: 5 })
      .withMessage('Element symbol must be less than 5 characters'),
    body('elementResults.*.measuredValue')
      .isFloat({ min: 0 })
      .withMessage('Measured value must be a positive number'),
    body('elementResults.*.analysisMethod')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Analysis method must be less than 50 characters')
  ],

  // Quality standard validation
  createQualityStandard: [
    body('standardCode')
      .notEmpty()
      .withMessage('Standard code is required')
      .isLength({ max: 50 })
      .withMessage('Standard code must be less than 50 characters'),
    body('name')
      .notEmpty()
      .withMessage('Standard name is required')
      .isLength({ max: 100 })
      .withMessage('Standard name must be less than 100 characters'),
    body('materialGrade')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Material grade must be less than 50 characters'),
    body('processStage')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Process stage must be less than 50 characters'),
    body('parameterName')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Parameter name must be less than 100 characters'),
    body('minValue')
      .optional()
      .isFloat()
      .withMessage('Min value must be a number'),
    body('maxValue')
      .optional()
      .isFloat()
      .withMessage('Max value must be a number'),
    body('targetValue')
      .optional()
      .isFloat()
      .withMessage('Target value must be a number'),
    body('unit')
      .optional()
      .isLength({ max: 20 })
      .withMessage('Unit must be less than 20 characters'),
    body('tolerance')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Tolerance must be a positive number')
  ],

  // Parameter validation
  idParam: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID must be a positive integer')
  ],

  // Query validation
  paginationQuery: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('search')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Search term must be less than 100 characters')
  ],

  // Date range query validation
  dateRangeQuery: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO date'),
    query('period')
      .optional()
      .isIn(['24h', '7d', '30d', '90d', 'custom'])
      .withMessage('Period must be 24h, 7d, 30d, 90d, or custom')
  ]
};

module.exports = validationSchemas;

// jobs/scheduledJobs.js - Background Jobs
const cron = require('node-cron');
const { ProductionBatch, QualityAlert, AuditLog } = require('../models');
const { logger } = require('../utils/monitoring');
const emailService = require('../services/notifications/emailService');

class ScheduledJobs {
  static init() {
    // Daily quality report - every day at 8 AM
    cron.schedule('0 8 * * *', async () => {
      logger.info('Starting daily quality report generation');
      await this.generateDailyQualityReport();
    });

    // Weekly production summary - every Monday at 9 AM
    cron.schedule('0 9 * * 1', async () => {
      logger.info('Starting weekly production summary generation');
      await this.generateWeeklyProductionSummary();
    });

    // Cleanup old audit logs - every day at 2 AM
    cron.schedule('0 2 * * *', async () => {
      logger.info('Starting audit log cleanup');
      await this.cleanupOldAuditLogs();
    });

    // Check for overdue inspections - every hour
    cron.schedule('0 * * * *', async () => {
      logger.info('Checking for overdue inspections');
      await this.checkOverdueInspections();
    });

    logger.info('Scheduled jobs initialized');
  }

  static async generateDailyQualityReport() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get yesterday's quality metrics
      const [batches, alerts] = await Promise.all([
        ProductionBatch.findAll({
          where: {
            createdAt: {
              [Op.gte]: yesterday,
              [Op.lt]: today
            }
          }
        }),
        QualityAlert.findAll({
          where: {
            createdAt: {
              [Op.gte]: yesterday,
              [Op.lt]: today
            }
          }
        })
      ]);

      const reportData = {
        date: yesterday.toISOString().split('T')[0],
        totalBatches: batches.length,
        completedBatches: batches.filter(b => b.status === 'completed').length,
        qualityHoldBatches: batches.filter(b => b.status === 'quality_hold').length,
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
        highAlerts: alerts.filter(a => a.severity === 'high').length
      };

      // Send email to QA managers
      // Implementation would depend on your user management structure
      logger.info('Daily quality report generated', reportData);

    } catch (error) {
      logger.error('Failed to generate daily quality report', error);
    }
  }

  static async generateWeeklyProductionSummary() {
    try {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      const batches = await ProductionBatch.findAll({
        where: {
          createdAt: { [Op.gte]: lastWeek }
        },
        include: ['workOrder', 'productionLine']
      });

      const summary = {
        week: `${lastWeek.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`,
        totalBatches: batches.length,
        totalProduction: batches.reduce((sum, b) => sum + (parseFloat(b.actualQuantity) || 0), 0),
        efficiency: 0, // Calculate based on planned vs actual
        byProductionLine: {}
      };

      logger.info('Weekly production summary generated', summary);

    } catch (error) {
      logger.error('Failed to generate weekly production summary', error);
    }
  }

  static async cleanupOldAuditLogs() {
    try {
      const retentionDays = process.env.AUDIT_LOG_RETENTION_DAYS || 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedCount = await AuditLog.destroy({
        where: {
          createdAt: { [Op.lt]: cutoffDate }
        }
      });

      logger.info(`Cleaned up ${deletedCount} old audit log entries`);

    } catch (error) {
      logger.error('Failed to cleanup old audit logs', error);
    }
  }

  static async checkOverdueInspections() {
    try {
      // Check for batches that should have inspections but don't
      const overdueThreshold = new Date();
      overdueThreshold.setHours(overdueThreshold.getHours() - 24); // 24 hours overdue

      const overdueBatches = await ProductionBatch.findAll({
        where: {
          status: 'in_progress',
          createdAt: { [Op.lt]: overdueThreshold }
        }
      });

      for (const batch of overdueBatches) {
        // Create quality alert for overdue inspection
        await QualityAlert.create({
          alertCode: `OVERDUE${Date.now()}`,
          alertType: 'process_abnormal',
          severity: 'medium',
          title: `Overdue Inspection: Batch ${batch.batchNumber}`,
          description: `Batch ${batch.batchNumber} is overdue for inspection`,
          batchId: batch.id,
          processStage: 'inspection',
          status: 'open'
        });
      }

      if (overdueBatches.length > 0) {
        logger.warn(`Found ${overdueBatches.length} overdue inspections`);
      }

    } catch (error) {
      logger.error('Failed to check overdue inspections', error);
    }
  }
}

module.exports = ScheduledJobs;