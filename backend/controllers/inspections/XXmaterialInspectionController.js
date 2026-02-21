// backend/controllers/inspections/materialInspectionController.js
const { MaterialInspection, InspectionImage } = require('../../models'); // เปลี่ยนเป็น models/index.js
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, supplier } = req.query;
    const offset = (page - 1) * limit;

    let where = {};
    if (status) where.overallResult = status;
    if (supplier) where.supplierName = { [Op.iLike]: `%${supplier}%` };
    
    const { count, rows } = await MaterialInspection.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [{ model: InspectionImage, as: 'images' }] // ดึงรูปภาพมาด้วย
    });

    res.json({
      success: true,
      data: rows,
      pagination: { total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getById = async (req, res) => { /* ... (สามารถสร้างฟังก์ชันนี้เพิ่มได้) ... */ };

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const inspectionData = req.body;
    // แปลง barInspections จาก string JSON กลับเป็น object
    if (typeof inspectionData.barInspections === 'string') {
        inspectionData.barInspections = JSON.parse(inspectionData.barInspections);
    }

    const newInspection = await MaterialInspection.create(inspectionData);

    // จัดการไฟล์ที่อัปโหลด (ถ้ามี)
    if (req.files && req.files.attachedImages) {
      const imagePromises = req.files.attachedImages.map(file => {
        return InspectionImage.create({
          inspectionId: newInspection.id,
          imageUrl: file.path // เก็บ path ของไฟล์
        });
      });
      await Promise.all(imagePromises);
    }
    
    // (สามารถเพิ่ม logic สำหรับ attachedFiles ที่เป็น PDF ได้ในลักษณะเดียวกัน)

    res.status(201).json({ success: true, data: newInspection });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getStats = async (req, res) => {
  try {
      const totalInspections = await MaterialInspection.count();
      const passCount = await MaterialInspection.count({ where: { overallResult: 'pass' } });
      const failCount = await MaterialInspection.count({ where: { overallResult: 'fail' } });
      const pendingCount = await MaterialInspection.count({ where: { overallResult: 'pending' } });
      const passRate = totalInspections > 0 ? ((passCount / totalInspections) * 100).toFixed(1) : "0.0";

      res.json({
          success: true,
          data: {
              totalInspections,
              passCount,
              failCount,
              pendingCount,
              passRate
          }
      });
  } catch (error) {
      console.error("Error in getStats:", error); // Log error ที่เกิดขึ้น
      res.status(500).json({ success: false, message: error.message });
  }
};

// ... (โค้ดส่วน imports และฟังก์ชัน getAll, getStats) ...

exports.update = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. ค้นหารายการตรวจสอบเดิมจาก ID
    const inspection = await MaterialInspection.findByPk(id);
    if (!inspection) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }

    // 2. อัปเดตข้อมูลจาก req.body
    const updateData = req.body;
    if (typeof updateData.barInspections === 'string') {
        updateData.barInspections = JSON.parse(updateData.barInspections);
    }
    
    await inspection.update(updateData);

    // 3. จัดการไฟล์รูปภาพที่อาจมีการอัปโหลดมาใหม่
    // หมายเหตุ: ระบบนี้จะเพิ่มรูปภาพใหม่อย่างเดียว หากต้องการลบรูปเก่าต้องมี logic เพิ่มเติม
    if (req.files && req.files.attachedImages) {
      const imagePromises = req.files.attachedImages.map(file => {
        return InspectionImage.create({
          inspectionId: inspection.id,
          imageUrl: file.path
        });
      });
      await Promise.all(imagePromises);
    }

    // 4. ดึงข้อมูลล่าสุดทั้งหมด (รวมรูปภาพใหม่) เพื่อส่งกลับ
    const updatedInspectionWithImages = await MaterialInspection.findByPk(id, {
        include: [{ model: InspectionImage, as: 'images' }]
    });

    res.json({ success: true, message: 'Inspection updated successfully', data: updatedInspectionWithImages });
  } catch (error) {
    console.error("Error in update:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// backend/controllers/inspections/materialInspectionController.js

exports.approve = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. ค้นหารายการตรวจสอบจาก ID
    const inspection = await MaterialInspection.findByPk(id);
    if (!inspection) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }

    // 2. ตรวจสอบสถานะปัจจุบัน (ป้องกันการ approve ซ้ำซ้อน)
    if (inspection.overallResult !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot approve. Inspection status is already '${inspection.overallResult}'.` 
      });
    }

    // 3. อัปเดตสถานะเป็น 'pass'
    // เราสามารถระบุ field ที่ต้องการอัปเดตได้โดยตรง
    await inspection.update({ overallResult: 'pass' });

    res.json({ success: true, message: 'Inspection approved successfully', data: inspection });
  } catch (error) {
    console.error("Error in approve:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};