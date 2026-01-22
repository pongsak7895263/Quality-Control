// backend/models/Inspection.js
const { getPool } = require('../config/database');

class Inspection {
    /**
     * ดึงข้อมูลการตรวจสอบทั้งหมดจากฐานข้อมูล
     * @param {object} filters - ตัวกรองต่างๆ
     * @returns {Promise<Array>}
     */
    static async findAll(filters) {
        const pool = getPool('main');
        const client = await pool.connect();
        try {
            // สร้าง SQL query ที่รองรับการกรอง
            const query = `SELECT * FROM inspections ORDER BY created_at DESC LIMIT $1 OFFSET $2;`;
            const values = [filters.limit, (filters.page - 1) * filters.limit];
            const result = await client.query(query, values);
            
            // ดึงข้อมูล Pagination
            const totalResult = await client.query('SELECT COUNT(*) FROM inspections');
            const total = parseInt(totalResult.rows[0].count);
            const totalPages = Math.ceil(total / filters.limit);

            return { data: result.rows, pagination: { total, totalPages } };
        } finally {
            client.release();
        }
    }

    /**
     * สร้างรายการการตรวจสอบใหม่
     * @param {object} data - ข้อมูลการตรวจสอบ
     * @returns {Promise<object>}
     */
    static async create(data) {
        const pool = getPool('main');
        const client = await pool.connect();
        try {
            // คำสั่ง SQL สำหรับการเพิ่มข้อมูล
            const query = `INSERT INTO inspections(...) VALUES(...) RETURNING *;`;
            //...
        } finally {
            client.release();
        }
    }
}

module.exports = Inspection;