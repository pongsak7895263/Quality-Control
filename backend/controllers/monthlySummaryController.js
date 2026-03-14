/**
 * monthlySummaryController.js
 * =============================
 * ระบบสรุป KPI รายเดือนอัตโนมัติ
 * 
 * - POST /api/kpi/monthly-summary/generate  → สร้าง/อัพเดตสรุปเดือนที่เลือก
 * - GET  /api/kpi/monthly-summary           → ดูสรุปทุกเดือน
 * - GET  /api/kpi/monthly-summary/:year/:month → ดูเดือนเดียว + detail
 * - POST /api/kpi/monthly-summary/auto-close → Auto-generate เดือนก่อนหน้า
 */

const { query, getClient } = require('../config/database');

// ═══════════════════════════════════════════════════════════════
// GENERATE — สรุปข้อมูลเดือนที่เลือก
// ═══════════════════════════════════════════════════════════════
const generateSummary = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { year, month } = req.body;
    if (!year || !month) {
      return res.status(400).json({ success: false, error: 'Required: year, month' });
    }

    const yr = parseInt(year);
    const mo = parseInt(month);
    const lastDay = new Date(yr, mo, 0).getDate();
    const startDate = `${yr}-${String(mo).padStart(2, '0')}-01`;
    const endDate = `${yr}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // ── 1. ยอดผลิตจาก production_log ─────────────────────────
    const prodRes = await client.query(`
      SELECT
        COALESCE(SUM(total_produced), 0) AS total_produced,
        COALESCE(SUM(total_good), 0) AS total_good,
        COALESCE(SUM(total_ng), 0) AS total_ng,
        COUNT(*) AS prod_rows
      FROM production_log
      WHERE production_date BETWEEN $1 AND $2
    `, [startDate, endDate]);

    // ── 2. ของเสียจาก daily_production_summary ──────────────
    const defectRes = await client.query(`
      SELECT
        COALESCE(SUM(rework_qty), 0) AS total_rework,
        COALESCE(SUM(scrap_qty), 0) AS total_scrap,
        COALESCE(SUM(rework_good_qty), 0) AS rework_good,
        COALESCE(SUM(rework_scrap_qty), 0) AS rework_scrap,
        COUNT(*) AS defect_rows
      FROM daily_production_summary
      WHERE production_date BETWEEN $1 AND $2
    `, [startDate, endDate]);

    // ── 3. Customer Claims ───────────────────────────────────
    const claimRes = await client.query(`
      SELECT
        claim_category,
        COALESCE(SUM(defect_qty), 0) AS total_defects,
        COALESCE(SUM(shipped_qty), 0) AS total_shipped
      FROM customer_claims
      WHERE claim_date BETWEEN $1 AND $2
      GROUP BY claim_category
    `, [startDate, endDate]);

    // ── 4. สรุปแยก Line ──────────────────────────────────────
    const lineRes = await client.query(`
      WITH prod_by_line AS (
        SELECT
          CASE WHEN line ILIKE 'Line%' THEN line ELSE 'Line-' || line END AS line_name,
          SUM(total_produced) AS total_produced,
          SUM(total_good) AS total_good,
          SUM(total_ng) AS total_ng
        FROM production_log
        WHERE production_date BETWEEN $1 AND $2
        GROUP BY CASE WHEN line ILIKE 'Line%' THEN line ELSE 'Line-' || line END
      ),
      defect_by_line AS (
        SELECT
          CASE WHEN m.code ILIKE 'Line%' THEN m.code ELSE 'Line-' || m.code END AS line_name,
          SUM(dps.rework_qty) AS rework_qty,
          SUM(dps.scrap_qty) AS scrap_qty
        FROM daily_production_summary dps
        LEFT JOIN machines m ON dps.machine_id = m.id
        WHERE dps.production_date BETWEEN $1 AND $2
        GROUP BY CASE WHEN m.code ILIKE 'Line%' THEN m.code ELSE 'Line-' || m.code END
      )
      SELECT
        COALESCE(p.line_name, d.line_name) AS line_name,
        COALESCE(p.total_produced, 0) AS total_produced,
        COALESCE(p.total_good, 0) AS total_good,
        COALESCE(d.rework_qty, 0) AS rework_qty,
        COALESCE(d.scrap_qty, 0) AS scrap_qty
      FROM prod_by_line p
      FULL OUTER JOIN defect_by_line d ON p.line_name = d.line_name
      ORDER BY COALESCE(p.total_produced, 0) DESC
    `, [startDate, endDate]);

    // ── 5. Top defect codes ──────────────────────────────────
    const topDefectsRes = await client.query(`
      SELECT
        dc.code AS defect_code, dc.name AS defect_name, dc.category,
        dd.defect_type,
        SUM(dd.quantity) AS total_qty,
        COUNT(*) AS count
      FROM defect_detail dd
      LEFT JOIN defect_codes dc ON dd.defect_code_id = dc.id
      JOIN daily_production_summary dps ON dd.summary_id = dps.id
      WHERE dps.production_date BETWEEN $1 AND $2
      GROUP BY dc.code, dc.name, dc.category, dd.defect_type
      ORDER BY SUM(dd.quantity) DESC
    `, [startDate, endDate]);

    // ── คำนวณ ──────────────────────────────────────────────
    const prod = prodRes.rows[0];
    const defect = defectRes.rows[0];
    const totalProduced = parseInt(prod.total_produced) || 0;
    const totalGood = parseInt(prod.total_good) || 0;
    const totalRework = parseInt(defect.total_rework) || 0;
    const totalScrap = parseInt(defect.total_scrap) || 0;

    const reworkPct = totalProduced > 0 ? (totalRework / totalProduced) * 100 : 0;
    const scrapPct = totalProduced > 0 ? (totalScrap / totalProduced) * 100 : 0;
    const fpy = totalProduced > 0 ? ((totalProduced - totalRework - totalScrap) / totalProduced) * 100 : 0;

    // Claims PPM
    const claimsMap = {};
    for (const row of claimRes.rows) {
      claimsMap[row.claim_category] = row;
    }
    const calcPPM = (cat) => {
      const d = claimsMap[cat];
      if (!d || !d.total_shipped || d.total_shipped == 0) return { ppm: 0, defects: 0, shipped: 0 };
      return {
        ppm: Math.round((d.total_defects / d.total_shipped) * 1000000),
        defects: parseInt(d.total_defects),
        shipped: parseInt(d.total_shipped),
      };
    };
    const claimAuto = calcPPM('automotive');
    const claimInd = calcPPM('industrial');
    const claimMach = calcPPM('machining');

    // snapshot data (JSON)
    const snapshotData = {
      line_summary: lineRes.rows,
      top_defects: topDefectsRes.rows,
      rework_good: parseInt(defect.rework_good) || 0,
      rework_scrap: parseInt(defect.rework_scrap) || 0,
      prod_rows: parseInt(prod.prod_rows) || 0,
      defect_rows: parseInt(defect.defect_rows) || 0,
    };

    // ── UPSERT into monthly_kpi_summary ──────────────────────
    // product_line_id = NULL → UNIQUE constraint ไม่ match กับ ON CONFLICT
    // ดังนั้นใช้ DELETE + INSERT แทน
    await client.query(
      `DELETE FROM monthly_kpi_summary WHERE summary_year = $1 AND summary_month = $2 AND product_line_id IS NULL`,
      [yr, mo]
    );

    const upsertRes = await client.query(`
      INSERT INTO monthly_kpi_summary (
        summary_year, summary_month, product_line_id,
        total_produced, total_good, total_rework, total_scrap,
        rework_pct, scrap_pct, first_pass_yield,
        claim_auto_ppm, claim_ind_ppm, claim_mach_ppm,
        shipped_auto, shipped_ind, shipped_mach
      ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      yr, mo,
      totalProduced, totalGood, totalRework, totalScrap,
      reworkPct.toFixed(4), scrapPct.toFixed(4), fpy.toFixed(4),
      claimAuto.ppm, claimInd.ppm, claimMach.ppm,
      claimAuto.shipped, claimInd.shipped, claimMach.shipped,
    ]);

    console.log(`[KPI] Monthly summary ${mo}/${yr}: produced=${totalProduced} rework=${totalRework} scrap=${totalScrap}`);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `สรุปเดือน ${mo}/${yr} สำเร็จ`,
      data: {
        ...upsertRes.rows[0],
        snapshot: snapshotData,
      },
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[KPI] generateSummary error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
};

// ═══════════════════════════════════════════════════════════════
// LIST — ดูสรุปทุกเดือน
// ═══════════════════════════════════════════════════════════════
const listSummaries = async (req, res) => {
  try {
    const result = await query(`
      SELECT *,
        CASE WHEN total_produced > 0
          THEN ROUND(((total_produced - total_rework - total_scrap)::DECIMAL / total_produced) * 100, 2)
          ELSE 0 END AS calc_fpy
      FROM monthly_kpi_summary
      ORDER BY summary_year DESC, summary_month DESC
      LIMIT 24
    `);
    console.log(`[KPI] listSummaries: ${result.rows.length} rows`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[KPI] listSummaries error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// GET ONE — ดูเดือนเดียว + detail
// ═══════════════════════════════════════════════════════════════
const getSummary = async (req, res) => {
  try {
    const { year, month } = req.params;
    const result = await query(`
      SELECT * FROM monthly_kpi_summary
      WHERE summary_year = $1 AND summary_month = $2
    `, [parseInt(year), parseInt(month)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลสรุปเดือนนี้' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[KPI] getSummary error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// AUTO-CLOSE — สรุปเดือนที่แล้วอัตโนมัติ (เรียกจาก cron/startup)
// ═══════════════════════════════════════════════════════════════
const autoClose = async (req, res) => {
  try {
    const now = new Date();
    // สรุปเดือนก่อนหน้า
    const prevMonth = now.getMonth(); // 0-indexed → เดือนก่อน
    const prevYear = prevMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const mo = prevMonth === 0 ? 12 : prevMonth;

    // เช็คว่ามีข้อมูลแล้วหรือยัง
    const existing = await query(
      `SELECT id, updated_at FROM monthly_kpi_summary WHERE summary_year = $1 AND summary_month = $2 AND product_line_id IS NULL`,
      [prevYear, mo]
    );

    // ถ้ามีแล้ว → skip (ไม่ overwrite อัตโนมัติ)
    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        message: `เดือน ${mo}/${prevYear} สรุปไว้แล้วเมื่อ ${existing.rows[0].updated_at}`,
        skipped: true,
      });
    }

    // Generate โดยส่ง req ต่อ
    req.body = { year: prevYear, month: mo };
    return generateSummary(req, res);

  } catch (error) {
    console.error('[KPI] autoClose error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { generateSummary, listSummaries, getSummary, autoClose };