const db = require('../config/database');

// ==========================================
// 1. Part Master Management (จัดการข้อมูลสินค้า)
// ==========================================

// 1.1 ดึงข้อมูล Parts ทั้งหมด
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
              standard_image_url AS "standardImage",
              is_active AS "isActive"
       FROM master.parts 
       ORDER BY part_no`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching parts:', error);
    res.status(500).json({ message: 'Error fetching parts' });
  }
};

// 1.2 เพิ่มข้อมูล Part ใหม่
exports.addPart = async (req, res) => {
  try {
    const { partNo, partName, material, specMin, specMax, scale, standardRef } = req.body;

    // Validation
    if (!partNo || !partName) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุ Part No และ Part Name' });
    }

    // แปลงค่าว่าง string เป็น null
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
    if (error.code === '23505') { // Duplicate Key Error
      return res.status(409).json({ success: false, message: 'Part No นี้มีอยู่ในระบบแล้ว' });
    }
    console.error('Error adding part:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message });
  }
};

// 1.3 แก้ไขข้อมูล Part
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
    
    // แปลงค่าว่างเป็น null
    const vSpecMin = (specMin === '' || specMin === undefined) ? null : specMin;
    const vSpecMax = (specMax === '' || specMax === undefined) ? null : specMax;

    const values = [
      partName, 
      material, 
      vSpecMin, 
      vSpecMax, 
      scale, 
      standardRef, 
      standardImage,
      isActive !== false, // Default true
      decodedPartNo
    ];
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบ Part No ที่ต้องการแก้ไข' });
    }
    
    res.json({ 
      success: true, 
      message: 'แก้ไขข้อมูลสำเร็จ', 
      data: result.rows[0] 
    });
    
  } catch (error) {
    console.error('Error updating part:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
  }
};

// 1.4 ลบข้อมูล Part
exports.deletePart = async (req, res) => {
  try {
    const { partNo } = req.params;
    const decodedPartNo = decodeURIComponent(partNo);
    
    // เช็คก่อนลบ
    const checkResult = await db.query('SELECT part_no FROM master.parts WHERE part_no = $1', [decodedPartNo]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบ Part No ที่ต้องการลบ' });
    }
    
    await db.query('DELETE FROM master.parts WHERE part_no = $1', [decodedPartNo]);
    
    res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    
  } catch (error) {
    if (error.code === '23503') { // Foreign Key Violation
      return res.status(409).json({ success: false, message: 'ไม่สามารถลบได้ เนื่องจากมีข้อมูลการตรวจสอบที่อ้างอิงถึง Part นี้อยู่' });
    }
    console.error('Error deleting part:', error);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
  }
};

// ==========================================
// 2. Supplier Management
// ==========================================

// 2.1 ดึงข้อมูล Suppliers
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

// ==========================================
// 3. Inspection Transaction (บันทึกผลตรวจสอบ)
// ==========================================

// 3.1 สร้างรายการตรวจสอบใหม่ (Create Inspection Job)
exports.createInspection = async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');

    const jobData = req.body.data ? JSON.parse(req.body.data) : req.body; 
    const files = req.files || [];

    console.log('Creating Inspection for Part:', jobData.partNo);

    // ป้องกันข้อมูลซ้ำ (Duplicate Check) - เฉพาะ Lot/Heat เดิม ของ Part เดิม
    const checkQuery = `
        SELECT job_id, lot_no, heat_no_internal 
        FROM operation.inspection_jobs 
        WHERE part_no = $1 
          AND (
            ($2::text <> '' AND TRIM(lot_no) = TRIM($2::text)) 
            OR 
            ($3::text <> '' AND TRIM(heat_no_internal) = TRIM($3::text))
          )
        LIMIT 1
    `;

    const duplicateCheck = await client.query(checkQuery, [
        jobData.partNo, 
        jobData.lotNo || '', 
        jobData.internalHeatNo || ''
    ]);

    if (duplicateCheck.rows.length > 0) {
        throw new Error(`ข้อมูลซ้ำ: Lot หรือ Heat No นี้ถูกบันทึกไปแล้วสำหรับ Part ${jobData.partNo}`);
    }

    // Insert Header
    const insertJobQuery = `
      INSERT INTO operation.inspection_jobs (
        part_no, part_name_snapshot, material_snapshot, spec_min_snapshot, spec_max_snapshot, scale_snapshot,
        supplier_id, report_no, lot_no, heat_no_supplier, process_type,
        inspector_name, inspection_type, sampling_rate, overall_status, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING job_id
    `;

    const failedCount = jobData.measurements ? jobData.measurements.filter(m => m.status === 'FAIL').length : 0;
    const overallStatus = failedCount > 0 ? 'FAIL' : 'PASS';

    let supplierId = null;
    if (jobData.supplier) {
        const supRes = await client.query('SELECT id FROM master.suppliers WHERE name = $1 OR code = $1', [jobData.supplier]);
        if(supRes.rows.length > 0) supplierId = supRes.rows[0].id;
    }

    const jobValues = [
      jobData.partNo, jobData.partName, jobData.material, jobData.specMin, jobData.specMax, jobData.scale,
      supplierId, jobData.reportNo, jobData.lotNo, jobData.internalHeatNo, jobData.supplierHeatNo, jobData.processType,
      'Operator 1', 
      jobData.inspectionType, jobData.samplingRate, overallStatus, jobData.remarks || ''
    ];

    const jobResult = await client.query(insertJobQuery, jobValues);
    const newJobId = jobResult.rows[0].job_id;

    // Insert Measurements
    if (jobData.measurements && jobData.measurements.length > 0) {
      const insertMeasureQuery = `
        INSERT INTO operation.measurements (job_id, piece_no, measure_value, status, point_type)
        VALUES ($1, $2, $3, $4, $5)
      `;
      for (const m of jobData.measurements) {
        await client.query(insertMeasureQuery, [newJobId, m.pieceNo, m.value, m.status, m.inspectionType]);
      }
    }

    // Insert Attachments
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

// 3.2 ดึงประวัติการตรวจสอบ (Get History)
exports.getHistory = async (req, res) => {
  try {
    const query = `
      SELECT 
        j.job_id AS "id",
        TO_CHAR(j.job_date, 'YYYY-MM-DD') AS "date",
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

// 3.3 อัปเดตข้อมูล (Update + Audit Log)
exports.updateInspection = async (req, res) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const updateData = req.body.updateData || req.body; 
    const reason = req.body.reason || req.body.editDetails || 'Manual Update';

    console.log(`Updating Job ID: ${id}`, updateData);

    await client.query('BEGIN');

    // 1. ดึงข้อมูลเดิม
    const oldJobRes = await client.query('SELECT overall_status FROM operation.inspection_jobs WHERE job_id = $1', [id]);
    
    if (oldJobRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูล Job ID นี้');
    }
    
    const oldStatus = oldJobRes.rows[0].overall_status;
    const newStatus = updateData.status || oldStatus; 

    // 2. อัปเดตข้อมูล (ตัวอย่าง: แก้ไข Lot, Inspector, Remarks, Status)
    const updateQuery = `
        UPDATE operation.inspection_jobs 
        SET 
            lot_no = COALESCE($1, lot_no),
            inspector_name = COALESCE($2, inspector_name),
            remarks = COALESCE($3, remarks),
            overall_status = $4,
            updated_at = NOW()
        WHERE job_id = $5
    `;
    
    await client.query(updateQuery, [
        updateData.lotNo,    // $1
        updateData.inspector,// $2
        updateData.editDetails, // หรือ remarks $3
        newStatus,           // $4
        id                   // $5
    ]);

    // 3. บันทึก Audit Log
    await client.query(`
      INSERT INTO audit.inspection_edits (job_id, edited_by, edit_reason, previous_status, new_status)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, 'Admin', reason, oldStatus, newStatus]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'แก้ไขข้อมูลและบันทึกประวัติสำเร็จ' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update Error:', error);
    res.status(500).json({ success: false, message: 'Update failed: ' + error.message });
  } finally {
    client.release();
  }
};

// 3.4 ลบข้อมูล Inspection (Delete)
exports.deleteInspection = async (req, res) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    console.log(`Deleting Job ID: ${id}`);

    await client.query('BEGIN');

    // 1. ตรวจสอบก่อนว่ามีข้อมูลไหม
    const checkRes = await client.query('SELECT job_id FROM operation.inspection_jobs WHERE job_id = $1', [id]);
    if (checkRes.rows.length === 0) {
      throw new Error('ไม่พบข้อมูลที่ต้องการลบ');
    }

    // 2. ลบข้อมูล Child Tables (Cascade Deletion - ถ้า DB ไม่ได้ตั้ง CASCADE ไว้)
    await client.query('DELETE FROM operation.measurements WHERE job_id = $1', [id]);
    await client.query('DELETE FROM operation.attachments WHERE job_id = $1', [id]);
    await client.query('DELETE FROM audit.inspection_edits WHERE job_id = $1', [id]);

    // 3. ลบข้อมูลตารางหลัก
    await client.query('DELETE FROM operation.inspection_jobs WHERE job_id = $1', [id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete Error:', error);
    res.status(500).json({ success: false, message: 'Delete failed: ' + error.message });
  } finally {
    client.release();
  }
};
// ... (โค้ดเดิมส่วนบนยังคงเหมือนเดิม) ...

// 5. อัปเดตข้อมูล (Update)
exports.updateInspection = async (req, res) => {
  // ... (โค้ดเดิม) ...
};

// 6. ลบข้อมูล Inspection (Delete)
exports.deleteInspection = async (req, res) => {
  // ... (โค้ดเดิม) ...
};

// [NEW] 7. ดึงรายละเอียดการตรวจสอบแบบครบถ้วน (Get Full Details)
exports.getInspectionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. ดึงข้อมูล Header (Join กับ Parts/Suppliers เพื่อให้ได้ชื่อมาแสดง)
    const jobQuery = `
      SELECT 
        j.*,
        TO_CHAR(j.job_date, 'YYYY-MM-DD') AS job_date_fmt,
        TO_CHAR(j.job_time, 'HH24:MI:SS') AS job_time_fmt,
        p.part_name, 
        p.standard_ref,
        s.name AS supplier_name
      FROM operation.inspection_jobs j
      LEFT JOIN master.parts p ON j.part_no = p.part_no
      LEFT JOIN master.suppliers s ON j.supplier_id = s.id
      WHERE j.job_id = $1
    `;
    const jobRes = await db.query(jobQuery, [id]);
    
    if (jobRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }
    const job = jobRes.rows[0];

    // 2. ดึงข้อมูลผลการวัดทั้งหมด (Measurements)
    const measurementsRes = await db.query(
      'SELECT * FROM operation.measurements WHERE job_id = $1 ORDER BY piece_no ASC',
      [id]
    );

    // 3. ดึงข้อมูลไฟล์แนบ (Attachments)
    const filesRes = await db.query(
      'SELECT * FROM operation.attachments WHERE job_id = $1 ORDER BY uploaded_at DESC',
      [id]
    );

    // 4. ดึงประวัติการแก้ไข (Audit Logs)
    const auditsRes = await db.query(
      `SELECT 
         e.*, 
         TO_CHAR(e.edited_at, 'DD/MM/YYYY HH24:MI') AS edited_at_fmt 
       FROM audit.inspection_edits e 
       WHERE job_id = $1 
       ORDER BY edited_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        header: job,
        measurements: measurementsRes.rows,
        attachments: filesRes.rows,
        history: auditsRes.rows
      }
    });

  } catch (error) {
    console.error('Error fetching details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// ... (โค้ดส่วนอื่นๆ คงเดิม) ...

// 5. อัปเดตข้อมูล (Update) - รองรับการแก้ไขข้อมูลครบถ้วน
exports.updateInspection = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const jobId = req.params.id;
    // รองรับโครงสร้างข้อมูลที่ส่งมาทั้งแบบ { updateData: {...}, reason: ... } หรือส่งมารวมกัน
    const updateData = req.body.updateData || req.body; 
    const reason = req.body.reason || req.body.editReason || 'Manual Update';

    console.log(`Updating Job ID: ${jobId}`);

    // 1. ดึงสถานะเดิมก่อน
    const oldJobRes = await client.query('SELECT overall_status FROM operation.inspection_jobs WHERE job_id = $1', [jobId]);
    
    if (oldJobRes.rows.length === 0) {
        throw new Error('ไม่พบข้อมูล Job ID นี้');
    }
    
    const oldStatus = oldJobRes.rows[0].overall_status;
    const newStatus = updateData.status || oldStatus; 

    // 2. อัปเดตข้อมูลในตารางหลัก (Inspection Header)
    // ใช้ COALESCE เพื่อให้ค่าเดิมยังอยู่ถ้าไม่ได้ส่งค่าใหม่มา
    const updateQuery = `
        UPDATE operation.inspection_jobs 
        SET 
            lot_no = COALESCE($1, lot_no),
            inspector_name = COALESCE($2, inspector_name),
            remarks = COALESCE($3, remarks),
            overall_status = $4,
            report_no = COALESCE($5, report_no),
            heat_no_internal = COALESCE($6, heat_no_internal),
            heat_no_supplier = COALESCE($7, heat_no_supplier),
            process_type = COALESCE($8, process_type),
            updated_at = NOW()
        WHERE job_id = $9
    `;
    
    await client.query(updateQuery, [
        updateData.lotNo,          // $1
        updateData.inspector,      // $2
        updateData.remarks,        // $3
        newStatus,                 // $4
        updateData.reportNo,       // $5 (เพิ่ม)
        updateData.internalHeatNo, // $6 (เพิ่ม)
        updateData.supplierHeatNo, // $7 (เพิ่ม)
        updateData.processType,    // $8 (เพิ่ม)
        jobId                      // $9
    ]);

    // 3. บันทึก Audit Log
    await client.query(`
      INSERT INTO audit.inspection_edits (job_id, edited_by, edit_reason, previous_status, new_status)
      VALUES ($1, $2, $3, $4, $5)
    `, [jobId, 'Admin', reason, oldStatus, newStatus]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'แก้ไขข้อมูลและบันทึกประวัติสำเร็จ' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update Error:', error);
    res.status(500).json({ success: false, message: 'Update failed: ' + error.message });
  } finally {
    client.release();
  }
};
// ... (โค้ดส่วนอื่นๆ คงเดิม) ...