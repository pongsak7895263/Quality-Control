// routes/inspectionRoutes.js
const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const auth = require("../middleware/auth");
const permission = require("../middleware/permission");

// Import Controllers
const materialInspectionController = require("../controllers/inspections/materialInspectionController");
const {
  editInspection,
  patchInspection,
  updateInspectionStatus,
} = require("../controllers/inspections/editInspection");
const {
  removeInspection,
  removeBulkInspections,
  softDeleteInspection,
  restoreInspection,
  forceDeleteInspection,
  cleanupOldInspections,
} = require("../controllers/inspections/removeInspection");

// ===================================
// Material Inspection Routes
// ===================================

// GET Routes
router.get(
  "/material/stats/summary",
  auth,
  permission("material_inspection_view"),
  materialInspectionController.getStats
);

router.get(
  "/material",
  auth,
  permission("material_inspection_view"),
  materialInspectionController.getAll
);

router.get(
  "/material/:id",
  auth,
  permission("material_inspection_view"),
  materialInspectionController.getById
);

// POST Routes
router.post(
  "/material",
  auth,
  permission("material_inspection_create"),
  [
    body("material_type")
      .isIn(["bar", "rod"])
      .withMessage("Material type must be bar or rod"),
    body("material_grade").notEmpty().withMessage("Material grade is required"),
    body("batch_number").notEmpty().withMessage("Batch number is required"),
    body("supplier_name").notEmpty().withMessage("Supplier name is required"),
    body("inspection_quantity")
      .optional()
      .isNumeric()
      .withMessage("Inspection quantity must be numeric"),
    body("overall_result")
      .optional()
      .isIn(["pending", "pass", "fail"])
      .withMessage("Invalid overall result"),
  ] //materialInspectionController.create
);

// PUT Routes - Full Update
router.put(
  "/material/:id",
  auth,
  permission("material_inspection_edit"),
  [
    body("material_type").optional().isIn(["bar", "rod"]),
    body("material_grade").optional().notEmpty(),
    body("batch_number").optional().notEmpty(),
    body("supplier_name").optional().notEmpty(),
    body("overall_result").optional().isIn(["pending", "pass", "fail"]),
  ],
  editInspection
);

// PATCH Routes - Partial Update
router.patch(
  "/material/:id",
  auth,
  permission("material_inspection_edit"),
  patchInspection
);

// PATCH - Update Status Only
router.patch(
  "/material/:id/status",
  auth,
  permission("material_inspection_edit"),
  updateInspectionStatus
);

// DELETE Routes
router.delete(
  "/material/:id",
  auth,
  permission("material_inspection_delete"),
  removeInspection
);

// Bulk Delete
router.delete(
  "/material/bulk",
  auth,
  permission("material_inspection_delete"),
  removeBulkInspections
);

// Soft Delete
router.delete(
  "/material/:id/soft",
  auth,
  permission("material_inspection_delete"),
  softDeleteInspection
);

// Restore
router.post(
  "/material/:id/restore",
  auth,
  permission("material_inspection_edit"),
  restoreInspection
);

// Force Delete (Admin only)
router.delete(
  "/material/:id/force",
  auth,
  permission("admin"),
  forceDeleteInspection
);

// Cleanup old inspections (Admin only)
router.delete(
  "/material/cleanup",
  auth,
  permission("admin"),
  cleanupOldInspections
);

// Approve Inspection
router.put(
  "/material/:id/approve",
  auth,
  permission("material_inspection_approve"),
  materialInspectionController.approve
);

module.exports = router;
