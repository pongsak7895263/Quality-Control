// controllers/inspections/billetInspectionController.js - Billet Inspection Controller
const { BilletInspection, ProductionBatch, User } = require('../../models');
const { validationResult } = require('express-validator');
const InspectionService = require('../../services/inspections/inspectionService');

const billetInspectionController = {
  // GET /api/inspections/billet
  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 10, status, batchId } = req.query;
      const offset = (page - 1) * limit;
      
      let whereCondition = {};
      if (status) whereCondition.overallResult = status;
      if (batchId) whereCondition.batchId = batchId;

      const { count, rows: inspections } = await BilletInspection.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: ProductionBatch,
            as: 'batch',
            attributes: ['batchNumber', 'materialGrade', 'status']
          },
          {
            model: User,
            as: 'inspector',
            attributes: ['firstName', 'lastName', 'employeeId']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: offset
      });

      res.json({
        success: true,
        data: {
          inspections,
          pagination: {
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get billet inspections error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch billet inspections',
        error: error.message
      });
    }
  },

  // GET /api/inspections/billet/:id
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const inspection = await BilletInspection.findByPk(id, {
        include: [
          {
            model: ProductionBatch,
            as: 'batch',
            attributes: ['batchNumber', 'materialGrade', 'plannedQuantity']
          },
          {
            model: User,
            as: 'inspector',
            attributes: ['firstName', 'lastName', 'employeeId', 'position']
          },
          {
            model: User,
            as: 'approver',
            attributes: ['firstName', 'lastName', 'employeeId', 'position']
          }
        ]
      });

      if (!inspection) {
        return res.status(404).json({
          success: false,
          message: 'Billet inspection not found'
        });
      }

      res.json({
        success: true,
        data: inspection
      });
    } catch (error) {
      console.error('Get billet inspection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch billet inspection',
        error: error.message
      });
    }
  },

  // POST /api/inspections/billet
  create: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const inspectionData = {
        ...req.body,
        inspectorId: req.user.id,
        inspectedAt: new Date()
      };

      // Generate inspection number
      const count = await BilletInspection.count();
      inspectionData.inspectionNumber = `BI${new Date().getFullYear()}${String(count + 1).padStart(6, '0')}`;

      // Auto-evaluate overall result based on individual results
      const results = [
        inspectionData.ultrasonicTestResult,
        inspectionData.magneticParticleResult
      ].filter(result => result && result !== 'pending');

      if (results.length > 0) {
        inspectionData.overallResult = results.some(result => result === 'fail') ? 'fail' : 'pass';
      }

      const inspection = await BilletInspection.create(inspectionData);

      // Check for quality deviations and create alerts if necessary
      await InspectionService.checkQualityDeviations('billet_inspection', inspection);

      const createdInspection = await BilletInspection.findByPk(inspection.id, {
        include: [
          {
            model: ProductionBatch,
            as: 'batch',
            attributes: ['batchNumber', 'materialGrade']
          },
          {
            model: User,
            as: 'inspector',
            attributes: ['firstName', 'lastName']
          }
        ]
      });

      res.status(201).json({
        success: true,
        data: createdInspection,
        message: 'Billet inspection created successfully'
      });
    } catch (error) {
      console.error('Create billet inspection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create billet inspection',
        error: error.message
      });
    }
  },

  // PUT /api/inspections/billet/:id
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const inspection = await BilletInspection.findByPk(id);
      if (!inspection) {
        return res.status(404).json({
          success: false,
          message: 'Billet inspection not found'
        });
      }

      // Check permissions
      if (inspection.inspectorId !== req.user.id && !req.user.role?.permissions?.includes('billet_inspection_edit')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to edit this inspection'
        });
      }

      // Re-evaluate overall result if test results changed
      if (updateData.ultrasonicTestResult || updateData.magneticParticleResult) {
        const results = [
          updateData.ultrasonicTestResult || inspection.ultrasonicTestResult,
          updateData.magneticParticleResult || inspection.magneticParticleResult
        ].filter(result => result && result !== 'pending');

        if (results.length > 0) {
          updateData.overallResult = results.some(result => result === 'fail') ? 'fail' : 'pass';
        }
      }

      await inspection.update(updateData);

      const updatedInspection = await BilletInspection.findByPk(id, {
        include: [
          {
            model: ProductionBatch,
            as: 'batch',
            attributes: ['batchNumber', 'materialGrade']
          },
          {
            model: User,
            as: 'inspector',
            attributes: ['firstName', 'lastName']
          }
        ]
      });

      res.json({
        success: true,
        data: updatedInspection,
        message: 'Billet inspection updated successfully'
      });
    } catch (error) {
      console.error('Update billet inspection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update billet inspection',
        error: error.message
      });
    }
  },

  // PUT /api/inspections/billet/:id/approve
  approve: async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const inspection = await BilletInspection.findByPk(id);
      if (!inspection) {
        return res.status(404).json({
          success: false,
          message: 'Billet inspection not found'
        });
      }

      await inspection.update({
        approvedBy: req.user.id,
        approvedAt: new Date(),
        notes: notes || inspection.notes
      });

      res.json({
        success: true,
        message: 'Billet inspection approved successfully'
      });
    } catch (error) {
      console.error('Approve billet inspection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve billet inspection',
        error: error.message
      });
    }
  }
};

module.exports = billetInspectionController;