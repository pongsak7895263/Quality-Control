// models/inspections/ChemicalTest.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChemicalTest = sequelize.define('ChemicalTest', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    testNumber: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      field: 'test_number'
    },
    sampleId: {
      type: DataTypes.STRING(50),
      field: 'sample_id'
    },
    testType: {
      type: DataTypes.ENUM('incoming_material', 'process_control', 'final_product'),
      field: 'test_type'
    },
    materialGrade: {
      type: DataTypes.STRING(50),
      field: 'material_grade'
    },
    testMethod: {
      type: DataTypes.ENUM('spectroscopy', 'wet_chemistry'),
      field: 'test_method'
    },
    equipmentUsed: {
      type: DataTypes.STRING(100),
      field: 'equipment_used'
    },
    testTemperature: {
      type: DataTypes.DECIMAL(8, 2),
      field: 'test_temperature'
    },
    overallResult: {
      type: DataTypes.ENUM('pass', 'fail', 'pending'),
      defaultValue: 'pending',
      field: 'overall_result'
    },
    testedAt: {
      type: DataTypes.DATE,
      field: 'tested_at'
    },
    reviewedAt: {
      type: DataTypes.DATE,
      field: 'reviewed_at'
    },
    approvedAt: {
      type: DataTypes.DATE,
      field: 'approved_at'
    },
    notes: DataTypes.TEXT
  }, {
    tableName: 'chemical_tests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  ChemicalTest.associate = (models) => {
    ChemicalTest.belongsTo(models.MaterialInspection, {
      foreignKey: 'materialInspectionId',
      as: 'materialInspection'
    });
    ChemicalTest.belongsTo(models.ProductionBatch, {
      foreignKey: 'batchId',
      as: 'batch'
    });
    ChemicalTest.belongsTo(models.User, {
      foreignKey: 'testedBy',
      as: 'tester'
    });
    ChemicalTest.belongsTo(models.User, {
      foreignKey: 'reviewedBy',
      as: 'reviewer'
    });
    ChemicalTest.belongsTo(models.User, {
      foreignKey: 'approvedBy',
      as: 'approver'
    });
    ChemicalTest.hasMany(models.TestElementResult, {
      foreignKey: 'chemicalTestId',
      as: 'elementResults'
    });
  };

  return ChemicalTest;
};