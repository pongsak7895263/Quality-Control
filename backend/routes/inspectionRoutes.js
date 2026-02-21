const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const upload = require("../middleware/upload"); // ✅ Multer Middleware

// Middleware Authentication
const auth = require("../middleware/auth");
const permission = require("../middleware/permission");

// Controllers
const reportController = require("../controllers/reportController");
const inspectionController = require("../controllers/inspectionController"); // Material
//const chemicalController = require("../controllers/inspections/chemicalTestController"); // Chemical

// ===================================
// 1. CHEMICAL INSPECTION ROUTES
// ===================================
//router.get("/chemical", auth, permission("chemical_test_view"), chemicalController.getAll);
//router.get("/chemical/:id", auth, permission("chemical_test_view"), chemicalController.getById);
//router.post("/chemical", auth, permission("chemical_test_create"), chemicalController.create);
//router.put("/chemical/:id", auth, permission("chemical_test_edit"), chemicalController.update);
//router.delete("/chemical/:id", auth, permission("chemical_test_delete"), chemicalController.delete);
//router.put("/chemical/:id/approve", auth, permission("chemical_test_approve"), chemicalController.approve);

// ===================================
// 2. MATERIAL INSPECTION ROUTES
// ===================================

// Stats Summary
router.get("/material/stats/summary", auth, permission("material_inspection_view"), inspectionController.getStats);
// Get All (Filter & Pagination)
router.get("/material", auth, permission("material_inspection_view"), inspectionController.getInspections);
// Create New (พร้อม Upload ไฟล์)
router.post("/material",
  auth,
  permission("material_inspection_create"),
  upload.array('files'), // ✅ รับไฟล์จาก Form-Data
  [
    body("material_type").isIn(["bar", "rod"]).withMessage("Material type must be bar or rod"),
    body("material_grade").notEmpty().withMessage("Material grade is required"),
    body("batch_number").notEmpty().withMessage("Batch number is required"),
    body("supplier_name").notEmpty().withMessage("Supplier name is required")
  ],
  inspectionController.addInspection
);

// Update (พร้อม Upload ไฟล์)
router.put("/material/:id",
  auth,
  permission("material_inspection_edit"), 
  upload.array('files'),
  inspectionController.editInspection
);

// Delete
router.delete("/material/:id", auth, permission("material_inspection_delete"), 
  inspectionController.removeInspection);

// ===================================
// 3. COMMON / REPORTS
// ===================================

// Export PDF (วางไว้ล่างสุด เพราะเป็น Dynamic Route :id)
router.get("/:id/pdf", auth, reportController.exportInspectionPDF);

module.exports = router;