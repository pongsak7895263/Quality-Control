/**
 * KPIDataEntry.js — ✅ ระบบบันทึกผลผลิตและของเสีย (ฉบับสมบูรณ์)
 */

import React, { useState, useEffect } from 'react';
import apiClient from '../../../utils/api';
import {
  DEFECT_CODES,
  SHIFTS,
  getEscalationLevel,
} from './product_categories';

const KPIDataEntry = ({ onSubmitSuccess }) => {
  const [lines, setLines] = useState([]);
  const [formData, setFormData] = useState({
    line: '', partNumber: '', lotNumber: '',
    shift: new Date().getHours() >= 6 && new Date().getHours() < 18 ? 'A' : 'B',
    operator: '', inspector: '', productLine: '',
    totalProduced: '', goodQty: '',
    reworkQty: '', reworkGoodQty: '', reworkScrapQty: '',
    scrapQty: '', remark: '',
  });
  const [defectItems, setDefectItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [errors, setErrors] = useState({});

  // ─── Fetch Lines ──────────────────────────────────────────────
  useEffect(() => {
    const fetchLines = async () => {
      try {
        const res = await apiClient.get('/kpi/machines/status');
        const data = res?.data || res;
        if (Array.isArray(data) && data.length > 0) {
          setLines(data.map(m => ({ code: m.code, name: m.name || m.code })));
        } else { throw new Error('empty'); }
      } catch {
        setLines(Array.from({ length: 8 }, (_, i) => ({ code: `Line-${i + 1}`, name: `สายการผลิต ${i + 1}` })));
      }
    };
    fetchLines();
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  // ─── Calculations ─────────────────────────────────────────────
  const totalProduced = parseInt(formData.totalProduced) || 0;
  const goodQty = parseInt(formData.goodQty) || 0;
  const reworkQty = parseInt(formData.reworkQty) || 0;
  const scrapQty = parseInt(formData.scrapQty) || 0;
  const reworkGoodQty = parseInt(formData.reworkGoodQty) || 0;
  const reworkScrapQty = parseInt(formData.reworkScrapQty) || 0;
  const reworkPendingQty = Math.max(0, reworkQty - reworkGoodQty - reworkScrapQty);
  const finalGoodQty = goodQty + reworkGoodQty;
  const finalRejectQty = scrapQty + reworkScrapQty;
  const totalAccountedFor = goodQty + reworkQty + scrapQty;
  const remainingQty = totalProduced - totalAccountedFor;
  const goodPct = totalProduced > 0 ? ((finalGoodQty / totalProduced) * 100).toFixed(2) : '0.00';
  const rejectPct = totalProduced > 0 ? ((finalRejectQty / totalProduced) * 100).toFixed(2) : '0.00';
  const reworkPct = totalProduced > 0 ? ((reworkQty / totalProduced) * 100).toFixed(2) : '0.00';
  const isBalanced = totalProduced > 0 && totalAccountedFor === totalProduced;

  // ─── Defect Management ────────────────────────────────────────
  const addDefectItem = () => {
    setDefectItems(prev => [...prev, {
      id: Date.now(), defectCode: '', defectType: 'rework', quantity: 1,
      measurement: '', specValue: '', detail: '', reworkResult: 'pending',
    }]);
  };
  const updateDefectItem = (id, field, value) => {
    setDefectItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  const removeDefectItem = (id) => { setDefectItems(prev => prev.filter(item => item.id !== id)); };

  useEffect(() => {
    if (defectItems.length > 0) {
      const rw = defectItems.filter(d => d.defectType === 'rework').reduce((s, d) => s + (parseInt(d.quantity) || 0), 0);
      const sc = defectItems.filter(d => d.defectType === 'scrap').reduce((s, d) => s + (parseInt(d.quantity) || 0), 0);
      const rwGood = defectItems.filter(d => d.defectType === 'rework' && d.reworkResult === 'good').reduce((s, d) => s + (parseInt(d.quantity) || 0), 0);
      const rwScrap = defectItems.filter(d => d.defectType === 'rework' && d.reworkResult === 'scrap').reduce((s, d) => s + (parseInt(d.quantity) || 0), 0);
      setFormData(prev => ({ ...prev, reworkQty: rw.toString(), scrapQty: sc.toString(), reworkGoodQty: rwGood.toString(), reworkScrapQty: rwScrap.toString() }));
    }
  }, [defectItems]);

  const handleAutoCalcGood = () => {
    if (totalProduced > 0) {
      const calc = totalProduced - reworkQty - scrapQty;
      if (calc >= 0) setFormData(prev => ({ ...prev, goodQty: calc.toString() }));
    }
  };

  // ─── Validate & Submit ────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!formData.line) errs.line = 'กรุณาเลือก Line';
    if (!formData.partNumber) errs.partNumber = 'กรุณาระบุ Part No.';
    if (!formData.operator) errs.operator = 'กรุณาระบุผู้ปฏิบัติงาน';
    if (!totalProduced || totalProduced <= 0) errs.totalProduced = 'กรุณาระบุยอดผลิต';
    if (totalAccountedFor > totalProduced) errs.balance = `ยอดรวม (${totalAccountedFor}) > ยอดผลิต (${totalProduced})`;
    defectItems.forEach((d, i) => { if (!d.defectCode) errs[`defect_${i}`] = `กรุณาเลือก Defect Code`; });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        machine_code: formData.line, part_number: formData.partNumber,
        lot_number: formData.lotNumber || null, shift: formData.shift,
        operator_name: formData.operator, inspector_name: formData.inspector || null,
        product_line_code: formData.productLine || null,
        total_produced: totalProduced, good_qty: goodQty,
        rework_qty: reworkQty, scrap_qty: scrapQty,
        rework_good_qty: reworkGoodQty, rework_scrap_qty: reworkScrapQty,
        rework_pending_qty: reworkPendingQty, remark: formData.remark || null,
        defect_items: defectItems.map(d => ({
          defect_code: d.defectCode, defect_type: d.defectType,
          quantity: parseInt(d.quantity) || 1, measurement: d.measurement || null,
          spec_value: d.specValue || null, detail: d.detail || null,
          rework_result: d.defectType === 'rework' ? d.reworkResult : null,
        })),
      };
      const result = await apiClient.post('/kpi/production', payload);
      console.log('✅ Production saved:', result);

      setRecentSubmissions(prev => [{ line: formData.line, part: formData.partNumber, shift: formData.shift,
        total: totalProduced, good: finalGoodQty, reject: finalRejectQty, goodPct,
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }),
      }, ...prev].slice(0, 10));

      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3000);
      setFormData(prev => ({ ...prev, partNumber: '', lotNumber: '', totalProduced: '', goodQty: '',
        reworkQty: '', reworkGoodQty: '', reworkScrapQty: '', scrapQty: '', remark: '' }));
      setDefectItems([]);
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (error) {
      console.error('Failed:', error);
      alert('❌ ' + (error.message || 'ไม่สามารถบันทึกได้'));
    } finally { setSubmitting(false); }
  };

  const handleReset = () => {
    setFormData(prev => ({ line: prev.line, partNumber: '', lotNumber: '', shift: prev.shift,
      operator: prev.operator, inspector: prev.inspector, productLine: '', totalProduced: '',
      goodQty: '', reworkQty: '', reworkGoodQty: '', reworkScrapQty: '', scrapQty: '', remark: '' }));
    setDefectItems([]); setErrors({});
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="kpi-data-entry">
      {showConfirmation && (
        <div className="kpi-confirmation-overlay">
          <div className="kpi-confirmation-card">
            <div style={{ fontSize: 48 }}>✅</div>
            <h3>บันทึกสำเร็จ!</h3>
            <p>ยอดผลิต {totalProduced} ชิ้น | งานดี {goodPct}%</p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* ─── Left: Form ──────────────────────────────────── */}
        <div style={{ flex: 2 }}>
          {/* ข้อมูลการผลิต */}
          <div className="kpi-panel">
            <div className="kpi-panel__header"><h3 className="kpi-panel__title">📋 ข้อมูลการผลิต</h3></div>
            <div className="kpi-panel__body">
              <div className="kpi-form-grid kpi-form-grid--3">
                <div className="kpi-form-group">
                  <label className="kpi-form-label">Line No. *</label>
                  <select className={`kpi-form-input ${errors.line ? 'kpi-form-input--error' : ''}`}
                    value={formData.line} onChange={e => handleChange('line', e.target.value)}>
                    <option value="">เลือก Line</option>
                    {lines.map(l => <option key={l.code} value={l.code}>{l.code} — {l.name}</option>)}
                  </select>
                  {errors.line && <span className="kpi-form-error">{errors.line}</span>}
                </div>
                <div className="kpi-form-group">
                  <label className="kpi-form-label">Part No. *</label>
                  <input className={`kpi-form-input ${errors.partNumber ? 'kpi-form-input--error' : ''}`}
                    type="text" placeholder="e.g. W10-30-A" value={formData.partNumber}
                    onChange={e => handleChange('partNumber', e.target.value)} />
                  {errors.partNumber && <span className="kpi-form-error">{errors.partNumber}</span>}
                </div>
                <div className="kpi-form-group">
                  <label className="kpi-form-label">Lot No.</label>
                  <input className="kpi-form-input" type="text" placeholder="e.g. 1030/CT1003"
                    value={formData.lotNumber} onChange={e => handleChange('lotNumber', e.target.value)} />
                </div>
              </div>
              <div className="kpi-form-grid kpi-form-grid--4">
                <div className="kpi-form-group">
                  <label className="kpi-form-label">Shift</label>
                  <select className="kpi-form-input" value={formData.shift}
                    onChange={e => handleChange('shift', e.target.value)}>
                    <option value="A">A (กลางวัน)</option><option value="B">B (กลางคืน)</option>
                  </select>
                </div>
                <div className="kpi-form-group">
                  <label className="kpi-form-label">ผู้ปฏิบัติงาน *</label>
                  <input className={`kpi-form-input ${errors.operator ? 'kpi-form-input--error' : ''}`}
                    type="text" placeholder="ชื่อ Operator" value={formData.operator}
                    onChange={e => handleChange('operator', e.target.value)} />
                  {errors.operator && <span className="kpi-form-error">{errors.operator}</span>}
                </div>
                <div className="kpi-form-group">
                  <label className="kpi-form-label">ผู้ตรวจสอบ</label>
                  <input className="kpi-form-input" type="text" placeholder="ชื่อ Inspector"
                    value={formData.inspector} onChange={e => handleChange('inspector', e.target.value)} />
                </div>
                <div className="kpi-form-group">
                  <label className="kpi-form-label">สายการผลิต</label>
                  <select className="kpi-form-input" value={formData.productLine}
                    onChange={e => handleChange('productLine', e.target.value)}>
                    <option value="">ไม่ระบุ</option>
                    <option value="forging_auto">Forging - Automotive</option>
                    <option value="forging_ind">Forging - Industrial</option>
                    <option value="machining">Machining</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ยอดผลิต */}
          <div className="kpi-panel">
            <div className="kpi-panel__header">
              <h3 className="kpi-panel__title">📊 ยอดผลิตและผลตรวจสอบ</h3>
              {totalProduced > 0 && (
                <span style={{ fontSize: 12, color: isBalanced ? '#10b981' : '#f59e0b' }}>
                  {isBalanced ? '✅ ยอดตรง' : `⚠️ ${totalAccountedFor}/${totalProduced}`}
                </span>
              )}
            </div>
            <div className="kpi-panel__body">
              <div className="kpi-form-grid kpi-form-grid--5">
                <div className="kpi-form-group">
                  <label className="kpi-form-label" style={{ fontWeight: 700 }}>ยอดผลิตรวม *</label>
                  <input className={`kpi-form-input ${errors.totalProduced ? 'kpi-form-input--error' : ''}`}
                    type="number" min="0" placeholder="0" value={formData.totalProduced}
                    onChange={e => handleChange('totalProduced', e.target.value)}
                    style={{ fontSize: 18, fontWeight: 700, textAlign: 'center' }} />
                  {errors.totalProduced && <span className="kpi-form-error">{errors.totalProduced}</span>}
                </div>
                <div className="kpi-form-group">
                  <label className="kpi-form-label" style={{ color: '#10b981' }}>✅ Good</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input className="kpi-form-input" type="number" min="0" value={formData.goodQty}
                      onChange={e => handleChange('goodQty', e.target.value)}
                      style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', borderColor: '#10b981' }} />
                    <button onClick={handleAutoCalcGood} title="คำนวณอัตโนมัติ"
                      style={{ padding: '4px 8px', background: '#10b98130', border: '1px solid #10b98150', borderRadius: 6, color: '#10b981', cursor: 'pointer', fontSize: 14 }}>🔄</button>
                  </div>
                </div>
                <div className="kpi-form-group">
                  <label className="kpi-form-label" style={{ color: '#f59e0b' }}>🔧 Rework</label>
                  <input className="kpi-form-input" type="number" min="0" value={formData.reworkQty}
                    onChange={e => handleChange('reworkQty', e.target.value)}
                    style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', borderColor: '#f59e0b' }} />
                </div>
                <div className="kpi-form-group">
                  <label className="kpi-form-label" style={{ color: '#ef4444' }}>❌ Scrap</label>
                  <input className="kpi-form-input" type="number" min="0" value={formData.scrapQty}
                    onChange={e => handleChange('scrapQty', e.target.value)}
                    style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', borderColor: '#ef4444' }} />
                </div>
                <div className="kpi-form-group">
                  <label className="kpi-form-label">📦 คงเหลือ</label>
                  <input className="kpi-form-input" type="text" readOnly value={totalProduced > 0 ? remainingQty : '—'}
                    style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', background: '#0f172a', color: remainingQty < 0 ? '#ef4444' : '#64748b' }} />
                </div>
              </div>
              {errors.balance && <div className="kpi-form-error" style={{ marginTop: 8, textAlign: 'center' }}>{errors.balance}</div>}

              {reworkQty > 0 && (
                <div style={{ marginTop: 16, padding: 12, background: '#1e293b', borderRadius: 8, border: '1px solid #f59e0b40' }}>
                  <h4 style={{ color: '#f59e0b', marginBottom: 12, fontSize: 13 }}>🔧 ผลซ่อม (Rework: {reworkQty} ชิ้น)</h4>
                  <div className="kpi-form-grid kpi-form-grid--3">
                    <div className="kpi-form-group">
                      <label className="kpi-form-label" style={{ color: '#10b981' }}>ซ่อมดี</label>
                      <input className="kpi-form-input" type="number" min="0" max={reworkQty}
                        value={formData.reworkGoodQty} onChange={e => handleChange('reworkGoodQty', e.target.value)}
                        style={{ borderColor: '#10b981' }} />
                    </div>
                    <div className="kpi-form-group">
                      <label className="kpi-form-label" style={{ color: '#ef4444' }}>ซ่อมไม่ผ่าน</label>
                      <input className="kpi-form-input" type="number" min="0" max={reworkQty}
                        value={formData.reworkScrapQty} onChange={e => handleChange('reworkScrapQty', e.target.value)}
                        style={{ borderColor: '#ef4444' }} />
                    </div>
                    <div className="kpi-form-group">
                      <label className="kpi-form-label" style={{ color: '#f59e0b' }}>รอซ่อม</label>
                      <input className="kpi-form-input" type="text" readOnly value={reworkPendingQty}
                        style={{ background: '#0f172a', color: '#f59e0b' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* รายละเอียดของเสีย */}
          <div className="kpi-panel">
            <div className="kpi-panel__header">
              <h3 className="kpi-panel__title">🔍 รายละเอียดของเสีย</h3>
              <button onClick={addDefectItem}
                style={{ padding: '6px 12px', background: '#3b82f630', border: '1px solid #3b82f650', borderRadius: 6, color: '#3b82f6', cursor: 'pointer', fontSize: 12 }}>
                ➕ เพิ่มรายการ
              </button>
            </div>
            <div className="kpi-panel__body">
              {defectItems.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#475569', padding: 24 }}>ไม่มีของเสีย — กด "➕ เพิ่มรายการ" เพื่อบันทึก</div>
              ) : defectItems.map((item, idx) => (
                <div key={item.id} style={{ padding: 12, marginBottom: 12, background: '#1e293b', borderRadius: 8,
                  border: `1px solid ${item.defectType === 'scrap' ? '#ef444440' : '#f59e0b40'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong style={{ color: '#e2e8f0', fontSize: 13 }}>#{idx + 1}</strong>
                    <button onClick={() => removeDefectItem(item.id)}
                      style={{ background: '#ef444430', border: '1px solid #ef444450', borderRadius: 4, color: '#ef4444', cursor: 'pointer', padding: '2px 8px', fontSize: 11 }}>🗑️</button>
                  </div>
                  <div className="kpi-form-grid kpi-form-grid--4">
                    <div className="kpi-form-group">
                      <label className="kpi-form-label">ปัญหา *</label>
                      <select className={`kpi-form-input ${errors[`defect_${idx}`] ? 'kpi-form-input--error' : ''}`}
                        value={item.defectCode} onChange={e => updateDefectItem(item.id, 'defectCode', e.target.value)}>
                        <option value="">เลือก</option>
                        {DEFECT_CODES.map(dc => <option key={dc.code} value={dc.code}>{dc.code} — {dc.name}</option>)}
                      </select>
                    </div>
                    <div className="kpi-form-group">
                      <label className="kpi-form-label">ประเภท</label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => updateDefectItem(item.id, 'defectType', 'rework')}
                          style={{ flex: 1, padding: '6px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            background: item.defectType === 'rework' ? '#f59e0b' : '#1e293b',
                            color: item.defectType === 'rework' ? '#000' : '#64748b',
                            border: `1px solid ${item.defectType === 'rework' ? '#f59e0b' : '#334155'}` }}>🔧 ซ่อม</button>
                        <button onClick={() => updateDefectItem(item.id, 'defectType', 'scrap')}
                          style={{ flex: 1, padding: '6px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            background: item.defectType === 'scrap' ? '#ef4444' : '#1e293b',
                            color: item.defectType === 'scrap' ? '#fff' : '#64748b',
                            border: `1px solid ${item.defectType === 'scrap' ? '#ef4444' : '#334155'}` }}>❌ ทิ้ง</button>
                      </div>
                    </div>
                    <div className="kpi-form-group">
                      <label className="kpi-form-label">จำนวน</label>
                      <input className="kpi-form-input" type="number" min="1" value={item.quantity}
                        onChange={e => updateDefectItem(item.id, 'quantity', e.target.value)} />
                    </div>
                    {item.defectType === 'rework' && (
                      <div className="kpi-form-group">
                        <label className="kpi-form-label">ผลซ่อม</label>
                        <select className="kpi-form-input" value={item.reworkResult}
                          onChange={e => updateDefectItem(item.id, 'reworkResult', e.target.value)}>
                          <option value="pending">⏳ รอซ่อม</option>
                          <option value="good">✅ ซ่อมดี</option>
                          <option value="scrap">❌ ไม่ผ่าน</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="kpi-form-grid kpi-form-grid--3" style={{ marginTop: 8 }}>
                    <div className="kpi-form-group">
                      <label className="kpi-form-label">ค่าวัดจริง</label>
                      <input className="kpi-form-input" type="text" placeholder="128.46" value={item.measurement}
                        onChange={e => updateDefectItem(item.id, 'measurement', e.target.value)} />
                    </div>
                    <div className="kpi-form-group">
                      <label className="kpi-form-label">ค่า Spec</label>
                      <input className="kpi-form-input" type="text" placeholder="128.0 ± 0.05" value={item.specValue}
                        onChange={e => updateDefectItem(item.id, 'specValue', e.target.value)} />
                    </div>
                    <div className="kpi-form-group">
                      <label className="kpi-form-label">หมายเหตุ</label>
                      <input className="kpi-form-input" type="text" value={item.detail}
                        onChange={e => updateDefectItem(item.id, 'detail', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="kpi-panel">
            <div className="kpi-panel__body">
              <div className="kpi-form-group">
                <label className="kpi-form-label">หมายเหตุ</label>
                <textarea className="kpi-form-input" rows={2} value={formData.remark}
                  onChange={e => handleChange('remark', e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button onClick={handleSubmit} disabled={submitting}
                  style={{ flex: 2, padding: '14px 24px', fontSize: 16, fontWeight: 700,
                    background: submitting ? '#475569' : 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none', borderRadius: 8, color: '#fff', cursor: submitting ? 'wait' : 'pointer' }}>
                  {submitting ? '⏳ กำลังบันทึก...' : '✅ บันทึกผลผลิต'}
                </button>
                <button onClick={handleReset}
                  style={{ padding: '14px 24px', background: 'transparent', border: '1px solid #475569',
                    borderRadius: 8, color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>🔄 รีเซ็ต</button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right: Summary ────────────────────────────── */}
        <div style={{ flex: 1, position: 'sticky', top: 16 }}>
          <div className="kpi-panel">
            <div className="kpi-panel__header"><h3 className="kpi-panel__title">📊 สรุปผลผลิต</h3></div>
            <div className="kpi-panel__body">
              {totalProduced > 0 ? (<>
                <div style={{ display: 'grid', gap: 8 }}>
                  {[
                    { label: 'ยอดผลิต', value: totalProduced, color: '#e2e8f0' },
                    { label: '✅ งานดีรวม', value: `${finalGoodQty} (${goodPct}%)`, color: '#10b981' },
                    { label: '🔧 เสียซ่อม', value: `${reworkQty} (${reworkPct}%)`, color: '#f59e0b' },
                    { label: '❌ เสียทิ้งรวม', value: `${finalRejectQty} (${rejectPct}%)`, color: '#ef4444' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                      background: '#1e293b', borderRadius: 6, borderLeft: `3px solid ${item.color}` }}>
                      <span style={{ color: '#94a3b8', fontSize: 13 }}>{item.label}</span>
                      <strong style={{ color: item.color, fontSize: 14 }}>{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</strong>
                    </div>
                  ))}
                  {reworkQty > 0 && <>
                    <div style={{ borderTop: '1px solid #334155', margin: '4px 0' }} />
                    {[
                      { label: '   ซ่อมดี', value: reworkGoodQty, color: '#10b981' },
                      { label: '   ซ่อมไม่ผ่าน', value: reworkScrapQty, color: '#ef4444' },
                      { label: '   รอซ่อม', value: reworkPendingQty, color: '#f59e0b' },
                    ].map((item, i) => (
                      <div key={`rw-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px',
                        background: '#0f172a', borderRadius: 4 }}>
                        <span style={{ color: '#64748b', fontSize: 12 }}>{item.label}</span>
                        <strong style={{ color: item.color, fontSize: 13 }}>{item.value}</strong>
                      </div>
                    ))}
                  </>}
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', height: 20, borderRadius: 4, overflow: 'hidden', background: '#0f172a' }}>
                    {finalGoodQty > 0 && <div style={{ width: `${goodPct}%`, background: '#10b981', transition: 'width 0.3s' }} />}
                    {reworkPendingQty > 0 && <div style={{ width: `${totalProduced > 0 ? (reworkPendingQty/totalProduced)*100 : 0}%`, background: '#f59e0b' }} />}
                    {finalRejectQty > 0 && <div style={{ width: `${rejectPct}%`, background: '#ef4444' }} />}
                  </div>
                </div>
              </>) : (<div style={{ textAlign: 'center', color: '#475569', padding: 24 }}>กรอกยอดผลิตเพื่อดูสรุป</div>)}
            </div>
          </div>

          {/* Recent */}
          <div className="kpi-panel" style={{ marginTop: 16 }}>
            <div className="kpi-panel__header">
              <h3 className="kpi-panel__title">📝 บันทึกล่าสุด</h3>
            </div>
            <div className="kpi-panel__body" style={{ maxHeight: 250, overflow: 'auto' }}>
              {recentSubmissions.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#475569', padding: 16 }}>ยังไม่มี</div>
              ) : recentSubmissions.map((e, i) => (
                <div key={i} style={{ padding: '8px 12px', marginBottom: 6, background: '#1e293b', borderRadius: 6,
                  borderLeft: `3px solid ${parseFloat(e.goodPct) >= 99 ? '#10b981' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <strong style={{ color: '#e2e8f0' }}>{e.line} | {e.part}</strong>
                    <span style={{ color: '#64748b' }}>{e.time}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>ผลิต {e.total} | ดี {e.good} ({e.goodPct}%) | NG {e.reject}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPIDataEntry;