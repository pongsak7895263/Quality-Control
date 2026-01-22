// middleware/databaseSelector.js
const { getPool } = require('../config/database');

const databaseSelector = (req, res, next) => {
    // ดึงค่าจาก custom header 'x-database-id' ถ้าไม่มีให้ใช้ 'main' เป็น default
    const dbIdentifier = req.headers['x-database-id'] || 'main';
    
    // พิมพ์ log เพื่อช่วยในการ debug ว่า middleware ทำงานและเลือก DB ถูกต้อง
    console.log(`[Middleware] Selecting database pool for: "${dbIdentifier}"`);

    // เลือก pool ที่ถูกต้องแล้วแนบไปกับ request object
    req.dbPool = getPool(dbIdentifier);

    if (!req.dbPool) {
        // กรณีที่หา pool ไม่เจอ (เช่น frontend ส่ง id ของ db ที่ไม่มีอยู่จริงมา)
        console.error(`[Middleware] FAILED to find pool for: "${dbIdentifier}"`);
        return res.status(500).json({ success: false, message: `Database '${dbIdentifier}' is not configured or available.` });
    }
    
    // ส่งต่อไปยัง route handler ถัดไป
    next();
};

module.exports = databaseSelector;