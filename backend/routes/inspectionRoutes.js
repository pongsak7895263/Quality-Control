const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { Pool } = require('pg');
const path = require('path');

// -------------------------------------------------------------------------
// 🛠️ ROBUST DATABASE CONNECTION
// -------------------------------------------------------------------------

// 1. Force Load .env from parent directory (backend/)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 2. ฟังก์ชันช่วยดึงค่า Config
const getEnv = (keys, defaultVal) => {
    for (const key of keys) {
        if (process.env[key] !== undefined && process.env[key] !== null && process.env[key] !== '') {
            return process.env[key];
        }
    }
    return defaultVal;
};

// 3. ดึงค่า Config
const dbUser = getEnv(['DB_MAIN_USER', 'DB_USER', 'DB_QC_USER'], 'postgres');
const dbHost = getEnv(['DB_MAIN_HOST', 'DB_HOST', 'DB_QC_HOST'], 'localhost');
const dbName = getEnv(['DB_MAIN_NAME', 'DB_NAME', 'DB_QC_NAME'], 'quality_control_db');
const dbPort = parseInt(getEnv(['DB_MAIN_PORT', 'DB_PORT', 'DB_QC_PORT'], "5432"), 10);

const rawPassword = getEnv(['DB_MAIN_PASSWORD', 'DB_PASSWORD', 'DB_QC_PASS'], "");
const dbPassword = String(rawPassword);

// Debug Log
console.log("---------------------------------------------------");
console.log("🔌 [Chemical Lab] Connection Config:");
console.log(`   Target: postgres://${dbUser}@${dbHost}:${dbPort}/${dbName}`);
console.log(`   Password Status: ${dbPassword.length > 0 ? "✅ Loaded" : "❌ Empty/Missing"} (Length: ${dbPassword.length})`);
if (dbPassword.length === 0) console.warn("   ⚠️ Warning: Password is empty. Check DB_MAIN_PASSWORD in .env");
console.log("---------------------------------------------------");

const pool = new Pool({
    user: dbUser,
    host: dbHost,
    database: dbName,
    password: dbPassword, 
    port: dbPort,
});

// Test Connection
pool.connect().then(client => {
    console.log('✅ (Chemical Lab) Database Connected Successfully');
    client.release();
}).catch(err => {
    console.error('❌ (Chemical Lab) Connection Failed:', err.message);
});

// -------------------------------------------------------------------------

const auth = require("../middleware/auth");
const { authenticateToken } = require("../middleware/authMiddleware");
const permission = require("../middleware/permission");
const reportController = require("../controllers/reportController");
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
// Chemical Inspection Routes
// ===================================

// GET: ดึงข้อมูลประวัติ Chemical ทั้งหมด
router.get('/chemical', async (req, res) => {
  try {
    const query = `
      SELECT 
        i.id, 
        i.inspection_date as "inspectionDate",
        i.cert_no as "certNo",
        i.heat_no as "heatNo",
        mg.grade_name as "materialGrade",
        i.test_result as "testResult",
        i.inspector_id, 
        ins.name as inspector,
        i.approved_by as "approvedBy",
        i.manufacturer,
        i.remarks,
        i.standard,
        i.pdf_file as "pdfFile",
        i.pdf_name as "pdfName",
        (
            SELECT json_object_agg(ir.element_symbol, ir.tested_value)
            FROM inspection_results ir
            WHERE ir.inspection_id = i.id
        ) as "testValues"
      FROM inspections i
      LEFT JOIN material_grades mg ON i.material_grade_id = mg.id
      LEFT JOIN inspectors ins ON i.inspector_id = ins.id
      ORDER BY i.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching chemical inspections:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET: ดึงข้อมูล Chemical ตาม ID
router.get('/chemical/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        i.id, 
        i.inspection_date as "inspectionDate",
        i.cert_no as "certNo",
        i.heat_no as "heatNo",
        mg.grade_name as "materialGrade",
        i.test_result as "testResult",
        i.inspector_id, 
        ins.name as inspector,
        i.approved_by as "approvedBy",
        i.manufacturer,
        i.remarks,
        i.standard,
        i.pdf_file as "pdfFile",
        i.pdf_name as "pdfName",
        (
            SELECT json_object_agg(ir.element_symbol, ir.tested_value)
            FROM inspection_results ir
            WHERE ir.inspection_id = i.id
        ) as "testValues"
      FROM inspections i
      LEFT JOIN material_grades mg ON i.material_grade_id = mg.id
      LEFT JOIN inspectors ins ON i.inspector_id = ins.id
      WHERE i.id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("❌ Error fetching chemical inspection:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST: บันทึก Chemical Inspection ใหม่
router.post('/chemical', async (req, res) => {
  const { 
    inspectionDate, certNo, heatNo, materialGrade, 
    inspector, approvedBy, manufacturer, testResult, 
    testValues, remarks, standard, pdfFile, pdfName 
  } = req.body;

  try {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. จัดการ Inspector
        let inspectorId;
        const inspectorRes = await client.query('SELECT id FROM inspectors WHERE name = $1', [inspector]);
        if (inspectorRes.rows.length > 0) {
            inspectorId = inspectorRes.rows[0].id;
        } else {
            const newInspector = await client.query('INSERT INTO inspectors (name) VALUES ($1) RETURNING id', [inspector]);
            inspectorId = newInspector.rows[0].id;
        }

        // 2. จัดการ Grade
        const gradeRes = await client.query('SELECT id FROM material_grades WHERE grade_name = $1', [materialGrade]);
        let gradeId;
        if (gradeRes.rows.length === 0) {
            const newGrade = await client.query(
                'INSERT INTO material_grades (grade_name, description) VALUES ($1, $2) RETURNING id', 
                [materialGrade, 'Auto-added by Chemical Lab']
            );
            gradeId = newGrade.rows[0].id;
        } else {
            gradeId = gradeRes.rows[0].id;
        }

        // 3. Insert Inspection
        const insertInspectionQuery = `
        INSERT INTO inspections 
        (inspection_date, cert_no, heat_no, material_grade_id, inspector_id, approved_by, manufacturer, test_result, remarks, standard, pdf_file, pdf_name)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
        `;
        const inspectionValues = [
          inspectionDate, certNo, heatNo, gradeId, inspectorId, 
          approvedBy, manufacturer, testResult, remarks, standard,
          pdfFile || null, pdfName || null
        ];
        const newInspection = await client.query(insertInspectionQuery, inspectionValues);
        const inspectionId = newInspection.rows[0].id;

        // 4. Insert Test Results
        if (testValues) {
            for (const [element, value] of Object.entries(testValues)) {
              if (value !== '' && value !== null && value !== undefined) {
                await client.query(`
                    INSERT INTO inspection_results (inspection_id, element_symbol, tested_value)
                    VALUES ($1, $2, $3)
                `, [inspectionId, element, parseFloat(value)]);
              }
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Inspection saved successfully', id: inspectionId });

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
  } catch (err) {
    console.error("❌ Error saving chemical inspection:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ PUT: อัพเดท Chemical Inspection
router.put('/chemical/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    inspectionDate, certNo, heatNo, materialGrade, 
    inspector, approvedBy, manufacturer, testResult, 
    testValues, remarks, standard, pdfFile, pdfName 
  } = req.body;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // ตรวจสอบว่ามี record อยู่หรือไม่
      const existCheck = await client.query('SELECT id FROM inspections WHERE id = $1', [id]);
      if (existCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Inspection not found' });
      }

      // 1. จัดการ Inspector
      let inspectorId = null;
      if (inspector) {
        const inspectorRes = await client.query('SELECT id FROM inspectors WHERE name = $1', [inspector]);
        if (inspectorRes.rows.length > 0) {
          inspectorId = inspectorRes.rows[0].id;
        } else {
          const newInspector = await client.query('INSERT INTO inspectors (name) VALUES ($1) RETURNING id', [inspector]);
          inspectorId = newInspector.rows[0].id;
        }
      }

      // 2. จัดการ Grade
      let gradeId = null;
      if (materialGrade) {
        const gradeRes = await client.query('SELECT id FROM material_grades WHERE grade_name = $1', [materialGrade]);
        if (gradeRes.rows.length === 0) {
          const newGrade = await client.query(
            'INSERT INTO material_grades (grade_name, description) VALUES ($1, $2) RETURNING id', 
            [materialGrade, 'Auto-added by Chemical Lab']
          );
          gradeId = newGrade.rows[0].id;
        } else {
          gradeId = gradeRes.rows[0].id;
        }
      }

      // 3. Update Inspection
      const updateQuery = `
        UPDATE inspections SET
          inspection_date = COALESCE($1, inspection_date),
          cert_no = COALESCE($2, cert_no),
          heat_no = COALESCE($3, heat_no),
          material_grade_id = COALESCE($4, material_grade_id),
          inspector_id = COALESCE($5, inspector_id),
          approved_by = COALESCE($6, approved_by),
          manufacturer = COALESCE($7, manufacturer),
          test_result = COALESCE($8, test_result),
          remarks = COALESCE($9, remarks),
          standard = COALESCE($10, standard),
          pdf_file = COALESCE($11, pdf_file),
          pdf_name = COALESCE($12, pdf_name)
        WHERE id = $13
      `;
      await client.query(updateQuery, [
        inspectionDate, certNo, heatNo, gradeId, inspectorId,
        approvedBy, manufacturer, testResult, remarks, standard,
        pdfFile, pdfName, id
      ]);

      // 4. Update Test Results (ลบเก่า แล้ว Insert ใหม่)
      if (testValues && Object.keys(testValues).length > 0) {
        // ลบ results เดิม
        await client.query('DELETE FROM inspection_results WHERE inspection_id = $1', [id]);
        
        // Insert ใหม่
        for (const [element, value] of Object.entries(testValues)) {
          if (value !== '' && value !== null && value !== undefined) {
            await client.query(`
              INSERT INTO inspection_results (inspection_id, element_symbol, tested_value)
              VALUES ($1, $2, $3)
            `, [id, element, parseFloat(value)]);
          }
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Inspection updated successfully' });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ Error updating chemical inspection:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ DELETE: ลบ Chemical Inspection
router.delete('/chemical/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // ตรวจสอบว่ามี record อยู่หรือไม่
      const existCheck = await client.query('SELECT id FROM inspections WHERE id = $1', [id]);
      if (existCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Inspection not found' });
      }

      // 1. ลบ inspection_results ก่อน (Foreign Key)
      await client.query('DELETE FROM inspection_results WHERE inspection_id = $1', [id]);

      // 2. ลบ inspection
      await client.query('DELETE FROM inspections WHERE id = $1', [id]);

      await client.query('COMMIT');
      res.json({ success: true, message: 'Inspection deleted successfully' });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ Error deleting chemical inspection:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===================================
// Material Inspection Routes (Existing)
// ===================================

router.get("/material/stats/summary", auth, permission("material_inspection_view"), materialInspectionController.getStats);
router.get("/material", auth, permission("material_inspection_view"), materialInspectionController.getAll);
router.get("/material/:id", auth, permission("material_inspection_view"), materialInspectionController.getById);

router.post("/material", auth, permission("material_inspection_create"), [
    body("material_type").isIn(["bar", "rod"]).withMessage("Material type must be bar or rod"),
    body("material_grade").notEmpty().withMessage("Material grade is required"),
    body("batch_number").notEmpty().withMessage("Batch number is required"),
    body("supplier_name").notEmpty().withMessage("Supplier name is required")
]); 

router.put("/material/:id", auth, permission("material_inspection_edit"), editInspection);
router.patch("/material/:id", auth, permission("material_inspection_edit"), patchInspection);
router.patch("/material/:id/status", auth, permission("material_inspection_edit"), updateInspectionStatus);
router.delete("/material/:id", auth, permission("material_inspection_delete"), removeInspection);
router.delete("/material/bulk", auth, permission("material_inspection_delete"), removeBulkInspections);
router.delete("/material/:id/soft", auth, permission("material_inspection_delete"), softDeleteInspection);
router.post("/material/:id/restore", auth, permission("material_inspection_edit"), restoreInspection);
router.delete("/material/:id/force", auth, permission("admin"), forceDeleteInspection);
router.delete("/material/cleanup", auth, permission("admin"), cleanupOldInspections);
router.put("/material/:id/approve", auth, permission("material_inspection_approve"), materialInspectionController.approve);
router.get("/:id/pdf", auth, reportController.exportInspectionPDF);

module.exports = router;