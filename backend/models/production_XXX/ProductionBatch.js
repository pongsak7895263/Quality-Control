// models/production/ProductionBatch.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductionBatch = sequelize.define('ProductionBatch', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    batchNumber: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      field: 'batch_number'
    },
    materialGrade: {
      type: DataTypes.STRING(50),
      field: 'material_grade'
    },
    plannedQuantity: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'planned_quantity'
    },
    actualQuantity: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'actual_quantity'
    },
    startDate: {
      type: DataTypes.DATE,
      field: 'start_date'
    },
    endDate: {
      type: DataTypes.DATE,
      field: 'end_date'
    },
    status: {
      type: DataTypes.ENUM('planned', 'in_progress', 'completed', 'quality_hold', 'rejected'),
      defaultValue: 'planned'
    },
    shift: {
      type: DataTypes.ENUM('morning', 'afternoon', 'night')
    }
  }, {
    tableName: 'production_batches',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['batch_number'] },
      { fields: ['work_order_id'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  });

  ProductionBatch.associate = (models) => {
    ProductionBatch.belongsTo(models.WorkOrder, {
      foreignKey: 'workOrderId',
      as: 'workOrder'
    });
    ProductionBatch.belongsTo(models.ProductionLine, {
      foreignKey: 'productionLineId',
      as: 'productionLine'
    });
    ProductionBatch.belongsTo(models.User, {
      foreignKey: 'supervisorId',
      as: 'supervisor'
    });
    
    // Associations with inspections
    ProductionBatch.hasMany(models.MaterialInspection, {
      foreignKey: 'batchId',
      as: 'materialInspections'
    });
    ProductionBatch.hasMany(models.ChemicalTest, {
      foreignKey: 'batchId',
      as: 'chemicalTests'
    });
    ProductionBatch.hasMany(models.BilletInspection, {
      foreignKey: 'batchId',
      as: 'billetInspections'
    });
    ProductionBatch.hasMany(models.FinalInspection, {
      foreignKey: 'batchId',
      as: 'finalInspections'
    });
  };

  return ProductionBatch;
};