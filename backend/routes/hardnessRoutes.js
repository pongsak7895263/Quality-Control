const express = require('express');
const router = express.Router();

const hardnessController = require('../controllers/hardnessController');
const upload = require('../middleware/upload');

// Master Data
router.get('/parts', hardnessController.getParts);
router.post('/parts', hardnessController.addPart);
router.put('/parts/:partNo', hardnessController.updatePart);
router.delete('/parts/:partNo', hardnessController.deletePart);
router.get('/suppliers', hardnessController.getSuppliers);

// Transactions
router.post('/inspection', upload.array('attachments'), hardnessController.createInspection);
router.get('/history', hardnessController.getHistory);
router.get('/inspection/:id', hardnessController.getInspectionDetails);

// Update & Delete
router.put('/inspection/:id', upload.array('attachments'), hardnessController.updateInspection);
router.delete('/inspection/:id', hardnessController.deleteInspection);

module.exports = router;