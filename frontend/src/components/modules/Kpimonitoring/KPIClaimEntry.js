/**
 * KPIClaimEntry.js — 📮 ระบบบันทึก Customer Claim
 * 
 * ฟีเจอร์:
 * - บันทึก: วันที่, ลูกค้า, Part, Defect/Shipped → PPM auto, ประเภท, Defect Code, Root Cause, Action
 * - ตาราง Claim Log + กรอง + แก้สถานะ
 * - สรุป PPM ตาม category
 */

import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../../utils/api';
import { DEFECT_CODES, CLAIM_TARGETS } from './product_categories';

const CLAIM_CATEGORIES = [
  { value: 'automotive', label: 'Automotive Parts', color: '#3b82f6' },
  { value: 'industrial', label: 'Other Industrial', color: '#8b5cf6' },
  { value: 'machining', label: 'Machining', color: '#ef4444' },
];

const CLAIM_STATUSES = [
  { value: 'open', label: '🔴 Open', color: '#ef4444' },
  { value: 'investigating', label: '🟡 Investigating', color: '#f59e0b' },
  { value: 'corrective_action', label: '🔵 Corrective Action', color: '#3b82f6' },
  { value: 'closed', label: '✅ Closed', color: '#10b981' },
];

const KPIClaimEntry = ({ onRefresh }) => {
  // ─── State ────────────────────────────────────────────────────
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState({ status: 'all', category: 'all' });
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    claim_date: new Date().toISOString().split('T')[0],
    customer_name: '',
    part_number: '',
    claim_category: 'automotive',
    defect_qty: '',
    shipped_qty: '',
    defect_code: '',
    defect_description: '',
    root_cause: '',
    corrective_action: '',
    status: 'open',
    remark: '',
  });

  // ─── Fetch Claims ─────────────────────────────────────────────
  const fetchClaims = useCallback(async () => {
    try {
      const res = await apiClient.get('/kpi/claims', {
        params: { status: filter.status !== 'all' ? filter.status : undefined }
      });
      const data = res?.data || res;
      if (Array.isArray(data)) {
        setClaims(data);
      } else if (data?.rows) {
        setClaims(data.rows);
      }
    } catch (err) {
      console.warn('⚠️ [Claims] fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [filter.status]);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  // ─── Handlers ─────────────────────────────────────────────────
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      claim_date: new Date().toISOString().split('T')[0],
      customer_name: '', part_number: '', claim_category: 'automotive',
      defect_qty: '', shipped_qty: '', defect_code: '',
      defect_description: '', root_cause: '', corrective_action: '',
      status: 'open', remark: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  // ─── Calculated PPM ───────────────────────────────────────────
  const defectQty = parseInt(formData.defect_qty) || 0;
  const shippedQty = parseInt(formData.shipped_qty) || 0;
  const ppm = shippedQty > 0 ? ((defectQty / shippedQty) * 1000000).toFixed(2) : '0.00';

  // ─── Submit ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!formData.customer_name || !formData.part_number || !formData.defect_qty || !formData.shipped_qty) {
      alert('กรุณากรอก: ลูกค้า, Part No., จำนวน Defect, จำนวน Shipped');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        defect_qty: defectQty,
        shipped_qty: shippedQty,
        ppm: parseFloat(ppm),
      };

      if (editingId) {
        await apiClient.patch(`/kpi/claims/${editingId}`, payload);
      } else {
        await apiClient.post('/kpi/claims', payload);
      }

      resetForm();
      fetchClaims();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Claim save error:', err);
      alert('❌ ' + (err.message || 'ไม่สามารถบันทึกได้'));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Edit Claim ───────────────────────────────────────────────
  const handleEdit = (claim) => {
    setFormData({
      claim_date: claim.claim_date?.split('T')[0] || '',
      customer_name: claim.customer_name || '',
      part_number: claim.part_number || '',
      claim_category: claim.claim_category || 'automotive',
      defect_qty: String(claim.defect_qty || ''),
      shipped_qty: String(claim.shipped_qty || ''),
      defect_code: claim.defect_code || '',
      defect_description: claim.defect_description || '',
      root_cause: claim.root_cause || '',
      corrective_action: claim.corrective_action || '',
      status: claim.status || 'open',
      remark: claim.remark || '',
    });
    setEditingId(claim.id);
    setShowForm(true);
  };

  // ─── Update Status ────────────────────────────────────────────
  const handleStatusChange = async (claimId, newStatus) => {
    try {
      await apiClient.patch(`/kpi/claims/${claimId}`, { status: newStatus });
      fetchClaims();
    } catch (err) {
      alert('❌ อัปเดตสถานะไม่สำเร็จ');
    }
  };

  // ─── Summary by Category ──────────────────────────────────────
  const categorySummary = CLAIM_CATEGORIES.map(cat => {
    const catClaims = claims.filter(c => c.claim_category === cat.value);
    const totalDefect = catClaims.reduce((s, c) => s + (Number(c.defect_qty) || 0), 0);
    const totalShipped = catClaims.reduce((s, c) => s + (Number(c.shipped_qty) || 0), 0);
    const catPpm = totalShipped > 0 ? ((totalDefect / totalShipped) * 1000000).toFixed(2) : '0.00';
    const target = CLAIM_TARGETS?.[cat.value]?.target || 0;
    return { ...cat, count: catClaims.length, ppm: catPpm, target, totalDefect, totalShipped };
  });

  // ─── Filtered Claims ──────────────────────────────────────────
  const filteredClaims = claims.filter(c => {
    if (filter.status !== 'all' && c.status !== filter.status) return false;
    if (filter.category !== 'all' && c.claim_category !== filter.category) return false;
    return true;
  });

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="kpi-claims">
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
        {categorySummary.map(cat => (
          <div key={cat.value} className="kpi-panel" style={{ borderTop: `3px solid ${cat.color}` }}>
            <div className="kpi-panel__body" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>{cat.label}</span>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 10,
                  background: parseFloat(cat.ppm) <= cat.target ? '#10b98130' : '#ef444430',
                  color: parseFloat(cat.ppm) <= cat.target ? '#10b981' : '#ef4444',
                }}>
                  {parseFloat(cat.ppm) <= cat.target ? 'On Target' : 'Over Target'}
                </span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#e2e8f0' }}>{cat.ppm} <span style={{ fontSize: 14, color: '#64748b' }}>PPM</span></div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                Target: {cat.target} PPM | {cat.count} claims | Defect: {cat.totalDefect} / Shipped: {cat.totalShipped.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
        {/* Total */}
        <div className="kpi-panel" style={{ borderTop: '3px solid #64748b' }}>
          <div className="kpi-panel__body" style={{ padding: 16 }}>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>รวมทั้งหมด</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#e2e8f0' }}>{claims.length} <span style={{ fontSize: 14, color: '#64748b' }}>Claims</span></div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              🔴 {claims.filter(c => c.status === 'open').length} Open |
              🟡 {claims.filter(c => c.status === 'investigating').length} Investigating |
              ✅ {claims.filter(c => c.status === 'closed').length} Closed
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="kpi-select" value={filter.status} onChange={e => setFilter(p => ({ ...p, status: e.target.value }))}>
            <option value="all">ทุกสถานะ</option>
            {CLAIM_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="kpi-select" value={filter.category} onChange={e => setFilter(p => ({ ...p, category: e.target.value }))}>
            <option value="all">ทุกประเภท</option>
            {CLAIM_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          style={{ padding: '8px 16px', background: showForm ? '#47556930' : '#3b82f630',
            border: `1px solid ${showForm ? '#475569' : '#3b82f6'}`, borderRadius: 8,
            color: showForm ? '#94a3b8' : '#3b82f6', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          {showForm ? '✕ ปิดฟอร์ม' : '➕ บันทึก Claim ใหม่'}
        </button>
      </div>

      {/* Claim Form */}
      {showForm && (
        <div className="kpi-panel" style={{ marginBottom: 16, border: '1px solid #3b82f640' }}>
          <div className="kpi-panel__header">
            <h3 className="kpi-panel__title">{editingId ? '✏️ แก้ไข Claim' : '📮 บันทึก Customer Claim ใหม่'}</h3>
          </div>
          <div className="kpi-panel__body">
            {/* Row 1 */}
            <div className="kpi-form-grid kpi-form-grid--4">
              <div className="kpi-form-group">
                <label className="kpi-form-label">วันที่ Claim *</label>
                <input className="kpi-form-input" type="date" value={formData.claim_date}
                  onChange={e => handleChange('claim_date', e.target.value)} />
              </div>
              <div className="kpi-form-group">
                <label className="kpi-form-label">ลูกค้า / Customer *</label>
                <input className="kpi-form-input" type="text" placeholder="ชื่อลูกค้า"
                  value={formData.customer_name} onChange={e => handleChange('customer_name', e.target.value)} />
              </div>
              <div className="kpi-form-group">
                <label className="kpi-form-label">Part No. *</label>
                <input className="kpi-form-input" type="text" placeholder="e.g. W10-30-A"
                  value={formData.part_number} onChange={e => handleChange('part_number', e.target.value)} />
              </div>
              <div className="kpi-form-group">
                <label className="kpi-form-label">ประเภท Claim</label>
                <select className="kpi-form-input" value={formData.claim_category}
                  onChange={e => handleChange('claim_category', e.target.value)}>
                  {CLAIM_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Row 2: Quantity + PPM */}
            <div className="kpi-form-grid kpi-form-grid--4">
              <div className="kpi-form-group">
                <label className="kpi-form-label" style={{ color: '#ef4444' }}>จำนวน Defect (ชิ้น) *</label>
                <input className="kpi-form-input" type="number" min="0" placeholder="0"
                  value={formData.defect_qty} onChange={e => handleChange('defect_qty', e.target.value)}
                  style={{ borderColor: '#ef4444' }} />
              </div>
              <div className="kpi-form-group">
                <label className="kpi-form-label">จำนวน Shipped (ชิ้น) *</label>
                <input className="kpi-form-input" type="number" min="1" placeholder="0"
                  value={formData.shipped_qty} onChange={e => handleChange('shipped_qty', e.target.value)} />
              </div>
              <div className="kpi-form-group">
                <label className="kpi-form-label" style={{ fontWeight: 700 }}>PPM (คำนวณอัตโนมัติ)</label>
                <input className="kpi-form-input" type="text" readOnly value={`${ppm} PPM`}
                  style={{ background: '#0f172a', fontSize: 18, fontWeight: 700, textAlign: 'center',
                    color: parseFloat(ppm) > 50 ? '#ef4444' : '#10b981' }} />
              </div>
              <div className="kpi-form-group">
                <label className="kpi-form-label">สถานะ</label>
                <select className="kpi-form-input" value={formData.status}
                  onChange={e => handleChange('status', e.target.value)}>
                  {CLAIM_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {/* Row 3: Defect Detail */}
            <div className="kpi-form-grid kpi-form-grid--2">
              <div className="kpi-form-group">
                <label className="kpi-form-label">Defect Code / ปัญหา</label>
                <select className="kpi-form-input" value={formData.defect_code}
                  onChange={e => handleChange('defect_code', e.target.value)}>
                  <option value="">เลือก Defect Code</option>
                  {DEFECT_CODES.map(dc => <option key={dc.code} value={dc.code}>{dc.code} — {dc.name}</option>)}
                </select>
              </div>
              <div className="kpi-form-group">
                <label className="kpi-form-label">รายละเอียดปัญหา</label>
                <input className="kpi-form-input" type="text" placeholder="อธิบายปัญหาเพิ่มเติม"
                  value={formData.defect_description} onChange={e => handleChange('defect_description', e.target.value)} />
              </div>
            </div>

            {/* Row 4: Root Cause + Action */}
            <div className="kpi-form-grid kpi-form-grid--2">
              <div className="kpi-form-group">
                <label className="kpi-form-label">Root Cause (สาเหตุ)</label>
                <textarea className="kpi-form-input" rows={2} placeholder="วิเคราะห์สาเหตุ..."
                  value={formData.root_cause} onChange={e => handleChange('root_cause', e.target.value)} />
              </div>
              <div className="kpi-form-group">
                <label className="kpi-form-label">Corrective Action (การแก้ไข)</label>
                <textarea className="kpi-form-input" rows={2} placeholder="มาตรการแก้ไข/ป้องกัน..."
                  value={formData.corrective_action} onChange={e => handleChange('corrective_action', e.target.value)} />
              </div>
            </div>

            {/* Remark + Submit */}
            <div className="kpi-form-group" style={{ marginTop: 8 }}>
              <label className="kpi-form-label">หมายเหตุ</label>
              <input className="kpi-form-input" type="text" value={formData.remark}
                onChange={e => handleChange('remark', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button onClick={handleSubmit} disabled={submitting}
                style={{ flex: 1, padding: '12px 24px', fontSize: 15, fontWeight: 700,
                  background: submitting ? '#475569' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none', borderRadius: 8, color: '#fff', cursor: submitting ? 'wait' : 'pointer' }}>
                {submitting ? '⏳...' : editingId ? '✅ อัปเดต Claim' : '📮 บันทึก Claim'}
              </button>
              <button onClick={resetForm}
                style={{ padding: '12px 24px', background: 'transparent', border: '1px solid #475569',
                  borderRadius: 8, color: '#94a3b8', cursor: 'pointer' }}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* Claim List */}
      <div className="kpi-panel">
        <div className="kpi-panel__header">
          <h3 className="kpi-panel__title">📋 Claim Log ({filteredClaims.length} รายการ)</h3>
        </div>
        <div className="kpi-panel__body" style={{ overflowX: 'auto' }}>
          {filteredClaims.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#475569', padding: 32 }}>
              {loading ? '⏳ กำลังโหลด...' : 'ไม่มีข้อมูล Claim — กด "➕ บันทึก Claim ใหม่"'}
            </div>
          ) : (
            <table className="kpi-table" style={{ width: '100%', fontSize: 12 }}>
              <thead>
                <tr>
                  <th>วันที่</th><th>ลูกค้า</th><th>Part No.</th><th>ประเภท</th>
                  <th>Defect</th><th>Shipped</th><th>PPM</th><th>ปัญหา</th>
                  <th>สถานะ</th><th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map(claim => {
                  const claimPpm = Number(claim.shipped_qty) > 0
                    ? ((Number(claim.defect_qty) / Number(claim.shipped_qty)) * 1000000).toFixed(1) : '0';
                  const statusObj = CLAIM_STATUSES.find(s => s.value === claim.status) || CLAIM_STATUSES[0];
                  const catObj = CLAIM_CATEGORIES.find(c => c.value === claim.claim_category);
                  return (
                    <tr key={claim.id}>
                      <td>{claim.claim_date?.split('T')[0] || '—'}</td>
                      <td><strong>{claim.customer_name}</strong></td>
                      <td>{claim.part_number}</td>
                      <td>
                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10,
                          background: (catObj?.color || '#64748b') + '30', color: catObj?.color || '#64748b' }}>
                          {catObj?.label || claim.claim_category}
                        </span>
                      </td>
                      <td style={{ color: '#ef4444', fontWeight: 600 }}>{claim.defect_qty}</td>
                      <td>{Number(claim.shipped_qty).toLocaleString()}</td>
                      <td style={{ fontWeight: 700, color: parseFloat(claimPpm) > 50 ? '#ef4444' : '#10b981' }}>
                        {claimPpm}
                      </td>
                      <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {claim.defect_description || claim.defect_code || '—'}
                      </td>
                      <td>
                        <select value={claim.status} onChange={e => handleStatusChange(claim.id, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: statusObj.color + '20', color: statusObj.color,
                            border: `1px solid ${statusObj.color}40`, cursor: 'pointer' }}>
                          {CLAIM_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </td>
                      <td>
                        <button onClick={() => handleEdit(claim)}
                          style={{ padding: '4px 10px', background: '#3b82f620', border: '1px solid #3b82f640',
                            borderRadius: 4, color: '#3b82f6', cursor: 'pointer', fontSize: 11 }}>✏️ แก้ไข</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default KPIClaimEntry;