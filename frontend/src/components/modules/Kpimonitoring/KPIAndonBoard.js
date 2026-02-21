/**
 * KPIAndonBoard.js — ✅ เชื่อม API จริง + Fallback Mock
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Chart from 'chart.js/auto';
import apiClient from '../../../utils/api';
import { ESCALATION_RULES, getEscalationLevel } from './product_categories';

// ─── Mock Fallback ──────────────────────────────────────────
const MOCK_MACHINE_STATUS = [
  { code: 'CNC-01', name: 'CNC-01', status: 'running', oee: 92, current_part: 'AX-7842-B', today_scrap: 3 },
  { code: 'CNC-02', name: 'CNC-02', status: 'running', oee: 88, current_part: 'BX-1124-A', today_scrap: 5 },
  { code: 'CNC-03', name: 'CNC-03', status: 'warning', oee: 76, current_part: 'AX-7842-B', today_scrap: 8, note: 'Tool Change' },
  { code: 'CNC-04', name: 'CNC-04', status: 'stopped', oee: 0, current_part: 'AX-7842-B', today_scrap: 12, note: 'ANDON STOP' },
  { code: 'CNC-05', name: 'CNC-05', status: 'running', oee: 91, current_part: 'CX-3302-C', today_scrap: 2 },
  { code: 'CNC-06', name: 'CNC-06', status: 'running', oee: 85, current_part: 'DX-5521-A', today_scrap: 4 },
  { code: 'LAT-01', name: 'LAT-01', status: 'running', oee: 89, current_part: 'EX-8813-B', today_scrap: 1 },
  { code: 'LAT-02', name: 'LAT-02', status: 'running', oee: 94, current_part: 'FX-2240-C', today_scrap: 0 },
];

const KPIAndonBoard = ({ alerts = [], onRefresh }) => {
  const [filter, setFilter] = useState('all');
  const timelineChartRef = useRef(null);
  const chartInstance = useRef(null);
  const [dataSource, setDataSource] = useState('loading');

  // ─── Machine Status (API หรือ Mock) ──────────────────────────
  const [machineStatus, setMachineStatus] = useState(MOCK_MACHINE_STATUS);

  useEffect(() => {
    const fetchMachineStatus = async () => {
      try {
        const res = await apiClient.get('/kpi/machines/status');
        const data = res?.data || res;

        if (Array.isArray(data) && data.length > 0) {
          setMachineStatus(data.map(m => ({
            id: m.code || m.id,
            code: m.code,
            name: m.name || m.code,
            status: m.status || 'running',
            oee: Number(m.oee || 0),
            current_part: m.current_part || '—',
            today_scrap: Number(m.today_scrap || 0),
            today_rework: Number(m.today_rework || 0),
            today_produced: Number(m.today_produced || 0),
            note: m.note || null,
          })));
          setDataSource('api');
          console.log('✅ [Andon] Machine status from API');
        } else {
          setDataSource('mock');
        }
      } catch (err) {
        console.warn('⚠️ [Andon] API error, using mock machine status:', err.message);
        setDataSource('mock');
      }
    };

    fetchMachineStatus();
    const interval = setInterval(fetchMachineStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // ─── Filter alerts ────────────────────────────────────────────
  const filteredAlerts = filter === 'all'
    ? alerts
    : alerts.filter(a => a.status === filter);

  const activeCount = alerts.filter(a => a.status === 'active').length;
  const resolvedCount = alerts.filter(a => a.status === 'resolved').length;

  // ─── Determine machine status from alerts ─────────────────────
  const getMachineDisplayStatus = (machine) => {
    // ถ้ามี active alert → stopped
    const hasActiveAlert = alerts.some(a => a.status === 'active' && a.machine === machine.code);
    if (hasActiveAlert) return 'stopped';
    // ถ้า scrap สูง → warning
    if (Number(machine.today_scrap) > 5) return 'warning';
    return machine.status || 'running';
  };

  // ─── Alert Timeline Chart ─────────────────────────────────────
  const createTimelineChart = useCallback(() => {
    const ctx = timelineChartRef.current?.getContext('2d');
    if (!ctx) return;
    if (chartInstance.current) chartInstance.current.destroy();

    // Build hourly data from real alerts
    const hours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    const alertCounts = new Array(12).fill(0);

    alerts.forEach(a => {
      if (a.timestamp) {
        const h = new Date(a.timestamp).getHours();
        const idx = h - 6;
        if (idx >= 0 && idx < 12) alertCounts[idx]++;
      }
    });

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hours,
        datasets: [{
          label: 'Andon Alerts',
          data: alertCounts,
          backgroundColor: alertCounts.map(v => v >= 2 ? '#ef444480' : v >= 1 ? '#f59e0b80' : '#10b98140'),
          borderColor: alertCounts.map(v => v >= 2 ? '#ef4444' : v >= 1 ? '#f59e0b' : '#10b981'),
          borderWidth: 1, borderRadius: 3,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#cbd5e1' },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
          y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 11 }, stepSize: 1 }, beginAtZero: true, title: { display: true, text: 'Alert Count', color: '#64748b', font: { size: 10 } } },
        },
      },
    });
  }, [alerts]);

  useEffect(() => {
    createTimelineChart();
    return () => chartInstance.current?.destroy();
  }, [createTimelineChart]);

  // ─── Helpers ──────────────────────────────────────────────────
  const formatTime = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getResponseTime = (start, end) => {
    if (!start || !end) return '—';
    const diff = (new Date(end) - new Date(start)) / 60000;
    return `${Math.round(diff)} min`;
  };

  // ─── Handle Acknowledge / Resolve ─────────────────────────────
  const handleAcknowledge = async (alertId) => {
    try {
      await apiClient.patch(`/kpi/andon/${alertId}/acknowledge`, {
        acknowledged_by: 'admin',
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Acknowledge failed:', err);
      alert('ไม่สามารถรับทราบ Alert ได้');
    }
  };

  const handleResolve = async (alertId) => {
    const action = prompt('ระบุการแก้ไข:');
    if (!action) return;
    try {
      await apiClient.patch(`/kpi/andon/${alertId}/resolve`, {
        resolved_by: 'admin',
        corrective_action: action,
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Resolve failed:', err);
      alert('ไม่สามารถปิด Alert ได้');
    }
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="kpi-andon">
      {/* Machine Status Grid */}
      <div className="kpi-section">
        <div className="kpi-section__header">
          <h2 className="kpi-section__title">
            <span className="kpi-section__dot" style={{ background: '#10b981' }}></span>
            Machine Status — Real-time
          </h2>
          {dataSource === 'mock' && <span className="kpi-data-badge kpi-data-badge--mock" style={{fontSize:9}}>⚠️ Demo</span>}
          {dataSource === 'api' && <span className="kpi-data-badge kpi-data-badge--live" style={{fontSize:9}}>🟢 Live</span>}
        </div>
        <div className="kpi-machine-grid">
          {machineStatus.map(machine => {
            const displayStatus = getMachineDisplayStatus(machine);
            return (
              <div className={`kpi-machine-card kpi-machine-card--${displayStatus}`} key={machine.code || machine.id}>
                <div className="kpi-machine-card__header">
                  <span className="kpi-machine-card__name">{machine.code || machine.name}</span>
                  <span className={`kpi-machine-card__status-dot kpi-machine-card__status-dot--${displayStatus}`}></span>
                </div>
                <div className="kpi-machine-card__oee">
                  {displayStatus === 'stopped' ? '—' : `${machine.oee || 0}%`}
                </div>
                <div className="kpi-machine-card__label">OEE</div>
                <div className="kpi-machine-card__info">
                  <span>{machine.current_part || '—'}</span>
                  {machine.note && <span className="kpi-machine-card__note">{machine.note}</span>}
                </div>
                <div className="kpi-machine-card__scrap">
                  Scrap: <strong style={{ color: Number(machine.today_scrap) > 5 ? '#ef4444' : '#94a3b8' }}>
                    {machine.today_scrap || 0} pcs
                  </strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alert Timeline + Alert Log */}
      <div className="kpi-andon__row">
        <div className="kpi-panel">
          <div className="kpi-panel__header">
            <h3 className="kpi-panel__title">📊 Alert Timeline — Today</h3>
          </div>
          <div className="kpi-panel__body kpi-panel__chart-container">
            <canvas ref={timelineChartRef}></canvas>
          </div>
        </div>

        <div className="kpi-panel">
          <div className="kpi-panel__header">
            <h3 className="kpi-panel__title">
              📋 Alert Log
              <span style={{ marginLeft: 8, fontSize: 12 }}>
                (🔴 {activeCount} active / ✅ {resolvedCount} resolved)
              </span>
            </h3>
            <div className="kpi-andon__filter-btns">
              {['all', 'active', 'resolved'].map(f => (
                <button
                  key={f}
                  className={`kpi-andon__filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'ทั้งหมด' : f === 'active' ? '🔴 Active' : '✅ Resolved'}
                </button>
              ))}
              <button className="kpi-andon__refresh-btn" onClick={onRefresh}>🔄</button>
            </div>
          </div>
          <div className="kpi-panel__body">
            {filteredAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: 32 }}>
                {filter === 'active' ? '✅ ไม่มี Alert ที่ยังไม่แก้ไข' : 'ไม่มีข้อมูล Alert'}
              </div>
            ) : (
              <div className="kpi-alert-list">
                {filteredAlerts.map(alert => (
                  <div className={`kpi-alert-item kpi-alert-item--${alert.status}`} key={alert.id}>
                    <div className="kpi-alert-item__header">
                      <span className="kpi-alert-item__id">{alert.id}</span>
                      <span className={`kpi-alert-item__level kpi-alert-item__level--${alert.level}`}>
                        Level {alert.level}
                      </span>
                      <span className="kpi-alert-item__machine">{alert.machine}</span>
                      <span className="kpi-alert-item__time">{formatTime(alert.timestamp)}</span>
                    </div>
                    <div className="kpi-alert-item__desc">{alert.description}</div>
                    <div className="kpi-alert-item__footer">
                      <span>👤 {alert.assignee || '—'}</span>
                      {alert.resolvedAt && (
                        <span>✅ แก้ไขใน {getResponseTime(alert.timestamp, alert.resolvedAt)}</span>
                      )}
                      {alert.status === 'active' && (
                        <div className="kpi-alert-item__actions">
                          <button className="kpi-btn-sm kpi-btn-sm--warning" onClick={() => handleAcknowledge(alert.id)}>
                            📋 รับทราบ
                          </button>
                          <button className="kpi-btn-sm kpi-btn-sm--success" onClick={() => handleResolve(alert.id)}>
                            ✅ แก้ไขแล้ว
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPIAndonBoard;