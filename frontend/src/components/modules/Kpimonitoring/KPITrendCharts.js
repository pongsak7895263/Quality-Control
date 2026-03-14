/**
 * KPITrendCharts.js — 📈 กราฟแนวโน้ม KPI
 * ดึงจาก production_log + daily_production_summary
 * 
 * 6 กราฟ:
 * 1. ยอดผลิตรายเดือน (Bar) + FPY (Line)
 * 2. % ของเสียรายเดือน (Rework + Scrap lines + target)
 * 3. Claims PPM รายเดือน
 * 4. ยอดผลิตรายวัน (เดือนปัจจุบัน)
 * 5. % ของเสียรายวัน (เดือนปัจจุบัน)
 * 6. ของเสียแยก Line (Bar)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Chart from 'chart.js/auto';
import apiClient from '../../../utils/api';

let annotationPlugin;
try { annotationPlugin = require('chartjs-plugin-annotation'); } catch {}
if (annotationPlugin) Chart.register(annotationPlugin);

const THAI_MONTHS = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const KPITrendCharts = ({ dateRange, selectedLine }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const chartRefs = {
    prodMonthly: useRef(null),
    defectMonthly: useRef(null),
    claimMonthly: useRef(null),
    prodDaily: useRef(null),
    defectDaily: useRef(null),
    byLine: useRef(null),
  };
  const instances = useRef({});

  // ── Fetch data ──────────────────────────────────────────────
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/kpi/trends', { params: { months: 12, line: selectedLine || 'ALL' } });
        setData(res?.data?.data || res?.data || null);
      } catch (err) {
        console.error('[Trends] fetch error:', err);
      }
      setLoading(false);
    };
    fetch();
  }, [dateRange, selectedLine]);

  const destroyAll = () => Object.values(instances.current).forEach(c => c?.destroy());

  // ── Helper ──────────────────────────────────────────────────
  const monthLabel = (m) => {
    const [, mo] = (m || '').split('-');
    return THAI_MONTHS[parseInt(mo)] || m;
  };
  const chartOpts = (yCallback, annotations = {}) => ({
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 10 }, usePointStyle: true, padding: 12 } },
      tooltip: { backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#cbd5e1', padding: 10 },
      ...(Object.keys(annotations).length > 0 ? { annotation: { annotations } } : {}),
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
      y: { grid: { color: '#1e293b40' }, ticks: { color: '#64748b', font: { size: 10 }, callback: yCallback }, beginAtZero: true },
    },
  });

  // ── Build all charts ────────────────────────────────────────
  const buildCharts = useCallback(() => {
    if (!data) return;
    destroyAll();

    const mi = data.monthlyInternal || [];
    const mc = data.monthlyClaims || [];
    const dd = data.dailyDetail || [];
    const bl = data.byLine || [];

    const mLabels = mi.map(r => monthLabel(r.month));

    // ── 1. ยอดผลิตรายเดือน (Bar + Line FPY) ──────────────────
    const ctx1 = chartRefs.prodMonthly.current?.getContext('2d');
    if (ctx1) {
      instances.current.prodMonthly = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: mLabels,
          datasets: [
            { label: '📦 ยอดผลิต', data: mi.map(r => r.total_produced), backgroundColor: '#3b82f640', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 4, yAxisID: 'y' },
            { label: '🏆 FPY (%)', data: mi.map(r => r.fpy), type: 'line', borderColor: '#10b981', backgroundColor: '#10b98120', borderWidth: 2, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#10b981', yAxisID: 'y1' },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 10 }, usePointStyle: true, padding: 12 } },
            tooltip: { backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#cbd5e1' },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
            y: { position: 'left', grid: { color: '#1e293b40' }, ticks: { color: '#3b82f6', font: { size: 10 }, callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v }, beginAtZero: true, title: { display: true, text: 'ชิ้น', color: '#64748b', font: { size: 9 } } },
            y1: { position: 'right', grid: { display: false }, ticks: { color: '#10b981', font: { size: 10 }, callback: v => v + '%' }, min: 90, max: 100.5, title: { display: true, text: 'FPY %', color: '#64748b', font: { size: 9 } } },
          },
        },
      });
    }

    // ── 2. % ของเสียรายเดือน (Line + Target) ──────────────────
    const ctx2 = chartRefs.defectMonthly.current?.getContext('2d');
    if (ctx2) {
      instances.current.defectMonthly = new Chart(ctx2, {
        type: 'line',
        data: {
          labels: mLabels,
          datasets: [
            { label: '🔧 % เสียซ่อม (Rework)', data: mi.map(r => r.rework_pct), borderColor: '#f59e0b', backgroundColor: '#f59e0b15', borderWidth: 2.5, fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#f59e0b' },
            { label: '🗑️ % เสียทิ้ง (Scrap)', data: mi.map(r => r.scrap_pct), borderColor: '#ef4444', backgroundColor: '#ef444415', borderWidth: 2.5, fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#ef4444' },
          ],
        },
        options: chartOpts(v => v.toFixed(2) + '%', {
          reworkTarget: { type: 'line', yMin: 0.40, yMax: 0.40, borderColor: '#f59e0b60', borderWidth: 1.5, borderDash: [6, 3], label: { content: 'Rework Target 0.40%', display: true, position: 'end', font: { size: 9 }, color: '#f59e0b', backgroundColor: '#0f172aee' } },
          scrapTarget: { type: 'line', yMin: 0.30, yMax: 0.30, borderColor: '#ef444460', borderWidth: 1.5, borderDash: [6, 3], label: { content: 'Scrap Target 0.30%', display: true, position: 'start', font: { size: 9 }, color: '#ef4444', backgroundColor: '#0f172aee' } },
        }),
      });
    }

    // ── 3. Claims PPM รายเดือน ─────────────────────────────────
    const ctx3 = chartRefs.claimMonthly.current?.getContext('2d');
    if (ctx3 && mc.length > 0) {
      const claimMonths = [...new Set(mc.map(r => r.month))].sort();
      const clLabels = claimMonths.map(monthLabel);
      const byCat = {};
      mc.forEach(r => { if (!byCat[r.claim_category]) byCat[r.claim_category] = {}; byCat[r.claim_category][r.month] = Number(r.ppm) || 0; });

      instances.current.claimMonthly = new Chart(ctx3, {
        type: 'line',
        data: {
          labels: clLabels,
          datasets: [
            { label: 'Automotive (Target < 50)', data: claimMonths.map(m => byCat.automotive?.[m] || 0), borderColor: '#3b82f6', backgroundColor: '#3b82f615', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 4 },
            { label: 'Industrial (Target < 90)', data: claimMonths.map(m => byCat.industrial?.[m] || 0), borderColor: '#8b5cf6', backgroundColor: '#8b5cf615', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 4 },
            { label: 'Machining (Target < 5)', data: claimMonths.map(m => byCat.machining?.[m] || 0), borderColor: '#ef4444', backgroundColor: '#ef444415', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 4 },
          ],
        },
        options: chartOpts(v => v + ' PPM', {
          autoTarget: { type: 'line', yMin: 50, yMax: 50, borderColor: '#3b82f640', borderWidth: 1, borderDash: [4, 4] },
          indTarget: { type: 'line', yMin: 90, yMax: 90, borderColor: '#8b5cf640', borderWidth: 1, borderDash: [4, 4] },
        }),
      });
    }

    // ── 4. ยอดผลิตรายวัน (Bar) ────────────────────────────────
    const ctx4 = chartRefs.prodDaily.current?.getContext('2d');
    if (ctx4 && dd.length > 0) {
      const dayLabels = dd.map(r => new Date(r.day).getDate().toString());
      instances.current.prodDaily = new Chart(ctx4, {
        type: 'bar',
        data: {
          labels: dayLabels,
          datasets: [
            { label: '✅ ดี', data: dd.map(r => r.total_good), backgroundColor: '#10b98160', borderColor: '#10b981', borderWidth: 1, borderRadius: 3 },
            { label: '🔧 Rework', data: dd.map(r => r.rework), backgroundColor: '#f59e0b60', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 3 },
            { label: '🗑️ Scrap', data: dd.map(r => r.scrap), backgroundColor: '#ef444460', borderColor: '#ef4444', borderWidth: 1, borderRadius: 3 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 10 }, usePointStyle: true, padding: 12 } },
            tooltip: { mode: 'index', intersect: false, backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#cbd5e1' },
          },
          scales: {
            x: { stacked: true, grid: { display: false }, ticks: { color: '#64748b', font: { size: 9 } } },
            y: { stacked: true, grid: { color: '#1e293b40' }, ticks: { color: '#64748b', font: { size: 10 }, callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v }, beginAtZero: true },
          },
        },
      });
    }

    // ── 5. % ของเสียรายวัน (Line) ─────────────────────────────
    const ctx5 = chartRefs.defectDaily.current?.getContext('2d');
    if (ctx5 && dd.length > 0) {
      const dayLabels = dd.map(r => new Date(r.day).getDate().toString());
      instances.current.defectDaily = new Chart(ctx5, {
        type: 'line',
        data: {
          labels: dayLabels,
          datasets: [
            { label: '🔧 % ซ่อม', data: dd.map(r => r.total_produced > 0 ? parseFloat(((r.rework / r.total_produced) * 100).toFixed(2)) : 0), borderColor: '#f59e0b', borderWidth: 2, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#f59e0b' },
            { label: '🗑️ % ทิ้ง', data: dd.map(r => r.total_produced > 0 ? parseFloat(((r.scrap / r.total_produced) * 100).toFixed(2)) : 0), borderColor: '#ef4444', borderWidth: 2, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#ef4444' },
          ],
        },
        options: chartOpts(v => v.toFixed(2) + '%', {
          rw: { type: 'line', yMin: 0.40, yMax: 0.40, borderColor: '#f59e0b40', borderWidth: 1, borderDash: [4, 4] },
          sc: { type: 'line', yMin: 0.30, yMax: 0.30, borderColor: '#ef444440', borderWidth: 1, borderDash: [4, 4] },
        }),
      });
    }

    // ── 6. ของเสียแยก Line (Bar) ──────────────────────────────
    const ctx6 = chartRefs.byLine.current?.getContext('2d');
    if (ctx6 && bl.length > 0) {
      instances.current.byLine = new Chart(ctx6, {
        type: 'bar',
        data: {
          labels: bl.map(r => r.line_name || r.machine_code || '?'),
          datasets: [
            { label: '🔧 Rework', data: bl.map(r => Number(r.rework_qty) || 0), backgroundColor: '#f59e0b80', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 4 },
            { label: '🗑️ Scrap', data: bl.map(r => Number(r.scrap_qty) || 0), backgroundColor: '#ef444480', borderColor: '#ef4444', borderWidth: 1, borderRadius: 4 },
          ],
        },
        options: chartOpts(v => v.toLocaleString() + ' pcs'),
      });
    }

  }, [data]);

  useEffect(() => { buildCharts(); return destroyAll; }, [buildCharts]);

  const S = {
    panel: { background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b', overflow: 'hidden' },
    head: { padding: '10px 14px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { color: '#e2e8f0', fontSize: 14, fontWeight: 700, margin: 0 },
    chart: { padding: 12, height: 280 },
  };

  if (loading) return <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>⏳ กำลังโหลดกราฟ...</div>;
  if (!data) return <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>📭 ไม่พบข้อมูล</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Row 1: Monthly Production + Monthly Defect % */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={S.panel}>
          <div style={S.head}><h3 style={S.title}>📦 ยอดผลิตรายเดือน + FPY</h3></div>
          <div style={S.chart}><canvas ref={chartRefs.prodMonthly}></canvas></div>
        </div>
        <div style={S.panel}>
          <div style={S.head}><h3 style={S.title}>📊 % ของเสียรายเดือน (Rework / Scrap)</h3></div>
          <div style={S.chart}><canvas ref={chartRefs.defectMonthly}></canvas></div>
        </div>
      </div>

      {/* Row 2: Claims PPM + By Line */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={S.panel}>
          <div style={S.head}><h3 style={S.title}>📮 Customer Claims (PPM) รายเดือน</h3></div>
          <div style={S.chart}><canvas ref={chartRefs.claimMonthly}></canvas></div>
        </div>
        <div style={S.panel}>
          <div style={S.head}><h3 style={S.title}>🏭 ของเสียแยก Line (เดือนนี้)</h3></div>
          <div style={S.chart}><canvas ref={chartRefs.byLine}></canvas></div>
        </div>
      </div>

      {/* Row 3: Daily Production + Daily Defect % */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={S.panel}>
          <div style={S.head}><h3 style={S.title}>📅 ยอดผลิตรายวัน (เดือนปัจจุบัน)</h3></div>
          <div style={S.chart}><canvas ref={chartRefs.prodDaily}></canvas></div>
        </div>
        <div style={S.panel}>
          <div style={S.head}><h3 style={S.title}>📅 % ของเสียรายวัน (เดือนปัจจุบัน)</h3></div>
          <div style={S.chart}><canvas ref={chartRefs.defectDaily}></canvas></div>
        </div>
      </div>
    </div>
  );
};

export default KPITrendCharts;