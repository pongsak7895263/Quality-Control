/**
 * KPIMonthlySummary.js
 * ======================
 * ระบบสรุป KPI รายเดือนอัตโนมัติ
 * - ดูสรุปย้อนหลัง (ตาราง + กราฟ trend)
 * - กดสร้าง/อัพเดตสรุปเดือนที่เลือก
 * - Auto-close เดือนก่อนหน้า
 */
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../utils/api';

const S = {
  card: (c) => ({
    padding: 12, background: '#0f172a', borderRadius: 8,
    border: '1px solid #1e293b', borderLeft: `3px solid ${c}`, textAlign: 'center',
  }),
  cardLabel: { color: '#64748b', fontSize: 12, marginBottom: 4 },
  cardValue: (c) => ({ color: c, fontSize: 22, fontWeight: 700 }),
  cardSub: { color: '#475569', fontSize: 11, marginTop: 2 },
  tag: (c) => ({ padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: `${c}20`, color: c, display: 'inline-block' }),
  btn: (bg, hover) => ({
    padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 14, color: '#fff', background: bg,
  }),
};

const KPIMonthlySummary = () => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [toast, setToast] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [detailData, setDetailData] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const fetchSummaries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/kpi/monthly-summary');
      setSummaries(res?.data?.data || []);
    } catch (err) {
      console.error('Fetch summaries error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

  // ── Generate สรุปเดือน ─────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.post('/kpi/monthly-summary/generate', {
        year: selectedYear, month: selectedMonth,
      });
      const msg = res?.data?.message || 'สำเร็จ';
      showToast(`✅ ${msg}`);
      fetchSummaries();
    } catch (err) {
      showToast(`❌ ${err?.response?.data?.error || err.message}`);
    }
    setGenerating(false);
  };

  // ── Auto-close เดือนก่อน ───────────────────────────────────
  const handleAutoClose = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.post('/kpi/monthly-summary/auto-close');
      const d = res?.data;
      if (d?.skipped) {
        showToast(`ℹ️ ${d.message}`);
      } else {
        showToast(`✅ ${d?.message || 'Auto-close สำเร็จ'}`);
      }
      fetchSummaries();
    } catch (err) {
      showToast(`❌ ${err?.response?.data?.error || err.message}`);
    }
    setGenerating(false);
  };

  // ── Expand row → fetch detail ──────────────────────────────
  const handleExpand = async (row) => {
    if (expandedId === row.id) { setExpandedId(null); setDetailData(null); return; }
    setExpandedId(row.id);
    try {
      const res = await apiClient.get(`/kpi/monthly-summary/${row.summary_year}/${row.summary_month}`);
      setDetailData(res?.data?.data || null);
    } catch { setDetailData(null); }
  };

  // ── สร้างตัวเลือกเดือน ─────────────────────────────────────
  const years = [];
  for (let y = new Date().getFullYear(); y >= 2024; y--) years.push(y);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleDateString('th-TH', { month: 'long' }),
  }));

  // ── SVG Trend Chart ────────────────────────────────────────
  const trendData = [...summaries].reverse().slice(-12);
  const maxProd = Math.max(...trendData.map(d => Number(d.total_produced) || 0), 1);

  const formatPct = (v) => v !== null && v !== undefined ? Number(v).toFixed(2) + '%' : '—';
  const formatNum = (v) => v !== null && v !== undefined ? Number(v).toLocaleString() : '—';

  return (
    <div style={{ padding: 16 }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, padding: '12px 20px',
          borderRadius: 8, background: toast.startsWith('❌') ? '#dc2626' : '#059669',
          color: '#fff', fontSize: 15, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 12px #00000040' }}>
          {toast}
        </div>
      )}

      {/* ── Header + Controls ─────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700, margin: 0 }}>
          📅 สรุป KPI รายเดือน (Monthly Summary)
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 14 }}>
            {years.map(y => <option key={y} value={y}>{y + 543} ({y})</option>)}
          </select>
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 14 }}>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <button onClick={handleGenerate} disabled={generating} style={S.btn('#3b82f6')}>
            {generating ? '⏳ กำลังสร้าง...' : '📊 สร้างสรุปเดือน'}
          </button>
          <button onClick={handleAutoClose} disabled={generating} style={S.btn('#8b5cf6')}>
            🔄 Auto-Close เดือนก่อน
          </button>
          <button onClick={fetchSummaries} style={S.btn('#334155')}>🔄</button>
        </div>
      </div>

      {/* ── Trend Chart (SVG) ─────────────────────────────────── */}
      {trendData.length > 1 && (
        <div style={{ background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b', padding: 16, marginBottom: 16 }}>
          <h4 style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 700, margin: '0 0 12px 0' }}>
            📈 แนวโน้ม KPI รายเดือน ({trendData.length} เดือน)
          </h4>
          <svg width="100%" height={200} viewBox={`0 0 ${trendData.length * 80 + 40} 200`}>
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(pct => (
              <line key={pct} x1={30} y1={180 - pct * 1.6} x2={trendData.length * 80 + 20} y2={180 - pct * 1.6}
                stroke="#1e293b" strokeWidth={1} />
            ))}
            {/* Production bars */}
            {trendData.map((d, i) => {
              const x = i * 80 + 40;
              const barH = (Number(d.total_produced) / maxProd) * 140;
              const reworkPct = Number(d.rework_pct) || 0;
              const scrapPct = Number(d.scrap_pct) || 0;
              return (
                <g key={i}>
                  {/* Production bar */}
                  <rect x={x} y={180 - barH} width={30} height={barH} rx={3} fill="#3b82f630" stroke="#3b82f6" strokeWidth={0.5} />
                  {/* Rework dot */}
                  <circle cx={x + 50} cy={180 - reworkPct * 80} r={4} fill="#f59e0b" />
                  {/* Scrap dot */}
                  <circle cx={x + 60} cy={180 - scrapPct * 80} r={4} fill="#ef4444" />
                  {/* Connect lines */}
                  {i > 0 && (
                    <>
                      <line x1={(i - 1) * 80 + 90} y1={180 - (Number(trendData[i - 1].rework_pct) || 0) * 80}
                        x2={x + 50} y2={180 - reworkPct * 80} stroke="#f59e0b" strokeWidth={1.5} />
                      <line x1={(i - 1) * 80 + 100} y1={180 - (Number(trendData[i - 1].scrap_pct) || 0) * 80}
                        x2={x + 60} y2={180 - scrapPct * 80} stroke="#ef4444" strokeWidth={1.5} />
                    </>
                  )}
                  {/* Label */}
                  <text x={x + 15} y={195} fill="#64748b" fontSize={9} textAnchor="middle">
                    {d.summary_month}/{String(d.summary_year).slice(2)}
                  </text>
                </g>
              );
            })}
            {/* Legend */}
            <rect x={30} y={4} width={10} height={10} fill="#3b82f630" stroke="#3b82f6" strokeWidth={0.5} rx={2} />
            <text x={44} y={13} fill="#64748b" fontSize={9}>ยอดผลิต</text>
            <circle cx={105} cy={9} r={4} fill="#f59e0b" />
            <text x={113} y={13} fill="#64748b" fontSize={9}>% ซ่อม</text>
            <circle cx={160} cy={9} r={4} fill="#ef4444" />
            <text x={168} y={13} fill="#64748b" fontSize={9}>% ทิ้ง</text>
          </svg>
        </div>
      )}

      {/* ── Summary Table ──────────────────────────────────────── */}
      <div style={{ background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #334155', background: '#1e293b' }}>
              {['', 'เดือน', '📦 ยอดผลิต', '✅ งานดี', '🔧 Rework', '% ซ่อม', '🗑️ Scrap', '% ทิ้ง', '🏆 FPY',
                'Auto PPM', 'Ind PPM', 'MC PPM', 'อัพเดต'].map(h =>
                <th key={h} style={{ padding: '8px 6px', color: '#64748b', textAlign: h === 'เดือน' || h === '' ? 'left' : 'right', fontSize: 12 }}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={13} style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>⏳ กำลังโหลด...</td></tr>
            ) : summaries.length === 0 ? (
              <tr><td colSpan={13} style={{ padding: 30, textAlign: 'center', color: '#475569' }}>ยังไม่มีข้อมูลสรุป — กดปุ่ม "สร้างสรุปเดือน" เพื่อเริ่มต้น</td></tr>
            ) : summaries.map((row, idx) => {
              const isExpanded = expandedId === row.id;
              const rp = Number(row.rework_pct) || 0;
              const sp = Number(row.scrap_pct) || 0;
              const fpy = Number(row.first_pass_yield) || 0;
              const monthLabel = new Date(row.summary_year, row.summary_month - 1).toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });

              return (
                <React.Fragment key={row.id || idx}>
                  <tr style={{ borderBottom: '1px solid #1e293b', cursor: 'pointer',
                    background: isExpanded ? '#1e293b' : idx % 2 === 0 ? 'transparent' : '#0f172a08' }}
                    onClick={() => handleExpand(row)}>
                    <td style={{ padding: '7px 6px', fontSize: 14 }}>{isExpanded ? '▼' : '▶'}</td>
                    <td style={{ padding: '7px 6px', fontWeight: 700, color: '#3b82f6' }}>{monthLabel}</td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', color: '#e2e8f0', fontWeight: 600 }}>{formatNum(row.total_produced)}</td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', color: '#10b981' }}>{formatNum(row.total_good)}</td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', color: '#f59e0b', fontWeight: 700 }}>{formatNum(row.total_rework)}</td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', color: rp > 0.4 ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>{formatPct(rp)}</td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>{formatNum(row.total_scrap)}</td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', color: sp > 0.3 ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>{formatPct(sp)}</td>
                    <td style={{ padding: '7px 6px', textAlign: 'right' }}>
                      <span style={S.tag(fpy >= 99 ? '#10b981' : fpy >= 98 ? '#f59e0b' : '#ef4444')}>{formatPct(fpy)}</span>
                    </td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', color: Number(row.claim_auto_ppm) > 0 ? '#ef4444' : '#64748b' }}>{formatNum(row.claim_auto_ppm)}</td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', color: Number(row.claim_ind_ppm) > 0 ? '#ef4444' : '#64748b' }}>{formatNum(row.claim_ind_ppm)}</td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', color: Number(row.claim_mach_ppm) > 0 ? '#ef4444' : '#64748b' }}>{formatNum(row.claim_mach_ppm)}</td>
                    <td style={{ padding: '7px 6px', textAlign: 'right', color: '#475569', fontSize: 11 }}>
                      {row.updated_at ? new Date(row.updated_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                  {/* Expanded detail */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={13} style={{ padding: 16, background: '#0f172a', borderBottom: '2px solid #334155' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 12 }}>
                          {[
                            { label: '📦 ยอดผลิต', value: formatNum(row.total_produced), c: '#3b82f6' },
                            { label: '✅ งานดี', value: formatNum(row.total_good), c: '#10b981' },
                            { label: '🔧 เสียซ่อม', value: formatNum(row.total_rework), c: '#f59e0b' },
                            { label: '🗑️ เสียทิ้ง', value: formatNum(row.total_scrap), c: '#ef4444' },
                            { label: '🏆 FPY', value: formatPct(fpy), c: fpy >= 99 ? '#10b981' : '#f59e0b' },
                            { label: '📊 % เสียรวม', value: formatPct(rp + sp), c: (rp + sp) > 0.5 ? '#ef4444' : '#f59e0b' },
                          ].map((item, i) => (
                            <div key={i} style={S.card(item.c)}>
                              <div style={S.cardLabel}>{item.label}</div>
                              <div style={S.cardValue(item.c)}>{item.value}</div>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                          {/* Claims */}
                          <div style={{ background: '#1e293b', borderRadius: 6, padding: 10 }}>
                            <h5 style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 8px 0' }}>📮 Customer Claims (PPM)</h5>
                            {[
                              { label: 'Automotive', ppm: row.claim_auto_ppm, shipped: row.shipped_auto },
                              { label: 'Industrial', ppm: row.claim_ind_ppm, shipped: row.shipped_ind },
                              { label: 'Machining', ppm: row.claim_mach_ppm, shipped: row.shipped_mach },
                            ].map((c, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #0f172a' }}>
                                <span style={{ color: '#94a3b8', fontSize: 13 }}>{c.label}</span>
                                <span style={{ color: Number(c.ppm) > 0 ? '#ef4444' : '#10b981', fontWeight: 700, fontSize: 14 }}>{formatNum(c.ppm)} PPM</span>
                              </div>
                            ))}
                          </div>

                          {/* Summary formula */}
                          <div style={{ background: '#1e293b', borderRadius: 6, padding: 10 }}>
                            <h5 style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 8px 0' }}>📐 สูตรคำนวณ</h5>
                            <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.8 }}>
                              <div>% ซ่อม = {formatNum(row.total_rework)} ÷ {formatNum(row.total_produced)} × 100</div>
                              <div>% ทิ้ง = {formatNum(row.total_scrap)} ÷ {formatNum(row.total_produced)} × 100</div>
                              <div>FPY = (ยอดผลิต - ซ่อม - ทิ้ง) ÷ ยอดผลิต × 100</div>
                            </div>
                          </div>

                          {/* Action */}
                          <div style={{ background: '#1e293b', borderRadius: 6, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <h5 style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>⚡ จัดการ</h5>
                            <button onClick={() => {
                              setSelectedYear(row.summary_year);
                              setSelectedMonth(row.summary_month);
                              handleGenerate();
                            }} style={{ ...S.btn('#3b82f6'), width: '100%' }}>
                              🔄 อัพเดตสรุปเดือนนี้ใหม่
                            </button>
                            <div style={{ color: '#475569', fontSize: 11, textAlign: 'center' }}>
                              คำนวณใหม่จากข้อมูล production_log + F07
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Help ─────────────────────────────────────────────── */}
      <div style={{ marginTop: 16, padding: 12, background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
        <h4 style={{ color: '#64748b', fontSize: 13, margin: '0 0 6px 0' }}>💡 วิธีใช้งาน</h4>
        <div style={{ color: '#475569', fontSize: 12, lineHeight: 1.8 }}>
          <strong style={{ color: '#3b82f6' }}>📊 สร้างสรุปเดือน</strong> — เลือก ปี+เดือน แล้วกด → คำนวณจาก production_log + daily_production_summary + claims → save ลง monthly_kpi_summary<br />
          <strong style={{ color: '#8b5cf6' }}>🔄 Auto-Close เดือนก่อน</strong> — สร้างสรุปเดือนที่แล้วอัตโนมัติ (ถ้ายังไม่มี) — เหมาะใช้ต้นเดือนใหม่<br />
          <strong style={{ color: '#f59e0b' }}>🔄 อัพเดต</strong> — กดที่แถวเพื่อดูรายละเอียด แล้วกด "อัพเดตใหม่" ได้ถ้าข้อมูลเปลี่ยน<br />
          <strong style={{ color: '#10b981' }}>📈 กราฟ</strong> — แสดง trend ยอดผลิต + % ของเสีย ย้อนหลังสูงสุด 12 เดือน
        </div>
      </div>
    </div>
  );
};

export default KPIMonthlySummary;