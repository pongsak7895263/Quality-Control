const db = require('../config/database');

// --- Controller Functions ---

// 1. ดึงข้อมูล Master Data: Parts
exports.getParts = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT part_no AS "partNo", 
              part_name AS "partName", 
              material, 
              spec_min AS "specMin", 
              spec_max AS "specMax", 
              scale,
              standard_ref AS "standardRef",
              standard_image_url AS "standardImage"
       FROM master.parts 
       ORDER BY part_no`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching parts:', error);
    res.status(500).json({ message: 'Error fetching parts' });
  }
};

// 2. เพิ่มข้อมูล Part ใหม่ (Add Part)
exports.addPart = async (req, res) => {
  try {
    const { partNo, partName, material, specMin, specMax, scale, standardRef } = req.body;

    // Validation
    if (!partNo || !partName) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุ Part No และ Part Name' });
    }

    const vSpecMin = (specMin === '' || specMin === undefined) ? null : specMin;
    const vSpecMax = (specMax === '' || specMax === undefined) ? null : specMax;

    const query = `
      INSERT INTO master.parts (
        part_no, part_name, material, spec_min, spec_max, scale, standard_ref
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [partNo, partName, material, vSpecMin, vSpecMax, scale, standardRef];
    const result = await db.query(query, values);
    
    res.status(201).json({ 
      success: true, 
      message: 'เพิ่มข้อมูล Part สำเร็จ', 
      data: result.rows[0] 
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Part No นี้มีอยู่ในระบบแล้ว' });
    }
    console.error('Error adding part:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message });
  }
};

// 3. แก้ไขข้อมูล Part
exports.updatePart = async (req, res) => {
  try {
    const { partNo } = req.params;
    const decodedPartNo = decodeURIComponent(partNo);
    const { partName, material, specMin, specMax, scale, standardRef, standardImage, isActive } = req.body;

    const query = `
      UPDATE master.parts SET
        part_name = $1,
        material = $2,
        spec_min = $3,
        spec_max = $4,
        scale = $5,
        standard_ref = $6,
        standard_image_url = $7,
        is_active = $8,
        updated_at = NOW()
      WHERE part_no = $9
      RETURNING *
    `;
    
    const values = [
      partName, 
      material, 
      specMin === '' ? null : specMin, 
      specMax === '' ? null : specMax, 
      scale, 
      standardRef, 
      standardImage,
      isActive !== false,
      decodedPartNo
    ];
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'ไม่พบ Part No ที่ต้องการแก้ไข' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'แก้ไขข้อมูลสำเร็จ', 
      data: result.rows[0] 
    });
    
  } catch (error) {
    console.error('Error updating part:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด: ' + error.message 
    });
  }
};

// 4. ลบข้อมูล Part
exports.deletePart = async (req, res) => {
  try {
    const { partNo } = req.params;
    const decodedPartNo = decodeURIComponent(partNo);
    
    const checkResult = await db.query(
      'SELECT part_no FROM master.parts WHERE part_no = $1',
      [decodedPartNo]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'ไม่พบ Part No ที่ต้องการลบ' 
      });
    }
    
    await db.query('DELETE FROM master.parts WHERE part_no = $1', [decodedPartNo]);
    
    res.json({ 
      success: true, 
      message: 'ลบข้อมูลสำเร็จ' 
    });
    
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({ 
        success: false, 
        message: 'ไม่สามารถลบได้ เนื่องจากมีข้อมูลการตรวจสอบที่อ้างอิงถึง Part นี้อยู่' 
      });
    }
    console.error('Error deleting part:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาด: ' + error.message 
    });
  }
};

// 5. ดึงข้อมูล Suppliers
exports.getSuppliers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, code FROM master.suppliers ORDER BY name`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: 'Error fetching suppliers' });
  }
};

// 6. สร้างรายการตรวจสอบ (Create Inspection Job)
exports.createInspection = async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    const jobData = req.body.data ? JSON.parse(req.body.data) : req.body; 
    const files = req.files || [];

    console.log('Creating Inspection for Part:', jobData.partNo);

    const insertJobQuery = `
      INSERT INTO operation.inspection_jobs (
        part_no, part_name_snapshot, material_snapshot, spec_min_snapshot, spec_max_snapshot, scale_snapshot,
        supplier_id, report_no, lot_no, heat_no_internal, heat_no_supplier, process_type,
        inspector_name, inspection_type, sampling_rate, overall_status, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING job_id
    `;

    const failedCount = jobData.measurements ? jobData.measurements.filter(m => m.status === 'FAIL').length : 0;
    const overallStatus = failedCount > 0 ? 'FAIL' : 'PASS';

    let supplierId = null;
    if (jobData.supplier) {
      const supRes = await client.query('SELECT id FROM master.suppliers WHERE name = $1 OR code = $1', [jobData.supplier]);
      if (supRes.rows.length > 0) supplierId = supRes.rows[0].id;
    }

    const jobValues = [
      jobData.partNo, jobData.partName, jobData.material, jobData.specMin, jobData.specMax, jobData.scale,
      supplierId, jobData.reportNo, jobData.lotNo, jobData.internalHeatNo, jobData.supplierHeatNo, jobData.processType,
      'Operator 1', 
      jobData.inspectionType, jobData.samplingRate, overallStatus, jobData.remarks || ''
    ];

    const jobResult = await client.query(insertJobQuery, jobValues);
    const newJobId = jobResult.rows[0].job_id;

    if (jobData.measurements && jobData.measurements.length > 0) {
      const insertMeasureQuery = `
        INSERT INTO operation.measurements (job_id, piece_no, measure_value, status, point_type)
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      for (const m of jobData.measurements) {
        await client.query(insertMeasureQuery, [
          newJobId, m.pieceNo, m.value, m.status, m.inspectionType
        ]);
      }
    }

    if (files.length > 0) {
      const insertFileQuery = `
        INSERT INTO operation.attachments (job_id, file_name, file_path, file_type, file_size)
        VALUES ($1, $2, $3, $4, $5)
      `;

      for (const file of files) {
        await client.query(insertFileQuery, [
          newJobId, file.originalname, file.path, file.mimetype, (file.size / 1024).toFixed(2) + ' KB'
        ]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Inspection saved successfully', jobId: newJobId });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction Error:', error);
    res.status(500).json({ success: false, message: 'Database Transaction Failed: ' + error.message });
  } finally {
    client.release();
  }
};

// 7. ดึงประวัติ (Get History)
exports.getHistory = async (req, res) => {
  try {
    const query = `
      SELECT 
        j.job_id AS "id",
        TO_CHAR(j.job_date, 'DD/MM/YYYY') AS "date",
        TO_CHAR(j.job_time, 'HH24:MI:SS') AS "time",
        j.part_no AS "partNo",
        j.lot_no AS "lotNo",
        j.overall_status AS "status",
        j.inspector_name AS "inspector",
        j.scale_snapshot AS "scale",
        j.remarks,
        (SELECT point_type FROM operation.measurements WHERE job_id = j.job_id LIMIT 1) AS "point",
        (SELECT measure_value FROM operation.measurements WHERE job_id = j.job_id LIMIT 1) AS "value",
        (SELECT edit_reason FROM audit.inspection_edits WHERE job_id = j.job_id ORDER BY edited_at DESC LIMIT 1) AS "editDetails"
      FROM operation.inspection_jobs j
      ORDER BY j.created_at DESC
      LIMIT 100
    `;

    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ message: 'Error fetching history' });
  }
};

// 8. อัปเดต Inspection (Update)
exports.updateInspection = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const jobId = req.params.id;
    const { reason, updatedData } = req.body; 

    const oldJobRes = await client.query('SELECT overall_status FROM operation.inspection_jobs WHERE job_id = $1', [jobId]);
    if (oldJobRes.rows.length === 0) throw new Error('Job not found');
    
    const oldStatus = oldJobRes.rows[0].overall_status;
    const newStatus = updatedData?.status || oldStatus; 

    await client.query(`
      INSERT INTO audit.inspection_edits (job_id, edited_by, edit_reason, previous_status, new_status)
      VALUES ($1, $2, $3, $4, $5)
    `, [jobId, 'Admin', reason || 'Manual Update', oldStatus, newStatus]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Update recorded successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update Error:', error);
    res.status(500).json({ success: false, message: 'Update failed: ' + error.message });
  } finally {
    client.release();
  }
};