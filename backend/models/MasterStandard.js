const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MasterStandard = sequelize.define('MasterStandard', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  serial_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  certificate_no: {
    type: DataTypes.STRING
  },
  expire_date: {
    type: DataTypes.DATEONLY
  },
  traceability_source: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'calibration_results', // ✅ บังคับชื่อตารางให้ตรงกับ DB
  underscored: true,            // ✅ แปลง camelCase (createdAt) เป็น snake_case (created_at) อัตโนมัติ
  timestamps: true              // ✅ บอกว่ามี colum created_at, updated_at
});

module.exports = MasterStandard;