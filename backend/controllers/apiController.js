// backend/controllers/apiController.js
const inspectionModel = require("../models/inspectionModel");

// GET ALL
exports.getInspections = async (req, res) => {
  try {
    // รับ Query Params (camelCase จาก Frontend)
    const {
      status,
      supplier,
      makerMat,
      receiptDate,
      materialGrade,
      cerNumber,
      page = 1,
      limit = 10,
    } = req.query;
    const filters = {
      status: status || null,
      supplier: supplier || null,
      makerMat: makerMat || null,       // ส่งไปแบบ camelCase เลย
      receiptDate: receiptDate || null, // ส่งไปแบบ camelCase เลย
      materialGrade: materialGrade || null, 
      cerNumber: cerNumber || null,
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const result = await inspectionModel.getAllInspections(filters);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("❌ Controller Error (Get):", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching inspections.",
      error: error.message, // ส่ง Error message กลับไปให้ Frontend เห็นชัดๆ
    });
  }
};

// STATS
exports.getInspectionStats = async (req, res) => {
  try {
    const stats = await inspectionModel.getInspectionStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// CREATE
exports.createInspection = async (req, res) => {
  try {
    // req.body ควรจะเป็น JSON Object (ถ้าใช้ express.json())
    // แต่ถ้าส่งมาเป็น FormData แล้ว parse แล้ว ให้ดึงออกมา
    let data = req.body;

    // กรณีส่ง FormData และ field ชื่อ 'data' เป็น string JSON
    if (req.body.data && typeof req.body.data === "string") {
      data = JSON.parse(req.body.data);
    }

    // ✅ จัดการไฟล์ที่อัปโหลด (เก็บ Path ลงตัวแปร data)
    if (req.files && req.files.length > 0) {
      // แยกรูปภาพ
      const images = req.files
        .filter(f => f.mimetype.startsWith('image/'))
        .map(f => f.path.replace(/\\/g, "/")); // แก้ Backslash สำหรับ Windows

      // แยกไฟล์ PDF (ถ้ามี)
      const pdfs = req.files
        .filter(f => f.mimetype === 'application/pdf')
        .map(f => f.path.replace(/\\/g, "/"));

      // รวมกันเก็บใน image_paths (หรือจะแยก field ใน DB ก็ได้ แต่ตอนนี้ใช้ field เดียวกันไปก่อน)
      data.image_paths = [...images, ...pdfs];
    }

    const newInspection = await inspectionModel.createInspection(data);
    res.status(201).json({ success: true, data: newInspection });
  } catch (error) {
    console.error("❌ Controller Error (Create):", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE
exports.updateInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
// ถ้ามีไฟล์ใหม่มาด้วย
if (req.files && req.files.length > 0) {
  const newFiles = req.files.map(f => f.path.replace(/\\/g, "/"));
  // Logic นี้ขึ้นอยู่กับว่าอยาก "เพิ่มต่อ" หรือ "ทับ" 
  // ในที่นี้สมมติว่าเพิ่มต่อ (ต้องไปเขียนเพิ่มใน Model ให้ดึงของเก่ามา concat)
  // หรือส่งไปให้ Model จัดการ
  data.new_files = newFiles; 
}
    // Parse JSON fields หากจำเป็น
    if (typeof data.bar_inspections === "string")
      data.bar_inspections = JSON.parse(data.bar_inspections);
    if (typeof data.rod_inspections === "string")
      data.rod_inspections = JSON.parse(data.rod_inspections);

    const updated = await inspectionModel.updateInspection(id, data);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE
exports.deleteInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await inspectionModel.deleteInspection(id);
    if (!result) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
