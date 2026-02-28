/**
 * productionLogController.js
 * ==========================
 * API สำหรับบันทึกยอดผลิต (สายการผลิต)
 * เชื่อมกับ KPIDataEntry ผ่าน part_number + lot_number
 */

const db = require('../config/database');
const query = async (text, params) => db.query(text, params);

// ═══════════════════════════════════════════════════════════
// CREATE — บันทึกยอดผลิตพร้อมรายละเอียดถัง
// ═══════════════════════════════════════════════════════════
const createLog = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const {
      production_date, line, shift, operator,
      part_number, part_name, lot_number,
      bins = [],
      total_good, total_ng, total_produced,
    } = req.body;

    if (!line || !part_number) {
      return res.status(400).json({ success: false, error: 'Required: line, part_number' });
    }

    // Insert production_log
    const logRes = await client.query(`
      INSERT INTO production_log (
        production_date, line, shift, operator,
        part_number, part_name, lot_number,
        total_good, total_ng, total_produced, total_bins
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
      production_date || new Date().toISOString().split('T')[0],
      line, shift || 'A', operator || null,
      part_number, part_name || null, lot_number || null,
      total_good || 0, total_ng || 0, total_produced || 0, bins.length,
    ]);

    const logId = logRes.rows[0].id;

    // Insert bins
    for (const bin of bins) {
      if (bin.bin_no) {
        await client.query(`
          INSERT INTO production_log_bins (log_id, bin_no, good_qty, ng_qty, note)
          VALUES ($1, $2, $3, $4, $5)
        `, [logId, bin.bin_no, parseInt(bin.good_qty) || 0, parseInt(bin.ng_qty) || 0, bin.note || null]);
      }
    }

    await client.query('COMMIT');

    res.json({ success: true, data: logRes.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ProductionLog] create error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
};

// ═══════════════════════════════════════════════════════════
// LIST — ดึงยอดผลิตตามวัน/Line/Part
// ═══════════════════════════════════════════════════════════
const getLogs = async (req, res) => {
  try {
    const { date, line, part_number, lot_number, from, to } = req.query;

    let where = [];
    let params = [];
    let idx = 1;

    if (date) {
      where.push(`pl.production_date = $${idx++}`);
      params.push(date);
    } else if (from && to) {
      where.push(`pl.production_date BETWEEN $${idx++} AND $${idx++}`);
      params.push(from, to);
    }
    if (line) { where.push(`pl.line = $${idx++}`); params.push(line); }
    if (part_number) { where.push(`pl.part_number = $${idx++}`); params.push(part_number); }
    if (lot_number) { where.push(`pl.lot_number = $${idx++}`); params.push(lot_number); }

    const sql = `
      SELECT pl.*,
        (SELECT json_agg(json_build_object(
          'bin_no', b.bin_no, 'good_qty', b.good_qty, 'ng_qty', b.ng_qty, 'note', b.note
        ) ORDER BY b.id)
        FROM production_log_bins b WHERE b.log_id = pl.id
        ) AS bins
      FROM production_log pl
      ${where.length > 0 ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY pl.production_date DESC, pl.line, pl.created_at DESC
      LIMIT 100
    `;

    const result = await query(sql, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ProductionLog] list error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// LOOKUP — ค้นหายอดผลิตตาม Part+Lot (สำหรับ KPIDataEntry เชื่อม)
// ═══════════════════════════════════════════════════════════
const lookupByPartLot = async (req, res) => {
  try {
    const { part_number, lot_number, date } = req.query;

    if (!part_number) {
      return res.status(400).json({ success: false, error: 'Required: part_number' });
    }

    let where = ['pl.part_number = $1'];
    let params = [part_number];
    let idx = 2;

    if (lot_number) { where.push(`pl.lot_number = $${idx++}`); params.push(lot_number); }
    if (date) { where.push(`pl.production_date = $${idx++}`); params.push(date); }

    const result = await query(`
      SELECT pl.*,
        (SELECT json_agg(json_build_object(
          'bin_no', b.bin_no, 'good_qty', b.good_qty, 'ng_qty', b.ng_qty, 'note', b.note
        ) ORDER BY b.id)
        FROM production_log_bins b WHERE b.log_id = pl.id
        ) AS bins
      FROM production_log pl
      WHERE ${where.join(' AND ')}
      ORDER BY pl.production_date DESC, pl.created_at DESC
      LIMIT 10
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[ProductionLog] lookup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════
// DELETE — ลบรายการ
// ═══════════════════════════════════════════════════════════
const deleteLog = async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM production_log WHERE id = $1', [id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('[ProductionLog] delete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { createLog, getLogs, lookupByPartLot, deleteLog };