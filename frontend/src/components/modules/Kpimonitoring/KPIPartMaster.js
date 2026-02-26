/**
 * KPIPartMaster.js — 📦 Part Master Management
 *
 * ฟีเจอร์:
 * - ตาราง Part Master (ค้นหา, กรอง)
 * - สร้าง / แก้ไข / ลบ Part
 * - ข้อมูล: Part No, Name, Customer, Heat Treatment, Billet, Line
 */

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../utils/api';

const HEAT_TYPES = ['Q-T', 'Normalizing', 'Carburizing', 'Nitriding', 'Induction', 'None'];
const CATEGORIES = [
  { value: 'automotive', label: '🚗 Automotive' },
  { value: 'industrial', label: '🏭 Industrial' },
  { value: 'machining', label: '⚙️ Machining' },
];

const emptyPart = {
  part_number: '', part_name: '', customer_name: '',
  heat_treatment_type: '', hardness_spec: '', heat_treatment_supplier: '',
  billet_size: '', billet_weight: '', billet_material: '',
  primary_line: '', secondary_line: '', product_category: '',
  cycle_time: '', standard_output: '',
  drawing_no: '', revision: '', notes: '',
};

const KPIPartMaster = () => {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null=list, object=form
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchParts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/kpi/parts', { params: { search, limit: 100 } });
      const raw = res?.data || res;
      let rows = [];
      if (raw?.data && Array.isArray(raw.data)) rows = raw.data;
      else if (Array.isArray(raw)) rows = raw;
      setParts(rows);
    } catch (err) {
      console.error('Fetch parts error:', err);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchParts(); }, [fetchParts]);

  const openNew = () => { setEditing({ ...emptyPart }); setIsNew(true); };
  const openEdit = (p) => { setEditing({ ...p }); setIsNew(false); };
  const close = () => { setEditing(null); setIsNew(false); };

  const handleSave = async () => {
    if (!editing.part_number || !editing.part_name) {
      showMsg('กรุณาระบุ Part No. และ Part Name', 'error');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await apiClient.post('/kpi/parts', editing);
        showMsg('✅ สร้าง Part สำเร็จ');
      } else {
        await apiClient.patch(`/kpi/parts/${editing.id}`, editing);
        showMsg('✅ อัปเดต Part สำเร็จ');
      }
      close();
      fetchParts();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.data?.error || err.message || 'บันทึกไม่สำเร็จ';
      showMsg('❌ ' + msg, 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`ยืนยันลบ Part: ${p.part_number} — ${p.part_name}?`)) return;
    try {
      await apiClient.delete(`/kpi/parts/${p.id}`);
      showMsg('🗑️ ลบสำเร็จ');
      fetchParts();
    } catch (err) { showMsg('❌ ลบไม่สำเร็จ', 'error'); }
  };

  // ─── Styles ───────────────────────────────────────────────
  const S = {
    panel: { background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b', marginBottom: 16 },
    head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1e293b', flexWrap: 'wrap', gap: 8 },
    body: { padding: 16 },
    title: { color: '#e2e8f0', fontSize: 14, fontWeight: 700, margin: 0 },
    label: { display: 'block', color: '#94a3b8', fontSize: 11, marginBottom: 4, fontWeight: 600 },
    input: { width: '100%', padding: '7px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 13 },
    grid: (n) => ({ display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 12 }),
    btn: (c) => ({ padding: '8px 16px', background: `${c}20`, border: `1px solid ${c}50`, borderRadius: 6, color: c, cursor: 'pointer', fontWeight: 600, fontSize: 13 }),
    btnSm: (c) => ({ padding: '4px 10px', background: `${c}20`, border: `1px solid ${c}40`, borderRadius: 4, color: c, cursor: 'pointer', fontSize: 11 }),
    tag: (c) => ({ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: `${c}20`, color: c, display: 'inline-block' }),
    sectionTitle: { color: '#e2e8f0', fontSize: 12, fontWeight: 700, marginBottom: 10, marginTop: 16, paddingBottom: 6, borderBottom: '1px solid #334155' },
  };

  const setField = (key, val) => setEditing(p => ({ ...p, [key]: val }));

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div>
      {message && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 24px', borderRadius: 8,
          background: message.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {message.text}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* LIST VIEW */}
      {/* ═══════════════════════════════════════════════════════ */}
      {!editing && (
        <div style={S.panel}>
          <div style={S.head}>
            <h3 style={S.title}>📦 Part Master ({parts.length})</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...S.input, width: 250 }} placeholder="🔍 ค้นหา Part No. / Name / Customer..."
                value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchParts()} />
              <button onClick={fetchParts} style={S.btn('#3b82f6')}>🔍</button>
              <button onClick={openNew} style={S.btn('#10b981')}>➕ เพิ่ม Part</button>
            </div>
          </div>
          <div style={S.body}>
            {loading ? <div style={{ textAlign: 'center', color: '#64748b', padding: 30 }}>⏳ โหลด...</div> :
            parts.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>
                📭 ยังไม่มี Part — กด "➕ เพิ่ม Part" เพื่อสร้าง
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      {['Part No.', 'Part Name', 'Customer', 'Heat Treat', 'Hardness', 'Billet', 'น้ำหนัก(g)', 'Line', 'Category', 'จัดการ'].map(h =>
                        <th key={h} style={{ padding: '8px 6px', color: '#94a3b8', fontSize: 11, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '8px 6px', fontWeight: 700, color: '#3b82f6' }}>{p.part_number}</td>
                        <td style={{ padding: '8px 6px', color: '#e2e8f0' }}>{p.part_name}</td>
                        <td style={{ padding: '8px 6px', color: '#94a3b8' }}>{p.customer_name || '—'}</td>
                        <td style={{ padding: '8px 6px' }}>
                          {p.heat_treatment_type ? <span style={S.tag('#f59e0b')}>{p.heat_treatment_type}</span> : '—'}
                        </td>
                        <td style={{ padding: '8px 6px', color: '#94a3b8' }}>{p.hardness_spec || '—'}</td>
                        <td style={{ padding: '8px 6px', color: '#94a3b8' }}>{p.billet_size || '—'}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>{p.billet_weight || '—'}</td>
                        <td style={{ padding: '8px 6px' }}>
                          {p.primary_line ? <span style={S.tag('#3b82f6')}>{p.primary_line}</span> : '—'}
                        </td>
                        <td style={{ padding: '8px 6px' }}>
                          {p.product_category ? <span style={S.tag('#8b5cf6')}>{p.product_category}</span> : '—'}
                        </td>
                        <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                          <button onClick={() => openEdit(p)} style={S.btnSm('#3b82f6')}>✏️</button>
                          <button onClick={() => handleDelete(p)} style={{ ...S.btnSm('#ef4444'), marginLeft: 4 }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CREATE / EDIT FORM */}
      {/* ═══════════════════════════════════════════════════════ */}
      {editing && (
        <div>
          <div style={S.panel}>
            <div style={S.head}>
              <h3 style={S.title}>{isNew ? '➕ เพิ่ม Part ใหม่' : `✏️ แก้ไข ${editing.part_number}`}</h3>
              <button onClick={close} style={S.btn('#64748b')}>✕ ปิด</button>
            </div>
            <div style={S.body}>

              {/* ─── Section 1: ข้อมูลหลัก ─── */}
              <div style={S.sectionTitle}>📋 ข้อมูลหลัก</div>
              <div style={S.grid(4)}>
                <div>
                  <label style={{ ...S.label, color: '#3b82f6' }}>Part No. *</label>
                  <input style={{ ...S.input, borderColor: '#3b82f650', fontWeight: 700 }}
                    placeholder="e.g. W21-04" value={editing.part_number}
                    onChange={e => setField('part_number', e.target.value)} readOnly={!isNew} />
                </div>
                <div>
                  <label style={S.label}>Part Name *</label>
                  <input style={S.input} placeholder="ชื่อชิ้นงาน"
                    value={editing.part_name} onChange={e => setField('part_name', e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Customer</label>
                  <input style={S.input} placeholder="ชื่อลูกค้า"
                    value={editing.customer_name || ''} onChange={e => setField('customer_name', e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Product Category</label>
                  <select style={S.input} value={editing.product_category || ''}
                    onChange={e => setField('product_category', e.target.value)}>
                    <option value="">ไม่ระบุ</option>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* ─── Section 2: Heat Treatment ─── */}
              <div style={S.sectionTitle}>🌡️ Heat Treatment</div>
              <div style={S.grid(3)}>
                <div>
                  <label style={{ ...S.label, color: '#f59e0b' }}>ประเภท Heat Treatment</label>
                  <select style={{ ...S.input, borderColor: '#f59e0b50' }}
                    value={editing.heat_treatment_type || ''}
                    onChange={e => setField('heat_treatment_type', e.target.value)}>
                    <option value="">ไม่ระบุ</option>
                    {HEAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Hardness Spec</label>
                  <input style={S.input} placeholder="e.g. HRC 28-34"
                    value={editing.hardness_spec || ''} onChange={e => setField('hardness_spec', e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Supplier ชุบ</label>
                  <input style={S.input} placeholder="e.g. TTT, In-house"
                    value={editing.heat_treatment_supplier || ''} onChange={e => setField('heat_treatment_supplier', e.target.value)} />
                </div>
              </div>

              {/* ─── Section 3: วัตถุดิบ / เหล็กท่อน ─── */}
              <div style={S.sectionTitle}>🔩 วัตถุดิบ / เหล็กท่อน (Billet)</div>
              <div style={S.grid(3)}>
                <div>
                  <label style={S.label}>ขนาดเหล็กท่อน</label>
                  <input style={S.input} placeholder="e.g. 40*71 mm"
                    value={editing.billet_size || ''} onChange={e => setField('billet_size', e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>น้ำหนัก (กรัม)</label>
                  <input style={S.input} type="number" placeholder="e.g. 700"
                    value={editing.billet_weight || ''} onChange={e => setField('billet_weight', e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>เกรดเหล็ก (Material)</label>
                  <input style={S.input} placeholder="e.g. S45C, SCM440"
                    value={editing.billet_material || ''} onChange={e => setField('billet_material', e.target.value)} />
                </div>
              </div>

              {/* ─── Section 4: สายการผลิต ─── */}
              <div style={S.sectionTitle}>🏭 สายการผลิต</div>
              <div style={S.grid(4)}>
                <div>
                  <label style={{ ...S.label, color: '#3b82f6' }}>Line หลัก</label>
                  <select style={{ ...S.input, borderColor: '#3b82f650' }}
                    value={editing.primary_line || ''} onChange={e => setField('primary_line', e.target.value)}>
                    <option value="">ไม่ระบุ</option>
                    {Array.from({ length: 8 }, (_, i) => <option key={i} value={`Line-${i+1}`}>Line-{i+1}</option>)}
                    <option value="Line-CT">Line-CT</option>
                    <option value="Line-PD5">Line-PD5</option>
                    <option value="Line-MC">Line-MC</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Line สำรอง</label>
                  <select style={S.input} value={editing.secondary_line || ''}
                    onChange={e => setField('secondary_line', e.target.value)}>
                    <option value="">ไม่ระบุ</option>
                    {Array.from({ length: 8 }, (_, i) => <option key={i} value={`Line-${i+1}`}>Line-{i+1}</option>)}
                    <option value="Line-CT">Line-CT</option>
                    <option value="Line-PD5">Line-PD5</option>
                    <option value="Line-MC">Line-MC</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Cycle Time (วินาที/ชิ้น)</label>
                  <input style={S.input} type="number" step="0.1" placeholder="e.g. 12.5"
                    value={editing.cycle_time || ''} onChange={e => setField('cycle_time', e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>มาตรฐาน (ชิ้น/ชม.)</label>
                  <input style={S.input} type="number" placeholder="e.g. 280"
                    value={editing.standard_output || ''} onChange={e => setField('standard_output', e.target.value)} />
                </div>
              </div>

              {/* ─── Section 5: Drawing / Notes ─── */}
              <div style={S.sectionTitle}>📐 Drawing & หมายเหตุ</div>
              <div style={S.grid(3)}>
                <div>
                  <label style={S.label}>Drawing No.</label>
                  <input style={S.input} placeholder="e.g. DW-W21-04"
                    value={editing.drawing_no || ''} onChange={e => setField('drawing_no', e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Revision</label>
                  <input style={S.input} placeholder="e.g. Rev.3"
                    value={editing.revision || ''} onChange={e => setField('revision', e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>หมายเหตุ</label>
                  <input style={S.input} placeholder="หมายเหตุเพิ่มเติม..."
                    value={editing.notes || ''} onChange={e => setField('notes', e.target.value)} />
                </div>
              </div>

              {/* ─── Save / Cancel ─── */}
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button onClick={handleSave} disabled={saving}
                  style={{ flex: 1, padding: '14px', fontSize: 15, fontWeight: 700, borderRadius: 8,
                    background: saving ? '#475569' : 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none', color: '#fff', cursor: saving ? 'wait' : 'pointer' }}>
                  {saving ? '⏳ กำลังบันทึก...' : isNew ? '✅ สร้าง Part' : '✅ บันทึกการแก้ไข'}
                </button>
                <button onClick={close} style={{ ...S.btn('#64748b'), padding: '14px 24px' }}>ยกเลิก</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KPIPartMaster;