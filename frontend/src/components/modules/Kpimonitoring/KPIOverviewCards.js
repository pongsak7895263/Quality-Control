/**
 * KPIOverviewCards.js
 * ===================
 * KPI Cards — คลิกดูรายละเอียดได้
 * - External Claims (PPM) → คลิกดู claims summary
 * - Internal Quality (%) → คลิกดู rework/scrap by part + defect codes
 */

import React, { useState } from 'react';
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

const KPIOverviewCards = ({
  kpiValues, summary, claimTargets, internalTargets,
  recentEntries, andonAlerts,
  detail = [], defects = [], claimsData = {}, internalData = {},
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'ผลิตทั้งหมด', value: tot, c: '#e2e8f0' },
              { label: isRework ? 'Rework' : 'Scrap', value: cnt, c: color },
              { label: '%', value: tot > 0 ? ((cnt / tot) * 100).toFixed(2) + '%' : '0%', c: color },
              { label: 'Target', value: `< ${selectedCard.config.target}%`, c: '#10b981' },
            ].map((item, i) => (
              <div key={i} style={{ padding: 10, background: '#1e293b', borderRadius: 6, textAlign: 'center', borderLeft: `3px solid ${item.c}` }}>
                <div style={{ color: '#64748b', fontSize: 10 }}>{item.label}</div>
                <div style={{ color: item.c, fontSize: 16, fontWeight: 700 }}>
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
                      {['Part No.', 'Name', 'Line', 'ผลิต', isRework ? 'Rework' : 'Scrap', '%'].map(h =>
                        <th key={h} style={{ padding: '5px', color: '#64748b', textAlign: 'left', fontSize: 10 }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDetail.filter(d => Number(d[dataKey]) > 0).map((d, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '5px', fontWeight: 600, color: '#3b82f6' }}>{d.part_number}</td>
                        <td style={{ padding: '5px', color: '#e2e8f0', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.part_name || '—'}</td>
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
      {/* Summary Strip */}
      <div className="kpi-summary-strip">
        {[
          { label: 'ผลิตทั้งหมด', value: summary.totalProduced, unit: 'ชิ้น', cls: '' },
          { label: 'ผ่าน (Good)', value: summary.totalGood, unit: 'ชิ้น', cls: 'kpi-summary-value--good' },
          { label: 'ซ่อม (Rework)', value: summary.totalRework, unit: 'ชิ้น', cls: 'kpi-summary-value--rework' },
          { label: 'ทิ้ง (Scrap)', value: summary.totalScrap, unit: 'ชิ้น', cls: 'kpi-summary-value--scrap' },
          { label: 'First Pass Yield', value: summary.firstPassYield, unit: '%', cls: 'kpi-summary-value--good' },
        ].map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="kpi-summary-divider"></div>}
            <div className="kpi-summary-item">
              <span className="kpi-summary-label">{item.label}</span>
              <span className={`kpi-summary-value ${item.cls}`}>
                {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
              </span>
              {item.unit !== '%' && <span className="kpi-summary-unit">{item.unit}</span>}
            </div>
          </React.Fragment>
        ))}
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