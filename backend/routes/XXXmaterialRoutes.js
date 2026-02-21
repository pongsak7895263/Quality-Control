// backend/routes/materialRoutes.js

const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const upload = require("../middleware/upload"); 

// Middleware Authentication
const auth = require("../middleware/auth");
const permission = require("../middleware/permission");

// Controllers
const reportController = require("../controllers/reportController");
const inspectionController = require("../controllers/inspectionController"); // Material Only

// ===================================
// MATERIAL INSPECTION ROUTES
// Base Path: /api/material (กำหนดมาจาก server.js แล้ว)
// ===================================

// 1. Stats Summary (ต้องวางไว้บนสุด)
// ✅ แก้จาก "/material/stats/summary" เป็น "/stats/summary"
router.get("/stats/summary", auth, permission("material_inspection_view"), inspectionController.getStats);

// 2. Get All
// ✅ แก้จาก "/material" เป็น "/" เฉยๆ
router.get("/", auth, permission("material_inspection_view"), inspectionController.getInspections);

// 3. Create New
// ✅ แก้จาก "/material" เป็น "/"
router.post("/", 
  auth, 
  permission("material_inspection_create"), 
  upload.array('files'), 
  [
    body("material_type").isIn(["bar", "rod"]).withMessage("Material type must be bar or rod"),
    body("material_grade").notEmpty().withMessage("Material grade is required"),
    body("batch_number").notEmpty().withMessage("Batch number is required"),
    body("supplier_name").notEmpty().withMessage("Supplier name is required")
  ],
  inspectionController.addInspection
); 

// 4. Export PDF (วางไว้ก่อน :id)
// ✅ ไม่ต้องแก้ (เพราะเป็น /:id/pdf อยู่แล้ว)
router.get("/:id/pdf", auth, reportController.exportInspectionPDF);

// 5. Update
// ✅ แก้จาก "/material/:id" เป็น "/:id"
router.put("/:id", 
  auth, 
  permission("material_inspection_edit"), 
  upload.array('files'), 
  inspectionController.editInspection
);

// 6. Delete
// ✅ แก้จาก "/material/:id" เป็น "/:id"
router.delete("/:id", auth, permission("material_inspection_delete"), inspectionController.removeInspection);

module.exports = router;