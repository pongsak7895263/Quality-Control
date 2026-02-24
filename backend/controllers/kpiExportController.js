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
  const { date, line, shift } = filters;
  const targetDate = date || new Date().toISOString().split('T')[0];

  let conditions = [`dps.production_date = $1`];
  const params = [targetDate];
  let idx = 2;

  if (line && line !== 'ALL') {
    conditions.push(`m.code = $${idx++}`);
    params.push(line);
  }
  if (shift && shift !== 'ALL') {
    conditions.push(`dps.shift = $${idx++}`);
    params.push(shift);
  }

  const where = conditions.join(' AND ');

  // Summary records
  const summaryRes = await query(`
    SELECT 
      dps.id, dps.production_date, m.code AS line_no, m.name AS line_name,
      dps.part_number, dps.shift, dps.operator_name,
      dps.total_produced, dps.good_qty, dps.rework_qty, dps.scrap_qty,
      dps.rework_good_qty, dps.rework_scrap_qty, dps.rework_pending_qty,
      dps.good_pct, dps.reject_pct, dps.rework_pct,
      (dps.good_qty + dps.rework_good_qty) AS final_good,
      (dps.scrap_qty + dps.rework_scrap_qty) AS final_reject,
      dps.notes
    FROM daily_production_summary dps
    JOIN machines m ON dps.machine_id = m.id
    WHERE ${where}
    ORDER BY m.code, dps.shift
  `, params);

  // Defect details
  const defectRes = await query(`
    SELECT 
      dd.*, dc.code AS defect_code, dc.name AS defect_name, dc.category,
      m.code AS line_no, dps.part_number, dps.shift
    FROM defect_detail dd
    JOIN daily_production_summary dps ON dd.summary_id = dps.id
    JOIN machines m ON dps.machine_id = m.id
    LEFT JOIN defect_codes dc ON dd.defect_code_id = dc.id
    WHERE ${where}
    ORDER BY m.code, dd.id
  `, params);

  // Totals
  const totals = summaryRes.rows.reduce((acc, r) => ({
    total_produced: acc.total_produced + Number(r.total_produced || 0),
    good_qty: acc.good_qty + Number(r.good_qty || 0),
    rework_qty: acc.rework_qty + Number(r.rework_qty || 0),
    scrap_qty: acc.scrap_qty + Number(r.scrap_qty || 0),
    rework_good: acc.rework_good + Number(r.rework_good_qty || 0),
    rework_scrap: acc.rework_scrap + Number(r.rework_scrap_qty || 0),
    final_good: acc.final_good + Number(r.final_good || 0),
    final_reject: acc.final_reject + Number(r.final_reject || 0),
  }), {
    total_produced: 0, good_qty: 0, rework_qty: 0, scrap_qty: 0,
    rework_good: 0, rework_scrap: 0, final_good: 0, final_reject: 0,
  });

  return {
    date: targetDate,
    records: summaryRes.rows,
    defects: defectRes.rows,
    totals,
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