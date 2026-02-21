/**
 * KPIParetoAnalysis.js — ✅ เชื่อม API จริง + Fallback Mock
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Chart from 'chart.js/auto';
import apiClient from '../../../utils/api';
import { DEFECT_CODES } from './product_categories';

// ─── Mock Fallback ──────────────────────────────────────────
const MOCK_PARETO = [
  { code: 'DIM-001', name: 'ขนาดเกินพิกัด', name_en: 'Dimension Out', defect_qty: 47, category: 'dimensional' },
  { code: 'SUR-001', name: 'รอยขีดข่วน', name_en: 'Scratch', defect_qty: 29, category: 'surface' },
  { code: 'SUR-002', name: 'ผิวไม่เรียบ', name_en: 'Surface Roughness', defect_qty: 20, category: 'surface' },
  { code: 'DIM-002', name: 'รูเยื้องศูนย์', name_en: 'Hole Position', defect_qty: 14, category: 'dimensional' },
  { code: 'SUR-004', name: 'เศษครีบ', name_en: 'Burr', defect_qty: 10, category: 'surface' },
  { code: 'MAT-002', name: 'ความแข็งไม่ผ่าน', name_en: 'Hardness Fail', defect_qty: 8, category: 'material' },
  { code: 'PRO-001', name: 'ทำงานผิดขั้นตอน', name_en: 'Process Error', defect_qty: 6, category: 'process' },
  { code: 'SUR-003', name: 'รอยกดทับ', name_en: 'Dent', defect_qty: 4, category: 'surface' },
  { code: 'OTH-001', name: 'อื่นๆ', name_en: 'Others', defect_qty: 2, category: 'other' },
];
const MOCK_CATEGORIES = [
  { category: 'surface', label: 'ผิว (Surface)', color: '#f59e0b', defect_qty: 63 },
  { category: 'dimensional', label: 'มิติ (Dimensional)', color: '#ef4444', defect_qty: 61 },
  { category: 'material', label: 'วัตถุดิบ (Material)', color: '#8b5cf6', defect_qty: 8 },
  { category: 'process', label: 'กระบวนการ (Process)', color: '#3b82f6', defect_qty: 6 },
  { category: 'other', label: 'อื่นๆ (Others)', color: '#64748b', defect_qty: 2 },
];

const CATEGORY_COLORS = {
  dimensional: '#ef4444', surface: '#f59e0b', material: '#8b5cf6',
  process: '#3b82f6', other: '#64748b',
};
const CATEGORY_LABELS = {
  dimensional: 'มิติ (Dimensional)', surface: 'ผิว (Surface)', material: 'วัตถุดิบ (Material)',
  process: 'กระบวนการ (Process)', other: 'อื่นๆ (Others)',
};

const KPIParetoAnalysis = ({ dateRange, selectedLine }) => {
  const paretoChartRef = useRef(null);
  const categoryChartRef = useRef(null);
  const chartInstances = useRef({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dataSource, setDataSource] = useState('loading');

  // ─── State for data ──────────────────────────────────────────
  const [paretoData, setParetoData] = useState(MOCK_PARETO);
  const [categoryBreakdown, setCategoryBreakdown] = useState(MOCK_CATEGORIES);

  const totalDefects = paretoData.reduce((sum, d) => sum + Number(d.defect_qty || d.count || 0), 0);

  const getCumulativeData = (data) => {
    let cumulative = 0;
    return data.map(d => {
      const qty = Number(d.defect_qty || d.count || 0);
      cumulative += totalDefects > 0 ? (qty / totalDefects) * 100 : 0;
      return parseFloat(cumulative.toFixed(1));
    });
  };

  // ─── Fetch from API ──────────────────────────────────────────
  useEffect(() => {
    const fetchPareto = async () => {
      try {
        const res = await apiClient.get('/kpi/pareto', {
          params: { dateRange: dateRange || 'mtd', category: selectedCategory }
        });
        const data = res?.data || res;

        if (data?.pareto?.length > 0) {
          setParetoData(data.pareto.sort((a, b) => Number(b.defect_qty) - Number(a.defect_qty)));

          if (data.categories?.length > 0) {
            setCategoryBreakdown(data.categories.map(c => ({
              ...c,
              label: CATEGORY_LABELS[c.category] || c.category,
              color: CATEGORY_COLORS[c.category] || '#64748b',
              defect_qty: Number(c.defect_qty || 0),
            })));
          }
          setDataSource('api');
          console.log('✅ [Pareto] Loaded from API');
        } else {
          setDataSource('mock');
        }
      } catch (err) {
        console.warn('⚠️ [Pareto] API error, using mock:', err.message);
        setDataSource('mock');
      }
    };
    fetchPareto();
  }, [dateRange, selectedCategory]);

  // ─── Pareto Chart ────────────────────────────────────────────
  const createParetoChart = useCallback(() => {
    const ctx = paretoChartRef.current?.getContext('2d');
    if (!ctx) return;
    if (chartInstances.current.pareto) chartInstances.current.pareto.destroy();

    const filteredData = selectedCategory === 'all'
      ? paretoData
      : paretoData.filter(d => d.category === selectedCategory);

    const localTotal = filteredData.reduce((s, d) => s + Number(d.defect_qty || 0), 0);
    let cum = 0;
    const cumData = filteredData.map(d => {
      cum += localTotal > 0 ? (Number(d.defect_qty || 0) / localTotal) * 100 : 0;
      return parseFloat(cum.toFixed(1));
    });

    chartInstances.current.pareto = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: filteredData.map(d => d.code),
        datasets: [
          {
            label: 'จำนวน (pcs)', data: filteredData.map(d => Number(d.defect_qty || 0)),
            backgroundColor: filteredData.map(d => (CATEGORY_COLORS[d.category] || '#64748b') + '80'),
            borderColor: filteredData.map(d => CATEGORY_COLORS[d.category] || '#64748b'),
            borderWidth: 1, borderRadius: 4, yAxisID: 'y', order: 2,
          },
          {
            label: 'สะสม %', data: cumData, type: 'line',
            borderColor: '#f97316', backgroundColor: 'transparent',
            borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#f97316',
            tension: 0.2, yAxisID: 'y1', order: 1,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 11 }, usePointStyle: true, padding: 16 } },
          tooltip: { backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#cbd5e1',
            callbacks: { afterBody: (items) => {
              const idx = items[0]?.dataIndex;
              if (idx !== undefined && filteredData[idx]) return `${filteredData[idx].name || ''}\n${filteredData[idx].name_en || ''}`;
            }},
          },
          annotation: { annotations: { line80: { type: 'line', yMin: 80, yMax: 80, yScaleID: 'y1', borderColor: '#ef444480', borderWidth: 1.5, borderDash: [6, 3], label: { content: '80%', enabled: true, position: 'end', font: { size: 10 }, color: '#ef4444' } } } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10, weight: '600' } } },
          y: { position: 'left', grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => `${v} pcs` }, beginAtZero: true, title: { display: true, text: 'จำนวนข้อบกพร่อง', color: '#64748b', font: { size: 10 } } },
          y1: { position: 'right', grid: { display: false }, ticks: { color: '#f97316', font: { size: 11 }, callback: v => `${v}%` }, min: 0, max: 100, title: { display: true, text: 'สะสม %', color: '#f97316', font: { size: 10 } } },
        },
      },
    });
  }, [paretoData, selectedCategory]);

  // ─── Category Chart ──────────────────────────────────────────
  const createCategoryChart = useCallback(() => {
    const ctx = categoryChartRef.current?.getContext('2d');
    if (!ctx) return;
    if (chartInstances.current.category) chartInstances.current.category.destroy();

    chartInstances.current.category = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categoryBreakdown.map(c => c.label || c.category),
        datasets: [{
          data: categoryBreakdown.map(c => Number(c.defect_qty || 0)),
          backgroundColor: categoryBreakdown.map(c => c.color || '#64748b'),
          borderColor: '#0f172a', borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 16, usePointStyle: true } },
        },
      },
    });
  }, [categoryBreakdown]);

  // ─── Init Charts ─────────────────────────────────────────────
  useEffect(() => {
    createParetoChart();
    createCategoryChart();
    return () => Object.values(chartInstances.current).forEach(c => c?.destroy());
  }, [createParetoChart, createCategoryChart]);

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="kpi-pareto">
      {/* Filter Buttons */}
      <div className="kpi-pareto__filters">
        {['all', 'dimensional', 'surface', 'material', 'process'].map(cat => (
          <button
            key={cat}
            className={`kpi-pareto__filter-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
            style={selectedCategory === cat ? { borderColor: CATEGORY_COLORS[cat] || '#3b82f6' } : {}}
          >
            {cat === 'all' ? 'ทั้งหมด' : (CATEGORY_LABELS[cat] || cat)}
          </button>
        ))}
        {dataSource === 'mock' && <span className="kpi-data-badge kpi-data-badge--mock" style={{fontSize:9, marginLeft:8}}>⚠️ Demo</span>}
      </div>

      <div className="kpi-pareto__row">
        {/* Pareto Chart */}
        <div className="kpi-panel" style={{ flex: 2 }}>
          <div className="kpi-panel__header">
            <h3 className="kpi-panel__title">📊 Pareto — Defect Analysis</h3>
            <span className="kpi-panel__header-note">🔴 80% ของปัญหามาจาก 20% ของสาเหตุ</span>
          </div>
          <div className="kpi-panel__body kpi-panel__chart-container" style={{ height: 360 }}>
            <canvas ref={paretoChartRef}></canvas>
          </div>
        </div>

        {/* Category Doughnut */}
        <div className="kpi-panel" style={{ flex: 1 }}>
          <div className="kpi-panel__header">
            <h3 className="kpi-panel__title">📉 ตามประเภท</h3>
          </div>
          <div className="kpi-panel__body kpi-panel__chart-container" style={{ height: 360 }}>
            <canvas ref={categoryChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* Detail Table */}
      <div className="kpi-panel" style={{ marginTop: 16 }}>
        <div className="kpi-panel__header">
          <h3 className="kpi-panel__title">📋 รายละเอียดข้อบกพร่อง</h3>
          <span className="kpi-panel__header-note">ทั้งหมด {totalDefects} ชิ้น</span>
        </div>
        <div className="kpi-panel__body">
          <table className="kpi-table">
            <thead>
              <tr>
                <th>#</th><th>Code</th><th>ชื่อ</th><th>Name</th>
                <th>ประเภท</th><th>จำนวน</th><th>%</th><th>สะสม %</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filtered = selectedCategory === 'all' ? paretoData : paretoData.filter(d => d.category === selectedCategory);
                const cumArr = getCumulativeData(filtered);
                return filtered.map((d, i) => (
                  <tr key={d.code}>
                    <td>{i + 1}</td>
                    <td><strong>{d.code}</strong></td>
                    <td>{d.name}</td>
                    <td style={{ color: '#64748b' }}>{d.name_en}</td>
                    <td>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[d.category] || '#64748b', marginRight: 6 }}></span>
                      {d.category}
                    </td>
                    <td><strong>{Number(d.defect_qty || d.count || 0)}</strong></td>
                    <td>{totalDefects > 0 ? ((Number(d.defect_qty || 0) / totalDefects) * 100).toFixed(1) : 0}%</td>
                    <td style={{ color: cumArr[i] >= 80 ? '#64748b' : '#f97316', fontWeight: 600 }}>{cumArr[i]}%</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default KPIParetoAnalysis;