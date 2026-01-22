const express = require("express");
const router = express.Router();
const inspectionController = require("../controllers/inspectionController");
const { authenticateToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload"); // ✅ นี่คือ Object Multer

// GET Stats
router.get("/inspections/stats/summary", inspectionController.getStats);

// GET All
router.get("/inspections", inspectionController.getInspections);

// POST Create
router.post(
  "/inspections",
  authenticateToken,
  upload.any(), // ✅ แก้ไข: ต้องเรียกฟังก์ชัน .any() เพื่อให้เป็น Middleware
  inspectionController.addInspection
);

// PUT Update
router.put(
  "/inspections/:id",
  authenticateToken,
  upload.any(), // ✅ เพิ่ม: ใส่ตรงนี้ด้วย เพราะหน้าบ้านส่ง FormData มาตอนแก้ไข
  inspectionController.editInspection
);

// DELETE
router.delete(
  "/inspections/:id",
  authenticateToken,
  inspectionController.removeInspection
);

module.exports = router;