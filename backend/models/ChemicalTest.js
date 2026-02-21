// models/ChemicalTest.js
module.exports = (sequelize, DataTypes) => {
    const ChemicalTest = sequelize.define(
      "ChemicalTest",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        testNumber: {
          type: DataTypes.STRING(50),
          allowNull: false,
          unique: true,
          field: "test_number",
        },
        inspectionDate: {
          type: DataTypes.DATEONLY,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "inspection_date",
        },
        materialGrade: {
          type: DataTypes.STRING(50),
          allowNull: false,
          field: "material_grade",
        },
        heatNo: {
          type: DataTypes.STRING(100),
          allowNull: true,
          field: "heat_no",
        },
        certNo: {
          type: DataTypes.STRING(100),
          allowNull: true,
          field: "cert_no",
        },
        inspector: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        standard: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        manufacturer: {
          type: DataTypes.STRING(200),
          allowNull: true,
        },
        supplier: {
          type: DataTypes.STRING(200),
          allowNull: true,
        },
        approvedBy: {
          type: DataTypes.STRING(100),
          allowNull: true,
          field: "approved_by",
        },
        // หมายเหตุ: ควรใช้ ENUM ค่าใหญ่หรือเล็กอย่างใดอย่างหนึ่ง (ในที่นี้คงไว้ตามเดิมเพื่อกันข้อมูลหาย)
        testResult: {
          type: DataTypes.ENUM("PASS", "FAIL", "PENDING"),
          defaultValue: "PENDING",
          field: "test_result",
        },
        overallResult: {
          type: DataTypes.ENUM("pass", "fail", "pending"),
          defaultValue: "pending",
          field: "overall_result",
        },
        testValues: {
          type: DataTypes.JSONB, // ใช้ JSONB สำหรับ Postgres (ดีกว่า JSON ธรรมดา)
          allowNull: true,
          defaultValue: {},
          field: "test_values",
        },
        remarks: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        pdfFile: {
          type: DataTypes.TEXT, // Base64 string
          allowNull: true,
          field: "pdf_file",
        },
        pdfName: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: "pdf_name",
        },
        // --- Foreign Keys ---
        testedBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: "tested_by",
          references: { model: "users", key: "id" },
        },
        testedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "tested_at",
        },
        reviewedBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: "reviewed_by",
          references: { model: "users", key: "id" },
        },
        approvedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "approved_at",
        },
        materialInspectionId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: "material_inspection_id",
          references: { model: "material_inspections", key: "id" },
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        tableName: "chemical_tests",
        timestamps: true, // ✅ เปิดใช้งาน timestamps
        underscored: true, // ✅ ตัวนี้จะแปลง camelCase เป็น snake_case ให้เอง (createdAt -> created_at)
      }
    );
  
    // ✅ เพิ่ม Associate เพื่อให้สามารถ Join ตาราง (include) ได้
    ChemicalTest.associate = (models) => {
      // เชื่อมกับ User (ผู้ทดสอบ)
      if (models.User) {
          ChemicalTest.belongsTo(models.User, { foreignKey: 'testedBy', as: 'tester' });
          ChemicalTest.belongsTo(models.User, { foreignKey: 'reviewedBy', as: 'reviewer' });
      }
      // เชื่อมกับ MaterialInspection (ถ้ามี Model นี้)
      if (models.MaterialInspection) {
          ChemicalTest.belongsTo(models.MaterialInspection, { foreignKey: 'materialInspectionId', as: 'materialInspection' });
      }
    };
  
    return ChemicalTest;
  };