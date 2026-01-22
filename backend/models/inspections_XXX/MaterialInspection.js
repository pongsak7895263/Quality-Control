// models/inspections/MaterialInspection.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MaterialInspection = sequelize.define('MaterialInspection', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    inspectionNumber: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      field: 'inspection_number'
    },
    supplierName: {
      type: DataTypes.STRING(100),
      field: 'supplier_name'
    },
    materialType: {
      type: DataTypes.ENUM('steel_bar', 'steel_billet', 'raw_material'),
      field: 'material_type'
    },
    materialGrade: {
      type: DataTypes.STRING(50),
      field: 'material_grade'
    },
    receivedQuantity: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'received_quantity'
    },
    receivedDate: {
      type: DataTypes.DATEONLY,
      field: 'received_date'
    },
    certificateNumber: {
      type: DataTypes.STRING(100),
      field: 'certificate_number'
    },
    visualInspectionResult: {
      type: DataTypes.ENUM('pass', 'fail', 'pending'),
      defaultValue: 'pending',
      field: 'visual_inspection_result'
    },
    dimensionalCheckResult: {
      type: DataTypes.ENUM('pass', 'fail', 'pending'),
      defaultValue: 'pending',
      field: 'dimensional_check_result'
    },
    surfaceConditionResult: {
      type: DataTypes.ENUM('pass', 'fail', 'pending'),
      defaultValue: 'pending',
      field: 'surface_condition_result'
    },
    overallResult: {
      type: DataTypes.ENUM('pass', 'fail', 'pending'),
      defaultValue: 'pending',
      field: 'overall_result'
    },
    inspectedAt: {
      type: DataTypes.DATE,
      field: 'inspected_at'
    },
    approvedAt: {
      type: DataTypes.DATE,
      field: 'approved_at'
    },
    notes: DataTypes.TEXT
  }, {
    tableName: 'material_inspections',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  MaterialInspection.associate = (models) => {
    MaterialInspection.belongsTo(models.ProductionBatch, {
      foreignKey: 'batchId',
      as: 'batch'
    });
    MaterialInspection.belongsTo(models.User, {
      foreignKey: 'inspectorId',
      as: 'inspector'
    });
    MaterialInspection.belongsTo(models.User, {
      foreignKey: 'supervisorApprovalId',
      as: 'supervisor'
    });
    MaterialInspection.hasMany(models.ChemicalTest, {
      foreignKey: 'materialInspectionId',
      as: 'chemicalTests'
    });
  };

  return MaterialInspection;
};