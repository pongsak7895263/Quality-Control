// routes/inspections.js - Inspections Routes
const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const materialInspectionController = require("../controllers/inspections/materialInspectionController");
const chemicalTestController = require("../controllers/inspections/chemicalTestController");
const billetInspectionController = require("../controllers/inspections/billetInspectionController");
const finalInspectionController = require("../controllers/inspections/finalInspectionController");
const auth = require("../middleware/auth");
const permission = require("../middleware/permission");
const uploadFields = require("../middleware/upload");
// Material Inspection Routes
router.get(
  "/material/stats/summary",
  auth,
  permission("material_inspection_view"), // หรือ permission ที่เหมาะสม
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

router.post(
  "/material",
  auth,
  permission("material_inspection_create"), uploadFields,
  [
    body("batchId").isInt().withMessage("Batch ID must be an integer"),
    body("supplierName").notEmpty().withMessage("Supplier name is required"),
    body("materialType").isIn(["steel_bar", "steel_billet", "raw_material"]),
    body("materialGrade").notEmpty().withMessage("Material grade is required"),
    body("receivedQuantity")
      .isNumeric()
      .withMessage("Received quantity must be numeric"),
    body("receivedDate")
      .isDate()
      .withMessage("Received date must be valid date"),
  ],
  materialInspectionController.create
);

router.put(
  "/material/:id",
  auth,
  permission("material_inspection_edit"),
  materialInspectionController.update
);

router.put(
  "/material/:id/approve",
  auth,
  permission("material_inspection_approve"),
  materialInspectionController.approve
);

// Chemical Test Routes
router.get(
  "/chemical",
  auth,
  permission("chemical_test_view"),
  chemicalTestController.getAll
);

router.post(
  "/chemical",
  auth,
  permission("chemical_test_create"),
  [
    body("materialInspectionId").optional().isInt(),
    body("batchId").optional().isInt(),
    body("sampleId").notEmpty().withMessage("Sample ID is required"),
    body("testType").isIn([
      "incoming_material",
      "process_control",
      "final_product",
    ]),
    body("materialGrade").notEmpty().withMessage("Material grade is required"),
    body("testMethod").isIn(["spectroscopy", "wet_chemistry"]),
    body("elementResults")
      .isArray()
      .withMessage("Element results must be an array"),
    body("elementResults.*.elementSymbol").notEmpty(),
    body("elementResults.*.measuredValue").isNumeric(),
  ],
  chemicalTestController.create
);

router.put(
  "/chemical/:id/approve",
  auth,
  permission("chemical_test_approve"),
  chemicalTestController.approve
);

// Final Inspection Routes
router.get(
  "/final",
  auth,
  permission("final_inspection_view"),
  finalInspectionController.getAll
);

router.post(
  "/final",
  auth,
  permission("final_inspection_create"),
  [
    body("batchId").isInt().withMessage("Batch ID is required"),
    body("quantityInspected")
      .isNumeric()
      .withMessage("Quantity inspected must be numeric"),
  ],
  finalInspectionController.create
);

router.put(
  "/final/:id/approve",
  auth,
  permission("final_inspection_approve"),
  finalInspectionController.approve
);

module.exports = router;
