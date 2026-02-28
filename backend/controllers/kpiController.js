/**
 * controllers/kpiController.js
 * =============================
 * Business logic สำหรับ KPI Good/Scrap Management
 * 
 * ✅ ใช้ db.query() ตาม config/database.js ของโปรเจกต์จริง
 */

const db = require('../config/database');

// Helper: shorthand สำหรับ query
const query = async (text, params) => db.query(text, params);

// Helper: transaction wrapper (รองรับทั้ง db.pool และ db.getClient)
const transaction = async (callback) => {
  // ลอง pool.connect() ก่อน → ถ้าไม่มี fallback ใช้ query ธรรมดา
  let client;
  try {
    if (db.pool && typeof db.pool.connect === 'function') {
      client = await db.pool.connect();
    } else if (db.getClient && typeof db.getClient === 'function') {
      client = await db.getClient();
    }
  } catch (e) {
    // pool ไม่พร้อม — fallback ใช้ query ธรรมดา (ไม่มี transaction)
    console.warn('⚠️ [KPI] pool.connect unavailable, running without transaction');
  }

  if (client) {
    try {
      await client.query('BEGIN');
      const result = await callback({
        query: (text, params) => client.query(text, params),
      });
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } else {
    // Fallback: ไม่มี transaction แต่ยังทำงานได้
    return await callback({
      query: (text, params) => db.query(text, params),
    });
  }
};

// ═══════════════════════════════════════════════════════════
// DASHBOARD — ภาพรวม
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/kpi/dashboard
 * ดึงข้อมูล Dashboard ทั้งหมดในครั้งเดียว
 */
const getDashboard = async (req, res) => {
  try {
    const { dateRange = 'today', shift = 'ALL', line = 'ALL' } = req.query;

    // Build date filter
    let dateFilter;
    const now = new Date();
    switch (dateRange) {
      case 'today':
        dateFilter = `inspected_at::DATE = CURRENT_DATE`;
        break;
      case 'mtd':
        dateFilter = `inspected_at >= DATE_TRUNC('month', CURRENT_DATE)`;
        break;
      case 'ytd':
        dateFilter = `inspected_at >= DATE_TRUNC('year', CURRENT_DATE)`;
        break;
      default:
        dateFilter = `inspected_at::DATE = CURRENT_DATE`;
    }

    const shiftFilter = shift !== 'ALL' ? `AND shift = $1` : '';
    const lineFilter = line !== 'ALL' ? `AND product_line_id = (SELECT id FROM product_lines WHERE code = $${shift !== 'ALL' ? 2 : 1})` : '';
    const params = [];
    if (shift !== 'ALL') params.push(shift);
    if (line !== 'ALL') params.push(line);

    // Summary
    const summaryResult = await query(`
      SELECT
        COALESCE(SUM(quantity), 0) AS total_produced,
        COALESCE(SUM(CASE WHEN disposition = 'GOOD' THEN quantity ELSE 0 END), 0) AS total_good,
        COALESCE(SUM(CASE WHEN disposition = 'REWORK' THEN quantity ELSE 0 END), 0) AS total_rework,
        COALESCE(SUM(CASE WHEN disposition = 'SCRAP' THEN quantity ELSE 0 END), 0) AS total_scrap,
        CASE 
          WHEN SUM(quantity) > 0 
          THEN ROUND((SUM(CASE WHEN disposition = 'GOOD' THEN quantity ELSE 0 END)::DECIMAL / SUM(quantity)) * 100, 2)
          ELSE 0 
        END AS first_pass_yield
      FROM inspection_entries
      WHERE ${dateFilter} ${shiftFilter} ${lineFilter}
    `, params);

    // Active Andon Alerts
    const alertsResult = await query(`
      SELECT 
        aa.id, aa.alert_number, aa.triggered_at, aa.alert_type,
        aa.escalation, aa.status, aa.description,
        aa.consecutive_ng, aa.rework_pct_hr,
        aa.acknowledged_at, aa.resolved_at,
        aa.assignee_name, aa.response_minutes,
        m.code AS machine_code
      FROM andon_alerts aa
      JOIN machines m ON aa.machine_id = m.id
      WHERE aa.triggered_at::DATE = CURRENT_DATE
      ORDER BY aa.triggered_at DESC
      LIMIT 20
    `);

    // Recent entries
    const recentResult = await query(`
      SELECT 
        ie.id, ie.inspected_at, ie.part_number, ie.disposition,
        ie.operator_name, ie.quantity, ie.measurement, ie.spec,
        m.code AS machine_code,
        dc.code AS defect_code, dc.name AS defect_name
      FROM inspection_entries ie
      JOIN machines m ON ie.machine_id = m.id
      LEFT JOIN defect_codes dc ON ie.defect_code_id = dc.id
      WHERE ie.inspected_at::DATE = CURRENT_DATE
      ORDER BY ie.inspected_at DESC
      LIMIT 20
    `);

    res.json({
      success: true,
      data: {
        summary: summaryResult.rows[0],
        andonAlerts: alertsResult.rows,
        recentEntries: recentResult.rows,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[KPI] getDashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
};


// ═══════════════════════════════════════════════════════════
// KPI VALUES — ค่า PPM และ %
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/kpi/values
 * ดึงค่า KPI ทั้งหมดสำหรับช่วงเวลาที่กำหนด
 */
const getKpiValues = async (req, res) => {
  try {
    const { dateRange = 'mtd' } = req.query;

    let startDate, endDate;
    const now = new Date();
    endDate = now.toISOString().split('T')[0];

    switch (dateRange) {
      case 'today':
        startDate = endDate;
        break;
      case 'mtd':
        startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        break;
      case 'ytd':
        startDate = `${now.getFullYear()}-01-01`;
        break;
      default:
        startDate = endDate;
    }

    // Claim PPMs
    const claimResult = await query(`
      SELECT
        claim_category,
        COALESCE(SUM(defect_qty), 0) AS total_defects,
        COALESCE(SUM(shipped_qty), 0) AS total_shipped,
        CASE 
          WHEN SUM(shipped_qty) > 0 
          THEN ROUND((SUM(defect_qty)::DECIMAL / SUM(shipped_qty)) * 1000000, 2)
          ELSE 0 
        END AS ppm
      FROM customer_claims
      WHERE claim_date BETWEEN $1 AND $2
      GROUP BY claim_category
    `, [startDate, endDate]);

    // Internal rates — จาก daily_production_summary (ข้อมูลจริง)
    const internalResult = await query(`
      SELECT
        COALESCE(
          CASE 
            WHEN m.code LIKE '%MC%' OR m.code LIKE '%CNC%' THEN 'machining'
            ELSE 'production'
          END, 'production'
        ) AS group_name,
        SUM(dps.total_produced) AS total,
        SUM(dps.rework_qty) AS rework_qty,
        SUM(dps.scrap_qty) AS scrap_qty,
        SUM(dps.good_qty) AS good_qty,
        SUM(dps.rework_good_qty) AS rework_good_qty,
        SUM(dps.rework_scrap_qty) AS rework_scrap_qty,
        CASE WHEN SUM(dps.total_produced) > 0 
          THEN ROUND((SUM(dps.rework_qty)::DECIMAL / SUM(dps.total_produced)) * 100, 4)
          ELSE 0 END AS rework_pct,
        CASE WHEN SUM(dps.total_produced) > 0 
          THEN ROUND((SUM(dps.scrap_qty)::DECIMAL / SUM(dps.total_produced)) * 100, 4)
          ELSE 0 END AS scrap_pct
      FROM daily_production_summary dps
      JOIN machines m ON dps.machine_id = m.id
      WHERE dps.production_date BETWEEN $1 AND $2
      GROUP BY group_name
    `, [startDate, endDate]);

    // Detail: rework/scrap by part (สำหรับ drill-down)
    const detailResult = await query(`
      SELECT
        dps.part_number, dps.part_name,
        m.code AS line_no,
        SUM(dps.total_produced) AS total_produced,
        SUM(dps.good_qty) AS good_qty,
        SUM(dps.rework_qty) AS rework_qty,
        SUM(dps.scrap_qty) AS scrap_qty,
        SUM(dps.rework_good_qty) AS rework_good_qty,
        SUM(dps.rework_scrap_qty) AS rework_scrap_qty,
        CASE WHEN SUM(dps.total_produced) > 0 
          THEN ROUND((SUM(dps.rework_qty)::DECIMAL / SUM(dps.total_produced)) * 100, 2)
          ELSE 0 END AS rework_pct,
        CASE WHEN SUM(dps.total_produced) > 0 
          THEN ROUND((SUM(dps.scrap_qty)::DECIMAL / SUM(dps.total_produced)) * 100, 2)
          ELSE 0 END AS scrap_pct
      FROM daily_production_summary dps
      JOIN machines m ON dps.machine_id = m.id
      WHERE dps.production_date BETWEEN $1 AND $2
      GROUP BY dps.part_number, dps.part_name, m.code
      ORDER BY SUM(dps.rework_qty) + SUM(dps.scrap_qty) DESC
      LIMIT 20
    `, [startDate, endDate]);

    // Top defect codes
    const defectDetail = await query(`
      SELECT
        dd.defect_code_id, dc.code AS defect_code, dc.name AS defect_name, dc.category,
        dd.defect_type,
        COUNT(*) AS count,
        SUM(dd.quantity) AS total_qty
      FROM defect_detail dd
      LEFT JOIN defect_codes dc ON dd.defect_code_id = dc.id
      JOIN daily_production_summary dps ON dd.summary_id = dps.id
      WHERE dps.production_date BETWEEN $1 AND $2
      GROUP BY dd.defect_code_id, dc.code, dc.name, dc.category, dd.defect_type
      ORDER BY SUM(dd.quantity) DESC
      LIMIT 20
    `, [startDate, endDate]);

    // Targets
    const targetsResult = await query(`
      SELECT metric_code, metric_name, target_value, unit, category, claim_category
      FROM kpi_targets WHERE is_active = TRUE
    `);

    res.json({
      success: true,
      data: {
        claims: claimResult.rows,
        internal: internalResult.rows,
        detail: detailResult.rows,
        defects: defectDetail.rows,
        targets: targetsResult.rows,
        period: { startDate, endDate },
      },
    });
  } catch (error) {
    console.error('[KPI] getKpiValues error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch KPI values' });
  }
};


// ═══════════════════════════════════════════════════════════
// TRENDS — แนวโน้ม
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/kpi/trends
 * ดึงข้อมูล Trend รายเดือน (12 เดือนย้อนหลัง)
 */
const getTrends = async (req, res) => {
  try {
    const { months = 12, line = 'ALL' } = req.query;

    // Monthly internal metrics
    const trendResult = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', ie.inspected_at), 'YYYY-MM') AS month,
        SUM(ie.quantity) AS total_produced,
        SUM(CASE WHEN ie.disposition = 'REWORK' THEN ie.quantity ELSE 0 END) AS total_rework,
        SUM(CASE WHEN ie.disposition = 'SCRAP' THEN ie.quantity ELSE 0 END) AS total_scrap,
        CASE WHEN SUM(ie.quantity) > 0 
          THEN ROUND((SUM(CASE WHEN ie.disposition = 'REWORK' THEN ie.quantity ELSE 0 END)::DECIMAL / SUM(ie.quantity)) * 100, 4)
          ELSE 0 END AS rework_pct,
        CASE WHEN SUM(ie.quantity) > 0 
          THEN ROUND((SUM(CASE WHEN ie.disposition = 'SCRAP' THEN ie.quantity ELSE 0 END)::DECIMAL / SUM(ie.quantity)) * 100, 4)
          ELSE 0 END AS scrap_pct,
        CASE WHEN SUM(ie.quantity) > 0 
          THEN ROUND((SUM(CASE WHEN ie.disposition = 'GOOD' THEN ie.quantity ELSE 0 END)::DECIMAL / SUM(ie.quantity)) * 100, 2)
          ELSE 0 END AS fpy
      FROM inspection_entries ie
      WHERE ie.inspected_at >= NOW() - INTERVAL '${parseInt(months)} months'
      GROUP BY DATE_TRUNC('month', ie.inspected_at)
      ORDER BY month
    `);

    // Monthly claim PPMs
    const claimTrendResult = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', claim_date), 'YYYY-MM') AS month,
        claim_category,
        SUM(defect_qty) AS defects,
        SUM(shipped_qty) AS shipped,
        CASE WHEN SUM(shipped_qty) > 0 
          THEN ROUND((SUM(defect_qty)::DECIMAL / SUM(shipped_qty)) * 1000000, 2)
          ELSE 0 END AS ppm
      FROM customer_claims
      WHERE claim_date >= NOW() - INTERVAL '${parseInt(months)} months'
      GROUP BY DATE_TRUNC('month', claim_date), claim_category
      ORDER BY month
    `);

    // Daily detail for current month (machining focus)
    const dailyResult = await query(`
      SELECT
        ie.inspected_at::DATE AS day,
        SUM(ie.quantity) AS total,
        SUM(CASE WHEN ie.disposition = 'SCRAP' THEN ie.quantity ELSE 0 END) AS scrap,
        SUM(CASE WHEN ie.disposition = 'REWORK' THEN ie.quantity ELSE 0 END) AS rework
      FROM inspection_entries ie
      LEFT JOIN product_lines pl ON ie.product_line_id = pl.id
      WHERE ie.inspected_at >= DATE_TRUNC('month', CURRENT_DATE)
      AND (pl.claim_category = 'machining' OR $1 = 'ALL')
      GROUP BY ie.inspected_at::DATE
      ORDER BY day
    `, [line]);

    res.json({
      success: true,
      data: {
        monthlyInternal: trendResult.rows,
        monthlyClaims: claimTrendResult.rows,
        dailyDetail: dailyResult.rows,
      },
    });
  } catch (error) {
    console.error('[KPI] getTrends error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trends' });
  }
};


// ═══════════════════════════════════════════════════════════
// PARETO — วิเคราะห์ข้อบกพร่อง
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/kpi/pareto
 * วิเคราะห์ Pareto ของข้อบกพร่อง
 */
const getPareto = async (req, res) => {
  try {
    const { dateRange = 'mtd', category = 'all', line = 'ALL' } = req.query;

    let dateFilter, dateFilterDD;
    switch (dateRange) {
      case 'today':
        dateFilter = `ie.inspected_at::DATE = CURRENT_DATE`;
        dateFilterDD = `dps.production_date = CURRENT_DATE`;
        break;
      case 'ytd':
        dateFilter = `ie.inspected_at >= DATE_TRUNC('year', CURRENT_DATE)`;
        dateFilterDD = `dps.production_date >= DATE_TRUNC('year', CURRENT_DATE)`;
        break;
      case 'mtd':
      default:
        dateFilter = `ie.inspected_at >= DATE_TRUNC('month', CURRENT_DATE)`;
        dateFilterDD = `dps.production_date >= DATE_TRUNC('month', CURRENT_DATE)`;
    }

    const categoryFilter = category !== 'all' ? `AND dc.category = '${category}'` : '';
    const lineFilter = line !== 'ALL' ? `AND m.code = '${line}'` : '';

    // ─── 1. Pareto จาก defect_detail (ข้อมูลใหม่จาก production) ────
    let paretoRows = [];
    let categoryRows = [];
    let machineRows = [];

    try {
      const paretoDD = await query(`
        SELECT
          dc.code, dc.name, dc.name_en, dc.category, dc.severity,
          COUNT(*) AS entry_count,
          SUM(dd.quantity) AS defect_qty,
          dd.defect_type
        FROM defect_detail dd
        JOIN daily_production_summary dps ON dd.summary_id = dps.id
        JOIN machines m ON dps.machine_id = m.id
        LEFT JOIN defect_codes dc ON dd.defect_code_id = dc.id
        WHERE ${dateFilterDD} ${categoryFilter} ${lineFilter}
        GROUP BY dc.id, dc.code, dc.name, dc.name_en, dc.category, dc.severity, dd.defect_type
        ORDER BY defect_qty DESC
      `);
      paretoRows = paretoDD.rows;

      const catDD = await query(`
        SELECT
          dc.category,
          COUNT(*) AS entry_count,
          SUM(dd.quantity) AS defect_qty
        FROM defect_detail dd
        JOIN daily_production_summary dps ON dd.summary_id = dps.id
        JOIN machines m ON dps.machine_id = m.id
        LEFT JOIN defect_codes dc ON dd.defect_code_id = dc.id
        WHERE ${dateFilterDD} ${lineFilter}
        GROUP BY dc.category
        ORDER BY defect_qty DESC
      `);
      categoryRows = catDD.rows;

      const machDD = await query(`
        SELECT
          m.code AS machine_code,
          SUM(CASE WHEN dd.defect_type = 'scrap' THEN dd.quantity ELSE 0 END) AS scrap_qty,
          SUM(CASE WHEN dd.defect_type = 'rework' THEN dd.quantity ELSE 0 END) AS rework_qty
        FROM defect_detail dd
        JOIN daily_production_summary dps ON dd.summary_id = dps.id
        JOIN machines m ON dps.machine_id = m.id
        WHERE ${dateFilterDD} ${lineFilter}
        GROUP BY m.id, m.code
        ORDER BY scrap_qty DESC
      `);
      machineRows = machDD.rows;
    } catch (ddErr) {
      console.warn('[KPI] defect_detail query failed, fallback to inspection_entries:', ddErr.message);
    }

    // ─── 2. Fallback: ถ้า defect_detail ไม่มีข้อมูล → ใช้ inspection_entries ─
    if (paretoRows.length === 0) {
      const paretoIE = await query(`
        SELECT
          dc.code, dc.name, dc.name_en, dc.category, dc.severity,
          COUNT(*) AS entry_count,
          SUM(ie.quantity) AS defect_qty,
          ie.disposition AS defect_type
        FROM inspection_entries ie
        JOIN defect_codes dc ON ie.defect_code_id = dc.id
        WHERE ie.disposition IN ('SCRAP', 'REWORK')
        AND ${dateFilter} ${categoryFilter}
        GROUP BY dc.id, dc.code, dc.name, dc.name_en, dc.category, dc.severity, ie.disposition
        ORDER BY defect_qty DESC
      `);
      paretoRows = paretoIE.rows;

      const catIE = await query(`
        SELECT dc.category, COUNT(*) AS entry_count, SUM(ie.quantity) AS defect_qty
        FROM inspection_entries ie
        JOIN defect_codes dc ON ie.defect_code_id = dc.id
        WHERE ie.disposition IN ('SCRAP', 'REWORK') AND ${dateFilter}
        GROUP BY dc.category ORDER BY defect_qty DESC
      `);
      categoryRows = catIE.rows;

      const machIE = await query(`
        SELECT m.code AS machine_code,
          SUM(CASE WHEN ie.disposition = 'SCRAP' THEN ie.quantity ELSE 0 END) AS scrap_qty,
          SUM(CASE WHEN ie.disposition = 'REWORK' THEN ie.quantity ELSE 0 END) AS rework_qty
        FROM inspection_entries ie
        JOIN machines m ON ie.machine_id = m.id
        WHERE ie.disposition IN ('SCRAP', 'REWORK') AND ${dateFilter}
        GROUP BY m.id, m.code ORDER BY scrap_qty DESC
      `);
      machineRows = machIE.rows;
    }

    // ─── 3. ถ้ายังไม่มี → ดึงจาก daily_production_summary โดยตรง ────
    if (paretoRows.length === 0 && categoryRows.length === 0) {
      const summaryResult = await query(`
        SELECT
          m.code AS machine_code,
          dps.part_number,
          SUM(dps.scrap_qty) AS scrap_qty,
          SUM(dps.rework_qty) AS rework_qty,
          SUM(dps.total_produced) AS total_produced
        FROM daily_production_summary dps
        JOIN machines m ON dps.machine_id = m.id
        WHERE ${dateFilterDD} ${lineFilter}
        GROUP BY m.code, dps.part_number
        ORDER BY scrap_qty DESC
      `);
      machineRows = summaryResult.rows;
    }

    res.json({
      success: true,
      data: {
        pareto: paretoRows,
        categories: categoryRows,
        byMachine: machineRows,
      },
    });
  } catch (error) {
    console.error('[KPI] getPareto error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pareto data' });
  }
};


// ═══════════════════════════════════════════════════════════
// INSPECTION ENTRIES — บันทึกผล
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/kpi/entries
 * บันทึกผลตรวจสอบชิ้นงาน
 */
const createEntry = async (req, res) => {
  try {
    const {
      machine_code, part_number, lot_number, quantity = 1,
      disposition, defect_code, defect_detail,
      measurement, spec, operator_name, inspector_name,
      product_line_code, shift, remark,
      material_lot, tool_id, tool_life_count,
    } = req.body;

    // Validation
    if (!machine_code || !part_number || !disposition || !operator_name) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: machine_code, part_number, disposition, operator_name',
      });
    }

    if (disposition !== 'GOOD' && !defect_code) {
      return res.status(400).json({
        success: false,
        error: 'defect_code is required when disposition is not GOOD',
      });
    }

    const result = await transaction(async (client) => {
      // Resolve machine ID
      const machineRes = await client.query(
        'SELECT id FROM machines WHERE code = $1', [machine_code]
      );
      if (machineRes.rows.length === 0) {
        throw new Error(`Machine not found: ${machine_code}`);
      }
      const machineId = machineRes.rows[0].id;

      // Resolve defect code ID
      let defectCodeId = null;
      if (defect_code) {
        const defectRes = await client.query(
          'SELECT id FROM defect_codes WHERE code = $1', [defect_code]
        );
        if (defectRes.rows.length > 0) {
          defectCodeId = defectRes.rows[0].id;
        }
      }

      // Resolve product line
      let productLineId = null;
      if (product_line_code) {
        const plRes = await client.query(
          'SELECT id FROM product_lines WHERE code = $1', [product_line_code]
        );
        if (plRes.rows.length > 0) {
          productLineId = plRes.rows[0].id;
        }
      }

      // Detect current shift
      const currentHour = new Date().getHours();
      const detectedShift = shift || (currentHour >= 6 && currentHour < 18 ? 'A' : 'B');

      // Insert entry
      const insertRes = await client.query(`
        INSERT INTO inspection_entries (
          machine_id, part_number, lot_number, quantity,
          disposition, defect_code_id, defect_detail,
          measurement, spec, operator_name, inspector_name,
          product_line_id, shift, remark,
          material_lot, tool_id, tool_life_count
        ) VALUES ($1,$2,$3,$4,$5::disposition_type,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        RETURNING *
      `, [
        machineId, part_number, lot_number, quantity,
        disposition, defectCodeId, defect_detail,
        measurement, spec, operator_name, inspector_name,
        productLineId, detectedShift, remark,
        material_lot, tool_id, tool_life_count,
      ]);

      const entry = insertRes.rows[0];

      // Check for andon trigger (trigger handles this automatically via DB trigger,
      // but we also return consecutive count for frontend)
      let consecutiveNG = 0;
      if (disposition === 'SCRAP') {
        const ngRes = await client.query(
          'SELECT fn_check_consecutive_ng($1, 5) AS count', [machineId]
        );
        consecutiveNG = ngRes.rows[0].count;
      }

      return { entry, consecutiveNG };
    });

    res.status(201).json({
      success: true,
      data: {
        entry: result.entry,
        consecutiveNG: result.consecutiveNG,
        andonTriggered: result.consecutiveNG >= 3,
      },
    });
  } catch (error) {
    console.error('[KPI] createEntry error:', error);
    console.error('[KPI] createEntry error:', error.message, error.detail || '');
    res.status(error.message.includes('not found') ? 400 : 500).json({
      success: false,
      error: error.message || 'Failed to create entry',
      detail: error.detail || null,
    });
  }
};

/**
 * GET /api/kpi/entries
 * ดึงรายการตรวจสอบ (paginated)
 */
const getEntries = async (req, res) => {
  try {
    const {
      page = 1, limit = 50,
      date, shift, machine, disposition, defect_category,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (date) {
      conditions.push(`ie.inspected_at::DATE = $${paramIndex++}`);
      params.push(date);
    }
    if (shift && shift !== 'ALL') {
      conditions.push(`ie.shift = $${paramIndex++}`);
      params.push(shift);
    }
    if (machine) {
      conditions.push(`m.code = $${paramIndex++}`);
      params.push(machine);
    }
    if (disposition) {
      conditions.push(`ie.disposition = $${paramIndex++}`);
      params.push(disposition);
    }
    if (defect_category) {
      conditions.push(`dc.category = $${paramIndex++}`);
      params.push(defect_category);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await query(`
      SELECT COUNT(*) FROM inspection_entries ie
      JOIN machines m ON ie.machine_id = m.id
      LEFT JOIN defect_codes dc ON ie.defect_code_id = dc.id
      ${whereClause}
    `, params);

    const dataResult = await query(`
      SELECT 
        ie.id, ie.entry_number, ie.inspected_at, ie.shift,
        ie.part_number, ie.lot_number, ie.quantity,
        ie.disposition, ie.defect_detail, ie.measurement, ie.spec,
        ie.operator_name, ie.inspector_name, ie.remark,
        ie.material_lot, ie.tool_id, ie.tool_life_count,
        m.code AS machine_code,
        dc.code AS defect_code, dc.name AS defect_name, dc.category AS defect_category,
        pl.name AS product_line
      FROM inspection_entries ie
      JOIN machines m ON ie.machine_id = m.id
      LEFT JOIN defect_codes dc ON ie.defect_code_id = dc.id
      LEFT JOIN product_lines pl ON ie.product_line_id = pl.id
      ${whereClause}
      ORDER BY ie.inspected_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, [...params, parseInt(limit), offset]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('[KPI] getEntries error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch entries' });
  }
};


// ═══════════════════════════════════════════════════════════
// ANDON ALERTS
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/kpi/andon
 * ดึง Andon alerts
 */
const getAndonAlerts = async (req, res) => {
  try {
    const { status = 'all', date, limit = 50 } = req.query;

    let whereClause = 'WHERE aa.triggered_at::DATE = COALESCE($1::DATE, CURRENT_DATE)';
    const params = [date || null];

    if (status !== 'all') {
      whereClause += ` AND aa.status = $2`;
      params.push(status);
    }

    const result = await query(`
      SELECT 
        aa.*, m.code AS machine_code, m.name AS machine_name
      FROM andon_alerts aa
      JOIN machines m ON aa.machine_id = m.id
      ${whereClause}
      ORDER BY aa.triggered_at DESC
      LIMIT $${params.length + 1}
    `, [...params, parseInt(limit)]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[KPI] getAndonAlerts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch andon alerts' });
  }
};

/**
 * PATCH /api/kpi/andon/:id/acknowledge
 * รับทราบ Andon alert
 */
const acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { operator_name, acknowledged_by } = req.body;
    const assignee = acknowledged_by || operator_name || 'unknown';

    // รองรับทั้ง UUID (id) และ alert_number (AND-xxx)
    const isAlertNumber = id.startsWith('AND-');
    const whereClause = isAlertNumber ? 'alert_number = $1' : 'id = $1';

    const result = await query(`
      UPDATE andon_alerts 
      SET status = 'acknowledged'::alert_status,
          acknowledged_at = NOW(),
          assignee_name = $2,
          response_minutes = ROUND(EXTRACT(EPOCH FROM (NOW() - triggered_at)) / 60, 1)
      WHERE ${whereClause}
      RETURNING *
    `, [id, assignee]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[KPI] acknowledgeAlert error:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
  }
};

/**
 * PATCH /api/kpi/andon/:id/resolve
 * แก้ไข Andon alert
 */
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { root_cause, action_taken, operator_name, resolved_by, corrective_action } = req.body;

    const cause = root_cause || corrective_action || '';
    const action = action_taken || corrective_action || '';
    const resolver = resolved_by || operator_name || 'unknown';

    // รองรับทั้ง UUID (id) และ alert_number (AND-xxx)
    const isAlertNumber = id.startsWith('AND-');
    const whereClause = isAlertNumber ? 'alert_number = $1' : 'id = $1';

    const result = await query(`
      UPDATE andon_alerts 
      SET status = 'resolved'::alert_status,
          resolved_at = NOW(),
          root_cause = $2,
          action_taken = $3,
          assignee_name = COALESCE(assignee_name, $4),
          resolution_minutes = ROUND(EXTRACT(EPOCH FROM (NOW() - triggered_at)) / 60, 1),
          downtime_minutes = ROUND(EXTRACT(EPOCH FROM (NOW() - triggered_at)) / 60, 1)
      WHERE ${whereClause}
      RETURNING *
    `, [id, cause, action, resolver]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[KPI] resolveAlert error:', error);
    res.status(500).json({ success: false, error: 'Failed to resolve alert' });
  }
};


// ═══════════════════════════════════════════════════════════
// MACHINE STATUS
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/kpi/machines/status
 * ดึงสถานะเครื่องจักรทั้งหมด
 */
const getMachineStatus = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        m.id, m.code, m.name, m.status, m.machine_type,
        -- Today's stats
        COALESCE(stats.total_produced, 0) AS today_produced,
        COALESCE(stats.scrap_count, 0) AS today_scrap,
        COALESCE(stats.rework_count, 0) AS today_rework,
        -- Latest status log
        msl.oee, msl.current_part, msl.note
      FROM machines m
      LEFT JOIN LATERAL (
        SELECT 
          SUM(quantity) AS total_produced,
          SUM(CASE WHEN disposition = 'SCRAP' THEN quantity ELSE 0 END) AS scrap_count,
          SUM(CASE WHEN disposition = 'REWORK' THEN quantity ELSE 0 END) AS rework_count
        FROM inspection_entries
        WHERE machine_id = m.id AND inspected_at::DATE = CURRENT_DATE
      ) stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT oee, current_part, note
        FROM machine_status_log
        WHERE machine_id = m.id
        ORDER BY recorded_at DESC LIMIT 1
      ) msl ON TRUE
      WHERE m.is_active = TRUE
      ORDER BY m.code
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[KPI] getMachineStatus error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch machine status' });
  }
};


// ═══════════════════════════════════════════════════════════
// CLAIMS
// ═══════════════════════════════════════════════════════════

/**
 * POST /api/kpi/claims
 * บันทึก Customer Claim
 */
const createClaim = async (req, res) => {
  try {
    const {
      claim_number, claim_date, claim_category, 
      customer, customer_name,  // รองรับทั้ง 2 ชื่อ
      product_line_code, part_number, lot_number,
      defect_code, defect_description,
      shipped_qty, defect_qty,
      containment_action, root_cause, corrective_action,
      status, remark, ppm,
    } = req.body;

    const customerVal = customer || customer_name;
    if (!claim_date || !claim_category || !customerVal || !part_number || !shipped_qty || !defect_qty) {
      return res.status(400).json({
        success: false,
        error: 'Required: claim_date, claim_category, customer/customer_name, part_number, shipped_qty, defect_qty',
      });
    }

    // Auto-generate claim_number ถ้าไม่ส่งมา
    let claimNo = claim_number;
    if (!claimNo) {
      const d = new Date(claim_date);
      const prefix = `CLM-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}`;
      const countRes = await query(
        `SELECT COUNT(*) AS cnt FROM customer_claims WHERE claim_number LIKE $1`,
        [`${prefix}%`]
      );
      const seq = (parseInt(countRes.rows[0]?.cnt) || 0) + 1;
      claimNo = `${prefix}-${String(seq).padStart(3,'0')}`;
    }

    // Resolve IDs
    let productLineId = null;
    if (product_line_code) {
      const plRes = await query('SELECT id FROM product_lines WHERE code = $1', [product_line_code]);
      if (plRes.rows.length > 0) productLineId = plRes.rows[0].id;
    }

    let defectCodeId = null;
    if (defect_code) {
      const dcRes = await query('SELECT id FROM defect_codes WHERE code = $1', [defect_code]);
      if (dcRes.rows.length > 0) defectCodeId = dcRes.rows[0].id;
    }

    const result = await query(`
      INSERT INTO customer_claims (
        claim_number, claim_date, claim_category, customer,
        product_line_id, part_number, lot_number,
        defect_code_id, defect_description,
        shipped_qty, defect_qty,
        containment_action, root_cause, corrective_action,
        status
      ) VALUES ($1,$2,$3::claim_category,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
    `, [
      claimNo, claim_date, claim_category, customerVal,
      productLineId, part_number, lot_number || null,
      defectCodeId, defect_description || null,
      shipped_qty, defect_qty,
      containment_action || remark || null, root_cause || null, corrective_action || null,
      status || 'open',
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[KPI] createClaim error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create claim' });
  }
};

/**
 * PATCH /api/kpi/claims/:id
 * อัปเดต Claim (status, root_cause, corrective_action ฯลฯ)
 */
const updateClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Fields ที่อัปเดตตรงๆ ได้ (ชื่อตรงกับ column ใน DB)
    const directFields = [
      'status', 'root_cause', 'corrective_action', 'containment_action',
      'defect_description', 'customer', 'part_number', 'lot_number',
      'defect_qty', 'shipped_qty', 'claim_date',
    ];

    const setClauses = [];
    const params = [id]; // $1 = id
    let idx = 2;

    for (const [key, value] of Object.entries(updates)) {
      // customer_name → map to 'customer' column
      if (key === 'customer_name') {
        setClauses.push(`customer = $${idx}`);
        params.push(value);
        idx++;
      }
      // claim_category → needs ENUM cast
      else if (key === 'claim_category' && value) {
        setClauses.push(`claim_category = $${idx}::claim_category`);
        params.push(value);
        idx++;
      }
      // defect_code → resolve to defect_code_id
      else if (key === 'defect_code' && value) {
        try {
          const dcRes = await query('SELECT id FROM defect_codes WHERE code = $1', [value]);
          if (dcRes.rows.length > 0) {
            setClauses.push(`defect_code_id = $${idx}`);
            params.push(dcRes.rows[0].id);
            idx++;
          }
        } catch (e) { /* skip if defect_codes doesn't exist */ }
      }
      // Direct fields
      else if (directFields.includes(key)) {
        setClauses.push(`${key} = $${idx}`);
        params.push(value);
        idx++;
      }
      // Skip unknown fields (ppm, remark, etc.)
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    if (updates.status === 'closed') {
      setClauses.push(`closed_at = NOW()`);
    }
    setClauses.push(`updated_at = NOW()`);

    const result = await query(
      `UPDATE customer_claims SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Claim not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[KPI] updateClaim error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/kpi/claims
 */
const getClaims = async (req, res) => {
  try {
    const { category, status, startDate, endDate, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    const params = [];
    let i = 1;

    if (category) { conditions.push(`claim_category = $${i++}`); params.push(category); }
    if (status) { conditions.push(`status = $${i++}`); params.push(status); }
    if (startDate) { conditions.push(`claim_date >= $${i++}`); params.push(startDate); }
    if (endDate) { conditions.push(`claim_date <= $${i++}`); params.push(endDate); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await query(`
      SELECT * FROM customer_claims ${where}
      ORDER BY claim_date DESC
      LIMIT $${i++} OFFSET $${i}
    `, [...params, parseInt(limit), offset]);

    const countRes = await query(`SELECT COUNT(*) FROM customer_claims ${where}`, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countRes.rows[0].count),
      },
    });
  } catch (error) {
    console.error('[KPI] getClaims error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch claims' });
  }
};


// ═══════════════════════════════════════════════════════════
// ACTION PLANS
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/kpi/actions
 */
const getActionPlans = async (req, res) => {
  try {
    const { status = 'all', priority } = req.query;
    const conditions = [];
    const params = [];
    let i = 1;

    if (status !== 'all') { conditions.push(`status = $${i++}`); params.push(status); }
    if (priority) { conditions.push(`priority = $${i++}`); params.push(priority); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await query(`
      SELECT * FROM action_plans ${where}
      ORDER BY 
        CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        due_date ASC
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[KPI] getActionPlans error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch action plans' });
  }
};

/**
 * POST /api/kpi/actions
 */
const createActionPlan = async (req, res) => {
  try {
    const {
      source_type, source_ref, title, description,
      priority = 'medium', assignee_name, department,
      due_date, related_kpi, before_value,
    } = req.body;

    const actionNumber = `ACT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`;

    const result = await query(`
      INSERT INTO action_plans (
        action_number, source_type, source_ref, title, description,
        priority, assignee_name, department,
        due_date, related_kpi, before_value
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
      actionNumber, source_type, source_ref, title, description,
      priority, assignee_name, department,
      due_date, related_kpi, before_value,
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[KPI] createActionPlan error:', error);
    res.status(500).json({ success: false, error: 'Failed to create action plan' });
  }
};


// ═══════════════════════════════════════════════════════════
// MASTER DATA
// ═══════════════════════════════════════════════════════════

const getMasterData = async (req, res) => {
  try {
    const [machines, defectCodes, productLines, targets] = await Promise.all([
      query('SELECT id, code, name, machine_type, status FROM machines WHERE is_active = TRUE ORDER BY code'),
      query('SELECT id, code, name, name_en, category, severity FROM defect_codes WHERE is_active = TRUE ORDER BY code'),
      query('SELECT id, code, name, name_th, claim_category FROM product_lines WHERE is_active = TRUE ORDER BY code'),
      query('SELECT * FROM kpi_targets WHERE is_active = TRUE'),
    ]);

    res.json({
      success: true,
      data: {
        machines: machines.rows,
        defectCodes: defectCodes.rows,
        productLines: productLines.rows,
        kpiTargets: targets.rows,
      },
    });
  } catch (error) {
    console.error('[KPI] getMasterData error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch master data' });
  }
};


module.exports = {
  getDashboard,
  getKpiValues,
  getTrends,
  getPareto,
  createEntry,
  getEntries,
  getAndonAlerts,
  acknowledgeAlert,
  resolveAlert,
  getMachineStatus,
  createClaim,
  updateClaim,
  getClaims,
  getActionPlans,
  createActionPlan,
  getMasterData,
};