/**
 * controllers/kpiExportController.js
 * ========================================
 * Export รายงานผลผลิต PDF / Excel
 * รูปแบบ: A4 แนวตั้ง | รายวัน
 */

const db = require('../config/database');
const query = async (text, params) => db.query(text, params);

// Lazy-load — ไม่ crash ถ้ายังไม่ได้ npm install
let ExcelJS, PDFDocument;
try { ExcelJS = require('exceljs'); } catch (e) { console.warn('⚠️ exceljs not installed. Run: npm install exceljs'); }
try { PDFDocument = require('pdfkit'); } catch (e) { console.warn('⚠️ pdfkit not installed. Run: npm install pdfkit'); }

// ═══════════════════════════════════════════════════════════
// Helper: ดึงข้อมูลรายงาน
// ═══════════════════════════════════════════════════════════
const getReportData = async (filters) => {
  const { date, dateFrom, dateTo, month, line, shift, lines, shifts } = filters;

  // ── กำหนดช่วงวันที่ ──────────────────────────────────────
  let startDate, endDate;
  if (month) {
    const [yr, mo] = month.split('-');
    const lastDay = new Date(parseInt(yr), parseInt(mo), 0).getDate();
    startDate = `${month}-01`;
    endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
  } else if (dateFrom && dateTo) {
    startDate = dateFrom;
    endDate = dateTo;
  } else {
    startDate = date || new Date().toISOString().split('T')[0];
    endDate = startDate;
  }

  // ── Parse multi-select (comma-separated) ──────────────────
  const selectedLines = (lines || line || 'ALL').split(',').map(s => s.trim()).filter(Boolean);
  const selectedShifts = (shifts || shift || 'ALL').split(',').map(s => s.trim()).filter(Boolean);
  const isAllLines = selectedLines.includes('ALL') || selectedLines.length === 0;
  const isAllShifts = selectedShifts.includes('ALL') || selectedShifts.length === 0;

  // ── Build WHERE conditions ─────────────────────────────────
  let plConditions = [`pl.production_date BETWEEN $1 AND $2`];
  let dpsConditions = [`dps.production_date BETWEEN $1 AND $2`];
  const params = [startDate, endDate];
  let idx = 3;

  if (!isAllLines) {
    // สร้าง: (pl.line IN ($3,$4,...) OR pl.line IN ($N,$N+1,...))
    const plPlaceholders = [];
    const dpsPlaceholders = [];
    for (const l of selectedLines) {
      const stripped = l.replace(/^Line-?/i, '').trim();
      plPlaceholders.push(`$${idx}`, `$${idx + 1}`);
      dpsPlaceholders.push(`$${idx}`, `$${idx + 1}`);
      params.push(l, stripped);
      idx += 2;
    }
    plConditions.push(`(pl.line IN (${plPlaceholders.join(',')}))`);
    dpsConditions.push(`(m.code IN (${dpsPlaceholders.join(',')}))`);
  }

  if (!isAllShifts) {
    const shiftPlaceholders = selectedShifts.map(() => `$${idx++}`);
    params.push(...selectedShifts);
    plConditions.push(`pl.shift IN (${shiftPlaceholders.join(',')})`);
    dpsConditions.push(`dps.shift IN (${shiftPlaceholders.join(',')})`);
  }

  const plWhere = plConditions.join(' AND ');
  const dpsWhere = dpsConditions.join(' AND ');

  // ── 1. ยอดผลิตจาก production_log ──────────────────────────
  const prodRes = await query(`
    SELECT
      CASE WHEN pl.line ILIKE 'Line%' THEN pl.line ELSE 'Line-' || pl.line END AS line_no,
      pl.part_number, pl.part_name, pl.shift, pl.operator,
      pl.production_date,
      SUM(pl.total_produced) AS total_produced,
      SUM(pl.total_good) AS total_good,
      SUM(pl.total_ng) AS total_ng,
      SUM(pl.total_bins) AS total_bins
    FROM production_log pl
    WHERE ${plWhere}
    GROUP BY pl.line, pl.part_number, pl.part_name, pl.shift, pl.operator, pl.production_date
    ORDER BY pl.production_date, pl.line, pl.shift
  `, params);

  // ── 2. ของเสียจาก daily_production_summary ─────────────────
  const defectSumRes = await query(`
    SELECT
      CASE WHEN m.code ILIKE 'Line%' THEN m.code ELSE 'Line-' || m.code END AS line_no,
      dps.part_number, dps.part_name, dps.shift, dps.operator_name,
      dps.production_date,
      SUM(dps.rework_qty) AS rework_qty,
      SUM(dps.scrap_qty) AS scrap_qty,
      SUM(dps.rework_good_qty) AS rework_good_qty,
      SUM(dps.rework_scrap_qty) AS rework_scrap_qty,
      SUM(dps.rework_pending_qty) AS rework_pending_qty
    FROM daily_production_summary dps
    LEFT JOIN machines m ON dps.machine_id = m.id
    WHERE ${dpsWhere}
    GROUP BY m.code, dps.part_number, dps.part_name, dps.shift, dps.operator_name, dps.production_date
    ORDER BY dps.production_date, m.code, dps.shift
  `, params);

  // ── 3. Defect details ──────────────────────────────────────
  const defectRes = await query(`
    SELECT
      dd.*, dc.code AS defect_code, dc.name AS defect_name, dc.category,
      CASE WHEN m.code ILIKE 'Line%' THEN m.code ELSE 'Line-' || m.code END AS line_no,
      dps.part_number, dps.shift, dps.production_date
    FROM defect_detail dd
    JOIN daily_production_summary dps ON dd.summary_id = dps.id
    LEFT JOIN machines m ON dps.machine_id = m.id
    LEFT JOIN defect_codes dc ON dd.defect_code_id = dc.id
    WHERE ${dpsWhere}
    ORDER BY dps.production_date, m.code, dd.id
  `, params);

  // ── 4. Merge production + defects ──────────────────────────
  // Key: date|line|part|shift
  const merged = {};

  for (const p of prodRes.rows) {
    const key = `${p.production_date}|${p.line_no}|${p.part_number}|${p.shift}`;
    merged[key] = {
      production_date: p.production_date,
      line_no: p.line_no,
      part_number: p.part_number,
      part_name: p.part_name || '',
      shift: p.shift || 'A',
      operator_name: p.operator || '',
      total_produced: Number(p.total_produced) || 0,
      good_qty: Number(p.total_good) || 0,
      rework_qty: 0,
      scrap_qty: 0,
      rework_good_qty: 0,
      rework_scrap_qty: 0,
      rework_pending_qty: 0,
      total_ng_prod: Number(p.total_ng) || 0,
    };
  }

  for (const d of defectSumRes.rows) {
    const key = `${d.production_date}|${d.line_no}|${d.part_number}|${d.shift}`;
    if (!merged[key]) {
      merged[key] = {
        production_date: d.production_date,
        line_no: d.line_no,
        part_number: d.part_number,
        part_name: d.part_name || '',
        shift: d.shift || 'A',
        operator_name: d.operator_name || '',
        total_produced: 0,
        good_qty: 0,
        total_ng_prod: 0,
      };
    }
    merged[key].rework_qty = Number(d.rework_qty) || 0;
    merged[key].scrap_qty = Number(d.scrap_qty) || 0;
    merged[key].rework_good_qty = Number(d.rework_good_qty) || 0;
    merged[key].rework_scrap_qty = Number(d.rework_scrap_qty) || 0;
    merged[key].rework_pending_qty = Number(d.rework_pending_qty) || 0;
  }

  const records = Object.values(merged).map(r => ({
    ...r,
    final_good: r.good_qty + (r.rework_good_qty || 0),
    final_reject: r.scrap_qty + (r.rework_scrap_qty || 0),
  }));

  // ── 5. Totals ──────────────────────────────────────────────
  const totals = records.reduce((acc, r) => ({
    total_produced: acc.total_produced + r.total_produced,
    good_qty: acc.good_qty + r.good_qty,
    rework_qty: acc.rework_qty + r.rework_qty,
    scrap_qty: acc.scrap_qty + r.scrap_qty,
    rework_good: acc.rework_good + (r.rework_good_qty || 0),
    rework_scrap: acc.rework_scrap + (r.rework_scrap_qty || 0),
    rework_pending: acc.rework_pending + (r.rework_pending_qty || 0),
    final_good: acc.final_good + r.final_good,
    final_reject: acc.final_reject + r.final_reject,
  }), {
    total_produced: 0, good_qty: 0, rework_qty: 0, scrap_qty: 0,
    rework_good: 0, rework_scrap: 0, rework_pending: 0,
    final_good: 0, final_reject: 0,
  });

  // ── 6. Line summary ───────────────────────────────────────
  const lineMap = {};
  records.forEach(r => {
    if (!lineMap[r.line_no]) lineMap[r.line_no] = { total: 0, rework: 0, scrap: 0 };
    lineMap[r.line_no].total += r.total_produced;
    lineMap[r.line_no].rework += r.rework_qty;
    lineMap[r.line_no].scrap += r.scrap_qty;
  });
  const lineSummary = Object.entries(lineMap).map(([line, d]) => ({
    line, ...d,
    rework_pct: d.total > 0 ? ((d.rework / d.total) * 100).toFixed(2) : '0',
    scrap_pct: d.total > 0 ? ((d.scrap / d.total) * 100).toFixed(2) : '0',
  })).sort((a, b) => b.total - a.total);

  return {
    startDate, endDate,
    isRange: startDate !== endDate,
    records: records.sort((a, b) => {
      const d = String(a.production_date).localeCompare(String(b.production_date));
      return d !== 0 ? d : (a.line_no || '').localeCompare(b.line_no || '');
    }),
    defects: defectRes.rows,
    totals,
    lineSummary,
  };
};


// ═══════════════════════════════════════════════════════════
// GET /api/kpi/export/pdf — รายงาน PDF (A4 แนวตั้ง)
// ═══════════════════════════════════════════════════════════
const exportPDF = async (req, res) => {
  try {
    if (!PDFDocument) {
      return res.status(500).json({ success: false, error: 'pdfkit not installed. Run: npm install pdfkit' });
    }
    const data = await getReportData(req.query);
    
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 30,
      info: {
        Title: `Production Report - ${data.date}`,
        Author: 'Quality Control System',
      }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=production_report_${data.date}.pdf`);
    doc.pipe(res);

    const W = 535; // usable width
    const LEFT = 30;
    let y = 30;

    // ─── Header ─────────────────────────────────────────────
    doc.fontSize(16).font('Helvetica-Bold')
       .text('DAILY PRODUCTION & QUALITY REPORT', LEFT, y, { align: 'center', width: W });
    y += 22;
    doc.fontSize(9).font('Helvetica')
       .text(`Date: ${data.date}   |   Generated: ${new Date().toLocaleString('th-TH')}`, LEFT, y, { align: 'center', width: W });
    y += 20;

    // ─── Summary Table ──────────────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold')
       .text('PRODUCTION SUMMARY', LEFT, y);
    y += 16;

    // Table headers
    const cols = [
      { label: 'Line', x: LEFT, w: 50 },
      { label: 'Part No.', x: 80, w: 60 },
      { label: 'Shift', x: 140, w: 30 },
      { label: 'Operator', x: 170, w: 65 },
      { label: 'Total', x: 235, w: 40 },
      { label: 'Good', x: 275, w: 40 },
      { label: 'Rework', x: 315, w: 40 },
      { label: 'Scrap', x: 355, w: 35 },
      { label: 'RW Good', x: 390, w: 40 },
      { label: 'RW Scrap', x: 430, w: 40 },
      { label: 'Good%', x: 470, w: 40 },
      { label: 'NG%', x: 510, w: 40 },
    ];

    // Header row bg
    doc.rect(LEFT, y - 2, W, 14).fill('#1e293b');
    doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold');
    cols.forEach(c => doc.text(c.label, c.x + 2, y, { width: c.w, align: 'center' }));
    y += 15;

    // Data rows
    doc.fillColor('#000000').fontSize(7).font('Helvetica');
    data.records.forEach((r, i) => {
      if (y > 740) { doc.addPage(); y = 30; }
      if (i % 2 === 0) doc.rect(LEFT, y - 2, W, 13).fill('#f8fafc');
      doc.fillColor('#000000');
      
      const tp = Number(r.total_produced) || 0;
      const fg = Number(r.final_good) || 0;
      const fr = Number(r.final_reject) || 0;
      const goodP = tp > 0 ? ((fg / tp) * 100).toFixed(1) : '0';
      const ngP = tp > 0 ? ((fr / tp) * 100).toFixed(1) : '0';

      const vals = [
        r.line_no, r.part_number, r.shift, (r.operator_name || '').substring(0, 10),
        tp, Number(r.good_qty), Number(r.rework_qty), Number(r.scrap_qty),
        Number(r.rework_good_qty), Number(r.rework_scrap_qty),
        `${goodP}%`, `${ngP}%`,
      ];
      cols.forEach((c, ci) => {
        doc.text(String(vals[ci] || ''), c.x + 2, y, { width: c.w, align: ci >= 4 ? 'center' : 'left' });
      });
      y += 14;
    });

    // Totals row
    if (data.records.length > 0) {
      doc.rect(LEFT, y - 2, W, 14).fill('#334155');
      doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold');
      const t = data.totals;
      const tGoodP = t.total_produced > 0 ? ((t.final_good / t.total_produced) * 100).toFixed(1) : '0';
      const tNgP = t.total_produced > 0 ? ((t.final_reject / t.total_produced) * 100).toFixed(1) : '0';
      const totVals = ['TOTAL', '', '', '', t.total_produced, t.good_qty, t.rework_qty, t.scrap_qty, t.rework_good, t.rework_scrap, `${tGoodP}%`, `${tNgP}%`];
      cols.forEach((c, ci) => doc.text(String(totVals[ci]), c.x + 2, y, { width: c.w, align: ci >= 4 ? 'center' : 'left' }));
      y += 20;
    }

    // ─── Defect Detail Table ────────────────────────────────
    if (data.defects.length > 0) {
      y += 10;
      if (y > 680) { doc.addPage(); y = 30; }

      doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold')
         .text('DEFECT DETAILS', LEFT, y);
      y += 16;

      const dCols = [
        { label: 'Line', x: LEFT, w: 40 },
        { label: 'Part', x: 70, w: 55 },
        { label: 'Bin No.', x: 125, w: 50 },
        { label: 'Defect Code', x: 175, w: 55 },
        { label: 'Defect Name', x: 230, w: 80 },
        { label: 'Type', x: 310, w: 40 },
        { label: 'Found', x: 350, w: 35 },
        { label: 'Good', x: 385, w: 30 },
        { label: 'NG', x: 415, w: 30 },
        { label: 'Meas.', x: 445, w: 40 },
        { label: 'Spec', x: 485, w: 50 },
        { label: 'Result', x: 535, w: 30 },
      ];

      doc.rect(LEFT, y - 2, W, 14).fill('#1e293b');
      doc.fillColor('#ffffff').fontSize(6).font('Helvetica-Bold');
      dCols.forEach(c => doc.text(c.label, c.x + 1, y, { width: c.w, align: 'center' }));
      y += 15;

      doc.fillColor('#000000').fontSize(6).font('Helvetica');
      data.defects.forEach((d, i) => {
        if (y > 760) { doc.addPage(); y = 30; }
        if (i % 2 === 0) doc.rect(LEFT, y - 2, W, 12).fill('#f8fafc');
        doc.fillColor('#000000');

        const vals = [
          d.line_no, d.part_number, d.bin_no || '', d.defect_code || '',
          (d.defect_name || '').substring(0, 15), d.defect_type || '',
          d.found_qty || '', d.sorted_good || '', d.sorted_reject || '',
          d.measurement || '', (d.spec_value || '').substring(0, 10),
          d.rework_result || '',
        ];
        dCols.forEach((c, ci) => doc.text(String(vals[ci] || ''), c.x + 1, y, { width: c.w, align: ci >= 6 ? 'center' : 'left' }));
        y += 13;
      });
    }

    // ─── Footer ─────────────────────────────────────────────
    y = 780;
    doc.fontSize(7).font('Helvetica').fillColor('#94a3b8')
       .text('Quality Control System — Auto-generated Report', LEFT, y, { align: 'center', width: W });

    // ─── Signatures ─────────────────────────────────────────
    if (y > 700) { doc.addPage(); y = 650; } else { y = 720; }
    doc.fillColor('#000000').fontSize(8).font('Helvetica');
    const sigW = W / 3;
    ['Prepared by: _______________', 'Checked by: _______________', 'Approved by: _______________'].forEach((txt, i) => {
      doc.text(txt, LEFT + (i * sigW), y, { width: sigW, align: 'center' });
    });
    y += 14;
    ['(Operator)', '(QC Inspector)', '(QC Manager)'].forEach((txt, i) => {
      doc.text(txt, LEFT + (i * sigW), y, { width: sigW, align: 'center' });
    });

    doc.end();

  } catch (error) {
    console.error('[Export] PDF error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// ═══════════════════════════════════════════════════════════
// GET /api/kpi/export/excel — รายงาน Excel
// ═══════════════════════════════════════════════════════════
const exportExcel = async (req, res) => {
  try {
    if (!ExcelJS) {
      return res.status(500).json({ success: false, error: 'exceljs not installed. Run: npm install exceljs' });
    }
    const data = await getReportData(req.query);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Quality Control System';
    wb.created = new Date();

    // ─── Sheet 1: Production Summary ────────────────────────
    const ws1 = wb.addWorksheet('Production Summary', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
    });

    // Title
    ws1.mergeCells('A1:L1');
    const titleCell = ws1.getCell('A1');
    titleCell.value = `DAILY PRODUCTION & QUALITY REPORT — ${data.date}`;
    titleCell.font = { size: 14, bold: true, color: { argb: 'FF1E293B' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws1.getRow(1).height = 30;

    // Headers
    const headers = [
      'Line', 'Part No.', 'Shift', 'Operator', 'Total Produced',
      'Good', 'Rework', 'Scrap', 'RW→Good', 'RW→Scrap',
      'Final Good%', 'Final NG%',
    ];
    const headerRow = ws1.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { bottom: { style: 'thin' } };
    });
    ws1.getRow(2).height = 22;

    // Column widths
    [10, 14, 7, 14, 12, 10, 10, 10, 10, 10, 12, 12].forEach((w, i) => {
      ws1.getColumn(i + 1).width = w;
    });

    // Data rows
    data.records.forEach((r) => {
      const tp = Number(r.total_produced) || 0;
      const fg = Number(r.final_good) || 0;
      const fr = Number(r.final_reject) || 0;
      const row = ws1.addRow([
        r.line_no, r.part_number, r.shift, r.operator_name,
        tp, Number(r.good_qty), Number(r.rework_qty), Number(r.scrap_qty),
        Number(r.rework_good_qty), Number(r.rework_scrap_qty),
        tp > 0 ? (fg / tp) : 0,
        tp > 0 ? (fr / tp) : 0,
      ]);
      // Format % columns
      row.getCell(11).numFmt = '0.00%';
      row.getCell(12).numFmt = '0.00%';
      // Conditional color for NG%
      if (tp > 0 && (fr / tp) > 0.02) {
        row.getCell(12).font = { color: { argb: 'FFEF4444' }, bold: true };
      }
    });

    // Totals row
    const t = data.totals;
    const totRow = ws1.addRow([
      'TOTAL', '', '', '',
      t.total_produced, t.good_qty, t.rework_qty, t.scrap_qty,
      t.rework_good, t.rework_scrap,
      t.total_produced > 0 ? (t.final_good / t.total_produced) : 0,
      t.total_produced > 0 ? (t.final_reject / t.total_produced) : 0,
    ]);
    totRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    });
    totRow.getCell(11).numFmt = '0.00%';
    totRow.getCell(12).numFmt = '0.00%';

    // ─── Sheet 2: Defect Details ────────────────────────────
    const ws2 = wb.addWorksheet('Defect Details');
    
    ws2.mergeCells('A1:L1');
    ws2.getCell('A1').value = `DEFECT DETAILS — ${data.date}`;
    ws2.getCell('A1').font = { size: 14, bold: true };
    ws2.getCell('A1').alignment = { horizontal: 'center' };

    const dHeaders = [
      'Line', 'Part No.', 'Shift', 'Bin No.', 'Defect Code', 'Defect Name',
      'Type', 'Found Qty', 'Sorted Good', 'Sorted NG', 'Measurement', 'Spec',
      'Rework Result',
    ];
    const dHeaderRow = ws2.addRow(dHeaders);
    dHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell.alignment = { horizontal: 'center' };
    });

    [10, 14, 7, 12, 12, 18, 10, 10, 10, 10, 12, 14, 12].forEach((w, i) => {
      ws2.getColumn(i + 1).width = w;
    });

    data.defects.forEach((d) => {
      const row = ws2.addRow([
        d.line_no, d.part_number, d.shift,
        d.bin_no || '', d.defect_code || '', d.defect_name || '',
        d.defect_type || '', d.found_qty || '', d.sorted_good || '', d.sorted_reject || '',
        d.measurement || '', d.spec_value || '',
        d.rework_result || '',
      ]);
      // Color type column
      const typeCell = row.getCell(7);
      if (d.defect_type === 'scrap') {
        typeCell.font = { color: { argb: 'FFEF4444' }, bold: true };
      } else if (d.defect_type === 'rework') {
        typeCell.font = { color: { argb: 'FFF59E0B' }, bold: true };
      }
    });

    // ─── Write to response ──────────────────────────────────
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=production_report_${data.date}.xlsx`);
    await wb.xlsx.write(res);

  } catch (error) {
    console.error('[Export] Excel error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// ═══════════════════════════════════════════════════════════
// GET /api/kpi/export/data — JSON data for frontend report
// ═══════════════════════════════════════════════════════════
const exportData = async (req, res) => {
  try {
    const data = await getReportData(req.query);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[Export] data error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


module.exports = { exportPDF, exportExcel, exportData };