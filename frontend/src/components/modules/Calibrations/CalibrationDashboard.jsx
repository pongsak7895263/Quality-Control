import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// ==================== CONFIGURATION ====================
const API_BASE_URL = 'http://192.168.0.26:5000/api';

// Mock Data
const mockData = [
    { id: 1, name: 'Digital Vernier Caliper', serial_number: 'VC-001', department: 'QC', location: 'Lab 1', status: 'ACTIVE', next_cal_date: '2024-01-25', last_cal_date: '2023-06-25', manufacturer: 'Mitutoyo', model: 'CD-6"CSX' },
    { id: 2, name: 'Micrometer 0-25mm', serial_number: 'MM-002', department: 'Production', location: 'Line A', status: 'ACTIVE', next_cal_date: '2023-11-20', last_cal_date: '2023-05-20', manufacturer: 'Mitutoyo', model: 'MDC-25MX' },
    { id: 3, name: 'Height Gauge', serial_number: 'HG-003', department: 'QC', location: 'Lab 1', status: 'NG', next_cal_date: '2023-12-01', last_cal_date: '2023-06-01', manufacturer: 'Mitutoyo', model: 'HDS-H30C' },
    { id: 4, name: 'Torque Wrench', serial_number: 'TW-055', department: 'Maintenance', location: 'Workshop', status: 'ACTIVE', next_cal_date: '2024-01-15', last_cal_date: '2023-07-15', manufacturer: 'Tohnichi', model: 'QL50N4' },
    { id: 5, name: 'Digital Thermometer', serial_number: 'DT-010', department: 'QC', location: 'Lab 2', status: 'ACTIVE', next_cal_date: '2023-10-15', last_cal_date: '2023-04-15', manufacturer: 'Fluke', model: '52 II' },
    { id: 6, name: 'Pressure Gauge', serial_number: 'PG-022', department: 'Production', location: 'Line B', status: 'INACTIVE', next_cal_date: '2024-02-20', last_cal_date: '2023-08-20', manufacturer: 'Ashcroft', model: '1009' },
    { id: 7, name: 'Dial Indicator', serial_number: 'DI-015', department: 'QC', location: 'Lab 1', status: 'ACTIVE', next_cal_date: '2023-12-10', last_cal_date: '2023-06-10', manufacturer: 'Mitutoyo', model: '2046S' },
    { id: 8, name: 'Force Gauge', serial_number: 'FG-008', department: 'R&D', location: 'Test Lab', status: 'ACTIVE', next_cal_date: '2023-11-30', last_cal_date: '2023-05-30', manufacturer: 'Imada', model: 'DS2-50N' },
];

// ==================== HELPERS ====================
const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getDaysUntilDue = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
};

const getCalibrationStatus = (dateStr, dbStatus) => {
    if (dbStatus === 'NG') return 'NG';
    if (dbStatus === 'INACTIVE') return 'INACTIVE';
    const daysUntil = getDaysUntilDue(dateStr);
    if (daysUntil < 0) return 'OVERDUE';
    if (daysUntil <= 7) return 'CRITICAL';
    if (daysUntil <= 30) return 'DUE_SOON';
    return 'NORMAL';
};

// ==================== MAIN COMPONENT ====================
const CalibrationDashboard = () => {
    const navigate = useNavigate();
    
    // State
    const [instruments, setInstruments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterDepartment, setFilterDepartment] = useState('ALL');
    const [sortConfig, setSortConfig] = useState({ key: 'next_cal_date', direction: 'asc' });
    const [selectedItems, setSelectedItems] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch Data
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            console.log(`Connecting to: ${API_BASE_URL}/calibration/all`);
            const response = await axios.get(`${API_BASE_URL}/calibration/all`, { timeout: 5000 });
            setInstruments(response.data);
        } catch (apiError) {
            console.warn("Using Mock Data (API Error):", apiError.message);
            await new Promise(resolve => setTimeout(resolve, 500));
            setInstruments(mockData);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    // Data Processing
    const departments = useMemo(() => [...new Set(instruments.map(i => i.department))].sort(), [instruments]);

    const stats = useMemo(() => {
        const result = { total: instruments.length, active: 0, dueSoon: 0, critical: 0, overdue: 0, ng: 0, inactive: 0 };
        instruments.forEach(item => {
            const status = getCalibrationStatus(item.next_cal_date, item.status);
            switch (status) {
                case 'NORMAL': result.active++; break;
                case 'DUE_SOON': result.dueSoon++; break;
                case 'CRITICAL': result.critical++; break;
                case 'OVERDUE': result.overdue++; break;
                case 'NG': result.ng++; break;
                case 'INACTIVE': result.inactive++; break;
                default: break;
            }
        });
        return result;
    }, [instruments]);

    const processedData = useMemo(() => {
        let result = [...instruments];
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(item =>
                item.name.toLowerCase().includes(term) ||
                item.serial_number.toLowerCase().includes(term) ||
                item.location?.toLowerCase().includes(term) ||
                item.manufacturer?.toLowerCase().includes(term)
            );
        }
        if (filterStatus !== 'ALL') {
            result = result.filter(item => {
                const status = getCalibrationStatus(item.next_cal_date, item.status);
                if (filterStatus === 'NEEDS_ATTENTION') return ['DUE_SOON', 'CRITICAL', 'OVERDUE'].includes(status);
                return status === filterStatus;
            });
        }
        if (filterDepartment !== 'ALL') {
            result = result.filter(item => item.department === filterDepartment);
        }
        result.sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];
            if (sortConfig.key === 'next_cal_date') { aVal = new Date(aVal); bVal = new Date(bVal); }
            if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return result;
    }, [instruments, searchTerm, filterStatus, filterDepartment, sortConfig]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return processedData.slice(startIndex, startIndex + itemsPerPage);
    }, [processedData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(processedData.length / itemsPerPage);

    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedItems(paginatedData.map(item => item.id));
        else setSelectedItems([]);
    };

    const handleSelectItem = (id) => {
        setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    if (loading && instruments.length === 0) return <div style={styles.loadingContainer}>Loading...</div>;

    return (
        <div style={styles.container}>
            {/* --- Top Bar --- */}
            <div style={styles.topBar}>
                <div style={styles.topBarLeft}>
                    <h1 style={styles.pageTitle}>
                        <span style={styles.titleIcon}>📊</span> Calibration
                    </h1>
                    <div style={styles.divider}></div>
                    
                    {/* Compact Stats Bar */}
                    <div style={styles.statsBar}>
                        <CompactStat label="Total" value={stats.total} style={styles.statDefault} />
                        <CompactStat label="Active" value={stats.active} style={styles.statSuccess} />
                        <CompactStat label="Due Soon" value={stats.dueSoon} style={styles.statWarning} onClick={() => setFilterStatus('DUE_SOON')} active={filterStatus === 'DUE_SOON'} />
                        <CompactStat label="Critical" value={stats.critical} style={styles.statCritical} onClick={() => setFilterStatus('CRITICAL')} active={filterStatus === 'CRITICAL'} />
                        <CompactStat label="Overdue" value={stats.overdue} style={styles.statDanger} onClick={() => setFilterStatus('OVERDUE')} active={filterStatus === 'OVERDUE'} />
                        <CompactStat label="NG" value={stats.ng} style={styles.statNeutral} onClick={() => setFilterStatus('NG')} active={filterStatus === 'NG'} />
                    </div>
                </div>

                <div style={styles.topBarRight}>
                    <button onClick={handleRefresh} disabled={refreshing} style={styles.btnIcon}>
                        <RefreshIcon style={{...styles.icon, ...(refreshing ? styles.spin : {})}} />
                    </button>
                    <button onClick={() => navigate('/calibrations/register')} style={styles.btnPrimarySm}>
                        + New
                    </button>
                </div>
            </div>

            {/* --- Toolbar --- */}
            <div style={styles.toolbar}>
                <div style={styles.searchWrapper}>
                    <div style={styles.searchIconPos}><SearchIcon style={styles.iconSm} /></div>
                    <input
                        type="text"
                        placeholder="Search..."
                        style={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && <button onClick={() => setSearchTerm('')} style={styles.clearBtn}><XIcon style={styles.iconSm} /></button>}
                </div>

                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.selectInput}>
                    <option value="ALL">All Status</option>
                    <option value="NORMAL">✓ Normal</option>
                    <option value="DUE_SOON">⏰ Due Soon</option>
                    <option value="CRITICAL">⚠️ Critical</option>
                    <option value="OVERDUE">🚨 Overdue</option>
                    <option value="NG">✗ NG</option>
                    <option value="INACTIVE">⏸ Inactive</option>
                </select>

                <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} style={styles.selectInput}>
                    <option value="ALL">All Depts</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                
                <div style={styles.itemCount}>
                    {paginatedData.length} items
                </div>
            </div>

            {/* --- Data Table --- */}
            <div style={styles.tableContainer}>
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead style={styles.thead}>
                            <tr>
                                <th style={{...styles.th, width: '40px', textAlign: 'center'}}>
                                    <input type="checkbox" checked={paginatedData.length > 0 && selectedItems.length === paginatedData.length} onChange={handleSelectAll} />
                                </th>
                                <th style={{...styles.th, width: '100px'}}>Status</th>
                                <SortableHeader label="Instrument" sortKey="name" currentSort={sortConfig} onSort={handleSort} />
                                <SortableHeader label="S/N" sortKey="serial_number" currentSort={sortConfig} onSort={handleSort} />
                                <SortableHeader label="Location" sortKey="location" currentSort={sortConfig} onSort={handleSort} />
                                <SortableHeader label="Dept" sortKey="department" currentSort={sortConfig} onSort={handleSort} />
                                <SortableHeader label="Next Due" sortKey="next_cal_date" currentSort={sortConfig} onSort={handleSort} />
                                <th style={{...styles.th, width: '100px', textAlign: 'center'}}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.length === 0 ? (
                                <tr><td colSpan="8" style={styles.emptyRow}>No data found.</td></tr>
                            ) : (
                                paginatedData.map((item) => {
                                    const status = getCalibrationStatus(item.next_cal_date, item.status);
                                    const isSelected = selectedItems.includes(item.id);
                                    return (
                                        <tr key={item.id} style={isSelected ? {...styles.tr, ...styles.trSelected} : styles.tr}>
                                            <td style={{...styles.td, textAlign: 'center'}}>
                                                <input type="checkbox" checked={isSelected} onChange={() => handleSelectItem(item.id)} />
                                            </td>
                                            <td style={styles.td}><StatusBadgeCompact status={status} /></td>
                                            <td style={styles.td}>
                                                <div style={styles.textPrimary} title={item.name}>{item.name}</div>
                                                <div style={styles.textSecondary}>{item.manufacturer} {item.model}</div>
                                            </td>
                                            <td style={{...styles.td, ...styles.fontMono}}>{item.serial_number}</td>
                                            <td style={styles.td} title={item.location}>{item.location}</td>
                                            <td style={styles.td}>{item.department}</td>
                                            <td style={styles.td}><DueDateCompact date={item.next_cal_date} status={status} /></td>
                                            <td style={{...styles.td, textAlign: 'center'}}>
                                                <div style={{display: 'flex', justifyContent: 'center', gap: '4px'}}>
                                                    {/* ปุ่ม Edit */}
                                                    <button 
                                                        onClick={() => navigate(`/calibrations/edit/${item.id}`)} 
                                                        style={styles.btnEdit}
                                                        title="Edit details"
                                                    >
                                                        <EditIcon style={styles.iconXs} />
                                                    </button>
                                                    {/* ปุ่ม Calibrate */}
                                                    <button 
                                                        onClick={() => navigate(`/calibrations/calibrate/${item.id}`)} 
                                                        style={styles.btnAction}
                                                        title="Record calibration"
                                                    >
                                                        Calibrate
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={styles.pagination}>
                        <span style={styles.pageInfo}>Page {currentPage} of {totalPages}</span>
                        <div style={styles.pageBtns}>
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={styles.btnPage}>Prev</button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={styles.btnPage}>Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ==================== SUB COMPONENTS & STYLES ====================

const CompactStat = ({ label, value, style, onClick, active }) => (
    <div 
        onClick={onClick}
        style={{
            ...styles.statBox, 
            ...style, 
            ...(onClick ? {cursor: 'pointer'} : {}),
            ...(active ? {boxShadow: '0 0 0 1px #94a3b8'} : {})
        }}
    >
        <span style={{color: 'inherit', opacity: 0.8}}>{label}</span>
        <span style={{fontWeight: 'bold'}}>{value}</span>
    </div>
);

const StatusBadgeCompact = ({ status }) => {
    const badges = {
        NORMAL: { bg: '#d1fae5', color: '#047857', label: 'Normal' },
        DUE_SOON: { bg: '#fef3c7', color: '#b45309', label: 'Due Soon' },
        CRITICAL: { bg: '#ffedd5', color: '#c2410c', label: 'Critical' },
        OVERDUE: { bg: '#ffe4e6', color: '#be123c', label: 'Overdue' },
        NG: { bg: '#334155', color: '#fff', label: 'NG' },
        INACTIVE: { bg: '#f1f5f9', color: '#64748b', label: 'Inactive' }
    };
    const { bg, color, label } = badges[status] || badges.NORMAL;
    return (
        <span style={{backgroundColor: bg, color: color, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}}>
            {label}
        </span>
    );
};

const DueDateCompact = ({ date, status }) => {
    const isUrgent = ['OVERDUE', 'CRITICAL'].includes(status);
    return <span style={{fontSize: '12px', fontWeight: isUrgent ? 'bold' : 'normal', color: isUrgent ? '#e11d48' : '#475569'}}>{formatDate(date)}</span>;
};

const SortableHeader = ({ label, sortKey, currentSort, onSort }) => (
    <th style={styles.th} onClick={() => onSort(sortKey)}>
        <div style={{display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer'}}>
            {label}
            <span style={{fontSize: '9px', color: currentSort.key === sortKey ? '#2563eb' : '#cbd5e1'}}>
                {currentSort.key === sortKey ? (currentSort.direction === 'asc' ? '▲' : '▼') : '▼'}
            </span>
        </div>
    </th>
);

// --- ICONS (SVG) ---
const SearchIcon = ({ style }) => <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const RefreshIcon = ({ style }) => <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
const XIcon = ({ style }) => <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const EditIcon = ({ style }) => <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;

// --- STYLES OBJECT (CSS-IN-JS) ---
const styles = {
    container: { fontFamily: "'Inter', sans-serif", backgroundColor: '#f8fafc', minHeight: '100vh', padding: '16px', color: '#1e293b' },
    loadingContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px' },
    
    // Top Bar
    topBar: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
    topBarLeft: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
    topBarRight: { display: 'flex', gap: '8px' },
    pageTitle: { fontSize: '18px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 },
    titleIcon: { color: '#2563eb' },
    divider: { height: '24px', width: '1px', backgroundColor: '#e2e8f0' },
    
    // Stats
    statsBar: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' },
    statBox: { display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', border: '1px solid', fontSize: '12px', whiteSpace: 'nowrap' },
    statDefault: { backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' },
    statSuccess: { backgroundColor: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' },
    statWarning: { backgroundColor: '#fffbeb', color: '#d97706', borderColor: '#fde68a' },
    statCritical: { backgroundColor: '#fff7ed', color: '#ea580c', borderColor: '#fed7aa' },
    statDanger: { backgroundColor: '#fff1f2', color: '#e11d48', borderColor: '#fecdd3' },
    statNeutral: { backgroundColor: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0' },

    // Buttons
    btnIcon: { padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    btnPrimarySm: { padding: '6px 12px', borderRadius: '6px', backgroundColor: '#2563eb', color: '#fff', border: 'none', fontSize: '13px', fontWeight: '500', cursor: 'pointer' },
    btnAction: { padding: '4px 8px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid transparent', fontSize: '11px', fontWeight: '500', cursor: 'pointer' },
    btnEdit: { padding: '4px', borderRadius: '4px', backgroundColor: '#fff', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    btnPage: { padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '11px', cursor: 'pointer' },

    // Toolbar
    toolbar: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderBottom: 'none', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', padding: '8px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' },
    searchWrapper: { position: 'relative', maxWidth: '240px', flex: 1 },
    searchInput: { width: '100%', padding: '6px 12px 6px 30px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' },
    searchIconPos: { position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex' },
    clearBtn: { position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' },
    selectInput: { padding: '6px 12px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: '#fff', cursor: 'pointer' },
    itemCount: { marginLeft: 'auto', fontSize: '11px', color: '#64748b' },

    // Table
    tableContainer: { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', overflow: 'hidden' },
    tableWrapper: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' },
    thead: { backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' },
    th: { padding: '10px 12px', fontWeight: '600', textTransform: 'uppercase', fontSize: '11px' },
    tr: { borderBottom: '1px solid #f1f5f9' },
    trSelected: { backgroundColor: '#eff6ff' },
    td: { padding: '8px 12px', verticalAlign: 'middle', color: '#334155' },
    emptyRow: { padding: '32px', textAlign: 'center', color: '#94a3b8' },
    
    // Typography in table
    textPrimary: { fontWeight: '500', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' },
    textSecondary: { fontSize: '10px', color: '#94a3b8', marginTop: '2px' },
    fontMono: { fontFamily: 'monospace', color: '#475569' },

    // Pagination Area
    pagination: { padding: '8px 12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc' },
    pageInfo: { fontSize: '11px', color: '#64748b' },
    pageBtns: { display: 'flex', gap: '4px' },

    // Icons
    icon: { width: '16px', height: '16px' },
    iconSm: { width: '14px', height: '14px', color: '#94a3b8' },
    iconXs: { width: '12px', height: '12px' },
    spin: { animation: 'spin 1s linear infinite' }
};

// Add keyframes for spinner (Standard JS way to inject style)
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  tbody tr:hover { background-color: #f8fafc; }
`;
document.head.appendChild(styleSheet);

export default CalibrationDashboard;