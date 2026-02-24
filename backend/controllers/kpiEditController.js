/**
 * controllers/kpiEditController.js
 * ========================================
 * API สำหรับแก้ไข/ลบข้อมูลทุกหัวข้อ
 *
 * Production Summary: GET list, GET/:id, PATCH/:id, DELETE/:id
 * Defect Details:     GET by summary, PATCH/:id, DELETE/:id
 */

const db = require('../config/database');
const query = async (text, params) => db.query(text, params);

// ═══════════════════════════════════════════════════════════
// PRODUCTION SUMMARY — ดึง / แก้ / ลบ
// ═══════════════════════════════════════════════════════════

/** GET /api/kpi/edit/production — ดึงรายการผลผลิต (กรองได้) */
const listProduction = async (req, res) => {
  try {
    const { date, month, line, shift, page = 1, limit = 50 } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (date && date !== 'ALL') {
      conditions.push(`dps.production_date = $${idx++}`);
      params.push(date);
    } else if (month) {
      conditions.push(`TO_CHAR(dps.production_date,'YYYY-MM') = $${idx++}`);
      params.push(month);
    }
    // ถ้าไม่ส่ง date/month → แสดงทั้งหมด (limit 50)

    if (line && line !== 'ALL') { conditions.push(`m.code = $${idx++}`); params.push(line); }
    if (shift && shift !== 'ALL') { conditions.push(`dps.shift = $${idx++}`); params.push(shift); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(`
      SELECT dps.*, m.code AS line_no, m.name AS line_name,
        (COALESCE(dps.good_qty,0) + COALESCE(dps.rework_good_qty,0)) AS final_good,
        (COALESCE(dps.scrap_qty,0) + COALESCE(dps.rework_scrap_qty,0)) AS final_reject
      FROM daily_production_summary dps
      JOIN machines m ON dps.machine_id = m.id
      ${where}
      ORDER BY dps.production_date DESC, m.code, dps.shift
      LIMIT $${idx++} OFFSET $${idx}
    `, [...params, parseInt(limit), offset]);

    console.log(`[Edit] listProduction: where="${where}", params=${JSON.stringify(params)}, found=${result.rows.length}`);

    const countRes = await query(`SELECT COUNT(*) FROM daily_production_summary dps JOIN machines m ON dps.machine_id = m.id ${where}`, params);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countRes.rows[0].count),
    });
  } catch (error) {
    console.error('[Edit] listProduction error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/** GET /api/kpi/edit/production/:id — ดึง 1 รายการ + defects */
const getProduction = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT dps.*, m.code AS line_no, m.name AS line_name
      FROM daily_production_summary dps
      JOIN machines m ON dps.machine_id = m.id
      WHERE dps.id = $1
    `, [id]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });

    const defects = await query(`
      SELECT dd.*, dc.code AS defect_code, dc.name AS defect_name, dc.category
      FROM defect_detail dd
      LEFT JOIN defect_codes dc ON dd.defect_code_id = dc.id
      WHERE dd.summary_id = $1
      ORDER BY dd.id
    `, [id]);

    res.json({
      success: true,
      data: { ...result.rows[0], defects: defects.rows },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/** PATCH /api/kpi/edit/production/:id — แก้ไขผลผลิต */
const updateProduction = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      total_produced, good_qty, rework_qty, scrap_qty,
      rework_good_qty, rework_scrap_qty, rework_pending_qty,
      operator_name, inspector_name, shift, part_number,
      lot_number, product_line, production_date, notes,
    } = req.body;

    const result = await query(`
      UPDATE daily_production_summary SET
        total_produced = COALESCE($2, total_produced),
        good_qty = COALESCE($3, good_qty),
        rework_qty = COALESCE($4, rework_qty),
        scrap_qty = COALESCE($5, scrap_qty),
        rework_good_qty = COALESCE($6, rework_good_qty),
        rework_scrap_qty = COALESCE($7, rework_scrap_qty),
        rework_pending_qty = COALESCE($8, rework_pending_qty),
        operator_name = COALESCE($9, operator_name),
        shift = COALESCE($10, shift),
        part_number = COALESCE($11, part_number),
        notes = COALESCE($12, notes),
        lot_number = COALESCE($13, lot_number),
        inspector_name = COALESCE($14, inspector_name),
        production_date = COALESCE($15, production_date),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id,
      total_produced ?? null, good_qty ?? null, rework_qty ?? null, scrap_qty ?? null,
      rework_good_qty ?? null, rework_scrap_qty ?? null, rework_pending_qty ?? null,
      operator_name ?? null, shift ?? null, part_number ?? null, notes ?? null,
      lot_number ?? null, inspector_name ?? null, production_date ?? null,
    ]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/** DELETE /api/kpi/edit/production/:id — ลบ (cascade defects) */
const deleteProduction = async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM defect_detail WHERE summary_id = $1', [id]);
    const result = await query('DELETE FROM daily_production_summary WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, deleted: id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


// ═══════════════════════════════════════════════════════════
// DEFECT DETAIL — แก้ / ลบ
// ═══════════════════════════════════════════════════════════

/** PATCH /api/kpi/edit/defect/:id */
const updateDefect = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      defect_type, quantity, measurement, spec_value,
      defect_detail: detail, rework_result,
      f07_doc_no, bin_no, found_qty, sorted_good, sorted_reject,
      defect_code,
    } = req.body;

    // Resolve defect_code → defect_code_id
    let defectCodeId = undefined;
    if (defect_code !== undefined) {
      if (defect_code) {
        const dcRes = await query('SELECT id FROM defect_codes WHERE code = $1', [defect_code]);
        defectCodeId = dcRes.rows.length > 0 ? dcRes.rows[0].id : null;
      } else {
        defectCodeId = null;
      }
    }

    const result = await query(`
      UPDATE defect_detail SET
        defect_type = COALESCE($2, defect_type),
        quantity = COALESCE($3, quantity),
        measurement = COALESCE($4, measurement),
        spec_value = COALESCE($5, spec_value),
        defect_detail = COALESCE($6, defect_detail),
        rework_result = COALESCE($7, rework_result),
        f07_doc_no = COALESCE($8, f07_doc_no),
        bin_no = COALESCE($9, bin_no),
        found_qty = COALESCE($10, found_qty),
        sorted_good = COALESCE($11, sorted_good),
        sorted_reject = COALESCE($12, sorted_reject),
        defect_code_id = COALESCE($13, defect_code_id)
      WHERE id = $1
      RETURNING *
    `, [id,
      defect_type ?? null, quantity ?? null,
      measurement !== undefined ? (measurement ? parseFloat(measurement) : null) : null,
      spec_value ?? null, detail ?? null, rework_result ?? null,
      f07_doc_no ?? null, bin_no ?? null,
      found_qty ?? null, sorted_good ?? null, sorted_reject ?? null,
      defectCodeId ?? null,
    ]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/** DELETE /api/kpi/edit/defect/:id */
const deleteDefect = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM defect_detail WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, deleted: id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};


module.exports = {
  listProduction, getProduction, updateProduction, deleteProduction,
  updateDefect, deleteDefect,
};