// models/inspections/FinalInspection.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FinalInspection = sequelize.define('FinalInspection', {
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
    productSpecification: {
      type: DataTypes.TEXT,
      field: 'product_specification'
    },
    dimensionalInspectionResult: {
      type: DataTypes.ENUM('pass', 'fail', 'pending'),
      defaultValue: 'pending',
      field: 'dimensional_inspection_result'
    },
    surfaceFinishResult: {
      type: DataTypes.ENUM('pass', 'fail', 'pending'),
      defaultValue: 'pending',
      field: 'surface_finish_result'
    },
    visualInspectionResult: {
      type: DataTypes.ENUM('pass', 'fail', 'pending'),
      defaultValue: 'pending',
      field: 'visual_inspection_result'
    },
    ndtTestingResult: {
      type: DataTypes.ENUM('pass', 'fail', 'pending'),
      defaultValue: 'pending',
      field: 'ndt_testing_result'
    },
    packagingInspectionResult: {
      type: DataTypes.ENUM('pass', 'fail', 'pending'),
      defaultValue: 'pending',
      field: 'packaging_inspection_result'
    },
    documentationCheckResult: {
      type: DataTypes.ENUM('pass', 'fail', 'pending'),
      defaultValue: 'pending',
      field: 'documentation_check_result'
    },
    overallResult: {
      type: DataTypes.ENUM('pass', 'fail', 'pending'),
      defaultValue: 'pending',
      field: 'overall_result'
    },
    quantityInspected: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'quantity_inspected'
    },
    quantityAccepted: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'quantity_accepted'
    },
    quantityRejected: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'quantity_rejected'
    },
    inspectedAt: {
      type: DataTypes.DATE,
      field: 'inspected_at'
    },
    approvedAt: {
      type: DataTypes.DATE,
      field: 'approved_at'
    },
    shippedAt: {
      type: DataTypes.DATE,
      field: 'shipped_at'
    },
    certificateIssued: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'certificate_issued'
    },
    certificateNumber: {
      type: DataTypes.STRING(100),
      field: 'certificate_number'
    },
    notes: DataTypes.TEXT
  }, {
    tableName: 'final_inspections',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  FinalInspection.associate = (models) => {
    FinalInspection.belongsTo(models.ProductionBatch, {
      foreignKey: 'batchId',
      as: 'batch'
    });
    FinalInspection.belongsTo(models.User, {
      foreignKey: 'inspectorId',
      as: 'inspector'
    });
    FinalInspection.belongsTo(models.User, {
      foreignKey: 'qaManagerApprovalId',
      as: 'qaManager'
    });
    FinalInspection.belongsTo(models.User, {
      foreignKey: 'customerWitnessId',
      as: 'customerWitness'
    });
  };

  return FinalInspection;
};
