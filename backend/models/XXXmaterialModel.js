// models/materialModel.js
import pool from '../db.js';

// 1. ดึงข้อมูลรายการตรวจ พร้อม Join ตาราง PDF
export const getAllMaterials = async () => {
  // ใช้ SQL Query แบบ LEFT JOIN และรวมไฟล์ PDF เป็น JSON Array ในคอลัมน์เดียวชื่อ 'attached_files'
  const query = `
    SELECT 
      mi.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', f.id,
            'file_path', f.file_path,
            'original_name', f.original_name
          )
        ) FILTER (WHERE f.id IS NOT NULL), 
        '[]'
      ) AS attached_files
    FROM material_inspections mi
    LEFT JOIN inspection_files f ON mi.id = f.inspection_id
    GROUP BY mi.id
    ORDER BY mi.created_at DESC
  `;

  const res = await pool.query(query);
  return res.rows;
};

// 2. สร้างรายการตรวจใหม่ + บันทึกไฟล์ PDF
export const createMaterial = async (data, files) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN'); // เริ่ม Transaction (เพื่อให้ข้อมูลเข้าพร้อมกันทั้ง 2 ตาราง)

    // 2.1 Insert ข้อมูลหลักลงตาราง material_inspections
    // (ปรับชื่อคอลัมน์ให้ตรงกับ DB จริงของคุณ)
    const insertText = `
      INSERT INTO material_inspections (
        material_type, material_grade, batch_number, 
        supplier_name, maker_mat, receipt_date, 
        invoice_number, cer_number, inspector, 
        inspection_quantity, notes, overall_result, 
        bar_inspections, rod_inspections, image_paths
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
      RETURNING id, batch_number
    `;
    
    // แปลง image_paths ให้เป็น JSON string (ถ้า DB เก็บแบบนั้น)
    const imagePathsJson = JSON.stringify(data.image_paths || []); 
    
    const insertValues = [
      data.material_type, data.material_grade, data.batch_number,
      data.supplier_name, data.maker_mat, data.receipt_date,
      data.invoice_number, data.cer_number, data.inspector,
      data.inspection_quantity, data.notes, data.overall_result,
      JSON.stringify(data.barInspections || []), // ต้องแปลง Object เป็น JSON
      JSON.stringify(data.rodInspections || []),
      imagePathsJson 
    ];

    const res = await client.query(insertText, insertValues);
    const newInspectionId = res.rows[0].id;

    // 2.2 Insert ไฟล์ PDF ลงตาราง inspection_files (ถ้ามีไฟล์ส่งมา)
    if (files && files.length > 0) {
      // สร้าง Query สำหรับ insert หลาย row พร้อมกัน
      // เช่น: VALUES ($1, $2, $3), ($4, $5, $6), ...
      const fileValues = [];
      let paramCount = 1;
      const valueClauses = [];

      files.forEach(file => {
        valueClauses.push(`($${paramCount}, $${paramCount + 1}, $${paramCount + 2})`);
        fileValues.push(newInspectionId, file.path, file.originalname); // path กับ originalname มาจาก multer
        paramCount += 3;
      });

      const insertFileQuery = `
        INSERT INTO inspection_files (inspection_id, file_path, original_name)
        VALUES ${valueClauses.join(', ')}
      `;

      await client.query(insertFileQuery, fileValues);
    }

    await client.query('COMMIT'); // ยืนยันการบันทึก
    return res.rows[0];

  } catch (err) {
    await client.query('ROLLBACK'); // ถ้าพังให้ยกเลิกทั้งหมด
    throw err;
  } finally {
    client.release();
  }
};