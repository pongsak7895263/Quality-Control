import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  FileText, Filter, Calendar, Truck, Hash, CheckCircle2, XCircle, Clock,
  BarChart3, TrendingUp, Download, Printer, ArrowLeft, PieChart as PieChartIcon,
  RefreshCw, Activity, Loader2, Package
} from 'lucide-react';

const API_BASE_URL = 'http://192.168.0.26:5000/api/hardness';

const COLORS = {
  pass: '#10b981', fail: '#ef4444', pending: '#f59e0b',
  blue: '#2563eb', purple: '#8b5cf6', cyan: '#06b6d4',
  pink: '#ec4899', orange: '#f97316', teal: '#14b8a6', indigo: '#6366f1',
};

const SUPPLIER_COLORS = ['#2563eb','#8b5cf6','#06b6d4','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16','#f43f5e','#0ea5e9'];
const COUNT_OPTIONS = [10, 25, 50, 100, 500];

const generateMonthOptions = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
    months.push({ value, label });
  }
  return months;
};

// ==========================================
// Sub Components
// ==========================================
const SummaryCard = ({ icon, label, value, unit, color, bgColor }) => (
  <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 14 }}>
    <div style={{ width: 44, height: 44, borderRadius: 10, background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
    <div>
      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>{value}<span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginLeft: 6 }}>{unit}</span></p>
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
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: small ? 150 : 200, color: '#94a3b8' }}>
    <BarChart3 size={small ? 32 : 48} style={{ opacity: 0.3, marginBottom: 8 }} />
    <p style={{ fontSize: small ? '0.8rem' : '0.9rem' }}>{message}</p>
  </div>
);

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <p style={{ fontWeight: 700, marginBottom: 6, color: '#1e293b' }}>{label}</p>
      {payload.map((p, i) => (<p key={i} style={{ color: p.color, fontSize: '0.85rem', margin: '2px 0' }}>{p.name}: <strong>{p.value}</strong> ครั้ง</p>))}
    </div>
  );
};

const FilterSelect = ({ icon, label, value, onChange, options, minWidth = 140 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>{icon} {label}</label>
    <select value={value} onChange={onChange} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#334155', background: 'white', minWidth, cursor: 'pointer' }}>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

// ==========================================
// Main Component
// ==========================================
const HardnessReport = ({ onBack }) => {
  const [rawData, setRawData] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [selectedResult, setSelectedResult] = useState('ALL');
  const [displayCount, setDisplayCount] = useState(100);

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  // โหลด Suppliers ตอน mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/suppliers`);
        if (res.ok) setSuppliersList(await res.json());
      } catch (e) { console.error(e); }
    };
    fetchSuppliers();
  }, []);

  // ✅ ปุ่มสร้างรายงาน
  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/history?month=${selectedMonth}`);
      if (res.ok) { setRawData(await res.json()); setHasGenerated(true); }
    } catch (error) { console.error(error); alert('ไม่สามารถดึงข้อมูลได้'); }
    finally { setIsLoading(false); }
  };

  const filteredData = useMemo(() => {
    let data = [...rawData];
    if (selectedSupplier !== 'ALL') data = data.filter(d => (d.supplier || '').toLowerCase() === selectedSupplier.toLowerCase());
    if (selectedResult !== 'ALL') data = data.filter(d => (d.result || '').toUpperCase() === selectedResult);
    return data.slice(0, displayCount);
  }, [rawData, selectedSupplier, selectedResult, displayCount]);

  const summary = useMemo(() => {
    const total = filteredData.length;
    const pass = filteredData.filter(d => d.result === 'PASS').length;
    const fail = filteredData.filter(d => d.result === 'FAIL').length;
    const pending = total - pass - fail;
    return { total, pass, fail, pending, passRate: total > 0 ? ((pass / total) * 100).toFixed(1) : '0.0', failRate: total > 0 ? ((fail / total) * 100).toFixed(1) : '0.0', uniqueParts: new Set(filteredData.map(d => d.partno)).size, uniqueSuppliers: new Set(filteredData.filter(d => d.supplier).map(d => d.supplier)).size };
  }, [filteredData]);

  const supplierBarData = useMemo(() => {
    const map = {};
    filteredData.forEach(d => { const sup = d.supplier || 'ไม่ระบุ'; if (!map[sup]) map[sup] = { name: sup, PASS: 0, FAIL: 0, PENDING: 0, total: 0 }; if (d.result === 'PASS') map[sup].PASS++; else if (d.result === 'FAIL') map[sup].FAIL++; else map[sup].PENDING++; map[sup].total++; });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredData]);

  const pieData = useMemo(() => [
    { name: 'PASS', value: summary.pass, color: COLORS.pass },
    { name: 'FAIL', value: summary.fail, color: COLORS.fail },
    { name: 'PENDING', value: summary.pending, color: COLORS.pending },
  ].filter(d => d.value > 0), [summary]);

  const supplierTrendData = useMemo(() => {
    const m = {};
    filteredData.forEach(d => { const sup = d.supplier || 'ไม่ระบุ'; if (!m[sup]) m[sup] = []; if (d.value && !isNaN(parseFloat(d.value))) m[sup].push({ date: d.date, partno: d.partno, lotno: d.lotno || '-', value: parseFloat(d.value), result: d.result }); });
    Object.keys(m).forEach(sup => { m[sup].sort((a, b) => new Date(a.date) - new Date(b.date)); m[sup] = m[sup].map((item, idx) => ({ ...item, index: idx + 1 })); });
    return m;
  }, [filteredData]);

  const supplierPartData = useMemo(() => {
    const map = {};
    filteredData.forEach(d => { const sup = d.supplier || 'ไม่ระบุ'; if (!map[sup]) map[sup] = {}; const part = d.partno || 'Unknown'; if (!map[sup][part]) map[sup][part] = { PASS: 0, FAIL: 0 }; if (d.result === 'PASS') map[sup][part].PASS++; else if (d.result === 'FAIL') map[sup][part].FAIL++; });
    const result = {};
    Object.keys(map).forEach(sup => { result[sup] = Object.entries(map[sup]).map(([part, counts]) => ({ name: part, PASS: counts.PASS, FAIL: counts.FAIL, total: counts.PASS + counts.FAIL })).sort((a, b) => b.total - a.total); });
    return result;
  }, [filteredData]);

  // ✅ Export CSV — ลบ Date ออก เหลือ Receipt Date
  const handleExportCSV = () => {
    if (filteredData.length === 0) { alert('ไม่มีข้อมูลสำหรับ Export'); return; }
    const headers = ['Receipt Date', 'Part No', 'Lot No', 'Heat No (Sup)', 'Supplier', 'Result', 'Value', 'Process'];
    const csvRows = filteredData.map(item => [
      item.receiptdate || '-', `"${item.partno}"`, `"${item.lotno || '-'}"`,
      `"${item.heatno_supplier || '-'}"`, `"${item.supplier || '-'}"`,
      item.result || '-', item.value || 0, `"${item.processtype || '-'}"`
    ]);
    const csvContent = [headers.join(','), ...csvRows.map(e => e.join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url;
    link.download = `hardness_report_${selectedMonth}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handlePrint = () => window.print();

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div style={{ padding: 20, fontFamily: "'Sarabun', sans-serif", background: '#f8fafc', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }} className="print-hidden">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={onBack} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontWeight: 600 }}>
            <ArrowLeft size={18} /> กลับ
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
              <BarChart3 size={28} style={{ color: '#2563eb' }} /> Hardness Inspection Report
            </h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>รายงานสรุปผลการตรวจสอบความแข็ง — แยกตาม Supplier</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExportCSV} disabled={!hasGenerated} style={{ background: hasGenerated ? '#ecfdf5' : '#f1f5f9', color: hasGenerated ? '#059669' : '#94a3b8', border: `1px solid ${hasGenerated ? '#a7f3d0' : '#e2e8f0'}`, borderRadius: 8, padding: '8px 16px', cursor: hasGenerated ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.85rem' }}>
            <Download size={16} /> Export CSV
          </button>
          <button onClick={handlePrint} disabled={!hasGenerated} style={{ background: 'white', color: hasGenerated ? '#475569' : '#94a3b8', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', cursor: hasGenerated ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.85rem' }}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="print-only" style={{ display: 'none', textAlign: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Hardness Inspection Monthly Report</h1>
        <p style={{ color: '#64748b', margin: '4px 0' }}>
          เดือน: {monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth}
          {selectedSupplier !== 'ALL' && ` | Supplier: ${selectedSupplier}`}
          {selectedResult !== 'ALL' && ` | ผลลัพธ์: ${selectedResult}`}
        </p>
      </div>

      {/* ===== Filters + ปุ่มสร้างรายงาน ===== */}
      <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', marginBottom: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }} className="print-hidden">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2563eb', fontWeight: 700, fontSize: '0.95rem' }}><Filter size={18} /> ตัวกรอง:</div>

        <FilterSelect icon={<Calendar size={12} />} label="เดือน" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} options={monthOptions.map(m => ({ value: m.value, label: m.label }))} minWidth={180} />
        <FilterSelect icon={<Truck size={12} />} label="Supplier" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} options={[{ value: 'ALL', label: 'ทั้งหมด (All Suppliers)' }, ...suppliersList.map(s => ({ value: s.name, label: s.name }))]} minWidth={180} />
        <FilterSelect icon={<CheckCircle2 size={12} />} label="ผลลัพธ์" value={selectedResult} onChange={e => setSelectedResult(e.target.value)} options={[{ value: 'ALL', label: 'ทั้งหมด' }, { value: 'PASS', label: '✅ PASS เท่านั้น' }, { value: 'FAIL', label: '❌ FAIL เท่านั้น' }]} minWidth={140} />
        <FilterSelect icon={<Hash size={12} />} label="จำนวนแสดง" value={displayCount} onChange={e => setDisplayCount(Number(e.target.value))} options={COUNT_OPTIONS.map(n => ({ value: n, label: `${n} รายการ` }))} minWidth={100} />

        {/* ✅ ปุ่มสร้างรายงาน */}
        <button onClick={handleGenerate} disabled={isLoading} style={{
          background: isLoading ? '#cbd5e1' : '#2563eb', color: 'white', border: 'none', borderRadius: 8,
          padding: '8px 20px', cursor: isLoading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.9rem',
          boxShadow: isLoading ? 'none' : '0 2px 6px rgba(37,99,235,0.3)', transition: 'all 0.2s', height: 38
        }}>
          {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
          {isLoading ? 'กำลังโหลด...' : 'สร้างรายงาน'}
        </button>

        {hasGenerated && (
          <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Activity size={14} /> แสดง {filteredData.length} จาก {rawData.length} รายการ
          </div>
        )}
      </div>

      {/* ===== ก่อนกดสร้างรายงาน ===== */}
      {!hasGenerated ? (
        <div style={{ background: 'white', borderRadius: 16, padding: '60px 40px', textAlign: 'center', border: '2px dashed #cbd5e1', marginTop: 20 }}>
          <BarChart3 size={64} style={{ color: '#cbd5e1', marginBottom: 16 }} />
          <h3 style={{ color: '#64748b', fontWeight: 700, margin: '0 0 8px' }}>ยังไม่มีข้อมูลรายงาน</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>เลือกเงื่อนไขด้านบน แล้วกดปุ่ม <span style={{ color: '#2563eb', fontWeight: 700 }}>🔄 สร้างรายงาน</span></p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            <SummaryCard icon={<Package size={20} />} label="ตรวจทั้งหมด" value={summary.total} unit="ครั้ง" color="#2563eb" bgColor="#eff6ff" />
            <SummaryCard icon={<CheckCircle2 size={20} />} label="ผ่าน (PASS)" value={summary.pass} unit={`${summary.passRate}%`} color="#10b981" bgColor="#ecfdf5" />
            <SummaryCard icon={<XCircle size={20} />} label="ไม่ผ่าน (FAIL)" value={summary.fail} unit={`${summary.failRate}%`} color="#ef4444" bgColor="#fef2f2" />
            <SummaryCard icon={<Clock size={20} />} label="รอตรวจ" value={summary.pending} unit="ครั้ง" color="#f59e0b" bgColor="#fffbeb" />
            <SummaryCard icon={<FileText size={20} />} label="จำนวน Part" value={summary.uniqueParts} unit="รายการ" color="#8b5cf6" bgColor="#f5f3ff" />
            <SummaryCard icon={<Truck size={20} />} label="Supplier" value={summary.uniqueSuppliers} unit="ราย" color="#06b6d4" bgColor="#ecfeff" />
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
            <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={20} style={{ color: '#2563eb' }} /> ผลการตรวจแยกตาม Supplier</h3>
              {supplierBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={supplierBarData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="name" fontSize={12} tick={{ fill: '#64748b' }} angle={-20} textAnchor="end" height={60} /><YAxis fontSize={12} />
                    <Tooltip content={<CustomBarTooltip />} /><Legend wrapperStyle={{ fontSize: '0.85rem' }} />
                    <Bar dataKey="PASS" fill={COLORS.pass} radius={[4,4,0,0]} name="PASS" /><Bar dataKey="FAIL" fill={COLORS.fail} radius={[4,4,0,0]} name="FAIL" /><Bar dataKey="PENDING" fill={COLORS.pending} radius={[4,4,0,0]} name="PENDING" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState message="ไม่มีข้อมูลสำหรับแสดงกราฟ" />}
            </div>
            <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}><PieChartIcon size={20} style={{ color: '#8b5cf6' }} /> สัดส่วนผลการตรวจ</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, value, percent }) => `${name} ${value} (${(percent*100).toFixed(0)}%)`} labelLine={{ stroke: '#94a3b8' }}>{pieData.map((entry, i) => <Cell key={`c-${i}`} fill={entry.color} />)}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              ) : <EmptyState message="ไม่มีข้อมูล" />}
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: parseFloat(summary.passRate) >= 95 ? COLORS.pass : parseFloat(summary.passRate) >= 80 ? COLORS.pending : COLORS.fail }}>{summary.passRate}%</span>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0' }}>อัตราการผ่าน (Pass Rate)</p>
              </div>
            </div>
          </div>

          {/* Per-Supplier Sections */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '2px solid #e2e8f0', paddingBottom: 10 }}>
              <TrendingUp size={22} style={{ color: '#2563eb' }} /> รายละเอียดแยกตาม Supplier
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
                  <div key={supplier} style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid #e2e8f0', borderLeft: `5px solid ${supColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: supColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Truck size={20} style={{ color: supColor }} /></div>
                        <div><h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{supplier}</h3><p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>ตรวจ {supTotal} ครั้ง | {supPartData.length} Part No</p></div>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <MiniStat label="PASS" value={supPass} color={COLORS.pass} /><MiniStat label="FAIL" value={supFail} color={COLORS.fail} />
                        <div style={{ padding: '6px 16px', borderRadius: 20, fontWeight: 800, fontSize: '0.95rem', background: parseFloat(supPassRate) >= 95 ? '#ecfdf5' : parseFloat(supPassRate) >= 80 ? '#fffbeb' : '#fef2f2', color: parseFloat(supPassRate) >= 95 ? COLORS.pass : parseFloat(supPassRate) >= 80 ? COLORS.pending : COLORS.fail }}>{supPassRate}%</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, border: '1px solid #f1f5f9' }}>
                        <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>📈 Hardness Value Trend</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="index" fontSize={11} tick={{ fill: '#94a3b8' }} /><YAxis domain={['auto','auto']} fontSize={11} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(val) => [`${val}`, 'Value']} labelFormatter={(label, payload) => { if (payload?.[0]) { const d = payload[0].payload; return `${d.partno} | Lot: ${d.lotno} | ${d.date}`; } return label; }} />
                            <Line type="monotone" dataKey="value" stroke={supColor} strokeWidth={2.5} dot={({ cx, cy, payload }) => (<circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={payload.result === 'PASS' ? COLORS.pass : payload.result === 'FAIL' ? COLORS.fail : COLORS.pending} stroke="white" strokeWidth={2} />)} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, border: '1px solid #f1f5f9' }}>
                        <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>📊 ผลตรวจแยกตาม Part No</h4>
                        {supPartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={supPartData.slice(0, 8)} layout="vertical" barGap={2}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" fontSize={11} /><YAxis type="category" dataKey="name" fontSize={11} width={90} tick={{ fill: '#475569' }} />
                              <Tooltip content={<CustomBarTooltip />} /><Bar dataKey="PASS" fill={COLORS.pass} radius={[0,4,4,0]} stackId="a" name="PASS" /><Bar dataKey="FAIL" fill={COLORS.fail} radius={[0,4,4,0]} stackId="a" name="FAIL" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : <EmptyState message="ไม่มีข้อมูล Part" small />}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : <EmptyState message="ไม่มีข้อมูลสำหรับเดือนที่เลือก" />}
          </div>

          {/* ===== Data Table (✅ ลบ Date ออก เหลือ Receipt Date) ===== */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={20} style={{ color: '#f97316' }} /> ตารางข้อมูลรายละเอียด ({filteredData.length} รายการ)</h3>
            </div>
            <div style={{ maxHeight: 500, overflowY: 'auto', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: 900 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 5 }}>
                    {['#', 'Receipt Date', 'Part No', 'Lot No', 'Heat No (Sup)', 'Supplier', 'Process', 'Value', 'Result'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '2px solid #cbd5e1', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => (
                    <tr key={row.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 14px', color: '#94a3b8' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 14px', whiteSpace: 'nowrap', color: '#475569' }}>{row.receiptdate || '-'}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 600, color: '#2563eb' }}>{row.partno}</td>
                      <td style={{ padding: '8px 14px' }}>{row.lotno || '-'}</td>
                      <td style={{ padding: '8px 14px' }}>{row.heatno_supplier || '-'}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 500 }}>{row.supplier || '-'}</td>
                      <td style={{ padding: '8px 14px', color: '#64748b' }}>{row.processtype || '-'}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 700, fontFamily: 'monospace' }}>{row.value || '-'}</td>
                      <td style={{ padding: '8px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: row.result === 'PASS' ? '#dcfce7' : row.result === 'FAIL' ? '#fee2e2' : '#fef9c3', color: row.result === 'PASS' ? '#166534' : row.result === 'FAIL' ? '#991b1b' : '#854d0e' }}>
                          {row.result === 'PASS' && <CheckCircle2 size={12} />}{row.result === 'FAIL' && <XCircle size={12} />}{row.result || 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (<tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media print { .print-hidden { display: none !important; } .print-only { display: block !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        @media screen { .print-only { display: none !important; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default HardnessReport;