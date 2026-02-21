// ไม่ต้อง require แล้ว เพราะรับมาจาก index.js
// const { DataTypes } = require("sequelize"); 

module.exports = (sequelize, DataTypes) => { // ✅ รับ DataTypes เข้ามาตรงนี้
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
      makerMat: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "maker_mat",
      },
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
      
      // JSON Fields (PostgreSQL ใช้ JSONB ดีแล้วครับ เร็วกว่า JSON ธรรมดา)
      barInspections: {
        type: DataTypes.JSONB,
        field: "bar_inspections",
      },
      rodInspections: {
        type: DataTypes.JSONB,
        field: "rod_inspections",
      },

      // Array Fields (PostgreSQL Only)
      imagePaths: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        field: "image_paths",
      },

      userId: {
        type: DataTypes.INTEGER,
        field: "user_id",
        references: {
          model: "users", 
          key: "id",
        },
        onDelete: "SET NULL",
      },
      
      inspectorId: {
        type: DataTypes.INTEGER,
        field: "inspector_id"
      }
    },
    {
      tableName: "material_inspections", 
      timestamps: true,
      underscored: true, 
      createdAt: "created_at", // Map ให้ชัวร์
      updatedAt: "updated_at", // Map ให้ชัวร์
    }
  );

  // Hook สร้าง Running Number
  MaterialInspection.beforeCreate(async (inspection) => {
    const latest = await MaterialInspection.findOne({
      order: [["id", "DESC"]],
    });
    const nextId = latest ? latest.id + 1 : 1;
    const year = new Date().getFullYear();
    
    // Format: MI-2024-00001
    inspection.inspectionNumber = `MI-${year}-${String(nextId).padStart(5, "0")}`;
  });

  console.log("✅ MaterialInspection model loaded");
  return MaterialInspection;
};