const { Op } = require("sequelize");
const db = require("./index"); 
const MaterialInspection = db.MaterialInspection;

if (!MaterialInspection) {
  throw new Error("MaterialInspection model not found.");
}

// 1. GET ALL INSPECTIONS
exports.getAllInspections = async (filters) => {
  try {
    const { 
      status, supplier, makerMat, receiptDate, 
      materialGrade, cerNumber, page, limit 
    } = filters;

    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.overallResult = status;
    if (supplier) where.supplierName = { [Op.iLike]: `%${supplier}%` };
    if (makerMat) where.makerMat = { [Op.iLike]: `%${makerMat}%` };
    if (receiptDate) where.receiptDate = receiptDate;
    if (materialGrade) where.materialGrade = materialGrade;
    if (cerNumber) where.cerNumber = { [Op.iLike]: `%${cerNumber}%` };
//Query
    const { count, rows } = await MaterialInspection.findAndCountAll({
      where,
      limit,
      offset,
      // ✅ แก้ไขจุดนี้: ใช้ชื่อคอลัมน์จริงใน DB (created_at)
      order: [["created_at", "DESC"]], 
    });

    const plainRows = rows.map((row) => row.get({ plain: true }));

    return {
      data: plainRows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  } catch (error) {
    console.error("❌ Model Error (getAllInspections):", error);
    throw error;
  }
};

// ... (ส่วนอื่นๆ getStats, create, update, delete เหมือนเดิมเป๊ะครับ ไม่ต้องแก้) ...
exports.getInspectionStats = async () => {
    const total = await MaterialInspection.count();
    const passCount = await MaterialInspection.count({ where: { overallResult: "pass" } });
    const failCount = await MaterialInspection.count({ where: { overallResult: "fail" } });
    const pendingCount = await MaterialInspection.count({ where: { overallResult: "pending" } });
    const passRate = total > 0 ? ((passCount / total) * 100).toFixed(1) : "0.00";
    return { totalInspections: total, passCount, failCount, pendingCount, passRate: parseFloat(passRate) };
};

exports.createInspection = async (data) => {
    const year = new Date().getFullYear();
    const lastRecord = await MaterialInspection.findOne({ order: [["id", "DESC"]] });
    const nextId = lastRecord ? lastRecord.id + 1 : 1;
    const inspectionNumber = `MI-${year}-${String(nextId).padStart(5, "0")}`;

    const newInspection = await MaterialInspection.create({
      inspectionNumber: inspectionNumber,
      materialType: data.material_type || data.materialType,
      materialGrade: data.material_grade || data.materialGrade,
      batchNumber: data.batch_number || data.batchNumber,
      supplierName: data.supplier_name || data.supplierName,
      makerMat: data.maker_mat || data.makerMat,
      receiptDate: data.receipt_date || data.receiptDate,
      invoiceNumber: data.invoice_number || data.invoiceNumber,
      cerNumber: data.cer_number || data.cerNumber,
      inspector: data.inspector,
      inspectionQuantity: data.inspection_quantity || data.inspectionQuantity,
      notes: data.notes,
      overallResult: data.overall_result || data.overallResult,
      barInspections: data.bar_inspections || data.barInspections,
      rodInspections: data.rod_inspections || data.rodInspections,
      imagePaths: data.image_paths || [],
      userId: data.user_id || data.userId,
      inspectorId: data.inspector_id || data.inspectorId
    });
    return newInspection.get({ plain: true });
};

exports.updateInspection = async (id, data) => {
    const map = (snake, camel) => { if (data[snake] !== undefined) return data[snake]; return data[camel]; };
    const updateData = {
       materialType: map("material_type", "materialType"),
       materialGrade: map("material_grade", "materialGrade"),
       batchNumber: map("batch_number", "batchNumber"),
       supplierName: map("supplier_name", "supplierName"),
       makerMat: map("maker_mat", "makerMat"),
       receiptDate: map("receipt_date", "receiptDate"),
       invoiceNumber: map("invoice_number", "invoiceNumber"),
       cerNumber: map("cer_number", "cerNumber"),
       inspector: map("inspector", "inspector"),
       inspectionQuantity: map("inspection_quantity", "inspectionQuantity"),
       notes: map("notes", "notes"),
       overallResult: map("overall_result", "overallResult"),
       barInspections: map("bar_inspections", "barInspections"),
       rodInspections: map("rod_inspections", "rodInspections"),
    };
    // กรอง undefined ออก
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const [updatedRows] = await MaterialInspection.update(updateData, { where: { id } });
    if (updatedRows > 0) return (await MaterialInspection.findByPk(id)).get({ plain: true });
    return null;
};

exports.deleteInspection = async (id) => {
    const deleted = await MaterialInspection.destroy({ where: { id } });
    return deleted > 0;
};