const express = require('express');
const router = express.Router();

// นำเข้า Controller และ Middleware
const hardnessController = require('../controllers/hardnessController');
const upload = require('../middleware/upload');

// ==========================================
// Routes Definition
// ==========================================

// 1. Master Data Routes (ดึงข้อมูลตัวเลือกต่างๆ)
// GET /api/hardness/parts
router.get('/parts', hardnessController.getParts);

// POST /api/hardness/parts (เพิ่มข้อมูล Part ใหม่)
// IMPORTANT: This route requires the addPart function in the controller
router.post('/parts', hardnessController.addPart);
router.put('/parts/:partNo', hardnessController.updatePart);

// GET /api/hardness/suppliers
router.get('/suppliers', hardnessController.getSuppliers);

// 2. Transaction Routes (บันทึกผลการตรวจสอบ)
// POST /api/hardness/inspection
// รองรับการอัปโหลดไฟล์แนบหลายไฟล์ผ่าน field ชื่อ 'attachments'
router.post('/inspection', upload.array('attachments'), hardnessController.createInspection);

// 3. History & Management Routes (ประวัติและการจัดการ)
// GET /api/hardness/history
router.get('/history', hardnessController.getHistory);
router.put('/history/:id', hardnessController.updateInspection);
router.get('/inspection/:id', hardnessController.getInspectionDetails);
// PUT /api/hardness/inspection/:id (แก้ไขข้อมูล)
router.put('/inspection/:id', hardnessController.updateInspection);
router.delete('/history/:id', hardnessController.deleteInspection);

module.exports = router;