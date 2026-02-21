// models/ProductionBatch.js
module.exports = (sequelize, DataTypes) => {
    const ProductionBatch = sequelize.define('ProductionBatch', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      batchNumber: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'batch_number'
      },
      materialGrade: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'material_grade'
      },
      heatNo: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'heat_no'
      },
      supplier: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      receivedDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'received_date'
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('pending', 'inspecting', 'approved', 'rejected'),
        defaultValue: 'pending'
      }
    }, {
      tableName: 'production_batches',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
  
    return ProductionBatch;
  };