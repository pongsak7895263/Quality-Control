/**
 * MaterialInspectionReport.js
 * 📊 รายงานการตรวจสอบวัตถุดิบ - Material Inspection Report
 * ✅ Redesigned to match HardnessReport.js style (Recharts + Inline Styles)
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { API_BASE_URL } from '../../config';
import useAuth from "../../hooks/useAuth";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import {
  FileText, Filter, Calendar, Truck, Hash, CheckCircle2, XCircle, Clock,
  BarChart3, TrendingUp, Download, Printer, ArrowLeft, PieChart as PieChartIcon,
  Activity, Loader2, Package, RefreshCw, AlertTriangle
} from 'lucide-react';

// ==========================================
// Color Palette (เหมือน HardnessReport)
// ==========================================
const COLORS = {
  pass: '#10b981',
  fail: '#ef4444',
  pending: '#f59e0b',
  blue: '#2563eb',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  pink: '#ec4899',
  orange: '#f97316',
  teal: '#14b8a6',
  indigo: '#6366f1',
};

const SUPPLIER_COLORS = [
  '#2563eb', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316',
  '#14b8a6', '#6366f1', '#84cc16', '#f43f5e', '#0ea5e9'
];

// ==========================================
// Toast
// ==========================================
const Toast = Swal.mixin({
  toast: true, position: "top-end", showConfirmButton: false,
  timer: 3000, timerProgressBar: true,
});

// ==========================================
// Helper Functions
// ==========================================
const formatMonthYear = (date) => date.toLocaleDateString("th-TH", { year: "numeric", month: "long" });
const getYearMonth = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({ value: getYearMonth(date), label: formatMonthYear(date) });
  }
  return options;
};

const COUNT_OPTIONS = [10, 25, 50, 100, 500];

// ==========================================
// Sub Components (เหมือน HardnessReport)
// ==========================================
const SummaryCard = ({ icon, label, value, unit, color, bgColor }) => (
  <div style={{
    background: 'white', borderRadius: 12, padding: '16px 20px',
    border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 14,
    transition: 'transform 0.2s, box-shadow 0.2s'
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: 10, background: bgColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0
    }}>
      {icon}
    </div>
    <div>
      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>
        {value}
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginLeft: 6 }}>{unit}</span>
      </p>
    </div>
  </div>
);

const MiniStat = ({ label, value, color }) => (
  <div style={{ textAlign: 'center' }}>
    <span style={{ fontSize: '1.2rem', fontWeight: 800, color }}>{value}</span>
    <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{label}</p>
  </div>
);

const EmptyState = ({ message, small }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: small ? 150 : 200, color: '#94a3b8'
  }}>
    <BarChart3 size={small ? 32 : 48} style={{ opacity: 0.3, marginBottom: 8 }} />
    <p style={{ fontSize: small ? '0.8rem' : '0.9rem' }}>{message}</p>
  </div>
);

// Custom Tooltip
const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <p style={{ fontWeight: 700, marginBottom: 6, color: '#1e293b' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: '0.85rem', margin: '2px 0' }}>
          {p.name}: <strong>{p.value}</strong> ครั้ง
        </p>
      ))}
    </div>
  );
};

// ==========================================
// 🎯 MAIN COMPONENT
// ==========================================
const MaterialInspectionReport = () => {
  const { user, loading: authLoading } = useAuth();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const [filters, setFilters] = useState({
    month: getYearMonth(new Date()),
    supplier: 'ALL',
    status: 'ALL',
    limit: 50
  });

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  // --- API Call ---
  const apiCall = useCallback(async (endpoint, options = {}) => {
    const token = localStorage.getItem("authToken");
    const headers = token ? { ...options.headers, Authorization: `Bearer ${token}` } : { ...options.headers };
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
      if (!res.ok) throw new Error("API Error");
      return { success: true, data: await res.json() };
    } catch (e) { return { success: false, error: e }; }
  }, []);

  // --- Fetch Data ---
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("month", filters.month);
      params.append("limit", "500"); // ดึงมาเยอะๆ แล้วกรองหน้าบ้าน
      if (filters.supplier && filters.supplier !== 'ALL') params.append("supplier", filters.supplier);
      if (filters.status && filters.status !== 'ALL') params.append("status", filters.status);

      const res = await apiCall(`/api/material?${params.toString()}`);
      if (res.success) {
        setReportData(res.data.data || []);
        setHasGenerated(true);
      } else {
        Toast.fire({ icon: "error", title: "ไม่สามารถดึงข้อมูลได้" });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiCall, filters.month, filters.supplier, filters.status]);

  // --- Auto fetch on mount ---
  useEffect(() => {
    fetchReportData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ==========================================
  // 📊 DATA PROCESSING
  // ==========================================
  const { filteredData, summary, supplierBarData, pieData, supplierTrendData, supplierPartData, uniqueSuppliers } = useMemo(() => {
    if (!reportData || reportData.length === 0) {
      return {
        filteredData: [], summary: { total: 0, pass: 0, fail: 0, pending: 0, passRate: '0.0', failRate: '0.0', uniqueParts: 0, uniqueSuppliers: 0 },
        supplierBarData: [], pieData: [], supplierTrendData: {}, supplierPartData: {}, uniqueSuppliers: []
      };
    }

    // --- Apply filters ---
    let data = [...reportData];

    if (filters.supplier && filters.supplier !== 'ALL') {
      data = data.filter(item => {
        const sName = item.supplier_name || item.supplierName || '';
        return sName === filters.supplier;
      });
    }

    if (filters.status && filters.status !== 'ALL') {
      data = data.filter(item => {
        const res = (item.overall_result || item.overallResult || '').toLowerCase();
        return res === filters.status.toLowerCase();
      });
    }

    // Limit
    data = data.slice(0, filters.limit);

    // --- Summary ---
    const total = data.length;
    const pass = data.filter(d => (d.overall_result || d.overallResult) === 'pass').length;
    const fail = data.filter(d => (d.overall_result || d.overallResult) === 'fail').length;
    const pending = total - pass - fail;
    const passRate = total > 0 ? ((pass / total) * 100).toFixed(1) : '0.0';
    const failRate = total > 0 ? ((fail / total) * 100).toFixed(1) : '0.0';
    const uniqueParts = new Set(data.map(d => d.material_grade || d.materialGrade)).size;
    const uSuppliers = [...new Set(data.filter(d => (d.supplier_name || d.supplierName)).map(d => d.supplier_name || d.supplierName))];

    const summaryObj = { total, pass, fail, pending, passRate, failRate, uniqueParts, uniqueSuppliers: uSuppliers.length };

    // --- All unique suppliers (for filter dropdown) ---
    const allSuppliers = [...new Set(reportData.map(d => d.supplier_name || d.supplierName).filter(Boolean))].sort();

    // --- Supplier Bar Chart ---
    const supMap = {};
    data.forEach(d => {
      const sup = d.supplier_name || d.supplierName || 'ไม่ระบุ';
      if (!supMap[sup]) supMap[sup] = { name: sup, PASS: 0, FAIL: 0, PENDING: 0, total: 0 };
      const res = (d.overall_result || d.overallResult || '').toLowerCase();
      if (res === 'pass') supMap[sup].PASS++;
      else if (res === 'fail') supMap[sup].FAIL++;
      else supMap[sup].PENDING++;
      supMap[sup].total++;
    });
    const sBarData = Object.values(supMap).sort((a, b) => b.total - a.total);

    // --- Pie Data ---
    const pData = [
      { name: 'PASS', value: pass, color: COLORS.pass },
      { name: 'FAIL', value: fail, color: COLORS.fail },
      { name: 'PENDING', value: pending, color: COLORS.pending },
    ].filter(d => d.value > 0);

    // --- Per Supplier Trend (value over time) ---
    const sTrend = {};
    data.forEach(d => {
      const sup = d.supplier_name || d.supplierName || 'ไม่ระบุ';
      if (!sTrend[sup]) sTrend[sup] = [];
      const dateRaw = d.receipt_date || d.receiptDate || d.created_at || d.createdAt;
      const partNo = d.material_grade || d.materialGrade || '-';
      const lotNo = d.cer_number || d.cerNumber || '-';
      const result = (d.overall_result || d.overallResult || '').toLowerCase();
      sTrend[sup].push({
        date: dateRaw ? new Date(dateRaw).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '-',
        partno: partNo,
        lotno: lotNo,
        value: result === 'pass' ? 1 : 0,
        result: result.toUpperCase()
      });
    });
    // Sort & index
    Object.keys(sTrend).forEach(sup => {
      sTrend[sup] = sTrend[sup].map((item, idx) => ({ ...item, index: idx + 1 }));
    });

    // --- Per Supplier Part breakdown ---
    const sPartData = {};
    data.forEach(d => {
      const sup = d.supplier_name || d.supplierName || 'ไม่ระบุ';
      if (!sPartData[sup]) sPartData[sup] = {};
      const part = d.material_grade || d.materialGrade || 'Unknown';
      if (!sPartData[sup][part]) sPartData[sup][part] = { PASS: 0, FAIL: 0 };
      const res = (d.overall_result || d.overallResult || '').toLowerCase();
      if (res === 'pass') sPartData[sup][part].PASS++;
      else if (res === 'fail') sPartData[sup][part].FAIL++;
    });
    const sPartResult = {};
    Object.keys(sPartData).forEach(sup => {
      sPartResult[sup] = Object.entries(sPartData[sup]).map(([part, counts]) => ({
        name: part, PASS: counts.PASS, FAIL: counts.FAIL, total: counts.PASS + counts.FAIL
      })).sort((a, b) => b.total - a.total);
    });

    return {
      filteredData: data,
      summary: summaryObj,
      supplierBarData: sBarData,
      pieData: pData,
      supplierTrendData: sTrend,
      supplierPartData: sPartResult,
      uniqueSuppliers: allSuppliers
    };
  }, [reportData, filters.supplier, filters.status, filters.limit]);

  // ==========================================
  // Export Functions
  // ==========================================
  const handleExportExcel = () => {
    if (filteredData.length === 0) { Toast.fire({ icon: 'warning', title: 'ไม่มีข้อมูลสำหรับ Export' }); return; }
    const exportData = filteredData.map((item, idx) => ({
      '#': idx + 1,
      'Date': item.receipt_date || item.receiptDate || '-',
      'Material Grade': item.material_grade || item.materialGrade || '-',
      'Cer. Number': item.cer_number || item.cerNumber || '-',
      'Supplier': item.supplier_name || item.supplierName || '-',
      'Result': (item.overall_result || item.overallResult || '-').toUpperCase(),
      'Inspector': item.inspector_name || item.inspectorName || '-'
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "MaterialReport");
    XLSX.writeFile(wb, `Material_Report_${filters.month}.xlsx`);
    Toast.fire({ icon: 'success', title: 'Export สำเร็จ' });
  };

  const handleExportCSV = () => {
    if (filteredData.length === 0) { Toast.fire({ icon: 'warning', title: 'ไม่มีข้อมูลสำหรับ Export' }); return; }
    const headers = ['Date', 'Material Grade', 'Cer. Number', 'Supplier', 'Result', 'Inspector'];
    const csvRows = filteredData.map(item => [
      item.receipt_date || item.receiptDate || '-',
      `"${item.material_grade || item.materialGrade || '-'}"`,
      `"${item.cer_number || item.cerNumber || '-'}"`,
      `"${item.supplier_name || item.supplierName || '-'}"`,
      (item.overall_result || item.overallResult || '-').toUpperCase(),
      `"${item.inspector_name || item.inspectorName || '-'}"`
    ]);
    const csvContent = [headers.join(','), ...csvRows.map(e => e.join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Material_Report_${filters.month}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => window.print();

  // ==========================================
  // RENDER
  // ==========================================
  if (authLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={48} style={{ color: '#2563eb', marginBottom: 16, animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#64748b' }}>กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  if (loading && !hasGenerated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={48} style={{ color: '#2563eb', marginBottom: 16, animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#64748b' }}>กำลังโหลดข้อมูลรายงาน...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: "'Sarabun', sans-serif", background: '#f8fafc', minHeight: '100vh' }}>

      {/* ===== Header ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }} className="print-hidden">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
              <BarChart3 size={28} style={{ color: '#2563eb' }} />
              Material Inspection Report
            </h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
              รายงานสรุปผลการตรวจสอบวัตถุดิบ — แยกตาม Supplier
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExportCSV} style={{
            background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: 8,
            padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontWeight: 600, fontSize: '0.85rem'
          }}>
            <Download size={16} /> CSV
          </button>
          <button onClick={handleExportExcel} style={{
            background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 8,
            padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontWeight: 600, fontSize: '0.85rem'
          }}>
            <FileText size={16} /> Excel
          </button>
          <button onClick={handlePrint} style={{
            background: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8,
            padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontWeight: 600, fontSize: '0.85rem'
          }}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* ===== Print Header ===== */}
      <div className="print-only" style={{ display: 'none', textAlign: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Material Inspection Monthly Report</h1>
        <p style={{ color: '#64748b', margin: '4px 0' }}>
          เดือน: {monthOptions.find(m => m.value === filters.month)?.label || filters.month}
          {filters.supplier !== 'ALL' && ` | Supplier: ${filters.supplier}`}
          {filters.status !== 'ALL' && ` | ผลลัพธ์: ${filters.status}`}
        </p>
      </div>

      {/* ===== Filters Bar ===== */}
      <div style={{
        background: 'white', borderRadius: 12, padding: '16px 20px', marginBottom: 20,
        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end'
      }} className="print-hidden">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2563eb', fontWeight: 700, fontSize: '0.95rem' }}>
          <Filter size={18} /> ตัวกรอง:
        </div>

        {/* Month */}
        <FilterSelect
          icon={<Calendar size={12} />}
          label="เดือน"
          value={filters.month}
          onChange={e => setFilters({ ...filters, month: e.target.value })}
          options={monthOptions.map(m => ({ value: m.value, label: m.label }))}
          minWidth={180}
        />

        {/* Supplier */}
        <FilterSelect
          icon={<Truck size={12} />}
          label="Supplier"
          value={filters.supplier}
          onChange={e => setFilters({ ...filters, supplier: e.target.value })}
          options={[
            { value: 'ALL', label: 'ทั้งหมด (All Suppliers)' },
            ...uniqueSuppliers.map(s => ({ value: s, label: s }))
          ]}
          minWidth={180}
        />

        {/* Result */}
        <FilterSelect
          icon={<CheckCircle2 size={12} />}
          label="ผลลัพธ์"
          value={filters.status}
          onChange={e => setFilters({ ...filters, status: e.target.value })}
          options={[
            { value: 'ALL', label: 'ทั้งหมด' },
            { value: 'pass', label: '✅ PASS เท่านั้น' },
            { value: 'fail', label: '❌ FAIL เท่านั้น' },
          ]}
          minWidth={140}
        />

        {/* Count */}
        <FilterSelect
          icon={<Hash size={12} />}
          label="จำนวนแสดง"
          value={filters.limit}
          onChange={e => setFilters({ ...filters, limit: Number(e.target.value) })}
          options={COUNT_OPTIONS.map(n => ({ value: n, label: `${n} รายการ` }))}
          minWidth={100}
        />

        {/* Generate Button */}
        <button onClick={fetchReportData} disabled={loading} style={{
          background: loading ? '#cbd5e1' : '#2563eb', color: 'white', border: 'none', borderRadius: 8,
          padding: '8px 20px', cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.9rem',
          boxShadow: loading ? 'none' : '0 2px 6px rgba(37,99,235,0.3)', transition: 'all 0.2s'
        }}>
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
          {loading ? 'กำลังโหลด...' : 'สร้างรายงาน'}
        </button>

        <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Activity size={14} /> แสดง {filteredData.length} จาก {reportData.length} รายการ
        </div>
      </div>

      {/* ===== Summary Cards ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <SummaryCard icon={<Package size={20} />} label="ตรวจทั้งหมด" value={summary.total} unit="ครั้ง" color="#2563eb" bgColor="#eff6ff" />
        <SummaryCard icon={<CheckCircle2 size={20} />} label="ผ่าน (PASS)" value={summary.pass} unit={`${summary.passRate}%`} color="#10b981" bgColor="#ecfdf5" />
        <SummaryCard icon={<XCircle size={20} />} label="ไม่ผ่าน (FAIL)" value={summary.fail} unit={`${summary.failRate}%`} color="#ef4444" bgColor="#fef2f2" />
        <SummaryCard icon={<Clock size={20} />} label="รอตรวจ" value={summary.pending} unit="ครั้ง" color="#f59e0b" bgColor="#fffbeb" />
        <SummaryCard icon={<FileText size={20} />} label="Material Grade" value={summary.uniqueParts} unit="รายการ" color="#8b5cf6" bgColor="#f5f3ff" />
        <SummaryCard icon={<Truck size={20} />} label="Supplier" value={summary.uniqueSuppliers} unit="ราย" color="#06b6d4" bgColor="#ecfeff" />
      </div>

      {/* ===== Row 1: Supplier Bar Chart + Pie Chart ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Bar Chart */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={20} style={{ color: '#2563eb' }} />
            ผลการตรวจสอบแยกตาม Supplier
          </h3>
          {supplierBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={supplierBarData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={12} tick={{ fill: '#64748b' }} angle={-20} textAnchor="end" height={60} />
                <YAxis fontSize={12} />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.85rem' }} />
                <Bar dataKey="PASS" fill={COLORS.pass} radius={[4, 4, 0, 0]} name="PASS" />
                <Bar dataKey="FAIL" fill={COLORS.fail} radius={[4, 4, 0, 0]} name="FAIL" />
                <Bar dataKey="PENDING" fill={COLORS.pending} radius={[4, 4, 0, 0]} name="PENDING" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState message="ไม่มีข้อมูลสำหรับแสดงกราฟ" />}
        </div>

        {/* Pie Chart */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PieChartIcon size={20} style={{ color: '#8b5cf6' }} />
            สัดส่วนผลการตรวจ
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                  label={({ name, value, percent }) => `${name} ${value} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: '#94a3b8' }}
                >
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState message="ไม่มีข้อมูล" />}
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <span style={{
              fontSize: '2rem', fontWeight: 800,
              color: parseFloat(summary.passRate) >= 95 ? COLORS.pass : parseFloat(summary.passRate) >= 80 ? COLORS.pending : COLORS.fail
            }}>
              {summary.passRate}%
            </span>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0' }}>อัตราการผ่าน (Pass Rate)</p>
          </div>
        </div>
      </div>

      {/* ===== Row 2: Per-Supplier Detail Sections ===== */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '2px solid #e2e8f0', paddingBottom: 10 }}>
          <TrendingUp size={22} style={{ color: '#2563eb' }} />
          รายละเอียดแยกตาม Supplier
        </h2>

        {Object.keys(supplierTrendData).length > 0 ? (
          Object.entries(supplierTrendData).map(([supplier, data], sIdx) => {
            const supColor = SUPPLIER_COLORS[sIdx % SUPPLIER_COLORS.length];
            const supPartData = supplierPartData[supplier] || [];
            const supPass = data.filter(d => d.result === 'PASS').length;
            const supFail = data.filter(d => d.result === 'FAIL').length;
            const supTotal = data.length;
            const supPassRate = supTotal > 0 ? ((supPass / supTotal) * 100).toFixed(1) : '0';

            return (
              <div key={supplier} style={{
                background: 'white', borderRadius: 12, padding: 20, marginBottom: 20,
                border: '1px solid #e2e8f0', borderLeft: `5px solid ${supColor}`
              }}>
                {/* Supplier Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, background: supColor + '15',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Truck size={20} style={{ color: supColor }} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{supplier}</h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                        ตรวจ {supTotal} ครั้ง | {supPartData.length} Material Grade
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <MiniStat label="PASS" value={supPass} color={COLORS.pass} />
                    <MiniStat label="FAIL" value={supFail} color={COLORS.fail} />
                    <div style={{
                      padding: '6px 16px', borderRadius: 20, fontWeight: 800, fontSize: '0.95rem',
                      background: parseFloat(supPassRate) >= 95 ? '#ecfdf5' : parseFloat(supPassRate) >= 80 ? '#fffbeb' : '#fef2f2',
                      color: parseFloat(supPassRate) >= 95 ? COLORS.pass : parseFloat(supPassRate) >= 80 ? COLORS.pending : COLORS.fail
                    }}>
                      {supPassRate}%
                    </div>
                  </div>
                </div>

                {/* Charts Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Inspection Timeline */}
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, border: '1px solid #f1f5f9' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                      📈 Inspection Result Trend
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="index" fontSize={11} tick={{ fill: '#94a3b8' }} />
                        <YAxis domain={[0, 1.2]} fontSize={11} ticks={[0, 1]} tickFormatter={v => v === 1 ? 'PASS' : v === 0 ? 'FAIL' : ''} />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(val) => [val === 1 ? 'PASS' : 'FAIL', 'Result']}
                          labelFormatter={(label, payload) => {
                            if (payload && payload[0]) {
                              const d = payload[0].payload;
                              return `${d.partno} | Lot: ${d.lotno} | ${d.date}`;
                            }
                            return label;
                          }}
                        />
                        <Line type="stepAfter" dataKey="value" stroke={supColor} strokeWidth={2.5}
                          dot={({ cx, cy, payload }) => (
                            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={5}
                              fill={payload.result === 'PASS' ? COLORS.pass : COLORS.fail}
                              stroke="white" strokeWidth={2} />
                          )}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Material Grade Bar Chart */}
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, border: '1px solid #f1f5f9' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                      📊 ผลตรวจแยกตาม Material Grade
                    </h4>
                    {supPartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={supPartData.slice(0, 8)} layout="vertical" barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" fontSize={11} />
                          <YAxis type="category" dataKey="name" fontSize={11} width={90} tick={{ fill: '#475569' }} />
                          <Tooltip content={<CustomBarTooltip />} />
                          <Bar dataKey="PASS" fill={COLORS.pass} radius={[0, 4, 4, 0]} stackId="a" name="PASS" />
                          <Bar dataKey="FAIL" fill={COLORS.fail} radius={[0, 4, 4, 0]} stackId="a" name="FAIL" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState message="ไม่มีข้อมูล Material" small />}
                  </div>
                </div>
              </div>
            );
          })
        ) : <EmptyState message="ไม่มีข้อมูลสำหรับเดือนที่เลือก" />}
      </div>

      {/* ===== Data Table ===== */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} style={{ color: '#f97316' }} />
            ตารางข้อมูลรายละเอียด ({filteredData.length} รายการ)
          </h3>
        </div>
        <div style={{ maxHeight: 500, overflowY: 'auto', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: 900 }}>
            <thead>
              <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 5 }}>
                {['#', 'Date', 'Material Grade', 'Cer. Number', 'Supplier', 'Result', 'Inspector'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '2px solid #cbd5e1', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => {
                const result = (row.overall_result || row.overallResult || '').toUpperCase();
                return (
                  <tr key={row.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', color: '#94a3b8' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                      {(row.receipt_date || row.receiptDate) ? new Date(row.receipt_date || row.receiptDate).toLocaleDateString('th-TH') : '-'}
                    </td>
                    <td style={{ padding: '8px 14px', fontWeight: 600, color: '#2563eb' }}>{row.material_grade || row.materialGrade || '-'}</td>
                    <td style={{ padding: '8px 14px' }}>{row.cer_number || row.cerNumber || '-'}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 500 }}>{row.supplier_name || row.supplierName || '-'}</td>
                    <td style={{ padding: '8px 14px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                        background: result === 'PASS' ? '#dcfce7' : result === 'FAIL' ? '#fee2e2' : '#fef9c3',
                        color: result === 'PASS' ? '#166534' : result === 'FAIL' ? '#991b1b' : '#854d0e'
                      }}>
                        {result === 'PASS' && <CheckCircle2 size={12} />}
                        {result === 'FAIL' && <XCircle size={12} />}
                        {result || 'PENDING'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 14px', color: '#64748b' }}>{row.inspector_name || row.inspectorName || '-'}</td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                  {hasGenerated ? 'ไม่พบข้อมูลตามเงื่อนไขที่เลือก' : 'กด "สร้างรายงาน" เพื่อดึงข้อมูล'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Print & Spin Styles ===== */}
      <style>{`
        @media print {
          .print-hidden { display: none !important; }
          .print-only { display: block !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// ==========================================
// Filter Select Sub-Component
// ==========================================
const FilterSelect = ({ icon, label, value, onChange, options, minWidth = 140 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
      {icon} {label}
    </label>
    <select value={value} onChange={onChange} style={{
      padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem',
      color: '#334155', background: 'white', minWidth, cursor: 'pointer'
    }}>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

export default MaterialInspectionReport;