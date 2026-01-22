// backend/models/index.js
const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database'); // ตรวจสอบว่า database.js export แบบ { sequelize } หรือไม่

console.log('📦 Loading models...');

// ---------------------------------------------------------
// 1. Load Existing Models (ของเดิม)
// ---------------------------------------------------------

// Load User model
let User;
try {
  const UserModule = require("./User");
  // เช็คว่าเป็น Function หรือไม่ (เพื่อรองรับทั้งสองแบบ)
  User = (typeof UserModule === 'function') ? UserModule(sequelize) : UserModule;
  console.log('  ✓ User model loaded');
} catch (error) {
  console.error('  ✗ User load error:', error.message);
}

// Load MaterialInspection model
let MaterialInspection;
try {
  const MaterialInspectionModule = require("./xxMaterialInspection");
  MaterialInspection = (typeof MaterialInspectionModule === 'function') ? MaterialInspectionModule(sequelize) : MaterialInspectionModule;
  console.log('  ✓ MaterialInspection model loaded');
} catch (error) {
  console.error('  ✗ MaterialInspection load error:', error.message);
}

// Load InspectionImage model
let InspectionImage;
try {
  const InspectionImageModule = require("./InspectionImage");
  InspectionImage = (typeof InspectionImageModule === 'function') ? InspectionImageModule(sequelize) : InspectionImageModule;
  console.log('  ✓ InspectionImage model loaded');
} catch (error) {
  console.error('  ✗ InspectionImage load error:', error.message);
}

// Load PasswordResetToken model
let PasswordResetToken;
try {
  const PasswordResetTokenModule = require("./PasswordResetToken");
  PasswordResetToken = (typeof PasswordResetTokenModule === 'function') ? PasswordResetTokenModule(sequelize) : PasswordResetTokenModule;
  console.log('  ✓ PasswordResetToken model loaded');
} catch (error) {
  console.error('  ✗ PasswordResetToken load error:', error.message);
}

// ---------------------------------------------------------
// 2. Load Calibration Models (ของใหม่)
// ---------------------------------------------------------
// หมายเหตุ: ตรงนี้สำคัญ! ถ้าไฟล์ Instrument.js ของคุณ require sequelize เอง ให้ใช้ require ธรรมดา
// แต่ถ้าไฟล์ Instrument.js รับค่า (sequelize) ให้ใช้ require(...)(sequelize)

const Instrument = require('./Instrument'); 
const CalibrationPlan = require('./CalibrationPlan');
const CalibrationResult = require('./CalibrationResult');
const MasterStandard = require('./MasterStandard'); // (ถ้ามี)

if (Instrument) console.log('  ✓ Instrument model loaded');
if (CalibrationPlan) console.log('  ✓ CalibrationPlan model loaded');


// ---------------------------------------------------------
// 3. Define Associations
// ---------------------------------------------------------
console.log('🔗 Setting up model associations...');

// Existing Associations
if (User && MaterialInspection) {
  User.hasMany(MaterialInspection, { foreignKey: "inspectorId", as: "inspections" });
  MaterialInspection.belongsTo(User, { foreignKey: "inspectorId", as: "inspectorInfo" });
}

if (MaterialInspection && InspectionImage) {
  MaterialInspection.hasMany(InspectionImage, { foreignKey: "inspectionId", as: "images" });
  InspectionImage.belongsTo(MaterialInspection, { foreignKey: "inspectionId", as: "inspection" });
}

if (User && PasswordResetToken) {
  User.hasMany(PasswordResetToken, { foreignKey: "userId", as: "resetTokens" });
  PasswordResetToken.belongsTo(User, { foreignKey: "userId", as: "user" });
}

// --- Calibration Associations (เพิ่มตรงนี้) ---

// ตรวจสอบก่อนว่า Model ถูกโหลดมาจริง เพื่อกัน Error "is not a function"
if (Instrument && CalibrationPlan) {
    Instrument.hasOne(CalibrationPlan, { foreignKey: 'instrument_id', onDelete: 'CASCADE' });
    CalibrationPlan.belongsTo(Instrument, { foreignKey: 'instrument_id' });
    console.log('  ✓ Instrument <-> CalibrationPlan');
}

if (Instrument && CalibrationResult) {
    Instrument.hasMany(CalibrationResult, { foreignKey: 'instrument_id' });
    CalibrationResult.belongsTo(Instrument, { foreignKey: 'instrument_id' });
    console.log('  ✓ Instrument <-> CalibrationResult');
}

if (MasterStandard && CalibrationResult) {
    MasterStandard.hasMany(CalibrationResult, { foreignKey: 'master_standard_id' });
    CalibrationResult.belongsTo(MasterStandard, { foreignKey: 'master_standard_id' });
    console.log('  ✓ MasterStandard <-> CalibrationResult');
}


console.log('✅ Model setup complete');

// ---------------------------------------------------------
// 4. Export Models
// ---------------------------------------------------------
// ต้องใส่ Model ใหม่เข้าไปใน db object ด้วย! ไม่งั้น Controller จะหาไม่เจอ

const db = {
  sequelize,
  Sequelize,
  User,
  MaterialInspection,
  InspectionImage,
  PasswordResetToken,
  // เพิ่มของใหม่
  Instrument,
  CalibrationPlan,
  CalibrationResult,
  MasterStandard
};

console.log('📦 Exported models:', Object.keys(db));

module.exports = db;