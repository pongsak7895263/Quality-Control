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
  const [importF07, setImportF07] = useState([]); // import จาก F07 Excel
  const [importPreview, setImportPreview] = useState(false);
  const [importSaving, setImportSaving] = useState(false);
  const [importFilterMonth, setImportFilterMonth] = useState('');
  const [importFilterPart, setImportFilterPart] = useState('');
  const [importFilterLine, setImportFilterLine] = useState('');

  // ─── F07 Excel → Defect Code mapping ──────────────────────
  // Col P-AJ ใน Excel → defect codes ในระบบ
  const F07_DEFECT_MAP = [
    { col: 15, code: 'PRO-001', name: 'Trial', type: 'scrap' },          // P = 1.Trail
    { col: 16, code: 'PRO-002', name: 'Block NG', type: 'scrap' },       // Q = 2.Block NG
    { col: 17, code: 'PRO-003', name: 'Pre-forg NG', type: 'scrap' },    // R = 3.Pre-forg
    { col: 18, code: 'PRO-004', name: 'Trim Mistake', type: 'scrap' },   // S = 4.Trim
    { col: 19, code: 'PRO-005', name: 'Burr', type: 'rework' },          // T = 5.Burr
    { col: 20, code: 'DIM-001', name: 'Lower Spec', type: 'scrap' },     // U = 6.Lower Spec
    { col: 21, code: 'DIM-002', name: 'Over Spec', type: 'scrap' },      // V = 7.Over Spec
    { col: 22, code: 'DIM-003', name: 'Mismatch', type: 'scrap' },       // W = 8.Mismatch
    { col: 23, code: 'DIM-004', name: 'Dis Center', type: 'scrap' },     // X = 9.Dis Center
    { col: 24, code: 'APP-008', name: 'Short Shot (ซ่อมได้)', type: 'rework' }, // Y = 10.1 Short Shot ซ่อมได้
    { col: 25, code: 'APP-001', name: 'Short Shot (ทิ้ง)', type: 'scrap' },     // Z = 10.2 Short Shot เสียทิ้ง
    { col: 26, code: 'APP-002', name: 'Crack', type: 'scrap' },          // AA = 11.Crack
    { col: 27, code: 'APP-003', name: 'Nick (ซ่อมได้)', type: 'rework' },// AB = 12.1 Nick ซ่อมได้
    { col: 28, code: 'APP-003', name: 'Nick (ทิ้ง)', type: 'scrap' },    // AC = 12.2 Nick เสียทิ้ง
    { col: 29, code: 'APP-004', name: 'Scale (ซ่อมได้)', type: 'rework' },// AD = 13.1 Scale ซ่อมได้
    { col: 30, code: 'APP-004', name: 'Scale (ทิ้ง)', type: 'scrap' },   // AE = 13.2 Scale เสียทิ้ง
    { col: 31, code: 'APP-005', name: 'Deep Scale', type: 'scrap' },     // AF = 14.Deep Scale
    { col: 32, code: 'APP-006', name: 'Stamp Mark', type: 'scrap' },     // AG = 15.Stamp Mark
    { col: 33, code: 'APP-006', name: 'Worn Die', type: 'scrap' },       // AH = 16.Worn Die
    { col: 34, code: 'APP-007', name: 'Bending', type: 'scrap' },        // AI = 17.Bending
    { col: 35, code: 'APP-009', name: 'Other', type: 'scrap' },          // AJ = 18.Other
  ];

  // Col AM-AV → Rework methods
  const F07_REWORK_MAP = [
    { col: 38, code: 'RW-001', name: 'Pre Lath/Welding' },  // AM
    { col: 39, code: 'RW-002', name: 'Grinding' },          // AN
    { col: 40, code: 'RW-003', name: 'Shotblast' },         // AO
    { col: 41, code: 'RW-004', name: 'Drilling' },          // AP
    { col: 42, code: 'RW-005', name: 'Trimming' },          // AQ
    { col: 43, code: 'RW-006', name: 'Heat Treatment' },    // AR
    { col: 44, code: 'RW-007', name: 'Coining' },           // AS
    { col: 45, code: 'RW-008', name: 'Special Used' },      // AT
    { col: 46, code: 'RW-009', name: 'Machine' },           // AU
    { col: 47, code: 'RW-010', name: 'Other' },             // AV
  ];

  // ─── Import F07 Excel ─────────────────────────────────────
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

      // Detect year from col A (ปี พ.ศ.) — only row 2 has it, rest inherit
      let baseYear = 2026;
      for (let i = 1; i < Math.min(20, rows.length); i++) {
        const yr = parseInt(rows[i][0]);
        if (yr > 2500) { baseYear = yr - 543; break; } // พ.ศ. → ค.ศ.
        if (yr > 2000 && yr < 2100) { baseYear = yr; break; }
      }

      const parsed = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const partNo = String(r[4] || '').trim(); // E = รหัสสินค้า
        if (!partNo) continue;

        // วันที่: เดือน(B) + วันที่(C) + baseYear
        const mo = String(r[1] || '').trim().padStart(2, '0');
        const dy = String(r[2] || '').trim().padStart(2, '0');
        let dateStr = '';
        if (mo !== '00' && dy !== '00' && mo && dy) {
          dateStr = `${baseYear}-${mo}-${dy}`;
        }

        let lineVal = String(r[13] || '').trim(); // N = LINE
        if (lineVal && !lineVal.toLowerCase().startsWith('line')) {
          if (/^\d+$/.test(lineVal)) lineVal = `Line-${lineVal}`;
          else if (lineVal === 'MC') lineVal = 'Line-MC';
          else if (lineVal === 'PD5') lineVal = 'Line-PD5';
          else if (lineVal === 'Cutting') lineVal = 'Line-CT';
          else lineVal = `Line-${lineVal}`;
        }

        // Parse defects
        const defectItems = [];
        F07_DEFECT_MAP.forEach(dm => {
          const qty = parseInt(r[dm.col]) || 0;
          if (qty > 0) defectItems.push({ code: dm.code, name: dm.name, type: dm.type, qty });
        });

        // Parse rework methods
        const reworkMethods = [];
        F07_REWORK_MAP.forEach(rm => {
          const qty = parseInt(r[rm.col]) || 0;
          if (qty > 0) reworkMethods.push({ code: rm.code, name: rm.name, qty });
        });

        const totalNG = parseInt(r[37]) || 0; // AL = รวม NG
        const reworkQty = parseInt(r[49]) || 0; // AX = REWORK
        const scrapQty = parseInt(r[50]) || 0; // AY = SCRAP

        parsed.push({
          id: Date.now() + i,
          date: dateStr,
          month: mo,
          f07: String(r[3] || ''),        // D = เลขที่ F07
          partNo,
          partName: String(r[5] || ''),    // F = ชื่อชิ้นงาน
          customer: String(r[6] || ''),    // G = ลูกค้า
          group: String(r[7] || ''),       // H = GROUP (AUTO/GENERAL)
          material: String(r[8] || ''),    // I = เกรดวัตถุดิบ
          lot: String(r[9] || ''),         // J = Lot
          source: String(r[11] || ''),     // L = Source (Forge/Final/MC)
          bin: String(r[12] || ''),        // M = เลขที่ถัง
          line: lineVal,
          shift: String(r[14] || 'A').trim(), // O = Shift
          defects: defectItems,
          reworkMethods,
          totalNG, reworkQty, scrapQty,
          remark: String(r[36] || ''),     // AK = หมายเหตุ
          selected: true,
        });
      }

      if (parsed.length === 0) {
        showToast('❌ ไม่พบข้อมูลในไฟล์');
        return;
      }

      // Detect available months for filter
      const months = [...new Set(parsed.map(r => r.month).filter(Boolean))].sort();
      setImportFilterMonth(months.length > 0 ? months[months.length - 1] : '');
      setImportFilterPart('');
      setImportFilterLine('');
      setImportF07(parsed);
      setImportPreview(true);
      showToast(`📂 F07: อ่านได้ ${parsed.length} รายการ (${baseYear}) จาก "${sheetName}"`);
    } catch (err) {
      console.error('F07 import error:', err);
      showToast('❌ อ่านไฟล์ไม่สำเร็จ: ' + err.message);
    }
    e.target.value = '';
  };

  // Filtered import data
  const importF07Filtered = importF07.filter(r => {
    if (importFilterMonth && r.month !== importFilterMonth) return false;
    if (importFilterPart && !r.partNo.toLowerCase().includes(importFilterPart.toLowerCase())) return false;
    if (importFilterLine && r.line !== importFilterLine) return false;
    return true;
  });

  const importMonths = [...new Set(importF07.map(r => r.month).filter(Boolean))].sort();
  const importLines = [...new Set(importF07.map(r => r.line).filter(Boolean))].sort();

  const toggleF07Row = (id) => {
    setImportF07(p => p.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
  };

  const toggleF07All = () => {
    const filteredIds = new Set(importF07Filtered.map(r => r.id));
    const allSelected = importF07Filtered.every(r => r.selected);
    setImportF07(p => p.map(r => filteredIds.has(r.id) ? { ...r, selected: !allSelected } : r));
  };

  const submitF07Import = async () => {
    const selected = importF07Filtered.filter(r => r.selected);
    if (!selected.length) { showToast('❌ กรุณาเลือกรายการ'); return; }
    setImportSaving(true);

    // ── Aggregate ตาม conflict key (date+line+part+shift) ────────
    // F07 1 ใบอาจมีหลายถัง → หลายแถวใน Excel → ต้อง SUM ก่อนส่ง
    const grouped = {};
    for (const row of selected) {
      const key = `${row.date}|${row.line}|${row.partNo}|${row.shift || 'A'}`;
      if (!grouped[key]) {
        grouped[key] = {
          date: row.date, line: row.line, partNo: row.partNo,
          partName: row.partName || '', lot: row.lot || '',
          shift: row.shift || 'A',
          reworkQty: 0, scrapQty: 0, totalNG: 0,
          f07s: new Set(), bins: [], defects: [], reworkMethods: [],
          remarks: [],
        };
      }
      const g = grouped[key];
      g.reworkQty += row.reworkQty || 0;
      g.scrapQty += row.scrapQty || 0;
      g.totalNG += row.totalNG || 0;
      if (row.f07) g.f07s.add(row.f07);
      if (row.bin) g.bins.push({ bin_no: String(row.bin), qty: row.totalNG, result: 'has_defect' });
      if (row.lot && !g.lot) g.lot = row.lot;
      if (row.partName && !g.partName) g.partName = row.partName;
      if (row.remark) g.remarks.push(row.remark);
      // Collect defects from all bins
      row.defects.forEach(d => g.defects.push({
        f07_doc_no: row.f07 || null, bin_no: row.bin || null,
        found_qty: d.qty, sorted_good: 0, sorted_reject: d.qty,
        defect_code: d.code, defect_type: d.type, quantity: d.qty, detail: d.name,
        rework_result: d.type === 'rework' ? 'pending' : null,
        rework_method: row.reworkMethods.length > 0 ? row.reworkMethods[0].code : null,
      }));
      row.reworkMethods.forEach(rm => g.reworkMethods.push(rm));
    }

    let ok = 0, fail = 0;
    const keys = Object.values(grouped);
    for (const g of keys) {
      try {
        const f07List = [...g.f07s].join(',');
        await apiClient.post('/kpi/production', {
          production_date: g.date || form.productionDate,
          doc_number: f07List || null,
          machine_code: g.line || form.line,
          part_number: g.partNo,
          part_name: g.partName || null,
          lot_number: g.lot || null,
          shift: g.shift,
          operator_name: form.operator || 'Import F07',
          inspector_name: form.inspector || null,
          product_line_code: null,
          total_produced: 0,
          good_qty: 0,
          rework_qty: g.reworkQty,
          scrap_qty: g.scrapQty,
          rework_good_qty: 0,
          rework_scrap_qty: 0,
          rework_pending_qty: g.reworkQty,
          import_mode: 'replace', // SET ค่าใหม่ (ไม่ ADD ซ้อน)
          remark: g.remarks.length > 0 ? g.remarks[0] : `Import F07 #${f07List}`,
          inspected_bins: g.bins,
          defect_items: g.defects,
        });
        ok++;
      } catch (err) {
        fail++;
        console.error(`❌ F07 Import ${g.partNo}:`, err?.response?.data?.error || err.message);
      }
    }
    setImportSaving(false);
    showToast(`✅ Import สำเร็จ ${ok}/${keys.length} กลุ่ม (${selected.length} แถว)${fail > 0 ? ` | ❌ ล้มเหลว ${fail} (ดู Console)` : ''}`);
    setImportPreview(false);
    setImportF07([]);
    onSubmitSuccess?.();
  };

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
            <div style={S.head('#3b82f6')}>
              <h3 style={S.title}>📋 ข้อมูลการผลิต</h3>
              <label style={{ padding: '6px 14px', background: '#f59e0b30', border: '1px solid #f59e0b', borderRadius: 6, color: '#f59e0b', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                📂 Import F07 Excel
                <input type="file" accept=".xlsx,.xls" onChange={handleF07Import} style={{ display: 'none' }} />
              </label>
            </div>
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

          {/* ── F07 Import Preview ── */}
          {importPreview && importF07.length > 0 && (
            <div style={{ ...S.panel, borderColor: '#f59e0b40' }}>
              <div style={S.head('#f59e0b')}>
                <h3 style={S.title}>📂 F07 Import — {importF07.length} รายการ
                  <span style={{ fontWeight: 400, fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>
                    (แสดง {importF07Filtered.length} | เลือก {importF07Filtered.filter(r => r.selected).length} | NG {importF07Filtered.filter(r => r.selected).reduce((s, r) => s + r.totalNG, 0).toLocaleString()})
                  </span>
                </h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={submitF07Import} disabled={importSaving}
                    style={S.btn(importSaving ? '#475569' : '#10b981', '#fff')}>
                    {importSaving ? '⏳ Import...' : `✅ Import (${importF07Filtered.filter(r => r.selected).length})`}
                  </button>
                  <button onClick={() => { setImportPreview(false); setImportF07([]); }}
                    style={S.btn('#ef444420', '#ef4444')}>✕ ปิด</button>
                </div>
              </div>

              {/* Filter Bar */}
              <div style={{ padding: '8px 16px', borderBottom: '1px solid #1e293b', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <label style={S.label}>📆 เดือน</label>
                  <select style={{ ...S.input, width: 130 }} value={importFilterMonth}
                    onChange={e => setImportFilterMonth(e.target.value)}>
                    <option value="">ทั้งหมด</option>
                    {importMonths.map(m => (
                      <option key={m} value={m}>เดือน {parseInt(m)} ({importF07.filter(r => r.month === m).length})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={S.label}>🔍 Part No.</label>
                  <input style={{ ...S.input, width: 110 }} placeholder="ค้นหา..." value={importFilterPart}
                    onChange={e => setImportFilterPart(e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Line</label>
                  <select style={{ ...S.input, width: 100 }} value={importFilterLine}
                    onChange={e => setImportFilterLine(e.target.value)}>
                    <option value="">ทั้งหมด</option>
                    {importLines.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <button onClick={toggleF07All} style={S.btn('#1e293b', '#64748b')}>
                  {importF07Filtered.every(r => r.selected) ? '☐ ยกเลิก' : '☑ เลือกทั้งหมด'}
                </button>
                {(importFilterMonth || importFilterPart || importFilterLine) && (
                  <button onClick={() => { setImportFilterMonth(''); setImportFilterPart(''); setImportFilterLine(''); }}
                    style={{ ...S.btn('#ef444420', '#ef4444'), padding: '5px 8px', fontSize: 10 }}>✕ ล้าง</button>
                )}
              </div>

              <div style={{ ...S.body, maxHeight: 450, overflow: 'auto', padding: '8px 16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #334155' }}>
                      {['☑', '#', 'วันที่', 'F07', 'Part No.', 'ชื่อ', 'ลูกค้า', 'Lot', 'Source', 'ถัง', 'Line', 'Shift', 'NG', 'RW', 'SC', 'Defects'].map(h =>
                        <th key={h} style={{ padding: '5px 3px', color: '#64748b', textAlign: 'left', fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {importF07Filtered.map((row, idx) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #1e293b', opacity: row.selected ? 1 : 0.35,
                        background: idx % 2 === 0 ? 'transparent' : '#0f172a08' }}>
                        <td style={{ padding: '3px' }}>
                          <input type="checkbox" checked={row.selected} onChange={() => toggleF07Row(row.id)} />
                        </td>
                        <td style={{ padding: '3px', color: '#64748b', fontSize: 9 }}>{idx + 1}</td>
                        <td style={{ padding: '3px', color: '#3b82f6', fontSize: 10 }}>
                          {row.date ? `${row.date.split('-')[2]}/${row.date.split('-')[1]}` : '—'}
                        </td>
                        <td style={{ padding: '3px', color: '#8b5cf6', fontSize: 10 }}>{row.f07}</td>
                        <td style={{ padding: '3px', fontWeight: 600, color: '#e2e8f0' }}>{row.partNo}</td>
                        <td style={{ padding: '3px', color: '#94a3b8', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 9 }}
                          title={row.partName}>{row.partName}</td>
                        <td style={{ padding: '3px', fontSize: 9 }}><span style={S.tag('#10b981')}>{row.customer}</span></td>
                        <td style={{ padding: '3px', color: '#f59e0b', fontSize: 9 }}>{row.lot || '—'}</td>
                        <td style={{ padding: '3px', fontSize: 9 }}>
                          <span style={S.tag(row.source === 'Forge' ? '#3b82f6' : row.source === 'Final' ? '#10b981' : '#f59e0b')}>
                            {row.source || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '3px', color: '#64748b' }}>{row.bin || '—'}</td>
                        <td style={{ padding: '3px' }}><span style={S.tag('#8b5cf6')}>{row.line}</span></td>
                        <td style={{ padding: '3px', color: '#94a3b8' }}>{row.shift}</td>
                        <td style={{ padding: '3px', fontWeight: 700, color: '#ef4444' }}>{row.totalNG}</td>
                        <td style={{ padding: '3px', fontWeight: 600, color: row.reworkQty > 0 ? '#f59e0b' : '#334155' }}>{row.reworkQty || 0}</td>
                        <td style={{ padding: '3px', fontWeight: 600, color: row.scrapQty > 0 ? '#ef4444' : '#334155' }}>{row.scrapQty || 0}</td>
                        <td style={{ padding: '3px' }}>
                          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            {row.defects.slice(0, 3).map((d, di) => (
                              <span key={di} style={{ ...S.tag(d.type === 'scrap' ? '#ef4444' : '#f59e0b'), fontSize: 7 }}>
                                {d.name}({d.qty})
                              </span>
                            ))}
                            {row.defects.length > 3 && <span style={{ color: '#475569', fontSize: 7 }}>+{row.defects.length - 3}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #334155', background: '#0f172a' }}>
                      <td colSpan={12} style={{ padding: '8px 3px', fontWeight: 700, color: '#e2e8f0', fontSize: 11 }}>
                        รวม ({importF07Filtered.filter(r => r.selected).length} / {importF07Filtered.length} รายการ)
                      </td>
                      <td style={{ padding: '8px 3px', fontWeight: 700, color: '#ef4444' }}>
                        {importF07Filtered.filter(r => r.selected).reduce((s, r) => s + r.totalNG, 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 3px', fontWeight: 700, color: '#f59e0b' }}>
                        {importF07Filtered.filter(r => r.selected).reduce((s, r) => s + r.reworkQty, 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 3px', fontWeight: 700, color: '#ef4444' }}>
                        {importF07Filtered.filter(r => r.selected).reduce((s, r) => s + r.scrapQty, 0).toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
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