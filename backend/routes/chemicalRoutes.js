// backend/routes/chemicalRoutes.js
const express = require("express");
const router = express.Router();

// Middleware Authentication
const auth = require("../middleware/auth");
const permission = require("../middleware/permission");

// Controllers
const chemicalController = require("../controllers/inspections/chemicalTestController"); 

// ===================================
// CHEMICAL INSPECTION ROUTES
// Base Path: /api/chemical (มาจาก server.js)
// ===================================

// ✅ STATS - ต้องอยู่ก่อน /:id (สำคัญมาก!)
router.get("/stats", auth, chemicalController.getStats);

// GET /api/chemical/
router.get("/", auth, permission("chemical_test_view"), chemicalController.getAll);

// GET /api/chemical/:id
router.get("/:id", auth, permission("chemical_test_view"), chemicalController.getById);

// POST /api/chemical/
router.post("/", auth, permission("chemical_test_create"), chemicalController.create);

// PUT /api/chemical/:id
router.put("/:id", auth, permission("chemical_test_edit"), chemicalController.update);

// DELETE /api/chemical/:id
router.delete("/:id", auth, permission("chemical_test_delete"), chemicalController.delete);

// PUT /api/chemical/:id/approve
router.put("/:id/approve", auth, permission("chemical_test_approve"), chemicalController.approve);

module.exports = router;