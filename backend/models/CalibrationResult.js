const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CalibrationResult = sequelize.define('CalibrationResult', {
  cal_date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW
  },
  temperature: {
    type: DataTypes.DECIMAL(5, 2)
  },
  humidity: {
    type: DataTypes.DECIMAL(5, 2)
  },
  standard_value: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false
  },
  measured_value: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false
  },
  error_value: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false
  },
  result_status: {
    type: DataTypes.ENUM('PASS', 'FAIL'),
    allowNull: false
  },
  performed_by: {
    type: DataTypes.STRING
  },
  remark: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'calibration_results', // ✅ บังคับชื่อตารางให้ตรงกับ DB
  underscored: true,            // ✅ แปลง camelCase (createdAt) เป็น snake_case (created_at) อัตโนมัติ
  timestamps: true              // ✅ บอกว่ามี colum created_at, updated_at
});

module.exports = CalibrationResult;