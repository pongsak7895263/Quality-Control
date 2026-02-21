/**
 * inspectionController.js - ฉบับแก้ไข (Fix Null Validation Error)
 * แก้ไขปัญหา: Map keys จาก snake_case (Frontend) -> camelCase (Database Model)
 */

const db = require("../models");
const { MaterialInspection, InspectionFile } = db;
const { Op } = db.Sequelize;

const inspectionController = {

  // ----------------------------------------------------------------
  // 1. GET ALL
  // ----------------------------------------------------------------
  getInspections: async (req, res) => {
    try {
      const { 
        page = 1, limit = 10, search, 
        status, material_grade, supplier_name, month 
      } = req.query;

      const where = {};

      if (search) {
        where[Op.or] = [
          { batchNumber: { [Op.iLike]: `%${search}%` } }, // แก้เป็น camelCase
          { supplierName: { [Op.iLike]: `%${search}%` } },
          { makerMat: { [Op.iLike]: `%${search}%` } },
          { invoiceNumber: { [Op.iLike]: `%${search}%` } },
          { materialGrade: { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (status) where.overallResult = status;
      if (material_grade) where.materialGrade = material_grade;
      if (supplier_name) where.supplierName = { [Op.iLike]: `%${supplier_name}%` };

      if (month) {
        const startDate = new Date(`${month}-01`);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        where.receiptDate = { [Op.between]: [startDate, endDate] };
      }

      const offset = (page - 1) * limit;
      const { count, rows } = await MaterialInspection.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [
          {
            model: InspectionFile,
            as: 'attached_files',
            attributes: ['id', 'file_path', 'original_name', 'file_type', 'file_size']
          }
        ],
        distinct: true
      });

      res.json({
        success: true,
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      });

    } catch (err) {
      console.error("❌ Error in getInspections:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // ----------------------------------------------------------------
  // 2. GET STATS
  // ----------------------------------------------------------------
  getStats: async (req, res) => {
    try {
      const totalInspections = await MaterialInspection.count();
      const passCount = await MaterialInspection.count({ where: { overallResult: 'pass' } });
      const failCount = await MaterialInspection.count({ where: { overallResult: 'fail' } });
      const pendingCount = await MaterialInspection.count({ where: { overallResult: 'pending' } });

      res.json({
        success: true,
        data: { totalInspections, passCount, failCount, pendingCount }
      });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to fetch stats" });
    }
  },

  // ----------------------------------------------------------------
  // 3. CREATE (แก้ไข: Map ข้อมูลให้ตรง Model)
  // ----------------------------------------------------------------
  addInspection: async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      // ดึงค่าจาก Frontend (snake_case)
      const {
        material_type, material_grade, batch_number, supplier_name,
        maker_mat, receipt_date, invoice_number, inspector, 
        cer_number, inspection_quantity, notes, overall_result,
        bar_inspections, rod_inspections
      } = req.body;

      // แปลง JSON String (ถ้ามี)
      let parsedBars = [], parsedRods = [];
      try { parsedBars = (typeof bar_inspections === 'string') ? JSON.parse(bar_inspections) : bar_inspections || []; } catch(e) {}
      try { parsedRods = (typeof rod_inspections === 'string') ? JSON.parse(rod_inspections) : rod_inspections || []; } catch(e) {}

      // ✅ สร้าง Object ใหม่ให้ Key ตรงกับ Model (camelCase)
      const payload = {
        materialType: material_type,
        materialGrade: material_grade,
        batchNumber: batch_number,
        supplierName: supplier_name,
        makerMat: maker_mat,
        receiptDate: receipt_date,
        invoiceNumber: invoice_number,
        inspector: inspector,
        cerNumber: cer_number,
        inspectionQuantity: inspection_quantity,
        notes: notes,
        overallResult: overall_result || 'pending',
        barInspections: parsedBars, // Model จะบันทึกเป็น JSON เอง
        rodInspections: parsedRods
      };

      // บันทึก Header
      const newInsp = await MaterialInspection.create(payload, { transaction: t });

      // บันทึกไฟล์
      if (req.files && req.files.length > 0) {
        const fileData = req.files.map((file) => ({
          inspection_id: newInsp.id,
          file_path: file.path.replace(/\\/g, "/"), 
          original_name: file.originalname,
          file_type: file.mimetype,
          file_size: file.size
        }));
        await InspectionFile.bulkCreate(fileData, { transaction: t });
      }

      await t.commit();
      res.status(201).json({ success: true, message: "Created successfully", data: newInsp });

    } catch (error) {
      await t.rollback();
      console.error("🚨 ADD FAILED:", error);
      res.status(500).json({ success: false, message: error.message, error: error });
    }
  },

  // ----------------------------------------------------------------
  // 4. UPDATE (แก้ไข: Map ข้อมูลให้ตรง Model)
  // ----------------------------------------------------------------
  editInspection: async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { id } = req.params;
      const {
        material_type, material_grade, batch_number, supplier_name,
        maker_mat, receipt_date, invoice_number, inspector, 
        cer_number, inspection_quantity, notes, overall_result,
        bar_inspections, rod_inspections
      } = req.body;

      let parsedBars = [], parsedRods = [];
      try { parsedBars = (typeof bar_inspections === 'string') ? JSON.parse(bar_inspections) : bar_inspections; } catch(e) {}
      try { parsedRods = (typeof rod_inspections === 'string') ? JSON.parse(rod_inspections) : rod_inspections; } catch(e) {}

      // ✅ Map ข้อมูลสำหรับ Update
      const updatePayload = {};
      if (material_type) updatePayload.materialType = material_type;
      if (material_grade) updatePayload.materialGrade = material_grade;
      if (batch_number) updatePayload.batchNumber = batch_number;
      if (supplier_name) updatePayload.supplierName = supplier_name;
      if (maker_mat) updatePayload.makerMat = maker_mat;
      if (receipt_date) updatePayload.receiptDate = receipt_date;
      if (invoice_number) updatePayload.invoiceNumber = invoice_number;
      if (inspector) updatePayload.inspector = inspector;
      if (cer_number) updatePayload.cerNumber = cer_number;
      if (inspection_quantity) updatePayload.inspectionQuantity = inspection_quantity;
      if (notes) updatePayload.notes = notes;
      if (overall_result) updatePayload.overallResult = overall_result;
      if (parsedBars) updatePayload.barInspections = parsedBars;
      if (parsedRods) updatePayload.rodInspections = parsedRods;

      const [updated] = await MaterialInspection.update(updatePayload, { where: { id }, transaction: t });
      
      if (!updated) {
        await t.rollback();
        return res.status(404).json({ success: false, error: "Not found" });
      }

      // เพิ่มไฟล์ใหม่
      if (req.files && req.files.length > 0) {
          const fileData = req.files.map((file) => ({
            inspection_id: id,
            file_path: file.path.replace(/\\/g, "/"),
            original_name: file.originalname,
            file_type: file.mimetype,
            file_size: file.size
          }));
          await InspectionFile.bulkCreate(fileData, { transaction: t });
      }

      await t.commit();
      
      const updatedInspection = await MaterialInspection.findByPk(id, {
        include: [{ model: InspectionFile, as: 'attached_files' }]
      });
      res.json({ success: true, message: "Updated successfully", data: updatedInspection });

    } catch (err) {
      await t.rollback();
      console.error("❌ EDIT FAILED:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // ----------------------------------------------------------------
  // 5. DELETE
  // ----------------------------------------------------------------
  removeInspection: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await MaterialInspection.destroy({ where: { id } });
      if (!result) return res.status(404).json({ success: false, error: "Not found" });
      res.status(200).json({ success: true, message: "Deleted successfully" });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};

module.exports = inspectionController;