// models/materialModel.js
import pool from '../db.js';

export const getAllMaterials = async () => {
  const res = await pool.query('SELECT * FROM materials ORDER BY created_at DESC');
  return res.rows;
};

export const createMaterial = async (data) => {
  const { code, name, description, stock } = data;
  const res = await pool.query(
    `INSERT INTO materials (code, name, description, stock) VALUES ($1,$2,$3,$4) RETURNING *`,
    [code, name, description, stock]
  );
  return res.rows[0];
};
