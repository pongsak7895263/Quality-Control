// models/quality/QualityAlert.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const QualityAlert = sequelize.define('QualityAlert', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    alertCode: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      field: 'alert_code'
    },
    alertType: {
      type: DataTypes.ENUM('quality_deviation', 'equipment_failure', 'process_abnormal'),
      field: 'alert_type'
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium'
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: DataTypes.TEXT,
    sourceTable: {
      type: DataTypes.STRING(50),
      field: 'source_table'
    },
    sourceRecordId: {
      type: DataTypes.INTEGER,
      field: 'source_record_id'
    },
    processStage: {
      type: DataTypes.STRING(50),
      field: 'process_stage'
    },
    detectedAt: {
      type: DataTypes.DATE,
      field: 'detected_at',
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('open', 'investigating', 'resolved', 'closed'),
      defaultValue: 'open'
    },
    resolution: DataTypes.TEXT,
    resolvedAt: {
      type: DataTypes.DATE,
      field: 'resolved_at'
    }
  }, {
    tableName: 'quality_alerts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['status'] },
      { fields: ['severity'] },
      { fields: ['created_at'] }
    ]
  });

  QualityAlert.associate = (models) => {
    QualityAlert.belongsTo(models.ProductionBatch, {
      foreignKey: 'batchId',
      as: 'batch'
    });
    QualityAlert.belongsTo(models.User, {
      foreignKey: 'detectedBy',
      as: 'detector'
    });
    QualityAlert.belongsTo(models.User, {
      foreignKey: 'assignedTo',
      as: 'assignee'
    });
    QualityAlert.belongsTo(models.User, {
      foreignKey: 'resolvedBy',
      as: 'resolver'
    });
  };

  return QualityAlert;
};