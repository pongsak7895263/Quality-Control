/**
 * KPIDataEntry.js — ✅ ระบบบันทึกผลผลิตและของเสีย (v4)
 *
 * ฟีเจอร์:
 * - ข้อมูลการผลิต: Line, Part, Lot, Shift, Operator
 * - ยอดผลิต: Good / Rework / Scrap + Auto-calc
 * - รายละเอียดของเสีย:
 *   ✅ เลขที่ถัง (Bin No.) ที่พบของเสีย
 *   ✅ จำนวนทั้งหมดในถัง (found_qty)
 *   ✅ จำนวนคัดแยก: ดี (sorted_good) / เสีย (sorted_reject)
 *   ✅ ประเภท: เสียซ่อม / เสียทิ้ง
 *   ✅ Defect Code + ค่าวัด + Spec
 *   ✅ ผลซ่อม: รอซ่อม / ซ่อมดี / ซ่อมไม่ผ่าน
 * - สรุป % Real-time + Visual Bar
 */

import React, { useState, useEffect } from 'react';
import apiClient from '../../../utils/api';
import { DEFECT_CODES, REWORK_METHODS } from './product_categories';

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
  const [partInfo, setPartInfo] = useState(null);
  const [partLookupTimer, setPartLookupTimer] = useState(null);

  // ─── Part Master Lookup ───────────────────────────────────────
  const lookupPart = async (partNumber) => {
    if (!partNumber || partNumber.length < 2) { setPartInfo(null); return; }
    try {
      const res = await apiClient.get(`/kpi/parts/lookup/${encodeURIComponent(partNumber)}`);
      console.log('[Lookup] raw:', res);
      
      // Handle: axios res.data.data, apiClient unwrap res.data, or direct
      let data = null;
      if (res?.data?.data) data = res.data.data;           // axios: {data: {success, data: {...}}}
      else if (res?.data && res?.data?.part_number) data = res.data;  // apiClient unwrap: {success, data: {...}} → data={...}
      else if (res?.part_number) data = res;                // direct object
      else if (res?.success && res?.data) data = res.data;  // {success:true, data:{...}}
      
      console.log('[Lookup] parsed:', data?.part_number, data?.part_name);
      setPartInfo(data);
      if (data?.primary_line && !formData.line) {
        handleChange('line', data.primary_line);
      }
    } catch (err) {
      console.error('[Lookup] error:', err);
      setPartInfo(null);
    }
  };

  const handlePartNumberChange = (val) => {
    handleChange('partNumber', val);
    setPartInfo(null);
    // Debounce: lookup หลังหยุดพิมพ์ 500ms
    if (partLookupTimer) clearTimeout(partLookupTimer);
    setPartLookupTimer(setTimeout(() => lookupPart(val), 500));
  };

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
      id: Date.now(),
      f07DocNo: '',          // เลขที่เอกสาร F07
      binNo: '',            // เลขที่ถัง
      foundQty: '',         // จำนวนที่พบในถัง
      sortedGood: '',       // คัดแยก → ดี
      sortedReject: '',     // คัดแยก → เสีย
      defectCode: '',
      defectType: 'rework', // rework | scrap
      measurement: '',
      specValue: '',
      detail: '',
      reworkResult: 'pending',
      reworkMethod: '',       // วิธีซ่อม
    }]);
  };

  const updateDefectItem = (id, field, value) => {
    setDefectItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };
  const removeDefectItem = (id) => { setDefectItems(prev => prev.filter(item => item.id !== id)); };

  // Auto-calc from defect items → summary
  useEffect(() => {
    if (defectItems.length > 0) {
      const rw = defectItems.filter(d => d.defectType === 'rework').reduce((s, d) => s + (parseInt(d.sortedReject) || 0), 0);
      const sc = defectItems.filter(d => d.defectType === 'scrap').reduce((s, d) => s + (parseInt(d.sortedReject) || 0), 0);
      const rwGood = defectItems.filter(d => d.defectType === 'rework' && d.reworkResult === 'good').reduce((s, d) => s + (parseInt(d.sortedReject) || 0), 0);
      const rwScrap = defectItems.filter(d => d.defectType === 'rework' && d.reworkResult === 'scrap').reduce((s, d) => s + (parseInt(d.sortedReject) || 0), 0);
      setFormData(prev => ({
        ...prev,
        reworkQty: rw.toString(),
        scrapQty: sc.toString(),
        reworkGoodQty: rwGood.toString(),
        reworkScrapQty: rwScrap.toString(),
      }));
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
    defectItems.forEach((d, i) => {
      if (!d.defectCode) errs[`defect_${i}`] = 'กรุณาเลือก Defect Code';
      if (!d.binNo) errs[`bin_${i}`] = 'กรุณาระบุเลขที่ถัง';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        machine_code: formData.line, part_number: formData.partNumber,
        part_name: partInfo ? partInfo.part_name : (formData.partName || null),
        lot_number: formData.lotNumber || null, shift: formData.shift,
        operator_name: formData.operator, inspector_name: formData.inspector || null,
        product_line_code: formData.productLine || null,
        total_produced: totalProduced, good_qty: goodQty,
        rework_qty: reworkQty, scrap_qty: scrapQty,
        rework_good_qty: reworkGoodQty, rework_scrap_qty: reworkScrapQty,
        rework_pending_qty: reworkPendingQty, remark: formData.remark || null,
        defect_items: defectItems.map(d => ({
          f07_doc_no: d.f07DocNo || null,
          bin_no: d.binNo || null,
          found_qty: parseInt(d.foundQty) || 0,
          sorted_good: parseInt(d.sortedGood) || 0,
          sorted_reject: parseInt(d.sortedReject) || 0,
          defect_code: d.defectCode,
          defect_type: d.defectType,
          quantity: parseInt(d.sortedReject) || 1,
          measurement: d.measurement || null,
          spec_value: d.specValue || null,
          detail: d.detail || null,
          rework_result: d.defectType === 'rework' ? d.reworkResult : null,
          rework_method: d.defectType === 'rework' ? d.reworkMethod : null,
        })),
      };
      await apiClient.post('/kpi/production', payload);

      setRecentSubmissions(prev => [{
        line: formData.line, part: formData.partNumber, shift: formData.shift,
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

  // ─── Styles ───────────────────────────────────────────────────
  const S = {
    input: { padding: '8px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', width: '100%', fontSize: 13 },
    inputErr: { borderColor: '#ef4444' },
    inputLg: { fontSize: 18, fontWeight: 700, textAlign: 'center' },
    label: { display: 'block', marginBottom: 4, color: '#94a3b8', fontSize: 11, fontWeight: 600 },
    err: { color: '#ef4444', fontSize: 10, marginTop: 2 },
    panel: { background: '#111827', border: '1px solid #1e293b', borderRadius: 8, marginBottom: 16 },
    panelHead: { padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    panelBody: { padding: 16 },
    title: { color: '#e2e8f0', fontSize: 14, fontWeight: 700, margin: 0 },
    grid: (cols) => ({ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }),
    formGroup: { marginBottom: 0 },
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div>
      {showConfirmation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <h3 style={{ color: '#e2e8f0' }}>บันทึกสำเร็จ!</h3>
            <p style={{ color: '#94a3b8' }}>ยอดผลิต {totalProduced} ชิ้น | งานดี {goodPct}%</p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* ─── Left: Form ──────────────────────────────────── */}
        <div style={{ flex: 2 }}>
          {/* ข้อมูลการผลิต */}
          <div style={S.panel}>
            <div style={S.panelHead}><h3 style={S.title}>📋 ข้อมูลการผลิต</h3></div>
            <div style={S.panelBody}>
              <div style={S.grid(3)}>
                <div>
                  <label style={S.label}>Line No. *</label>
                  <select style={{ ...S.input, ...(errors.line ? S.inputErr : {}) }}
                    value={formData.line} onChange={e => handleChange('line', e.target.value)}>
                    <option value="">เลือก Line</option>
                    {lines.map(l => <option key={l.code} value={l.code}>{l.code} — {l.name}</option>)}
                  </select>
                  {errors.line && <div style={S.err}>{errors.line}</div>}
                </div>
                <div>
                  <label style={S.label}>Part No. *</label>
                  <input style={{ ...S.input, ...(errors.partNumber ? S.inputErr : {}), ...(partInfo ? { borderColor: '#10b981' } : {}) }}
                    placeholder="e.g. W21-04" value={formData.partNumber}
                    onChange={e => handlePartNumberChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && lookupPart(formData.partNumber)} />
                  {errors.partNumber && <div style={S.err}>{errors.partNumber}</div>}
                  {partInfo && <div style={{ fontSize: 10, color: '#10b981', marginTop: 2 }}>✅ {partInfo.part_name}</div>}
                  {formData.partNumber && !partInfo && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>💡 ยังไม่พบใน Part Master</div>}
                </div>
                <div>
                  <label style={S.label}>Part Name</label>
                  <input style={{ ...S.input, background: partInfo ? '#0f172a' : '#1e293b', color: partInfo ? '#10b981' : '#64748b' }}
                    readOnly={!!partInfo} placeholder={partInfo ? '' : 'ระบุ หรือเลือกจาก Part Master'}
                    value={partInfo ? partInfo.part_name : (formData.partName || '')}
                    onChange={e => !partInfo && handleChange('partName', e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Lot No.</label>
                  <input style={S.input} placeholder="e.g. 1030/CT1003"
                    value={formData.lotNumber} onChange={e => handleChange('lotNumber', e.target.value)} />
                </div>
              </div>
              <div style={{ ...S.grid(4), marginTop: 12 }}>
                <div>
                  <label style={S.label}>Shift</label>
                  <select style={S.input} value={formData.shift} onChange={e => handleChange('shift', e.target.value)}>
                    <option value="A">A (กลางวัน)</option><option value="B">B (กลางคืน)</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>ผู้ปฏิบัติงาน *</label>
                  <input style={{ ...S.input, ...(errors.operator ? S.inputErr : {}) }}
                    placeholder="ชื่อ Operator" value={formData.operator}
                    onChange={e => handleChange('operator', e.target.value)} />
                  {errors.operator && <div style={S.err}>{errors.operator}</div>}
                </div>
                <div>
                  <label style={S.label}>ผู้ตรวจสอบ</label>
                  <input style={S.input} placeholder="ชื่อ Inspector"
                    value={formData.inspector} onChange={e => handleChange('inspector', e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>สายการผลิต</label>
                  <select style={S.input} value={formData.productLine} onChange={e => handleChange('productLine', e.target.value)}>
                    <option value="">ไม่ระบุ</option>
                    <option value="forging_auto">Forging - Automotive</option>
                    <option value="forging_ind">Forging - Industrial</option>
                    <option value="machining">Machining</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Part Info Card */}
          {partInfo && (
            <div style={{ ...S.panel, borderColor: '#10b98140' }}>
              <div style={{ padding: '10px 16px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: '#10b981', fontWeight: 700, fontSize: 13 }}>📦 {partInfo.part_number} — {partInfo.part_name}</span>
                {partInfo.customer_name && <span style={{ color: '#94a3b8', fontSize: 11 }}>👤 {partInfo.customer_name}</span>}
                {partInfo.heat_treatment_type && (
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: '#f59e0b20', color: '#f59e0b' }}>
                    🌡️ {partInfo.heat_treatment_type} {partInfo.hardness_spec ? `| ${partInfo.hardness_spec}` : ''}
                  </span>
                )}
                {partInfo.billet_size && <span style={{ color: '#94a3b8', fontSize: 11 }}>🔩 {partInfo.billet_size} {partInfo.billet_weight ? `(${partInfo.billet_weight}g)` : ''}</span>}
                {partInfo.heat_treatment_supplier && <span style={{ color: '#94a3b8', fontSize: 11 }}>🏭 ชุบ: {partInfo.heat_treatment_supplier}</span>}
                {partInfo.primary_line && <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: '#3b82f620', color: '#3b82f6' }}>Line: {partInfo.primary_line}</span>}
              </div>
            </div>
          )}

          {/* ยอดผลิต */}
          <div style={S.panel}>
            <div style={S.panelHead}>
              <h3 style={S.title}>📊 ยอดผลิตและผลตรวจสอบ</h3>
              {totalProduced > 0 && (
                <span style={{ fontSize: 12, color: isBalanced ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                  {isBalanced ? '✅ ยอดตรง' : `⚠️ ${totalAccountedFor}/${totalProduced}`}
                </span>
              )}
            </div>
            <div style={S.panelBody}>
              <div style={S.grid(5)}>
                <div>
                  <label style={{ ...S.label, fontWeight: 700, color: '#e2e8f0' }}>ยอดผลิตรวม *</label>
                  <input style={{ ...S.input, ...S.inputLg, ...(errors.totalProduced ? S.inputErr : {}) }}
                    type="number" min="0" placeholder="0" value={formData.totalProduced}
                    onChange={e => handleChange('totalProduced', e.target.value)} />
                  {errors.totalProduced && <div style={S.err}>{errors.totalProduced}</div>}
                </div>
                <div>
                  <label style={{ ...S.label, color: '#10b981' }}>✅ Good</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input style={{ ...S.input, ...S.inputLg, borderColor: '#10b981' }}
                      type="number" min="0" value={formData.goodQty}
                      onChange={e => handleChange('goodQty', e.target.value)} />
                    <button onClick={handleAutoCalcGood} title="คำนวณอัตโนมัติ"
                      style={{ padding: '4px 8px', background: '#10b98130', border: '1px solid #10b98150',
                        borderRadius: 6, color: '#10b981', cursor: 'pointer', fontSize: 14 }}>🔄</button>
                  </div>
                </div>
                <div>
                  <label style={{ ...S.label, color: '#f59e0b' }}>🔧 Rework</label>
                  <input style={{ ...S.input, ...S.inputLg, borderColor: '#f59e0b' }}
                    type="number" min="0" value={formData.reworkQty}
                    onChange={e => handleChange('reworkQty', e.target.value)} />
                </div>
                <div>
                  <label style={{ ...S.label, color: '#ef4444' }}>❌ Scrap</label>
                  <input style={{ ...S.input, ...S.inputLg, borderColor: '#ef4444' }}
                    type="number" min="0" value={formData.scrapQty}
                    onChange={e => handleChange('scrapQty', e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>📦 คงเหลือ</label>
                  <input style={{ ...S.input, ...S.inputLg, background: '#0f172a',
                    color: remainingQty < 0 ? '#ef4444' : '#64748b' }}
                    readOnly value={totalProduced > 0 ? remainingQty : '—'} />
                </div>
              </div>
              {errors.balance && <div style={{ ...S.err, marginTop: 8, textAlign: 'center' }}>{errors.balance}</div>}

              {/* Rework Tracking */}
              {reworkQty > 0 && (
                <div style={{ marginTop: 16, padding: 12, background: '#1e293b', borderRadius: 8, border: '1px solid #f59e0b40' }}>
                  <h4 style={{ color: '#f59e0b', marginBottom: 12, fontSize: 13, margin: '0 0 12px 0' }}>
                    🔧 ผลซ่อม (Rework: {reworkQty} ชิ้น)
                  </h4>
                  <div style={S.grid(3)}>
                    <div>
                      <label style={{ ...S.label, color: '#10b981' }}>ซ่อมดี</label>
                      <input style={{ ...S.input, borderColor: '#10b981' }} type="number" min="0" max={reworkQty}
                        value={formData.reworkGoodQty} onChange={e => handleChange('reworkGoodQty', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ ...S.label, color: '#ef4444' }}>ซ่อมไม่ผ่าน</label>
                      <input style={{ ...S.input, borderColor: '#ef4444' }} type="number" min="0" max={reworkQty}
                        value={formData.reworkScrapQty} onChange={e => handleChange('reworkScrapQty', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ ...S.label, color: '#f59e0b' }}>รอซ่อม</label>
                      <input style={{ ...S.input, background: '#0f172a', color: '#f59e0b' }} readOnly value={reworkPendingQty} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══ รายละเอียดของเสีย (แก้ไขใหม่) ═══ */}
          <div style={S.panel}>
            <div style={S.panelHead}>
              <h3 style={S.title}>🔍 รายละเอียดของเสีย</h3>
              <button onClick={addDefectItem}
                style={{ padding: '6px 14px', background: '#3b82f630', border: '1px solid #3b82f650',
                  borderRadius: 6, color: '#3b82f6', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                ➕ เพิ่มรายการ
              </button>
            </div>
            <div style={S.panelBody}>
              {defectItems.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#475569', padding: 24 }}>
                  ไม่มีของเสีย — กด "➕ เพิ่มรายการ" เพื่อบันทึกรายละเอียด
                </div>
              ) : defectItems.map((item, idx) => (
                <div key={item.id} style={{
                  padding: 14, marginBottom: 14, background: '#1e293b', borderRadius: 8,
                  border: `1px solid ${item.defectType === 'scrap' ? '#ef444440' : '#f59e0b40'}`,
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ background: item.defectType === 'scrap' ? '#ef444430' : '#f59e0b30',
                        color: item.defectType === 'scrap' ? '#ef4444' : '#f59e0b',
                        padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                        #{idx + 1} {item.defectType === 'scrap' ? '❌ เสียทิ้ง' : '🔧 เสียซ่อม'}
                      </span>
                      {item.binNo && <span style={{ color: '#64748b', fontSize: 11 }}>ถัง: {item.binNo}</span>}
                      {item.f07DocNo && <span style={{ color: '#8b5cf6', fontSize: 11 }}>📋 {item.f07DocNo}</span>}
                    </div>
                    <button onClick={() => removeDefectItem(item.id)}
                      style={{ background: '#ef444420', border: '1px solid #ef444440', borderRadius: 4,
                        color: '#ef4444', cursor: 'pointer', padding: '2px 10px', fontSize: 11 }}>🗑️ ลบ</button>
                  </div>

                  {/* Row 1: F07 + ถัง + ปัญหา + ประเภท */}
                  <div style={S.grid(5)}>
                    <div>
                      <label style={{ ...S.label, color: '#8b5cf6' }}>📋 เอกสาร F07 เลขที่</label>
                      <input style={{ ...S.input, borderColor: '#8b5cf650' }}
                        placeholder="e.g. F07-2602-001" value={item.f07DocNo}
                        onChange={e => updateDefectItem(item.id, 'f07DocNo', e.target.value)} />
                    </div>
                    <div>
                      <label style={S.label}>เลขที่ถัง (Bin No.) *</label>
                      <input style={{ ...S.input, ...(errors[`bin_${idx}`] ? S.inputErr : {}) }}
                        placeholder="e.g. B-001" value={item.binNo}
                        onChange={e => updateDefectItem(item.id, 'binNo', e.target.value)} />
                      {errors[`bin_${idx}`] && <div style={S.err}>{errors[`bin_${idx}`]}</div>}
                    </div>
                    <div>
                      <label style={S.label}>Defect Code / ปัญหา *</label>
                      <select style={{ ...S.input, ...(errors[`defect_${idx}`] ? S.inputErr : {}) }}
                        value={item.defectCode} onChange={e => updateDefectItem(item.id, 'defectCode', e.target.value)}>
                        <option value="">เลือกปัญหา</option>
                        {DEFECT_CODES.map(dc => <option key={dc.code} value={dc.code}>{dc.code} — {dc.name}</option>)}
                      </select>
                      {errors[`defect_${idx}`] && <div style={S.err}>{errors[`defect_${idx}`]}</div>}
                    </div>
                    <div>
                      <label style={S.label}>ประเภทของเสีย</label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => updateDefectItem(item.id, 'defectType', 'rework')}
                          style={{ flex: 1, padding: '7px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            background: item.defectType === 'rework' ? '#f59e0b' : '#0f172a',
                            color: item.defectType === 'rework' ? '#000' : '#64748b',
                            border: `1px solid ${item.defectType === 'rework' ? '#f59e0b' : '#334155'}` }}>
                          🔧 ซ่อม
                        </button>
                        <button onClick={() => updateDefectItem(item.id, 'defectType', 'scrap')}
                          style={{ flex: 1, padding: '7px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            background: item.defectType === 'scrap' ? '#ef4444' : '#0f172a',
                            color: item.defectType === 'scrap' ? '#fff' : '#64748b',
                            border: `1px solid ${item.defectType === 'scrap' ? '#ef4444' : '#334155'}` }}>
                          ❌ ทิ้ง
                        </button>
                      </div>
                    </div>
                    {item.defectType === 'rework' && (
                      <div>
                        <label style={S.label}>ผลซ่อม</label>
                        <select style={S.input} value={item.reworkResult}
                          onChange={e => updateDefectItem(item.id, 'reworkResult', e.target.value)}>
                          <option value="pending">⏳ รอซ่อม</option>
                          <option value="good">✅ ซ่อมดี</option>
                          <option value="scrap">❌ ไม่ผ่าน</option>
                        </select>
                      </div>
                    )}
                  </div>
                  {/* วิธีซ่อม (แสดงเฉพาะ rework) */}
                  {item.defectType === 'rework' && (
                    <div style={{ marginTop: 10 }}>
                      <label style={{ ...S.label, color: '#f59e0b' }}>🔧 วิธีซ่อม (Rework Method)</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {REWORK_METHODS.map(m => (
                          <button key={m.code} onClick={() => updateDefectItem(item.id, 'reworkMethod', m.code)}
                            style={{ padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                              background: item.reworkMethod === m.code ? '#f59e0b' : '#0f172a',
                              color: item.reworkMethod === m.code ? '#000' : '#64748b',
                              border: `1px solid ${item.reworkMethod === m.code ? '#f59e0b' : '#334155'}` }}>
                            {m.icon} {m.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Row 2: จำนวนพบ + คัดแยก */}
                  <div style={{ ...S.grid(4), marginTop: 10, padding: 10, background: '#0f172a', borderRadius: 6 }}>
                    <div>
                      <label style={{ ...S.label, color: '#f97316' }}>จำนวนที่พบในถัง</label>
                      <input style={{ ...S.input, borderColor: '#f9731650' }} type="number" min="0"
                        placeholder="0" value={item.foundQty}
                        onChange={e => updateDefectItem(item.id, 'foundQty', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ ...S.label, color: '#10b981' }}>คัดแยก → ดี (ชิ้น)</label>
                      <input style={{ ...S.input, borderColor: '#10b98150' }} type="number" min="0"
                        placeholder="0" value={item.sortedGood}
                        onChange={e => updateDefectItem(item.id, 'sortedGood', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ ...S.label, color: '#ef4444' }}>คัดแยก → เสีย (ชิ้น)</label>
                      <input style={{ ...S.input, borderColor: '#ef444450' }} type="number" min="0"
                        placeholder="0" value={item.sortedReject}
                        onChange={e => updateDefectItem(item.id, 'sortedReject', e.target.value)} />
                    </div>
                    <div>
                      <label style={S.label}>คงเหลือ</label>
                      <input style={{ ...S.input, background: '#1e293b', color: '#64748b' }} readOnly
                        value={(parseInt(item.foundQty) || 0) - (parseInt(item.sortedGood) || 0) - (parseInt(item.sortedReject) || 0) || '—'} />
                    </div>
                  </div>

                  {/* Row 3: ค่าวัด + Spec */}
                  <div style={{ ...S.grid(3), marginTop: 10 }}>
                    <div>
                      <label style={S.label}>ค่าวัดจริง (Actual)</label>
                      <input style={S.input} placeholder="e.g. 128.46" value={item.measurement}
                        onChange={e => updateDefectItem(item.id, 'measurement', e.target.value)} />
                    </div>
                    <div>
                      <label style={S.label}>ค่า Spec (Standard)</label>
                      <input style={S.input} placeholder="e.g. 128.0 ± 0.05" value={item.specValue}
                        onChange={e => updateDefectItem(item.id, 'specValue', e.target.value)} />
                    </div>
                    <div>
                      <label style={S.label}>หมายเหตุ</label>
                      <input style={S.input} placeholder="รายละเอียดเพิ่มเติม" value={item.detail}
                        onChange={e => updateDefectItem(item.id, 'detail', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div style={S.panel}>
            <div style={S.panelBody}>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>หมายเหตุ</label>
                <textarea style={{ ...S.input, resize: 'vertical' }} rows={2} value={formData.remark}
                  onChange={e => handleChange('remark', e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
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
          <div style={S.panel}>
            <div style={S.panelHead}><h3 style={S.title}>📊 สรุปผลผลิต</h3></div>
            <div style={S.panelBody}>
              {totalProduced > 0 ? (<>
                <div style={{ display: 'grid', gap: 8 }}>
                  {[
                    { label: 'ยอดผลิต', value: totalProduced.toLocaleString(), color: '#e2e8f0' },
                    { label: '✅ งานดีรวม', value: `${finalGoodQty.toLocaleString()} (${goodPct}%)`, color: '#10b981' },
                    { label: '🔧 เสียซ่อม', value: `${reworkQty.toLocaleString()} (${reworkPct}%)`, color: '#f59e0b' },
                    { label: '❌ เสียทิ้งรวม', value: `${finalRejectQty.toLocaleString()} (${rejectPct}%)`, color: '#ef4444' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                      background: '#1e293b', borderRadius: 6, borderLeft: `3px solid ${item.color}` }}>
                      <span style={{ color: '#94a3b8', fontSize: 13 }}>{item.label}</span>
                      <strong style={{ color: item.color, fontSize: 14 }}>{item.value}</strong>
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
                {/* Defect Items Summary */}
                {defectItems.length > 0 && (<>
                  <div style={{ borderTop: '1px solid #334155', margin: '12px 0' }} />
                  <h4 style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 8px 0' }}>📋 ถังที่พบของเสีย</h4>
                  {defectItems.map((d, i) => (
                    <div key={d.id} style={{ padding: '6px 10px', marginBottom: 4, background: '#0f172a', borderRadius: 4,
                      borderLeft: `2px solid ${d.defectType === 'scrap' ? '#ef4444' : '#f59e0b'}`, fontSize: 11 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0' }}>
                        <span>ถัง {d.binNo || '—'}</span>
                        <span style={{ color: d.defectType === 'scrap' ? '#ef4444' : '#f59e0b' }}>
                          {d.defectType === 'scrap' ? '❌ ทิ้ง' : '🔧 ซ่อม'}
                        </span>
                      </div>
                      <div style={{ color: '#64748b' }}>
                        พบ {d.foundQty || 0} | ดี {d.sortedGood || 0} | เสีย {d.sortedReject || 0}
                        {d.defectCode ? ` | ${d.defectCode}` : ''}
                      </div>
                    </div>
                  ))}
                </>)}
                {/* Progress Bar */}
                <div style={{ marginTop: 12 }}>
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
          <div style={{ ...S.panel, marginTop: 16 }}>
            <div style={S.panelHead}><h3 style={S.title}>📝 บันทึกล่าสุด</h3></div>
            <div style={{ ...S.panelBody, maxHeight: 200, overflow: 'auto' }}>
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