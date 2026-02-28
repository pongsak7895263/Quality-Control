/**
 * KPIDataEntry.js — v5 Refactored
 * ================================
 * ระบบบันทึกผลผลิตและของเสียประจำวัน
 *
 * Flow: วันที่ → Line → Part (auto-fill) → ยอดผลิต → ถังตรวจ → ของเสีย → สรุป %
 */
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../utils/api';
import { DEFECT_CODES, REWORK_METHODS, DEFECT_CATEGORIES } from './product_categories';

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const S = {
  input: { padding: '8px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', width: '100%', fontSize: 13, boxSizing: 'border-box' },
  inputErr: { borderColor: '#ef4444' },
  inputLg: { fontSize: 20, fontWeight: 700, textAlign: 'center' },
  label: { display: 'block', marginBottom: 4, color: '#94a3b8', fontSize: 11, fontWeight: 600 },
  err: { color: '#ef4444', fontSize: 10, marginTop: 2 },
  panel: { background: '#111827', border: '1px solid #1e293b', borderRadius: 8, marginBottom: 16 },
  head: (c) => ({ padding: '10px 16px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: c ? `3px solid ${c}` : 'none' }),
  body: { padding: 16 },
  title: { color: '#e2e8f0', fontSize: 14, fontWeight: 700, margin: 0 },
  grid: (n) => ({ display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 12 }),
  btn: (bg, c) => ({ padding: '6px 14px', background: bg, border: `1px solid ${c || bg}`, borderRadius: 6, color: c || '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }),
  tag: (c) => ({ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: `${c}20`, color: c }),
  toggleBtn: (active, cActive, cDefault) => ({
    flex: 1, padding: '6px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600,
    background: active ? cActive : '#0f172a', color: active ? '#fff' : '#64748b',
    border: `1px solid ${active ? cActive : '#334155'}`, transition: 'all 0.15s',
  }),
  statBox: (c) => ({ padding: '10px 12px', background: '#1e293b', borderRadius: 6, textAlign: 'center', borderLeft: `3px solid ${c}` }),
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
const KPIDataEntry = ({ onSubmitSuccess }) => {
  // ─── State ──────────────────────────────────────────────────
  const [lines, setLines] = useState([]);
  const [form, setForm] = useState({
    productionDate: new Date().toISOString().split('T')[0],
    docNumber: '', line: '', partNumber: '', lotNumber: '',
    shift: new Date().getHours() >= 6 && new Date().getHours() < 18 ? 'A' : 'B',
    operator: '', inspector: '', productLine: '',
    totalProduced: '', remark: '',
  });
  const [partInfo, setPartInfo] = useState(null);
  const [bins, setBins] = useState([]);         // ถังที่ตรวจสอบ
  const [defects, setDefects] = useState([]);   // ของเสีย (เชื่อมจากถัง)
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [recentList, setRecentList] = useState([]);
  const [lookupTimer, setLookupTimer] = useState(null);
  const [prodLogData, setProdLogData] = useState(null); // ยอดผลิตจากสายการผลิต

  // ─── ดึงยอดผลิตจาก production_log ─────────────────────────
  const fetchProdLog = async () => {
    if (!form.partNumber) return;
    try {
      const params = { part_number: form.partNumber };
      if (form.lotNumber) params.lot_number = form.lotNumber;
      if (form.productionDate) params.date = form.productionDate;
      const res = await apiClient.get('/kpi/production-log/lookup', { params });
      const raw = res?.data || res;
      const data = raw?.data || raw;
      if (Array.isArray(data) && data.length > 0) {
        setProdLogData(data[0]);
        showToast(`📊 พบยอดผลิต ${data[0].part_number} — ${data[0].total_produced} ชิ้น (${data[0].total_bins} ถัง)`);
        // Auto-fill totalProduced ถ้ายังว่าง
        if (!form.totalProduced && data[0].total_produced) {
          set('totalProduced', String(data[0].total_produced));
        }
        // Auto-fill bins จาก prodLog
        if (bins.length === 0 && data[0].bins && data[0].bins.length > 0) {
          const importedBins = data[0].bins.map((b, i) => ({
            id: Date.now() + i,
            binNo: b.bin_no || '',
            qty: String((b.good_qty || 0) + (b.ng_qty || 0)),
            result: (b.ng_qty || 0) > 0 ? 'ng' : 'good',
          }));
          setBins(importedBins);
        }
      } else {
        setProdLogData(null);
        showToast('💡 ไม่พบยอดผลิตสำหรับ Part/Lot นี้');
      }
    } catch { setProdLogData(null); }
  };

  // ─── Fetch Lines ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/kpi/machines/status');
        const data = res?.data || res;
        if (Array.isArray(data) && data.length > 0) {
          setLines(data.map(m => ({ code: m.code, name: m.name || m.code })));
        } else throw 0;
      } catch {
        setLines([
          ...Array.from({ length: 8 }, (_, i) => ({ code: `Line-${i+1}`, name: `สายการผลิต ${i+1}` })),
          { code: 'Line-CT', name: 'Line CT' }, { code: 'Line-PD5', name: 'Line PD5' }, { code: 'Line-MC', name: 'Line MC' },
        ]);
      }
    })();
  }, []);

  // ─── Helpers ────────────────────────────────────────────────
  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); if (errors[k]) setErrors(p => ({ ...p, [k]: null })); };
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // ─── Part Lookup (debounce 500ms) ───────────────────────────
  const lookupPart = useCallback(async (pn) => {
    if (!pn || pn.length < 2) { setPartInfo(null); return; }
    try {
      const res = await apiClient.get(`/kpi/parts/lookup/${encodeURIComponent(pn)}`);
      let d = null;
      if (res?.data?.data) d = res.data.data;
      else if (res?.data?.part_number) d = res.data;
      else if (res?.part_number) d = res;
      else if (res?.success && res?.data) d = res.data;
      setPartInfo(d);
      if (d?.primary_line && !form.line) set('line', d.primary_line);
    } catch { setPartInfo(null); }
  }, [form.line]);

  const onPartChange = (v) => {
    set('partNumber', v); setPartInfo(null);
    if (lookupTimer) clearTimeout(lookupTimer);
    setLookupTimer(setTimeout(() => lookupPart(v), 500));
  };

  // ─── Calculations ──────────────────────────────────────────
  const totalProduced = parseInt(form.totalProduced) || 0;

  // Auto-calc จาก defects
  const reworkQty = defects.filter(d => d.type === 'rework').reduce((s, d) => s + (parseInt(d.rejectQty) || 0), 0);
  const scrapQty = defects.filter(d => d.type === 'scrap').reduce((s, d) => s + (parseInt(d.rejectQty) || 0), 0);
  const reworkGoodQty = defects.filter(d => d.type === 'rework' && d.reworkResult === 'good').reduce((s, d) => s + (parseInt(d.rejectQty) || 0), 0);
  const reworkScrapQty = defects.filter(d => d.type === 'rework' && d.reworkResult === 'scrap').reduce((s, d) => s + (parseInt(d.rejectQty) || 0), 0);
  const totalNG = reworkQty + scrapQty;
  const goodQty = Math.max(0, totalProduced - totalNG);
  const finalGood = goodQty + reworkGoodQty;
  const finalReject = scrapQty + reworkScrapQty;

  const pct = (n) => totalProduced > 0 ? ((n / totalProduced) * 100).toFixed(2) : '0.00';

  // Bin stats
  const totalBins = bins.length;
  const goodBins = bins.filter(b => b.result === 'good').length;
  const ngBins = bins.filter(b => b.result === 'ng').length;
  const totalBinQty = bins.reduce((s, b) => s + (parseInt(b.qty) || 0), 0);

  // ─── Bin Management ────────────────────────────────────────
  const addBins = (count = 1) => {
    const news = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i, binNo: '', qty: '', result: 'good',
    }));
    setBins(p => [...p, ...news]);
  };

  const updateBin = (id, field, value) => {
    setBins(p => p.map(b => b.id === id ? { ...b, [field]: value } : b));
    if (field === 'result') {
      const bin = bins.find(b => b.id === id);
      if (value === 'ng' && !defects.some(d => d._binId === id)) {
        setDefects(p => [...p, {
          id: Date.now(), _binId: id,
          binNo: bin?.binNo || '', foundQty: bin?.qty || '',
          goodQty: '', rejectQty: '',
          defectCode: '', type: 'rework',
          f07: '', measurement: '', spec: '', detail: '',
          reworkResult: 'pending', reworkMethod: '',
        }]);
      } else if (value === 'good') {
        setDefects(p => p.filter(d => d._binId !== id));
      }
    }
    if ((field === 'binNo' || field === 'qty') && bins.find(b => b.id === id)?.result === 'ng') {
      setDefects(p => p.map(d => {
        if (d._binId !== id) return d;
        return { ...d, ...(field === 'binNo' ? { binNo: value } : { foundQty: value }) };
      }));
    }
  };

  const removeBin = (id) => {
    setBins(p => p.filter(b => b.id !== id));
    setDefects(p => p.filter(d => d._binId !== id));
  };

  // ─── Defect Management ─────────────────────────────────────
  const addDefect = () => {
    setDefects(p => [...p, {
      id: Date.now(), _binId: null,
      binNo: '', foundQty: '', goodQty: '', rejectQty: '',
      defectCode: '', type: 'rework',
      f07: '', measurement: '', spec: '', detail: '',
      reworkResult: 'pending', reworkMethod: '',
    }]);
  };

  const updateDefect = (id, field, value) => {
    setDefects(p => p.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const removeDefect = (id) => {
    const d = defects.find(x => x.id === id);
    if (d?._binId) setBins(p => p.map(b => b.id === d._binId ? { ...b, result: 'good' } : b));
    setDefects(p => p.filter(x => x.id !== id));
  };

  // ─── Validate ──────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.line) e.line = 'เลือก Line';
    if (!form.partNumber) e.partNumber = 'ระบุ Part No.';
    if (!form.operator) e.operator = 'ระบุผู้ปฏิบัติงาน';
    if (!totalProduced) e.totalProduced = 'ระบุยอดผลิต';
    defects.forEach((d, i) => { if (!d.defectCode) e[`dc_${i}`] = 'เลือก Defect'; });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await apiClient.post('/kpi/production', {
        production_date: form.productionDate, doc_number: form.docNumber || null,
        machine_code: form.line, part_number: form.partNumber,
        part_name: partInfo?.part_name || null,
        lot_number: form.lotNumber || null, shift: form.shift,
        operator_name: form.operator, inspector_name: form.inspector || null,
        product_line_code: form.productLine || null,
        total_produced: totalProduced, good_qty: goodQty,
        rework_qty: reworkQty, scrap_qty: scrapQty,
        rework_good_qty: reworkGoodQty, rework_scrap_qty: reworkScrapQty,
        rework_pending_qty: Math.max(0, reworkQty - reworkGoodQty - reworkScrapQty),
        remark: form.remark || null,
        inspected_bins: bins.map(b => ({ bin_no: b.binNo, qty: parseInt(b.qty) || 0, result: b.result })),
        defect_items: defects.map(d => ({
          f07_doc_no: d.f07 || null, bin_no: d.binNo || null,
          found_qty: parseInt(d.foundQty) || 0, sorted_good: parseInt(d.goodQty) || 0,
          sorted_reject: parseInt(d.rejectQty) || 0,
          defect_code: d.defectCode, defect_type: d.type,
          quantity: parseInt(d.rejectQty) || 1,
          measurement: d.measurement || null, spec_value: d.spec || null, detail: d.detail || null,
          rework_result: d.type === 'rework' ? d.reworkResult : null,
          rework_method: d.type === 'rework' ? d.reworkMethod : null,
        })),
      });

      setRecentList(p => [{
        line: form.line, part: form.partNumber, shift: form.shift,
        total: totalProduced, good: finalGood, ng: totalNG, pct: pct(finalGood),
        time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }),
      }, ...p].slice(0, 10));

      showToast('✅ บันทึกสำเร็จ!');
      setForm(p => ({ ...p, partNumber: '', lotNumber: '', docNumber: '', totalProduced: '', remark: '' }));
      setBins([]); setDefects([]); setPartInfo(null);
      onSubmitSuccess?.();
    } catch (err) {
      showToast('❌ ' + (err?.response?.data?.error || err.message || 'บันทึกไม่สำเร็จ'));
    } finally { setSubmitting(false); }
  };

  const handleReset = () => {
    setForm(p => ({ ...p, partNumber: '', lotNumber: '', docNumber: '', totalProduced: '', remark: '' }));
    setBins([]); setDefects([]); setErrors({}); setPartInfo(null);
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '14px 24px', borderRadius: 8,
          background: toast.startsWith('❌') ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* ═══ LEFT: Form ═══ */}
        <div style={{ flex: 2 }}>

          {/* ── Section 1: ข้อมูลการผลิต ── */}
          <div style={S.panel}>
            <div style={S.head('#3b82f6')}><h3 style={S.title}>📋 ข้อมูลการผลิต</h3></div>
            <div style={S.body}>
              <div style={S.grid(4)}>
                <div>
                  <label style={{ ...S.label, color: '#3b82f6' }}>📅 วันที่ผลิต</label>
                  <input type="date" style={{ ...S.input, borderColor: '#3b82f650' }}
                    value={form.productionDate} onChange={e => set('productionDate', e.target.value)} />
                </div>
                <div>
                  <label style={{ ...S.label, color: '#8b5cf6' }}>📄 เลขที่ใบผลิต</label>
                  <input style={{ ...S.input, borderColor: '#8b5cf650' }} placeholder="PD-260228-001"
                    value={form.docNumber} onChange={e => set('docNumber', e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Shift</label>
                  <select style={S.input} value={form.shift} onChange={e => set('shift', e.target.value)}>
                    <option value="A">A (กลางวัน)</option><option value="B">B (กลางคืน)</option><option value="AB">AB (ทั้งวัน)</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>สายการผลิต</label>
                  <select style={S.input} value={form.productLine} onChange={e => set('productLine', e.target.value)}>
                    <option value="">ไม่ระบุ</option>
                    <option value="forging_auto">Forging - Auto</option><option value="forging_ind">Forging - Ind</option>
                    <option value="final_auto">Final - Auto</option><option value="final_ind">Final - Ind</option>
                    <option value="machining">Machining</option>
                  </select>
                </div>
              </div>
              <div style={{ ...S.grid(4), marginTop: 12 }}>
                <div>
                  <label style={S.label}>Line No. *</label>
                  <select style={{ ...S.input, ...(errors.line ? S.inputErr : {}) }}
                    value={form.line} onChange={e => set('line', e.target.value)}>
                    <option value="">เลือก Line</option>
                    {lines.map(l => <option key={l.code} value={l.code}>{l.code}</option>)}
                  </select>
                  {errors.line && <div style={S.err}>{errors.line}</div>}
                </div>
                <div>
                  <label style={S.label}>Part No. *</label>
                  <input style={{ ...S.input, ...(errors.partNumber ? S.inputErr : {}), ...(partInfo ? { borderColor: '#10b981' } : {}) }}
                    placeholder="W21-04" value={form.partNumber}
                    onChange={e => onPartChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && lookupPart(form.partNumber)} />
                  {errors.partNumber && <div style={S.err}>{errors.partNumber}</div>}
                  {partInfo && <div style={{ fontSize: 10, color: '#10b981', marginTop: 2 }}>✅ {partInfo.part_name}</div>}
                  {form.partNumber && !partInfo && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>💡 ไม่พบใน Part Master</div>}
                </div>
                <div>
                  <label style={S.label}>Lot No.</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input style={{ ...S.input, flex: 1 }} placeholder="1030/C1003" value={form.lotNumber} onChange={e => set('lotNumber', e.target.value)} />
                    <button onClick={fetchProdLog} title="ดึงยอดผลิตจากสายการผลิต"
                      style={{ padding: '6px 10px', background: '#3b82f620', border: '1px solid #3b82f650', borderRadius: 6, color: '#3b82f6', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      📊 ดึงยอด
                    </button>
                  </div>
                  {prodLogData && (
                    <div style={{ fontSize: 10, color: '#3b82f6', marginTop: 2 }}>
                      📊 ยอดผลิต: {prodLogData.total_produced} ชิ้น (✅{prodLogData.total_good} ❌{prodLogData.total_ng}) | {prodLogData.total_bins} ถัง | {prodLogData.line}
                    </div>
                  )}
                </div>
                <div style={S.grid(2)}>
                  <div>
                    <label style={S.label}>👷 Operator *</label>
                    <input style={{ ...S.input, ...(errors.operator ? S.inputErr : {}) }}
                      placeholder="ชื่อ" value={form.operator} onChange={e => set('operator', e.target.value)} />
                    {errors.operator && <div style={S.err}>{errors.operator}</div>}
                  </div>
                  <div>
                    <label style={S.label}>🔍 Inspector</label>
                    <input style={S.input} placeholder="ชื่อ" value={form.inspector} onChange={e => set('inspector', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Part Info */}
          {partInfo && (
            <div style={{ ...S.panel, borderColor: '#10b98140', marginBottom: 16 }}>
              <div style={{ padding: '8px 16px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: '#10b981', fontWeight: 700, fontSize: 13 }}>📦 {partInfo.part_number} — {partInfo.part_name}</span>
                {partInfo.customer_name && <span style={{ color: '#94a3b8', fontSize: 11 }}>👤 {partInfo.customer_name}</span>}
                {partInfo.heat_treatment_type && partInfo.heat_treatment_type !== 'None' && (
                  <span style={S.tag('#f59e0b')}>🌡️ {partInfo.heat_treatment_type} {partInfo.hardness_spec && partInfo.hardness_spec !== 'None' ? `| ${partInfo.hardness_spec}` : ''}</span>
                )}
                {partInfo.billet_size && <span style={{ color: '#94a3b8', fontSize: 11 }}>🔩 {partInfo.billet_size} ({partInfo.billet_weight}g)</span>}
                {partInfo.heat_treatment_supplier && partInfo.heat_treatment_supplier !== 'None' && <span style={{ color: '#94a3b8', fontSize: 11 }}>🏭 {partInfo.heat_treatment_supplier}</span>}
              </div>
            </div>
          )}

          {/* ── Section 2: ยอดผลิต ── */}
          <div style={S.panel}>
            <div style={S.head('#10b981')}>
              <h3 style={S.title}>📊 ยอดผลิต — {form.line || '?'} / {form.partNumber || '?'} / Shift {form.shift}</h3>
            </div>
            <div style={S.body}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ ...S.label, color: '#e2e8f0', fontSize: 13 }}>ยอดผลิตรวม (ชิ้น) *</label>
                  <input style={{ ...S.input, ...S.inputLg, ...(errors.totalProduced ? S.inputErr : {}) }}
                    type="number" min="0" placeholder="0" value={form.totalProduced}
                    onChange={e => set('totalProduced', e.target.value)} />
                  {errors.totalProduced && <div style={S.err}>{errors.totalProduced}</div>}
                </div>
                {totalProduced > 0 && (
                  <>
                    <div style={S.statBox('#10b981')}>
                      <div style={{ color: '#64748b', fontSize: 10 }}>✅ Good</div>
                      <div style={{ color: '#10b981', fontSize: 18, fontWeight: 700 }}>{finalGood.toLocaleString()}</div>
                      <div style={{ color: '#10b981', fontSize: 11 }}>{pct(finalGood)}%</div>
                    </div>
                    <div style={S.statBox('#f59e0b')}>
                      <div style={{ color: '#64748b', fontSize: 10 }}>🔧 Rework</div>
                      <div style={{ color: '#f59e0b', fontSize: 18, fontWeight: 700 }}>{reworkQty.toLocaleString()}</div>
                      <div style={{ color: '#f59e0b', fontSize: 11 }}>{pct(reworkQty)}%</div>
                    </div>
                    <div style={S.statBox('#ef4444')}>
                      <div style={{ color: '#64748b', fontSize: 10 }}>❌ Scrap</div>
                      <div style={{ color: '#ef4444', fontSize: 18, fontWeight: 700 }}>{scrapQty.toLocaleString()}</div>
                      <div style={{ color: '#ef4444', fontSize: 11 }}>{pct(scrapQty)}%</div>
                    </div>
                  </>
                )}
              </div>
              {totalProduced > 0 && (
                <div style={{ marginTop: 10, display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: '#0f172a' }}>
                  {finalGood > 0 && <div style={{ width: `${pct(finalGood)}%`, background: '#10b981', transition: 'width 0.3s' }} />}
                  {reworkQty > 0 && <div style={{ width: `${pct(reworkQty)}%`, background: '#f59e0b' }} />}
                  {scrapQty > 0 && <div style={{ width: `${pct(scrapQty)}%`, background: '#ef4444' }} />}
                </div>
              )}
            </div>
          </div>

          {/* ── Section 3: ถังที่ตรวจสอบ ── */}
          <div style={S.panel}>
            <div style={S.head('#8b5cf6')}>
              <h3 style={S.title}>📦 ถังที่ตรวจสอบ
                {totalBins > 0 && <span style={{ fontWeight: 400, fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>
                  ({totalBins} ถัง | ✅ {goodBins} | ⚠️ {ngBins} | {totalBinQty.toLocaleString()} ชิ้น)
                </span>}
              </h3>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => addBins(1)} style={S.btn('#10b98130', '#10b981')}>➕ +1</button>
                <button onClick={() => addBins(5)} style={S.btn('#1e293b', '#64748b')}>+5</button>
                <button onClick={() => addBins(10)} style={S.btn('#1e293b', '#64748b')}>+10</button>
              </div>
            </div>
            <div style={S.body}>
              {bins.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#475569', padding: 16 }}>กด ➕ เพื่อเพิ่มถังที่ตรวจสอบ</div>
              ) : <>
                <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 140px 36px', gap: 6, marginBottom: 4 }}>
                  {['#', 'เลขที่ถัง', 'จำนวน', 'ผลตรวจ', ''].map(h =>
                    <span key={h} style={{ color: '#475569', fontSize: 10, fontWeight: 600 }}>{h}</span>
                  )}
                </div>
                {bins.map((bin, idx) => {
                  const linked = defects.some(d => d._binId === bin.id);
                  return (
                    <div key={bin.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 140px 36px', gap: 6, marginBottom: 4, alignItems: 'center',
                      padding: '3px 0', background: bin.result === 'ng' ? '#ef444410' : 'transparent', borderRadius: 4 }}>
                      <span style={{ color: bin.result === 'ng' ? '#ef4444' : '#64748b', fontSize: 11, fontWeight: 600 }}>
                        {idx+1}{linked ? '🔗' : ''}
                      </span>
                      <input style={{ ...S.input, padding: '5px 8px', borderColor: bin.result === 'ng' ? '#ef444450' : '#334155' }}
                        placeholder="B-001" value={bin.binNo} onChange={e => updateBin(bin.id, 'binNo', e.target.value)} />
                      <input style={{ ...S.input, padding: '5px 8px', textAlign: 'center' }}
                        type="number" min="0" placeholder="0" value={bin.qty} onChange={e => updateBin(bin.id, 'qty', e.target.value)} />
                      <div style={{ display: 'flex', gap: 3 }}>
                        <button onClick={() => updateBin(bin.id, 'result', 'good')} style={S.toggleBtn(bin.result === 'good', '#10b981')}>✅ผ่าน</button>
                        <button onClick={() => updateBin(bin.id, 'result', 'ng')} style={S.toggleBtn(bin.result === 'ng', '#ef4444')}>⚠️NG</button>
                      </div>
                      <button onClick={() => removeBin(bin.id)}
                        style={{ padding: '3px', background: '#ef444415', border: '1px solid #ef444430', borderRadius: 4, color: '#ef4444', cursor: 'pointer', fontSize: 11 }}>✕</button>
                    </div>
                  );
                })}
              </>}
            </div>
          </div>

          {/* ── Section 4: รายละเอียดของเสีย ── */}
          <div style={S.panel}>
            <div style={S.head('#ef4444')}>
              <h3 style={S.title}>🔍 รายละเอียดของเสีย ({defects.length})</h3>
              <button onClick={addDefect} style={S.btn('#3b82f630', '#3b82f6')}>➕ เพิ่มรายการ</button>
            </div>
            <div style={S.body}>
              {defects.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#475569', padding: 16 }}>
                  ไม่มีของเสีย — กด ⚠️NG ที่ถัง หรือ ➕ เพิ่มรายการ
                </div>
              ) : defects.map((d, idx) => {
                const remaining = (parseInt(d.foundQty) || 0) - (parseInt(d.goodQty) || 0) - (parseInt(d.rejectQty) || 0);
                return (
                  <div key={d.id} style={{ padding: 12, marginBottom: 12, background: '#1e293b', borderRadius: 8,
                    border: `1px solid ${d.type === 'scrap' ? '#ef444440' : '#f59e0b40'}` }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={S.tag(d.type === 'scrap' ? '#ef4444' : '#f59e0b')}>
                          #{idx+1} {d.type === 'scrap' ? '❌ Scrap' : '🔧 Rework'}
                        </span>
                        {d.binNo && <span style={{ color: '#64748b', fontSize: 10 }}>ถัง: {d.binNo}</span>}
                        {d._binId && <span style={S.tag('#3b82f6')}>🔗 เชื่อมถัง</span>}
                        {d.defectCode && <span style={S.tag('#8b5cf6')}>{d.defectCode}</span>}
                      </div>
                      <button onClick={() => removeDefect(d.id)} style={{ ...S.btn('#ef444420', '#ef4444'), padding: '2px 8px', fontSize: 11 }}>🗑️</button>
                    </div>

                    {/* Row 1: ปัญหา + ถัง + ประเภท */}
                    <div style={S.grid(5)}>
                      <div>
                        <label style={{ ...S.label, color: '#8b5cf6' }}>📋 F07</label>
                        <input style={{ ...S.input, borderColor: '#8b5cf650' }} placeholder="F07-xxx"
                          value={d.f07} onChange={e => updateDefect(d.id, 'f07', e.target.value)} />
                      </div>
                      <div>
                        <label style={S.label}>ถัง (Bin) *</label>
                        <input style={S.input} placeholder="B-001" value={d.binNo}
                          onChange={e => updateDefect(d.id, 'binNo', e.target.value)} readOnly={!!d._binId} />
                      </div>
                      <div>
                        <label style={S.label}>Defect Code *</label>
                        <select style={{ ...S.input, ...(errors[`dc_${idx}`] ? S.inputErr : {}) }}
                          value={d.defectCode} onChange={e => updateDefect(d.id, 'defectCode', e.target.value)}>
                          <option value="">เลือกปัญหา</option>
                          {(DEFECT_CATEGORIES || []).map(cat => (
                            <optgroup key={cat.id} label={`${cat.icon} ${cat.name}`}>
                              {DEFECT_CODES.filter(dc => dc.category === cat.id).map(dc =>
                                <option key={dc.code} value={dc.code}>{dc.code} — {dc.name}</option>
                              )}
                            </optgroup>
                          ))}
                        </select>
                        {errors[`dc_${idx}`] && <div style={S.err}>{errors[`dc_${idx}`]}</div>}
                      </div>
                      <div>
                        <label style={S.label}>ประเภท</label>
                        <div style={{ display: 'flex', gap: 3 }}>
                          <button onClick={() => updateDefect(d.id, 'type', 'rework')} style={S.toggleBtn(d.type === 'rework', '#f59e0b')}>🔧 ซ่อม</button>
                          <button onClick={() => updateDefect(d.id, 'type', 'scrap')} style={S.toggleBtn(d.type === 'scrap', '#ef4444')}>❌ ทิ้ง</button>
                        </div>
                      </div>
                      {d.type === 'rework' && (
                        <div>
                          <label style={S.label}>ผลซ่อม</label>
                          <select style={S.input} value={d.reworkResult} onChange={e => updateDefect(d.id, 'reworkResult', e.target.value)}>
                            <option value="pending">⏳ รอ</option><option value="good">✅ ดี</option><option value="scrap">❌ ไม่ผ่าน</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* วิธีซ่อม */}
                    {d.type === 'rework' && (
                      <div style={{ marginTop: 8 }}>
                        <label style={{ ...S.label, color: '#f59e0b' }}>🔧 วิธีซ่อม</label>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {REWORK_METHODS.map(m => (
                            <button key={m.code} onClick={() => updateDefect(d.id, 'reworkMethod', m.code)}
                              style={S.toggleBtn(d.reworkMethod === m.code, '#f59e0b')}>
                              {m.icon} {m.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Row 2: จำนวน */}
                    <div style={{ ...S.grid(4), marginTop: 8, padding: 8, background: '#0f172a', borderRadius: 6 }}>
                      <div>
                        <label style={{ ...S.label, color: '#f97316' }}>พบในถัง</label>
                        <input style={{ ...S.input, borderColor: '#f9731650' }} type="number" min="0"
                          value={d.foundQty} onChange={e => updateDefect(d.id, 'foundQty', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ ...S.label, color: '#10b981' }}>คัดแยก→ดี</label>
                        <input style={{ ...S.input, borderColor: '#10b98150' }} type="number" min="0"
                          value={d.goodQty} onChange={e => updateDefect(d.id, 'goodQty', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ ...S.label, color: '#ef4444' }}>คัดแยก→เสีย</label>
                        <input style={{ ...S.input, borderColor: '#ef444450' }} type="number" min="0"
                          value={d.rejectQty} onChange={e => updateDefect(d.id, 'rejectQty', e.target.value)} />
                      </div>
                      <div>
                        <label style={S.label}>คงเหลือ</label>
                        <input style={{ ...S.input, background: '#1e293b', color: remaining < 0 ? '#ef4444' : '#64748b' }}
                          readOnly value={d.foundQty ? remaining : '—'} />
                      </div>
                    </div>

                    {/* Row 3: ค่าวัด */}
                    <div style={{ ...S.grid(3), marginTop: 8 }}>
                      <div>
                        <label style={S.label}>ค่าวัด (Actual)</label>
                        <input style={S.input} placeholder="128.46" value={d.measurement} onChange={e => updateDefect(d.id, 'measurement', e.target.value)} />
                      </div>
                      <div>
                        <label style={S.label}>Spec</label>
                        <input style={S.input} placeholder="128.0 ± 0.05" value={d.spec} onChange={e => updateDefect(d.id, 'spec', e.target.value)} />
                      </div>
                      <div>
                        <label style={S.label}>หมายเหตุ</label>
                        <input style={S.input} placeholder="รายละเอียด" value={d.detail} onChange={e => updateDefect(d.id, 'detail', e.target.value)} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Submit ── */}
          <div style={S.panel}>
            <div style={S.body}>
              <div style={{ marginBottom: 10 }}>
                <label style={S.label}>หมายเหตุ</label>
                <textarea style={{ ...S.input, resize: 'vertical' }} rows={2} value={form.remark} onChange={e => set('remark', e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={handleSubmit} disabled={submitting}
                  style={{ flex: 2, padding: '14px', fontSize: 16, fontWeight: 700, borderRadius: 8,
                    background: submitting ? '#475569' : 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none', color: '#fff', cursor: submitting ? 'wait' : 'pointer' }}>
                  {submitting ? '⏳ กำลังบันทึก...' : '✅ บันทึกผลผลิต'}
                </button>
                <button onClick={handleReset} style={{ padding: '14px 20px', background: 'transparent', border: '1px solid #475569', borderRadius: 8, color: '#94a3b8', cursor: 'pointer' }}>🔄 รีเซ็ต</button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: Summary ═══ */}
        <div style={{ flex: 1, position: 'sticky', top: 16 }}>
          {/* สรุปผลผลิต */}
          <div style={S.panel}>
            <div style={S.head()}><h3 style={S.title}>📊 สรุป</h3></div>
            <div style={S.body}>
              {totalProduced > 0 ? (<>
                <div style={{ display: 'grid', gap: 6 }}>
                  {[
                    { label: 'ยอดผลิต', val: totalProduced, c: '#e2e8f0' },
                    { label: '✅ งานดีรวม', val: `${finalGood.toLocaleString()} (${pct(finalGood)}%)`, c: '#10b981' },
                    { label: '🔧 เสียซ่อม', val: `${reworkQty.toLocaleString()} (${pct(reworkQty)}%)`, c: '#f59e0b' },
                    { label: '❌ เสียทิ้ง', val: `${scrapQty.toLocaleString()} (${pct(scrapQty)}%)`, c: '#ef4444' },
                    { label: '📦 ตรวจ', val: `${totalBins} ถัง (✅${goodBins} ⚠️${ngBins})`, c: '#8b5cf6' },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#1e293b', borderRadius: 4, borderLeft: `3px solid ${r.c}` }}>
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>{r.label}</span>
                      <strong style={{ color: r.c, fontSize: 13 }}>{typeof r.val === 'number' ? r.val.toLocaleString() : r.val}</strong>
                    </div>
                  ))}
                </div>
                {/* Defects list */}
                {defects.length > 0 && (<>
                  <div style={{ borderTop: '1px solid #334155', margin: '10px 0' }} />
                  <h4 style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 6px 0' }}>🔍 ปัญหาที่พบ</h4>
                  {defects.map((d, i) => (
                    <div key={d.id} style={{ padding: '4px 8px', marginBottom: 3, background: '#0f172a', borderRadius: 4,
                      borderLeft: `2px solid ${d.type === 'scrap' ? '#ef4444' : '#f59e0b'}`, fontSize: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0' }}>
                        <span>{form.partNumber} | ถัง {d.binNo || '—'} | {form.line}</span>
                        <span style={{ color: d.type === 'scrap' ? '#ef4444' : '#f59e0b' }}>{d.type === 'scrap' ? '❌' : '🔧'} {d.rejectQty || 0}</span>
                      </div>
                      {d.defectCode && <div style={{ color: '#64748b' }}>{d.defectCode} {d.reworkMethod && `→ ${d.reworkMethod}`}</div>}
                    </div>
                  ))}
                </>)}
              </>) : <div style={{ textAlign: 'center', color: '#475569', padding: 20 }}>กรอกยอดผลิตเพื่อดูสรุป</div>}
            </div>
          </div>

          {/* บันทึกล่าสุด */}
          <div style={{ ...S.panel, marginTop: 16 }}>
            <div style={S.head()}><h3 style={S.title}>📝 บันทึกล่าสุด</h3></div>
            <div style={{ ...S.body, maxHeight: 180, overflow: 'auto' }}>
              {recentList.length === 0 ? <div style={{ textAlign: 'center', color: '#475569', padding: 12 }}>ยังไม่มี</div>
              : recentList.map((r, i) => (
                <div key={i} style={{ padding: '6px 10px', marginBottom: 4, background: '#1e293b', borderRadius: 4,
                  borderLeft: `3px solid ${parseFloat(r.pct) >= 99 ? '#10b981' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <strong style={{ color: '#e2e8f0' }}>{r.line} | {r.part} | {r.shift}</strong>
                    <span style={{ color: '#64748b' }}>{r.time}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>ผลิต {r.total} | ดี {r.good} ({r.pct}%) | NG {r.ng}</div>
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