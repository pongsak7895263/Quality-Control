// backend/models/index.js
const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

console.log('📦 Loading models...');

// ---------------------------------------------------------
// 1. Load Core Models
// ---------------------------------------------------------

// Load User model
let User;
try {
  const UserModule = require("./User");
  User = (typeof UserModule === 'function') ? UserModule(sequelize, Sequelize) : UserModule;
  console.log('  ✓ User model loaded');
} catch (error) {
  console.error('  ✗ User load error:', error.message);
}

// Load MaterialInspection model
let MaterialInspection;
try {
  const MaterialInspectionModule = require("./XXXMaterialInspection"); 
  MaterialInspection = (typeof MaterialInspectionModule === 'function') ? MaterialInspectionModule(sequelize, Sequelize) : MaterialInspectionModule;
  console.log('  ✓ MaterialInspection model loaded');
} catch (error) {
  console.error('  ✗ MaterialInspection load error:', error.message);
}

// Load InspectionImage model
let InspectionImage;
try {
  const InspectionImageModule = require("./InspectionImage");
  InspectionImage = (typeof InspectionImageModule === 'function') ? InspectionImageModule(sequelize, Sequelize) : InspectionImageModule;
  console.log('  ✓ InspectionImage model loaded');
} catch (error) {
  console.error('  ✗ InspectionImage load error:', error.message);
}

// Load InspectionFile model
let InspectionFile;
try {
  const InspectionFileModule = require("./inspectionFileModel"); 
  InspectionFile = (typeof InspectionFileModule === 'function') ? InspectionFileModule(sequelize, Sequelize) : InspectionFileModule;
  console.log('  ✓ InspectionFile model loaded');
} catch (error) {
  console.error('  ✗ InspectionFile load error:', error.message);
}

// Load PasswordResetToken model
let PasswordResetToken;
try {
  const PasswordResetTokenModule = require("./PasswordResetToken");
  PasswordResetToken = (typeof PasswordResetTokenModule === 'function') ? PasswordResetTokenModule(sequelize, Sequelize) : PasswordResetTokenModule;
  console.log('  ✓ PasswordResetToken model loaded');
} catch (error) {
  console.error('  ✗ PasswordResetToken load error:', error.message);
}

// ---------------------------------------------------------
// 2. Load Chemical Test Models (ใหม่!)
// ---------------------------------------------------------

let ChemicalTest;
try {
  const ChemicalTestModule = require("./ChemicalTest");
  ChemicalTest = (typeof ChemicalTestModule === 'function') ? ChemicalTestModule(sequelize, Sequelize) : ChemicalTestModule;
  console.log('  ✓ ChemicalTest model loaded');
} catch (error) {
  console.error('  ✗ ChemicalTest load error:', error.message);
}

let TestElementResult;
try {
  const TestElementResultModule = require("./TestElementResult");
  TestElementResult = (typeof TestElementResultModule === 'function') ? TestElementResultModule(sequelize, Sequelize) : TestElementResultModule;
  console.log('  ✓ TestElementResult model loaded');
} catch (error) {
  console.error('  ✗ TestElementResult load error:', error.message);
}

let QualityStandard;
try {
  const QualityStandardModule = require("./QualityStandard");
  QualityStandard = (typeof QualityStandardModule === 'function') ? QualityStandardModule(sequelize, Sequelize) : QualityStandardModule;
  console.log('  ✓ QualityStandard model loaded');
} catch (error) {
  console.error('  ✗ QualityStandard load error:', error.message);
}

let ProductionBatch;
try {
  const ProductionBatchModule = require("./ProductionBatch");
  ProductionBatch = (typeof ProductionBatchModule === 'function') ? ProductionBatchModule(sequelize, Sequelize) : ProductionBatchModule;
  console.log('  ✓ ProductionBatch model loaded');
} catch (error) {
  console.error('  ✗ ProductionBatch load error:', error.message);
}

// ---------------------------------------------------------
// 3. Load Calibration Models
// ---------------------------------------------------------
let Instrument, CalibrationPlan, CalibrationResult, MasterStandard;

try {
  Instrument = require('./Instrument');
  if (Instrument) console.log('  ✓ Instrument model loaded');
} catch (error) {
  console.error('  ✗ Instrument load error:', error.message);
}

try {
  CalibrationPlan = require('./CalibrationPlan');
  if (CalibrationPlan) console.log('  ✓ CalibrationPlan model loaded');
} catch (error) {
  console.error('  ✗ CalibrationPlan load error:', error.message);
}

try {
  CalibrationResult = require('./CalibrationResult');
  if (CalibrationResult) console.log('  ✓ CalibrationResult model loaded');
} catch (error) {
  console.error('  ✗ CalibrationResult load error:', error.message);
}

try {
  MasterStandard = require('./MasterStandard');
  if (MasterStandard) console.log('  ✓ MasterStandard model loaded');
} catch (error) {
  console.error('  ✗ MasterStandard load error:', error.message);
}

// ---------------------------------------------------------
// 4. Define Associations
// ---------------------------------------------------------
console.log('🔗 Setting up model associations...');

// User <-> MaterialInspection
if (User && MaterialInspection) {
  User.hasMany(MaterialInspection, { foreignKey: "inspectorId", as: "inspections" });
  MaterialInspection.belongsTo(User, { foreignKey: "inspectorId", as: "inspectorInfo" });
  console.log('  ✓ User <-> MaterialInspection');
}

// MaterialInspection <-> InspectionImage
if (MaterialInspection && InspectionImage) {
  MaterialInspection.hasMany(InspectionImage, { foreignKey: "inspectionId", as: "images" });
  InspectionImage.belongsTo(MaterialInspection, { foreignKey: "inspectionId", as: "inspection" });
  console.log('  ✓ MaterialInspection <-> InspectionImage');
}

// MaterialInspection <-> InspectionFile
if (MaterialInspection && InspectionFile) {
  MaterialInspection.hasMany(InspectionFile, { 
    foreignKey: "inspection_id", 
    as: "attached_files", 
    onDelete: 'CASCADE'
  });
  InspectionFile.belongsTo(MaterialInspection, { 
    foreignKey: "inspection_id", 
    as: "inspection" 
  });
  console.log('  ✓ MaterialInspection <-> InspectionFile');
}

// User <-> PasswordResetToken
if (User && PasswordResetToken) {
  User.hasMany(PasswordResetToken, { foreignKey: "userId", as: "resetTokens" });
  PasswordResetToken.belongsTo(User, { foreignKey: "userId", as: "user" });
  console.log('  ✓ User <-> PasswordResetToken');
}

// ---------------------------------------------------------
// 5. Chemical Test Associations (ใหม่!)
// ---------------------------------------------------------

// ChemicalTest <-> TestElementResult
if (ChemicalTest && TestElementResult) {
  ChemicalTest.hasMany(TestElementResult, { 
    foreignKey: 'chemical_test_id', 
    as: 'elementResults',
    onDelete: 'CASCADE'
  });
  TestElementResult.belongsTo(ChemicalTest, { 
    foreignKey: 'chemical_test_id', 
    as: 'chemicalTest' 
  });
  console.log('  ✓ ChemicalTest <-> TestElementResult');
}

// ChemicalTest <-> MaterialInspection
if (ChemicalTest && MaterialInspection) {
  MaterialInspection.hasMany(ChemicalTest, { 
    foreignKey: 'material_inspection_id', 
    as: 'chemicalTests' 
  });
  ChemicalTest.belongsTo(MaterialInspection, { 
    foreignKey: 'material_inspection_id', 
    as: 'materialInspection' 
  });
  console.log('  ✓ ChemicalTest <-> MaterialInspection');
}

// ChemicalTest <-> ProductionBatch
if (ChemicalTest && ProductionBatch) {
  ProductionBatch.hasMany(ChemicalTest, { 
    foreignKey: 'batch_id', 
    as: 'chemicalTests' 
  });
  ChemicalTest.belongsTo(ProductionBatch, { 
    foreignKey: 'batch_id', 
    as: 'batch' 
  });
  console.log('  ✓ ChemicalTest <-> ProductionBatch');
}

// ChemicalTest <-> User (tester)
if (ChemicalTest && User) {
  User.hasMany(ChemicalTest, { foreignKey: 'tested_by', as: 'testedChemicalTests' });
  ChemicalTest.belongsTo(User, { foreignKey: 'tested_by', as: 'tester' });
  
  User.hasMany(ChemicalTest, { foreignKey: 'reviewed_by', as: 'reviewedChemicalTests' });
  ChemicalTest.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });
  console.log('  ✓ ChemicalTest <-> User (tester/reviewer)');
}

// ---------------------------------------------------------
// 6. Calibration Associations
// ---------------------------------------------------------
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
// 7. Export Models
// ---------------------------------------------------------
const db = {
  sequelize,
  Sequelize,
  // Core Models
  User,
  MaterialInspection,
  InspectionImage,
  InspectionFile,
  PasswordResetToken,
  // Chemical Test Models (ใหม่!)
  ChemicalTest,
  TestElementResult,
  QualityStandard,
  ProductionBatch,
  // Calibration Models
  Instrument,
  CalibrationPlan,
  CalibrationResult,
  MasterStandard
};

// กรองค่าที่เป็น undefined ออก
Object.keys(db).forEach(key => {
  if (db[key] === undefined) {
    delete db[key];
  }
});

console.log('📦 Exported models:', Object.keys(db));

module.exports = db;