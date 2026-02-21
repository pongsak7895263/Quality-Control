import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, ComposedChart
} from 'recharts';
import {
  Save, RotateCcw, Trash2, PlusCircle, CheckCircle2, XCircle, TrendingUp, Layers, Search, ClipboardCheck, Target, Database, BarChart3, Flame, Eye, FileUp, Paperclip, X, Calendar, History, FileText, Activity, FileSearch, Loader2, Settings, Edit, AlertTriangle, FileSpreadsheet, Printer, LayoutDashboard
} from 'lucide-react';

import './HardnessInspection.css';

// ตั้งค่า IP ให้ตรงกับ Server ของคุณ
const API_BASE_URL = 'http://192.168.0.26:5000/api/hardness';
const FILE_BASE_URL = 'http://192.168.0.26:5000';

const PROCESS_TYPES = [
  'Q-T (Quench & Temper)', 'Normalizing', 'Annealing', 'Carburizing', 'Induction Hardening', 'Solution Treatment'
];

const HardnessInspection = ({ onManageParts }) => {
  const [partsList, setPartsList] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dashboard State
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardPart, setDashboardPart] = useState('');

  // History Filter State
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Form State (Lowercase keys to match DB)
  const [jobInfo, setJobInfo] = useState({
    partno: '', partname: '', material: '', standardref: '', standardimage: '',
    supplier: '', reportno: '', lotno: '', heatno_supplier: '',
    processtype: '', receiptdate: '', specmin: 0, specmax: 0, scale: 'HRC',
    inspectiontype: 'Random Sampling', samplingrate: '4/1000'
  });

  const [measurements, setMeasurements] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [inspectionMode, setInspectionMode] = useState('Surface');
  const [customScale, setCustomScale] = useState('HRC');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Modal States
  const [isStandardOpen, setIsStandardOpen] = useState(false);
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [editTestValues, setEditTestValues] = useState(['', '', '', '', '']);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: null, lotno: '', reportno: '', heatno_supplier: '',
    processtype: '', inspector: '', remarks: '', status: '', editreason: '', receiptdate: ''
  });

  const [editFiles, setEditFiles] = useState([]);
  const editFileInputRef = useRef(null);
  const inputRef = useRef(null);
  const [samplingEnabled, setSamplingEnabled] = useState(true);
  const [samplingSize, setSamplingSize] = useState(4);
  const [lotSize, setLotSize] = useState(1000);

  // =============================================
  // ✅ FIX 1: ใช้ useCallback เพื่อป้องกัน stale closure
  // =============================================
  const fetchHistory = useCallback(async (month) => {
    const targetMonth = month !== undefined ? month : filterMonth;
    try {
      const url = targetMonth
        ? `${API_BASE_URL}/history?month=${targetMonth}`
        : `${API_BASE_URL}/history`;

      console.log('[fetchHistory] Fetching:', url); // Debug log
      const historyRes = await fetch(url);
      if (historyRes.ok) {
        const data = await historyRes.json();
        console.log('[fetchHistory] Got', data.length, 'records'); // Debug log
        setHistoryList(data);
      } else {
        console.error('[fetchHistory] Response not OK:', historyRes.status);
      }
    } catch (error) {
      console.error("[fetchHistory] Failed:", error);
    }
  }, [filterMonth]);

  // ✅ FIX 2: เรียก fetchHistory เมื่อ filterMonth เปลี่ยน
  useEffect(() => {
    fetchHistory(filterMonth);
  }, [filterMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ FIX 3: Initial data fetch - ใช้ async function ที่ถูกต้อง
  useEffect(() => {
    let isMounted = true; // ป้องกัน memory leak

    const fetchMasterData = async () => {
      try {
        setIsLoading(true);
        const [partsRes, suppliersRes] = await Promise.all([
          fetch(`${API_BASE_URL}/parts`),
          fetch(`${API_BASE_URL}/suppliers`)
        ]);

        if (!isMounted) return;

        if (partsRes.ok) {
          const partsData = await partsRes.json();
          setPartsList(partsData);
          console.log('[init] Parts loaded:', partsData.length);
        } else {
          console.error('[init] Parts fetch failed:', partsRes.status);
        }

        if (suppliersRes.ok) {
          const suppliersData = await suppliersRes.json();
          setSuppliersList(suppliersData);
          console.log('[init] Suppliers loaded:', suppliersData.length);
        } else {
          console.error('[init] Suppliers fetch failed:', suppliersRes.status);
        }

        // ✅ Fetch history ด้วย current filterMonth
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const historyUrl = `${API_BASE_URL}/history?month=${currentMonth}`;
        console.log('[init] Fetching history:', historyUrl);
        const historyRes = await fetch(historyUrl);
        if (!isMounted) return;
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setHistoryList(historyData);
          console.log('[init] History loaded:', historyData.length);
        } else {
          console.error('[init] History fetch failed:', historyRes.status);
        }
      } catch (error) {
        console.error("[init] Error fetching data:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMasterData();

    return () => { isMounted = false; };
  }, []); // ✅ เรียกครั้งเดียวตอน mount

  // --- Handlers ---
  const handlePartChange = (e) => {
    const selectedPartNo = e.target.value;
    const partData = partsList.find(p => p.partno === selectedPartNo);

    if (partData) {
      setJobInfo(prev => ({
        ...prev,
        partno: selectedPartNo,
        partname: partData.partname,
        material: partData.material,
        specmin: Number(partData.specmin),
        specmax: Number(partData.specmax),
        scale: partData.scale,
        standardref: partData.standardref,
        standardimage: partData.standardimage
      }));
      setMeasurements([]);
      setCurrentInput('');
    } else {
      setJobInfo(prev => ({
        ...prev,
        partno: '', partname: '', material: '', specmin: 0, specmax: 0, scale: 'HRC', standardref: '', standardimage: ''
      }));
    }
  };

  const handleSupplierChange = (e) => setJobInfo(prev => ({ ...prev, supplier: e.target.value, reportno: '' }));
  const handleInputChange = (e) => setJobInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleModeChange = (mode) => setInspectionMode(mode);

  const checkStatus = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return 'INVALID';
    if (!jobInfo.partno) return 'PENDING';
    if (num >= jobInfo.specmin && num <= jobInfo.specmax) return 'PASS';
    return 'FAIL';
  };

  const handleAddMeasurement = (e) => {
    e.preventDefault();
    if (!currentInput || !jobInfo.partno) return;
    const val = parseFloat(currentInput);
    if (isNaN(val)) return;
    if (samplingEnabled && measurements.length >= samplingSize) {
      alert(`ได้ทำการสุ่มตรวจครบ ${samplingSize} ชิ้นแล้ว`);
      return;
    }

    const newRecord = {
      id: Date.now(),
      pieceNo: measurements.length + 1,
      value: val,
      status: checkStatus(val),
      inspectionType: inspectionMode,
      scale: jobInfo.scale || customScale,
      timestamp: new Date().toLocaleTimeString('th-TH'),
      date: new Date().toLocaleDateString('th-TH'),
      operator: 'Operator 1'
    };
    setMeasurements([...measurements, newRecord]);
    setCurrentInput('');
  };

  const handleDelete = (id) => {
    const updated = measurements.filter(m => m.id !== id).map((m, index) => ({ ...m, pieceNo: index + 1 }));
    setMeasurements(updated);
  };

  // =============================================
  // ✅ FIX 4: แยก resetForm ออกจาก handleReset (ไม่มี confirm)
  // =============================================
  const resetForm = useCallback(() => {
    setMeasurements([]);
    setCurrentInput('');
    setAttachedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setJobInfo({
      partno: '', partname: '', material: '', standardref: '', standardimage: '',
      supplier: '', reportno: '', lotno: '', heatno_supplier: '',
      processtype: '', receiptdate: '', specmin: 0, specmax: 0, scale: 'HRC',
      inspectiontype: 'Random Sampling', samplingrate: '4/1000'
    });
    setInspectionMode('Surface');
  }, []);

  // handleReset สำหรับปุ่ม "ล้างข้อมูล" (มี confirm)
  const handleReset = () => {
    if (window.confirm('ต้องการล้างข้อมูลหน้าจอทั้งหมดหรือไม่? (ข้อมูลที่ยังไม่บันทึกจะหายไป)')) {
      resetForm();
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: (file.size / 1024).toFixed(2) + ' KB',
      type: file.type,
      url: URL.createObjectURL(file),
      fileObj: file
    }));
    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (id) => setAttachedFiles(prev => prev.filter(f => f.id !== id));

  // =============================================
  // ✅ FIX 5: handleSaveReport - ใช้ resetForm แทน handleReset
  //           และ fetchHistory ด้วย current filterMonth
  // =============================================
  const handleSaveReport = async () => {
    if (measurements.length === 0) {
      alert("กรุณาเพิ่มข้อมูลการวัด");
      return;
    }
    if (!window.confirm("ยืนยันการบันทึกผลการตรวจสอบ?")) return;

    try {
      const formData = new FormData();
      const valuesOnly = measurements.map(m => m.value);
      const payload = { ...jobInfo, testvalues: valuesOnly, measurements, stats };
      formData.append('data', JSON.stringify(payload));
      attachedFiles.forEach(item => {
        if (item.fileObj) formData.append('attachments', item.fileObj);
      });

      const response = await fetch(`${API_BASE_URL}/inspection`, { method: 'POST', body: formData });
      const result = await response.json();

      if (response.ok && result.success) {
        alert(`บันทึกสำเร็จ! Job ID: ${result.data ? result.data.id : 'Saved'}`);
        resetForm(); // ✅ ใช้ resetForm แทน handleReset (ไม่ถาม confirm ซ้ำ)
        await fetchHistory(filterMonth); // ✅ refresh history ทันที
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (error) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  // =============================================
  // ✅ FIX 6: handleViewDetails - เพิ่ม error handling ที่ดีขึ้น
  // =============================================
  const handleViewDetails = async (jobId) => {
    setIsLoadingDetails(true);
    setSelectedJobDetails(null); // ✅ Clear ก่อน
    try {
      const response = await fetch(`${API_BASE_URL}/inspection/${jobId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      if (result.success) {
        setSelectedJobDetails(result.data);
      } else {
        alert(`ไม่สามารถดึงข้อมูลได้: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('handleViewDetails Error:', error);
      alert(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${error.message}`);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // =============================================
  // ✅ FIX 7: handleDeleteHistory - refresh history หลังลบ
  // =============================================
  const handleDeleteHistory = async (jobId) => {
    if (!window.confirm("⚠️ ยืนยันการลบข้อมูล?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/inspection/${jobId}`, { method: 'DELETE' });
      const result = await response.json();
      if (response.ok && result.success) {
        alert("ลบข้อมูลสำเร็จ");
        await fetchHistory(filterMonth); // ✅ ส่ง filterMonth ตรงๆ
      } else {
        alert(`ลบไม่สำเร็จ: ${result.message}`);
      }
    } catch (error) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  // --- Edit Logic ---
  const handleEditFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setEditFiles(prev => [...prev, ...files]);
  };
  const handleRemoveEditFile = (index) => {
    setEditFiles(prev => prev.filter((_, i) => i !== index));
  };

  // =============================================
  // ✅ FIX 8: handleEditClick - ปรับ receiptdate format สำหรับ input[type=date]
  // =============================================
  const handleEditClick = async (jobId) => {
    setIsLoadingDetails(true);
    setEditFiles([]);
    try {
      const response = await fetch(`${API_BASE_URL}/inspection/${jobId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        const { header, measurements: meas } = result.data;

        // ✅ แปลง receiptdate เป็น YYYY-MM-DD สำหรับ input[type=date]
        let formattedReceiptDate = '';
        if (header.receiptdate) {
          try {
            const d = new Date(header.receiptdate);
            if (!isNaN(d.getTime())) {
              formattedReceiptDate = d.toISOString().slice(0, 10);
            }
          } catch (e) {
            formattedReceiptDate = header.receiptdate;
          }
        }

        setEditFormData({
          id: header.job_id,
          lotno: header.lot_no || '',
          reportno: header.report_no || '',
          heatno_supplier: header.heat_no_supplier || '',
          processtype: header.process_type || '',
          receiptdate: formattedReceiptDate, // ✅ ใช้ค่าที่แปลงแล้ว
          inspector: header.inspector_name || '',
          remarks: header.remarks || '',
          status: header.overall_status || 'PASS',
          editreason: ''
        });

        const loadedValues = meas ? meas.map(m => m.measure_value) : [];
        const newValues = loadedValues.map(v => String(v));
        while (newValues.length < 5) newValues.push('');
        setEditTestValues(newValues);
        setIsEditModalOpen(true);
      } else {
        alert(`ไม่สามารถดึงข้อมูลเพื่อแก้ไขได้: ${result.message || ''}`);
      }
    } catch (error) {
      console.error('handleEditClick Error:', error);
      alert(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${error.message}`);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // =============================================
  // ✅ FIX 9: handleSubmitEdit - refresh history หลังแก้ไข
  // =============================================
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editFormData.editreason) {
      alert("กรุณาระบุเหตุผลการแก้ไข");
      return;
    }
    try {
      const formData = new FormData();
      const payload = {
        ...editFormData,
        testvalues: editTestValues.filter(v => v !== '')
      };
      formData.append('updateData', JSON.stringify(payload));
      editFiles.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await fetch(`${API_BASE_URL}/inspection/${editFormData.id}`, {
        method: 'PUT',
        body: formData
      });
      const result = await response.json();

      if (response.ok && result.success) {
        alert("คำนวณใหม่และบันทึกสำเร็จ");
        setIsEditModalOpen(false);
        setEditFiles([]);
        await fetchHistory(filterMonth); // ✅ ส่ง filterMonth ตรงๆ
      } else {
        alert(`แก้ไขไม่สำเร็จ: ${result.message}`);
      }
    } catch (error) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  // --- Export Logic ---
  const handleExportCSV = () => {
    if (filteredHistoryList.length === 0) {
      alert('ไม่มีข้อมูลสำหรับ Export');
      return;
    }
    const headers = ['Date', 'Receipt Date', 'Part No', 'Lot No', 'Heat No (Sup)', 'Surface Status', 'Core Status', 'Result', 'Value', 'Scale', 'Inspector', 'Remarks'];
    const csvRows = filteredHistoryList.map(item => [
      item.date, item.receiptdate || '-', `"${item.partno}"`, `"${item.lotno || '-'}"`, `"${item.heatno_supplier || '-'}"`,
      item.surfacestatus || '-', item.corestatus || '-', item.result || '-', item.value || 0, item.scale || 'HRC',
      `"${item.inspector || '-'}"`, `"${item.note || item.editdetails || '-'}"`
    ]);
    const csvContent = [headers.join(','), ...csvRows.map(e => e.join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hardness_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => { window.print(); };

  // --- Filter Logic ---
  const filteredHistoryList = useMemo(() => {
    if (!historySearchTerm) return historyList;
    const lowerTerm = historySearchTerm.toLowerCase();
    return historyList.filter(item =>
      (item.partno?.toLowerCase() || '').includes(lowerTerm) ||
      (item.lotno?.toLowerCase() || '').includes(lowerTerm) ||
      (item.heatno_supplier?.toLowerCase() || '').includes(lowerTerm)
    );
  }, [historyList, historySearchTerm]);

  // --- Chart Data Preparation ---
  const dashboardChartData = useMemo(() => {
    if (!dashboardPart || historyList.length === 0) return [];

    const partHistory = historyList
      .filter(h => h.partno === dashboardPart && h.value && !isNaN(parseFloat(h.value)))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (partHistory.length === 0) return [];

    const partSpec = partsList.find(p => p.partno === dashboardPart);
    const min = partSpec && partSpec.specmin ? parseFloat(partSpec.specmin) : undefined;
    const max = partSpec && partSpec.specmax ? parseFloat(partSpec.specmax) : undefined;

    return partHistory.map((h, index) => ({
      name: `${h.lotno || 'Lot-' + (index + 1)}`,
      fullName: `${h.lotno || 'Lot'} (${h.date})`,
      value: parseFloat(h.value),
      min: min,
      max: max
    }));
  }, [historyList, dashboardPart, partsList]);

  const stats = useMemo(() => {
    if (measurements.length === 0) return { min: 0, max: 0, avg: 0, passRate: 0, surfaceCount: 0, coreCount: 0 };
    const values = measurements.map(m => m.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const passed = measurements.filter(m => m.status === 'PASS').length;
    const passRate = (passed / measurements.length) * 100;
    const surfaceCount = measurements.filter(m => m.inspectionType === 'Surface').length;
    const coreCount = measurements.filter(m => m.inspectionType === 'Core').length;
    return { min, max, avg, passRate, surfaceCount, coreCount };
  }, [measurements]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [measurements, jobInfo.partno]);

  const filteredMeasurements = measurements.filter(m => inspectionMode === 'All' || m.inspectionType === inspectionMode);

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
      <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
    </div>
  );

  return (
    <div className="hardness-container relative">
      {/* Detail Modal */}
      {selectedJobDetails && (
        <div className="modal-overlay">
          <div className="modal-content standard-modal" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 className="modal-title text-xl"><FileSearch size={24} className="icon-blue" /> รายละเอียดการตรวจสอบ (Job ID: {selectedJobDetails.header.job_id})</h3>
              <button onClick={() => setSelectedJobDetails(null)} className="btn-close"><X size={24} /></button>
            </div>
            <div className="modal-body p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div><label className="detail-label">Date</label><div className="detail-value">{selectedJobDetails.header.job_date_fmt}</div></div>
                <div><label className="detail-label">Receipt Date</label><div className="detail-value">{selectedJobDetails.header.receiptdate ? new Date(selectedJobDetails.header.receiptdate).toLocaleDateString() : '-'}</div></div>
                <div><label className="detail-label">Inspector</label><div className="detail-value">{selectedJobDetails.header.inspector_name || '-'}</div></div>
                <div><label className="detail-label">Status</label><span className={`status-pill ${selectedJobDetails.header.overall_status === 'PASS' ? 'pass' : 'fail'}`}>{selectedJobDetails.header.overall_status}</span></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">Product</h4>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-gray-500">Part No:</span> <span className="font-semibold text-blue-700">{selectedJobDetails.header.part_no}</span>
                    <span className="text-gray-500">Part Name:</span> <span>{selectedJobDetails.header.part_name}</span>
                    <span className="text-gray-500">Spec:</span> <span>{selectedJobDetails.header.spec_min_snapshot} - {selectedJobDetails.header.spec_max_snapshot} {selectedJobDetails.header.scale_snapshot}</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">Traceability</h4>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-gray-500">Lot No:</span> <span>{selectedJobDetails.header.lot_no}</span>
                    <span className="text-gray-500">Heat (Sup):</span> <span>{selectedJobDetails.header.heat_no_supplier || '-'}</span>
                    <span className="text-gray-500">Process:</span> <span>{selectedJobDetails.header.process_type || '-'}</span>
                    <span className="text-gray-500">Report No:</span> <span>{selectedJobDetails.header.report_no || '-'}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">Measurements Result</h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600">
                      <tr><th className="p-2 border-b">#</th><th className="p-2 border-b">Value</th><th className="p-2 border-b">Scale</th><th className="p-2 border-b">Point</th><th className="p-2 border-b">Result</th></tr>
                    </thead>
                    <tbody>
                      {selectedJobDetails.measurements.map((m) => (
                        <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="p-2">{m.piece_no}</td>
                          <td className="p-2 font-mono font-bold">{m.measure_value}</td>
                          <td className="p-2">{selectedJobDetails.header.scale_snapshot}</td>
                          <td className="p-2">{m.point_type}</td>
                          <td className="p-2">
                            <span className={`text-xs px-2 py-1 rounded font-bold ${m.status === 'PASS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{m.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-footer"><button onClick={() => setSelectedJobDetails(null)} className="btn-secondary">ปิดหน้าต่าง</button></div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content detail-modal">
            <div className="modal-header bg-yellow-50 border-yellow-200">
              <h3 className="modal-title text-yellow-700"><Edit size={20} className="mr-2" /> แก้ไขข้อมูล (Job ID: {editFormData.id})</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="btn-close"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmitEdit}>
              <div className="modal-body p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="info-group"><label className="label-bold">Lot No</label><input type="text" className="input-text" value={editFormData.lotno} onChange={e => setEditFormData({ ...editFormData, lotno: e.target.value })} /></div>
                  <div className="info-group"><label className="label-bold">Report No</label><input type="text" className="input-text" value={editFormData.reportno} onChange={e => setEditFormData({ ...editFormData, reportno: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="info-group"><label>Heat No (Sup)</label><input type="text" className="input-text" value={editFormData.heatno_supplier} onChange={e => setEditFormData({ ...editFormData, heatno_supplier: e.target.value })} /></div>
                  <div className="info-group"><label>Receipt Date</label><input type="date" className="input-text" value={editFormData.receiptdate} onChange={e => setEditFormData({ ...editFormData, receiptdate: e.target.value })} /></div>
                </div>
                <div className="info-group">
                  <label>Process Type</label>
                  <select className="input-select" value={editFormData.processtype} onChange={e => setEditFormData({ ...editFormData, processtype: e.target.value })}>
                    <option value="">- Select -</option>
                    {PROCESS_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="info-group mt-4 p-3 bg-blue-50 rounded border border-blue-100">
                  <label className="label-bold text-blue-800 mb-2 block">ค่าที่วัดได้ (Measured Values) - คำนวณผลใหม่</label>
                  <div className="grid grid-cols-5 gap-2">
                    {editTestValues.map((val, idx) => (
                      <input key={idx} type="number" step="0.1" placeholder={`#${idx + 1}`} className="input-text text-center font-bold" value={val}
                        onChange={(e) => { const newVals = [...editTestValues]; newVals[idx] = e.target.value; setEditTestValues(newVals); }} />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="info-group"><label>Inspector</label><input type="text" className="input-text" value={editFormData.inspector} onChange={e => setEditFormData({ ...editFormData, inspector: e.target.value })} /></div>
                  <div className="info-group">
                    <label>Status</label>
                    <select className="input-select" value={editFormData.status} onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}>
                      <option value="PASS">PASS</option>
                      <option value="FAIL">FAIL</option>
                    </select>
                  </div>
                </div>
                <div className="info-group"><label>Remarks</label><textarea className="input-text" rows="2" value={editFormData.remarks} onChange={e => setEditFormData({ ...editFormData, remarks: e.target.value })}></textarea></div>
                {/* File Upload in Edit */}
                <div className="info-group mt-3">
                  <label className="label-bold flex items-center gap-2"><Paperclip size={16} /> แนบไฟล์เพิ่มเติม (PDF/รูปภาพ)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => editFileInputRef.current?.click()}>
                    <input type="file" multiple ref={editFileInputRef} onChange={handleEditFileUpload} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                    <div className="flex flex-col items-center text-gray-500"><FileUp size={24} /><span className="text-sm mt-1">คลิกเพื่อเลือกไฟล์</span></div>
                  </div>
                  {editFiles.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {editFiles.map((file, index) => (
                        <div key={index} className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100 text-sm">
                          <span className="truncate max-w-[200px] text-blue-700">{file.name}</span>
                          <button type="button" onClick={() => handleRemoveEditFile(index)} className="text-red-500 hover:text-red-700"><X size={16} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-red-50 p-3 rounded border border-red-100 mt-4">
                  <label className="label-bold text-red-600 flex items-center gap-1"><AlertTriangle size={14} /> เหตุผลการแก้ไข (บังคับระบุ)</label>
                  <input type="text" className="input-text border-red-200 focus:border-red-400 mt-1" placeholder="เช่น แก้ไข Lot No ผิด, Re-check" value={editFormData.editreason} onChange={e => setEditFormData({ ...editFormData, editreason: e.target.value })} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn-secondary mr-2">ยกเลิก</button>
                <button type="submit" className="add-btn w-auto bg-yellow-600 hover:bg-yellow-700 text-white">บันทึกการแก้ไข</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStandardOpen && (
        <div className="modal-overlay">
          <div className="modal-content standard-modal">
            <div className="modal-header"><h3 className="modal-title"><FileText size={20} className="icon-blue" /> Inspection Standard: {jobInfo.standardref}</h3><button onClick={() => setIsStandardOpen(false)} className="btn-close"><X size={24} /></button></div>
            <div className="modal-body bg-gray-50 flex-center">{jobInfo.standardimage ? <img src={jobInfo.standardimage} alt="Standard" className="standard-img" /> : <div className="empty-state"><FileText size={48} className="mb-2" /><p>ไม่พบรูปภาพมาตรฐาน</p></div>}</div>
            <div className="modal-footer"><button onClick={() => setIsStandardOpen(false)} className="btn-secondary">ปิด</button></div>
          </div>
        </div>
      )}

      {/* --- Top Action Bar: Dashboard + Trend Toggle --- */}
      <div className="flex justify-end mb-4 print-hidden" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => window.location.href='/inspections/hardness/report'}
          style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s' }}
        >
          <BarChart3 size={18} /> Dashboard
        </button>
        <button
          onClick={() => setShowDashboard(!showDashboard)}
          className={`btn-icon-text ${showDashboard ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-600'} border px-4 py-2 rounded-lg flex items-center gap-2`}
        >
          <LayoutDashboard size={18} /> {showDashboard ? 'ซ่อนกราฟแนวโน้ม' : 'แสดงกราฟแนวโน้ม (Trend)'}
        </button>
      </div>

      {/* --- Dashboard Chart --- */}
      {showDashboard && (
        <div className="section-card mb-6 animate-fadeIn">
          <div className="card-title">
            <BarChart3 size={24} className="icon-blue" />
            <h2>X-Bar Chart: Hardness Trend Analysis</h2>
          </div>
          <div className="mb-4 flex items-center gap-4">
            <label className="text-sm font-semibold text-gray-700">เลือก Part No:</label>
            <select className="input-select w-64" value={dashboardPart} onChange={(e) => setDashboardPart(e.target.value)}>
              <option value="">-- Select Part to View Trend --</option>
              {partsList.map(p => <option key={p.partno} value={p.partno}>{p.partno}</option>)}
            </select>
          </div>
          <div className="h-80 w-full">
            {dashboardChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dashboardChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" fontSize={12} tick={{ fill: '#6b7280' }} />
                  <YAxis domain={['auto', 'auto']} fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} labelFormatter={(label, payload) => { if (payload && payload.length > 0) return payload[0].payload.fullName; return label; }} />
                  {dashboardChartData[0].min !== undefined && (
                    <ReferenceLine y={dashboardChartData[0].min} label="LSL" stroke="red" strokeDasharray="3 3" />
                  )}
                  {dashboardChartData[0].max !== undefined && (
                    <ReferenceLine y={dashboardChartData[0].max} label="USL" stroke="red" strokeDasharray="3 3" />
                  )}
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Average Hardness" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <BarChart3 size={48} className="mb-2 opacity-50" />
                <p>{dashboardPart ? 'ยังไม่มีข้อมูลประวัติสำหรับ Part นี้' : 'กรุณาเลือก Part No'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Form Interface */}
      <div className="section-card header-section print-hidden">
        <div className="card-title"><Target size={24} className="icon-blue" /><h2>Hardness Inspection System</h2></div>
        <div className="job-grid">
          <div className="info-group">
            <div className="flex justify-between items-center mb-1">
              <label className="label-bold text-blue-800">1. Part No *</label>
              <div className="flex gap-2">
                {jobInfo.standardref && <button onClick={() => setIsStandardOpen(true)} className="btn-is-ref text-blue-600 border-blue-200 bg-blue-50" title="ดูมาตรฐานการตรวจสอบ"><Eye size={12} /> IS Ref</button>}
                <button onClick={onManageParts} className="btn-is-ref text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800" title="เพิ่มหรือแก้ไขข้อมูล Part"><Settings size={12} /> Manage Parts</button>
              </div>
            </div>
            <div className="select-wrapper"><Search size={16} className="search-icon" /><select name="partno" value={jobInfo.partno} onChange={handlePartChange} className="input-select highlight"><option value="">-- Select Part --</option>{partsList.map(part => (<option key={part.partno} value={part.partno}>{part.partno} - {part.partname}</option>))}</select></div>
          </div>
          <div className="info-group"><label>2.Part Name</label><input type="text" value={jobInfo.partname} readOnly className="input-readonly bg-gray-50" placeholder="-" /></div>
          <div className="info-group"><label>3.Material</label><input type="text" value={jobInfo.material} readOnly className="input-readonly bg-gray-50 font-semibold text-blue-700" placeholder="-" /></div>
          <div className="info-group"><label>3.Supplier *</label><select name="supplier" value={jobInfo.supplier} onChange={handleSupplierChange} className="input-select"><option value="">-- Select Supplier --</option>{suppliersList.map(sup => (<option key={sup.id} value={sup.name}>{sup.name}</option>))}</select></div>
          <div className="info-group"><label>4.Report No</label><input type="text" name="reportno" value={jobInfo.reportno} onChange={handleInputChange} className="input-text" placeholder="ระบุเลขที่ Report" disabled={!jobInfo.supplier} /></div>
          <div className="info-group">
            <label>5.Receipt Date (วันที่รับเข้า)</label>
            <input type="date" name="receiptdate" value={jobInfo.receiptdate} onChange={handleInputChange} className="input-text" />
          </div>
          <div className="info-group"><label>6.Process</label><select name="processtype" value={jobInfo.processtype} onChange={handleInputChange} className="input-select"><option value="">-- Select Process --</option>{PROCESS_TYPES.map(proc => (<option key={proc} value={proc}>{proc}</option>))}</select></div>
          <div className="info-group"><label>7.Lot No</label><input type="text" name="lotno" value={jobInfo.lotno} onChange={handleInputChange} className="input-text border-blue-200" placeholder="Lot No..." /></div>
          <div className="info-group"><label>8.Heat No (Sup)</label><input type="text" name="heatno_supplier" value={jobInfo.heatno_supplier} onChange={handleInputChange} className="input-text" placeholder="Heat No..." /></div>
          <div className="spec-group-wrapper">
            <label className="spec-label">9.Spec ({jobInfo.scale || 'HRC'})</label>
            <div className="spec-group">
              <div className="info-group spec-input-group"><input type="number" value={jobInfo.specmin} readOnly className="input-spec min" placeholder="Min" /></div>
              <div className="divider">-</div>
              <div className="info-group spec-input-group"><input type="number" value={jobInfo.specmax} readOnly className="input-spec max" placeholder="Max" /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="main-grid print-hidden">
        <div className="left-col">
          <div className="section-card mode-card">
            <h3>ตำแหน่งการตรวจสอบ</h3>
            <div className="mode-selector">
              <button className={`mode-btn ${inspectionMode === 'Surface' ? 'active' : ''}`} onClick={() => handleModeChange('Surface')}><ClipboardCheck size={18} /> ผิวชิ้นงาน (Surface)</button>
              <button className={`mode-btn ${inspectionMode === 'Core' ? 'active' : ''}`} onClick={() => handleModeChange('Core')}><Layers size={18} /> ด้านในชิ้นงาน (Core)</button>
            </div>
          </div>
          <div className="section-card sampling-card">
            <h3>การสุ่มตัวอย่าง</h3>
            <div className="sampling-control">
              <div className="sampling-switch"><label className="switch"><input type="checkbox" checked={samplingEnabled} onChange={(e) => setSamplingEnabled(e.target.checked)} /><span className="slider"></span></label><span>เปิดใช้งานการสุ่ม</span></div>
              {samplingEnabled && (
                <div className="sampling-inputs">
                  <div className="input-group"><label>จำนวนที่สุ่ม</label><input type="number" value={samplingSize} onChange={(e) => setSamplingSize(Number(e.target.value))} min="1" className="sampling-input" /></div>
                  <div className="divider-text">จาก</div>
                  <div className="input-group"><label>Lot Size</label><input type="number" value={lotSize} onChange={(e) => setLotSize(Number(e.target.value))} step="100" className="sampling-input" /></div>
                </div>
              )}
              <div className="sampling-progress"><div className="progress-bar"><div className="progress-fill" style={{ width: `${(measurements.length / samplingSize) * 100}%` }}></div></div><div className="progress-text">ตรวจแล้ว: {measurements.length}/{samplingSize} ชิ้น</div></div>
            </div>
          </div>
          <div className="section-card attachment-card">
            <h3>เอกสารอ้างอิง / Attachments</h3>
            <div className="attachment-wrapper">
              <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx" />
                <div className="flex flex-col items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors cursor-pointer"><FileUp size={32} /><span className="text-sm">คลิกเพื่อแนบไฟล์ (Mill Sheet, COA)</span></div>
              </div>
              {attachedFiles.length > 0 && (
                <div className="file-list">
                  {attachedFiles.map(file => (
                    <div key={file.id} className="file-item">
                      <div className="file-icon"><Paperclip size={14} /></div>
                      <div className="file-info"><span className="file-name">{file.name}</span><span className="file-size">{file.size}</span></div>
                      <button onClick={() => handleRemoveFile(file.id)} className="file-remove"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className={`section-card input-card ${!jobInfo.partno ? 'disabled' : ''}`}>
            <h3>บันทึกค่าความแข็ง - {inspectionMode}</h3>
            <form onSubmit={handleAddMeasurement} className="input-wrapper">
              <input ref={inputRef} type="number" step="0.1" placeholder={jobInfo.partno ? "00.0" : "เลือก Part ก่อน"} value={currentInput} onChange={e => setCurrentInput(e.target.value)} className="big-input" disabled={!jobInfo.partno || (samplingEnabled && measurements.length >= samplingSize)} />
              <div className="scale-display">{jobInfo.scale || customScale}</div>
              <button type="submit" className="add-btn" disabled={!jobInfo.partno || (samplingEnabled && measurements.length >= samplingSize)}><PlusCircle size={24} /> บันทึก</button>
            </form>
            <div className="status-preview">{currentInput && jobInfo.partno && (<span className={`badge-lg ${checkStatus(currentInput).toLowerCase()}`}>{checkStatus(currentInput) === 'PASS' ? 'ผ่าน' : 'ไม่ผ่าน'}</span>)}</div>
          </div>
        </div>
        <div className="right-col">
          <div className="section-card stats-summary">
            <div className="card-title-sm"><BarChart3 size={18} /> สถิติการตรวจสอบ</div>
            <div className="stats-grid">
              <div className="stat-item"><span className="stat-label">ตรวจทั้งหมด</span><span className="stat-val">{measurements.length}</span><div className="stat-sub"><span className="surface-stat">ผิว: {stats.surfaceCount}</span><span className="core-stat">แกน: {stats.coreCount}</span></div></div>
              <div className="stat-item"><span className="stat-label">ค่าเฉลี่ย</span><span className="stat-val">{stats.avg.toFixed(1)}</span><div className="stat-sub">{jobInfo.scale}</div></div>
              <div className="stat-item"><span className="stat-label">ช่วงค่า</span><span className="stat-val">{stats.min.toFixed(1)}-{stats.max.toFixed(1)}</span></div>
              <div className="stat-item"><span className="stat-label">อัตราการผ่าน</span><span className={`stat-val ${stats.passRate < 100 ? 'text-red' : 'text-green'}`}>{stats.passRate.toFixed(0)}%</span><div className="stat-sub">{measurements.filter(m => m.status === 'PASS').length}/{measurements.length}</div></div>
            </div>
          </div>
          <div className="section-card chart-card">
            <div className="chart-header"><div className="card-title-sm"><TrendingUp size={18} /> แนวโน้มค่าความแข็ง ({jobInfo.scale || '-'})</div></div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={220}>
                {measurements.length > 0 ? (
                  <LineChart data={measurements}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="pieceNo" label={{ value: 'Piece #', position: 'insideBottom', offset: -5 }} />
                    <YAxis domain={[jobInfo.specmin - 5, jobInfo.specmax + 5]} />
                    <Tooltip />
                    <ReferenceLine y={jobInfo.specmax} stroke="red" strokeDasharray="3 3" label="Max" />
                    <ReferenceLine y={jobInfo.specmin} stroke="red" strokeDasharray="3 3" label="Min" />
                    <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={(props) => { const fill = props.payload.inspectionType === 'Core' ? '#10b981' : '#2563eb'; return <circle cx={props.cx} cy={props.cy} r={4} fill={fill} />; }} />
                  </LineChart>
                ) : (
                  <div className="chart-placeholder"><Activity size={48} className="text-gray-300" /><p className="text-gray-400">ไม่มีข้อมูลสำหรับแสดงกราฟ</p></div>
                )}
              </ResponsiveContainer>
            </div>
          </div>
          <div className="section-card table-card">
            <div className="table-header-row">
              <h3>บันทึกการตรวจสอบ (Current Session)</h3>
              <div className="table-actions">
                <button className="btn-icon text-red" onClick={handleReset} disabled={measurements.length === 0}><RotateCcw size={18} /> ล้างข้อมูล</button>
                <button className="btn-icon text-green" onClick={handleSaveReport} disabled={measurements.length === 0}><Save size={18} /> บันทึก</button>
              </div>
            </div>
            <div className="table-filters">
              <div className="filter-group">
                <span>แสดง:</span>
                <button className={`filter-btn ${inspectionMode === 'All' ? 'active' : ''}`} onClick={() => setInspectionMode('All')}>ทั้งหมด</button>
                <button className={`filter-btn ${inspectionMode === 'Surface' ? 'active' : ''}`} onClick={() => setInspectionMode('Surface')}>Surface</button>
                <button className={`filter-btn ${inspectionMode === 'Core' ? 'active' : ''}`} onClick={() => setInspectionMode('Core')}>Core</button>
              </div>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>#</th><th>เวลา</th><th>ค่า</th><th>ประเภท</th><th>สถานะ</th><th>ลบ</th></tr></thead>
                <tbody>
                  {filteredMeasurements.slice().reverse().map((m) => (
                    <tr key={m.id}>
                      <td>{m.pieceNo}</td><td>{m.timestamp}</td>
                      <td className="value-cell">{m.value.toFixed(1)} {m.scale}</td>
                      <td><span className={`type-badge ${m.inspectionType.toLowerCase()}`}>{m.inspectionType === 'Surface' ? 'ผิว' : 'แกน'}</span></td>
                      <td><span className={`status-pill ${m.status.toLowerCase()}`}>{m.status === 'PASS' ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {m.status}</span></td>
                      <td><button onClick={() => handleDelete(m.id)} className="btn-trash"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                  {filteredMeasurements.length === 0 && (
                    <tr><td colSpan="6" className="no-data"><Database size={24} className="icon-gray" />ยังไม่มีการบันทึกข้อมูลในรอบนี้</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* --- Monthly History Log with Search & Export --- */}
      <div className="section-card history-section mt-5" style={{ marginTop: '20px' }}>
        <div className="history-header flex-col md:flex-row gap-4">
          <div className="card-title mb-0 border-0 p-0">
            <History size={24} className="text-orange-500" />
            <h2>ประวัติการตรวจสอบประจำเดือน (Monthly Inspection History)</h2>
          </div>
          <div className="flex gap-2 w-full md:w-auto items-center">
            {/* Month Picker Filter */}
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-2 py-1">
              <span className="text-sm text-gray-500">เดือน:</span>
              <input type="month" className="outline-none text-sm text-gray-700 bg-transparent" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
            </div>
            {/* Search Input */}
            <div className="history-search-wrapper flex-1 md:flex-none">
              <Search size={18} className="history-search-icon" />
              <input type="text" className="history-search-input" placeholder="ค้นหา Part No, Lot No..." value={historySearchTerm} onChange={(e) => setHistorySearchTerm(e.target.value)} />
            </div>
            {/* Export Buttons */}
            <button onClick={handleExportCSV} className="btn-icon-text text-green-600 border border-green-200 bg-green-50 px-3 rounded hover:bg-green-100 transition-colors flex items-center gap-1">
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button onClick={handlePrint} className="btn-icon-text text-gray-600 border border-gray-200 bg-gray-50 px-3 rounded hover:bg-gray-100 transition-colors flex items-center gap-1">
              <Printer size={16} /> Print
            </button>
          </div>
        </div>
        <div className="table-scroll" style={{ maxHeight: '600px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th><Calendar size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Receipt Date</th>
                <th>Part No</th>
                <th>Lot No</th>
                <th>Heat No (Sup)</th>
                <th className="text-center">Surface</th>
                <th className="text-center">Core</th>
                <th>Result</th>
                <th className="text-center">PDF</th>
                <th>Note / Edit</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistoryList.map((log) => {
                let pdfUrl = null;
                if (log.fileurl) {
                  const cleanPath = log.fileurl.replace(/\\/g, '/').replace('http://192.168.0.26:5000/', '');
                  pdfUrl = `${FILE_BASE_URL}/${cleanPath}`;
                }

                return (
                  <tr key={log.id}>
                    <td className="text-gray-600 font-medium">
                      {log.receiptdate ? new Date(log.receiptdate).toLocaleDateString('th-TH') : '-'}
                    </td>
                    <td style={{ fontWeight: '500' }}>{log.partno}</td>
                    <td>{log.lotno || '-'}</td>
                    <td>{log.heatno_supplier || '-'}</td>
                    <td className="text-center">
                      {log.surfacestatus && log.surfacestatus !== '-' ? (
                        <span className={`type-badge ${log.surfacestatus === 'FAIL' ? 'fail' : 'success'}`} style={{ backgroundColor: log.surfacestatus === 'FAIL' ? '#fee2e2' : '#dcfce7', color: log.surfacestatus === 'FAIL' ? '#991b1b' : '#166534' }}>{log.surfacestatus}</span>
                      ) : '-'}
                    </td>
                    <td className="text-center">
                      {log.corestatus && log.corestatus !== '-' ? (
                        <span className={`type-badge ${log.corestatus === 'FAIL' ? 'fail' : 'success'}`} style={{ backgroundColor: log.corestatus === 'FAIL' ? '#fee2e2' : '#dcfce7', color: log.corestatus === 'FAIL' ? '#991b1b' : '#166534' }}>{log.corestatus}</span>
                      ) : '-'}
                    </td>
                    <td>
                      <span className={`status-pill ${log.result === 'PASS' ? 'pass' : log.result === 'FAIL' ? 'fail' : 'pending'}`}>
                        {log.result === 'PASS' && <CheckCircle2 size={12} />}
                        {log.result === 'FAIL' && <XCircle size={12} />}
                        {log.result || 'PENDING'}
                      </span>
                    </td>
                    <td className="text-center">
                      {pdfUrl ? (
                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="flex justify-center items-center hover:bg-gray-100 p-1 rounded transition" title="คลิกเพื่อเปิดไฟล์ PDF"><FileText size={20} className="text-red-500" /></a>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{log.editdetails || log.note || '-'}</td>
                    <td className="flex gap-2">
                      <button onClick={() => handleViewDetails(log.id)} className="btn-icon-text text-blue" title="ดูรายละเอียด"><FileSearch size={18} /></button>
                      <button onClick={() => handleEditClick(log.id)} className="btn-icon-text text-orange-500" title="แก้ไข"><Edit size={18} /></button>
                      <button onClick={() => handleDeleteHistory(log.id)} className="btn-icon-text text-red-500" title="ลบ"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                );
              })}
              {filteredHistoryList.length === 0 && (
                <tr><td colSpan="10" className="no-data">{historySearchTerm ? `ไม่พบข้อมูลที่ตรงกับ "${historySearchTerm}"` : "ไม่พบข้อมูลประวัติในเดือนนี้"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HardnessInspection;