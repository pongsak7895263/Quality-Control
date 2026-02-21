/**
 * KPIDashboard.js
 * ===============
 * ระบบ Dashboard หลักสำหรับ KPI Monitoring
 * ปรับปรุง: เพิ่มประสิทธิภาพการ Render และจัดการ Clean Code
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import KPIOverviewCards from './KPIOverviewCards';
import KPITrendCharts from './KPITrendCharts';
import KPIParetoAnalysis from './KPIParetoAnalysis';
import KPIAndonBoard from './KPIAndonBoard';
import KPIDataEntry from './KPIDataEntry';

import apiClient from '../../../utils/api';
import { calculatePPM, calculatePercent } from '../../../utils/calculations';
import {
  CLAIM_TARGETS as _CLAIM_TARGETS,
  INTERNAL_TARGETS as _INTERNAL_TARGETS,
} from './product_categories';
import './KPIMonitoring.css';

// ─── CONSTANTS ──────────────────────────────────────────────
const REFRESH_INTERVAL = 30000; // 30 seconds

const SHIFTS = {
  A: { id: 'A', label: 'Shift A (Day)', start: '06:00', end: '18:00' },
  B: { id: 'B', label: 'Shift B (Night)', start: '18:00', end: '06:00' },
};

const DEFAULT_DASHBOARD_STATE = {
  summary: { totalProduced: 0, totalGood: 0, totalRework: 0, totalScrap: 0, firstPassYield: 0 },
  claims: { automotive: { actual: 0, shipped: 0 }, industrial: { actual: 0, shipped: 0 }, machining: { actual: 0, shipped: 0 } },
  internal: { productionRework: { count: 0, total: 0 }, machiningRework: { count: 0, total: 0 }, productionScrap: { count: 0, total: 0 } },
  andonAlerts: [],
  recentEntries: [],
};

// ─── HELPERS ────────────────────────────────────────────────
const getCurrentShift = (date) => {
  const hour = date.getHours();
  return (hour >= 6 && hour < 18) ? SHIFTS.A : SHIFTS.B;
};

// ใช้ transformApiData เดิมที่คุณเขียนไว้ (ซึ่งทำมาดีมากแล้ว)
const transformApiData = (dashboardRes, valuesRes) => {
  const s = dashboardRes?.summary || {};
  const totalProduced = Number(s.total_produced || s.totalProduced || 0);
  const totalRework   = Number(s.total_rework || s.totalRework || 0);
  const totalScrap    = Number(s.total_scrap || s.totalScrap || 0);
  const totalGood     = Number(s.total_good || s.totalGood || 0) || (totalProduced - totalRework - totalScrap);
  const fpy           = Number(s.first_pass_yield || s.firstPassYield || 0)
                        || (totalProduced > 0 ? ((totalGood / totalProduced) * 100).toFixed(2) : 0);

  const claimsArr = valuesRes?.claims || [];
  const claimsMap = {};
  claimsArr.forEach(c => {
    claimsMap[c.claim_category] = { actual: Number(c.total_defects || 0), shipped: Number(c.total_shipped || 0) };
  });

  const internalArr = valuesRes?.internal || [];
  let prodRework = { count: 0, total: 0 }, machRework = { count: 0, total: 0 }, prodScrap = { count: 0, total: 0 };

  internalArr.forEach(item => {
    const total = Number(item.total || 0);
    const rework = Number(item.rework_qty || 0);
    const scrap = Number(item.scrap_qty || 0);
    if (item.group_name === 'machining') {
      machRework = { count: rework, total };
    } else {
      prodRework = { count: prodRework.count + rework, total: prodRework.total + total };
      prodScrap = { count: prodScrap.count + scrap, total: prodScrap.total + total };
    }
  });

  return {
    summary: { totalProduced, totalGood, totalRework, totalScrap, firstPassYield: fpy },
    claims: {
      automotive: claimsMap.automotive || { actual: 0, shipped: 0 },
      industrial: claimsMap.industrial || { actual: 0, shipped: 0 },
      machining:  claimsMap.machining  || { actual: 0, shipped: 0 },
    },
    internal: { productionRework: prodRework, machiningRework: machRework, productionScrap: prodScrap },
    andonAlerts: (dashboardRes?.andonAlerts || []).map(a => ({
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
    })),
    recentEntries: (dashboardRes?.recentEntries || []).map((e, idx) => ({
        id: e.id || idx,
        time: e.inspected_at ? new Date(e.inspected_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : (e.time || ''),
        machine: e.machine_code || e.machine || '',
        part: e.part_number || e.part || '',
        disposition: e.disposition,
        defect: e.defect_code || e.defect || null,
        operator: e.operator_name || e.operator || '',
    })),
  };
};

const KPIDashboard = () => {
  // ─── STATE ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('mtd');
  const [selectedShift, setSelectedShift] = useState('ALL');
  const [selectedLine, setSelectedLine] = useState('ALL');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState('loading'); 
  const [dashboardData, setDashboardData] = useState(DEFAULT_DASHBOARD_STATE);

  // ─── CLOCK ──────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── DATA FETCHING ──────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    if (activeTab === 'entry') return; // ป้องกันการรีเฟรชขณะคีย์ข้อมูล
    
    setIsLoading(true);
    try {
      const [dashRes, valsRes, alertsRes, entriesRes] = await Promise.allSettled([
        apiClient.get('/kpi/dashboard', { params: { dateRange, shift: selectedShift, line: selectedLine } }),
        apiClient.get('/kpi/values', { params: { dateRange } }),
        apiClient.get('/kpi/andon', { params: { status: 'all' } }),
        apiClient.get('/kpi/entries', { params: { limit: 15 } }),
      ]);

      const dashData  = dashRes.status === 'fulfilled' ? (dashRes.value?.data?.data || dashRes.value?.data) : null;
      const valsData  = valsRes.status === 'fulfilled' ? (valsRes.value?.data?.data || valsRes.value?.data) : null;

      if (dashData || valsData) {
        const combined = {
          summary: dashData?.summary || {},
          andonAlerts: alertsRes.status === 'fulfilled' ? (alertsRes.value?.data?.data || alertsRes.value?.data) : [],
          recentEntries: entriesRes.status === 'fulfilled' ? (entriesRes.value?.data?.data || entriesRes.value?.data) : [],
        };
        setDashboardData(transformApiData(combined, valsData || {}));
        setDataSource('api');
      } else {
        throw new Error('Using Mock Data');
      }
    } catch (err) {
      console.warn('⚠️ [KPI] Falling back to Mock:', err.message);
      // setDashboardData(MOCK_DATA); // ใส่ MOCK_DATA ที่คุณมี
      setDataSource('mock');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, selectedShift, selectedLine, activeTab]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // ─── MEMOIZED VALUES ────────────────────────────────────────
  const kpiValues = useMemo(() => ({
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
  }), [dashboardData]);

  const activeAlerts = useMemo(() => 
    dashboardData.andonAlerts.filter(a => a.status === 'active'), 
    [dashboardData.andonAlerts]
  );

  const currentShift = useMemo(() => getCurrentShift(currentTime), [currentTime.getHours()]);

  // ─── RENDER HELPERS ──────────────────────────────────────────
  const tabs = [
    { id: 'overview', label: 'ภาพรวม KPI', icon: '📊' },
    { id: 'trends', label: 'แนวโน้ม', icon: '📈' },
    { id: 'pareto', label: 'Pareto Analysis', icon: '📉' },
    { id: 'andon', label: 'Andon Board', icon: '🚨', badge: activeAlerts.length },
    { id: 'entry', label: 'บันทึกข้อมูล', icon: '📝' },
  ];

  return (
    <div className="kpi-dashboard">
      {/* Header Bar */}
      <header className="kpi-header-bar">
        <div className="kpi-header-left">
          <h1 className="kpi-page-title">
            <span className="kpi-page-icon">📊</span>
            KPI Monitoring <span className="hide-mobile">— Good/Scrap Management</span>
          </h1>
          <div className="kpi-shift-badge">
            <span className="kpi-shift-dot"></span>
            {currentShift.label}
          </div>
        </div>

        <div className="kpi-header-right">
          <span className={`kpi-data-badge kpi-data-badge--${dataSource}`}>
            {dataSource === 'api' ? '🟢 Live' : '⚠️ Demo Mode'}
          </span>
          <div className="kpi-datetime">
            <span className="kpi-clock">{currentTime.toLocaleTimeString('th-TH', { hour12: false })}</span>
            <span className="kpi-date">{currentTime.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
      </header>

      {/* Andon Alert Banner */}
      {activeAlerts.length > 0 && (
        <div className="kpi-alarm-banner" onClick={() => setActiveTab('andon')}>
          <span className="kpi-alarm-pulse"></span>
          <span className="kpi-alarm-text">
            <strong>ANDON ALERT:</strong> {activeAlerts[0].description} 
          </span>
          <span className="kpi-alarm-machine">[{activeAlerts[0].machine}]</span>
        </div>
      )}

      {/* Controls: Tabs & Filters */}
      <nav className="kpi-controls">
        <div className="kpi-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`kpi-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="kpi-tab-icon">{tab.icon}</span>
              <span className="kpi-tab-label">{tab.label}</span>
              {tab.badge > 0 && <span className="kpi-tab-badge">{tab.badge}</span>}
            </button>
          ))}
        </div>

        <div className="kpi-filters">
          <select className="kpi-select" value={dateRange} onChange={e => setDateRange(e.target.value)}>
            <option value="today">วันนี้</option>
            <option value="mtd">MTD</option>
            <option value="ytd">YTD</option>
          </select>
          <select className="kpi-select" value={selectedShift} onChange={e => setSelectedShift(e.target.value)}>
            <option value="ALL">ทุก Shift</option>
            <option value="A">Shift A</option>
            <option value="B">Shift B</option>
          </select>
          <button className="kpi-btn-refresh" onClick={fetchDashboardData} disabled={isLoading}>
            {isLoading ? '...' : '🔄'}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="kpi-content">
        {isLoading && dataSource === 'loading' ? (
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
                claimTargets={_CLAIM_TARGETS}
                internalTargets={_INTERNAL_TARGETS}
                recentEntries={dashboardData.recentEntries}
                andonAlerts={dashboardData.andonAlerts}
              />
            )}
            {activeTab === 'trends' && <KPITrendCharts dateRange={dateRange} selectedLine={selectedLine} />}
            {activeTab === 'pareto' && <KPIParetoAnalysis dateRange={dateRange} selectedLine={selectedLine} />}
            {activeTab === 'andon' && <KPIAndonBoard alerts={dashboardData.andonAlerts} onRefresh={fetchDashboardData} />}
            {activeTab === 'entry' && <KPIDataEntry onSubmitSuccess={fetchDashboardData} />}
          </>
        )}
      </main>
    </div>
  );
};

export default KPIDashboard;