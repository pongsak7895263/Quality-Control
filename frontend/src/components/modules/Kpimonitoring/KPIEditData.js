/**
 * KPIEditData.js — ✏️ หน้าแก้ไขข้อมูลทุกหัวข้อ
 *
 * Sections:
 * 1. ผลผลิต (Production Summary) — แก้ยอด, ลบรายการ
 * 2. รายละเอียดของเสีย (Defect Details) — แก้ทุก field, ลบ
 * 3. Customer Claims — แก้สถานะ, root cause, action
 */

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../utils/api';
import { DEFECT_CODES, REWORK_METHODS } from './product_categories';

const SECTIONS = [
  { id: 'production', label: '📊 ผลผลิต', color: '#3b82f6' },
  { id: 'claims', label: '📮 Claims', color: '#8b5cf6' },
];

const KPIEditData = ({ onRefresh }) => {
  const [section, setSection] = useState('production');
  const [filters, setFilters] = useState({
    searchMode: 'all',  // date | month | all
    date: new Date().toISOString().split('T')[0],
    month: new Date().toISOString().slice(0, 7),
    line: 'ALL', shift: 'ALL',
  });

  // ─── Production Data ──────────────────────────────────────
  const [prodRecords, setProdRecords] = useState([]);
  const [editingProd, setEditingProd] = useState(null);
  const [editingDefects, setEditingDefects] = useState([]);
  const [loadingProd, setLoadingProd] = useState(false);

  // ─── Claims Data ──────────────────────────────────────────
  const [claims, setClaims] = useState([]);
  const [editingClaim, setEditingClaim] = useState(null);
  const [loadingClaims, setLoadingClaims] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // ═══════════════════════════════════════════════════════════
  // PRODUCTION — Fetch / Edit / Delete
  // ═══════════════════════════════════════════════════════════
  const fetchProduction = useCallback(async () => {
    setLoadingProd(true);
    try {
      const params = { line: filters.line, shift: filters.shift };
      if (filters.searchMode === 'date') params.date = filters.date;
      else if (filters.searchMode === 'month') params.month = filters.month;

      console.log('[Edit] Fetching with params:', params);
      const res = await apiClient.get('/kpi/edit/production', { params });
      console.log('[Edit] Raw response:', JSON.stringify(res).substring(0, 300));
      
      // Robust parsing: apiClient อาจ return res.data หรือ res.data.data
      let rows = [];
      if (res && res.data && Array.isArray(res.data.data)) {
        rows = res.data.data;                    // axios: res.data = { success, data: [...] }
      } else if (res && Array.isArray(res.data)) {
        rows = res.data;                         // axios: res.data = [...]
      } else if (res && res.success && Array.isArray(res.data)) {
        rows = res.data;                         // apiClient unwrap: { success, data: [...] }
      } else if (Array.isArray(res)) {
        rows = res;                              // direct array
      }
      
      console.log('[Edit] Parsed rows:', rows.length, rows.length > 0 ? 'first=' + rows[0]?.line_no : '');
      setProdRecords(rows);
    } catch (err) {
      console.error('Fetch production error:', err?.response?.data || err.message || err);
    } finally { setLoadingProd(false); }
  }, [filters]);

  const openEditProd = async (record) => {
    try {
      const res = await apiClient.get(`/kpi/edit/production/${record.id}`);
      const raw = res?.data || res;
      const data = raw?.data || raw;
      setEditingProd(data);
      setEditingDefects(data.defects || []);
    } catch (err) {
      showMsg('ไม่สามารถโหลดข้อมูลได้', 'error');
    }
  };

  const saveProd = async () => {
    if (!editingProd) return;
    setSaving(true);
    try {
      await apiClient.patch(`/kpi/edit/production/${editingProd.id}`, {
        production_date: editingProd.production_date?.split('T')[0] || undefined,
        part_number: editingProd.part_number,
        lot_number: editingProd.lot_number || null,
        shift: editingProd.shift,
        operator_name: editingProd.operator_name,
        inspector_name: editingProd.inspector_name || null,
        total_produced: parseInt(editingProd.total_produced),
        good_qty: parseInt(editingProd.good_qty),
        rework_qty: parseInt(editingProd.rework_qty),
        scrap_qty: parseInt(editingProd.scrap_qty),
        rework_good_qty: parseInt(editingProd.rework_good_qty),
        rework_scrap_qty: parseInt(editingProd.rework_scrap_qty),
        notes: editingProd.notes,
      });
      // Save defects
      for (const d of editingDefects) {
        if (d._deleted) {
          await apiClient.delete(`/kpi/edit/defect/${d.id}`);
        } else if (d._modified) {
          await apiClient.patch(`/kpi/edit/defect/${d.id}`, {
            defect_type: d.defect_type, quantity: parseInt(d.quantity) || 1,
            measurement: d.measurement, spec_value: d.spec_value,
            defect_detail: d.defect_detail, rework_result: d.rework_result,
            f07_doc_no: d.f07_doc_no, bin_no: d.bin_no,
            found_qty: parseInt(d.found_qty) || 0,
            sorted_good: parseInt(d.sorted_good) || 0,
            sorted_reject: parseInt(d.sorted_reject) || 0,
            defect_code: d.defect_code,
          });
        }
      }
      showMsg('✅ บันทึกการแก้ไขสำเร็จ');
      setEditingProd(null);
      fetchProduction();
      if (onRefresh) onRefresh();
    } catch (err) {
      showMsg('❌ ' + (err.message || 'บันทึกไม่สำเร็จ'), 'error');
    } finally { setSaving(false); }
  };

  const deleteProd = async (id) => {
    if (!window.confirm('⚠️ ยืนยันลบรายการผลผลิตนี้? (รวม defects ทั้งหมด)')) return;
    try {
      await apiClient.delete(`/kpi/edit/production/${id}`);
      showMsg('🗑️ ลบสำเร็จ');
      setEditingProd(null);
      fetchProduction();
    } catch (err) {
      showMsg('❌ ลบไม่สำเร็จ', 'error');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // CLAIMS — Fetch / Edit
  // ═══════════════════════════════════════════════════════════
  const fetchClaims = useCallback(async () => {
    setLoadingClaims(true);
    try {
      const res = await apiClient.get('/kpi/claims');
      const raw = res?.data || res;
      setClaims(raw?.data || (Array.isArray(raw) ? raw : []));
    } catch (err) { console.error(err); }
    finally { setLoadingClaims(false); }
  }, []);

  const saveClaim = async () => {
    if (!editingClaim) return;
    setSaving(true);
    try {
      await apiClient.patch(`/kpi/claims/${editingClaim.id}`, {
        customer_name: editingClaim.customer,
        part_number: editingClaim.part_number,
        claim_category: editingClaim.claim_category,
        defect_qty: parseInt(editingClaim.defect_qty),
        shipped_qty: parseInt(editingClaim.shipped_qty),
        status: editingClaim.status,
        root_cause: editingClaim.root_cause,
        corrective_action: editingClaim.corrective_action,
        defect_description: editingClaim.defect_description,
      });
      showMsg('✅ อัปเดต Claim สำเร็จ');
      setEditingClaim(null);
      fetchClaims();
    } catch (err) {
      showMsg('❌ ' + (err.message || 'อัปเดตไม่สำเร็จ'), 'error');
    } finally { setSaving(false); }
  };

  // ─── Load on section change ───────────────────────────────
  useEffect(() => {
    if (section === 'production') fetchProduction();
    if (section === 'claims') fetchClaims();
  }, [section, fetchProduction, fetchClaims]);

  // ─── Styles ───────────────────────────────────────────────
  const S = {
    panel: { background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b', marginBottom: 16 },
    head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1e293b' },
    body: { padding: 16 },
    title: { color: '#e2e8f0', fontSize: 14, fontWeight: 700, margin: 0 },
    label: { display: 'block', color: '#94a3b8', fontSize: 11, marginBottom: 4, fontWeight: 600 },
    input: { width: '100%', padding: '7px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 13 },
    grid: (n) => ({ display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 12 }),
    btn: (c) => ({ padding: '6px 14px', background: `${c}20`, border: `1px solid ${c}50`, borderRadius: 6, color: c, cursor: 'pointer', fontWeight: 600, fontSize: 12 }),
    btnSm: (c) => ({ padding: '4px 10px', background: `${c}20`, border: `1px solid ${c}40`, borderRadius: 4, color: c, cursor: 'pointer', fontSize: 11 }),
    tag: (c) => ({ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: `${c}20`, color: c }),
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div>
      {/* Message Toast */}
      {message && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 24px', borderRadius: 8,
          background: message.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 600, fontSize: 14,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {message.text}
        </div>
      )}

      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => { setSection(s.id); setEditingProd(null); setEditingClaim(null); }}
            style={{ padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
              background: section === s.id ? `${s.color}30` : '#0f172a',
              border: `1px solid ${section === s.id ? s.color : '#334155'}`,
              color: section === s.id ? s.color : '#64748b' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* PRODUCTION SECTION */}
      {/* ═══════════════════════════════════════════════════════ */}
      {section === 'production' && !editingProd && (
        <>
          {/* Filters */}
          <div style={S.panel}>
            <div style={{ ...S.head, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={S.title}>📊 รายการผลผลิต ({prodRecords.length} รายการ)</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Search Mode Toggle */}
                <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #334155' }}>
                  {[
                    { id: 'month', label: '📅 เดือน' },
                    { id: 'date', label: '📆 วัน' },
                    { id: 'all', label: '📋 ทั้งหมด' },
                  ].map(m => (
                    <button key={m.id} onClick={() => setFilters(p => ({ ...p, searchMode: m.id }))}
                      style={{ padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                        background: filters.searchMode === m.id ? '#3b82f6' : '#1e293b',
                        color: filters.searchMode === m.id ? '#fff' : '#64748b' }}>
                      {m.label}
                    </button>
                  ))}
                </div>
                {filters.searchMode === 'date' && (
                  <input type="date" style={S.input} value={filters.date}
                    onChange={e => setFilters(p => ({ ...p, date: e.target.value }))} />
                )}
                {filters.searchMode === 'month' && (
                  <input type="month" style={S.input} value={filters.month}
                    onChange={e => setFilters(p => ({ ...p, month: e.target.value }))} />
                )}
                <select style={{ ...S.input, width: 'auto' }} value={filters.line}
                  onChange={e => setFilters(p => ({ ...p, line: e.target.value }))}>
                  <option value="ALL">ทุก Line</option>
                  {Array.from({ length: 8 }, (_, i) => <option key={i} value={`Line-${i+1}`}>Line-{i+1}</option>)}
                  <option value="Line-CT">Line-CT</option>
                  <option value="Line-PD5">Line-PD5</option>
                  <option value="Line-MC">Line-MC</option>
                </select>
                <button onClick={fetchProduction} style={S.btn('#3b82f6')}>🔍 ค้นหา</button>
              </div>
            </div>
            <div style={S.body}>
              {loadingProd ? <div style={{ textAlign: 'center', color: '#64748b' }}>⏳ โหลด...</div> :
              prodRecords.length === 0 ? <div style={{ textAlign: 'center', color: '#475569', padding: 24 }}>ไม่พบข้อมูล — ลองเปลี่ยนเป็น "📅 เดือน" หรือ "📋 ทั้งหมด"</div> :
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['วันที่', 'Line', 'Part No.', 'Shift', 'Operator', 'ผลิต', 'ดี', 'ซ่อม', 'ทิ้ง', 'Good%', 'จัดการ'].map(h =>
                      <th key={h} style={{ padding: '8px 6px', color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {prodRecords.map(r => {
                    const tp = Number(r.total_produced) || 0;
                    const fg = Number(r.final_good) || 0;
                    const gp = tp > 0 ? ((fg / tp) * 100).toFixed(1) : '0';
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '6px', color: '#94a3b8' }}>{r.production_date?.split('T')[0]}</td>
                        <td style={{ padding: '6px', fontWeight: 600, color: '#e2e8f0' }}>{r.line_no}</td>
                        <td style={{ padding: '6px', color: '#e2e8f0' }}>{r.part_number}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>{r.shift}</td>
                        <td style={{ padding: '6px', color: '#94a3b8' }}>{r.operator_name}</td>
                        <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700 }}>{tp}</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: '#10b981' }}>{Number(r.good_qty)}</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: '#f59e0b' }}>{Number(r.rework_qty)}</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: '#ef4444' }}>{Number(r.scrap_qty)}</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>{gp}%</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          <button onClick={() => openEditProd(r)} style={S.btnSm('#3b82f6')}>✏️ แก้ไข</button>
                          <button onClick={() => deleteProd(r.id)} style={{ ...S.btnSm('#ef4444'), marginLeft: 4 }}>🗑️</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>}
            </div>
          </div>
        </>
      )}

      {/* ═══ EDIT PRODUCTION FORM ═══ */}
      {section === 'production' && editingProd && (
        <div>
          {/* ─── Section 1: ข้อมูลการผลิต ─── */}
          <div style={S.panel}>
            <div style={S.head}>
              <h3 style={S.title}>📋 ข้อมูลการผลิต — {editingProd.line_no} | {editingProd.production_date?.split('T')[0]}</h3>
              <button onClick={() => setEditingProd(null)} style={S.btn('#64748b')}>✕ ปิด</button>
            </div>
            <div style={S.body}>
              {/* Row 1: วันที่, Line, Part, Lot */}
              <div style={S.grid(4)}>
                <div>
                  <label style={S.label}>📅 วันที่ผลิต</label>
                  <input style={S.input} type="date" value={editingProd.production_date?.split('T')[0] || ''}
                    onChange={e => setEditingProd(p => ({ ...p, production_date: e.target.value }))} />
                </div>
                <div>
                  <label style={{ ...S.label, color: '#3b82f6' }}>🏭 Line</label>
                  <input style={{ ...S.input, borderColor: '#3b82f650', fontWeight: 700, color: '#3b82f6' }}
                    readOnly value={editingProd.line_no || ''} />
                </div>
                <div>
                  <label style={S.label}>Part No.</label>
                  <input style={S.input} value={editingProd.part_number || ''}
                    onChange={e => setEditingProd(p => ({ ...p, part_number: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>Lot No.</label>
                  <input style={S.input} value={editingProd.lot_number || ''}
                    onChange={e => setEditingProd(p => ({ ...p, lot_number: e.target.value }))} />
                </div>
              </div>
              {/* Row 2: Shift, Operator, Inspector, Product Line */}
              <div style={{ ...S.grid(4), marginTop: 12 }}>
                <div>
                  <label style={S.label}>Shift</label>
                  <select style={S.input} value={editingProd.shift || 'A'}
                    onChange={e => setEditingProd(p => ({ ...p, shift: e.target.value }))}>
                    <option value="A">A (กลางวัน)</option>
                    <option value="B">B (กลางคืน)</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>👷 ผู้ปฏิบัติงาน (Operator)</label>
                  <input style={S.input} value={editingProd.operator_name || ''}
                    onChange={e => setEditingProd(p => ({ ...p, operator_name: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>🔍 ผู้ตรวจสอบ (Inspector)</label>
                  <input style={S.input} value={editingProd.inspector_name || ''}
                    onChange={e => setEditingProd(p => ({ ...p, inspector_name: e.target.value }))} />
                </div>
                <div>
                  <label style={S.label}>สายการผลิต</label>
                  <select style={S.input} value={editingProd.product_line || ''}
                    onChange={e => setEditingProd(p => ({ ...p, product_line: e.target.value }))}>
                    <option value="">ไม่ระบุ</option>
                    <option value="forging_auto">Forging - Automotive</option>
                    <option value="forging_ind">Forging - Industrial</option>
                    <option value="machining">Machining</option>
                  </select>
                </div>
              </div>

              {/* Row 3: ยอดผลิต */}
              <div style={{ marginTop: 16, padding: 14, background: '#1e293b', borderRadius: 8, border: '1px solid #334155' }}>
                <h4 style={{ color: '#e2e8f0', fontSize: 12, marginBottom: 12, margin: '0 0 12px 0' }}>📊 ยอดผลิตและผลตรวจสอบ</h4>
                <div style={S.grid(6)}>
                  {[
                    { key: 'total_produced', label: 'ยอดผลิตรวม', color: '#e2e8f0' },
                    { key: 'good_qty', label: '✅ Good', color: '#10b981' },
                    { key: 'rework_qty', label: '🔧 Rework', color: '#f59e0b' },
                    { key: 'scrap_qty', label: '❌ Scrap', color: '#ef4444' },
                    { key: 'rework_good_qty', label: 'ซ่อมดี', color: '#10b981' },
                    { key: 'rework_scrap_qty', label: 'ซ่อมไม่ผ่าน', color: '#ef4444' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ ...S.label, color: f.color }}>{f.label}</label>
                      <input style={{ ...S.input, borderColor: f.color + '50', textAlign: 'center', fontSize: 16, fontWeight: 700 }}
                        type="number" value={editingProd[f.key] ?? ''}
                        onChange={e => setEditingProd(p => ({ ...p, [f.key]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              </div>

              {/* หมายเหตุ */}
              <div style={{ marginTop: 12 }}>
                <label style={S.label}>📝 หมายเหตุ</label>
                <input style={S.input} placeholder="หมายเหตุเพิ่มเติม..." value={editingProd.notes || ''}
                  onChange={e => setEditingProd(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* ─── Section 2: รายละเอียดของเสีย ─── */}
          <div style={S.panel}>
            <div style={S.head}>
              <h3 style={S.title}>🔍 รายละเอียดของเสีย ({editingDefects.filter(d => !d._deleted).length} รายการ)</h3>
            </div>
            <div style={S.body}>
            {editingDefects.filter(d => !d._deleted).length === 0 ? (
              <div style={{ textAlign: 'center', color: '#475569', padding: 20 }}>ไม่มีรายการของเสีย</div>
            ) : editingDefects.filter(d => !d._deleted).map((d, idx) => (
                  <div key={d.id} style={{ padding: 14, marginBottom: 12, background: '#1e293b', borderRadius: 8,
                    border: `1px solid ${d.defect_type === 'scrap' ? '#ef444440' : '#f59e0b40'}` }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ ...S.tag(d.defect_type === 'scrap' ? '#ef4444' : '#f59e0b') }}>
                          #{idx + 1} {d.defect_type === 'scrap' ? '❌ Scrap' : '🔧 Rework'}
                        </span>
                        {d.f07_doc_no && <span style={{ color: '#8b5cf6', fontSize: 11 }}>📋 {d.f07_doc_no}</span>}
                        {d.bin_no && <span style={{ color: '#64748b', fontSize: 11 }}>ถัง: {d.bin_no}</span>}
                        {d.defect_code && <span style={{ color: '#3b82f6', fontSize: 11 }}>{d.defect_code} {d.defect_name ? `- ${d.defect_name}` : ''}</span>}
                      </div>
                      <button onClick={() => setEditingDefects(prev => prev.map(x => x.id === d.id ? { ...x, _deleted: true } : x))}
                        style={S.btnSm('#ef4444')}>🗑️ ลบ</button>
                    </div>

                    {/* Row 1: F07, Bin, Defect Code, ประเภท, ผลซ่อม */}
                    <div style={S.grid(5)}>
                      <div>
                        <label style={{ ...S.label, color: '#8b5cf6' }}>📋 F07 เลขที่</label>
                        <input style={{ ...S.input, borderColor: '#8b5cf650' }} value={d.f07_doc_no || ''}
                          onChange={e => setEditingDefects(prev => prev.map(x => x.id === d.id ? { ...x, f07_doc_no: e.target.value, _modified: true } : x))} />
                      </div>
                      <div>
                        <label style={S.label}>เลขที่ถัง (Bin No.)</label>
                        <input style={S.input} value={d.bin_no || ''}
                          onChange={e => setEditingDefects(prev => prev.map(x => x.id === d.id ? { ...x, bin_no: e.target.value, _modified: true } : x))} />
                      </div>
                      <div>
                        <label style={S.label}>Defect Code</label>
                        <select style={S.input} value={d.defect_code || ''}
                          onChange={e => setEditingDefects(prev => prev.map(x => x.id === d.id ? { ...x, defect_code: e.target.value, _modified: true } : x))}>
                          <option value="">เลือก</option>
                          {DEFECT_CODES.map(dc => <option key={dc.code} value={dc.code}>{dc.code} — {dc.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={S.label}>ประเภทของเสีย</label>
                        <select style={S.input} value={d.defect_type || 'rework'}
                          onChange={e => setEditingDefects(prev => prev.map(x => x.id === d.id ? { ...x, defect_type: e.target.value, _modified: true } : x))}>
                          <option value="rework">🔧 เสียซ่อม</option>
                          <option value="scrap">❌ เสียทิ้ง</option>
                        </select>
                      </div>
                      <div>
                        <label style={S.label}>ผลซ่อม</label>
                        <select style={S.input} value={d.rework_result || ''}
                          onChange={e => setEditingDefects(prev => prev.map(x => x.id === d.id ? { ...x, rework_result: e.target.value, _modified: true } : x))}>
                          <option value="">— ไม่ระบุ —</option>
                          <option value="pending">⏳ รอซ่อม</option>
                          <option value="good">✅ ซ่อมดี</option>
                          <option value="scrap">❌ ซ่อมไม่ผ่าน</option>
                        </select>
                      </div>
                    </div>

                    {/* Row 2: จำนวนพบ + คัดแยก */}
                    <div style={{ ...S.grid(4), marginTop: 10, padding: 10, background: '#0f172a', borderRadius: 6 }}>
                      <div>
                        <label style={{ ...S.label, color: '#f97316' }}>จำนวนที่พบในถัง</label>
                        <input style={{ ...S.input, borderColor: '#f9731650' }} type="number" value={d.found_qty || ''}
                          onChange={e => setEditingDefects(prev => prev.map(x => x.id === d.id ? { ...x, found_qty: e.target.value, _modified: true } : x))} />
                      </div>
                      <div>
                        <label style={{ ...S.label, color: '#10b981' }}>คัดแยก → ดี (ชิ้น)</label>
                        <input style={{ ...S.input, borderColor: '#10b98150' }} type="number" value={d.sorted_good || ''}
                          onChange={e => setEditingDefects(prev => prev.map(x => x.id === d.id ? { ...x, sorted_good: e.target.value, _modified: true } : x))} />
                      </div>
                      <div>
                        <label style={{ ...S.label, color: '#ef4444' }}>คัดแยก → เสีย (ชิ้น)</label>
                        <input style={{ ...S.input, borderColor: '#ef444450' }} type="number" value={d.sorted_reject || ''}
                          onChange={e => setEditingDefects(prev => prev.map(x => x.id === d.id ? { ...x, sorted_reject: e.target.value, _modified: true } : x))} />
                      </div>
                      <div>
                        <label style={S.label}>คงเหลือ</label>
                        <input style={{ ...S.input, background: '#1e293b', color: '#64748b' }} readOnly
                          value={(parseInt(d.found_qty) || 0) - (parseInt(d.sorted_good) || 0) - (parseInt(d.sorted_reject) || 0) || '—'} />
                      </div>
                    </div>

                    {/* Row 3: ค่าวัด + Spec + หมายเหตุ */}
                    <div style={{ ...S.grid(3), marginTop: 10 }}>
                      <div>
                        <label style={S.label}>ค่าวัดจริง (Actual)</label>
                        <input style={S.input} value={d.measurement || ''}
                          onChange={e => setEditingDefects(prev => prev.map(x => x.id === d.id ? { ...x, measurement: e.target.value, _modified: true } : x))} />
                      </div>
                      <div>
                        <label style={S.label}>ค่า Spec</label>
                        <input style={S.input} value={d.spec_value || ''}
                          onChange={e => setEditingDefects(prev => prev.map(x => x.id === d.id ? { ...x, spec_value: e.target.value, _modified: true } : x))} />
                      </div>
                      <div>
                        <label style={S.label}>หมายเหตุ</label>
                        <input style={S.input} value={d.defect_detail || ''}
                          onChange={e => setEditingDefects(prev => prev.map(x => x.id === d.id ? { ...x, defect_detail: e.target.value, _modified: true } : x))} />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* ─── Save / Delete / Cancel ─── */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button onClick={saveProd} disabled={saving}
                style={{ flex: 1, padding: '14px', fontSize: 15, fontWeight: 700, borderRadius: 8,
                  background: saving ? '#475569' : 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none', color: '#fff', cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? '⏳ กำลังบันทึก...' : '✅ บันทึกการแก้ไขทั้งหมด'}
              </button>
              <button onClick={() => deleteProd(editingProd.id)} style={{ ...S.btn('#ef4444'), padding: '14px 24px' }}>🗑️ ลบทั้งหมด</button>
              <button onClick={() => setEditingProd(null)} style={{ ...S.btn('#64748b'), padding: '14px 24px' }}>ยกเลิก</button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CLAIMS SECTION */}
      {/* ═══════════════════════════════════════════════════════ */}
      {section === 'claims' && !editingClaim && (
        <div style={S.panel}>
          <div style={S.head}>
            <h3 style={S.title}>📮 Claims ({claims.length})</h3>
            <button onClick={fetchClaims} style={S.btn('#8b5cf6')}>🔄 โหลด</button>
          </div>
          <div style={S.body}>
            {loadingClaims ? <div style={{ textAlign: 'center', color: '#64748b' }}>⏳</div> :
            claims.length === 0 ? <div style={{ textAlign: 'center', color: '#475569', padding: 24 }}>ไม่มี Claims</div> :
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  {['วันที่', 'ลูกค้า', 'Part', 'ประเภท', 'Defect', 'Shipped', 'PPM', 'สถานะ', 'จัดการ'].map(h =>
                    <th key={h} style={{ padding: '8px 6px', color: '#94a3b8', fontSize: 11 }}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {claims.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '6px', color: '#94a3b8' }}>{c.claim_date?.split('T')[0]}</td>
                    <td style={{ padding: '6px', fontWeight: 600, color: '#e2e8f0' }}>{c.customer}</td>
                    <td style={{ padding: '6px' }}>{c.part_number}</td>
                    <td style={{ padding: '6px' }}><span style={S.tag('#3b82f6')}>{c.claim_category}</span></td>
                    <td style={{ padding: '6px', textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>{c.defect_qty}</td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>{Number(c.shipped_qty).toLocaleString()}</td>
                    <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700,
                      color: parseFloat(c.ppm) > 50 ? '#ef4444' : '#10b981' }}>{parseFloat(c.ppm || 0).toFixed(1)}</td>
                    <td style={{ padding: '6px' }}>
                      <span style={S.tag(c.status === 'closed' ? '#10b981' : c.status === 'open' ? '#ef4444' : '#f59e0b')}>{c.status}</span>
                    </td>
                    <td style={{ padding: '6px' }}>
                      <button onClick={() => setEditingClaim({ ...c })} style={S.btnSm('#3b82f6')}>✏️ แก้ไข</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>}
          </div>
        </div>
      )}

      {/* ═══ EDIT CLAIM FORM ═══ */}
      {section === 'claims' && editingClaim && (
        <div style={S.panel}>
          <div style={S.head}>
            <h3 style={S.title}>✏️ แก้ไข Claim — {editingClaim.claim_number} | {editingClaim.customer}</h3>
            <button onClick={() => setEditingClaim(null)} style={S.btn('#64748b')}>✕ ปิด</button>
          </div>
          <div style={S.body}>
            <div style={S.grid(4)}>
              <div>
                <label style={S.label}>ลูกค้า</label>
                <input style={S.input} value={editingClaim.customer || ''}
                  onChange={e => setEditingClaim(p => ({ ...p, customer: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Part No.</label>
                <input style={S.input} value={editingClaim.part_number || ''}
                  onChange={e => setEditingClaim(p => ({ ...p, part_number: e.target.value }))} />
              </div>
              <div>
                <label style={{ ...S.label, color: '#ef4444' }}>Defect Qty</label>
                <input style={{ ...S.input, borderColor: '#ef444450' }} type="number" value={editingClaim.defect_qty || ''}
                  onChange={e => setEditingClaim(p => ({ ...p, defect_qty: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Shipped Qty</label>
                <input style={S.input} type="number" value={editingClaim.shipped_qty || ''}
                  onChange={e => setEditingClaim(p => ({ ...p, shipped_qty: e.target.value }))} />
              </div>
            </div>
            <div style={{ ...S.grid(3), marginTop: 12 }}>
              <div>
                <label style={S.label}>ประเภท</label>
                <select style={S.input} value={editingClaim.claim_category || ''}
                  onChange={e => setEditingClaim(p => ({ ...p, claim_category: e.target.value }))}>
                  <option value="automotive">Automotive</option>
                  <option value="industrial">Industrial</option>
                  <option value="machining">Machining</option>
                </select>
              </div>
              <div>
                <label style={S.label}>สถานะ</label>
                <select style={S.input} value={editingClaim.status || ''}
                  onChange={e => setEditingClaim(p => ({ ...p, status: e.target.value }))}>
                  <option value="open">🔴 Open</option>
                  <option value="investigating">🟡 Investigating</option>
                  <option value="corrective_action">🔵 Corrective Action</option>
                  <option value="closed">✅ Closed</option>
                </select>
              </div>
              <div>
                <label style={S.label}>ปัญหา</label>
                <input style={S.input} value={editingClaim.defect_description || ''}
                  onChange={e => setEditingClaim(p => ({ ...p, defect_description: e.target.value }))} />
              </div>
            </div>
            <div style={{ ...S.grid(2), marginTop: 12 }}>
              <div>
                <label style={S.label}>Root Cause</label>
                <textarea style={{ ...S.input, minHeight: 60 }} value={editingClaim.root_cause || ''}
                  onChange={e => setEditingClaim(p => ({ ...p, root_cause: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Corrective Action</label>
                <textarea style={{ ...S.input, minHeight: 60 }} value={editingClaim.corrective_action || ''}
                  onChange={e => setEditingClaim(p => ({ ...p, corrective_action: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={saveClaim} disabled={saving}
                style={{ flex: 1, padding: '12px', fontSize: 15, fontWeight: 700, borderRadius: 8,
                  background: saving ? '#475569' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  border: 'none', color: '#fff', cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? '⏳...' : '✅ บันทึกการแก้ไข'}
              </button>
              <button onClick={() => setEditingClaim(null)} style={{ ...S.btn('#64748b'), padding: '12px 24px' }}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KPIEditData;