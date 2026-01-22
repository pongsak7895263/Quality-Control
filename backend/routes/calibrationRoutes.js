const express = require('express');
const router = express.Router();
const calibrationController = require('../controllers/calibrationController');

// URL จะต่อท้ายด้วย /api/calibration เสมอ (ตาม server.js)

// 1. Transaction
router.post('/record', calibrationController.createRecord);

// 2. Query Data
router.get('/due-soon', calibrationController.getDueInstruments);
router.get('/all', calibrationController.getAllInstruments);

// 3. Management (CRUD)
router.post('/register', calibrationController.registerInstrument);
router.get('/instruments/:id', calibrationController.getInstrumentById); // ดึงข้อมูลก่อนแก้
router.put('/instruments/:id', calibrationController.updateInstrument);  // บันทึกการแก้ไข

module.exports = router;