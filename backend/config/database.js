const { Sequelize } = require("sequelize");
const { Pool } = require("pg");
require("dotenv").config();

// ==========================================
// 1. Sequelize Instance (สำหรับระบบเดิม / Main DB)
// ==========================================
const sequelize = new Sequelize(
  process.env.DB_MAIN_NAME,
  process.env.DB_MAIN_USER,
  process.env.DB_MAIN_PASSWORD,
  {
    host: process.env.DB_MAIN_HOST,
    port: process.env.DB_MAIN_PORT,
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// ฟังก์ชันสำหรับทดสอบการเชื่อมต่อและ sync models (ของระบบเดิม)
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Sequelize Connection (Main DB) has been established successfully.");

    // Sync all models - ใน production อาจจะต้องพิจารณาใช้ Migrations แทน
    // await sequelize.sync({ alter: true });
    // console.log("🔄 All models were synchronized successfully.");
  } catch (error) {
    console.error("❌ Unable to connect to the database (Sequelize):", error);
    // process.exit(1); // อาจจะไม่ต้อง exit ถ้าอยากให้ส่วนอื่นทำงานต่อได้
  }
};

// ==========================================
// 2. PG Pool Instance (สำหรับ Hardness Inspection System)
// ==========================================
// ใช้ตัวแปร DB_USER, DB_HOST... ตามที่เราตั้งไว้สำหรับโมดูลใหม่
const pool = new Pool({
  user: process.env.DB_MAIN_USER,
  host: process.env.DB_MAIN_HOST,
  database: process.env.DB_MAIN_NAME,
  password: String(process.env.DB_MAIN_PASSWORD),
  port: parseInt(process.env.DB_MAIN_PORT) || 5432,
});

// Test Pool Connection แบบเงียบๆ
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client (pg Pool)', err);
  process.exit(-1);
});

// ==========================================
// 3. Export
// ==========================================
module.exports = {
  sequelize,
  connectDB,
  pool,
  
  // *** สำคัญ: เพิ่ม Helper functions เพื่อให้ hardnessController เรียกใช้ได้เหมือนเดิม ***
  // db.query(...)
  query: (text, params) => pool.query(text, params),
  
  // db.getClient() สำหรับ Transaction
  getClient: () => pool.connect(),
};