/**
 * controllers/partMasterController.js
 * ========================================
 * Part Master Management — CRUD + Search
 */

const db = require('../config/database');
const query = async (text, params) => db.query(text, params);

// ═══════════════════════════════════════════════════════════
// GET /api/kpi/parts — ดึงรายการ Parts (search + filter)
// ═══════════════════════════════════════════════════════════
const listParts = async (req, res) => {
  try {
    const { search, customer, category, active, page = 1, limit = 50 } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(pm.part_number ILIKE $${idx} OR pm.part_name ILIKE $${idx} OR pm.customer_name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (customer) { conditions.push(`pm.customer_name ILIKE $${idx++}`); params.push(`%${customer}%`); }
    if (category) { conditions.push(`pm.product_category = $${idx++}`); params.push(category); }
    if (active !== undefined) { conditions.push(`pm.is_active = $${idx++}`); params.push(active === 'true'); }
    else { conditions.push(`pm.is_active = true`); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(`
      SELECT pm.* FROM part_master pm
      ${where}
      ORDER BY pm.part_number
      LIMIT $${idx++} OFFSET $${idx}
    `, [...params, parseInt(limit), offset]);

    const countRes = await query(`SELECT COUNT(*) FROM part_master pm ${where}`, params);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countRes.rows[0].count),
    });
  } catch (error) {
    console.error('[PartMaster] list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// GET /api/kpi/parts/lookup/:partNumber — Quick lookup by part_number
// ═══════════════════════════════════════════════════════════
const lookupPart = async (req, res) => {
  try {
    const { partNumber } = req.params;
    const result = await query(
      'SELECT * FROM part_master WHERE part_number = $1 AND is_active = true',
      [partNumber]
    );
    if (result.rows.length === 0) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// GET /api/kpi/parts/:id — ดึง 1 Part
// ═══════════════════════════════════════════════════════════
const getPart = async (req, res) => {
  try {
    const result = await query('SELECT * FROM part_master WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// POST /api/kpi/parts — สร้าง Part ใหม่
// ═══════════════════════════════════════════════════════════
const createPart = async (req, res) => {
  try {
    const {
      part_number, part_name, customer_name,
      heat_treatment_type, hardness_spec, heat_treatment_supplier,
      billet_size, billet_weight, billet_material,
      primary_line, secondary_line, product_category,
      cycle_time, standard_output,
      drawing_no, revision, notes,
    } = req.body;

    if (!part_number || !part_name) {
      return res.status(400).json({ success: false, error: 'Required: part_number, part_name' });
    }

    const result = await query(`
      INSERT INTO part_master (
        part_number, part_name, customer_name,
        heat_treatment_type, hardness_spec, heat_treatment_supplier,
        billet_size, billet_weight, billet_material,
        primary_line, secondary_line, product_category,
        cycle_time, standard_output,
        drawing_no, revision, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *
    `, [
      part_number, part_name, customer_name || null,
      heat_treatment_type || null, hardness_spec || null, heat_treatment_supplier || null,
      billet_size || null, billet_weight || null, billet_material || null,
      primary_line || null, secondary_line || null, product_category || null,
      cycle_time || null, standard_output || null,
      drawing_no || null, revision || null, notes || null,
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: `Part number "${req.body.part_number}" already exists` });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// PATCH /api/kpi/parts/:id — แก้ไข Part
// ═══════════════════════════════════════════════════════════
const updatePart = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [
      'part_number', 'part_name', 'customer_name',
      'heat_treatment_type', 'hardness_spec', 'heat_treatment_supplier',
      'billet_size', 'billet_weight', 'billet_material',
      'primary_line', 'secondary_line', 'product_category',
      'cycle_time', 'standard_output',
      'drawing_no', 'revision', 'notes', 'is_active',
    ];

    const sets = [];
    const params = [id];
    let idx = 2;

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        sets.push(`${f} = $${idx++}`);
        params.push(req.body[f]);
      }
    }

    if (sets.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });

    sets.push('updated_at = NOW()');

    const result = await query(
      `UPDATE part_master SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// DELETE /api/kpi/parts/:id — ลบ (soft delete)
// ═══════════════════════════════════════════════════════════
const deletePart = async (req, res) => {
  try {
    const result = await query(
      'UPDATE part_master SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id, part_number',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { listParts, lookupPart, getPart, createPart, updatePart, deletePart };