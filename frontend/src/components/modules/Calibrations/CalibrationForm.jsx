import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import axios from 'axios';

// ==================== CONFIGURATION ====================
const API_BASE_URL = 'http://192.168.0.26:5000/api';

const CalibrationForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [instrument, setInstrument] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        standard_value: '',
        measured_value: '',
        temperature: 25.0,
        humidity: 50.0,
        performed_by: '',
        remark: ''
    });

    // Calculation Result State
    const [resultPreview, setResultPreview] = useState(null);

    // 1. Fetch Instrument Data
    useEffect(() => {
        const fetchInstrument = async () => {
            try {
                setLoading(true);
                // พยายามดึงจาก API จริง
                // ในกรณีที่คุณยังไม่ได้ทำ API getById อาจจะใช้ Mock Data ชั่วคราวตรงนี้ได้
                // const res = await axios.get(`${API_BASE_URL}/instruments/${id}`);
                
                // --- MOCK DATA (ใช้ทดสอบเพื่อให้เห็นหน้าตา UI) ---
                // ลบส่วนนี้ออกเมื่อ API พร้อม
                await new Promise(r => setTimeout(r, 600)); // จำลองโหลด
                const mockInstrument = {
                    id: id,
                    name: 'Digital Vernier Caliper',
                    serial_number: 'VC-001',
                    department: 'QC',
                    location: 'Lab 1',
                    brand: 'Mitutoyo',
                    model: 'CD-6"CSX',
                    range: '0-150 mm',
                    resolution: '0.01 mm',
                    CalibrationPlan: { 
                        acceptance_criteria: 0.02,
                        frequency_months: 6
                    }
                };
                setInstrument(mockInstrument);
                // ------------------------------------------------
                
                setLoading(false);
            } catch (err) {
                console.error("Error:", err);
                setError("ไม่สามารถดึงข้อมูลเครื่องมือได้");
                setLoading(false);
            }
        };
        fetchInstrument();
    }, [id]);

    // 2. Logic คำนวณผล (Real-time)
    const calculateResult = (std, meas) => {
        if (!instrument || !instrument.CalibrationPlan) return;

        const s = parseFloat(std);
        const m = parseFloat(meas);

        if (!isNaN(s) && !isNaN(m)) {
            const err = m - s;
            const criteria = parseFloat(instrument.CalibrationPlan.acceptance_criteria) || 0.05;
            const isPass = Math.abs(err) <= criteria;

            setResultPreview({
                error: err.toFixed(4),
                status: isPass ? 'PASS' : 'FAIL',
                criteria: criteria,
                diff: Math.abs(err).toFixed(4)
            });
        } else {
            setResultPreview(null);
        }
    };

    // 3. Handle Input Change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Trigger Calc
        if (name === 'standard_value') calculateResult(value, formData.measured_value);
        if (name === 'measured_value') calculateResult(formData.standard_value, value);
    };

    // 4. Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (resultPreview?.status === 'FAIL') {
            const confirm = window.confirm("⚠️ ผลการสอบเทียบเป็น 'FAIL'\nระบบจะบันทึกสถานะเครื่องมือเป็น 'NG' และสร้างใบ QPR\n\nยืนยันหรือไม่?");
            if (!confirm) return;
        }

        setSaving(true);
        try {
            await axios.post(`${API_BASE_URL}/calibration/record`, {
                instrument_id: id,
                ...formData
            });
            alert('✅ บันทึกผลสำเร็จ!');
            navigate('/calibrations');
        } catch (err) {
            alert('❌ เกิดข้อผิดพลาด: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={styles.loadingContainer}>Loading...</div>;
    if (error) return <div style={styles.errorContainer}>{error} <button onClick={() => navigate('/calibrations')}>Back</button></div>;

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <button onClick={() => navigate('/calibrations')} style={styles.backBtn}>← Back</button>
                    <h1 style={styles.pageTitle}>New Calibration Record</h1>
                </div>
                <div style={styles.headerRight}>
                    <span style={styles.recordId}>ID: {id}</span>
                </div>
            </div>

            <div style={styles.gridContainer}>
                {/* --- Left Column: Instrument Info --- */}
                <div style={styles.infoCard}>
                    <h2 style={styles.cardTitle}>Instrument Details</h2>
                    
                    <div style={styles.infoRow}>
                        <div style={styles.infoGroup}>
                            <label style={styles.labelMuted}>Name</label>
                            <div style={styles.valueStrong}>{instrument.name}</div>
                        </div>
                        <div style={styles.infoGroup}>
                            <label style={styles.labelMuted}>Serial No.</label>
                            <div style={styles.valueMono}>{instrument.serial_number}</div>
                        </div>
                    </div>

                    <div style={styles.divider}></div>

                    <div style={styles.compactGrid}>
                        <InfoItem label="Brand" value={instrument.brand} />
                        <InfoItem label="Model" value={instrument.model} />
                        <InfoItem label="Dept" value={instrument.department} />
                        <InfoItem label="Loc" value={instrument.location} />
                        <InfoItem label="Range" value={instrument.range || '-'} />
                        <InfoItem label="Resolution" value={instrument.resolution || '-'} />
                    </div>

                    <div style={styles.criteriaBox}>
                        <div style={styles.criteriaLabel}>Acceptance Criteria</div>
                        <div style={styles.criteriaValue}>± {instrument.CalibrationPlan?.acceptance_criteria}</div>
                    </div>
                </div>

                {/* --- Right Column: Calibration Form --- */}
                <div style={styles.formCard}>
                    <h2 style={styles.cardTitle}>Measurement Data</h2>
                    
                    <form onSubmit={handleSubmit}>
                        {/* Environment */}
                        <div style={styles.sectionLabel}>Environment Conditions</div>
                        <div style={styles.row}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Temperature (°C)</label>
                                <input type="number" step="0.1" name="temperature" value={formData.temperature} onChange={handleChange} style={styles.input} />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Humidity (%RH)</label>
                                <input type="number" step="0.1" name="humidity" value={formData.humidity} onChange={handleChange} style={styles.input} />
                            </div>
                        </div>

                        {/* Measurements */}
                        <div style={styles.sectionLabel}>Readings</div>
                        <div style={styles.measurementBox}>
                            <div style={styles.row}>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Standard Value</label>
                                    <input 
                                        type="number" step="0.0001" 
                                        name="standard_value" 
                                        value={formData.standard_value} 
                                        onChange={handleChange} 
                                        style={styles.inputLarge} 
                                        placeholder="0.00"
                                        required 
                                        autoFocus
                                    />
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Measured Value</label>
                                    <input 
                                        type="number" step="0.0001" 
                                        name="measured_value" 
                                        value={formData.measured_value} 
                                        onChange={handleChange} 
                                        style={styles.inputLarge} 
                                        placeholder="0.00"
                                        required 
                                    />
                                </div>
                            </div>

                            {/* Live Result Feedback */}
                            {resultPreview ? (
                                <div style={resultPreview.status === 'PASS' ? styles.resultPass : styles.resultFail}>
                                    <div style={styles.resultHeader}>
                                        <span style={styles.resultIcon}>{resultPreview.status === 'PASS' ? '✔' : '✖'}</span>
                                        <span style={styles.resultText}>{resultPreview.status}</span>
                                    </div>
                                    <div style={styles.resultDetails}>
                                        Error: <strong>{resultPreview.error}</strong> (Max: ±{resultPreview.criteria})
                                    </div>
                                </div>
                            ) : (
                                <div style={styles.resultPlaceholder}>Enter values to see result</div>
                            )}
                        </div>

                        {/* Footer Info */}
                        <div style={styles.row}>
                            <div style={{...styles.inputGroup, flex: 2}}>
                                <label style={styles.label}>Performed By</label>
                                <input type="text" name="performed_by" value={formData.performed_by} onChange={handleChange} style={styles.input} required placeholder="Technician Name" />
                            </div>
                            <div style={{...styles.inputGroup, flex: 3}}>
                                <label style={styles.label}>Remark (Optional)</label>
                                <input type="text" name="remark" value={formData.remark} onChange={handleChange} style={styles.input} placeholder="..." />
                            </div>
                        </div>

                        <div style={styles.divider}></div>

                        <div style={styles.actions}>
                            <button type="button" onClick={() => navigate('/calibrations')} style={styles.btnCancel}>Cancel</button>
                            <button type="submit" disabled={saving} style={styles.btnSubmit}>
                                {saving ? 'Saving...' : 'Confirm & Save'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Helper Component for Info
const InfoItem = ({ label, value }) => (
    <div style={{marginBottom: '8px'}}>
        <div style={styles.labelSmall}>{label}</div>
        <div style={styles.valueSmall}>{value || '-'}</div>
    </div>
);

// --- STYLES (Modern Compact) ---
const styles = {
    container: {
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        padding: '20px',
        fontFamily: "'Inter', sans-serif",
        color: '#1e293b'
    },
    loadingContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b' },
    errorContainer: { textAlign: 'center', marginTop: '50px', color: '#ef4444' },
    
    // Header
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '15px' },
    backBtn: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: '500', padding: '0' },
    pageTitle: { fontSize: '20px', fontWeight: '700', margin: 0, color: '#0f172a' },
    recordId: { fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace', backgroundColor: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' },

    // Layout
    gridContainer: {
        display: 'grid',
        gridTemplateColumns: '300px 1fr', // Sidebar fixed width, Form flexible
        gap: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        alignItems: 'start'
    },
    // Mobile Responsive (You can add media queries in real CSS, here we assume desktop-first or flex wrap logic if needed)

    // Card Styles
    infoCard: { backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0' },
    formCard: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0' },
    
    cardTitle: { fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' },
    divider: { height: '1px', backgroundColor: '#f1f5f9', margin: '16px 0' },

    // Info Styles
    infoRow: { marginBottom: '12px' },
    infoGroup: { marginBottom: '10px' },
    compactGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
    labelMuted: { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' },
    labelSmall: { fontSize: '11px', color: '#64748b' },
    valueStrong: { fontSize: '16px', fontWeight: '600', color: '#0f172a', lineHeight: '1.2' },
    valueMono: { fontSize: '14px', fontFamily: 'monospace', color: '#475569', backgroundColor: '#f8fafc', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' },
    valueSmall: { fontSize: '13px', fontWeight: '500', color: '#334155' },
    
    criteriaBox: { marginTop: '16px', backgroundColor: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #dbeafe', textAlign: 'center' },
    criteriaLabel: { fontSize: '11px', color: '#1e40af', fontWeight: '600', marginBottom: '4px' },
    criteriaValue: { fontSize: '18px', fontWeight: '700', color: '#1e3a8a' },

    // Form Styles
    sectionLabel: { fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', marginTop: '8px' },
    row: { display: 'flex', gap: '16px', marginBottom: '16px' },
    inputGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', fontWeight: '500', color: '#475569' },
    input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', transition: 'border 0.2s', width: '100%', boxSizing: 'border-box' },
    inputLarge: { padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '18px', fontWeight: '600', outline: 'none', width: '100%', boxSizing: 'border-box', textAlign: 'right' },

    // Measurement Box
    measurementBox: { backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' },
    
    // Result Styles
    resultPlaceholder: { textAlign: 'center', padding: '12px', fontSize: '13px', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: '8px', marginTop: '10px' },
    resultPass: { backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px', marginTop: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'fadeIn 0.3s' },
    resultFail: { backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginTop: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'pulse 0.5s' },
    resultHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
    resultIcon: { fontSize: '18px', fontWeight: 'bold' },
    resultText: { fontSize: '16px', fontWeight: '800', letterSpacing: '1px' },
    resultDetails: { fontSize: '13px', opacity: 0.9 },

    // Actions
    actions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' },
    btnCancel: { padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
    btnSubmit: { padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)' },
};

// Inject simple keyframes for animation
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
`;
document.head.appendChild(styleSheet);

export default CalibrationForm;