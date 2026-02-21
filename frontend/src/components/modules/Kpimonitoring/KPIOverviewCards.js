/**
 * KPIOverviewCards.js
 * ===================
 * แสดง KPI Cards ทั้ง External Claims (PPM) และ Internal Quality (%)
 * พร้อม Summary, Recent Entries, Machine Status
 */

import React from 'react';
import {
  getKpiStatus as _getKpiStatus,
  DISPOSITION_TYPES as _DISPOSITION_TYPES,
  ESCALATION_RULES as _ESCALATION_RULES,
} from './product_categories';

// Safe fallbacks
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

const KPIOverviewCards = ({
  kpiValues,
  summary,
  claimTargets,
  internalTargets,
  recentEntries,
  andonAlerts,
}) => {

  // ─── Render KPI Card ──────────────────────────────────────────
  const renderKpiCard = (config, actualValue) => {
    const status = getKpiStatus(actualValue, config.target, config.unit);
    const ratio = Math.min((actualValue / config.target) * 100, 150);

    return (
      <div className={`kpi-card kpi-card--${status.status}`} key={config.id}>
        <div className="kpi-card__top-bar" style={{ background: status.color }}></div>
        <div className="kpi-card__header">
          <div>
            <span className="kpi-card__icon">{config.icon}</span>
            <span className="kpi-card__label">{config.label}</span>
          </div>
          <span
            className="kpi-card__status-badge"
            style={{
              background: `${status.color}18`,
              color: status.color,
              borderColor: `${status.color}40`,
            }}
          >
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
          <div
            className="kpi-card__progress-fill"
            style={{
              width: `${Math.min(ratio, 100)}%`,
              background: ratio > 100
                ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                : `linear-gradient(90deg, ${status.color}, ${status.color}cc)`,
            }}
          ></div>
          {ratio > 100 && (
            <div
              className="kpi-card__progress-over"
              style={{ width: `${Math.min(ratio - 100, 50)}%` }}
            ></div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="kpi-overview">
      {/* ─── Summary Strip ───────────────────────────────────── */}
      <div className="kpi-summary-strip">
        <div className="kpi-summary-item">
          <span className="kpi-summary-label">ผลิตทั้งหมด</span>
          <span className="kpi-summary-value">{summary.totalProduced.toLocaleString()}</span>
          <span className="kpi-summary-unit">ชิ้น</span>
        </div>
        <div className="kpi-summary-divider"></div>
        <div className="kpi-summary-item">
          <span className="kpi-summary-label">ผ่าน (Good)</span>
          <span className="kpi-summary-value kpi-summary-value--good">
            {summary.totalGood.toLocaleString()}
          </span>
          <span className="kpi-summary-unit">ชิ้น</span>
        </div>
        <div className="kpi-summary-divider"></div>
        <div className="kpi-summary-item">
          <span className="kpi-summary-label">ซ่อม (Rework)</span>
          <span className="kpi-summary-value kpi-summary-value--rework">
            {summary.totalRework.toLocaleString()}
          </span>
          <span className="kpi-summary-unit">ชิ้น</span>
        </div>
        <div className="kpi-summary-divider"></div>
        <div className="kpi-summary-item">
          <span className="kpi-summary-label">ทิ้ง (Scrap)</span>
          <span className="kpi-summary-value kpi-summary-value--scrap">
            {summary.totalScrap.toLocaleString()}
          </span>
          <span className="kpi-summary-unit">ชิ้น</span>
        </div>
        <div className="kpi-summary-divider"></div>
        <div className="kpi-summary-item">
          <span className="kpi-summary-label">First Pass Yield</span>
          <span className="kpi-summary-value kpi-summary-value--good">
            {summary.firstPassYield}%
          </span>
        </div>
      </div>

      {/* ─── External Claims (PPM) ───────────────────────────── */}
      <div className="kpi-section">
        <div className="kpi-section__header">
          <h2 className="kpi-section__title">
            <span className="kpi-section__dot" style={{ background: '#3b82f6' }}></span>
            External Customer Claims (PPM)
          </h2>
          <span className="kpi-section__subtitle">ค่า Claim จากลูกค้าภายนอก</span>
        </div>
        <div className="kpi-cards-grid kpi-cards-grid--3">
          {Object.entries(claimTargets).map(([key, config]) =>
            renderKpiCard(config, kpiValues.claims[key])
          )}
        </div>
      </div>

      {/* ─── Internal Quality (%) ────────────────────────────── */}
      <div className="kpi-section">
        <div className="kpi-section__header">
          <h2 className="kpi-section__title">
            <span className="kpi-section__dot" style={{ background: '#a78bfa' }}></span>
            Internal Quality Metrics (%)
          </h2>
          <span className="kpi-section__subtitle">คุณภาพภายในกระบวนการ</span>
        </div>
        <div className="kpi-cards-grid kpi-cards-grid--3">
          {Object.entries(internalTargets).map(([key, config]) =>
            renderKpiCard(config, kpiValues.internal[key])
          )}
        </div>
      </div>

      {/* ─── Bottom Row: Recent + Escalation ─────────────────── */}
      <div className="kpi-bottom-grid">
        {/* Recent Entries */}
        <div className="kpi-panel">
          <div className="kpi-panel__header">
            <h3 className="kpi-panel__title">📋 รายการล่าสุด (Real-time)</h3>
          </div>
          <div className="kpi-panel__body">
            <table className="kpi-table">
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th>เครื่อง</th>
                  <th>ชิ้นงาน</th>
                  <th>ผลตรวจ</th>
                  <th>ข้อบกพร่อง</th>
                  <th>ผู้ตรวจ</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map(entry => {
                  const disp = DISPOSITION_TYPES[entry.disposition];
                  return (
                    <tr key={entry.id} className={entry.disposition === 'SCRAP' ? 'kpi-table__row--alert' : ''}>
                      <td className="kpi-table__mono">{entry.time}</td>
                      <td className="kpi-table__mono">{entry.machine}</td>
                      <td className="kpi-table__mono">{entry.part}</td>
                      <td>
                        <span
                          className="kpi-table__badge"
                          style={{ background: `${disp.color}18`, color: disp.color, borderColor: `${disp.color}40` }}
                        >
                          {disp.label}
                        </span>
                      </td>
                      <td>{entry.defect || '—'}</td>
                      <td>{entry.operator}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Escalation Matrix */}
        <div className="kpi-panel">
          <div className="kpi-panel__header">
            <h3 className="kpi-panel__title">🚨 Escalation Matrix</h3>
          </div>
          <div className="kpi-panel__body">
            {Object.values(ESCALATION_RULES).map(rule => (
              <div className="kpi-escalation-item" key={rule.level} style={{ borderLeftColor: rule.color }}>
                <div className="kpi-escalation-item__header">
                  <strong>Level {rule.level} — {rule.label}</strong>
                  <span className="kpi-escalation-item__time">
                    Response: &lt; {rule.responseMinutes} min
                  </span>
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