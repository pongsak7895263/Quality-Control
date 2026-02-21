/**
 * controllers/kpiProductionController.js
 * ========================================
 * API สำหรับบันทึกผลผลิตรายวัน + รายงาน + Export
 */

const db = require('../config/database');
const query = async (text, params) => db.query(text, params);

// ═══════════════════════════════════════════════════════════
// POST /api/kpi/production — บันทึกผลผลิตรายวัน
// ═══════════════════════════════════════════════════════════
const createProduction = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const {
      machine_code, part_number, lot_number, shift,
      operator_name, inspector_name, product_line_code,
      total_produced, good_qty, rework_qty, scrap_qty,
      rework_good_qty = 0, rework_scrap_qty = 0, rework_pending_qty = 0,
      remark, defect_items = [],
    } = req.body;

    // Validation
    if (!machine_code || !part_number || !operator_name || !total_produced) {
      return res.status(400).json({
        success: false,
        error: 'Required: machine_code, part_number, operator_name, total_produced',
      });
    }

    // Resolve machine ID
    const machineRes = await client.query('SELECT id FROM machines WHERE code = $1', [machine_code]);
    if (machineRes.rows.length === 0) {
      return res.status(400).json({ success: false, error: `Machine not found: ${machine_code}` });
    }
    const machineId = machineRes.rows[0].id;

    const today = new Date().toISOString().split('T')[0];

    // Upsert daily_production_summary
    const upsertRes = await client.query(`
      INSERT INTO daily_production_summary (
        production_date, machine_id, part_number, shift, operator_name,
        total_produced, good_qty, rework_qty, scrap_qty,
        rework_good_qty, rework_scrap_qty, rework_pending_qty, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (production_date, machine_id, part_number, shift)
      DO UPDATE SET
        total_produced = daily_production_summary.total_produced + EXCLUDED.total_produced,
        good_qty = daily_production_summary.good_qty + EXCLUDED.good_qty,
        rework_qty = daily_production_summary.rework_qty + EXCLUDED.rework_qty,
        scrap_qty = daily_production_summary.scrap_qty + EXCLUDED.scrap_qty,
        rework_good_qty = daily_production_summary.rework_good_qty + EXCLUDED.rework_good_qty,
        rework_scrap_qty = daily_production_summary.rework_scrap_qty + EXCLUDED.rework_scrap_qty,
        rework_pending_qty = daily_production_summary.rework_pending_qty + EXCLUDED.rework_pending_qty,
        operator_name = EXCLUDED.operator_name,
        notes = CASE WHEN EXCLUDED.notes IS NOT NULL 
          THEN COALESCE(daily_production_summary.notes || '; ', '') || EXCLUDED.notes
          ELSE daily_production_summary.notes END,
        updated_at = NOW()
      RETURNING *
    `, [
      today, machineId, part_number, shift || 'A', operator_name,
      total_produced, good_qty || 0, rework_qty || 0, scrap_qty || 0,
      rework_good_qty, rework_scrap_qty, rework_pending_qty, remark,
    ]);

    const summaryId = upsertRes.rows[0].id;

    // Insert defect details
    for (const item of defect_items) {
      let defectCodeId = null;
      if (item.defect_code) {
        const dcRes = await client.query('SELECT id FROM defect_codes WHERE code = $1', [item.defect_code]);
        if (dcRes.rows.length > 0) defectCodeId = dcRes.rows[0].id;
      }

      await client.query(`
        INSERT INTO defect_detail (
          summary_id, defect_code_id, defect_type, quantity,
          measurement, spec_value, defect_detail, rework_result
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [
        summaryId, defectCodeId, item.defect_type || 'rework',
        parseInt(item.quantity) || 1,
        item.measurement ? parseFloat(item.measurement) : null,
        item.spec_value || null, item.detail || null,
        item.rework_result || null,
      ]);
    }

    // Also insert individual inspection_entries for backward compatibility
    const dispositions = [];
    if ((good_qty || 0) > 0) dispositions.push({ type: 'GOOD', qty: good_qty });
    if ((rework_qty || 0) > 0) dispositions.push({ type: 'REWORK', qty: rework_qty });
    if ((scrap_qty || 0) > 0) dispositions.push({ type: 'SCRAP', qty: scrap_qty });

    for (const d of dispositions) {
      // Find defect code for non-GOOD entries
      let defectCodeId = null;
      if (d.type !== 'GOOD' && defect_items.length > 0) {
        const firstMatch = defect_items.find(di => 
          (d.type === 'REWORK' && di.defect_type === 'rework') ||
          (d.type === 'SCRAP' && di.defect_type === 'scrap')
        );
        if (firstMatch?.defect_code) {
          const dcRes = await client.query('SELECT id FROM defect_codes WHERE code = $1', [firstMatch.defect_code]);
          if (dcRes.rows.length > 0) defectCodeId = dcRes.rows[0].id;
        }
      }

      await client.query(`
        INSERT INTO inspection_entries (
          machine_id, part_number, lot_number, quantity,
          disposition, defect_code_id, operator_name, shift,
          total_produced, rework_good_qty
        ) VALUES ($1,$2,$3,$4,$5::disposition_type,$6,$7,$8,$9,$10)
      `, [
        machineId, part_number, lot_number, d.qty,
        d.type, defectCodeId, operator_name, shift || 'A',
        total_produced, rework_good_qty,
      ]);
    }

    await client.query('COMMIT');

    // Calculate percentages for response
    const summary = upsertRes.rows[0];
    const tp = Number(summary.total_produced) || 0;
    const finalGood = (Number(summary.good_qty) || 0) + (Number(summary.rework_good_qty) || 0);
    const finalReject = (Number(summary.scrap_qty) || 0) + (Number(summary.rework_scrap_qty) || 0);

    res.status(201).json({
      success: true,
      data: {
        ...summary,
        final_good_qty: finalGood,
        final_reject_qty: finalReject,
        good_pct: tp > 0 ? ((finalGood / tp) * 100).toFixed(2) : '0.00',
        reject_pct: tp > 0 ? ((finalReject / tp) * 100).toFixed(2) : '0.00',
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[KPI] createProduction error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
};


// ═══════════════════════════════════════════════════════════
// GET /api/kpi/production/report — รายงานสรุป
// ═══════════════════════════════════════════════════════════
const getReport = async (req, res) => {
  try {
    const { 
      period = 'daily',  // daily | monthly | yearly
      date,               // specific date (YYYY-MM-DD)
      month,              // YYYY-MM
      year,               // YYYY
      line,               // Line-1, Line-2...
      part_number,
      shift,
    } = req.query;

    let dateFilter = '';
    const params = [];
    let paramIdx = 1;

    if (date) {
      dateFilter = `AND dps.production_date = $${paramIdx++}`;
      params.push(date);
    } else if (month) {
      dateFilter = `AND TO_CHAR(dps.production_date, 'YYYY-MM') = $${paramIdx++}`;
      params.push(month);
    } else if (year) {
      dateFilter = `AND TO_CHAR(dps.production_date, 'YYYY') = $${paramIdx++}`;
      params.push(year);
    } else {
      // Default: current month
      dateFilter = `AND dps.production_date >= DATE_TRUNC('month', CURRENT_DATE)`;
    }

    if (line && line !== 'ALL') {
      dateFilter += ` AND m.code = $${paramIdx++}`;
      params.push(line);
    }
    if (part_number) {
      dateFilter += ` AND dps.part_number = $${paramIdx++}`;
      params.push(part_number);
    }
    if (shift && shift !== 'ALL') {
      dateFilter += ` AND dps.shift = $${paramIdx++}`;
      params.push(shift);
    }

    // Main report data
    const reportRes = await query(`
      SELECT 
        dps.production_date,
        m.code AS line_no,
        m.name AS line_name,
        dps.part_number,
        dps.shift,
        dps.operator_name,
        dps.total_produced,
        dps.good_qty,
        dps.rework_qty,
        dps.scrap_qty,
        dps.rework_good_qty,
        dps.rework_scrap_qty,
        dps.rework_pending_qty,
        dps.good_pct,
        dps.reject_pct,
        dps.rework_pct,
        dps.remaining_qty,
        (dps.good_qty + dps.rework_good_qty) AS final_good_qty,
        (dps.scrap_qty + dps.rework_scrap_qty) AS final_reject_qty,
        CASE WHEN dps.total_produced > 0
          THEN ROUND(((dps.good_qty + dps.rework_good_qty)::DECIMAL / dps.total_produced) * 100, 2)
          ELSE 0 END AS final_good_pct,
        dps.notes
      FROM daily_production_summary dps
      JOIN machines m ON dps.machine_id = m.id
      WHERE 1=1 ${dateFilter}
      ORDER BY dps.production_date DESC, m.code, dps.shift
    `, params);

    // Summary totals
    const summaryRes = await query(`
      SELECT 
        SUM(total_produced) AS total_produced,
        SUM(good_qty) AS total_good,
        SUM(rework_qty) AS total_rework,
        SUM(scrap_qty) AS total_scrap,
        SUM(rework_good_qty) AS total_rework_good,
        SUM(rework_scrap_qty) AS total_rework_scrap,
        SUM(rework_pending_qty) AS total_rework_pending,
        CASE WHEN SUM(total_produced) > 0
          THEN ROUND(((SUM(good_qty) + SUM(rework_good_qty))::DECIMAL / SUM(total_produced)) * 100, 2)
          ELSE 0 END AS good_pct,
        CASE WHEN SUM(total_produced) > 0
          THEN ROUND(((SUM(scrap_qty) + SUM(rework_scrap_qty))::DECIMAL / SUM(total_produced)) * 100, 2)
          ELSE 0 END AS reject_pct
      FROM daily_production_summary dps
      JOIN machines m ON dps.machine_id = m.id
      WHERE 1=1 ${dateFilter}
    `, params);

    // Defect breakdown
    const defectRes = await query(`
      SELECT 
        dc.code AS defect_code,
        dc.name AS defect_name,
        dc.name_en AS defect_name_en,
        dc.category,
        dd.defect_type,
        SUM(dd.quantity) AS qty,
        dd.rework_result
      FROM defect_detail dd
      JOIN daily_production_summary dps ON dd.summary_id = dps.id
      JOIN machines m ON dps.machine_id = m.id
      LEFT JOIN defect_codes dc ON dd.defect_code_id = dc.id
      WHERE 1=1 ${dateFilter}
      GROUP BY dc.code, dc.name, dc.name_en, dc.category, dd.defect_type, dd.rework_result
      ORDER BY qty DESC
    `, params);

    res.json({
      success: true,
      data: {
        records: reportRes.rows,
        summary: summaryRes.rows[0] || {},
        defects: defectRes.rows,
        filters: { period, date, month, year, line, part_number, shift },
      },
    });
  } catch (error) {
    console.error('[KPI] getReport error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};


// ═══════════════════════════════════════════════════════════
// GET /api/kpi/production/export — Export PDF/Excel
// ═══════════════════════════════════════════════════════════
const exportReport = async (req, res) => {
  try {
    const { format = 'json', ...filters } = req.query;

    // Reuse report logic
    const reportReq = { query: filters };
    const reportData = { rows: [] };
    
    // Get data same as getReport
    const fakeRes = {
      json: (data) => { reportData.result = data; },
      status: () => fakeRes,
    };
    await getReport(reportReq, fakeRes);

    if (format === 'json' || !reportData.result) {
      return res.json(reportData.result);
    }

    // For now return JSON - PDF/Excel generation will be added with pdfkit/exceljs
    res.json({
      success: true,
      message: `Export ${format} — ใช้ข้อมูลจาก /api/kpi/production/report แล้วสร้างไฟล์ที่ frontend`,
      data: reportData.result?.data,
    });
  } catch (error) {
    console.error('[KPI] exportReport error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};


module.exports = {
  createProduction,
  getReport,
  exportReport,
};