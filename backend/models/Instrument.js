const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Instrument = sequelize.define('Instrument', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  serial_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },

  location: {
    type: DataTypes.STRING
  },
  department: {
    type: DataTypes.STRING
  },
  // --- เพิ่ม 3 fields ใหม่ ---
  manufacturer: {
    type: DataTypes.STRING
  },
  model: {
    type: DataTypes.STRING
  },
  responsible_person: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'NG', 'SUSPEND', 'SPARE', 'MISSING'),
    defaultValue: 'ACTIVE'
  },
  next_cal_date: {
    type: DataTypes.DATEONLY
  },
  // เพิ่ม field นี้เพื่อให้รับค่า image_url จาก DB ได้ (ถ้ามี)
  image_url: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'instruments', // ✅ บังคับชื่อตารางให้ตรงกับ DB
  underscored: true,        // ✅ แปลง camelCase (createdAt) เป็น snake_case (created_at) อัตโนมัติ
  timestamps: true          // ✅ บอกว่ามี colum created_at, updated_at
});

module.exports = Instrument;