/**
 * KPIOverviewCards.js
 * ===================
 * KPI Cards — คลิกดูรายละเอียดได้
 * - External Claims (PPM) → คลิกดู claims summary
 * - Internal Quality (%) → คลิกดู rework/scrap by part + defect codes
 */

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../utils/api';
import {
  getKpiStatus as _getKpiStatus,
  DISPOSITION_TYPES as _DISPOSITION_TYPES,
  ESCALATION_RULES as _ESCALATION_RULES,
} from './product_categories';

const getKpiStatus = _getKpiStatus || ((actual, target) => {
  const ratio = actual / target;
  if (ratio <= 1.0) return { status: 'onTarget', label: 'On Target', color: '#10b981' };
  if (ratio <= 1.3) return { status: 'atRisk', label: 'At Risk', color: '#f59e0b' };
  return { status: 'overTarget', label: 'Over Target', color: '#ef4444' };
});
const DISPOSITION_TYPES = _DISPOSITION_TYPES || {
  GOOD:    { id: 'GOOD', label: 'ผ่าน (Good)', color: '#10b981' },
  REWORK:  { id: 'REWORK', label: 'ซ่อม (Rework)', color: '#f59e0b' },
  SCRAP:   { id: 'SCRAP', label: 'ทิ้ง (Scrap)', color: '#ef4444' },
  HOLD:    { id: 'HOLD', label: 'กัก (Hold)', color: '#6366f1' },
};
const ESCALATION_RULES = _ESCALATION_RULES || {
  level1: { level: 1, label: 'Line Leader', triggerScrap: 1, triggerReworkPctPerHr: 0.30, responseMinutes: 5, color: '#f59e0b', actions: ['หยุดเครื่อง', 'ตรวจสอบเบื้องต้น'] },
  level2: { level: 2, label: 'Supervisor', triggerScrap: 3, triggerReworkPctPerHr: 0.50, responseMinutes: 15, color: '#f97316', actions: ['วิเคราะห์สาเหตุ', 'แจ้ง Maintenance'] },
  level3: { level: 3, label: 'QC Manager', triggerScrap: 5, triggerReworkPctPerHr: 1.00, responseMinutes: 30, triggerLineStopMinutes: 30, color: '#ef4444', actions: ['ประชุมฉุกเฉิน', 'Controlled Shipping'] },
};

const DS = {
  panel: { background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b', marginTop: 16 },
  panelHead: { padding: '10px 16px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#e2e8f0', fontSize: 13, fontWeight: 700, margin: 0 },
  close: { padding: '4px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', fontSize: 11 },
  tag: (c) => ({ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: `${c}20`, color: c, display: 'inline-block' }),
};

// ═══════════════════════════════════════════════════════════════
// TOP 5 CHARTS — SVG Horizontal Bar Charts + Click Detail
// ═══════════════════════════════════════════════════════════════

const BAR_H = 28, BAR_GAP = 6, CHART_W = 100; // % based

const HBarChart = ({ data, maxVal, color, label, onBarClick, selectedIdx }) => {
  if (!data.length) return <div style={{ color: '#475569', fontSize: 12, padding: 20, textAlign: 'center' }}>ไม่มีข้อมูล</div>;
  const mx = maxVal || Math.max(...data.map(d => d.value), 1);
  const svgH = data.length * (BAR_H + BAR_GAP) + 10;

  return (
    <svg width="100%" height={svgH} viewBox={`0 0 500 ${svgH}`} style={{ display: 'block' }}>
      {data.map((d, i) => {
        const y = i * (BAR_H + BAR_GAP) + 4;
        const barW = Math.max((d.value / mx) * 320, 4);
        const isSelected = selectedIdx === i;
        return (
          <g key={i} style={{ cursor: 'pointer' }} onClick={() => onBarClick?.(i, d)}>
            {/* Label */}
            <text x={0} y={y + BAR_H / 2 + 1} fill={isSelected ? '#e2e8f0' : '#94a3b8'} fontSize={10}
              fontWeight={isSelected ? 700 : 400} dominantBaseline="middle">
              {d.label.length > 18 ? d.label.slice(0, 18) + '…' : d.label}
            </text>
            {/* Bar background */}
            <rect x={150} y={y} width={320} height={BAR_H} rx={4} fill="#1e293b" />
            {/* Bar fill */}
            <rect x={150} y={y + 1} width={barW} height={BAR_H - 2} rx={3}
              fill={isSelected ? color : `${color}cc`}
              style={{ transition: 'width 0.4s ease' }} />
            {isSelected && <rect x={150} y={y} width={barW} height={BAR_H} rx={4} fill="none" stroke={color} strokeWidth={1.5} />}
            {/* Value */}
            <text x={150 + barW + 6} y={y + BAR_H / 2 + 1} fill={color} fontSize={11}
              fontWeight={700} dominantBaseline="middle">
              {d.value.toLocaleString()}
            </text>
            {/* Percentage */}
            {d.pct !== undefined && (
              <text x={490} y={y + BAR_H / 2 + 1} fill="#64748b" fontSize={9}
                fontWeight={400} dominantBaseline="middle" textAnchor="end">
                {d.pct}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

const TopChartsSection = ({ detail, defects, lineSummary = [] }) => {
  const [selectedChart, setSelectedChart] = useState(null); // { chart, idx, data }

  // ── Aggregate Top 5 Part: แยก rework / scrap ─────────────────
  const partMap = {};
  detail.forEach(d => {
    const key = d.part_number;
    if (!partMap[key]) partMap[key] = { part: key, name: d.part_name || '', rework: 0, scrap: 0, total: Number(d.total_produced) || 0, lines: new Set(), lots: new Set() };
    partMap[key].rework += Number(d.rework_qty) || 0;
    partMap[key].scrap += Number(d.scrap_qty) || 0;
    if (d.line_no) partMap[key].lines.add(d.line_no);
    if (d.lot_number) partMap[key].lots.add(d.lot_number);
  });
  const partList = Object.values(partMap);
  const topPartRework = [...partList].filter(p => p.rework > 0).sort((a, b) => b.rework - a.rework).slice(0, 5);
  const topPartScrap = [...partList].filter(p => p.scrap > 0).sort((a, b) => b.scrap - a.scrap).slice(0, 5);

  // ── Aggregate Top 5 Defect Code: แยก rework / scrap ──────────
  const reworkDefects = defects.filter(d => d.defect_type === 'rework').sort((a, b) => Number(b.total_qty) - Number(a.total_qty)).slice(0, 5);
  const scrapDefects = defects.filter(d => d.defect_type === 'scrap').sort((a, b) => Number(b.total_qty) - Number(a.total_qty)).slice(0, 5);

  const charts = [
    { id: 'partRework', title: '🔧 Top 5 Part — เสียซ่อม (Rework)', color: '#f59e0b',
      data: topPartRework.map(p => ({ label: `${p.part}`, value: p.rework, pct: p.total > 0 ? ((p.rework / p.total) * 100).toFixed(2) : '0', raw: p })) },
    { id: 'partScrap', title: '🗑️ Top 5 Part — เสียทิ้ง (Scrap)', color: '#ef4444',
      data: topPartScrap.map(p => ({ label: `${p.part}`, value: p.scrap, pct: p.total > 0 ? ((p.scrap / p.total) * 100).toFixed(2) : '0', raw: p })) },
    { id: 'defectRework', title: '🔧 Top 5 อาการเสีย — ซ่อม (Rework)', color: '#f59e0b',
      data: reworkDefects.map(d => ({ label: `${d.defect_code || ''} ${d.defect_name || ''}`.trim(), value: Number(d.total_qty), raw: d })) },
    { id: 'defectScrap', title: '🗑️ Top 5 อาการเสีย — ทิ้ง (Scrap)', color: '#ef4444',
      data: scrapDefects.map(d => ({ label: `${d.defect_code || ''} ${d.defect_name || ''}`.trim(), value: Number(d.total_qty), raw: d })) },
  ];

  const handleBarClick = (chartId, idx, d) => {
    if (selectedChart?.chart === chartId && selectedChart?.idx === idx) {
      setSelectedChart(null);
    } else {
      setSelectedChart({ chart: chartId, idx, data: d });
    }
  };

  // ── Detail panel for clicked bar ─────────────────────────────
  const renderDetailPanel = () => {
    if (!selectedChart) return null;
    const { chart, data: d } = selectedChart;
    const isPart = chart.startsWith('part');
    const isRework = chart.includes('Rework');
    const color = isRework ? '#f59e0b' : '#ef4444';
    const typeLabel = isRework ? 'เสียซ่อม (Rework)' : 'เสียทิ้ง (Scrap)';

    if (isPart) {
      const p = d.raw;
      const relatedDefects = defects.filter(df =>
        df.defect_type === (isRework ? 'rework' : 'scrap')
      );
      return (
        <div style={{ ...DS.panel, borderColor: `${color}40` }}>
          <div style={DS.panelHead}>
            <h3 style={DS.title}>{isRework ? '🔧' : '🗑️'} {p.part} — {p.name || 'ไม่ระบุชื่อ'}</h3>
            <button onClick={() => setSelectedChart(null)} style={DS.close}>✕ ปิด</button>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
              {[
                { label: '📦 ยอดผลิต', value: p.total.toLocaleString(), c: '#3b82f6' },
                { label: `${isRework ? '🔧' : '🗑️'} ${typeLabel}`, value: (isRework ? p.rework : p.scrap).toLocaleString(), c: color },
                { label: '% เสีย', value: p.total > 0 ? (((isRework ? p.rework : p.scrap) / p.total) * 100).toFixed(2) + '%' : '0%', c: color },
                { label: isRework ? '🗑️ Scrap ด้วย' : '🔧 Rework ด้วย', value: (isRework ? p.scrap : p.rework).toLocaleString(), c: '#64748b' },
              ].map((item, i) => (
                <div key={i} style={{ padding: 8, background: '#1e293b', borderRadius: 6, textAlign: 'center', borderLeft: `3px solid ${item.c}` }}>
                  <div style={{ color: '#64748b', fontSize: 9 }}>{item.label}</div>
                  <div style={{ color: item.c, fontSize: 15, fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <span style={{ color: '#64748b', fontSize: 10 }}>Lines:</span>
              {[...p.lines].map((l, i) => <span key={i} style={DS.tag('#8b5cf6')}>{l}</span>)}
              <span style={{ color: '#64748b', fontSize: 10, marginLeft: 8 }}>Lots:</span>
              {[...p.lots].map((l, i) => <span key={i} style={DS.tag('#f59e0b')}>{l}</span>)}
            </div>
            {relatedDefects.length > 0 && (
              <>
                <h4 style={{ color: '#94a3b8', fontSize: 11, margin: '8px 0 6px 0' }}>🔍 อาการเสียที่พบ ({typeLabel})</h4>
                {relatedDefects.map((df, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                    <span style={DS.tag(color)}>{df.defect_code || '—'}</span>
                    <span style={{ color: '#e2e8f0', fontSize: 11, flex: 1 }}>{df.defect_name || '—'}</span>
                    <span style={{ color, fontWeight: 700, fontSize: 12 }}>{Number(df.total_qty).toLocaleString()}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      );
    } else {
      // Defect code detail
      const df = d.raw;
      const catColor = df.category === 'process' ? '#f59e0b' : df.category === 'dimensional' ? '#3b82f6' : '#8b5cf6';
      // หา part ที่เกี่ยวข้อง
      const relatedParts = detail.filter(p => Number(isRework ? p.rework_qty : p.scrap_qty) > 0);

      return (
        <div style={{ ...DS.panel, borderColor: `${color}40` }}>
          <div style={DS.panelHead}>
            <h3 style={DS.title}>{isRework ? '🔧' : '🗑️'} {df.defect_code} — {df.defect_name}</h3>
            <button onClick={() => setSelectedChart(null)} style={DS.close}>✕ ปิด</button>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
              {[
                { label: `จำนวน ${typeLabel}`, value: Number(df.total_qty).toLocaleString(), c: color },
                { label: 'จำนวนครั้งที่พบ', value: `${df.count} ครั้ง`, c: '#e2e8f0' },
                { label: 'หมวดหมู่', value: df.category || '—', c: catColor },
              ].map((item, i) => (
                <div key={i} style={{ padding: 10, background: '#1e293b', borderRadius: 6, textAlign: 'center', borderLeft: `3px solid ${item.c}` }}>
                  <div style={{ color: '#64748b', fontSize: 9 }}>{item.label}</div>
                  <div style={{ color: item.c, fontSize: 15, fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>
            {relatedParts.length > 0 && (
              <>
                <h4 style={{ color: '#94a3b8', fontSize: 11, margin: '8px 0 6px 0' }}>📦 Part ที่พบ {typeLabel}</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      {['Part No.', 'Name', 'Line', 'ผลิต', isRework ? 'Rework' : 'Scrap', '%'].map(h =>
                        <th key={h} style={{ padding: 4, color: '#64748b', textAlign: 'left', fontSize: 10 }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {relatedParts.map((p, i) => {
                      const qty = Number(isRework ? p.rework_qty : p.scrap_qty);
                      const tot = Number(p.total_produced) || 0;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: 4, fontWeight: 600, color: '#3b82f6' }}>{p.part_number}</td>
                          <td style={{ padding: 4, color: '#e2e8f0', fontSize: 10, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.part_name || '—'}</td>
                          <td style={{ padding: 4 }}><span style={DS.tag('#8b5cf6')}>{p.line_no}</span></td>
                          <td style={{ padding: 4, color: '#94a3b8' }}>{tot.toLocaleString()}</td>
                          <td style={{ padding: 4, fontWeight: 700, color }}>{qty.toLocaleString()}</td>
                          <td style={{ padding: 4, color }}>{tot > 0 ? ((qty / tot) * 100).toFixed(2) : '0'}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      );
    }
  };

  // ── Line Summary: ใช้ line_summary จาก backend โดยตรง ─ ─
  const [lineMonth, setLineMonth] = useState(''); // '' = ตาม Dashboard, 'YYYY-MM' = เดือนที่เลือก
  const [lineData, setLineData] = useState(null); // null = ใช้ detail จาก props
  const [lineLoading, setLineLoading] = useState(false);

  const fetchLineData = useCallback(async (month) => {
    if (!month) { setLineData(null); return; }
    setLineLoading(true);
    try {
      const res = await apiClient.get('/kpi/values', { params: { dateRange: 'mtd', month } });
      const d = res?.data?.data || res?.data || {};
      setLineData(d.line_summary || []);
    } catch (err) {
      console.error('Line fetch error:', err);
      setLineData(null);
    }
    setLineLoading(false);
  }, []);

  useEffect(() => {
    if (lineMonth) fetchLineData(lineMonth);
    else setLineData(null);
  }, [lineMonth, fetchLineData]);

  const activeLineSummary = lineData || lineSummary;

  const lineList = activeLineSummary.map(r => ({
    line: r.line_no || 'ไม่ระบุ',
    total: Number(r.total_produced) || 0,
    rework: Number(r.rework_qty) || 0,
    scrap: Number(r.scrap_qty) || 0,
  })).sort((a, b) => (b.rework + b.scrap) - (a.rework + a.scrap));
  const lineGrandTotal = lineList.reduce((s, l) => s + l.total, 0);
  const lineGrandRework = lineList.reduce((s, l) => s + l.rework, 0);
  const lineGrandScrap = lineList.reduce((s, l) => s + l.scrap, 0);

  // สร้างตัวเลือกเดือน (12 เดือนล่าสุด)
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
    monthOptions.push({ val, label });
  }

  const lineMonthLabel = lineMonth
    ? new Date(lineMonth + '-01').toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })
    : 'ตาม Dashboard';

  return (
    <div>
      {/* ── สรุปแยก Line ─────────────────────────────────────── */}
      <div style={{ background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b', padding: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h4 style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            🏭 สรุปของเสียแยกตาม Line
            {lineMonth && <span style={{ fontSize: 10, fontWeight: 400, color: '#3b82f6' }}>📆 {lineMonthLabel}</span>}
            {lineLoading && <span style={{ fontSize: 10, color: '#f59e0b' }}>⏳ กำลังโหลด...</span>}
          </h4>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select
              value={lineMonth}
              onChange={e => setLineMonth(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 11, cursor: 'pointer' }}
            >
              <option value="">📊 ตาม Dashboard</option>
              {monthOptions.map(m => (
                <option key={m.val} value={m.val}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {lineList.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #334155' }}>
                {['Line', '📦 ยอดผลิต', '🔧 เสียซ่อม', '% ซ่อม', '🗑️ เสียทิ้ง', '% ทิ้ง', 'รวมเสีย', '% เสียรวม'].map(h =>
                  <th key={h} style={{ padding: '6px 8px', color: '#64748b', textAlign: h === 'Line' ? 'left' : 'right', fontSize: 10 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {lineList.map((l, i) => {
                const rwPct = l.total > 0 ? ((l.rework / l.total) * 100).toFixed(2) : '0.00';
                const scPct = l.total > 0 ? ((l.scrap / l.total) * 100).toFixed(2) : '0.00';
                const totalDefect = l.rework + l.scrap;
                const totalPct = l.total > 0 ? ((totalDefect / l.total) * 100).toFixed(2) : '0.00';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '6px 8px' }}><span style={DS.tag('#8b5cf6')}>{l.line}</span></td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#e2e8f0', fontWeight: 600 }}>{l.total.toLocaleString()}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#f59e0b', fontWeight: 700 }}>{l.rework.toLocaleString()}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: parseFloat(rwPct) > 0.4 ? '#ef4444' : '#f59e0b', fontSize: 10 }}>{rwPct}%</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>{l.scrap.toLocaleString()}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: parseFloat(scPct) > 0.3 ? '#ef4444' : '#f59e0b', fontSize: 10 }}>{scPct}%</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#e2e8f0', fontWeight: 700 }}>{totalDefect.toLocaleString()}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700,
                      color: parseFloat(totalPct) > 0.5 ? '#ef4444' : parseFloat(totalPct) > 0.3 ? '#f59e0b' : '#10b981' }}>{totalPct}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #334155', background: '#1e293b' }}>
                <td style={{ padding: '8px', fontWeight: 700, color: '#e2e8f0' }}>รวมทั้งหมด</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#e2e8f0', fontWeight: 700 }}>{lineGrandTotal.toLocaleString()}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#f59e0b', fontWeight: 700 }}>{lineGrandRework.toLocaleString()}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#f59e0b', fontWeight: 700 }}>{lineGrandTotal > 0 ? ((lineGrandRework / lineGrandTotal) * 100).toFixed(2) : '0.00'}%</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>{lineGrandScrap.toLocaleString()}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>{lineGrandTotal > 0 ? ((lineGrandScrap / lineGrandTotal) * 100).toFixed(2) : '0.00'}%</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#e2e8f0', fontWeight: 700 }}>{(lineGrandRework + lineGrandScrap).toLocaleString()}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: '#e2e8f0', fontWeight: 700 }}>{lineGrandTotal > 0 ? (((lineGrandRework + lineGrandScrap) / lineGrandTotal) * 100).toFixed(2) : '0.00'}%</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <div style={{ color: '#475569', fontSize: 12, padding: 20, textAlign: 'center' }}>
            {lineLoading ? '⏳ กำลังโหลดข้อมูล...' : 'ไม่มีข้อมูลของเสียในช่วงที่เลือก'}
          </div>
        )}
        </div>

      {/* 2x2 Grid of charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {charts.map(chart => (
          <div key={chart.id} style={{ background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b', padding: 12 }}>
            <h4 style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700, margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              {chart.title}
              <span style={{ ...DS.tag(chart.color), fontSize: 9 }}>{chart.data.reduce((s, d) => s + d.value, 0).toLocaleString()} ชิ้น</span>
            </h4>
            <HBarChart
              data={chart.data}
              color={chart.color}
              onBarClick={(idx, d) => handleBarClick(chart.id, idx, d)}
              selectedIdx={selectedChart?.chart === chart.id ? selectedChart.idx : -1}
            />
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {renderDetailPanel()}
    </div>
  );
};

const KPIOverviewCards = ({
  kpiValues, summary, claimTargets, internalTargets,
  recentEntries, andonAlerts,
  detail = [], defects = [], claimsData = {}, internalData = {}, lineSummary = [],
  periodLabel = '',
}) => {
  const [selectedCard, setSelectedCard] = useState(null);

  const handleCardClick = (type, key, config) => {
    setSelectedCard(selectedCard?.key === key ? null : { type, key, config });
  };

  // ─── Render KPI Card (Clickable) ─────────────────────────────
  const renderKpiCard = (config, actualValue, type, key) => {
    const status = getKpiStatus(actualValue, config.target, config.unit);
    const ratio = Math.min((actualValue / config.target) * 100, 150);
    const isSelected = selectedCard?.key === key;

    return (
      <div className={`kpi-card kpi-card--${status.status}`} key={config.id}
        onClick={() => handleCardClick(type, key, config)}
        style={{ cursor: 'pointer', outline: isSelected ? `2px solid ${status.color}` : 'none', transition: 'all 0.2s' }}>
        <div className="kpi-card__top-bar" style={{ background: status.color }}></div>
        <div className="kpi-card__header">
          <div>
            <span className="kpi-card__icon">{config.icon}</span>
            <span className="kpi-card__label">{config.label}</span>
          </div>
          <span className="kpi-card__status-badge"
            style={{ background: `${status.color}18`, color: status.color, borderColor: `${status.color}40` }}>
            {status.label}
          </span>
        </div>
        <div className="kpi-card__value">
          <span className="kpi-card__number">{actualValue}</span>
          <span className="kpi-card__unit">{config.unit}</span>
        </div>
        <div className="kpi-card__target">
          Target: &lt; {config.target} {config.unit} · {config.strategy}
        </div>
        <div className="kpi-card__progress">
          <div className="kpi-card__progress-fill"
            style={{ width: `${Math.min(ratio, 100)}%`,
              background: ratio > 100 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : `linear-gradient(90deg, ${status.color}, ${status.color}cc)` }}></div>
          {ratio > 100 && <div className="kpi-card__progress-over" style={{ width: `${Math.min(ratio - 100, 50)}%` }}></div>}
        </div>
        <div style={{ textAlign: 'center', marginTop: 6, fontSize: 10, color: isSelected ? status.color : '#475569' }}>
          {isSelected ? '▲ คลิกเพื่อปิด' : '👆 คลิกดูรายละเอียด'}
        </div>
      </div>
    );
  };

  // ─── Detail: Internal ────────────────────────────────────────
  const renderInternalDetail = () => {
    if (!selectedCard || selectedCard.type !== 'internal') return null;
    const key = selectedCard.key;
    const isRework = key.includes('Rework');
    const isMachining = key.includes('machining');
    const filteredDetail = isMachining
      ? detail.filter(d => d.line_no && (d.line_no.includes('MC') || d.line_no.includes('CNC')))
      : detail;
    const filteredDefects = defects.filter(d => isRework ? d.defect_type === 'rework' : d.defect_type === 'scrap');
    const dataKey = isRework ? 'rework_qty' : 'scrap_qty';
    const pctKey = isRework ? 'rework_pct' : 'scrap_pct';
    const color = isRework ? '#f59e0b' : '#ef4444';
    const dataInfo = isRework
      ? (isMachining ? internalData.machiningRework : internalData.productionRework)
      : internalData.productionScrap;
    const cnt = dataInfo?.count || 0;
    const tot = dataInfo?.total || 0;

    return (
      <div style={DS.panel}>
        <div style={DS.panelHead}>
          <h3 style={DS.title}>{selectedCard.config.icon} {selectedCard.config.label} — รายละเอียด</h3>
          <button onClick={() => setSelectedCard(null)} style={DS.close}>✕ ปิด</button>
        </div>
        <div style={{ padding: 16 }}>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: '📦 ยอดผลิต (Prod Log)', value: tot, c: '#3b82f6' },
              { label: isRework ? '🔧 Rework' : '🗑️ Scrap', value: cnt, c: color },
              { label: isRework ? '% เสียซ่อม' : '% เสียทิ้ง', value: tot > 0 ? ((cnt / tot) * 100).toFixed(2) + '%' : '0%', c: color },
              { label: 'สูตร', value: `${cnt.toLocaleString()} ÷ ${tot.toLocaleString()}`, c: '#64748b', small: true },
              { label: 'Target', value: `< ${selectedCard.config.target}%`, c: '#10b981' },
            ].map((item, i) => (
              <div key={i} style={{ padding: 10, background: '#1e293b', borderRadius: 6, textAlign: 'center', borderLeft: `3px solid ${item.c}` }}>
                <div style={{ color: '#64748b', fontSize: 10 }}>{item.label}</div>
                <div style={{ color: item.c, fontSize: item.small ? 11 : 16, fontWeight: 700 }}>
                  {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* By Part */}
            <div>
              <h4 style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 8px 0' }}>📊 แยกตาม Part</h4>
              {filteredDetail.filter(d => Number(d[dataKey]) > 0).length === 0 ? (
                <div style={{ color: '#475569', fontSize: 12, padding: 16, textAlign: 'center' }}>ไม่มีข้อมูล</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      {['Part No.', 'Name', 'Lot', 'Line', 'ผลิต', isRework ? 'Rework' : 'Scrap', '%'].map(h =>
                        <th key={h} style={{ padding: '5px', color: '#64748b', textAlign: 'left', fontSize: 10 }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDetail.filter(d => Number(d[dataKey]) > 0).map((d, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '5px', fontWeight: 600, color: '#3b82f6' }}>{d.part_number}</td>
                        <td style={{ padding: '5px', color: '#e2e8f0', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.part_name || '—'}</td>
                        <td style={{ padding: '5px', color: '#f59e0b', fontSize: 10 }}>{d.lot_number || '—'}</td>
                        <td style={{ padding: '5px' }}><span style={DS.tag('#3b82f6')}>{d.line_no}</span></td>
                        <td style={{ padding: '5px', color: '#94a3b8' }}>{Number(d.total_produced).toLocaleString()}</td>
                        <td style={{ padding: '5px', fontWeight: 700, color }}>{Number(d[dataKey]).toLocaleString()}</td>
                        <td style={{ padding: '5px', color }}>{d[pctKey]}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {/* By Defect Code */}
            <div>
              <h4 style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 8px 0' }}>🔍 Defect Codes</h4>
              {filteredDefects.length === 0 ? (
                <div style={{ color: '#475569', fontSize: 12, padding: 16, textAlign: 'center' }}>ไม่มีข้อมูล</div>
              ) : filteredDefects.map((d, i) => {
                const catColor = d.category === 'process' ? '#f59e0b' : d.category === 'dimensional' ? '#3b82f6' : '#8b5cf6';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid #1e293b' }}>
                    <span style={DS.tag(catColor)}>{d.category || '—'}</span>
                    <span style={{ color: '#e2e8f0', fontSize: 11, flex: 1 }}>{d.defect_code} {d.defect_name}</span>
                    <span style={{ color, fontWeight: 700, fontSize: 12 }}>{Number(d.total_qty).toLocaleString()}</span>
                    <span style={{ color: '#64748b', fontSize: 9 }}>({d.count}x)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Detail: Claims ──────────────────────────────────────────
  const renderClaimDetail = () => {
    if (!selectedCard || selectedCard.type !== 'claim') return null;
    const data = claimsData[selectedCard.key] || { actual: 0, shipped: 0 };
    const ppm = data.shipped > 0 ? Math.round((data.actual / data.shipped) * 1000000) : 0;

    return (
      <div style={DS.panel}>
        <div style={DS.panelHead}>
          <h3 style={DS.title}>{selectedCard.config.icon} {selectedCard.config.label} — Claims</h3>
          <button onClick={() => setSelectedCard(null)} style={DS.close}>✕ ปิด</button>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Defect Qty', value: data.actual, c: '#ef4444' },
              { label: 'Shipped Qty', value: data.shipped, c: '#3b82f6' },
              { label: 'PPM', value: ppm, c: '#f59e0b' },
              { label: 'Target', value: `< ${selectedCard.config.target}`, c: '#10b981' },
            ].map((item, i) => (
              <div key={i} style={{ padding: 12, background: '#1e293b', borderRadius: 6, textAlign: 'center', borderLeft: `3px solid ${item.c}` }}>
                <div style={{ color: '#64748b', fontSize: 10 }}>{item.label}</div>
                <div style={{ color: item.c, fontSize: 18, fontWeight: 700 }}>
                  {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                </div>
              </div>
            ))}
          </div>
          <div style={{ color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 12 }}>
            💡 ดูรายละเอียด Claim ทั้งหมดที่ tab 📮 Claim
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="kpi-overview">
      {/* Period Label */}
      {periodLabel && (
        <div style={{ padding: '8px 16px', marginBottom: 8, background: '#1e293b', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📆</span>
          <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700 }}>{periodLabel}</span>
        </div>
      )}

      {/* Summary Strip */}
      <div className="kpi-summary-strip">
        {[
          { label: '📦 ยอดผลิต (Production Log)', value: summary.totalProduced, unit: 'ชิ้น', cls: '' },
          { label: '✅ งานดี (Good)', value: summary.totalGood, unit: 'ชิ้น', cls: 'kpi-summary-value--good' },
          { label: '🔧 เสียซ่อม (Rework)', value: summary.totalRework, unit: 'ชิ้น', cls: 'kpi-summary-value--rework' },
          { label: '🗑️ เสียทิ้ง (Scrap)', value: summary.totalScrap, unit: 'ชิ้น', cls: 'kpi-summary-value--scrap' },
          { label: '% เสียซ่อม', value: summary.totalProduced > 0 ? ((summary.totalRework / summary.totalProduced) * 100).toFixed(2) : '0.00', unit: '%', cls: 'kpi-summary-value--rework' },
          { label: '% เสียทิ้ง', value: summary.totalProduced > 0 ? ((summary.totalScrap / summary.totalProduced) * 100).toFixed(2) : '0.00', unit: '%', cls: 'kpi-summary-value--scrap' },
          { label: 'FPY', value: summary.firstPassYield, unit: '%', cls: 'kpi-summary-value--good' },
        ].map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="kpi-summary-divider"></div>}
            <div className="kpi-summary-item">
              <span className="kpi-summary-label">{item.label}</span>
              <span className={`kpi-summary-value ${item.cls}`}>
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </span>
              {item.unit === '%' && <span className="kpi-summary-unit">%</span>}
              {item.unit !== '%' && <span className="kpi-summary-unit">{item.unit}</span>}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Data Source Info */}
      <div style={{ padding: '6px 16px', background: '#0f172a', borderRadius: 6, marginBottom: 12, display: 'flex', gap: 16, fontSize: 10, color: '#64748b' }}>
        <span>📦 ยอดผลิต: <strong style={{ color: '#3b82f6' }}>Production Log (ฝ่ายผลิต)</strong></span>
        <span>🔍 ของเสีย: <strong style={{ color: '#f59e0b' }}>F07 / Data Entry (QC)</strong></span>
        <span>📐 % เสียซ่อม = จำนวนเสียซ่อม ÷ ยอดผลิต × 100</span>
        <span>📐 % เสียทิ้ง = จำนวนเสียทิ้ง ÷ ยอดผลิต × 100</span>
      </div>

      {/* External Claims (PPM) */}
      <div className="kpi-section">
        <div className="kpi-section__header">
          <h2 className="kpi-section__title">
            <span className="kpi-section__dot" style={{ background: '#3b82f6' }}></span>
            External Customer Claims (PPM)
          </h2>
          <span className="kpi-section__subtitle">👆 คลิกการ์ดเพื่อดูรายละเอียด</span>
        </div>
        <div className="kpi-cards-grid kpi-cards-grid--3">
          {Object.entries(claimTargets).map(([key, config]) =>
            renderKpiCard(config, kpiValues.claims[key], 'claim', key)
          )}
        </div>
        {renderClaimDetail()}
      </div>

      {/* Internal Quality (%) */}
      <div className="kpi-section">
        <div className="kpi-section__header">
          <h2 className="kpi-section__title">
            <span className="kpi-section__dot" style={{ background: '#a78bfa' }}></span>
            Internal Quality Metrics (%)
          </h2>
          <span className="kpi-section__subtitle">👆 คลิกการ์ดดู Rework / Scrap แยกตาม Part + Defect Code</span>
        </div>
        <div className="kpi-cards-grid kpi-cards-grid--3">
          {Object.entries(internalTargets).map(([key, config]) =>
            renderKpiCard(config, kpiValues.internal[key], 'internal', key)
          )}
        </div>
        {renderInternalDetail()}
      </div>

      {/* ═══ Charts: Part เสีย + อาการเสีย (แยก Rework / Scrap) ═══ */}
      <div className="kpi-section">
        <div className="kpi-section__header">
          <h2 className="kpi-section__title">
            <span className="kpi-section__dot" style={{ background: '#f59e0b' }}></span>
            Top 5 — Part ที่เสียมากสุด + อาการเสียหลัก
          </h2>
          <span className="kpi-section__subtitle">👆 คลิกแท่งกราฟเพื่อดูรายละเอียด</span>
        </div>
        <TopChartsSection detail={detail} defects={defects} lineSummary={lineSummary} />
      </div>

      {/* Bottom Row */}
      <div className="kpi-bottom-grid">
        <div className="kpi-panel">
          <div className="kpi-panel__header">
            <h3 className="kpi-panel__title">📋 รายการล่าสุด (Real-time)</h3>
          </div>
          <div className="kpi-panel__body">
            <table className="kpi-table">
              <thead><tr><th>เวลา</th><th>เครื่อง</th><th>ชิ้นงาน</th><th>ผลตรวจ</th><th>ข้อบกพร่อง</th><th>ผู้ตรวจ</th></tr></thead>
              <tbody>
                {recentEntries.map(entry => {
                  const disp = DISPOSITION_TYPES[entry.disposition] || DISPOSITION_TYPES.GOOD;
                  return (
                    <tr key={entry.id} className={entry.disposition === 'SCRAP' ? 'kpi-table__row--alert' : ''}>
                      <td className="kpi-table__mono">{entry.time}</td>
                      <td className="kpi-table__mono">{entry.machine}</td>
                      <td className="kpi-table__mono">{entry.part}</td>
                      <td><span className="kpi-table__badge" style={{ background: `${disp.color}18`, color: disp.color, borderColor: `${disp.color}40` }}>{disp.label}</span></td>
                      <td>{entry.defect || '—'}</td>
                      <td>{entry.operator}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="kpi-panel">
          <div className="kpi-panel__header">
            <h3 className="kpi-panel__title">🚨 Escalation Matrix</h3>
          </div>
          <div className="kpi-panel__body">
            {Object.values(ESCALATION_RULES).map(rule => (
              <div className="kpi-escalation-item" key={rule.level} style={{ borderLeftColor: rule.color }}>
                <div className="kpi-escalation-item__header">
                  <strong>Level {rule.level} — {rule.label}</strong>
                  <span className="kpi-escalation-item__time">Response: &lt; {rule.responseMinutes} min</span>
                </div>
                <div className="kpi-escalation-item__trigger">
                  {rule.triggerScrap} NG ติดกัน หรือ Rework &gt; {rule.triggerReworkPctPerHr}%/hr
                  {rule.triggerLineStopMinutes && ` หรือ Line Stop > ${rule.triggerLineStopMinutes} min`}
                </div>
                <div className="kpi-escalation-item__actions">
                  {rule.actions.map((action, i) => (
                    <span key={i} className="kpi-escalation-item__action-tag">{action}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPIOverviewCards;