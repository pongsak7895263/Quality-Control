/**
 * KPIDashboard.js
 * ===============
 * หน้า Dashboard หลักของ KPI Monitoring Module
 * แสดงภาพรวม Good/Scrap/Rework ทั้งหมด
 * 
 * ✅ เชื่อม API จริง — fallback mock data ถ้า API ยังไม่พร้อม
 */

import React, { useState, useEffect, useCallback } from 'react';
import KPIOverviewCards from './KPIOverviewCards';
import KPITrendCharts from './KPITrendCharts';
import KPIParetoAnalysis from './KPIParetoAnalysis';
import KPIAndonBoard from './KPIAndonBoard';
import KPIDataEntry from './KPIDataEntry';
import KPIClaimEntry from './KPIClaimEntry';
import KPIReport from './KPIReport';
import KPIEditData from './KPIEditData';
import KPIPartMaster from './KPIPartMaster';
import apiClient from '../../../utils/api';
import { calculatePPM, calculatePercent } from '../../../utils/calculations';
import {
  CLAIM_TARGETS as _CLAIM_TARGETS,
  INTERNAL_TARGETS as _INTERNAL_TARGETS,
} from './product_categories';
import './KPIMonitoring.css';

// ─── Safe fallbacks ──────────────────────────────────────────
const CLAIM_TARGETS = (_CLAIM_TARGETS && Object.keys(_CLAIM_TARGETS).length > 0) ? _CLAIM_TARGETS : {
  automotive: { id: 'automotive', label: 'Automotive Parts Claim', labelTh: 'ชิ้นส่วนยานยนต์', target: 50, unit: 'PPM', standard: 'IATF 16949', strategy: 'Error Proofing (Poka-Yoke)', icon: '🚗', color: '#3b82f6' },
  industrial: { id: 'industrial', label: 'Other Industrial Claim', labelTh: 'อุตสาหกรรมทั่วไป', target: 90, unit: 'PPM', standard: 'ISO 9001', strategy: 'Sampling Inspection', icon: '🏭', color: '#8b5cf6' },
  machining:  { id: 'machining',  label: 'Machining Claim', labelTh: 'งาน Machining', target: 5, unit: 'PPM', standard: '6σ Level', strategy: '100% Automated Inspection + Sensor', icon: '⚙️', color: '#ef4444' },
};

const INTERNAL_TARGETS = (_INTERNAL_TARGETS && Object.keys(_INTERNAL_TARGETS).length > 0) ? _INTERNAL_TARGETS : {
  productionRework: { id: 'productionRework', label: 'Production Rework', target: 0.40, unit: '%', strategy: 'Re-occurrence Analysis', icon: '🔧', color: '#f59e0b' },
  machiningRework:  { id: 'machiningRework',  label: 'Machining Rework', target: 0.50, unit: '%', strategy: 'Tool Life & Machine Calibration', icon: '🔩', color: '#f97316' },
  productionScrap:  { id: 'productionScrap',  label: 'Production Scrap', target: 0.30, unit: '%', strategy: 'FIFO Control + NG Segregation', icon: '🗑️', color: '#ef4444' },
};

const SHIFTS = {
  A: { id: 'A', label: 'Shift A (Day)', start: '06:00', end: '18:00' },
  B: { id: 'B', label: 'Shift B (Night)', start: '18:00', end: '06:00' },
};

// ─── Mock Data (ใช้เมื่อ API ยังไม่พร้อม) ─────────────────────
const MOCK_DATA = {
  summary: {
    totalProduced: 124800,
    totalGood: 123750,
    totalRework: 772,
    totalScrap: 278,
    firstPassYield: 99.16,
  },
  claims: {
    automotive: { actual: 8, shipped: 250000 },
    industrial: { actual: 12, shipped: 180000 },
    machining: { actual: 3, shipped: 375000 },
  },
  internal: {
    productionRework: { count: 350, total: 124800 },
    machiningRework: { count: 422, total: 68200 },
    productionScrap: { count: 262, total: 124800 },
  },
  andonAlerts: [
    { id: 'AND-001', timestamp: '2026-02-07T08:42:00', machine: 'CNC-04', type: 'consecutive_ng', count: 3, level: 2, status: 'active', description: '3 NG ติดกัน — ขนาดเกินพิกัด (DIM-001)', assignee: 'สุภาพ ก.' },
    { id: 'AND-002', timestamp: '2026-02-07T07:15:00', machine: 'CNC-03', type: 'rework_rate', reworkPct: 0.58, level: 2, status: 'resolved', description: 'Rework > 0.5%/hr — เปลี่ยน Tool', assignee: 'วิชัย ท.', resolvedAt: '2026-02-07T07:38:00' },
    { id: 'AND-003', timestamp: '2026-02-07T06:33:00', machine: 'LAT-01', type: 'consecutive_ng', count: 2, level: 1, status: 'resolved', description: 'ขนาดเกินพิกัด — Calibrate เครื่อง', assignee: 'ธนา ส.', resolvedAt: '2026-02-07T06:51:00' },
  ],
  recentEntries: [
    { id: 1, time: '08:45', machine: 'CNC-04', part: 'AX-7842-B', disposition: 'SCRAP', defect: 'DIM-001', operator: 'สมชาย ก.' },
    { id: 2, time: '08:44', machine: 'CNC-04', part: 'AX-7842-B', disposition: 'SCRAP', defect: 'DIM-001', operator: 'สมชาย ก.' },
    { id: 3, time: '08:43', machine: 'CNC-04', part: 'AX-7842-B', disposition: 'SCRAP', defect: 'DIM-001', operator: 'สมชาย ก.' },
    { id: 4, time: '08:30', machine: 'CNC-02', part: 'BX-1124-A', disposition: 'REWORK', defect: 'SUR-002', operator: 'วิชัย ท.' },
    { id: 5, time: '08:15', machine: 'LAT-02', part: 'CX-3302-C', disposition: 'GOOD', defect: null, operator: 'ธนา ส.' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// HELPER: แปลงข้อมูลจาก API response → Dashboard format
// ═══════════════════════════════════════════════════════════════

const transformApiData = (dashboardRes, valuesRes) => {
  // ── Summary ──────────────────────────────────────────────────
  const s = dashboardRes?.summary || {};
  const totalProduced = Number(s.total_produced || s.totalProduced || 0);
  const totalRework   = Number(s.total_rework || s.totalRework || 0);
  const totalScrap    = Number(s.total_scrap || s.totalScrap || 0);
  const totalGood     = Number(s.total_good || s.totalGood || 0) || (totalProduced - totalRework - totalScrap);
  const fpy           = Number(s.first_pass_yield || s.firstPassYield || 0)
                        || (totalProduced > 0 ? ((totalGood / totalProduced) * 100).toFixed(2) : 0);

  // ── Claims (จาก /kpi/values) ─────────────────────────────────
  const claimsArr = valuesRes?.claims || [];
  const claimsMap = {};
  claimsArr.forEach(c => {
    claimsMap[c.claim_category] = {
      actual: Number(c.total_defects || 0),
      shipped: Number(c.total_shipped || 0),
    };
  });

  // ── Internal (จาก /kpi/values) ───────────────────────────────
  const internalArr = valuesRes?.internal || [];
  let prodRework = { count: 0, total: 0 };
  let machRework = { count: 0, total: 0 };
  let prodScrap  = { count: 0, total: 0 };

  internalArr.forEach(item => {
    const total  = Number(item.total || 0);
    const rework = Number(item.rework_qty || 0);
    const scrap  = Number(item.scrap_qty || 0);
    if (item.group_name === 'machining') {
      machRework = { count: rework, total };
    } else {
      prodRework = { count: prodRework.count + rework, total: prodRework.total + total };
      prodScrap  = { count: prodScrap.count + scrap,  total: prodScrap.total + total };
    }
  });

  // ── Andon Alerts ─────────────────────────────────────────────
  const andonAlerts = (dashboardRes?.andonAlerts || []).map(a => ({
    id: a.alert_number || a.id,
    timestamp: a.triggered_at || a.timestamp,
    machine: a.machine_code || a.machine,
    type: a.alert_type || a.type,
    count: a.consecutive_ng || a.count || 0,
    level: Number(a.escalation || a.level || 1),
    status: a.status,
    description: a.description,
    assignee: a.assignee_name || a.assignee || '',
    resolvedAt: a.resolved_at || a.resolvedAt || null,
  }));

  // ── Recent Entries ───────────────────────────────────────────
  const recentEntries = (dashboardRes?.recentEntries || []).map((e, idx) => ({
    id: e.id || idx,
    time: e.inspected_at
      ? new Date(e.inspected_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      : (e.time || ''),
    machine: e.machine_code || e.machine || '',
    part: e.part_number || e.part || '',
    disposition: e.disposition,
    defect: e.defect_code || e.defect || null,
    operator: e.operator_name || e.operator || '',
  }));

  return {
    summary: { totalProduced, totalGood, totalRework, totalScrap, firstPassYield: fpy },
    claims: {
      automotive: claimsMap.automotive || { actual: 0, shipped: 0 },
      industrial: claimsMap.industrial || { actual: 0, shipped: 0 },
      machining:  claimsMap.machining  || { actual: 0, shipped: 0 },
    },
    internal: { productionRework: prodRework, machiningRework: machRework, productionScrap: prodScrap },
    andonAlerts,
    recentEntries,
  };
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const KPIDashboard = () => {
  // ─── State ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('mtd');
  const [selectedShift, setSelectedShift] = useState('ALL');
  const [selectedLine, setSelectedLine] = useState('ALL');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState('loading'); // 'api' | 'mock' | 'loading'

  const [dashboardData, setDashboardData] = useState({
    summary: { totalProduced: 0, totalGood: 0, totalRework: 0, totalScrap: 0, firstPassYield: 0 },
    claims: {
      automotive: { actual: 0, shipped: 0 },
      industrial: { actual: 0, shipped: 0 },
      machining:  { actual: 0, shipped: 0 },
    },
    internal: {
      productionRework: { count: 0, total: 0 },
      machiningRework:  { count: 0, total: 0 },
      productionScrap:  { count: 0, total: 0 },
    },
    andonAlerts: [],
    recentEntries: [],
  });

  // ─── Clock ───────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // DATA FETCHING — API จริง + Fallback Mock
  // ═══════════════════════════════════════════════════════════════
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);

    try {
      // ── เรียก API 4 ตัวพร้อมกัน ──────────────────────────────
      const [dashRes, valsRes, alertsRes, entriesRes] = await Promise.allSettled([
        apiClient.get('/kpi/dashboard', {
          params: { dateRange, shift: selectedShift, line: selectedLine }
        }),
        apiClient.get('/kpi/values', {
          params: { dateRange }
        }),
        apiClient.get('/kpi/andon', {
          params: { status: 'all' }
        }),
        apiClient.get('/kpi/entries', {
          params: { limit: 15 }
        }),
      ]);

      // ── ดึงข้อมูลจาก response ────────────────────────────────
      const dashData  = dashRes.status === 'fulfilled'
        ? (dashRes.value?.data?.data || dashRes.value?.data) : null;
      const valsData  = valsRes.status === 'fulfilled'
        ? (valsRes.value?.data?.data || valsRes.value?.data) : null;
      const alertData = alertsRes.status === 'fulfilled'
        ? (alertsRes.value?.data?.data || alertsRes.value?.data) : null;
      const entryData = entriesRes.status === 'fulfilled'
        ? (entriesRes.value?.data?.data || entriesRes.value?.data) : null;

      // ── ถ้า API ตอบกลับ → ใช้ข้อมูลจริง ──────────────────────
      if (dashData || valsData) {
        const combined = {
          summary: dashData?.summary || {},
          andonAlerts: alertData || dashData?.andonAlerts || [],
          recentEntries: entryData || dashData?.recentEntries || [],
        };
        const transformed = transformApiData(combined, valsData || {});
        setDashboardData(transformed);
        setDataSource('api');
        console.log('✅ [KPI] Loaded from API');
        return;
      }

      // ── ทุก API fail → ใช้ Mock ──────────────────────────────
      throw new Error('No API data');

    } catch (err) {
      console.warn('⚠️ [KPI] API unavailable, using mock data:', err.message);
      setDashboardData(MOCK_DATA);
      setDataSource('mock');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, selectedShift, selectedLine]);

  // Auto-refresh ทุก 30 วินาที (หยุดเมื่ออยู่หน้าบันทึกข้อมูล)
  useEffect(() => {
    fetchDashboardData();

    // ✅ ไม่ auto-refresh ถ้าอยู่ tab บันทึกข้อมูล/claim (ป้องกันฟอร์ม reset)
    if (activeTab === 'entry' || activeTab === 'claim' || activeTab === 'report' || activeTab === 'edit' || activeTab === 'parts') return;

    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData, activeTab]);

  // ─── Computed KPI Values ──────────────────────────────────────
  const kpiValues = {
    claims: {
      automotive: calculatePPM(dashboardData.claims.automotive.actual, dashboardData.claims.automotive.shipped),
      industrial: calculatePPM(dashboardData.claims.industrial.actual, dashboardData.claims.industrial.shipped),
      machining: calculatePPM(dashboardData.claims.machining.actual, dashboardData.claims.machining.shipped),
    },
    internal: {
      productionRework: calculatePercent(dashboardData.internal.productionRework.count, dashboardData.internal.productionRework.total),
      machiningRework: calculatePercent(dashboardData.internal.machiningRework.count, dashboardData.internal.machiningRework.total),
      productionScrap: calculatePercent(dashboardData.internal.productionScrap.count, dashboardData.internal.productionScrap.total),
    },
  };

  const activeAlertCount = dashboardData.andonAlerts.filter(a => a.status === 'active').length;

  // ─── Current Shift Detection ──────────────────────────────────
  const getCurrentShift = () => {
    const hour = currentTime.getHours();
    return (hour >= 6 && hour < 18) ? SHIFTS.A : SHIFTS.B;
  };

  // ─── Tabs ─────────────────────────────────────────────────────
  const tabs = [
    { id: 'overview', label: 'ภาพรวม KPI', icon: '📊' },
    { id: 'trends', label: 'แนวโน้ม', icon: '📈' },
    { id: 'pareto', label: 'Pareto Analysis', icon: '📉' },
    { id: 'andon', label: 'Andon Board', icon: '🚨', badge: activeAlertCount },
    { id: 'entry', label: 'บันทึกข้อมูล', icon: '📝' },
    { id: 'claim', label: 'Claim', icon: '📮' },
    { id: 'report', label: 'รายงาน', icon: '📄' },
    { id: 'edit', label: 'แก้ไขข้อมูล', icon: '✏️' },
    { id: 'parts', label: 'Part Master', icon: '📦' },
  ];

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="kpi-dashboard">
      {/* Header Bar */}
      <div className="kpi-header-bar">
        <div className="kpi-header-left">
          <h1 className="kpi-page-title">
            <span className="kpi-page-icon">📊</span>
            KPI Monitoring — Good/Scrap Management
          </h1>
          <div className="kpi-shift-badge">
            <span className="kpi-shift-dot"></span>
            {getCurrentShift().label}
          </div>
        </div>
        <div className="kpi-header-right">
          {/* Data Source Indicator */}
          {dataSource === 'mock' && (
            <span
              className="kpi-data-badge kpi-data-badge--mock"
              title="กำลังใช้ข้อมูลตัวอย่าง — API ยังไม่พร้อม"
            >
              ⚠️ Demo Mode
            </span>
          )}
          {dataSource === 'api' && (
            <span
              className="kpi-data-badge kpi-data-badge--live"
              title="เชื่อมต่อ API สำเร็จ — ข้อมูลจริง"
            >
              🟢 Live
            </span>
          )}
          <span className="kpi-clock">
            {currentTime.toLocaleTimeString('th-TH', { hour12: false })}
          </span>
          <span className="kpi-date">
            {currentTime.toLocaleDateString('th-TH', {
              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
            })}
          </span>
        </div>
      </div>

      {/* Andon Alert Banner */}
      {activeAlertCount > 0 && (
        <div className="kpi-alarm-banner">
          <span className="kpi-alarm-pulse"></span>
          <span className="kpi-alarm-text">
            ANDON ALERT: {dashboardData.andonAlerts.find(a => a.status === 'active')?.description}
          </span>
          <span className="kpi-alarm-machine">
            {dashboardData.andonAlerts.find(a => a.status === 'active')?.machine}
          </span>
        </div>
      )}

      {/* Filters & Tabs */}
      <div className="kpi-controls">
        <div className="kpi-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`kpi-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="kpi-tab-icon">{tab.icon}</span>
              {tab.label}
              {tab.badge > 0 && (
                <span className="kpi-tab-badge">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
        <div className="kpi-filters">
          <select className="kpi-select" value={dateRange} onChange={e => setDateRange(e.target.value)}>
            <option value="today">วันนี้</option>
            <option value="mtd">MTD (เดือนนี้)</option>
            <option value="ytd">YTD (ปีนี้)</option>
          </select>
          <select className="kpi-select" value={selectedShift} onChange={e => setSelectedShift(e.target.value)}>
            <option value="ALL">ทุก Shift</option>
            <option value="A">Shift A</option>
            <option value="B">Shift B</option>
          </select>
          <select className="kpi-select" value={selectedLine} onChange={e => setSelectedLine(e.target.value)}>
            <option value="ALL">ทุกสายการผลิต</option>
            <option value="forging">Forging</option>
            <option value="machining">Machining</option>
            <option value="assembly">Assembly</option>
          </select>
          <button className="kpi-btn-refresh" onClick={fetchDashboardData} title="Refresh">
            🔄
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="kpi-content">
        {isLoading ? (
          <div className="kpi-loading">
            <div className="kpi-loading-spinner"></div>
            <span>กำลังโหลดข้อมูล...</span>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <KPIOverviewCards
                kpiValues={kpiValues}
                summary={dashboardData.summary}
                claimTargets={CLAIM_TARGETS}
                internalTargets={INTERNAL_TARGETS}
                recentEntries={dashboardData.recentEntries}
                andonAlerts={dashboardData.andonAlerts}
              />
            )}
            {activeTab === 'trends' && (
              <KPITrendCharts dateRange={dateRange} selectedLine={selectedLine} />
            )}
            {activeTab === 'pareto' && (
              <KPIParetoAnalysis dateRange={dateRange} selectedLine={selectedLine} />
            )}
            {activeTab === 'andon' && (
              <KPIAndonBoard alerts={dashboardData.andonAlerts} onRefresh={fetchDashboardData} />
            )}
            {activeTab === 'entry' && (
              <KPIDataEntry onSubmitSuccess={fetchDashboardData} />
            )}
            {activeTab === 'claim' && (
              <KPIClaimEntry onRefresh={fetchDashboardData} />
            )}
            {activeTab === 'report' && (
              <KPIReport />
            )}
            {activeTab === 'edit' && (
              <KPIEditData onRefresh={fetchDashboardData} />
            )}
            {activeTab === 'parts' && (
              <KPIPartMaster />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default KPIDashboard;