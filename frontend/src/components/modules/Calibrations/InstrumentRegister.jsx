import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://192.168.0.26:5000/api';

const InstrumentRegister = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // รับ ID มา (ถ้ามี = แก้ไข, ถ้าไม่มี = สร้างใหม่)
    const isEditMode = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        serial_number: '',
        department: '',
        location: '',
        // --- New Fields ---
        manufacturer: '',
        model: '',
        responsible_person: '',
        calibration_location: '', // Mapped to vendor_name
        // ------------------
        frequency_months: 6,
        acceptance_criteria: 0.05
    });

    // ถ้าเป็น Edit Mode ให้ดึงข้อมูลเก่ามาใส่ Form
    useEffect(() => {
        if (isEditMode) {
            const fetchData = async () => {
                try {
                    setLoading(true);
                    const res = await axios.get(`${API_BASE_URL}/calibration/instruments/${id}`);
                    const data = res.data;
                    
                    setFormData({
                        name: data.name,
                        serial_number: data.serial_number,
                        department: data.department || '',
                        location: data.location || '',
                        manufacturer: data.manufacturer || '',
                        model: data.model || '',
                        responsible_person: data.responsible_person || '',
                        calibration_location: data.CalibrationPlan?.vendor_name || '',
                        frequency_months: data.CalibrationPlan?.frequency_months || 6,
                        acceptance_criteria: data.CalibrationPlan?.acceptance_criteria || 0.05
                    });
                } catch (err) {
                    alert("ไม่สามารถดึงข้อมูลเครื่องมือได้");
                    navigate('/calibrations');
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [id, isEditMode, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEditMode) {
                // UPDATE
                await axios.put(`${API_BASE_URL}/calibration/instruments/${id}`, formData);
                alert('✅ แก้ไขข้อมูลสำเร็จ!');
            } else {
                // CREATE
                await axios.post(`${API_BASE_URL}/calibration/register`, formData);
                alert('✅ ลงทะเบียนเครื่องมือสำเร็จ!');
            }
            navigate('/calibrations');
        } catch (err) {
            alert('❌ เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{padding: '40px', textAlign: 'center'}}>Loading...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h2 style={styles.title}>
                        {isEditMode ? '✏️ Edit Instrument' : '🆕 Register New Instrument'}
                    </h2>
                    <button onClick={() => navigate('/calibrations')} style={styles.closeBtn}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    
                    {/* --- 1. ข้อมูลพื้นฐาน --- */}
                    <div style={styles.sectionLabel}>General Information</div>
                    <div style={styles.grid}>
                        <div style={styles.group}>
                            <label style={styles.label}>Instrument Name <span style={styles.req}>*</span></label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} style={styles.input} required placeholder="e.g. Digital Vernier Caliper" autoFocus />
                        </div>
                        <div style={styles.group}>
                            <label style={styles.label}>Serial Number <span style={styles.req}>*</span></label>
                            <input type="text" name="serial_number" value={formData.serial_number} onChange={handleChange} style={styles.input} required placeholder="e.g. SN-2024-001" disabled={isEditMode} />
                        </div>
                    </div>

                    <div style={styles.grid}>
                        <div style={styles.group}>
                            <label style={styles.label}>Manufacturer (ผู้ผลิต)</label>
                            <input type="text" name="manufacturer" value={formData.manufacturer} onChange={handleChange} style={styles.input} placeholder="e.g. Mitutoyo" />
                        </div>
                        <div style={styles.group}>
                            <label style={styles.label}>Model (รุ่น)</label>
                            <input type="text" name="model" value={formData.model} onChange={handleChange} style={styles.input} placeholder="e.g. CD-6CSX" />
                        </div>
                    </div>

                    {/* --- 2. สถานที่และการดูแล --- */}
                    <div style={styles.sectionLabel}>Location & Responsibility</div>
                    <div style={styles.grid}>
                        <div style={styles.group}>
                            <label style={styles.label}>Department</label>
                            <select name="department" value={formData.department} onChange={handleChange} style={styles.select} required>
                                <option value="">Select Department</option>
                                <option value="QC">QC</option>
                                <option value="QA">QA</option>
                                <option value="Production">Production</option>
                                <option value="M/D">M/D</option>
                                <option value="MC">MC</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="R&D">R&D</option>
                            </select>
                        </div>
                        <div style={styles.group}>
                            <label style={styles.label}>Location (GROUP)</label>
                            <select name="location" value={formData.location} onChange={handleChange} style={styles.select} required>
                                <option value="">Select location</option>
                                <option value="GROUP O">GROUP O</option>
                                <option value="GROUP FH">GROUP FH</option>
                                <option value="GROUP FC">GROUP FC</option>
                                <option value="GROUP M">GROUP M</option>
                                <option value="GROUP MC">GROUP MC</option>
                                
                            </select>
                            
                        </div>
                    </div>
                    
                    <div style={styles.grid}>
                        <div style={styles.group}>
                            <label style={styles.label}>Responsible Person (ผู้ถือครอง)</label>
                            <input type="text" name="responsible_person" value={formData.responsible_person} onChange={handleChange} style={styles.input} placeholder="ชื่อผู้รับผิดชอบ" />
                        </div>
                    </div>

                    {/* --- 3. แผนการสอบเทียบ --- */}
                    <div style={styles.sectionLabel}>Calibration Plan</div>
                    <div style={styles.planBox}>
                        <div style={styles.grid}>
                            <div style={styles.group}>
                                <label style={styles.label}>Calibration Place (สถานที่สอบเทียบ)</label>
                                <input type="text" name="calibration_location" value={formData.calibration_location} onChange={handleChange} style={styles.input} placeholder="e.g. Internal Lab / Vendor Name" />
                            </div>
                            <div style={styles.group}></div> {/* Spacer */}
                        </div>
                        <div style={styles.grid}>
                            <div style={styles.group}>
                                <label style={styles.label}>Frequency (Months)</label>
                                <input type="number" name="frequency_months" value={formData.frequency_months} onChange={handleChange} style={styles.input} min="1" required />
                            </div>
                            <div style={styles.group}>
                                <label style={styles.label}>Acceptance Criteria (±)</label>
                                <input type="number" step="0.0001" name="acceptance_criteria" value={formData.acceptance_criteria} onChange={handleChange} style={styles.input} required />
                            </div>
                        </div>
                    </div>

                    <div style={styles.actions}>
                        <button type="button" onClick={() => navigate('/calibrations')} style={styles.btnCancel}>Cancel</button>
                        <button type="submit" disabled={saving} style={styles.btnSubmit}>
                            {saving ? 'Saving...' : (isEditMode ? 'Update Changes' : 'Register Instrument')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Styles (Compact & Clean)
const styles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: 'calc(100vh - 64px)', backgroundColor: '#f8fafc', padding: '40px 20px' },
    card: { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '700px', padding: '30px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' },
    title: { fontSize: '20px', fontWeight: '700', color: '#1e293b', margin: 0 },
    closeBtn: { background: 'none', border: 'none', fontSize: '18px', color: '#94a3b8', cursor: 'pointer' },
    
    sectionLabel: { fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', marginTop: '20px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '5px' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' },
    group: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', fontWeight: '500', color: '#475569' },
    req: { color: '#ef4444' },
    
    input: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' },
    select: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', backgroundColor: '#fff', width: '100%', boxSizing: 'border-box' },
    
    planBox: { backgroundColor: '#f0f9ff', padding: '20px', borderRadius: '10px', border: '1px solid #e0f2fe', marginBottom: '24px' },
    
    actions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' },
    btnCancel: { padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
    btnSubmit: { padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)' }
};

export default InstrumentRegister;