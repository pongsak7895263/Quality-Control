// controllers/inspections/editInspection.js
const { MaterialInspection } = require('../../models');
const { validationResult } = require('express-validator');

/**
 * Update Material Inspection
 * PUT /api/v1/inspections/material/:id
 */
const editInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // ตรวจสอบว่ามี inspection นี้อยู่หรือไม่
    const inspection = await MaterialInspection.findByPk(id);
    
    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    // ตรวจสอบสิทธิ์ (ถ้าต้องการ)
    // if (inspection.userId !== userId && req.user.role !== 'admin') {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'You do not have permission to edit this inspection'
    //   });
    // }

    const {
      material_type,
      material_grade,
      batch_number,
      supplier_name,
      invoice_number,
      cer_number,
      inspector,
      inspection_quantity,
      notes,
      overall_result,
      bar_inspections,
      rod_inspections
    } = req.body;

    // อัปเดตข้อมูล
    await inspection.update({
      materialType: material_type,
      materialGrade: material_grade,
      batchNumber: batch_number,
      supplierName: supplier_name,
      invoiceNumber: invoice_number,
      cerNumber: cer_number,
      inspector: inspector,
      inspectionQuantity: inspection_quantity,
      notes: notes,
      overallResult: overall_result,
      barInspections: bar_inspections,
      rodInspections: rod_inspections,
      userId: userId || inspection.userId
    });

    console.log(`✅ Inspection ${id} updated successfully by user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Inspection updated successfully',
      data: {
        id: inspection.id,
        inspectionNumber: inspection.inspectionNumber,
        materialType: inspection.materialType,
        materialGrade: inspection.materialGrade,
        batchNumber: inspection.batchNumber,
        supplierName: inspection.supplierName,
        invoiceNumber: inspection.invoiceNumber,
        cerNumber: inspection.cerNumber,
        inspector: inspection.inspector,
        inspectionQuantity: inspection.inspectionQuantity,
        notes: inspection.notes,
        overallResult: inspection.overallResult,
        barInspections: inspection.barInspections,
        rodInspections: inspection.rodInspections,
        createdAt: inspection.createdAt,
        updatedAt: inspection.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Error updating inspection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inspection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Partially Update Inspection (PATCH)
 * PATCH /api/v1/inspections/material/:id
 */
const patchInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const inspection = await MaterialInspection.findByPk(id);
    
    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    // อัปเดตเฉพาะฟิลด์ที่ส่งมา
    const updateData = {};
    
    if (req.body.material_type !== undefined) updateData.materialType = req.body.material_type;
    if (req.body.material_grade !== undefined) updateData.materialGrade = req.body.material_grade;
    if (req.body.batch_number !== undefined) updateData.batchNumber = req.body.batch_number;
    if (req.body.supplier_name !== undefined) updateData.supplierName = req.body.supplier_name;
    if (req.body.invoice_number !== undefined) updateData.invoiceNumber = req.body.invoice_number;
    if (req.body.cer_number !== undefined) updateData.cerNumber = req.body.cer_number;
    if (req.body.inspector !== undefined) updateData.inspector = req.body.inspector;
    if (req.body.inspection_quantity !== undefined) updateData.inspectionQuantity = req.body.inspection_quantity;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.overall_result !== undefined) updateData.overallResult = req.body.overall_result;
    if (req.body.bar_inspections !== undefined) updateData.barInspections = req.body.bar_inspections;
    if (req.body.rod_inspections !== undefined) updateData.rodInspections = req.body.rod_inspections;

    await inspection.update(updateData);

    console.log(`✅ Inspection ${id} partially updated`);

    res.status(200).json({
      success: true,
      message: 'Inspection partially updated successfully',
      data: inspection
    });

  } catch (error) {
    console.error('❌ Error partially updating inspection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to partially update inspection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update Inspection Status
 * PATCH /api/v1/inspections/material/:id/status
 */
const updateInspectionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'pass', 'fail'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: pending, pass, or fail'
      });
    }

    const inspection = await MaterialInspection.findByPk(id);
    
    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    await inspection.update({ overallResult: status });

    console.log(`✅ Inspection ${id} status updated to ${status}`);

    res.status(200).json({
      success: true,
      message: 'Inspection status updated successfully',
      data: {
        id: inspection.id,
        overallResult: inspection.overallResult
      }
    });

  } catch (error) {
    console.error('❌ Error updating inspection status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inspection status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  editInspection,
  patchInspection,
  updateInspectionStatus
};