/**
 * KPITrendCharts.js — ✅ เชื่อม API จริง + Fallback Mock
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Chart from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';
import apiClient from '../../../utils/api';
import { CLAIM_TARGETS, INTERNAL_TARGETS } from './product_categories';

if (annotationPlugin) Chart.register(annotationPlugin);

// ─── Mock Fallback ──────────────────────────────────────────
const MOCK_MONTHS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
const MOCK_TREND = {
  claims: {
    automotive: [62, 55, 48, 44, 40, 42, 38, 35, 33, 30, 28, 32],
    industrial: [105, 98, 92, 88, 85, 80, 78, 74, 72, 70, 68, 67],
    machining: [18, 15, 14, 12, 11, 13, 10, 9, 7, 6, 9, 8],
  },
  internal: {
    productionRework: [0.55, 0.50, 0.48, 0.45, 0.42, 0.40, 0.38, 0.36, 0.35, 0.32, 0.30, 0.28],
    machiningRework: [0.82, 0.78, 0.75, 0.70, 0.68, 0.72, 0.65, 0.60, 0.55, 0.58, 0.60, 0.62],
    productionScrap: [0.45, 0.42, 0.40, 0.38, 0.35, 0.33, 0.30, 0.28, 0.25, 0.24, 0.22, 0.21],
  },
};
const MOCK_DAILY = Array.from({ length: 28 }, (_, i) => `${i + 1}`);
const MOCK_DAILY_PPM = [6, 4, 8, 3, 5, 7, 4, 2, 6, 5, 3, 4, 7, 8, 5, 3, 4, 6, 9, 5, 4, 3, 7, 6, 8, 5, 4, 8];
const MOCK_MACHINES = ['CNC-01', 'CNC-02', 'CNC-03', 'CNC-04', 'CNC-05', 'CNC-06', 'LAT-01', 'LAT-02'];
const MOCK_SCRAP = [12, 18, 28, 47, 15, 10, 8, 6];
const MOCK_REWORK = [22, 30, 45, 35, 20, 18, 15, 12];

const KPITrendCharts = ({ dateRange, selectedLine }) => {
  const [activeMetric, setActiveMetric] = useState('machining');
  const [dataSource, setDataSource] = useState('loading');
  const chartRefs = {
    claimTrend: useRef(null),
    internalTrend: useRef(null),
    machiningDetail: useRef(null),
    scrapByMachine: useRef(null),
  };
  const chartInstances = useRef({});

  // ─── State for data ──────────────────────────────────────────
  const [months, setMonths] = useState(MOCK_MONTHS);
  const [trendData, setTrendData] = useState(MOCK_TREND);
  const [dailyDays, setDailyDays] = useState(MOCK_DAILY);
  const [dailyMachiningPPM, setDailyMachiningPPM] = useState(MOCK_DAILY_PPM);
  const [machines, setMachines] = useState(MOCK_MACHINES);
  const [scrapByMachine, setScrapByMachine] = useState(MOCK_SCRAP);
  const [reworkByMachine, setReworkByMachine] = useState(MOCK_REWORK);

  // ─── Fetch from API ──────────────────────────────────────────
  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        const [trendRes, paretoRes] = await Promise.allSettled([
          apiClient.get('/kpi/trends', { params: { months: 12, line: selectedLine || 'ALL' } }),
          apiClient.get('/kpi/pareto', { params: { dateRange: dateRange || 'mtd' } }),
        ]);

        const tData = trendRes.status === 'fulfilled' ? (trendRes.value?.data || trendRes.value) : null;
        const pData = paretoRes.status === 'fulfilled' ? (paretoRes.value?.data || paretoRes.value) : null;

        let usedApi = false;

        // ── Transform monthly trends ──────────────────────────
        if (tData?.monthlyInternal?.length > 0 || tData?.monthlyClaims?.length > 0) {
          usedApi = true;

          // Monthly labels
          const allMonths = [...new Set([
            ...(tData.monthlyInternal || []).map(r => r.month),
            ...(tData.monthlyClaims || []).map(r => r.month),
          ])].sort();

          const monthLabels = allMonths.map(m => {
            const [y, mo] = m.split('-');
            const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return names[parseInt(mo) - 1] || m;
          });
          setMonths(monthLabels);

          // Claims by month
          const claimsByMonth = {};
          (tData.monthlyClaims || []).forEach(r => {
            if (!claimsByMonth[r.claim_category]) claimsByMonth[r.claim_category] = {};
            claimsByMonth[r.claim_category][r.month] = Number(r.ppm || 0);
          });

          setTrendData({
            claims: {
              automotive: allMonths.map(m => claimsByMonth.automotive?.[m] || 0),
              industrial: allMonths.map(m => claimsByMonth.industrial?.[m] || 0),
              machining: allMonths.map(m => claimsByMonth.machining?.[m] || 0),
            },
            internal: {
              productionRework: allMonths.map(m => {
                const row = (tData.monthlyInternal || []).find(r => r.month === m);
                return row ? Number(row.rework_pct || 0) : 0;
              }),
              machiningRework: allMonths.map(m => {
                const row = (tData.monthlyInternal || []).find(r => r.month === m);
                return row ? Number(row.rework_pct || 0) : 0;
              }),
              productionScrap: allMonths.map(m => {
                const row = (tData.monthlyInternal || []).find(r => r.month === m);
                return row ? Number(row.scrap_pct || 0) : 0;
              }),
            },
          });

          // Daily detail
          if (tData.dailyDetail?.length > 0) {
            setDailyDays(tData.dailyDetail.map(r => new Date(r.day).getDate().toString()));
            setDailyMachiningPPM(tData.dailyDetail.map(r => {
              const total = Number(r.total || 0);
              const scrap = Number(r.scrap || 0);
              return total > 0 ? Math.round((scrap / total) * 1000000) : 0;
            }));
          }
        }

        // ── Transform scrap by machine (from pareto) ──────────
        if (pData?.byMachine?.length > 0) {
          usedApi = true;
          setMachines(pData.byMachine.map(r => r.machine_code));
          setScrapByMachine(pData.byMachine.map(r => Number(r.scrap_qty || 0)));
          setReworkByMachine(pData.byMachine.map(r => Number(r.rework_qty || 0)));
        }

        setDataSource(usedApi ? 'api' : 'mock');
        if (!usedApi) console.warn('⚠️ [Trends] No API data, using mock');
      } catch (err) {
        console.warn('⚠️ [Trends] API error, using mock:', err.message);
        setDataSource('mock');
      }
    };

    fetchTrendData();
  }, [dateRange, selectedLine]);

  // ─── Chart: Claim Trend ──────────────────────────────────────
  const createClaimTrendChart = useCallback(() => {
    const ctx = chartRefs.claimTrend.current?.getContext('2d');
    if (!ctx) return;
    if (chartInstances.current.claimTrend) chartInstances.current.claimTrend.destroy();

    chartInstances.current.claimTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          { label: 'Automotive (Target < 50)', data: trendData.claims.automotive, borderColor: CLAIM_TARGETS.automotive?.color || '#3b82f6', backgroundColor: (CLAIM_TARGETS.automotive?.color || '#3b82f6') + '15', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 3, pointHoverRadius: 6 },
          { label: 'Industrial (Target < 90)', data: trendData.claims.industrial, borderColor: CLAIM_TARGETS.industrial?.color || '#8b5cf6', backgroundColor: (CLAIM_TARGETS.industrial?.color || '#8b5cf6') + '15', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 3, pointHoverRadius: 6 },
          { label: 'Machining (Target < 5)', data: trendData.claims.machining, borderColor: CLAIM_TARGETS.machining?.color || '#ef4444', backgroundColor: (CLAIM_TARGETS.machining?.color || '#ef4444') + '15', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 3, pointHoverRadius: 6 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 11 }, usePointStyle: true, padding: 16 } },
          tooltip: { backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#cbd5e1' },
          annotation: { annotations: {
            auto: { type: 'line', yMin: 50, yMax: 50, borderColor: '#3b82f640', borderWidth: 1, borderDash: [4, 4] },
            ind: { type: 'line', yMin: 90, yMax: 90, borderColor: '#8b5cf640', borderWidth: 1, borderDash: [4, 4] },
          }},
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
          y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => `${v} PPM` }, beginAtZero: true },
        },
      },
    });
  }, [months, trendData]);

  // ─── Chart: Internal Trend ───────────────────────────────────
  const createInternalTrendChart = useCallback(() => {
    const ctx = chartRefs.internalTrend.current?.getContext('2d');
    if (!ctx) return;
    if (chartInstances.current.internalTrend) chartInstances.current.internalTrend.destroy();

    chartInstances.current.internalTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          { label: 'Production Rework (Target < 0.40%)', data: trendData.internal.productionRework, borderColor: '#f59e0b', backgroundColor: '#f59e0b15', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 3 },
          { label: 'Machining Rework (Target < 0.50%)', data: trendData.internal.machiningRework, borderColor: '#f97316', backgroundColor: '#f9731615', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 3 },
          { label: 'Production Scrap (Target < 0.30%)', data: trendData.internal.productionScrap, borderColor: '#ef4444', backgroundColor: '#ef444415', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 3 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 11 }, usePointStyle: true, padding: 16 } },
          tooltip: { backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#cbd5e1' },
          annotation: { annotations: {
            rework: { type: 'line', yMin: 0.40, yMax: 0.40, borderColor: '#f59e0b40', borderWidth: 1, borderDash: [4, 4] },
            scrap: { type: 'line', yMin: 0.30, yMax: 0.30, borderColor: '#ef444440', borderWidth: 1, borderDash: [4, 4] },
          }},
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
          y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => `${v.toFixed(2)}%` }, beginAtZero: true },
        },
      },
    });
  }, [months, trendData]);

  // ─── Chart: Machining Daily Detail ───────────────────────────
  const createMachiningDetailChart = useCallback(() => {
    const ctx = chartRefs.machiningDetail.current?.getContext('2d');
    if (!ctx) return;
    if (chartInstances.current.machiningDetail) chartInstances.current.machiningDetail.destroy();

    chartInstances.current.machiningDetail = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dailyDays,
        datasets: [{
          label: 'Machining PPM',
          data: dailyMachiningPPM,
          backgroundColor: dailyMachiningPPM.map(v => v > 8 ? '#ef444480' : v > 5 ? '#f59e0b80' : '#10b98180'),
          borderColor: dailyMachiningPPM.map(v => v > 8 ? '#ef4444' : v > 5 ? '#f59e0b' : '#10b981'),
          borderWidth: 1, borderRadius: 3,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          annotation: { annotations: { target: { type: 'line', yMin: 5, yMax: 5, borderColor: '#ef4444', borderWidth: 2, borderDash: [4, 2], label: { content: 'Target: 5 PPM', enabled: true, position: 'start', font: { size: 10, weight: 'bold' }, color: '#ef4444', backgroundColor: '#1e293bee' } } } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
          y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => `${v} PPM` }, beginAtZero: true, max: Math.max(12, ...dailyMachiningPPM) + 2 },
        },
      },
    });
  }, [dailyDays, dailyMachiningPPM]);

  // ─── Chart: Scrap by Machine ─────────────────────────────────
  const createScrapByMachineChart = useCallback(() => {
    const ctx = chartRefs.scrapByMachine.current?.getContext('2d');
    if (!ctx) return;
    if (chartInstances.current.scrapByMachine) chartInstances.current.scrapByMachine.destroy();

    chartInstances.current.scrapByMachine = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: machines,
        datasets: [
          { label: 'Scrap', data: scrapByMachine, backgroundColor: '#ef444480', borderColor: '#ef4444', borderWidth: 1, borderRadius: 3 },
          { label: 'Rework', data: reworkByMachine, backgroundColor: '#f59e0b80', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 3 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 11 }, usePointStyle: true, padding: 16 } },
          tooltip: { backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#cbd5e1' },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11, weight: '600' } } },
          y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => `${v} pcs` }, beginAtZero: true },
        },
      },
    });
  }, [machines, scrapByMachine, reworkByMachine]);

  // ─── Initialize Charts ────────────────────────────────────────
  useEffect(() => {
    createClaimTrendChart();
    createInternalTrendChart();
    createMachiningDetailChart();
    createScrapByMachineChart();
    return () => Object.values(chartInstances.current).forEach(c => c?.destroy());
  }, [createClaimTrendChart, createInternalTrendChart, createMachiningDetailChart, createScrapByMachineChart]);

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="kpi-trends">
      <div className="kpi-trends__row">
        <div className="kpi-panel">
          <div className="kpi-panel__header">
            <h3 className="kpi-panel__title">📈 External Claims Trend (PPM) — 12 Months</h3>
            {dataSource === 'mock' && <span className="kpi-data-badge kpi-data-badge--mock" style={{fontSize:9}}>⚠️ Demo</span>}
          </div>
          <div className="kpi-panel__body kpi-panel__chart-container"><canvas ref={chartRefs.claimTrend}></canvas></div>
        </div>
        <div className="kpi-panel">
          <div className="kpi-panel__header">
            <h3 className="kpi-panel__title">📈 Internal Quality Trend (%) — 12 Months</h3>
          </div>
          <div className="kpi-panel__body kpi-panel__chart-container"><canvas ref={chartRefs.internalTrend}></canvas></div>
        </div>
      </div>
      <div className="kpi-trends__row">
        <div className="kpi-panel">
          <div className="kpi-panel__header">
            <h3 className="kpi-panel__title">⚙️ Machining Claim Daily Detail — Target: 5 PPM</h3>
            <span className="kpi-panel__header-note">🔴 Critical: ต้องใช้ Automated Inspection 100%</span>
          </div>
          <div className="kpi-panel__body kpi-panel__chart-container"><canvas ref={chartRefs.machiningDetail}></canvas></div>
          <div className="kpi-chart-legend">
            <span className="kpi-chart-legend__item"><span className="kpi-chart-legend__dot" style={{ background: '#10b981' }}></span> ≤ 5 PPM (On Target)</span>
            <span className="kpi-chart-legend__item"><span className="kpi-chart-legend__dot" style={{ background: '#f59e0b' }}></span> 6-8 PPM (At Risk)</span>
            <span className="kpi-chart-legend__item"><span className="kpi-chart-legend__dot" style={{ background: '#ef4444' }}></span> &gt; 8 PPM (Over Target)</span>
          </div>
        </div>
        <div className="kpi-panel">
          <div className="kpi-panel__header">
            <h3 className="kpi-panel__title">🏭 Scrap & Rework by Machine — This Month</h3>
          </div>
          <div className="kpi-panel__body kpi-panel__chart-container"><canvas ref={chartRefs.scrapByMachine}></canvas></div>
        </div>
      </div>
    </div>
  );
};

export default KPITrendCharts;