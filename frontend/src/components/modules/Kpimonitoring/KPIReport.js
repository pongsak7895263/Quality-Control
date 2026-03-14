/**
 * KPIReport.js — 📄 รายงานผลผลิต + ของเสีย
 * Multi-select: เลือก Line / Shift หลายตัวอิสระ
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../../../utils/api';

const API_BASE = (() => {
  const h = window.location.hostname;
  const p = window.location.port;
  if (p === '3000' || p === '3001') return `http://${h}:5000/api`;
  return '/api';
})();

const ALL_LINES = [
  { code: 'Line-1', label: '1' }, { code: 'Line-2', label: '2' },
  { code: 'Line-3', label: '3' }, { code: 'Line-4', label: '4' },
  { code: 'Line-5', label: '5' }, { code: 'Line-6', label: '6' },
  { code: 'Line-7', label: '7' }, { code: 'Line-8', label: '8' },
  { code: 'Line-PD5', label: 'PD5' }, { code: 'Line-MC', label: 'MC' },
  { code: 'Line-CT', label: 'CT' },
];
const ALL_SHIFTS = [
  { code: 'A', label: 'A' }, { code: 'B', label: 'B' },
  { code: 'AB', label: 'AB' }, { code: 'Cutting', label: 'Cut' },
];

const KPIReport = () => {
  const [mode, setMode] = useState('date');
  const [dateFilters, setDateFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    dateFrom: '', dateTo: '', month: '',
  });
  const [selectedLines, setSelectedLines] = useState(new Set()); // empty = ALL
  const [selectedShifts, setSelectedShifts] = useState(new Set()); // empty = ALL
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDefects, setShowDefects] = useState(true);
  const printRef = useRef(null);

  const toggleSet = (set, setFn, value) => {
    setFn(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  };

  const buildParams = useCallback(() => {
    const p = {};
    if (mode === 'date') p.date = dateFilters.date;
    else if (mode === 'range') { p.dateFrom = dateFilters.dateFrom; p.dateTo = dateFilters.dateTo; }
    else if (mode === 'month') p.month = dateFilters.month;

    p.lines = selectedLines.size > 0 ? [...selectedLines].join(',') : 'ALL';
    p.shifts = selectedShifts.size > 0 ? [...selectedShifts].join(',') : 'ALL';
    return p;
  }, [mode, dateFilters, selectedLines, selectedShifts]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/kpi/export/data', { params: buildParams() });
      setReportData(res?.data?.data || res?.data || null);
    } catch (err) { console.error('Report fetch error:', err); }
    setLoading(false);
  }, [buildParams]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExportPDF = () => window.open(`${API_BASE}/kpi/export/pdf?${new URLSearchParams(buildParams())}`, '_blank');
  const handleExportExcel = () => window.open(`${API_BASE}/kpi/export/excel?${new URLSearchParams(buildParams())}`, '_blank');
  const handlePrint = () => {
    const c = printRef.current;
    if (!c) return;
    const pw = window.open('', '_blank');
    pw.document.write(`<html><head><title>Report</title><style>
      *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:12px;color:#1e293b;font-size:8px}
      h1{font-size:14px;text-align:center;margin-bottom:2px}table{width:100%;border-collapse:collapse;margin-bottom:8px}
      th{background:#1e293b;color:#fff;padding:3px 4px;font-size:7px}td{padding:2px 4px;border-bottom:1px solid #e2e8f0;font-size:7px}
      tr:nth-child(even){background:#f8fafc}.summary-cards{display:flex;gap:4px;margin-bottom:8px}
      .summary-card{flex:1;border:1px solid #e2e8f0;border-radius:4px;padding:5px;text-align:center}
      .summary-card .value{font-size:12px;font-weight:700}.summary-card .label{font-size:7px;color:#64748b}
      .signatures{display:flex;justify-content:space-between;margin-top:25px}
      .sig-box{text-align:center;width:28%}.sig-line{border-top:1px solid #1e293b;margin-top:30px;padding-top:3px;font-size:8px}
      @media print{@page{size:A4 portrait;margin:8mm}}
    </style></head><body>${c.innerHTML}</body></html>`);
    pw.document.close();
    setTimeout(() => pw.print(), 500);
  };

  // ── Computed values ────────────────────────────────────────
  const records = reportData?.records || [];
  const defects = reportData?.defects || [];
  const totals = reportData?.totals || {};
  const lineSummary = reportData?.lineSummary || [];
  const tp = totals.total_produced || 0;
  const goodPct = tp > 0 ? ((totals.final_good / tp) * 100).toFixed(2) : '0.00';
  const ngPct = tp > 0 ? ((totals.final_reject / tp) * 100).toFixed(2) : '0.00';
  const rwPct = tp > 0 ? ((totals.rework_qty / tp) * 100).toFixed(2) : '0.00';
  const scPct = tp > 0 ? ((totals.scrap_qty / tp) * 100).toFixed(2) : '0.00';
  const fpy = tp > 0 ? (((tp - totals.rework_qty - totals.scrap_qty) / tp) * 100).toFixed(2) : '0.00';
  const periodLabel = reportData?.isRange ? `${reportData.startDate} ~ ${reportData.endDate}` : (reportData?.startDate || dateFilters.date);
  const lineLabel = selectedLines.size > 0 ? [...selectedLines].join(', ') : 'All Lines';
  const shiftLabel = selectedShifts.size > 0 ? [...selectedShifts].join(', ') : 'All Shifts';

  // ── Styles ─────────────────────────────────────────────────
  const S = {
    panel: { background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b', marginBottom: 16 },
    input: { padding: '5px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 14 },
    btn: (c) => ({ padding: '6px 14px', background: `${c}20`, border: `1px solid ${c}50`, borderRadius: 6, color: c, cursor: 'pointer', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }),
    modeBtn: (a) => ({ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: a ? '#3b82f6' : '#1e293b', color: a ? '#fff' : '#94a3b8' }),
    chip: (active, color) => ({
      padding: '3px 10px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600, userSelect: 'none',
      background: active ? `${color}30` : '#1e293b', color: active ? color : '#475569',
      border: `1.5px solid ${active ? color : '#334155'}`, transition: 'all 0.15s',
    }),
    groupLabel: { color: '#64748b', fontSize: 12, fontWeight: 600, marginRight: 4, whiteSpace: 'nowrap' },
    allBtn: (active) => ({
      padding: '3px 8px', borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 700,
      background: active ? '#3b82f630' : '#1e293b', color: active ? '#3b82f6' : '#475569',
      border: `1.5px solid ${active ? '#3b82f6' : '#334155'}`, userSelect: 'none',
    }),
  };

  return (
    <div>
      {/* ── Controls Panel ──────────────────────────────────── */}
      <div style={S.panel}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, margin: 0 }}>📄 รายงานผลผลิต + ของเสีย</h3>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 2, background: '#0f172a', borderRadius: 4, padding: 2 }}>
                <button style={S.modeBtn(mode === 'date')} onClick={() => setMode('date')}>📅 วัน</button>
                <button style={S.modeBtn(mode === 'range')} onClick={() => setMode('range')}>📅 ช่วง</button>
                <button style={S.modeBtn(mode === 'month')} onClick={() => {
                  setMode('month');
                  if (!dateFilters.month) {
                    const now = new Date();
                    setDateFilters(p => ({ ...p, month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` }));
                  }
                }}>📆 เดือน</button>
              </div>
              {mode === 'date' && <input type="date" style={S.input} value={dateFilters.date} onChange={e => setDateFilters(p => ({ ...p, date: e.target.value }))} />}
              {mode === 'range' && (<>
                <input type="date" style={S.input} value={dateFilters.dateFrom} onChange={e => setDateFilters(p => ({ ...p, dateFrom: e.target.value }))} />
                <span style={{ color: '#64748b' }}>~</span>
                <input type="date" style={S.input} value={dateFilters.dateTo} onChange={e => setDateFilters(p => ({ ...p, dateTo: e.target.value }))} />
              </>)}
              {mode === 'month' && <input type="month" style={S.input} value={dateFilters.month} onChange={e => setDateFilters(p => ({ ...p, month: e.target.value }))} />}
              <button onClick={fetchReport} style={S.btn('#3b82f6')}>🔄</button>
              <button onClick={handleExportPDF} style={S.btn('#ef4444')}>📕 PDF</button>
              <button onClick={handleExportExcel} style={S.btn('#10b981')}>📗 Excel</button>
              <button onClick={handlePrint} style={S.btn('#8b5cf6')}>🖨️ Print</button>
            </div>
          </div>
        </div>

        {/* ── Line multi-select chips ──────────────────────── */}
        <div style={{ padding: '8px 16px', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid #1e293b' }}>
          <span style={S.groupLabel}>🏭 Line:</span>
          <span style={S.allBtn(selectedLines.size === 0)} onClick={() => setSelectedLines(new Set())}>ทั้งหมด</span>
          {ALL_LINES.map(l => (
            <span key={l.code} style={S.chip(selectedLines.has(l.code), '#3b82f6')}
              onClick={() => toggleSet(selectedLines, setSelectedLines, l.code)}>
              {l.label}
            </span>
          ))}
          {selectedLines.size > 0 && (
            <span style={{ color: '#3b82f6', fontSize: 12, marginLeft: 4 }}>({selectedLines.size} เลือก)</span>
          )}
        </div>

        {/* ── Shift multi-select chips ─────────────────────── */}
        <div style={{ padding: '8px 16px', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={S.groupLabel}>⏰ Shift:</span>
          <span style={S.allBtn(selectedShifts.size === 0)} onClick={() => setSelectedShifts(new Set())}>ทั้งหมด</span>
          {ALL_SHIFTS.map(s => (
            <span key={s.code} style={S.chip(selectedShifts.has(s.code), '#f59e0b')}
              onClick={() => toggleSet(selectedShifts, setSelectedShifts, s.code)}>
              {s.label}
            </span>
          ))}
          {selectedShifts.size > 0 && (
            <span style={{ color: '#f59e0b', fontSize: 12, marginLeft: 4 }}>({selectedShifts.size} เลือก)</span>
          )}
        </div>
      </div>

      {/* ── Report Content ──────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>⏳ กำลังโหลด...</div>
      ) : records.length === 0 ? (
        <div style={{ ...S.panel, textAlign: 'center', padding: 40, color: '#475569' }}>📭 ไม่พบข้อมูลช่วง {periodLabel}</div>
      ) : (
        <div ref={printRef} style={{ background: '#fff', color: '#1e293b', padding: 24, borderRadius: 8, maxWidth: 794, margin: '0 auto', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <h1 style={{ textAlign: 'center', fontSize: 18, margin: '0 0 2px' }}>DAILY PRODUCTION & QUALITY REPORT</h1>
          <div style={{ textAlign: 'center', fontSize: 12, color: '#64748b', marginBottom: 14 }}>
            Period: {periodLabel} | {lineLabel} | {shiftLabel} | Generated: {new Date().toLocaleDateString('th-TH')}
          </div>

          {/* Summary Cards */}
          <div className="summary-cards" style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {[
              { label: '📦 ยอดผลิต', value: tp.toLocaleString(), color: '#1e293b' },
              { label: '✅ งานดี', value: `${(totals.final_good||0).toLocaleString()} (${goodPct}%)`, color: '#10b981' },
              { label: '🔧 Rework', value: `${(totals.rework_qty||0).toLocaleString()} (${rwPct}%)`, color: '#d97706' },
              { label: '🗑️ Scrap', value: `${(totals.scrap_qty||0).toLocaleString()} (${scPct}%)`, color: '#ef4444' },
              { label: '🏆 FPY', value: `${fpy}%`, color: parseFloat(fpy) >= 99 ? '#10b981' : '#d97706' },
            ].map((c, i) => (
              <div key={i} className="summary-card" style={{ flex: 1, border: `1px solid ${c.color}30`, borderRadius: 6, padding: 8, textAlign: 'center', borderTop: `3px solid ${c.color}` }}>
                <div className="value" style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.value}</div>
                <div className="label" style={{ fontSize: 11, color: '#64748b' }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Line Summary */}
          {lineSummary.length > 0 && (<>
            <div style={{ fontSize: 14, fontWeight: 700, borderBottom: '2px solid #1e293b', padding: '3px 0', marginBottom: 6 }}>LINE SUMMARY</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 14 }}>
              <thead>
                <tr style={{ background: '#1e293b', color: '#fff' }}>
                  {['Line','ยอดผลิต','Rework','% ซ่อม','Scrap','% ทิ้ง','รวมเสีย','% เสียรวม'].map(h =>
                    <th key={h} style={{ padding: '4px 5px', fontSize: 10 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {lineSummary.map((l, i) => {
                  const td = l.rework + l.scrap;
                  const tp2 = l.total > 0 ? ((td / l.total) * 100).toFixed(2) : '0';
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                      <td style={{ padding: '3px 5px', fontWeight: 700 }}>{l.line}</td>
                      <td style={{ padding: '3px 5px', textAlign: 'right' }}>{l.total.toLocaleString()}</td>
                      <td style={{ padding: '3px 5px', textAlign: 'right', color: '#d97706' }}>{l.rework.toLocaleString()}</td>
                      <td style={{ padding: '3px 5px', textAlign: 'right', color: '#d97706' }}>{l.rework_pct}%</td>
                      <td style={{ padding: '3px 5px', textAlign: 'right', color: '#ef4444' }}>{l.scrap.toLocaleString()}</td>
                      <td style={{ padding: '3px 5px', textAlign: 'right', color: '#ef4444' }}>{l.scrap_pct}%</td>
                      <td style={{ padding: '3px 5px', textAlign: 'right', fontWeight: 700 }}>{td.toLocaleString()}</td>
                      <td style={{ padding: '3px 5px', textAlign: 'right', fontWeight: 700, color: parseFloat(tp2) > 0.5 ? '#ef4444' : '#64748b' }}>{tp2}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>)}

          {/* ════════════════════════════════════════════════════ */}
          {/* PRODUCTION SUMMARY — Group by Part No. */}
          {/* ════════════════════════════════════════════════════ */}
          {(() => {
            // Group records by part_number
            const partMap = {};
            records.forEach(r => {
              const key = r.part_number;
              if (!partMap[key]) partMap[key] = { part: key, name: r.part_name || '', lots: new Set(), lines: new Set(), shifts: new Set(), produced: 0, good: 0, rework: 0, scrap: 0, rwGood: 0, rwScrap: 0 };
              partMap[key].produced += r.total_produced || 0;
              partMap[key].good += r.good_qty || 0;
              partMap[key].rework += r.rework_qty || 0;
              partMap[key].scrap += r.scrap_qty || 0;
              partMap[key].rwGood += r.rework_good_qty || 0;
              partMap[key].rwScrap += r.rework_scrap_qty || 0;
              if (r.line_no) partMap[key].lines.add(r.line_no);
              if (r.shift) partMap[key].shifts.add(r.shift);
              // lot from defects
            });
            // Add lots from defects
            defects.forEach(d => {
              if (partMap[d.part_number] && d.bin_no) {
                // use bin as reference
              }
            });
            const partList = Object.values(partMap).sort((a, b) => b.produced - a.produced);

            // Group defects by defect_code → then list parts
            const defectMap = {};
            defects.forEach(d => {
              const code = d.defect_code || 'OTHER';
              const name = d.defect_name || d.defect_detail || 'ไม่ระบุ';
              const type = d.defect_type || 'rework';
              const key = `${code}|${type}`;
              if (!defectMap[key]) defectMap[key] = { code, name, type, totalQty: 0, count: 0, parts: {} };
              defectMap[key].totalQty += Number(d.quantity) || Number(d.found_qty) || 0;
              defectMap[key].count += 1;
              const pk = d.part_number || '?';
              if (!defectMap[key].parts[pk]) defectMap[key].parts[pk] = 0;
              defectMap[key].parts[pk] += Number(d.quantity) || Number(d.found_qty) || 0;
            });
            const defectList = Object.values(defectMap).sort((a, b) => b.totalQty - a.totalQty);

            const thStyle = { padding: '4px 5px', fontSize: 10 };
            const tdStyle = { padding: '3px 5px' };
            const tdR = { ...tdStyle, textAlign: 'right' };

            return (<>
              {/* ── PRODUCTION BY PART ──────────────────────── */}
              <div style={{ fontSize: 14, fontWeight: 700, borderBottom: '2px solid #1e293b', padding: '3px 0', marginBottom: 6 }}>
                PRODUCTION BY PART ({partList.length} parts)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 14 }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: '#fff' }}>
                    {['#', 'Part No.', 'Part Name', 'Line', 'Shift', 'ผลิต', 'ดี', 'Rework', 'Scrap', '%ดี', '% RW', '% SC'].map(h =>
                      <th key={h} style={thStyle}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {partList.map((p, i) => {
                    const gp = p.produced > 0 ? ((p.good / p.produced) * 100).toFixed(1) : '0';
                    const rp = p.produced > 0 ? ((p.rework / p.produced) * 100).toFixed(2) : '0';
                    const sp = p.produced > 0 ? ((p.scrap / p.produced) * 100).toFixed(2) : '0';
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                        <td style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', fontSize: 10 }}>{i + 1}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: '#1e293b' }}>{p.part}</td>
                        <td style={{ ...tdStyle, fontSize: 9, color: '#64748b', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || '—'}</td>
                        <td style={{ ...tdStyle, fontSize: 9, color: '#64748b' }}>{[...p.lines].join(', ')}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontSize: 10 }}>{[...p.shifts].join(',')}</td>
                        <td style={{ ...tdR, fontWeight: 700 }}>{p.produced.toLocaleString()}</td>
                        <td style={{ ...tdR, color: '#10b981' }}>{p.good.toLocaleString()}</td>
                        <td style={{ ...tdR, color: p.rework > 0 ? '#d97706' : '#94a3b8' }}>{p.rework.toLocaleString()}</td>
                        <td style={{ ...tdR, color: p.scrap > 0 ? '#ef4444' : '#94a3b8' }}>{p.scrap.toLocaleString()}</td>
                        <td style={{ ...tdR, color: '#10b981', fontWeight: 600 }}>{gp}%</td>
                        <td style={{ ...tdR, color: parseFloat(rp) > 0.4 ? '#ef4444' : '#d97706', fontSize: 10 }}>{rp}%</td>
                        <td style={{ ...tdR, color: parseFloat(sp) > 0.3 ? '#ef4444' : '#d97706', fontSize: 10 }}>{sp}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#334155', color: '#fff', fontWeight: 700 }}>
                    <td colSpan={5} style={{ padding: '5px' }}>TOTAL ({partList.length} parts)</td>
                    <td style={{ ...tdR, color: '#fff' }}>{tp.toLocaleString()}</td>
                    <td style={{ ...tdR, color: '#a7f3d0' }}>{(totals.good_qty||0).toLocaleString()}</td>
                    <td style={{ ...tdR, color: '#fcd34d' }}>{(totals.rework_qty||0).toLocaleString()}</td>
                    <td style={{ ...tdR, color: '#fca5a5' }}>{(totals.scrap_qty||0).toLocaleString()}</td>
                    <td style={{ ...tdR, color: '#a7f3d0' }}>{goodPct}%</td>
                    <td style={{ ...tdR, color: '#fcd34d' }}>{rwPct}%</td>
                    <td style={{ ...tdR, color: '#fca5a5' }}>{scPct}%</td>
                  </tr>
                </tfoot>
              </table>

              {/* ── DEFECT SUMMARY — Group by Defect Code ───── */}
              {defectList.length > 0 && (<>
                <div style={{ fontSize: 14, fontWeight: 700, borderBottom: '2px solid #1e293b', padding: '3px 0', marginBottom: 6, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                  onClick={() => setShowDefects(!showDefects)}>
                  <span>DEFECT SUMMARY ({defectList.length} defect types)</span>
                  <span style={{ color: '#64748b', fontSize: 12 }}>{showDefects ? '▼ ซ่อน' : '▶ แสดง'}</span>
                </div>
                {showDefects && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 14 }}>
                    <thead>
                      <tr style={{ background: '#334155', color: '#fff' }}>
                        {['#', 'Defect Code', 'อาการเสีย', 'Type', 'จำนวน', 'ครั้ง', 'Part ที่พบ'].map(h =>
                          <th key={h} style={thStyle}>{h}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {defectList.map((d, i) => {
                        const partStr = Object.entries(d.parts)
                          .sort((a, b) => b[1] - a[1])
                          .map(([p, q]) => `${p}(${q})`)
                          .join(', ');
                        return (
                          <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff', verticalAlign: 'top' }}>
                            <td style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', fontSize: 10 }}>{i + 1}</td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#1e293b' }}>{d.code}</td>
                            <td style={{ ...tdStyle, color: '#475569' }}>{d.name}</td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <span style={{ padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                                background: d.type === 'scrap' ? '#fef2f2' : '#fffbeb',
                                color: d.type === 'scrap' ? '#ef4444' : '#d97706' }}>
                                {d.type === 'scrap' ? 'Scrap' : 'Rework'}
                              </span>
                            </td>
                            <td style={{ ...tdR, fontWeight: 700, color: d.type === 'scrap' ? '#ef4444' : '#d97706' }}>{d.totalQty.toLocaleString()}</td>
                            <td style={{ ...tdR, color: '#64748b' }}>{d.count}x</td>
                            <td style={{ ...tdStyle, fontSize: 9, color: '#64748b', maxWidth: 200, wordBreak: 'break-all' }}>{partStr}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#334155', color: '#fff', fontWeight: 700 }}>
                        <td colSpan={4} style={{ padding: '5px' }}>TOTAL</td>
                        <td style={tdR}>{defectList.reduce((s, d) => s + d.totalQty, 0).toLocaleString()}</td>
                        <td style={tdR}>{defectList.reduce((s, d) => s + d.count, 0)}x</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </>)}
            </>);
          })()}

          {/* Signatures */}
          <div className="signatures" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30, pageBreakInside: 'avoid' }}>
            {[{ name: 'Prepared by', role: '(Operator)' }, { name: 'Checked by', role: '(QC Inspector)' }, { name: 'Approved by', role: '(QC Manager)' }].map((sig, i) => (
              <div key={i} className="sig-box" style={{ textAlign: 'center', width: '28%' }}>
                <div className="sig-line" style={{ borderTop: '1px solid #1e293b', marginTop: 40, paddingTop: 4, fontSize: 12 }}>{sig.name}: _______________</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{sig.role}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default KPIReport;