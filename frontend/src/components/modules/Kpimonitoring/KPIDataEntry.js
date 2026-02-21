/**
 * KPIDataEntry.js
 * ================
 * ฟอร์มบันทึกผลตรวจสอบ Good/Scrap/Rework
 * ใช้งานบน Tablet/Touch screen ในสายการผลิต
 */

import React, { useState } from 'react';
import apiClient from '../../../utils/api';
import {
  DEFECT_CODES,
  DISPOSITION_TYPES,
  PRODUCT_LINES,
  SHIFTS,
  getEscalationLevel,
} from './product_categories';

const KPIDataEntry = ({ onSubmitSuccess }) => {
  const [formData, setFormData] = useState({
    machine: '',
    partNumber: '',
    lotNumber: '',
    operator: '',
    inspector: '',
    shift: 'A',
    productLine: '',
    quantity: 1,
    disposition: 'GOOD',
    defectCode: '',
    defectDetail: '',
    measurement: '',
    spec: '',
    remark: '',
  });

  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [consecutiveNG, setConsecutiveNG] = useState(0);
  const [escalationAlert, setEscalationAlert] = useState(null);

  // ─── Machine List ─────────────────────────────────────────────
  const machines = ['Line-cuting', 'Line-1', 'Line-2', 'Line-3', 'Line-4', 'Line-5', 'Line-6', 'Line-7' ,'Line-8', 'Line-PD5', 'Line-Final'];

  // ─── Handle Input Change ──────────────────────────────────────
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Reset defect fields when disposition is GOOD
    if (field === 'disposition' && value === 'GOOD') {
      setFormData(prev => ({
        ...prev,
        disposition: value,
        defectCode: '',
        defectDetail: '',
        measurement: '',
        spec: '',
      }));
    }
  };

  // ─── Handle Submit ────────────────────────────────────────────
  const handleSubmit = async () => {
    // Validation
    if (!formData.machine || !formData.partNumber || !formData.operator) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน: เครื่อง, ชิ้นงาน, ผู้ปฏิบัติงาน');
      return;
    }

    if (formData.disposition !== 'GOOD' && !formData.defectCode) {
      alert('กรุณาเลือก Defect Code สำหรับงานที่ไม่ผ่าน');
      return;
    }

    const entry = {
      machine_code: formData.machine,
      part_number: formData.partNumber,
      lot_number: formData.lotNumber,
      quantity: formData.quantity || 1,
      disposition: formData.disposition,
      defect_code: formData.defectCode || null,
      defect_detail: formData.defectDetail || null,
      measurement: formData.measurement || null,
      spec: formData.spec || null,
      operator_name: formData.operator,
      inspector_name: formData.inspector || null,
      shift: formData.shift || (new Date().getHours() >= 6 && new Date().getHours() < 18 ? 'A' : 'B'),
      product_line_code: formData.productLine || null,
      remark: formData.remark || null,
    };

    try {
      // ✅ เรียก API จริง
      const result = await apiClient.createKPIEntry(entry);
      console.log('✅ Entry saved:', result);

      // Track consecutive NG for Andon
      if (formData.disposition === 'SCRAP') {
        const newCount = consecutiveNG + 1;
        setConsecutiveNG(newCount);

        // Check escalation
        const escalation = getEscalationLevel(newCount, 0);
        if (escalation) {
          setEscalationAlert({
            level: escalation.level,
            label: escalation.label,
            color: escalation.color,
            message: `${newCount} NG ติดกัน — แจ้ง ${escalation.label}`,
            actions: escalation.actions,
          });
        }
      } else {
        setConsecutiveNG(0);
        setEscalationAlert(null);
      }

      // Add to recent submissions (ใช้ข้อมูลจาก API response)
      const savedEntry = result?.data || entry;
      setRecentSubmissions(prev => [{
        ...savedEntry,
        id: savedEntry.id || Date.now(),
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }),
        machine: formData.machine,
        part: formData.partNumber,
        disposition: formData.disposition,
        defect: formData.defectCode || null,
        operator: formData.operator,
      }, ...prev].slice(0, 10));

      // Show confirmation
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 2000);

      // Reset form (keep machine, operator, shift)
      setFormData(prev => ({
        ...prev,
        partNumber: prev.partNumber,
        lotNumber: prev.lotNumber,
        quantity: 1,
        disposition: 'GOOD',
        defectCode: '',
        defectDetail: '',
        measurement: '',
        spec: '',
        remark: '',
      }));

      if (onSubmitSuccess) onSubmitSuccess();
    } catch (error) {
      console.error('Failed to submit entry:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const isDefectEntry = formData.disposition !== 'GOOD';

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="kpi-entry">
      {/* Escalation Alert */}
      {escalationAlert && (
        <div className="kpi-entry__escalation" style={{ borderColor: escalationAlert.color }}>
          <div className="kpi-entry__escalation-header">
            <span className="kpi-entry__escalation-icon">🚨</span>
            <strong style={{ color: escalationAlert.color }}>
              ANDON Level {escalationAlert.level}: {escalationAlert.message}
            </strong>
          </div>
          <div className="kpi-entry__escalation-actions">
            {escalationAlert.actions.map((action, i) => (
              <span key={i} className="kpi-entry__escalation-tag">{action}</span>
            ))}
          </div>
        </div>
      )}

      {/* Success Confirmation */}
      {showConfirmation && (
        <div className="kpi-entry__confirmation">
          <span className="kpi-entry__confirmation-icon">✅</span>
          บันทึกสำเร็จ!
        </div>
      )}

      <div className="kpi-entry__layout">
        {/* Entry Form */}
        <div className="kpi-panel kpi-entry__form-panel">
          <div className="kpi-panel__header">
            <h3 className="kpi-panel__title">📝 บันทึกผลตรวจสอบ</h3>
            <span className="kpi-panel__header-note">
              NG ติดกัน: <strong style={{ color: consecutiveNG >= 3 ? '#ef4444' : '#94a3b8' }}>{consecutiveNG}</strong>
            </span>
          </div>
          <div className="kpi-panel__body">
            {/* Row 1: Basic Info */}
            <div className="kpi-form-grid kpi-form-grid--4">
              <div className="kpi-form-group">
                <label className="kpi-form-label">เครื่องจักร *</label>
                <select
                  className="kpi-form-input"
                  value={formData.machine}
                  onChange={e => handleChange('machine', e.target.value)}
                >
                  <option value="">เลือกเครื่อง</option>
                  {machines.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="kpi-form-group">
                <label className="kpi-form-label">ชิ้นงาน (Part No.) *</label>
                <input
                  className="kpi-form-input"
                  type="text"
                  placeholder="e.g. AX-7842-B"
                  value={formData.partNumber}
                  onChange={e => handleChange('partNumber', e.target.value)}
                />
              </div>
              <div className="kpi-form-group">
                <label className="kpi-form-label">Lot No.</label>
                <input
                  className="kpi-form-input"
                  type="text"
                  placeholder="e.g. LOT-2026-0207-A"
                  value={formData.lotNumber}
                  onChange={e => handleChange('lotNumber', e.target.value)}
                />
              </div>
              <div className="kpi-form-group">
                <label className="kpi-form-label">จำนวน</label>
                <input
                  className="kpi-form-input"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={e => handleChange('quantity', parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            {/* Row 2: Personnel */}
            <div className="kpi-form-grid kpi-form-grid--3">
              <div className="kpi-form-group">
                <label className="kpi-form-label">ผู้ปฏิบัติงาน *</label>
                <input
                  className="kpi-form-input"
                  type="text"
                  placeholder="ชื่อ Operator"
                  value={formData.operator}
                  onChange={e => handleChange('operator', e.target.value)}
                />
              </div>
              <div className="kpi-form-group">
                <label className="kpi-form-label">ผู้ตรวจสอบ</label>
                <input
                  className="kpi-form-input"
                  type="text"
                  placeholder="ชื่อ Inspector"
                  value={formData.inspector}
                  onChange={e => handleChange('inspector', e.target.value)}
                />
              </div>
              <div className="kpi-form-group">
                <label className="kpi-form-label">สายการผลิต</label>
                <select
                  className="kpi-form-input"
                  value={formData.productLine}
                  onChange={e => handleChange('productLine', e.target.value)}
                >
                  <option value="">เลือกสายการผลิต</option>
                  {PRODUCT_LINES.map(pl => (
                    <option key={pl.id} value={pl.id}>{pl.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Disposition (Big Buttons) */}
            <div className="kpi-form-group">
              <label className="kpi-form-label">ผลการตรวจสอบ *</label>
              <div className="kpi-disposition-buttons">
                {Object.values(DISPOSITION_TYPES).map(disp => (
                  <button
                    key={disp.id}
                    className={`kpi-disposition-btn ${formData.disposition === disp.id ? 'active' : ''}`}
                    style={formData.disposition === disp.id
                      ? { background: `${disp.color}20`, borderColor: disp.color, color: disp.color }
                      : {}
                    }
                    onClick={() => handleChange('disposition', disp.id)}
                  >
                    {disp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 4: Defect Details (shown when NOT good) */}
            {isDefectEntry && (
              <div className="kpi-form-defect-section">
                <div className="kpi-form-grid kpi-form-grid--2">
                  <div className="kpi-form-group">
                    <label className="kpi-form-label">Defect Code *</label>
                    <select
                      className="kpi-form-input kpi-form-input--error"
                      value={formData.defectCode}
                      onChange={e => handleChange('defectCode', e.target.value)}
                    >
                      <option value="">เลือกรหัสข้อบกพร่อง</option>
                      {DEFECT_CODES.map(dc => (
                        <option key={dc.code} value={dc.code}>
                          {dc.code} — {dc.name} ({dc.nameEn})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="kpi-form-group">
                    <label className="kpi-form-label">รายละเอียดเพิ่มเติม</label>
                    <input
                      className="kpi-form-input"
                      type="text"
                      placeholder="e.g. OD เกิน +0.012"
                      value={formData.defectDetail}
                      onChange={e => handleChange('defectDetail', e.target.value)}
                    />
                  </div>
                </div>
                <div className="kpi-form-grid kpi-form-grid--2">
                  <div className="kpi-form-group">
                    <label className="kpi-form-label">ค่าวัดจริง</label>
                    <input
                      className="kpi-form-input"
                      type="text"
                      placeholder="e.g. ∅42.012"
                      value={formData.measurement}
                      onChange={e => handleChange('measurement', e.target.value)}
                    />
                  </div>
                  <div className="kpi-form-group">
                    <label className="kpi-form-label">ค่า Spec</label>
                    <input
                      className="kpi-form-input"
                      type="text"
                      placeholder="e.g. ∅42.000 ±0.005"
                      value={formData.spec}
                      onChange={e => handleChange('spec', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Remark */}
            <div className="kpi-form-group">
              <label className="kpi-form-label">หมายเหตุ</label>
              <textarea
                className="kpi-form-input kpi-form-textarea"
                rows={2}
                placeholder="หมายเหตุเพิ่มเติม..."
                value={formData.remark}
                onChange={e => handleChange('remark', e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <div className="kpi-form-actions">
              <button
                className="kpi-form-submit"
                onClick={handleSubmit}
                style={{
                  background: DISPOSITION_TYPES[formData.disposition]?.color || '#10b981'
                }}
              >
                ✓ บันทึก {DISPOSITION_TYPES[formData.disposition]?.label}
              </button>
              <button
                className="kpi-form-reset"
                onClick={() => setFormData(prev => ({
                  ...prev, disposition: 'GOOD', defectCode: '', defectDetail: '',
                  measurement: '', spec: '', remark: '', quantity: 1,
                }))}
              >
                ↺ รีเซ็ต
              </button>
            </div>
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="kpi-panel kpi-entry__recent-panel">
          <div className="kpi-panel__header">
            <h3 className="kpi-panel__title">📋 บันทึกล่าสุด</h3>
            <span className="kpi-panel__header-note">{recentSubmissions.length} รายการ</span>
          </div>
          <div className="kpi-panel__body">
            {recentSubmissions.length === 0 ? (
              <div className="kpi-entry__empty">
                <span>ยังไม่มีรายการบันทึก</span>
                <span className="kpi-entry__empty-sub">บันทึกผลตรวจสอบจากฟอร์มด้านซ้าย</span>
              </div>
            ) : (
              <div className="kpi-entry__recent-list">
                {recentSubmissions.map(entry => {
                  const disp = DISPOSITION_TYPES[entry.disposition];
                  const defect = DEFECT_CODES.find(d => d.code === entry.defectCode);
                  return (
                    <div
                      className={`kpi-entry__recent-item kpi-entry__recent-item--${entry.disposition.toLowerCase()}`}
                      key={entry.id}
                    >
                      <div className="kpi-entry__recent-time">{entry.time}</div>
                      <div className="kpi-entry__recent-content">
                        <div className="kpi-entry__recent-top">
                          <span className="kpi-entry__recent-machine">{entry.machine}</span>
                          <span
                            className="kpi-entry__recent-badge"
                            style={{ background: `${disp.color}20`, color: disp.color, borderColor: `${disp.color}40` }}
                          >
                            {disp.label}
                          </span>
                        </div>
                        <div className="kpi-entry__recent-part">{entry.partNumber}</div>
                        {defect && (
                          <div className="kpi-entry__recent-defect">
                            {defect.code} — {defect.name}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPIDataEntry;