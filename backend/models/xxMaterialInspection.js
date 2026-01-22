const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MaterialInspection = sequelize.define(
    "MaterialInspection",
    {
      inspectionNumber: {
        type: DataTypes.STRING,
        unique: true,
        field: "inspection_number",
      },
      materialType: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "material_type",
        validate: {
          isIn: [["bar", "rod"]],
        },
      },
      materialGrade: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "material_grade",
      },
      batchNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        // unique: true, // ⚠️ หมายเหตุ: ถ้า Batch ซ้ำกันได้ (เช่น มาคนละล็อต หรือคนละปี) อาจจะต้องเอา unique ออกครับ
        field: "batch_number",
      },
      invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "invoice_number",
        defaultValue: "N/A",
      },
      cerNumber: {
        type: DataTypes.STRING,
        field: "cer_number",
      },
      supplierName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "supplier_name",
      },

      // ✅ แก้ไข 1: เปลี่ยนชื่อ property ให้เป็น makerMat (ไม่มี r ตรงกลาง) ให้ตรงกับความหมาย "ผู้ผลิต"
      makerMat: {
        type: DataTypes.STRING, 
        allowNull: true,
        field: "maker_mat", // ชื่อใน DB ต้องตรงกับ SQL ที่เรา ALTER ไป
      },

      // ✅ ส่วนนี้ถูกต้องแล้ว
      receiptDate: {
        type: DataTypes.DATEONLY,
        field: "receipt_date",
      },

      inspector: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Unassigned",
      },
      inspectionQuantity: {
        type: DataTypes.INTEGER,
        field: "inspection_quantity",
        defaultValue: 0,
      },
      notes: {
        type: DataTypes.TEXT,
      },
      overallResult: {
        type: DataTypes.ENUM("pass", "fail", "pending"),
        defaultValue: "pending",
        allowNull: false,
        field: "overall_result",
      },
      
      // JSON Fields
      barInspections: {
        type: DataTypes.JSONB,
        field: "bar_inspections",
      },
      rodInspections: {
        type: DataTypes.JSONB,
        field: "rod_inspections",
      },

      // ✅ แก้ไข 2: เพิ่มฟิลด์รูปภาพ (Array of Text)
      imagePaths: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        field: "image_paths",
      },

      userId: {
        type: DataTypes.INTEGER,
        field: "user_id",
        references: {
          model: "users", // ต้องมั่นใจว่าตาราง users มีอยู่จริงและชื่อตรงกัน
          key: "id",
        },
        onDelete: "SET NULL",
      },
      
      // เพิ่ม inspector_id ด้วยก็ได้ถ้าใน SQL มี
      inspectorId: {
        type: DataTypes.INTEGER,
        field: "inspector_id"
      }
    },
    {
      tableName: "material_inspections", // ชื่อตารางใน DB
      timestamps: true,
      underscored: true, // แปลง camelCase -> snake_case อัตโนมัติสำหรับ created_at, updated_at
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  // Hook สำหรับสร้าง Inspection Number อัตโนมัติ
  MaterialInspection.beforeCreate(async (inspection) => {
    const latest = await MaterialInspection.findOne({
      order: [["id", "DESC"]],
      // paranoid: false, // ใช้เฉพาะถ้า model มี deletedAt (Soft Delete)
    });
    const nextId = latest ? latest.id + 1 : 1;
    const year = new Date().getFullYear();
    
    // สร้าง Format: MI-2024-00001
    inspection.inspectionNumber = `MI-${year}-${String(nextId).padStart(5, "0")}`;
  });

  console.log("✅ MaterialInspection model loaded");
  return MaterialInspection;
};