const db = require('../config/database');

// ==========================================
// 1. Master Data Management
// ==========================================
exports.getParts = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, part_no AS "partno", part_name AS "partname", 
             material, spec_min AS "specmin", spec_max AS "specmax", 
             scale, standard_ref AS "standardref", standard_image_url AS "standardimage", is_active AS "isactive"
      FROM parts 
      ORDER BY part_no ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Get Parts Error:", error.message);
    res.json([]);
  }
};

exports.addPart = async (req, res) => {
  try {
    const { partno, partname, material, specmin, specmax, scale, standardref } = req.body;
    if (!partno || !partname) return res.status(400).json({ success: false, message: 'กรุณาระบุ partno และ partname' });

    const vSpecMin = (specmin === '' || specmin === undefined) ? null : specmin;
    const vSpecMax = (specmax === '' || specmax === undefined) ? null : specmax;

    const query = `
      INSERT INTO parts (part_no, part_name, material, spec_min, spec_max, scale, standard_ref)
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *
    `;
    const result = await db.query(query, [partno, partname, material, vSpecMin, vSpecMax, scale, standardref]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ success: false, message: 'Part No นี้มีอยู่แล้ว' });
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePart = async (req, res) => {
  try {
    const { partNo } = req.params;
    const { partname, material, specmin, specmax, scale } = req.body;
    const query = `
      UPDATE parts SET part_name = $1, material = $2, spec_min = $3, spec_max = $4, scale = $5 
      WHERE part_no = $6 RETURNING *
    `;
    const result = await db.query(query, [partname, material, specmin, specmax, scale, partNo]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deletePart = async (req, res) => {
  try {
    const { partNo } = req.params;
    await db.query('DELETE FROM parts WHERE part_no = $1', [partNo]);
    res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSuppliers = async (req, res) => {
  try {
    const result = await db.query(`SELECT id, name, code FROM suppliers ORDER BY name ASC`);
    res.json(result.rows);
  } catch (error) { res.json([]); }
};

// ==========================================
// 2. Inspection Transaction
// ==========================================
exports.createInspection = async (req, res) => {
  const client = await db.getClient();
  try {
    let inputData = req.body;
    if (req.body.data && typeof req.body.data === 'string') {
      try { inputData = { ...inputData, ...JSON.parse(req.body.data) }; } catch (e) { }
    }

    const normalizedData = {};
    Object.keys(inputData).forEach(key => normalizedData[key.toLowerCase()] = inputData[key]);

    const {
      partname, partno, heatno_supplier, lotno, processtype,
      inspector, testpoint, testvalues, reportno, supplier,
      specmin, specmax, receiptdate
    } = normalizedData;

    const finalPartName = partname || partno;
    const finalPartNo = partno || '';

    let mainFilePath = null;
    if (req.files && req.files.length > 0) mainFilePath = req.files[0].path.replace(/\\/g, "/");

    let calculatedStatus = 'PENDING';
    let calculatedAverage = 0;
    let finalTestValuesJson = '[]';
    let valuesArray = testvalues;
    if (typeof testvalues === 'string') { try { valuesArray = JSON.parse(testvalues); } catch (e) { valuesArray = []; } }

    if (Array.isArray(valuesArray) && valuesArray.length > 0) {
      const validNumbers = valuesArray.map(v => parseFloat(v)).filter(n => !isNaN(n));
      if (validNumbers.length > 0) {
        const sum = validNumbers.reduce((a, b) => a + b, 0);
        calculatedAverage = parseFloat((sum / validNumbers.length).toFixed(2));
        finalTestValuesJson = JSON.stringify(validNumbers);
        if (specmin && specmax) {
          calculatedStatus = (calculatedAverage >= parseFloat(specmin) && calculatedAverage <= parseFloat(specmax)) ? 'PASS' : 'FAIL';
        }
      }
    }

    await client.query('BEGIN');

    const query = `
      INSERT INTO hardness_inspections (
        part_no, part_name, heat_no_supplier, lot_no, process_type,
        inspector, test_point, test_values, average_value, status, 
        remarks, report_no, supplier, file_path, receipt_date,
        created_at, updated_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING id
    `;

    const values = [
      finalPartNo, finalPartName, heatno_supplier || '', lotno || '', processtype || '',
      inspector || 'Unassigned', testpoint || 'Surface', finalTestValuesJson, calculatedAverage, calculatedStatus,
      '', reportno || '', supplier || '', mainFilePath,
      receiptdate || null
    ];

    const result = await client.query(query, values);
    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'บันทึกสำเร็จ', data: result.rows[0] });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Create Error:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally { client.release(); }
};

// ==========================================
// 3. History & Management
// ==========================================
exports.getHistory = async (req, res) => {
  try {
    const { month } = req.query;
    let whereClause = "";
    const params = [];

    if (month) {
      whereClause = `WHERE TO_CHAR(receipt_date, 'YYYY-MM') = $1`;
      params.push(month);
    }

    const result = await db.query(`
      SELECT 
        id, part_no AS "partno", part_name AS "partname", lot_no AS "lotno", heat_no_supplier AS "heatno_supplier",
        inspector, test_point AS "testpoint", average_value AS "value", status AS "result",
        file_path AS "fileurl", remarks AS "note",
        TO_CHAR(created_at, 'YYYY-MM-DD') AS "date",
        TO_CHAR(receipt_date, 'YYYY-MM-DD') AS "receiptdate",
        report_no AS "reportno", supplier, test_values AS "testvalues", process_type AS "processtype",
        CASE WHEN test_point = 'Surface' THEN status ELSE NULL END AS "surfacestatus",
        CASE WHEN test_point = 'Core' THEN status ELSE NULL END AS "corestatus",
        remarks AS "editdetails"
      FROM hardness_inspections 
      ${whereClause}
      ORDER BY receipt_date DESC 
      LIMIT 100
    `, params);

    const formattedRows = result.rows.map(row => ({
      ...row,
      fileurl: row.fileurl ? `http://192.168.0.26:5000/${row.fileurl.replace(/\\/g, '/')}` : null
    }));

    res.json(formattedRows);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ==========================================
// ✅ FIX: getInspectionDetails - ลบ master. schema ออก + แก้ field mapping
// ==========================================
exports.getInspectionDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ FIX: ลบ master. ออกจาก JOIN (เหมือนกับ getParts/getSuppliers ที่แก้แล้ว)
    const result = await db.query(`
        SELECT h.*, 
               p.spec_min, p.spec_max, p.scale, 
               s.name as supplier_name 
        FROM hardness_inspections h
        LEFT JOIN parts p ON h.part_no = p.part_no
        LEFT JOIN suppliers s ON h.supplier = s.name
        WHERE h.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูล' });
    }

    const row = result.rows[0];

    // ✅ FIX: field mapping ให้ตรงกับที่ Frontend อ่าน
    const formattedData = {
      header: {
        job_id: row.id,
        part_no: row.part_no,         // ✅ Frontend ใช้ header.part_no
        part_name: row.part_name,     // ✅ Frontend ใช้ header.part_name
        lot_no: row.lot_no,           // ✅ Frontend ใช้ header.lot_no
        heat_no_supplier: row.heat_no_supplier, // ✅ Frontend ใช้ header.heat_no_supplier
        process_type: row.process_type,         // ✅ Frontend ใช้ header.process_type
        inspector_name: row.inspector,          // ✅ Frontend ใช้ header.inspector_name
        overall_status: row.status,             // ✅ Frontend ใช้ header.overall_status
        remarks: row.remarks || '',
        report_no: row.report_no,               // ✅ Frontend ใช้ header.report_no
        supplier: row.supplier,
        supplier_name: row.supplier_name,

        // Dates
        job_date_fmt: new Date(row.created_at).toLocaleDateString('th-TH'),
        job_time_fmt: new Date(row.created_at).toLocaleTimeString('th-TH'),
        receiptdate: row.receipt_date ? new Date(row.receipt_date).toISOString().split('T')[0] : '',

        // Spec snapshots (จาก master parts JOIN)
        spec_min_snapshot: row.spec_min,   // ✅ Frontend ใช้ header.spec_min_snapshot
        spec_max_snapshot: row.spec_max,   // ✅ Frontend ใช้ header.spec_max_snapshot
        scale_snapshot: row.scale || 'HRC', // ✅ Frontend ใช้ header.scale_snapshot
      },

      // ✅ Parse test_values JSON → measurements array
      measurements: (() => {
        try {
          const values = JSON.parse(row.test_values || '[]');
          return values.map((v, i) => ({
            id: i + 1,
            piece_no: i + 1,
            measure_value: v,
            point_type: row.test_point || 'Surface',
            status: (row.spec_min != null && row.spec_max != null)
              ? (v >= parseFloat(row.spec_min) && v <= parseFloat(row.spec_max) ? 'PASS' : 'FAIL')
              : 'PENDING'
          }));
        } catch (e) {
          return [];
        }
      })(),

      attachments: row.file_path
        ? [{ id: 1, file_name: row.file_path.split('/').pop(), file_path: row.file_path }]
        : [],
      history: []
    };

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("getInspectionDetails Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// ✅ FIX: updateInspection - เพิ่ม logic คำนวณ test_values ใหม่
// ==========================================
exports.updateInspection = async (req, res) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    let bodyData = req.body.updateData || req.body;
    if (typeof bodyData === 'string') { try { bodyData = JSON.parse(bodyData); } catch (e) { } }

    const normalizedData = {};
    Object.keys(bodyData).forEach(k => normalizedData[k.toLowerCase()] = bodyData[k]);

    const {
      status, remarks, inspector, reportno, supplier,
      lotno, heatno_supplier, processtype, editreason,
      testvalues, receiptdate
    } = normalizedData;

    await client.query('BEGIN');

    // ดึงข้อมูลปัจจุบัน
    const currentJobRes = await client.query(`
      SELECT h.*, p.spec_min, p.spec_max 
      FROM hardness_inspections h
      LEFT JOIN parts p ON h.part_no = p.part_no
      WHERE h.id = $1
    `, [id]);

    if (currentJobRes.rows.length === 0) throw new Error('ไม่พบรายการนี้ในระบบ');
    const currentJob = currentJobRes.rows[0];

    // ✅ คำนวณ test_values ใหม่ (ถ้ามีการส่งค่ามา)
    let newTestValuesJson = currentJob.test_values; // ใช้ค่าเดิมเป็น default
    let newAverage = currentJob.average_value;
    let newStatus = status || currentJob.status;

    if (testvalues && Array.isArray(testvalues) && testvalues.length > 0) {
      const validNumbers = testvalues.map(v => parseFloat(v)).filter(n => !isNaN(n));
      if (validNumbers.length > 0) {
        const sum = validNumbers.reduce((a, b) => a + b, 0);
        newAverage = parseFloat((sum / validNumbers.length).toFixed(2));
        newTestValuesJson = JSON.stringify(validNumbers);

        // คำนวณ status ใหม่จาก spec
        const specMin = currentJob.spec_min ? parseFloat(currentJob.spec_min) : null;
        const specMax = currentJob.spec_max ? parseFloat(currentJob.spec_max) : null;
        if (specMin !== null && specMax !== null) {
          newStatus = (newAverage >= specMin && newAverage <= specMax) ? 'PASS' : 'FAIL';
        }
      }
    }

    // ✅ สร้าง edit detail string
    const editDetail = editreason
      ? `[แก้ไข ${new Date().toLocaleDateString('th-TH')}] ${editreason}`
      : currentJob.remarks;

    // ✅ Handle file upload (ถ้ามีไฟล์ใหม่)
    let newFilePath = currentJob.file_path;
    if (req.files && req.files.length > 0) {
      newFilePath = req.files[0].path.replace(/\\/g, "/");
    }

    const updateQuery = `
      UPDATE hardness_inspections SET 
        status = $1,
        remarks = $2,
        inspector = COALESCE($3, inspector),
        report_no = COALESCE($4, report_no),
        supplier = COALESCE($5, supplier),
        lot_no = COALESCE($6, lot_no),
        heat_no_supplier = COALESCE($7, heat_no_supplier),
        process_type = COALESCE($8, process_type),
        receipt_date = $9,
        test_values = $10,
        average_value = $11,
        file_path = COALESCE($12, file_path),
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `;

    await client.query(updateQuery, [
      newStatus,                    // $1
      editDetail,                   // $2
      inspector || null,            // $3
      reportno || null,             // $4
      supplier || null,             // $5
      lotno || null,                // $6
      heatno_supplier || null,      // $7
      processtype || null,          // $8
      receiptdate || null,          // $9
      newTestValuesJson,            // $10
      newAverage,                   // $11
      newFilePath,                  // $12
      id                            // $13
    ]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'บันทึกการแก้ไขสำเร็จ' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Update Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally { client.release(); }
};

exports.deleteInspection = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM hardness_inspections WHERE id = $1`, [id]);
    res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};