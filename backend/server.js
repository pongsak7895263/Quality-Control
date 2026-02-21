const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // ✅ เพิ่ม fs
const morgan = require("morgan");
const compression = require("compression");
require('dotenv').config();

// Import Database Config (รวม Sequelize และ PG Pool)
const db = require('./config/database');

// --- 1. Import Routes (ตั้งชื่อตัวแปรให้สื่อความหมาย) ---
const authRoutes = require('./routes/authRoutes'); // หรือ auth.js
const adminRoutes = require('./routes/adminRoutes'); // หรือ admin.js

// ✅ แยก Module ชัดเจน
const materialRoutes = require('./routes/inspectionRoutes'); 
const chemicalRoutes = require('./routes/chemicalRoutes');
const calibrationRoutes = require('./routes/calibrationRoutes');
const hardnessRoutes = require('./routes/hardnessRoutes');
const kpiRoutes = require('./routes/kpiRoutes');
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors({ origin: '*' }));
app.use(compression());
app.use(morgan("dev"));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ ตรวจสอบและสร้างโฟลเดอร์ uploads อัตโนมัติ (สำคัญ!)
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
    console.log(`📂 Created upload directory: ${uploadDir}`);
}
//app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// --- Routes Mounting ---
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// ✅ Main Modules (แยกตามประเภทงาน)
app.use('/api', materialRoutes);       // เดิมคือ /api/v1/inspections
app.use('/api/chemical', chemicalRoutes);       // เดิมคือ /api/v1/inspections/chemical
app.use('/api/calibration', calibrationRoutes); // ระบบสอบเทียบ
app.use('/api/hardness', hardnessRoutes);       // ระบบ Hardness
app.use('/api/kpi', kpiRoutes);
// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'QC Backend is running' });
});

app.get('/', (req, res) => {
  res.send('QC Backend Server is Up!');
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// --- Start Server ---
const startServer = async () => {
  try {
    // 1. เชื่อมต่อระบบเดิม (Sequelize)
    await db.connectDB(); 

    // ⭐ FIX: เพิ่มบรรทัดนี้เพื่อซ่อมตาราง ChemicalTest ให้ตรงกับ Model (แก้ Error 400)
    // หลังจากรันผ่านแล้ว ครั้งหน้าสามารถลบออกหรือ comment ไว้ได้
    if (db.sequelize) {
      //await db.sequelize.sync({ force: true });
      await db.sequelize.sync({ alter: true });
      console.log("✅ Database Tables Synced (Chemical Model Updated)");
  }
    
    // 2. ✅ ทดสอบเชื่อมต่อระบบใหม่ (PG Pool) - เพิ่มส่วนนี้
    await db.query('SELECT NOW()'); 
    console.log("✅ PostgreSQL Pool Connected (Hardness System Ready)");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log("\n📍 Mounted Routes:");
      console.log("   • /api/auth");
      console.log("   • /api/admin");
      console.log("   • /api/material    ✅ (Material Inspection)");
      console.log("   • /api/chemical    ✅ (Chemical Lab)");
      console.log("   • /api/calibration ✅ (Calibration)");
      console.log("   • /api/hardness    ✅ (Hardness Test)");
      console.log("   • /api/kpi         ✅ (KPI Monitoring)");
      console.log("   • /health\n");
    });
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};

startServer();
module.exports = app;