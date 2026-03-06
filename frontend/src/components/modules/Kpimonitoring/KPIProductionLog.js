/**
 * KPIProductionLog.js — 📊 บันทึกยอดผลิต (สายการผลิต)
 * =====================================================
 * ฝ่ายผลิตบันทึก: วันที่, Part, Lot, Line, ถัง, ชิ้นงานดี, ชิ้นงานเสีย
 * ข้อมูลนี้เชื่อมกับ KPIDataEntry (QC) ผ่าน Part No. + Lot No.
 */
import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../utils/api';

const S = {
  input: { padding: '7px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', width: '100%', fontSize: 13, boxSizing: 'border-box' },
  label: { display: 'block', marginBottom: 3, color: '#94a3b8', fontSize: 11, fontWeight: 600 },
  panel: { background: '#111827', border: '1px solid #1e293b', borderRadius: 8, marginBottom: 16 },
  head: (c) => ({ padding: '10px 16px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: c ? `3px solid ${c}` : 'none' }),
  body: { padding: 16 },
  title: { color: '#e2e8f0', fontSize: 14, fontWeight: 700, margin: 0 },
  grid: (n) => ({ display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 10 }),
  btn: (bg, c) => ({ padding: '7px 16px', background: bg, border: `1px solid ${c || bg}`, borderRadius: 6, color: c || '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }),
  tag: (c) => ({ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: `${c}20`, color: c, display: 'inline-block' }),
  statBox: (c) => ({ padding: '8px 10px', background: '#1e293b', borderRadius: 6, textAlign: 'center', borderLeft: `3px solid ${c}` }),
};

const LINES = [
  ...Array.from({ length: 8 }, (_, i) => `Line-${i+1}`),
  'Line-CT', 'Line-PD5', 'Line-MC',
];

const KPIProductionLog = () => {
  // ─── State ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    productionDate: new Date().toISOString().split('T')[0],
    line: '', shift: new Date().getHours() >= 6 && new Date().getHours() < 18 ? 'A' : 'B',
    operator: '',
  });
  const [partInfo, setPartInfo] = useState(null);
  const [partNumber, setPartNumber] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [lookupTimer, setLookupTimer] = useState(null);

  // ถังที่ผลิต (rows)
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // ข้อมูลที่บันทึกแล้ววันนี้
  const [todayLogs, setTodayLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLogIds, setExpandedLogIds] = useState(new Set()); // ดูรายละเอียดถัง (หลายรายการ)
  const [importData, setImportData] = useState([]); // ข้อมูล import จาก Excel
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState(false);

  // History filters
  const [historyMode, setHistoryMode] = useState('date'); // 'date' | 'month'
  const [historyMonth, setHistoryMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterPart, setFilterPart] = useState('');
  const [filterLine, setFilterLine] = useState('');
  const [filterLot, setFilterLot] = useState('');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ─── Import Excel ─────────────────────────────────────────
  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);

      // ─── อ่าน Part Name จาก sheet "Gerneral" (ถ้ามี) ────────
      const generalSheet = wb.SheetNames.find(n => n.toLowerCase().includes('gerneral') || n.toLowerCase().includes('general') || n.toLowerCase().includes('master'));
      const partNameFromExcel = {};
      if (generalSheet) {
        const gsWs = wb.Sheets[generalSheet];
        const gsRows = XLSX.utils.sheet_to_json(gsWs, { header: 1, defval: '' });
        // หา col Part No. + Part Name: ปกติ B=Part No., C=Part Name
        let pnCol = -1, nameCol = -1;
        for (let i = 0; i < Math.min(5, gsRows.length); i++) {
          gsRows[i].forEach((cell, ci) => {
            const lc = String(cell || '').toLowerCase().trim();
            if (lc.includes('part no') || lc === 'part no.' || lc === 'รหัสชิ้นงาน') pnCol = ci;
            if (lc.includes('part name') || lc === 'ชื่อชิ้นงาน') nameCol = ci;
          });
          if (pnCol >= 0 && nameCol >= 0) break;
        }
        // fallback: B=1, C=2
        if (pnCol < 0) pnCol = 1;
        if (nameCol < 0) nameCol = 2;
        for (let i = 3; i < gsRows.length; i++) {
          const pn = String(gsRows[i][pnCol] || '').trim();
          const nm = String(gsRows[i][nameCol] || '').trim();
          if (pn && nm) partNameFromExcel[pn] = nm;
        }
      }

      // หา sheet "Input" หรือใช้ sheet แรก
      const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('input')) || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      // หา header row (มี "Part No." หรือ "งานดี")
      let headerIdx = -1;
      let colMap = {};
      for (let i = 0; i < Math.min(15, jsonRows.length); i++) {
        const row = jsonRows[i];
        const rowStr = row.map(c => String(c || '').toLowerCase());
        if (rowStr.some(c => c.includes('part no') || c.includes('part no.'))) {
          headerIdx = i;
          row.forEach((cell, ci) => {
            const lc = String(cell || '').toLowerCase().trim();
            if (lc.includes('ว/ด/ป') || lc.includes('date') || lc === 'ว/ด/ป') colMap.date = ci;
            if (lc.includes('กะ') || lc === 'กะ') colMap.shift = ci;
            if (lc === 'line' || lc.includes('line')) colMap.line = ci;
            if (lc.includes('part no')) colMap.partNo = ci;
            if (lc.includes('part name') || lc.includes('ชื่อชิ้นงาน')) colMap.partName = ci;
            if (lc.includes('lot')) colMap.lot = ci;
            if (lc.includes('งานดี') || lc.includes('good')) colMap.good = ci;
            if (lc.includes('งานเสีย') || lc.includes('defect') || lc.includes('ng')) colMap.ng = ci;
          });
          break;
        }
      }

      // Fallback: ถ้าหา header row ไม่ได้ → ลองหาแถวที่มี "เดือน" + "Part No."
      if (headerIdx === -1) {
        for (let i = 0; i < Math.min(10, jsonRows.length); i++) {
          const rowStr = jsonRows[i].map(c => String(c || '').toLowerCase());
          if (rowStr.some(c => c.includes('เดือน')) && rowStr.some(c => c.includes('part no'))) {
            headerIdx = i;
            jsonRows[i].forEach((cell, ci) => {
              const lc = String(cell || '').toLowerCase().trim();
              if (lc.includes('ว/ด/ป') || lc.includes('date')) colMap.date = ci;
              if (lc.includes('กะ')) colMap.shift = ci;
              if (lc === 'line' || lc.includes('line')) colMap.line = ci;
              if (lc.includes('part no')) colMap.partNo = ci;
              if (lc.includes('lot')) colMap.lot = ci;
              if (lc.includes('งานดี')) colMap.good = ci;
              if (lc.includes('งานเสีย')) colMap.ng = ci;
            });
            break;
          }
        }
      }

      // ถ้ายังหา header ไม่ได้ → default
      if (headerIdx === -1) headerIdx = 3;
      if (colMap.date === undefined) colMap = { date: 2, shift: 3, line: 4, partNo: 5, lot: 7, good: 8, ng: 9 };

      // ─── Auto-detect Part Name column ─────────────────────────
      // ถ้า colMap ยังไม่มี partName → ดูว่า col ถัดจาก partNo มี text ยาวไหม (น่าจะเป็นชื่อ)
      if (colMap.partName === undefined && colMap.partNo !== undefined) {
        const nextCol = colMap.partNo + 1;
        // ตรวจ 3 แถวข้อมูลแรก ว่า col ถัดไปมี text หรือไม่
        let hasText = 0;
        for (let i = headerIdx + 1; i < Math.min(headerIdx + 6, jsonRows.length); i++) {
          const v = String(jsonRows[i]?.[nextCol] || '').trim();
          if (v && v.length > 2 && isNaN(v)) hasText++;
        }
        if (hasText >= 2) {
          colMap.partName = nextCol;
          // ถ้า lot ชี้ไปที่ col เดียวกัน → เลื่อน lot ไป col ถัดไป
          if (colMap.lot === nextCol) colMap.lot = nextCol + 1;
        }
      }

      // ─── ตรวจ + แก้ lot/good/ng ให้ถูก column ──────────────────
      // ถ้ามี partName col → lot/good/ng อาจต้องเลื่อน
      if (colMap.partName !== undefined) {
        // ตรวจว่า good col มีตัวเลขจริงไหม
        const testRow = jsonRows[headerIdx + 1];
        if (testRow) {
          const goodVal = testRow[colMap.good];
          if (goodVal === undefined || goodVal === '' || (typeof goodVal === 'string' && goodVal.length > 5)) {
            // good col ไม่ใช่ตัวเลข → ต้อง re-detect จาก header
            // ใช้ actual header scan
          }
        }
      }

      // Parse data rows
      const parsed = [];
      for (let i = headerIdx + 1; i < jsonRows.length; i++) {
        const row = jsonRows[i];
        const partNo = String(row[colMap.partNo] || '').trim();
        if (!partNo) continue;

        const dateVal = row[colMap.date];
        let dateStr = '';
        if (dateVal instanceof Date) {
          dateStr = dateVal.toISOString().split('T')[0];
        } else if (typeof dateVal === 'number') {
          // Excel serial date
          const d = new Date((dateVal - 25569) * 86400 * 1000);
          dateStr = d.toISOString().split('T')[0];
        } else if (dateVal) {
          dateStr = String(dateVal).split(' ')[0];
        }

        let lineVal = String(row[colMap.line] || '').trim();
        // แปลง "2" → "Line-2", "PD5" → "Line-PD5"
        if (lineVal && !lineVal.toLowerCase().startsWith('line')) {
          lineVal = `Line-${lineVal}`;
        }

        // Part Name: 1) จาก col ในไฟล์  2) จาก sheet Gerneral  3) ว่าง
        const pnFromCol = colMap.partName !== undefined ? String(row[colMap.partName] || '').trim() : '';

        parsed.push({
          id: Date.now() + i,
          date: dateStr,
          shift: String(row[colMap.shift] || 'A').trim(),
          line: lineVal,
          partNo: partNo,
          partName: pnFromCol || partNameFromExcel[partNo] || '',
          lot: String(row[colMap.lot] || '').trim(),
          good: parseInt(row[colMap.good]) || 0,
          ng: parseInt(row[colMap.ng]) || 0,
          total: (parseInt(row[colMap.good]) || 0) + (parseInt(row[colMap.ng]) || 0),
          selected: true,
        });
      }

      if (parsed.length === 0) {
        showToast('❌ ไม่พบข้อมูลในไฟล์', 'error');
        return;
      }

      // Lookup Part Name จาก Part Master (เฉพาะที่ไม่มีจาก Excel)
      const uniqueParts = [...new Set(parsed.filter(r => !r.partName).map(r => r.partNo))];
      const nameMap = {};
      for (const pn of uniqueParts) {
        try {
          const res = await apiClient.get(`/kpi/parts/lookup/${encodeURIComponent(pn)}`);
          const d = res?.data?.data || res?.data || res;
          if (d?.part_name) nameMap[pn] = d.part_name;
        } catch { /* skip */ }
      }
      parsed.forEach(r => { if (!r.partName) r.partName = nameMap[r.partNo] || ''; });

      setImportData(parsed);
      setImportPreview(true);
      const withName = parsed.filter(r => r.partName).length;
      const allParts = [...new Set(parsed.map(r => r.partNo))].length;
      const colNames = colMap.partName !== undefined ? parsed.filter(r => r.partName).length : 0;
      showToast(`📂 อ่าน ${parsed.length} รายการ จาก "${sheetName}" (Part Name: ${withName}/${allParts} parts${colMap.partName !== undefined ? ' — จาก col ในไฟล์' : ''})`);
    } catch (err) {
      console.error('Import error:', err);
      showToast('❌ อ่านไฟล์ไม่สำเร็จ: ' + err.message, 'error');
    }
    e.target.value = '';
  };

  const toggleImportRow = (id) => {
    setImportData(p => p.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
  };

  const updateImportField = (id, field, value) => {
    setImportData(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const toggleSelectAll = () => {
    const allSelected = importData.every(r => r.selected);
    setImportData(p => p.map(r => ({ ...r, selected: !allSelected })));
  };

  const submitImport = async () => {
    const selected = importData.filter(r => r.selected);
    if (selected.length === 0) { showToast('❌ กรุณาเลือกรายการ', 'error'); return; }

    setImporting(true);
    let success = 0, fail = 0;
    for (const row of selected) {
      try {
        await apiClient.post('/kpi/production-log', {
          production_date: row.date || form.productionDate,
          line: row.line,
          shift: row.shift,
          operator: form.operator || 'Import',
          part_number: row.partNo,
          part_name: row.partName || null,
          lot_number: row.lot || null,
          bins: [],
          total_good: row.good,
          total_ng: row.ng,
          total_produced: row.total,
        });
        success++;
      } catch { fail++; }
    }
    setImporting(false);
    showToast(`✅ Import สำเร็จ ${success} รายการ${fail > 0 ? ` | ❌ ล้มเหลว ${fail}` : ''}`);
    setImportPreview(false);
    setImportData([]);
    fetchTodayLogs();
  };

  // ─── Part Lookup ────────────────────────────────────────────
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
    setPartNumber(v); setPartInfo(null);
    if (lookupTimer) clearTimeout(lookupTimer);
    setLookupTimer(setTimeout(() => lookupPart(v), 500));
  };

  // ─── Row Management ────────────────────────────────────────
  const addRows = (count = 1) => {
    const news = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i, binNo: '', goodQty: '', ngQty: '', note: '',
    }));
    setRows(p => [...p, ...news]);
  };

  const updateRow = (id, field, value) => {
    setRows(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRow = (id) => setRows(p => p.filter(r => r.id !== id));

  // ─── Calculations ──────────────────────────────────────────
  const totalGood = rows.reduce((s, r) => s + (parseInt(r.goodQty) || 0), 0);
  const totalNG = rows.reduce((s, r) => s + (parseInt(r.ngQty) || 0), 0);
  const totalAll = totalGood + totalNG;
  const totalBins = rows.filter(r => r.binNo).length;

  // ─── Fetch Logs (date or month) ─────────────────────────────
  const fetchTodayLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const params = {};
      if (historyMode === 'month') {
        const [yr, mo] = historyMonth.split('-');
        const lastDay = new Date(parseInt(yr), parseInt(mo), 0).getDate();
        params.from = `${historyMonth}-01`;
        params.to = `${historyMonth}-${String(lastDay).padStart(2, '0')}`;
      } else {
        params.date = form.productionDate;
      }
      if (form.line) params.line = form.line;
      const res = await apiClient.get('/kpi/production-log', { params });
      const raw = res?.data || res;
      let data = [];
      if (raw?.data && Array.isArray(raw.data)) data = raw.data;
      else if (Array.isArray(raw)) data = raw;
      setTodayLogs(data);
    } catch { setTodayLogs([]); }
    finally { setLoadingLogs(false); }
  }, [form.productionDate, form.line, historyMode, historyMonth]);

  useEffect(() => { fetchTodayLogs(); }, [fetchTodayLogs]);

  // ─── Filtered history logs ────────────────────────────────
  const filteredLogs = todayLogs.filter(log => {
    if (filterPart && !(log.part_number || '').toLowerCase().includes(filterPart.toLowerCase())) return false;
    if (filterLine && log.line !== filterLine) return false;
    if (filterLot && !(log.lot_number || '').toLowerCase().includes(filterLot.toLowerCase())) return false;
    return true;
  });

  // ─── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.line || !partNumber || !form.operator) {
      showToast('❌ กรุณาระบุ Line, Part No., ผู้ปฏิบัติงาน', 'error');
      return;
    }
    if (rows.length === 0) {
      showToast('❌ กรุณาเพิ่มถังอย่างน้อย 1 ถัง', 'error');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/kpi/production-log', {
        production_date: form.productionDate,
        line: form.line,
        shift: form.shift,
        operator: form.operator,
        part_number: partNumber,
        part_name: partInfo?.part_name || null,
        lot_number: lotNumber || null,
        bins: rows.map(r => ({
          bin_no: r.binNo,
          good_qty: parseInt(r.goodQty) || 0,
          ng_qty: parseInt(r.ngQty) || 0,
          note: r.note || null,
        })),
        total_good: totalGood,
        total_ng: totalNG,
        total_produced: totalAll,
      });
      showToast(`✅ บันทึกยอดผลิต ${partNumber} สำเร็จ — ${totalAll} ชิ้น (${totalBins} ถัง)`);
      setRows([]);
      fetchTodayLogs();
    } catch (err) {
      showToast('❌ ' + (err?.response?.data?.error || err.message || 'บันทึกไม่สำเร็จ'), 'error');
    } finally { setSaving(false); }
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 24px', borderRadius: 8,
          background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* ═══ LEFT: Form ═══ */}
        <div style={{ flex: 2 }}>

          {/* Section 1: ข้อมูลหลัก */}
          <div style={S.panel}>
            <div style={S.head('#3b82f6')}>
              <h3 style={S.title}>📊 บันทึกยอดผลิต — สายการผลิต</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <label style={{ ...S.btn('#f59e0b30', '#f59e0b'), display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  📂 Import Excel
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileImport} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
            <div style={S.body}>
              <div style={S.grid(5)}>
                <div>
                  <label style={{ ...S.label, color: '#3b82f6' }}>📅 วันที่ผลิต</label>
                  <input type="date" style={{ ...S.input, borderColor: '#3b82f650' }}
                    value={form.productionDate} onChange={e => set('productionDate', e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Line *</label>
                  <select style={S.input} value={form.line} onChange={e => set('line', e.target.value)}>
                    <option value="">เลือก</option>
                    {LINES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Shift</label>
                  <select style={S.input} value={form.shift} onChange={e => set('shift', e.target.value)}>
                    <option value="A">A</option><option value="B">B</option><option value="AB">AB</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>👷 ผู้ปฏิบัติงาน *</label>
                  <input style={S.input} placeholder="ชื่อ" value={form.operator} onChange={e => set('operator', e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Part No. *</label>
                  <input style={{ ...S.input, ...(partInfo ? { borderColor: '#10b981' } : {}) }}
                    placeholder="W21-04" value={partNumber}
                    onChange={e => onPartChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && lookupPart(partNumber)} />
                  {partInfo && <div style={{ fontSize: 10, color: '#10b981', marginTop: 2 }}>✅ {partInfo.part_name}</div>}
                </div>
              </div>
              <div style={{ ...S.grid(2), marginTop: 10 }}>
                <div>
                  <label style={S.label}>Part Name</label>
                  <input style={{ ...S.input, color: partInfo ? '#10b981' : '#64748b' }}
                    readOnly={!!partInfo} value={partInfo ? partInfo.part_name : ''}
                    placeholder="auto-fill จาก Part Master" />
                </div>
                <div>
                  <label style={{ ...S.label, color: '#f59e0b' }}>Lot No.</label>
                  <input style={{ ...S.input, borderColor: '#f59e0b50' }} placeholder="1030/C1003/280226"
                    value={lotNumber} onChange={e => setLotNumber(e.target.value)} />
                </div>
              </div>
              {/* Part Info */}
              {partInfo && (
                <div style={{ marginTop: 10, padding: '6px 12px', background: '#0f172a', borderRadius: 6, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11 }}>
                  <span style={{ color: '#94a3b8' }}>👤 {partInfo.customer_name}</span>
                  {partInfo.billet_size && <span style={{ color: '#94a3b8' }}>🔩 {partInfo.billet_size} ({partInfo.billet_weight}g)</span>}
                  {partInfo.billet_material && <span style={S.tag('#3b82f6')}>{partInfo.billet_material}</span>}
                  {partInfo.primary_line && <span style={S.tag('#8b5cf6')}>{partInfo.primary_line}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Import Preview Panel */}
          {importPreview && importData.length > 0 && (
            <div style={{ ...S.panel, borderColor: '#f59e0b40' }}>
              <div style={S.head('#f59e0b')}>
                <h3 style={S.title}>📂 Import Preview — {importData.length} รายการ
                  <span style={{ fontWeight: 400, fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>
                    (เลือก {importData.filter(r => r.selected).length} | รวม {importData.filter(r => r.selected).reduce((s, r) => s + r.total, 0).toLocaleString()} ชิ้น)
                  </span>
                  {importData.filter(r => !r.partName).length > 0 && (
                    <span style={{ fontWeight: 400, fontSize: 10, color: '#ef4444', marginLeft: 8 }}>
                      ⚠️ ไม่พบชื่อ {importData.filter(r => !r.partName).length} รายการ (คลิกแก้ไขได้)
                    </span>
                  )}
                </h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={toggleSelectAll} style={S.btn('#1e293b', '#64748b')}>
                    {importData.every(r => r.selected) ? '☐ ยกเลิกทั้งหมด' : '☑ เลือกทั้งหมด'}
                  </button>
                  <button onClick={submitImport} disabled={importing}
                    style={S.btn(importing ? '#475569' : '#10b981', '#fff')}>
                    {importing ? '⏳ กำลัง Import...' : `✅ Import (${importData.filter(r => r.selected).length})`}
                  </button>
                  <button onClick={() => { setImportPreview(false); setImportData([]); }}
                    style={S.btn('#ef444420', '#ef4444')}>✕ ยกเลิก</button>
                </div>
              </div>
              <div style={{ ...S.body, maxHeight: 400, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #334155' }}>
                      {['☑', '#', 'วันที่', 'กะ', 'Line', 'Part No.', 'Part Name ✏️', 'Lot No.', '✅ งานดี', '❌ งานเสีย', 'รวม'].map(h =>
                        <th key={h} style={{ padding: '6px 4px', color: '#64748b', textAlign: 'left', fontSize: 10 }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {importData.map((row, idx) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #1e293b', opacity: row.selected ? 1 : 0.4,
                        background: idx % 2 === 0 ? 'transparent' : '#0f172a08' }}>
                        <td style={{ padding: '4px' }}>
                          <input type="checkbox" checked={row.selected} onChange={() => toggleImportRow(row.id)} />
                        </td>
                        <td style={{ padding: '4px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '4px', color: '#3b82f6' }}>{row.date}</td>
                        <td style={{ padding: '4px', color: '#94a3b8' }}>{row.shift}</td>
                        <td style={{ padding: '4px' }}><span style={S.tag('#8b5cf6')}>{row.line}</span></td>
                        <td style={{ padding: '4px', fontWeight: 600, color: '#e2e8f0' }}>{row.partNo}</td>
                        <td style={{ padding: '3px', minWidth: 140 }}>
                          <input style={{ ...S.input, padding: '3px 6px', fontSize: 10,
                            borderColor: row.partName ? '#10b98140' : '#ef444440',
                            color: row.partName ? '#10b981' : '#94a3b8',
                            background: '#0f172a' }}
                            value={row.partName}
                            placeholder="พิมพ์ชื่อ..."
                            onChange={e => updateImportField(row.id, 'partName', e.target.value)} />
                        </td>
                        <td style={{ padding: '4px', color: '#f59e0b' }}>{row.lot || '—'}</td>
                        <td style={{ padding: '4px', fontWeight: 700, color: '#10b981' }}>{row.good.toLocaleString()}</td>
                        <td style={{ padding: '4px', fontWeight: 700, color: row.ng > 0 ? '#ef4444' : '#64748b' }}>{row.ng}</td>
                        <td style={{ padding: '4px', fontWeight: 700, color: '#e2e8f0' }}>{row.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #334155', background: '#0f172a' }}>
                      <td colSpan={8} style={{ padding: '8px 4px', fontWeight: 700, color: '#e2e8f0', fontSize: 11 }}>
                        รวม (เลือก {importData.filter(r => r.selected).length} / {importData.length})
                      </td>
                      <td style={{ padding: '8px 4px', fontWeight: 700, color: '#10b981' }}>
                        {importData.filter(r => r.selected).reduce((s, r) => s + r.good, 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 4px', fontWeight: 700, color: '#ef4444' }}>
                        {importData.filter(r => r.selected).reduce((s, r) => s + r.ng, 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 4px', fontWeight: 700, color: '#e2e8f0' }}>
                        {importData.filter(r => r.selected).reduce((s, r) => s + r.total, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Section 2: บันทึกถัง */}
          <div style={S.panel}>
            <div style={S.head('#10b981')}>
              <h3 style={S.title}>📦 รายการถังที่ผลิต
                {rows.length > 0 && <span style={{ fontWeight: 400, fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>
                  ({totalBins} ถัง | ✅ {totalGood.toLocaleString()} | ❌ {totalNG.toLocaleString()} | รวม {totalAll.toLocaleString()})
                </span>}
              </h3>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => addRows(1)} style={S.btn('#10b98130', '#10b981')}>➕ +1</button>
                <button onClick={() => addRows(5)} style={S.btn('#1e293b', '#64748b')}>+5</button>
                <button onClick={() => addRows(10)} style={S.btn('#1e293b', '#64748b')}>+10</button>
                <button onClick={() => addRows(20)} style={S.btn('#1e293b', '#64748b')}>+20</button>
              </div>
            </div>
            <div style={S.body}>
              {rows.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#475569', padding: 24 }}>
                  กด ➕ เพื่อเพิ่มถังที่ผลิต — แต่ละถังระบุเลขที่ถัง + จำนวนชิ้นงานดี + จำนวนชิ้นงานเสีย
                </div>
              ) : <>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px 120px 1fr 36px', gap: 6, marginBottom: 6 }}>
                  {['#', 'เลขที่ถัง', '✅ ชิ้นงานดี', '❌ ชิ้นงานเสีย', 'หมายเหตุ', ''].map(h =>
                    <span key={h} style={{ color: '#475569', fontSize: 10, fontWeight: 600 }}>{h}</span>
                  )}
                </div>
                {rows.map((r, idx) => {
                  const hasNG = (parseInt(r.ngQty) || 0) > 0;
                  return (
                    <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px 120px 1fr 36px', gap: 6, marginBottom: 4, alignItems: 'center',
                      padding: '3px 0', background: hasNG ? '#ef444408' : 'transparent', borderRadius: 4 }}>
                      <span style={{ color: hasNG ? '#ef4444' : '#64748b', fontSize: 11, fontWeight: 600 }}>{idx+1}</span>
                      <input style={{ ...S.input, padding: '5px 8px' }}
                        placeholder="B-001" value={r.binNo} onChange={e => updateRow(r.id, 'binNo', e.target.value)} />
                      <input style={{ ...S.input, padding: '5px 8px', textAlign: 'center', borderColor: '#10b98140' }}
                        type="number" min="0" placeholder="0" value={r.goodQty}
                        onChange={e => updateRow(r.id, 'goodQty', e.target.value)} />
                      <input style={{ ...S.input, padding: '5px 8px', textAlign: 'center', borderColor: hasNG ? '#ef4444' : '#33415540' }}
                        type="number" min="0" placeholder="0" value={r.ngQty}
                        onChange={e => updateRow(r.id, 'ngQty', e.target.value)} />
                      <input style={{ ...S.input, padding: '5px 8px', color: '#64748b' }}
                        placeholder="หมายเหตุ" value={r.note} onChange={e => updateRow(r.id, 'note', e.target.value)} />
                      <button onClick={() => removeRow(r.id)}
                        style={{ padding: '3px', background: '#ef444415', border: '1px solid #ef444430', borderRadius: 4, color: '#ef4444', cursor: 'pointer', fontSize: 11 }}>✕</button>
                    </div>
                  );
                })}
              </>}

              {/* Submit */}
              {rows.length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                  <button onClick={handleSubmit} disabled={saving}
                    style={{ flex: 2, padding: '14px', fontSize: 15, fontWeight: 700, borderRadius: 8,
                      background: saving ? '#475569' : 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none', color: '#fff', cursor: saving ? 'wait' : 'pointer' }}>
                    {saving ? '⏳ กำลังบันทึก...' : `✅ บันทึกยอดผลิต (${totalAll.toLocaleString()} ชิ้น / ${totalBins} ถัง)`}
                  </button>
                  <button onClick={() => setRows([])} style={{ padding: '14px 20px', background: 'transparent', border: '1px solid #475569', borderRadius: 8, color: '#94a3b8', cursor: 'pointer' }}>🔄 รีเซ็ต</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: Summary + Today's Logs ═══ */}
        <div style={{ flex: 1, position: 'sticky', top: 16 }}>
          {/* สรุปรอบปัจจุบัน */}
          <div style={S.panel}>
            <div style={S.head()}><h3 style={S.title}>📊 สรุปรอบนี้</h3></div>
            <div style={S.body}>
              {totalAll > 0 ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  {[
                    { label: 'Part No.', val: partNumber || '—', c: '#3b82f6' },
                    { label: 'Lot No.', val: lotNumber || '—', c: '#f59e0b' },
                    { label: 'Line', val: form.line || '—', c: '#8b5cf6' },
                    { label: 'จำนวนถัง', val: totalBins, c: '#8b5cf6' },
                    { label: '✅ ชิ้นงานดี', val: totalGood.toLocaleString(), c: '#10b981' },
                    { label: '❌ ชิ้นงานเสีย', val: totalNG.toLocaleString(), c: '#ef4444' },
                    { label: 'รวมทั้งหมด', val: totalAll.toLocaleString(), c: '#e2e8f0' },
                    { label: 'Good %', val: ((totalGood / totalAll) * 100).toFixed(2) + '%', c: '#10b981' },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', background: '#1e293b', borderRadius: 4, borderLeft: `3px solid ${r.c}` }}>
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>{r.label}</span>
                      <strong style={{ color: r.c, fontSize: 12 }}>{r.val}</strong>
                    </div>
                  ))}
                  {/* Progress bar */}
                  <div style={{ display: 'flex', height: 10, borderRadius: 4, overflow: 'hidden', background: '#0f172a', marginTop: 4 }}>
                    <div style={{ width: `${(totalGood / totalAll) * 100}%`, background: '#10b981' }} />
                    <div style={{ width: `${(totalNG / totalAll) * 100}%`, background: '#ef4444' }} />
                  </div>
                </div>
              ) : <div style={{ textAlign: 'center', color: '#475569', padding: 16, fontSize: 12 }}>เพิ่มถังแล้วระบุจำนวนเพื่อดูสรุป</div>}
            </div>
          </div>

          {/* ยอดผลิตวันนี้ */}
          <div style={{ ...S.panel, marginTop: 16 }}>
            <div style={S.head()}>
              <h3 style={S.title}>📝 บันทึกวันที่ {form.productionDate}</h3>
              <button onClick={fetchTodayLogs} style={S.btn('#1e293b', '#64748b')}>🔄</button>
            </div>
            <div style={{ ...S.body, maxHeight: 320, overflow: 'auto' }}>
              {loadingLogs ? <div style={{ textAlign: 'center', color: '#64748b', padding: 16 }}>⏳ โหลด...</div> :
              todayLogs.length === 0 ? <div style={{ textAlign: 'center', color: '#475569', padding: 16, fontSize: 12 }}>ยังไม่มีบันทึกวันนี้</div>
              : todayLogs.map((log, i) => (
                <div key={i} style={{ padding: '8px 10px', marginBottom: 6, background: '#1e293b', borderRadius: 6,
                  borderLeft: `3px solid ${log.total_ng > 0 ? '#f59e0b' : '#10b981'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <strong style={{ color: '#3b82f6' }}>{log.part_number}</strong>
                    <span style={S.tag('#8b5cf6')}>{log.line}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#e2e8f0', marginTop: 2 }}>
                    {log.part_name && <span>{log.part_name} </span>}
                    {log.lot_number && <span style={{ color: '#f59e0b' }}>| Lot: {log.lot_number}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    ✅ {(log.total_good || 0).toLocaleString()} | ❌ {(log.total_ng || 0).toLocaleString()} | รวม {(log.total_produced || 0).toLocaleString()} | {log.total_bins || 0} ถัง
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>Shift {log.shift} | {log.operator}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ HISTORY TABLE — ด้านล่าง ═══ */}
      <div style={{ ...S.panel, marginTop: 8 }}>
        <div style={S.head('#f59e0b')}>
          <h3 style={S.title}>📋 ประวัติการบันทึกยอดผลิต</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: 11 }}>{filteredLogs.length} / {todayLogs.length} รายการ</span>
            <button onClick={fetchTodayLogs} style={S.btn('#1e293b', '#64748b')}>🔄</button>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e293b', display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Mode Toggle */}
          <div>
            <label style={S.label}>ดูตาม</label>
            <div style={{ display: 'flex', gap: 2 }}>
              <button onClick={() => setHistoryMode('date')}
                style={{ padding: '5px 12px', borderRadius: '4px 0 0 4px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: historyMode === 'date' ? '#3b82f6' : '#1e293b', color: historyMode === 'date' ? '#fff' : '#64748b',
                  border: `1px solid ${historyMode === 'date' ? '#3b82f6' : '#334155'}` }}>📅 วัน</button>
              <button onClick={() => setHistoryMode('month')}
                style={{ padding: '5px 12px', borderRadius: '0 4px 4px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  background: historyMode === 'month' ? '#3b82f6' : '#1e293b', color: historyMode === 'month' ? '#fff' : '#64748b',
                  border: `1px solid ${historyMode === 'month' ? '#3b82f6' : '#334155'}` }}>📆 เดือน</button>
            </div>
          </div>

          {historyMode === 'month' ? (
            <div>
              <label style={S.label}>เดือน</label>
              <input type="month" style={{ ...S.input, width: 160 }} value={historyMonth}
                onChange={e => setHistoryMonth(e.target.value)} />
            </div>
          ) : (
            <div>
              <label style={S.label}>วันที่</label>
              <input type="date" style={{ ...S.input, width: 150 }} value={form.productionDate}
                onChange={e => set('productionDate', e.target.value)} />
            </div>
          )}

          <div>
            <label style={S.label}>🔍 Part No.</label>
            <input style={{ ...S.input, width: 120 }} placeholder="ค้นหา..." value={filterPart}
              onChange={e => setFilterPart(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Line</label>
            <select style={{ ...S.input, width: 110 }} value={filterLine} onChange={e => setFilterLine(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {LINES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Lot No.</label>
            <input style={{ ...S.input, width: 120 }} placeholder="ค้นหา..." value={filterLot}
              onChange={e => setFilterLot(e.target.value)} />
          </div>
          {(filterPart || filterLine || filterLot) && (
            <button onClick={() => { setFilterPart(''); setFilterLine(''); setFilterLot(''); }}
              style={{ ...S.btn('#ef444420', '#ef4444'), padding: '5px 10px', fontSize: 10 }}>✕ ล้าง</button>
          )}
        </div>

        <div style={S.body}>
          {loadingLogs ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>⏳ กำลังโหลด...</div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#475569', padding: 24 }}>
              ไม่พบข้อมูล {historyMode === 'month' ? historyMonth : form.productionDate}
              {filterPart && ` | Part: ${filterPart}`}
              {filterLine && ` | Line: ${filterLine}`}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #334155' }}>
                  {['#', 'วันที่', 'Part No.', 'Part Name', 'Lot No.', 'Line', 'Shift', '✅ ดี', '❌ เสีย', 'รวม', 'ถัง', 'Good%', 'Operator', ''].map(h =>
                    <th key={h} style={{ padding: '8px 5px', color: '#64748b', textAlign: 'left', fontSize: 10, fontWeight: 700 }}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => {
                  const total = log.total_produced || 0;
                  const good = log.total_good || 0;
                  const ng = log.total_ng || 0;
                  const goodPct = total > 0 ? ((good / total) * 100).toFixed(1) : '0';
                  const isExpanded = expandedLogIds.has(log.id);
                  const hasBins = log.bins && log.bins.length > 0;

                  return (
                    <React.Fragment key={log.id || idx}>
                      <tr style={{ borderBottom: '1px solid #1e293b', cursor: hasBins ? 'pointer' : 'default',
                        background: isExpanded ? '#1e293b' : (idx % 2 === 0 ? 'transparent' : '#0f172a08') }}
                        onClick={() => hasBins && setExpandedLogIds(prev => {
                          const next = new Set(prev);
                          if (next.has(log.id)) next.delete(log.id);
                          else next.add(log.id);
                          return next;
                        })}>
                        <td style={{ padding: '7px 5px', color: '#64748b', fontSize: 10 }}>{idx + 1}</td>
                        <td style={{ padding: '7px 5px', color: '#3b82f6', fontSize: 11 }}>
                          {log.production_date ? new Date(log.production_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) : '—'}
                        </td>
                        <td style={{ padding: '7px 5px', fontWeight: 700, color: '#3b82f6' }}>{log.part_number}</td>
                        <td style={{ padding: '7px 5px', color: '#e2e8f0', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{log.part_name || '—'}</td>
                        <td style={{ padding: '7px 5px', color: '#f59e0b', fontSize: 11 }}>{log.lot_number || '—'}</td>
                        <td style={{ padding: '7px 5px' }}><span style={S.tag('#8b5cf6')}>{log.line}</span></td>
                        <td style={{ padding: '7px 5px', color: '#94a3b8' }}>{log.shift}</td>
                        <td style={{ padding: '7px 5px', fontWeight: 700, color: '#10b981' }}>{good.toLocaleString()}</td>
                        <td style={{ padding: '7px 5px', fontWeight: 700, color: ng > 0 ? '#ef4444' : '#64748b' }}>{ng.toLocaleString()}</td>
                        <td style={{ padding: '7px 5px', fontWeight: 700, color: '#e2e8f0' }}>{total.toLocaleString()}</td>
                        <td style={{ padding: '7px 5px', color: '#8b5cf6' }}>{log.total_bins || 0}</td>
                        <td style={{ padding: '7px 5px' }}>
                          <span style={{ padding: '2px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                            background: parseFloat(goodPct) >= 99 ? '#10b98120' : parseFloat(goodPct) >= 95 ? '#f59e0b20' : '#ef444420',
                            color: parseFloat(goodPct) >= 99 ? '#10b981' : parseFloat(goodPct) >= 95 ? '#f59e0b' : '#ef4444' }}>
                            {goodPct}%
                          </span>
                        </td>
                        <td style={{ padding: '7px 5px', color: '#94a3b8', fontSize: 10 }}>{log.operator || '—'}</td>
                        <td style={{ padding: '7px 5px' }}>
                          {hasBins && <span style={{ fontSize: 10, color: isExpanded ? '#3b82f6' : '#475569' }}>{isExpanded ? '▲' : '▼'} {log.bins.length}</span>}
                        </td>
                      </tr>
                      {isExpanded && hasBins && (
                        <tr>
                          <td colSpan={14} style={{ padding: 0 }}>
                            <div style={{ padding: '8px 16px 12px 40px', background: '#0f172a' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 100px 100px 1fr', gap: 6, marginBottom: 4 }}>
                                {['#', 'เลขที่ถัง', '✅ ดี', '❌ เสีย', 'หมายเหตุ'].map(h =>
                                  <span key={h} style={{ color: '#475569', fontSize: 9, fontWeight: 700 }}>{h}</span>
                                )}
                              </div>
                              {log.bins.map((bin, bIdx) => (
                                <div key={bIdx} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 100px 100px 1fr', gap: 6, padding: '3px 0',
                                  borderBottom: '1px solid #1e293b', alignItems: 'center' }}>
                                  <span style={{ color: '#475569', fontSize: 10 }}>{bIdx + 1}</span>
                                  <span style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 600 }}>{bin.bin_no || '—'}</span>
                                  <span style={{ color: '#10b981', fontSize: 11, fontWeight: 600 }}>{(bin.good_qty || 0).toLocaleString()}</span>
                                  <span style={{ color: (bin.ng_qty || 0) > 0 ? '#ef4444' : '#64748b', fontSize: 11, fontWeight: 600 }}>{(bin.ng_qty || 0).toLocaleString()}</span>
                                  <span style={{ color: '#64748b', fontSize: 10 }}>{bin.note || ''}</span>
                                </div>
                              ))}
                              <div style={{ marginTop: 6, display: 'flex', gap: 12, fontSize: 10, color: '#64748b' }}>
                                <span>รวม: <strong style={{ color: '#e2e8f0' }}>{log.bins.reduce((s2, b) => s2 + (b.good_qty || 0) + (b.ng_qty || 0), 0).toLocaleString()}</strong> ชิ้น</span>
                                <span>ดี: <strong style={{ color: '#10b981' }}>{log.bins.reduce((s2, b) => s2 + (b.good_qty || 0), 0).toLocaleString()}</strong></span>
                                <span>เสีย: <strong style={{ color: '#ef4444' }}>{log.bins.reduce((s2, b) => s2 + (b.ng_qty || 0), 0).toLocaleString()}</strong></span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #334155', background: '#0f172a' }}>
                  <td colSpan={7} style={{ padding: '10px 5px', color: '#e2e8f0', fontWeight: 700, fontSize: 12 }}>
                    รวม ({filteredLogs.length} รายการ)
                  </td>
                  <td style={{ padding: '10px 5px', fontWeight: 700, color: '#10b981', fontSize: 13 }}>
                    {filteredLogs.reduce((s, l) => s + (l.total_good || 0), 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 5px', fontWeight: 700, color: '#ef4444', fontSize: 13 }}>
                    {filteredLogs.reduce((s, l) => s + (l.total_ng || 0), 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 5px', fontWeight: 700, color: '#e2e8f0', fontSize: 13 }}>
                    {filteredLogs.reduce((s, l) => s + (l.total_produced || 0), 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 5px', fontWeight: 700, color: '#8b5cf6', fontSize: 13 }}>
                    {filteredLogs.reduce((s, l) => s + (l.total_bins || 0), 0)}
                  </td>
                  <td style={{ padding: '10px 5px' }}>
                    {(() => {
                      const tg = filteredLogs.reduce((s, l) => s + (l.total_good || 0), 0);
                      const tp = filteredLogs.reduce((s, l) => s + (l.total_produced || 0), 0);
                      const p = tp > 0 ? ((tg / tp) * 100).toFixed(1) : '0';
                      return <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                        background: '#10b98120', color: '#10b981' }}>{p}%</span>;
                    })()}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default KPIProductionLog;