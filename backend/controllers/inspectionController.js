import {
  getAllInspections,
  getInspectionStats,
  createInspection,
  updateInspection,
  deleteInspection,
} from "../models/inspectionModel.js";

// GET all inspections with filters and pagination
export const getInspections = async (req, res) => {
  try {
    console.log("Query Params Received:", req.query); // ดู log ว่า frontend ส่งอะไรมา
    // ✅ 1. แก้ไข: รับค่า Filter ใหม่ๆ จาก Query Params
    const { 
      status, 
      supplier_name, // Frontend ส่งมาเป็น supplier_name หรือ supplier เช็คให้ตรงกัน
      maker_mat,     // ✅ เพิ่มตัวกรอง Maker Mat
      receipt_date,  // ✅ เพิ่มตัวกรอง Receipt Date
      material_grade,
      cer_number,
      page = 1, 
      limit = 10 
    } = req.query;

    const filters = {
      status: status || null,
      supplier_name: supplier_name || req.query.supplier || null, // รองรับทั้งสองชื่อ
      maker_mat: maker_mat || null,       // ✅ ส่งเข้า Model
      receipt_date: receipt_date || null, // ✅ ส่งเข้า Model
      material_grade: material_grade || null,
      cer_number: cer_number || null,
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const result = await getAllInspections(filters);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error("❌ Error in getInspections:", err);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching inspections.",
    });
  }
};

// GET statistics (ส่วนนี้ไม่ต้องแก้)
export const getStats = async (req, res) => {
  try {
    const stats = await getInspectionStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error("❌ Error in getStats:", err.message);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching stats.",
    });
  }
};

// POST create new inspection
export const addInspection = async (req, res) => {
  console.log("--- ADD INSPECTION START ---");
  console.log("Received Body:", req.body);

  try {
    // --- STEP 1: VALIDATE REQUIRED FIELDS ---
    const {
      material_type,
      material_grade,
      batch_number,
      supplier_name,
      maker_mat,      // ✅ รับค่า
      receipt_date,   // ✅ รับค่า
      invoice_number,
      inspector,
    } = req.body;

    // ✅ 2. แก้ไข: เพิ่ม validation ให้ maker_mat และ receipt_date จำเป็นต้องมี
    if (
      !material_type || 
      !material_grade || 
      !batch_number || 
      !supplier_name || 
      !invoice_number || 
      !inspector || 
      !maker_mat ||   // ✅ เช็คว่าห้ามว่าง
      !receipt_date   // ✅ เช็คว่าห้ามว่าง
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (Please check Maker Mat or Receipt Date).",
      });
    }

    // --- STEP 2: PREPARE DATA FOR SAVING ---
    const data = { ...req.body };

    // Parse nested JSON from FormData (สำคัญมาก เพราะ FormData ส่ง Array มาเป็น String)
    if (data.bar_inspections && typeof data.bar_inspections === "string") {
      try {
        data.bar_inspections = JSON.parse(data.bar_inspections);
      } catch (e) {
        console.error("Error parsing bar_inspections", e);
        data.bar_inspections = [];
      }
    }
    if (data.rod_inspections && typeof data.rod_inspections === "string") {
      try {
        data.rod_inspections = JSON.parse(data.rod_inspections);
      } catch (e) {
        console.error("Error parsing rod_inspections", e);
        data.rod_inspections = [];
      }
    }

    // Process uploaded files
    if (req.files && req.files.length > 0) {
      data.image_paths = req.files.map((file) => file.path); // หรือ file.filename ขึ้นอยู่กับ config upload
    }

    // --- STEP 3: SAVE TO DATABASE ---
    // เรียกใช้ Model (ต้องแน่ใจว่า Model เขียน SQL รองรับ maker_mat แล้ว)
    const newInspection = await createInspection(data);

    res.status(201).json({
      success: true,
      message: "Inspection created successfully",
      data: newInspection,
    });

  } catch (error) {
    console.error("--- 🚨 SAVE FAILED 🚨 ---", error);
    res.status(500).json({
      success: false,
      message: "Failed to create inspection.",
      error: error.message,
    });
  }
};

// PUT update inspection
export const editInspection = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body }; // Copy body มาเพื่อแก้ไข

    // ✅ 3. แก้ไข: เพิ่ม Logic การ Parse JSON เหมือนตอน Create 
    // เพราะถ้าแก้ไขแล้วมีการแนบรูปใหม่มาด้วย Frontend อาจจะส่งมาเป็น FormData ซึ่ง Array จะกลายเป็น String
    if (updateData.bar_inspections && typeof updateData.bar_inspections === "string") {
        updateData.bar_inspections = JSON.parse(updateData.bar_inspections);
    }
    if (updateData.rod_inspections && typeof updateData.rod_inspections === "string") {
        updateData.rod_inspections = JSON.parse(updateData.rod_inspections);
    }
    
    // จัดการไฟล์ใหม่ถ้ามีการอัปโหลดเพิ่มตอนแก้ไข
    if (req.files && req.files.length > 0) {
        // Logic นี้ขึ้นอยู่กับว่าคุณอยาก "เพิ่มต่อ" หรือ "ทับของเดิม"
        // อันนี้สมมติว่าเอา path ใหม่ใส่เข้าไป (Backend Model ต้องจัดการต่อเอง)
        //updateData.new_images = req.files.map((file) => file.path);
        data.uploaded_files = req.files.map((file) => ({
          file_path: file.path.replace(/\\/g, "/"),
          original_name: file.originalname, // สำคัญ! ต้องเก็บชื่อเดิม
          file_type: file.mimetype
      }));
    }

    if (!id) {
      return res.status(400).json({ success: false, error: "Inspection ID is required" });
    }
    
    const updated = await updateInspection(id, updateData);
    
    if (!updated) {
      return res.status(404).json({ success: false, error: "Inspection not found" });
    }
    res.json({
      success: true,
      message: "Inspection updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Error in editInspection:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE inspection (ส่วนนี้ไม่ต้องแก้)
export const removeInspection = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: "Inspection ID is required" });
    }
    const result = await deleteInspection(id);
    if (!result) {
      return res.status(404).json({ success: false, error: "Inspection not found" });
    }
    res.status(204).send();
  } catch (err) {
    console.error("Error in removeInspection:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};