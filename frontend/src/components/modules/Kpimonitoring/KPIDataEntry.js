/**
 * KPIDataEntry.js — v6 Simplified
 * =================================
 * บันทึกของเสียประจำวัน (QC)
 * 
 * 2 โหมด:
 * 1. ✍️ บันทึกเอง — กรอก Part/Line/Shift → เพิ่มของเสีย → บันทึก
 * 2. 📂 Import F07 — อ่านจาก Excel → เลือก → Import
 */
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../utils/api';
import { DEFECT_CODES, REWORK_METHODS, DEFECT_CATEGORIES } from './product_categories';

const S = {
  input: { padding: '7px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', width: '100%', fontSize: 15, boxSizing: 'border-box' },
  label: { display: 'block', marginBottom: 3, color: '#94a3b8', fontSize: 13, fontWeight: 600 },
  panel: { background: '#111827', border: '1px solid #1e293b', borderRadius: 8, marginBottom: 14 },
  head: (c) => ({ padding: '8px 14px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: c ? `3px solid ${c}` : 'none' }),
  body: { padding: 14 },
  title: { color: '#e2e8f0', fontSize: 15, fontWeight: 700, margin: 0 },
  grid: (n) => ({ display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 10 }),
  btn: (bg, c) => ({ padding: '6px 14px', background: bg, border: `1px solid ${c || bg}`, borderRadius: 6, color: c || '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }),
  tag: (c) => ({ padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: `${c}20`, color: c }),
  toggleBtn: (active, cA) => ({ flex: 1, padding: '5px', borderRadius: 5, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: active ? cA : '#0f172a', color: active ? '#fff' : '#64748b', border: `1px solid ${active ? cA : '#334155'}` }),
  stat: (c) => ({ padding: '8px', background: '#1e293b', borderRadius: 6, textAlign: 'center', borderLeft: `3px solid ${c}` }),
};

const KPIDataEntry = ({ onSubmitSuccess }) => {
  const [mode, setMode] = useState('manual'); // manual | import
  const [lines, setLines] = useState([]);
  const [form, setForm] = useState({
    productionDate: new Date().toISOString().split('T')[0],
    line: '', partNumber: '', lotNumber: '',
    shift: new Date().getHours() >= 6 && new Date().getHours() < 18 ? 'A' : 'B',
    operator: '',
  });
  const [partInfo, setPartInfo] = useState(null);
  const [defects, setDefects] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [recentList, setRecentList] = useState([]);
  const [lookupTimer, setLookupTimer] = useState(null);

  // F07 Import states
  const [importF07, setImportF07] = useState([]);
  const [importPreview, setImportPreview] = useState(false);
  const [importSaving, setImportSaving] = useState(false);
  const [importFilterMonth, setImportFilterMonth] = useState('');
  const [importFilterPart, setImportFilterPart] = useState('');
  const [importFilterLine, setImportFilterLine] = useState('');

  // F07 Defect + Rework mappings
  const F07_DEFECT_MAP = [
    { col: 15, code: 'PRO-001', name: 'Trial', type: 'scrap' },
    { col: 16, code: 'PRO-002', name: 'Block NG', type: 'scrap' },
    { col: 17, code: 'PRO-003', name: 'Pre-forg NG', type: 'scrap' },
    { col: 18, code: 'PRO-004', name: 'Trim Mistake', type: 'scrap' },
    { col: 19, code: 'PRO-005', name: 'Burr', type: 'rework' },
    { col: 20, code: 'DIM-001', name: 'Lower Spec', type: 'scrap' },
    { col: 21, code: 'DIM-002', name: 'Over Spec', type: 'scrap' },
    { col: 22, code: 'DIM-003', name: 'Mismatch', type: 'scrap' },
    { col: 23, code: 'DIM-004', name: 'Dis Center', type: 'scrap' },
    { col: 24, code: 'APP-008', name: 'Short Shot (ซ่อมได้)', type: 'rework' },
    { col: 25, code: 'APP-001', name: 'Short Shot (ทิ้ง)', type: 'scrap' },
    { col: 26, code: 'APP-002', name: 'Crack', type: 'scrap' },
    { col: 27, code: 'APP-003', name: 'Nick (ซ่อมได้)', type: 'rework' },
    { col: 28, code: 'APP-003', name: 'Nick (ทิ้ง)', type: 'scrap' },
    { col: 29, code: 'APP-004', name: 'Scale (ซ่อมได้)', type: 'rework' },
    { col: 30, code: 'APP-004', name: 'Scale (ทิ้ง)', type: 'scrap' },
    { col: 31, code: 'APP-005', name: 'Deep Scale', type: 'scrap' },
    { col: 32, code: 'APP-006', name: 'Stamp Mark', type: 'scrap' },
    { col: 33, code: 'APP-006', name: 'Worn Die', type: 'scrap' },
    { col: 34, code: 'APP-007', name: 'Bending', type: 'scrap' },
    { col: 35, code: 'APP-009', name: 'Other', type: 'scrap' },
  ];
  const F07_REWORK_MAP = [
    { col: 38, code: 'RW-001', name: 'Pre Lath/Welding' },
    { col: 39, code: 'RW-002', name: 'Grinding' },
    { col: 40, code: 'RW-003', name: 'Shotblast' },
    { col: 41, code: 'RW-004', name: 'Drilling' },
    { col: 42, code: 'RW-005', name: 'Trimming' },
    { col: 43, code: 'RW-006', name: 'Heat Treatment' },
    { col: 44, code: 'RW-007', name: 'Coining' },
    { col: 45, code: 'RW-008', name: 'Special Used' },
    { col: 46, code: 'RW-009', name: 'Machine' },
    { col: 47, code: 'RW-010', name: 'Other' },
  ];

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── Fetch lines ─────────────────────────────────────────────
  useEffect(() => {
    apiClient.get('/kpi/machines/status').then(res => {
      const d = res?.data?.data || res?.data || [];
      setLines(Array.isArray(d) ? d : []);
    }).catch(() => {
      setLines([
        ...Array.from({ length: 8 }, (_, i) => ({ code: `Line-${i+1}`, name: `Line ${i+1}` })),
        { code: 'Line-CT', name: 'Line CT' }, { code: 'Line-PD5', name: 'Line PD5' }, { code: 'Line-MC', name: 'Line MC' },
      ]);
    });
  }, []);

  // ── Part lookup ─────────────────────────────────────────────
  const lookupPart = async (pn) => {
    if (!pn || pn.length < 2) { setPartInfo(null); return; }
    try {
      const res = await apiClient.get(`/kpi/parts/lookup/${encodeURIComponent(pn)}`);
      setPartInfo(res?.data?.data || res?.data || null);
    } catch { setPartInfo(null); }
  };
  const onPartChange = (v) => {
    set('partNumber', v);
    clearTimeout(lookupTimer);
    setLookupTimer(setTimeout(() => lookupPart(v), 500));
  };

  // ── Computed ────────────────────────────────────────────────
  const reworkQty = defects.filter(d => d.type === 'rework').reduce((s, d) => s + (parseInt(d.qty) || 0), 0);
  const scrapQty = defects.filter(d => d.type === 'scrap').reduce((s, d) => s + (parseInt(d.qty) || 0), 0);
  const totalNG = reworkQty + scrapQty;

  // ── Defect management ───────────────────────────────────────
  const addDefect = () => {
    setDefects(p => [...p, { id: Date.now(), defectCode: '', type: 'rework', qty: '', binNo: '', reworkMethod: '', detail: '' }]);
  };
  const updateDefect = (id, field, value) => setDefects(p => p.map(d => d.id === id ? { ...d, [field]: value } : d));
  const removeDefect = (id) => setDefects(p => p.filter(d => d.id !== id));

  // ── Submit ──────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.line) e.line = 'เลือก Line';
    if (!form.partNumber) e.partNumber = 'ระบุ Part No.';
    if (!form.operator) e.operator = 'ระบุชื่อ';
    defects.forEach((d, i) => { if (!d.defectCode) e[`dc_${i}`] = true; if (!d.qty) e[`qty_${i}`] = true; });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await apiClient.post('/kpi/production', {
        production_date: form.productionDate,
        machine_code: form.line,
        part_number: form.partNumber,
        part_name: partInfo?.part_name || null,
        lot_number: form.lotNumber || null,
        shift: form.shift,
        operator_name: form.operator,
        total_produced: 0, good_qty: 0,
        rework_qty: reworkQty, scrap_qty: scrapQty,
        rework_good_qty: 0, rework_scrap_qty: 0, rework_pending_qty: reworkQty,
        remark: `Manual Entry`,
        defect_items: defects.map(d => ({
          defect_code: d.defectCode, defect_type: d.type, quantity: parseInt(d.qty) || 1,
          bin_no: d.binNo || null, detail: d.detail || null,
          rework_result: d.type === 'rework' ? 'pending' : null,
          rework_method: d.type === 'rework' ? d.reworkMethod : null,
        })),
      });
      setRecentList(p => [{ line: form.line, part: form.partNumber, rw: reworkQty, sc: scrapQty, time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) }, ...p].slice(0, 10));
      showToast(`✅ บันทึกสำเร็จ — RW:${reworkQty} SC:${scrapQty}`);
      setDefects([]); set('partNumber', ''); set('lotNumber', ''); setPartInfo(null);
      onSubmitSuccess?.();
    } catch (err) {
      showToast('❌ ' + (err?.response?.data?.error || err.message));
    } finally { setSubmitting(false); }
  };

  // ═══════════════════════════════════════════════════════════
  // F07 IMPORT (เหมือนเดิม — ไม่เปลี่ยน logic)
  // ═══════════════════════════════════════════════════════════
  const handleF07Import = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const sheetName = wb.SheetNames.find(n => n.includes('DATA-F07') || n.includes('F07')) || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      let baseYear = 2026;
      for (let i = 1; i <= 20; i++) {
        const yr = parseInt(rows[i]?.[0]);
        if (yr > 2500) { baseYear = yr - 543; break; }
        if (yr >= 2020 && yr <= 2030) { baseYear = yr; break; }
      }

      const parsed = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const partNo = String(r[4] || '').trim();
        if (!partNo) continue;
        const mo = String(r[1] || '').trim().padStart(2, '0');
        const day = String(r[2] || '').trim().padStart(2, '0');
        const dateStr = `${baseYear}-${mo}-${day}`;

        let lineVal = String(r[13] || '').trim();
        if (lineVal && !lineVal.toLowerCase().startsWith('line')) {
          if (/^\d+$/.test(lineVal)) lineVal = `Line-${lineVal}`;
          else if (lineVal === 'MC') lineVal = 'Line-MC';
          else if (lineVal === 'PD5') lineVal = 'Line-PD5';
          else if (lineVal === 'Cutting') lineVal = 'Line-CT';
          else lineVal = `Line-${lineVal}`;
        }

        const defectItems = [];
        F07_DEFECT_MAP.forEach(dm => {
          const qty = parseInt(r[dm.col]) || 0;
          if (qty > 0) defectItems.push({ code: dm.code, name: dm.name, type: dm.type, qty });
        });
        const reworkMethods = [];
        F07_REWORK_MAP.forEach(rm => {
          const qty = parseInt(r[rm.col]) || 0;
          if (qty > 0) reworkMethods.push({ code: rm.code, name: rm.name, qty });
        });

        const totalNG = parseInt(r[37]) || 0;
        const reworkQty2 = parseInt(r[49]) || 0;
        const scrapQty2 = parseInt(r[50]) || 0;

        parsed.push({
          id: Date.now() + i, date: dateStr, month: mo,
          f07: String(r[3] || ''), partNo, partName: String(r[5] || ''),
          customer: String(r[6] || ''), lot: String(r[9] || ''),
          source: String(r[11] || ''), bin: String(r[12] || ''),
          line: lineVal, shift: String(r[14] || 'A').trim(),
          defects: defectItems, reworkMethods,
          totalNG, reworkQty: reworkQty2, scrapQty: scrapQty2,
          remark: String(r[36] || ''), selected: true,
        });
      }

      if (!parsed.length) { showToast('❌ ไม่พบข้อมูล'); return; }
      setImportF07(parsed);
      setImportPreview(true);
      showToast(`📂 อ่าน ${parsed.length} รายการ จาก "${sheetName}"`);
    } catch (err) { showToast('❌ ' + err.message); }
    e.target.value = '';
  };

  // F07 Filtered
  const importF07Filtered = importF07.filter(r =>
    (!importFilterMonth || r.month === importFilterMonth) &&
    (!importFilterPart || r.partNo.toLowerCase().includes(importFilterPart.toLowerCase())) &&
    (!importFilterLine || r.line === importFilterLine)
  );
  const importMonths = [...new Set(importF07.map(r => r.month))].sort();
  const importLines = [...new Set(importF07.map(r => r.line))].sort();

  const toggleF07Row = (id) => setImportF07(p => p.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
  const toggleF07All = () => {
    const allSel = importF07Filtered.every(r => r.selected);
    const ids = new Set(importF07Filtered.map(r => r.id));
    setImportF07(p => p.map(r => ids.has(r.id) ? { ...r, selected: !allSel } : r));
  };

  const submitF07Import = async () => {
    const selected = importF07Filtered.filter(r => r.selected);
    if (!selected.length) { showToast('❌ กรุณาเลือกรายการ'); return; }
    setImportSaving(true);

    // Aggregate by conflict key
    const grouped = {};
    for (const row of selected) {
      const key = `${row.date}|${row.line}|${row.partNo}|${row.shift || 'A'}`;
      if (!grouped[key]) {
        grouped[key] = { date: row.date, line: row.line, partNo: row.partNo, partName: row.partName || '', lot: row.lot || '', shift: row.shift || 'A', reworkQty: 0, scrapQty: 0, totalNG: 0, f07s: new Set(), bins: [], defects: [], reworkMethods: [] };
      }
      const g = grouped[key];
      g.reworkQty += row.reworkQty || 0;
      g.scrapQty += row.scrapQty || 0;
      g.totalNG += row.totalNG || 0;
      if (row.f07) g.f07s.add(row.f07);
      if (row.bin) g.bins.push({ bin_no: String(row.bin), qty: row.totalNG, result: 'has_defect' });
      if (row.lot && !g.lot) g.lot = row.lot;
      if (row.partName && !g.partName) g.partName = row.partName;
      row.defects.forEach(d => g.defects.push({
        f07_doc_no: row.f07 || null, bin_no: row.bin || null, found_qty: d.qty, sorted_reject: d.qty,
        defect_code: d.code, defect_type: d.type, quantity: d.qty, detail: d.name,
        rework_result: d.type === 'rework' ? 'pending' : null,
        rework_method: row.reworkMethods.length > 0 ? row.reworkMethods[0].code : null,
      }));
    }

    let ok = 0, fail = 0;
    for (const g of Object.values(grouped)) {
      try {
        await apiClient.post('/kpi/production', {
          production_date: g.date, machine_code: g.line, part_number: g.partNo,
          part_name: g.partName || null, lot_number: g.lot || null, shift: g.shift,
          operator_name: form.operator || 'Import F07',
          total_produced: 0, good_qty: 0, rework_qty: g.reworkQty, scrap_qty: g.scrapQty,
          rework_good_qty: 0, rework_scrap_qty: 0, rework_pending_qty: g.reworkQty,
          import_mode: 'replace',
          remark: `Import F07 #${[...g.f07s].join(',')}`,
          inspected_bins: g.bins, defect_items: g.defects,
        });
        ok++;
      } catch (err) {
        fail++;
        console.error(`❌ F07 Import ${g.partNo}:`, err?.response?.data?.error || err.message);
      }
    }
    setImportSaving(false);
    showToast(`✅ Import ${ok}/${Object.keys(grouped).length} กลุ่ม (${selected.length} แถว)${fail > 0 ? ` | ❌ ${fail}` : ''}`);
    setImportPreview(false); setImportF07([]);
    onSubmitSuccess?.();
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 8,
          background: toast.startsWith('❌') ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}

      {/* ── Mode Toggle ────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={() => setMode('manual')} style={{ padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 16,
          background: mode === 'manual' ? '#3b82f630' : '#0f172a', border: `2px solid ${mode === 'manual' ? '#3b82f6' : '#334155'}`, color: mode === 'manual' ? '#3b82f6' : '#64748b' }}>
          ✍️ บันทึกเอง
        </button>
        <label style={{ padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 16,
          background: mode === 'import' ? '#f59e0b30' : '#0f172a', border: `2px solid ${mode === 'import' ? '#f59e0b' : '#334155'}`, color: mode === 'import' ? '#f59e0b' : '#64748b',
          display: 'flex', alignItems: 'center', gap: 6 }}>
          📂 Import F07 Excel
          <input type="file" accept=".xlsx,.xls" onChange={(e) => { setMode('import'); handleF07Import(e); }} style={{ display: 'none' }} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* ═══ LEFT: Form/Import ═══ */}
        <div style={{ flex: 2 }}>

          {/* ══════════════════════════════════════════════ */}
          {/* MANUAL ENTRY MODE */}
          {/* ══════════════════════════════════════════════ */}
          {mode === 'manual' && !importPreview && (<>
            {/* ── ข้อมูลหลัก (1 section รวม) ── */}
            <div style={S.panel}>
              <div style={S.head('#3b82f6')}><h3 style={S.title}>📋 บันทึกของเสีย</h3></div>
              <div style={S.body}>
                <div style={S.grid(5)}>
                  <div>
                    <label style={S.label}>📅 วันที่</label>
                    <input type="date" style={S.input} value={form.productionDate} onChange={e => set('productionDate', e.target.value)} />
                  </div>
                  <div>
                    <label style={S.label}>🏭 Line *</label>
                    <select style={{ ...S.input, ...(errors.line ? { borderColor: '#ef4444' } : {}) }} value={form.line} onChange={e => set('line', e.target.value)}>
                      <option value="">เลือก</option>
                      {lines.map(l => <option key={l.code} value={l.code}>{l.code}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>📦 Part No. *</label>
                    <input style={{ ...S.input, ...(errors.partNumber ? { borderColor: '#ef4444' } : {}), ...(partInfo ? { borderColor: '#10b981' } : {}) }}
                      placeholder="W21-04" value={form.partNumber} onChange={e => onPartChange(e.target.value)} />
                    {partInfo && <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>✅ {partInfo.part_name}</div>}
                  </div>
                  <div>
                    <label style={S.label}>⏰ Shift</label>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {['A', 'B', 'AB'].map(s => (
                        <button key={s} onClick={() => set('shift', s)} style={S.toggleBtn(form.shift === s, '#3b82f6')}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={S.label}>👷 Operator *</label>
                    <input style={{ ...S.input, ...(errors.operator ? { borderColor: '#ef4444' } : {}) }}
                      placeholder="ชื่อ" value={form.operator} onChange={e => set('operator', e.target.value)} />
                  </div>
                </div>
                <div style={{ ...S.grid(2), marginTop: 8 }}>
                  <div>
                    <label style={S.label}>Lot No.</label>
                    <input style={S.input} placeholder="1030/C1003" value={form.lotNumber} onChange={e => set('lotNumber', e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                    {totalNG > 0 && (
                      <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                        <div style={S.stat('#f59e0b')}>
                          <div style={{ color: '#64748b', fontSize: 11 }}>🔧 Rework</div>
                          <div style={{ color: '#f59e0b', fontSize: 18, fontWeight: 700 }}>{reworkQty}</div>
                        </div>
                        <div style={S.stat('#ef4444')}>
                          <div style={{ color: '#64748b', fontSize: 11 }}>🗑️ Scrap</div>
                          <div style={{ color: '#ef4444', fontSize: 18, fontWeight: 700 }}>{scrapQty}</div>
                        </div>
                        <div style={S.stat('#e2e8f0')}>
                          <div style={{ color: '#64748b', fontSize: 11 }}>NG รวม</div>
                          <div style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700 }}>{totalNG}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── ของเสีย (compact) ── */}
            <div style={S.panel}>
              <div style={S.head('#ef4444')}>
                <h3 style={S.title}>🔍 รายการของเสีย ({defects.length})</h3>
                <button onClick={addDefect} style={S.btn('#3b82f630', '#3b82f6')}>➕ เพิ่ม</button>
              </div>
              <div style={S.body}>
                {defects.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#475569', padding: 16 }}>กด ➕ เพิ่มรายการของเสีย</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155' }}>
                        {['Defect Code', 'ประเภท', 'จำนวน', 'ถัง', 'วิธีซ่อม', 'หมายเหตุ', ''].map(h =>
                          <th key={h} style={{ padding: '6px 4px', color: '#64748b', fontSize: 12, textAlign: 'left' }}>{h}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {defects.map((d, idx) => (
                        <tr key={d.id} style={{ borderBottom: '1px solid #1e293b', background: d.type === 'scrap' ? '#ef444408' : 'transparent' }}>
                          <td style={{ padding: '4px' }}>
                            <select style={{ ...S.input, padding: '5px 6px', fontSize: 13, ...(errors[`dc_${idx}`] ? { borderColor: '#ef4444' } : {}) }}
                              value={d.defectCode} onChange={e => updateDefect(d.id, 'defectCode', e.target.value)}>
                              <option value="">เลือก</option>
                              {(DEFECT_CATEGORIES || []).map(cat => (
                                <optgroup key={cat.id} label={`${cat.icon} ${cat.name}`}>
                                  {DEFECT_CODES.filter(dc => dc.category === cat.id).map(dc =>
                                    <option key={dc.code} value={dc.code}>{dc.code} {dc.name}</option>
                                  )}
                                </optgroup>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '4px', width: 100 }}>
                            <div style={{ display: 'flex', gap: 2 }}>
                              <button onClick={() => updateDefect(d.id, 'type', 'rework')} style={{ ...S.toggleBtn(d.type === 'rework', '#f59e0b'), fontSize: 12, padding: '4px' }}>🔧</button>
                              <button onClick={() => updateDefect(d.id, 'type', 'scrap')} style={{ ...S.toggleBtn(d.type === 'scrap', '#ef4444'), fontSize: 12, padding: '4px' }}>🗑️</button>
                            </div>
                          </td>
                          <td style={{ padding: '4px', width: 70 }}>
                            <input type="number" min="1" style={{ ...S.input, padding: '5px', textAlign: 'center', ...(errors[`qty_${idx}`] ? { borderColor: '#ef4444' } : {}) }}
                              value={d.qty} onChange={e => updateDefect(d.id, 'qty', e.target.value)} />
                          </td>
                          <td style={{ padding: '4px', width: 80 }}>
                            <input style={{ ...S.input, padding: '5px', fontSize: 13 }} placeholder="B-001"
                              value={d.binNo} onChange={e => updateDefect(d.id, 'binNo', e.target.value)} />
                          </td>
                          <td style={{ padding: '4px', width: 120 }}>
                            {d.type === 'rework' ? (
                              <select style={{ ...S.input, padding: '5px', fontSize: 12 }} value={d.reworkMethod}
                                onChange={e => updateDefect(d.id, 'reworkMethod', e.target.value)}>
                                <option value="">เลือก</option>
                                {REWORK_METHODS.map(m => <option key={m.code} value={m.code}>{m.icon} {m.name}</option>)}
                              </select>
                            ) : <span style={{ color: '#475569', fontSize: 12 }}>—</span>}
                          </td>
                          <td style={{ padding: '4px' }}>
                            <input style={{ ...S.input, padding: '5px', fontSize: 13 }} placeholder="..."
                              value={d.detail} onChange={e => updateDefect(d.id, 'detail', e.target.value)} />
                          </td>
                          <td style={{ padding: '4px', width: 30 }}>
                            <button onClick={() => removeDefect(d.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* ── Submit ── */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleSubmit} disabled={submitting}
                style={{ flex: 2, padding: '12px', fontSize: 17, fontWeight: 700, borderRadius: 8,
                  background: submitting ? '#475569' : 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none', color: '#fff', cursor: submitting ? 'wait' : 'pointer' }}>
                {submitting ? '⏳ กำลังบันทึก...' : `✅ บันทึก (RW:${reworkQty} SC:${scrapQty})`}
              </button>
              <button onClick={() => { setDefects([]); setErrors({}); }} style={{ padding: '12px 16px', background: 'transparent', border: '1px solid #475569', borderRadius: 8, color: '#94a3b8', cursor: 'pointer' }}>🔄</button>
            </div>
          </>)}

          {/* ══════════════════════════════════════════════ */}
          {/* F07 IMPORT PREVIEW */}
          {/* ══════════════════════════════════════════════ */}
          {importPreview && importF07.length > 0 && (
            <div style={{ ...S.panel, borderColor: '#f59e0b40' }}>
              <div style={S.head('#f59e0b')}>
                <h3 style={S.title}>📂 F07 Import — {importF07.length} รายการ
                  <span style={{ fontWeight: 400, fontSize: 13, color: '#94a3b8', marginLeft: 8 }}>
                    (แสดง {importF07Filtered.length} | เลือก {importF07Filtered.filter(r => r.selected).length} | NG {importF07Filtered.filter(r => r.selected).reduce((s, r) => s + r.totalNG, 0).toLocaleString()})
                  </span>
                </h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={submitF07Import} disabled={importSaving} style={S.btn(importSaving ? '#475569' : '#10b981', '#fff')}>
                    {importSaving ? '⏳...' : `✅ Import (${importF07Filtered.filter(r => r.selected).length})`}
                  </button>
                  <button onClick={() => { setImportPreview(false); setImportF07([]); setMode('manual'); }} style={S.btn('#ef444420', '#ef4444')}>✕</button>
                </div>
              </div>
              {/* Filters */}
              <div style={{ padding: '6px 14px', borderBottom: '1px solid #1e293b', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <select style={{ ...S.input, width: 110, padding: '4px 6px', fontSize: 13 }} value={importFilterMonth} onChange={e => setImportFilterMonth(e.target.value)}>
                  <option value="">ทุกเดือน</option>
                  {importMonths.map(m => <option key={m} value={m}>เดือน {parseInt(m)} ({importF07.filter(r => r.month === m).length})</option>)}
                </select>
                <input style={{ ...S.input, width: 90, padding: '4px 6px', fontSize: 13 }} placeholder="Part..." value={importFilterPart} onChange={e => setImportFilterPart(e.target.value)} />
                <select style={{ ...S.input, width: 90, padding: '4px 6px', fontSize: 13 }} value={importFilterLine} onChange={e => setImportFilterLine(e.target.value)}>
                  <option value="">ทุก Line</option>
                  {importLines.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <button onClick={toggleF07All} style={{ ...S.btn('#1e293b', '#64748b'), padding: '4px 8px', fontSize: 12 }}>
                  {importF07Filtered.every(r => r.selected) ? '☐ ยกเลิก' : '☑ ทั้งหมด'}
                </button>
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', alignItems: 'center' }}>
                  <label style={S.label}>👷</label>
                  <input style={{ ...S.input, width: 100, padding: '4px 6px', fontSize: 13 }} placeholder="Operator" value={form.operator} onChange={e => set('operator', e.target.value)} />
                </div>
              </div>
              {/* Table */}
              <div style={{ ...S.body, maxHeight: 500, overflow: 'auto', padding: '6px 14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #334155' }}>
                      {['☑', 'วันที่', 'F07', 'Part', 'Lot', 'Line', 'Shift', 'NG', 'RW', 'SC', 'Defects'].map(h =>
                        <th key={h} style={{ padding: '4px 3px', color: '#64748b', fontSize: 11, textAlign: 'left' }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {importF07Filtered.map((row, idx) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #1e293b', opacity: row.selected ? 1 : 0.3 }}>
                        <td style={{ padding: '2px' }}><input type="checkbox" checked={row.selected} onChange={() => toggleF07Row(row.id)} /></td>
                        <td style={{ padding: '2px', color: '#3b82f6', fontSize: 12 }}>{row.date?.slice(5)}</td>
                        <td style={{ padding: '2px', color: '#8b5cf6', fontSize: 12 }}>{row.f07}</td>
                        <td style={{ padding: '2px', fontWeight: 600 }}>{row.partNo}</td>
                        <td style={{ padding: '2px', color: '#f59e0b', fontSize: 11 }}>{row.lot || '—'}</td>
                        <td style={{ padding: '2px' }}><span style={S.tag('#8b5cf6')}>{row.line}</span></td>
                        <td style={{ padding: '2px', color: '#94a3b8' }}>{row.shift}</td>
                        <td style={{ padding: '2px', fontWeight: 700, color: '#ef4444' }}>{row.totalNG}</td>
                        <td style={{ padding: '2px', color: '#f59e0b' }}>{row.reworkQty || 0}</td>
                        <td style={{ padding: '2px', color: '#ef4444' }}>{row.scrapQty || 0}</td>
                        <td style={{ padding: '2px' }}>
                          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            {row.defects.slice(0, 2).map((d, di) => <span key={di} style={{ ...S.tag(d.type === 'scrap' ? '#ef4444' : '#f59e0b'), fontSize: 9 }}>{d.name}({d.qty})</span>)}
                            {row.defects.length > 2 && <span style={{ color: '#475569', fontSize: 9 }}>+{row.defects.length - 2}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #334155', background: '#0f172a' }}>
                      <td colSpan={7} style={{ padding: '6px', fontWeight: 700, color: '#e2e8f0', fontSize: 13 }}>
                        รวม {importF07Filtered.filter(r => r.selected).length} / {importF07Filtered.length}
                      </td>
                      <td style={{ padding: '6px', fontWeight: 700, color: '#ef4444' }}>{importF07Filtered.filter(r => r.selected).reduce((s, r) => s + r.totalNG, 0).toLocaleString()}</td>
                      <td style={{ padding: '6px', fontWeight: 700, color: '#f59e0b' }}>{importF07Filtered.filter(r => r.selected).reduce((s, r) => s + r.reworkQty, 0).toLocaleString()}</td>
                      <td style={{ padding: '6px', fontWeight: 700, color: '#ef4444' }}>{importF07Filtered.filter(r => r.selected).reduce((s, r) => s + r.scrapQty, 0).toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ═══ RIGHT: Summary ═══ */}
        <div style={{ flex: 1, position: 'sticky', top: 16, minWidth: 220 }}>
          <div style={S.panel}>
            <div style={S.head()}><h3 style={S.title}>📝 บันทึกล่าสุด</h3></div>
            <div style={{ ...S.body, maxHeight: 400, overflow: 'auto' }}>
              {recentList.length === 0 ? <div style={{ textAlign: 'center', color: '#475569', padding: 16, fontSize: 14 }}>ยังไม่มี</div>
              : recentList.map((r, i) => (
                <div key={i} style={{ padding: '6px 10px', marginBottom: 4, background: '#1e293b', borderRadius: 4, borderLeft: '3px solid #3b82f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <strong style={{ color: '#e2e8f0' }}>{r.line} | {r.part}</strong>
                    <span style={{ color: '#64748b' }}>{r.time}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    🔧 {r.rw} | 🗑️ {r.sc}
                  </div>
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