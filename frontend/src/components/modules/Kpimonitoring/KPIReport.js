/**
 * KPIReport.js — 📄 หน้ารายงานผลผลิตรายวัน
 * 
 * ฟีเจอร์:
 * - Preview รายงาน A4 แนวตั้ง
 * - กรอง: วัน, Line, Shift
 * - Export: PDF / Excel
 * - สรุปยอดผลิต + ตารางของเสีย + ลายเซ็น
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../../../utils/api';

const API_BASE = (() => {
  const h = window.location.hostname;
  const p = window.location.port;
  if (p === '3000' || p === '3001') return `http://${h}:5000/api`;
  return '/api';
})();

const KPIReport = () => {
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    line: 'ALL',
    shift: 'ALL',
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/kpi/export/data', { params: filters });
      const raw = res?.data || res;
      setReportData(raw?.data || raw);
    } catch (err) {
      console.error('Report fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExportPDF = () => {
    const params = new URLSearchParams(filters).toString();
    window.open(`${API_BASE}/kpi/export/pdf?${params}`, '_blank');
  };

  const handleExportExcel = () => {
    const params = new URLSearchParams(filters).toString();
    window.open(`${API_BASE}/kpi/export/excel?${params}`, '_blank');
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const pw = window.open('', '_blank');
    pw.document.write(`<html><head><title>Production Report - ${filters.date}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;color:#1e293b}
        h1{font-size:16px;text-align:center;margin-bottom:4px}
        .subtitle{font-size:10px;text-align:center;color:#64748b;margin-bottom:16px}
        .section-title{font-size:12px;font-weight:700;margin:16px 0 8px;border-bottom:2px solid #1e293b;padding-bottom:4px}
        table{width:100%;border-collapse:collapse;font-size:9px;margin-bottom:12px}
        th{background:#1e293b;color:#fff;padding:4px 6px;text-align:center;font-weight:600}
        td{padding:3px 6px;border-bottom:1px solid #e2e8f0}
        tr:nth-child(even){background:#f8fafc}
        .total-row{background:#334155!important;color:#fff;font-weight:700}
        .text-red{color:#ef4444;font-weight:700}
        .text-green{color:#10b981;font-weight:700}
        .text-amber{color:#d97706;font-weight:700}
        .summary-cards{display:flex;gap:8px;margin-bottom:12px}
        .summary-card{flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center}
        .summary-card .value{font-size:20px;font-weight:700}
        .summary-card .label{font-size:9px;color:#64748b}
        .signatures{display:flex;justify-content:space-between;margin-top:40px}
        .sig-box{text-align:center;width:30%}
        .sig-line{border-top:1px solid #1e293b;margin-top:40px;padding-top:4px;font-size:10px}
        .sig-role{font-size:9px;color:#64748b}
        @media print{@page{size:A4 portrait;margin:15mm}}
      </style></head><body>${content.innerHTML}</body></html>`);
    pw.document.close();
    setTimeout(() => pw.print(), 500);
  };

  const records = reportData?.records || [];
  const defects = reportData?.defects || [];
  const totals = reportData?.totals || {};
  const tp = totals.total_produced || 0;
  const goodPct = tp > 0 ? ((totals.final_good / tp) * 100).toFixed(2) : '0.00';
  const ngPct = tp > 0 ? ((totals.final_reject / tp) * 100).toFixed(2) : '0.00';
  const rwPct = tp > 0 ? ((totals.rework_qty / tp) * 100).toFixed(2) : '0.00';

  const S = {
    panel: { background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b', marginBottom: 16 },
    panelHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1e293b', flexWrap: 'wrap', gap: 8 },
    title: { color: '#e2e8f0', fontSize: 14, fontWeight: 700, margin: 0 },
    input: { padding: '6px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 13 },
    btn: (c) => ({ padding: '8px 16px', background: `${c}20`, border: `1px solid ${c}50`, borderRadius: 6, color: c, cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }),
  };

  return (
    <div>
      {/* Controls */}
      <div style={S.panel}>
        <div style={S.panelHead}>
          <h3 style={S.title}>📄 รายงานผลผลิตรายวัน</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" style={S.input} value={filters.date}
              onChange={e => setFilters(p => ({ ...p, date: e.target.value }))} />
            <select style={S.input} value={filters.line}
              onChange={e => setFilters(p => ({ ...p, line: e.target.value }))}>
              <option value="ALL">ทุก Line</option>
              {Array.from({ length: 8 }, (_, i) => <option key={i} value={`Line-${i+1}`}>Line-{i+1}</option>)}
              <option value="Line-CT">Line-CT</option>
              <option value="Line-PD5">Line-PD5</option>
              <option value="Line-MC">Line-MC</option>
            </select>
            <select style={S.input} value={filters.shift}
              onChange={e => setFilters(p => ({ ...p, shift: e.target.value }))}>
              <option value="ALL">ทุก Shift</option><option value="A">Shift A</option><option value="B">Shift B</option>
            </select>
            <button onClick={fetchReport} style={S.btn('#3b82f6')}>🔄 โหลด</button>
            <button onClick={handleExportPDF} style={S.btn('#ef4444')}>📕 PDF</button>
            <button onClick={handleExportExcel} style={S.btn('#10b981')}>📗 Excel</button>
            <button onClick={handlePrint} style={S.btn('#8b5cf6')}>🖨️ Print</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>⏳ กำลังโหลด...</div>
      ) : records.length === 0 ? (
        <div style={{ ...S.panel, textAlign: 'center', padding: 40, color: '#475569' }}>
          📭 ไม่พบข้อมูลวันที่ {filters.date}
        </div>
      ) : (
        <div ref={printRef} style={{ background: '#fff', color: '#1e293b', padding: 24, borderRadius: 8,
          maxWidth: 794, margin: '0 auto', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>

          <h1 style={{ textAlign: 'center', fontSize: 18, margin: '0 0 4px' }}>DAILY PRODUCTION & QUALITY REPORT</h1>
          <div className="subtitle" style={{ textAlign: 'center', fontSize: 11, color: '#64748b', marginBottom: 16 }}>
            Date: {filters.date} | {filters.line !== 'ALL' ? `Line: ${filters.line}` : 'All Lines'} |
            {filters.shift !== 'ALL' ? ` Shift: ${filters.shift}` : ' All Shifts'} |
            Generated: {new Date().toLocaleDateString('th-TH')}
          </div>

          {/* Summary */}
          <div className="summary-cards" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'ยอดผลิต', value: tp.toLocaleString(), color: '#1e293b' },
              { label: 'งานดีรวม', value: `${(totals.final_good||0).toLocaleString()} (${goodPct}%)`, color: '#10b981' },
              { label: 'Rework', value: `${(totals.rework_qty||0).toLocaleString()} (${rwPct}%)`, color: '#f59e0b' },
              { label: 'เสียทิ้งรวม', value: `${(totals.final_reject||0).toLocaleString()} (${ngPct}%)`, color: '#ef4444' },
            ].map((c, i) => (
              <div key={i} className="summary-card" style={{ flex: 1, border: `1px solid ${c.color}30`,
                borderRadius: 8, padding: 10, textAlign: 'center', borderTop: `3px solid ${c.color}` }}>
                <div className="value" style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.value}</div>
                <div className="label" style={{ fontSize: 10, color: '#64748b' }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Production Table */}
          <div className="section-title" style={{ fontSize: 13, fontWeight: 700, borderBottom: '2px solid #1e293b', padding: '4px 0', marginBottom: 8 }}>
            PRODUCTION SUMMARY
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, marginBottom: 16 }}>
            <thead>
              <tr style={{ background: '#1e293b', color: '#fff' }}>
                {['Line','Part No.','Shift','Operator','Total','Good','Rework','Scrap','RW→Good','RW→Scrap','Good%','NG%'].map(h =>
                  <th key={h} style={{ padding: '5px 4px', fontSize: 9 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => {
                const rtp = Number(r.total_produced)||0;
                const rfg = Number(r.final_good)||0;
                const rfr = Number(r.final_reject)||0;
                const gp = rtp > 0 ? ((rfg/rtp)*100).toFixed(1) : '0';
                const np = rtp > 0 ? ((rfr/rtp)*100).toFixed(1) : '0';
                return (
                  <tr key={i} style={{ background: i%2===0 ? '#f8fafc' : '#fff' }}>
                    <td style={{ padding: '3px 4px', fontWeight: 600 }}>{r.line_no}</td>
                    <td style={{ padding: '3px 4px' }}>{r.part_number}</td>
                    <td style={{ padding: '3px 4px', textAlign: 'center' }}>{r.shift}</td>
                    <td style={{ padding: '3px 4px' }}>{r.operator_name}</td>
                    <td style={{ padding: '3px 4px', textAlign: 'center', fontWeight: 700 }}>{rtp}</td>
                    <td className="text-green" style={{ padding: '3px 4px', textAlign: 'center', color: '#10b981', fontWeight: 600 }}>{Number(r.good_qty)}</td>
                    <td className="text-amber" style={{ padding: '3px 4px', textAlign: 'center', color: '#d97706' }}>{Number(r.rework_qty)}</td>
                    <td className="text-red" style={{ padding: '3px 4px', textAlign: 'center', color: '#ef4444' }}>{Number(r.scrap_qty)}</td>
                    <td style={{ padding: '3px 4px', textAlign: 'center' }}>{Number(r.rework_good_qty)}</td>
                    <td style={{ padding: '3px 4px', textAlign: 'center' }}>{Number(r.rework_scrap_qty)}</td>
                    <td className="text-green" style={{ padding: '3px 4px', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>{gp}%</td>
                    <td style={{ padding: '3px 4px', textAlign: 'center', color: parseFloat(np) > 2 ? '#ef4444' : '#64748b', fontWeight: 700 }}>{np}%</td>
                  </tr>
                );
              })}
              <tr className="total-row" style={{ background: '#334155', color: '#fff', fontWeight: 700 }}>
                <td style={{ padding: '5px 4px' }} colSpan={4}>TOTAL</td>
                <td style={{ padding: '5px 4px', textAlign: 'center' }}>{tp}</td>
                <td style={{ padding: '5px 4px', textAlign: 'center' }}>{totals.good_qty}</td>
                <td style={{ padding: '5px 4px', textAlign: 'center' }}>{totals.rework_qty}</td>
                <td style={{ padding: '5px 4px', textAlign: 'center' }}>{totals.scrap_qty}</td>
                <td style={{ padding: '5px 4px', textAlign: 'center' }}>{totals.rework_good}</td>
                <td style={{ padding: '5px 4px', textAlign: 'center' }}>{totals.rework_scrap}</td>
                <td style={{ padding: '5px 4px', textAlign: 'center' }}>{goodPct}%</td>
                <td style={{ padding: '5px 4px', textAlign: 'center' }}>{ngPct}%</td>
              </tr>
            </tbody>
          </table>

          {/* Defect Details */}
          {defects.length > 0 && (<>
            <div className="section-title" style={{ fontSize: 13, fontWeight: 700, borderBottom: '2px solid #1e293b', padding: '4px 0', marginBottom: 8 }}>
              DEFECT DETAILS ({defects.length} items)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9, marginBottom: 16 }}>
              <thead>
                <tr style={{ background: '#334155', color: '#fff' }}>
                  {['#','Line','Part','Bin No.','Defect','Problem','Type','Found','Good','NG','Meas.','Spec','Result'].map(h =>
                    <th key={h} style={{ padding: '4px 3px', fontSize: 8 }}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {defects.map((d, i) => (
                  <tr key={i} style={{ background: i%2===0 ? '#f8fafc' : '#fff' }}>
                    <td style={{ padding: '2px 3px', textAlign: 'center', color: '#94a3b8' }}>{i+1}</td>
                    <td style={{ padding: '2px 3px' }}>{d.line_no}</td>
                    <td style={{ padding: '2px 3px' }}>{d.part_number}</td>
                    <td style={{ padding: '2px 3px', fontWeight: 600 }}>{d.bin_no||'—'}</td>
                    <td style={{ padding: '2px 3px' }}>{d.defect_code||'—'}</td>
                    <td style={{ padding: '2px 3px' }}>{(d.defect_name||d.defect_detail||'—').substring(0,20)}</td>
                    <td style={{ padding: '2px 3px', textAlign: 'center', fontWeight: 600,
                      color: d.defect_type==='scrap' ? '#ef4444' : '#d97706' }}>
                      {d.defect_type==='scrap' ? 'Scrap' : 'Rework'}
                    </td>
                    <td style={{ padding: '2px 3px', textAlign: 'center' }}>{d.found_qty||'—'}</td>
                    <td style={{ padding: '2px 3px', textAlign: 'center', color: '#10b981' }}>{d.sorted_good||'—'}</td>
                    <td style={{ padding: '2px 3px', textAlign: 'center', color: '#ef4444' }}>{d.sorted_reject||'—'}</td>
                    <td style={{ padding: '2px 3px', textAlign: 'center' }}>{d.measurement||'—'}</td>
                    <td style={{ padding: '2px 3px' }}>{(d.spec_value||'—').substring(0,14)}</td>
                    <td style={{ padding: '2px 3px', textAlign: 'center',
                      color: d.rework_result==='good'?'#10b981':d.rework_result==='scrap'?'#ef4444':'#94a3b8' }}>
                      {d.rework_result==='good'?'✅':d.rework_result==='scrap'?'❌':d.rework_result==='pending'?'⏳':'—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>)}

          {/* Signatures */}
          <div className="signatures" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, pageBreakInside: 'avoid' }}>
            {[{ name: 'Prepared by', role: '(Operator)' },{ name: 'Checked by', role: '(QC Inspector)' },{ name: 'Approved by', role: '(QC Manager)' }].map((sig, i) => (
              <div key={i} className="sig-box" style={{ textAlign: 'center', width: '30%' }}>
                <div className="sig-line" style={{ borderTop: '1px solid #1e293b', marginTop: 50, paddingTop: 6, fontSize: 11 }}>
                  {sig.name}: _______________
                </div>
                <div className="sig-role" style={{ fontSize: 10, color: '#64748b' }}>{sig.role}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default KPIReport;