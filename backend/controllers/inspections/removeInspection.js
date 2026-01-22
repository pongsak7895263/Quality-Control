// controllers/inspections/removeInspection.js
const { MaterialInspection } = require('../../models');
const { Op } = require('sequelize');

/**
 * Delete Single Inspection
 * DELETE /api/v1/inspections/material/:id
 */
const removeInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

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
    //     message: 'You do not have permission to delete this inspection'
    //   });
    // }

    // เก็บข้อมูลก่อนลบ (สำหรับ logging)
    const inspectionData = {
      id: inspection.id,
      inspectionNumber: inspection.inspectionNumber,
      batchNumber: inspection.batchNumber,
      supplierName: inspection.supplierName
    };

    // ลบข้อมูล
    await inspection.destroy();

    console.log(`🗑️ Inspection deleted:`, inspectionData);

    res.status(200).json({
      success: true,
      message: 'Inspection deleted successfully',
      data: {
        deletedId: id,
        deletedInspectionNumber: inspectionData.inspectionNumber
      }
    });

  } catch (error) {
    console.error('❌ Error deleting inspection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inspection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete Multiple Inspections
 * DELETE /api/v1/inspections/material/bulk
 * Body: { ids: [1, 2, 3] }
 */
const removeBulkInspections = async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user?.id;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Please provide an array of IDs'
      });
    }

    // ตรวจสอบว่ามี inspections ที่ต้องการลบหรือไม่
    const inspections = await MaterialInspection.findAll({
      where: {
        id: {
          [Op.in]: ids
        }
      }
    });

    if (inspections.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No inspections found with provided IDs'
      });
    }

    // ลบทั้งหมด
    const deletedCount = await MaterialInspection.destroy({
      where: {
        id: {
          [Op.in]: ids
        }
      }
    });

    console.log(`🗑️ Bulk delete: ${deletedCount} inspections deleted by user ${userId}`);

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${deletedCount} inspection(s)`,
      data: {
        deletedCount,
        requestedIds: ids,
        deletedIds: inspections.map(i => i.id)
      }
    });

  } catch (error) {
    console.error('❌ Error bulk deleting inspections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete inspections',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Soft Delete Inspection (Mark as deleted without removing from DB)
 * DELETE /api/v1/inspections/material/:id/soft
 */
const softDeleteInspection = async (req, res) => {
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

    // ถ้าใช้ paranoid: true ใน model, sequelize จะทำ soft delete อัตโนมัติ
    // หรือเพิ่ม field deletedAt ด้วยตัวเอง
    await inspection.update({
      deletedAt: new Date(),
      deletedBy: userId
    });

    console.log(`🗑️ Inspection ${id} soft deleted by user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Inspection marked as deleted',
      data: {
        id: inspection.id,
        deletedAt: inspection.deletedAt
      }
    });

  } catch (error) {
    console.error('❌ Error soft deleting inspection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to soft delete inspection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Restore Soft Deleted Inspection
 * POST /api/v1/inspections/material/:id/restore
 */
const restoreInspection = async (req, res) => {
  try {
    const { id } = req.params;

    const inspection = await MaterialInspection.findOne({
      where: { id },
      paranoid: false // รวมข้อมูลที่ถูก soft delete
    });
    
    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    if (!inspection.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Inspection is not deleted'
      });
    }

    // Restore
    await inspection.restore();

    console.log(`♻️ Inspection ${id} restored`);

    res.status(200).json({
      success: true,
      message: 'Inspection restored successfully',
      data: inspection
    });

  } catch (error) {
    console.error('❌ Error restoring inspection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore inspection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Permanently Delete Inspection (Force delete)
 * DELETE /api/v1/inspections/material/:id/force
 */
const forceDeleteInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const inspection = await MaterialInspection.findOne({
      where: { id },
      paranoid: false
    });
    
    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    // ตรวจสอบสิทธิ์ admin (สำหรับ force delete)
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can permanently delete inspections'
      });
    }

    // ลบถาวร
    await inspection.destroy({ force: true });

    console.log(`💥 Inspection ${id} permanently deleted by admin ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Inspection permanently deleted',
      data: {
        deletedId: id
      }
    });

  } catch (error) {
    console.error('❌ Error force deleting inspection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete inspection',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete Old Inspections (Cleanup)
 * DELETE /api/v1/inspections/material/cleanup
 * Query: ?olderThan=90 (days)
 */
const cleanupOldInspections = async (req, res) => {
  try {
    const { olderThan = 90 } = req.query;
    const userId = req.user?.id;

    // คำนวณวันที่
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan));

    const deletedCount = await MaterialInspection.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate
        }
      }
    });

    console.log(`🧹 Cleanup: ${deletedCount} old inspections deleted (older than ${olderThan} days)`);

    res.status(200).json({
      success: true,
      message: `Deleted ${deletedCount} inspection(s) older than ${olderThan} days`,
      data: {
        deletedCount,
        olderThan: parseInt(olderThan),
        cutoffDate
      }
    });

  } catch (error) {
    console.error('❌ Error cleaning up inspections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup inspections',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  removeInspection,
  removeBulkInspections,
  softDeleteInspection,
  restoreInspection,
  forceDeleteInspection,
  cleanupOldInspections
};