// controllers/inspections/finalInspectionController.js - Final Inspection Controller
const { FinalInspection, ProductionBatch, User, MechanicalTest } = require('../../models');
const { validationResult } = require('express-validator');
const InspectionService = require('../../services/inspections/inspectionService');

const finalInspectionController = {
  // GET /api/inspections/final
  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 10, status, batchId } = req.query;
      const offset = (page - 1) * limit;
      
      let whereCondition = {};
      if (status) whereCondition.overallResult = status;
      if (batchId) whereCondition.batchId = batchId;

      const { count, rows: inspections } = await FinalInspection.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: ProductionBatch,
            as: 'batch',
            attributes: ['batchNumber', 'materialGrade', 'status', 'actualQuantity']
          },
          {
            model: User,
            as: 'inspector',
            attributes: ['firstName', 'lastName', 'employeeId']
          },
          {
            model: User,
            as: 'qaManager',
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
      console.error('Get final inspections error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch final inspections',
        error: error.message
      });
    }
  },

  // GET /api/inspections/final/:id
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const inspection = await FinalInspection.findByPk(id, {
        include: [
          {
            model: ProductionBatch,
            as: 'batch',
            include: [
              {
                model: WorkOrder,
                as: 'workOrder',
                attributes: ['workOrderNumber', 'customerName', 'productSpecification']
              }
            ]
          },
          {
            model: User,
            as: 'inspector',
            attributes: ['firstName', 'lastName', 'employeeId', 'position']
          },
          {
            model: User,
            as: 'qaManager',
            attributes: ['firstName', 'lastName', 'employeeId', 'position']
          },
          {
            model: User,
            as: 'customerWitness',
            attributes: ['firstName', 'lastName', 'employeeId']
          }
        ]
      });

      if (!inspection) {
        return res.status(404).json({
          success: false,
          message: 'Final inspection not found'
        });
      }

      res.json({
        success: true,
        data: inspection
      });
    } catch (error) {
      console.error('Get final inspection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch final inspection',
        error: error.message
      });
    }
  },

  // POST /api/inspections/final
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
      const count = await FinalInspection.count();
      inspectionData.inspectionNumber = `FI${new Date().getFullYear()}${String(count + 1).padStart(6, '0')}`;

      // Auto-calculate quantities if not provided
      if (!inspectionData.quantityRejected && inspectionData.quantityInspected && inspectionData.quantityAccepted) {
        inspectionData.quantityRejected = inspectionData.quantityInspected - inspectionData.quantityAccepted;
      }

      // Auto-evaluate overall result
      const testResults = [
        inspectionData.dimensionalInspectionResult,
        inspectionData.surfaceFinishResult,
        inspectionData.visualInspectionResult,
        inspectionData.ndtTestingResult,
        inspectionData.packagingInspectionResult,
        inspectionData.documentationCheckResult
      ].filter(result => result && result !== 'pending');

      if (testResults.length > 0) {
        inspectionData.overallResult = testResults.some(result => result === 'fail') ? 'fail' : 'pass';
      }

      const inspection = await FinalInspection.create(inspectionData);

      // Update production batch status if final inspection passes
      if (inspectionData.overallResult === 'pass') {
        await ProductionBatch.update(
          { status: 'completed' },
          { where: { id: inspectionData.batchId } }
        );
      } else if (inspectionData.overallResult === 'fail') {
        await ProductionBatch.update(
          { status: 'quality_hold' },
          { where: { id: inspectionData.batchId } }
        );
      }

      // Check for quality deviations
      await InspectionService.checkQualityDeviations('final_inspection', inspection);

      const createdInspection = await FinalInspection.findByPk(inspection.id, {
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
        message: 'Final inspection created successfully'
      });
    } catch (error) {
      console.error('Create final inspection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create final inspection',
        error: error.message
      });
    }
  },

  // PUT /api/inspections/final/:id/approve
  approve: async (req, res) => {
    try {
      const { id } = req.params;
      const { notes, generateCertificate = false } = req.body;

      const inspection = await FinalInspection.findByPk(id, {
        include: [{
          model: ProductionBatch,
          as: 'batch'
        }]
      });

      if (!inspection) {
        return res.status(404).json({
          success: false,
          message: 'Final inspection not found'
        });
      }

      const updateData = {
        qaManagerApprovalId: req.user.id,
        approvedAt: new Date(),
        notes: notes || inspection.notes
      };

      // Generate certificate if requested and inspection passed
      if (generateCertificate && inspection.overallResult === 'pass') {
        const certNumber = `CERT${new Date().getFullYear()}${String(await FinalInspection.count() + 1).padStart(6, '0')}`;
        updateData.certificateIssued = true;
        updateData.certificateNumber = certNumber;
      }

      await inspection.update(updateData);

      // Update batch status to completed if approved
      if (inspection.overallResult === 'pass') {
        await ProductionBatch.update(
          { status: 'completed' },
          { where: { id: inspection.batchId } }
        );
      }

      res.json({
        success: true,
        message: 'Final inspection approved successfully',
        data: {
          certificateNumber: updateData.certificateNumber || null,
          certificateIssued: updateData.certificateIssued || false
        }
      });
    } catch (error) {
      console.error('Approve final inspection error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve final inspection',
        error: error.message
      });
    }
  },

  // PUT /api/inspections/final/:id/ship
  markAsShipped: async (req, res) => {
    try {
      const { id } = req.params;
      const { shippingNotes } = req.body;

      const inspection = await FinalInspection.findByPk(id);
      if (!inspection) {
        return res.status(404).json({
          success: false,
          message: 'Final inspection not found'
        });
      }

      if (inspection.overallResult !== 'pass' || !inspection.qaManagerApprovalId) {
        return res.status(400).json({
          success: false,
          message: 'Can only ship approved and passed inspections'
        });
      }

      await inspection.update({
        shippedAt: new Date(),
        notes: shippingNotes ? `${inspection.notes || ''}\nShipping Notes: ${shippingNotes}` : inspection.notes
      });

      res.json({
        success: true,
        message: 'Inspection marked as shipped successfully'
      });
    } catch (error) {
      console.error('Mark as shipped error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark inspection as shipped',
        error: error.message
      });
    }
  }
};

module.exports = finalInspectionController;

// controllers/reports/reportsController.js - Reports Controller
const { ProductionBatch, MaterialInspection, ChemicalTest, FinalInspection, QualityAlert, sequelize } = require('../../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const reportsController = {
  // GET /api/reports/production-summary
  getProductionSummary: async (req, res) => {
    try {
      const { startDate, endDate, materialGrade, format = 'json' } = req.query;
      
      let whereCondition = {};
      if (startDate && endDate) {
        whereCondition.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }
      if (materialGrade) {
        whereCondition.materialGrade = materialGrade;
      }

      const batches = await ProductionBatch.findAll({
        where: whereCondition,
        include: [
          {
            model: WorkOrder,
            as: 'workOrder',
            attributes: ['workOrderNumber', 'customerName']
          },
          {
            model: ProductionLine,
            as: 'productionLine',
            attributes: ['name', 'lineCode']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      const summary = {
        totalBatches: batches.length,
        completedBatches: batches.filter(b => b.status === 'completed').length,
        totalPlannedQuantity: batches.reduce((sum, b) => sum + (parseFloat(b.plannedQuantity) || 0), 0),
        totalActualQuantity: batches.reduce((sum, b) => sum + (parseFloat(b.actualQuantity) || 0), 0),
        efficiency: 0,
        byMaterialGrade: {},
        byStatus: {}
      };

      // Calculate efficiency
      if (summary.totalPlannedQuantity > 0) {
        summary.efficiency = (summary.totalActualQuantity / summary.totalPlannedQuantity * 100).toFixed(2);
      }

      // Group by material grade
      batches.forEach(batch => {
        const grade = batch.materialGrade || 'Unknown';
        if (!summary.byMaterialGrade[grade]) {
          summary.byMaterialGrade[grade] = {
            count: 0,
            plannedQuantity: 0,
            actualQuantity: 0
          };
        }
        summary.byMaterialGrade[grade].count++;
        summary.byMaterialGrade[grade].plannedQuantity += parseFloat(batch.plannedQuantity) || 0;
        summary.byMaterialGrade[grade].actualQuantity += parseFloat(batch.actualQuantity) || 0;
      });

      // Group by status
      batches.forEach(batch => {
        const status = batch.status || 'Unknown';
        summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
      });

      const reportData = {
        summary,
        batches,
        generatedAt: new Date().toISOString(),
        period: { startDate, endDate }
      };

      if (format === 'excel') {
        return this.generateExcelReport(res, 'production-summary', reportData);
      } else if (format === 'pdf') {
        return this.generatePDFReport(res, 'production-summary', reportData);
      }

      res.json({
        success: true,
        data: reportData
      });
    } catch (error) {
      console.error('Production summary report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate production summary report',
        error: error.message
      });
    }
  },

  // GET /api/reports/quality-report
  getQualityReport: async (req, res) => {
    try {
      const { startDate, endDate, inspectionType, format = 'json' } = req.query;
      
      let dateCondition = {};
      if (startDate && endDate) {
        dateCondition.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const [materialInspections, chemicalTests, finalInspections, qualityAlerts] = await Promise.all([
        MaterialInspection.findAll({
          where: dateCondition,
          include: [{
            model: ProductionBatch,
            as: 'batch',
            attributes: ['batchNumber', 'materialGrade']
          }]
        }),
        ChemicalTest.findAll({
          where: dateCondition,
          include: [
            {
              model: TestElementResult,
              as: 'elementResults'
            },
            {
              model: ProductionBatch,
              as: 'batch',
              attributes: ['batchNumber', 'materialGrade']
            }
          ]
        }),
        FinalInspection.findAll({
          where: dateCondition,
          include: [{
            model: ProductionBatch,
            as: 'batch',
            attributes: ['batchNumber', 'materialGrade']
          }]
        }),
        QualityAlert.findAll({
          where: {
            ...dateCondition,
            status: { [Op.in]: ['open', 'investigating', 'resolved'] }
          }
        })
      ]);

      // Calculate quality metrics
      const qualityMetrics = {
        materialInspection: this.calculateInspectionMetrics(materialInspections),
        chemicalTest: this.calculateInspectionMetrics(chemicalTests),
        finalInspection: this.calculateInspectionMetrics(finalInspections),
        qualityAlerts: {
          total: qualityAlerts.length,
          bySeverity: {
            critical: qualityAlerts.filter(a => a.severity === 'critical').length,
            high: qualityAlerts.filter(a => a.severity === 'high').length,
            medium: qualityAlerts.filter(a => a.severity === 'medium').length,
            low: qualityAlerts.filter(a => a.severity === 'low').length
          },
          byStatus: {
            open: qualityAlerts.filter(a => a.status === 'open').length,
            investigating: qualityAlerts.filter(a => a.status === 'investigating').length,
            resolved: qualityAlerts.filter(a => a.status === 'resolved').length
          }
        }
      };

      const reportData = {
        summary: qualityMetrics,
        inspections: {
          material: materialInspections,
          chemical: chemicalTests,
          final: finalInspections
        },
        alerts: qualityAlerts,
        generatedAt: new Date().toISOString(),
        period: { startDate, endDate }
      };

      if (format === 'excel') {
        return this.generateExcelReport(res, 'quality-report', reportData);
      } else if (format === 'pdf') {
        return this.generatePDFReport(res, 'quality-report', reportData);
      }

      res.json({
        success: true,
        data: reportData
      });
    } catch (error) {
      console.error('Quality report error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate quality report',
        error: error.message
      });
    }
  },

  // Helper method to calculate inspection metrics
  calculateInspectionMetrics: (inspections) => {
    const total = inspections.length;
    const passed = inspections.filter(i => i.overallResult === 'pass').length;
    const failed = inspections.filter(i => i.overallResult === 'fail').length;
    const pending = inspections.filter(i => i.overallResult === 'pending').length;
    
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;
    const failRate = total > 0 ? ((failed / total) * 100).toFixed(2) : 0;

    return { total, passed, failed, pending, passRate, failRate };
  },

  // Generate Excel report
  generateExcelReport: async (res, reportType, data) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report');

      // Add headers and data based on report type
      if (reportType === 'production-summary') {
        worksheet.columns = [
          { header: 'Batch Number', key: 'batchNumber', width: 20 },
          { header: 'Material Grade', key: 'materialGrade', width: 15 },
          { header: 'Planned Qty', key: 'plannedQuantity', width: 12 },
          { header: 'Actual Qty', key: 'actualQuantity', width: 12 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Created At', key: 'createdAt', width: 20 }
        ];

        data.batches.forEach(batch => {
          worksheet.addRow({
            batchNumber: batch.batchNumber,
            materialGrade: batch.materialGrade,
            plannedQuantity: batch.plannedQuantity,
            actualQuantity: batch.actualQuantity,
            status: batch.status,
            createdAt: batch.createdAt
          });
        });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}-${Date.now()}.xlsx"`);
      
      await workbook.xlsx.write(res);
    } catch (error) {
      console.error('Excel generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate Excel report'
      });
    }
  },

  // Generate PDF report
  generatePDFReport: async (res, reportType, data) => {
    try {
      const doc = new PDFDocument();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}-${Date.now()}.pdf"`);
      
      doc.pipe(res);

      // Add title
      doc.fontSize(20).text(`${reportType.toUpperCase().replace('-', ' ')} REPORT`, 100, 100);
      
      // Add content based on report type
      if (reportType === 'production-summary') {
        doc.fontSize(14).text(`Generated: ${new Date().toLocaleString()}`, 100, 140);
        doc.text(`Total Batches: ${data.summary.totalBatches}`, 100, 160);
        doc.text(`Completed Batches: ${data.summary.completedBatches}`, 100, 180);
        doc.text(`Production Efficiency: ${data.summary.efficiency}%`, 100, 200);
      }

      doc.end();
    } catch (error) {
      console.error('PDF generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate PDF report'
      });
    }
  }
};

module.exports = reportsController;