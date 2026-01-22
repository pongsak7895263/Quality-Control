// db.js
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',       // เปลี่ยนเป็น user ของคุณ
  host: 'localhost',
  database: 'qc_system',  // ชื่อ DB
  password: 'yourpassword',
  port: 5432,
});

export default pool;
