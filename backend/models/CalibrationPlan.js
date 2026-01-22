const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CalibrationPlan = sequelize.define('CalibrationPlan', {
  frequency_months: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 6
  },
  last_cal_date: {
    type: DataTypes.DATEONLY
  },
  next_cal_date: {
    type: DataTypes.DATEONLY
  },
  acceptance_criteria: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0.05
  },
  procedure_file_url: {
    type: DataTypes.STRING
  },
  vendor_name: {
    type: DataTypes.STRING
  },
  estimated_cost: {
    type: DataTypes.DECIMAL(10, 2)
  }
}, {
  tableName: 'calibration_plans', // ✅ บังคับชื่อตารางให้ตรงกับ DB
  underscored: true,            // ✅ แปลง camelCase (createdAt) เป็น snake_case (created_at) อัตโนมัติ
  timestamps: true              // ✅ บอกว่ามี colum created_at, updated_at
});

module.exports = CalibrationPlan;