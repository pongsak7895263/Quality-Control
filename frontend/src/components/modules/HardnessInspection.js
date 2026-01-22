import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer 
} from 'recharts';
import { 
  Save, RotateCcw, Trash2, PlusCircle, CheckCircle2, XCircle, TrendingUp, Layers, Search, ClipboardCheck, Target, Database, BarChart3, Flame, Eye, FileUp, Paperclip, X, Calendar, History, FileText, Activity, FileSearch, Loader2, Settings, Edit, AlertTriangle 
} from 'lucide-react';

import './HardnessInspection.css'; 

const API_BASE_URL = 'http://192.168.0.26:5000/api/hardness'; 
// const FILE_BASE_URL = 'http://192.168.0.26:5000'; // ถ้าต้องการแสดงลิงก์ไฟล์ที่เคยแนบ

const PROCESS_TYPES = [
  'Q-T (Quench & Temper)', 'Normalizing', 'Annealing', 'Carburizing', 'Induction Hardening', 'Solution Treatment'
];

const HardnessInspection = ({ onManageParts }) => {
  // ... (State เดิม 1, 2 คงเดิม) ...
  const [partsList, setPartsList] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [jobInfo, setJobInfo] = useState({
    partNo: '', partName: '', material: '', standardRef: '', standardImage: '',
    supplier: '', supplierName: '', reportNo: '', lotNo: '', internalHeatNo: '', supplierHeatNo: '', processType: '',     
    specMin: 0, specMax: 0, scale: 'HRC', inspectionType: 'Random Sampling', samplingRate: '4/1000'
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

  // [UPDATED] Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: null,
    lotNo: '',
    reportNo: '',       
    internalHeatNo: '', 
    supplierHeatNo: '', 
    processType: '',    
    inspector: '',
    remarks: '',
    status: '',
    editReason: ''
  });

  // [NEW] State สำหรับไฟล์แนบในหน้า Edit
  const [editFiles, setEditFiles] = useState([]);
  const editFileInputRef = useRef(null);
  
  const inputRef = useRef(null);
  const [samplingEnabled, setSamplingEnabled] = useState(true);
  const [samplingSize, setSamplingSize] = useState(4);
  const [lotSize, setLotSize] = useState(1000);

  // --- Initial Data Fetching ---
  const fetchHistory = async () => {
    try {
      const historyRes = await fetch(`${API_BASE_URL}/history`);
      if (historyRes.ok) setHistoryList(await historyRes.json());
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setIsLoading(true);
        const [partsRes, suppliersRes] = await Promise.all([
          fetch(`${API_BASE_URL}/parts`),
          fetch(`${API_BASE_URL}/suppliers`)
        ]);

        if (partsRes.ok) setPartsList(await partsRes.json());
        if (suppliersRes.ok) setSuppliersList(await suppliersRes.json());
        
        await fetchHistory();
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMasterData();
  }, []);

  // ... (Handlers เดิม) ...
  const handlePartChange = (e) => {
    const selectedPartNo = e.target.value;
    const partData = partsList.find(p => p.partNo === selectedPartNo);
    if (partData) {
      setJobInfo(prev => ({
        ...prev,
        partNo: selectedPartNo,
        partName: partData.partName,
        material: partData.material,
        specMin: Number(partData.specMin),
        specMax: Number(partData.specMax),
        scale: partData.scale,
        standardRef: partData.standardRef,
        standardImage: partData.standardImage
      }));
      setMeasurements([]);
      setCurrentInput('');
    } else {
      setJobInfo(prev => ({ ...prev, partNo: '', partName: '', material: '', specMin: 0, specMax: 0, scale: 'HRC', standardRef: '', standardImage: '' }));
    }
  };
  const handleSupplierChange = (e) => setJobInfo(prev => ({ ...prev, supplier: e.target.value, reportNo: '' }));
  const handleInputChange = (e) => setJobInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleModeChange = (mode) => setInspectionMode(mode);
  const checkStatus = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return 'INVALID';
    if (!jobInfo.partNo) return 'PENDING';
    if (num >= jobInfo.specMin && num <= jobInfo.specMax) return 'PASS';
    return 'FAIL';
  };
  const handleAddMeasurement = (e) => {
    e.preventDefault();
    if (!currentInput || !jobInfo.partNo) return;
    const val = parseFloat(currentInput);
    if (isNaN(val)) return;
    if (samplingEnabled && measurements.length >= samplingSize) { alert(`ได้ทำการสุ่มตรวจครบ ${samplingSize} ชิ้นแล้ว`); return; }
    const newRecord = { id: Date.now(), pieceNo: measurements.length + 1, value: val, status: checkStatus(val), inspectionType: inspectionMode, scale: jobInfo.scale || customScale, timestamp: new Date().toLocaleTimeString('th-TH'), date: new Date().toLocaleDateString('th-TH'), operator: 'Operator 1' };
    setMeasurements([...measurements, newRecord]);
    setCurrentInput('');
  };
  const handleDelete = (id) => { const updated = measurements.filter(m => m.id !== id).map((m, index) => ({ ...m, pieceNo: index + 1 })); setMeasurements(updated); };
  const handleReset = () => { if(window.confirm('ต้องการล้างข้อมูลการวัดทั้งหมดหรือไม่?')) { setMeasurements([]); setCurrentInput(''); } };
  const handleFileUpload = (e) => { const files = Array.from(e.target.files); const newFiles = files.map(file => ({ id: Date.now() + Math.random(), name: file.name, size: (file.size / 1024).toFixed(2) + ' KB', type: file.type, url: URL.createObjectURL(file), fileObj: file })); setAttachedFiles(prev => [...prev, ...newFiles]); };
  const handleRemoveFile = (id) => setAttachedFiles(prev => prev.filter(f => f.id !== id));
  
  const handleSaveReport = async () => {
    if (measurements.length === 0) { alert("ไม่มีข้อมูลที่จะบันทึก"); return; }
    if (!window.confirm("ยืนยันการบันทึกผลการตรวจสอบ?")) return;
    try {
      const formData = new FormData();
      const payload = { ...jobInfo, measurements, stats };
      formData.append('data', JSON.stringify(payload));
      attachedFiles.forEach(item => { if (item.fileObj) formData.append('attachments', item.fileObj); });
      const response = await fetch(`${API_BASE_URL}/inspection`, { method: 'POST', body: formData });
      const result = await response.json();
      if (response.ok && result.success) { alert(`บันทึกสำเร็จ! Job ID: ${result.jobId}`); handleReset(); fetchHistory(); } else { throw new Error(result.message || 'Unknown error'); }
    } catch (error) { alert(`เกิดข้อผิดพลาด: ${error.message}`); }
  };

  const handleViewDetails = async (jobId) => {
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`${API_BASE_URL}/inspection/${jobId}`);
      const result = await response.json();
      if (result.success) setSelectedJobDetails(result.data); else alert('ไม่สามารถดึงข้อมูลได้');
    } catch (error) { console.error('Error:', error); alert('เกิดข้อผิดพลาดในการเชื่อมต่อ'); } finally { setIsLoadingDetails(false); }
  };

  const handleDeleteHistory = async (jobId) => {
    if (!window.confirm("⚠️ คำเตือน: คุณต้องการลบข้อมูลการตรวจสอบนี้ใช่หรือไม่?\nการกระทำนี้ไม่สามารถย้อนกลับได้")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/inspection/${jobId}`, { method: 'DELETE' });
      const result = await response.json();
      if (response.ok && result.success) { alert("ลบข้อมูลสำเร็จ"); fetchHistory(); } else { alert(`ลบไม่สำเร็จ: ${result.message}`); }
    } catch (error) { alert(`เกิดข้อผิดพลาด: ${error.message}`); }
  };

  // --- [NEW] Helper Functions for Edit File Upload ---
  const handleEditFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setEditFiles(prev => [...prev, ...files]);
  };

  const handleRemoveEditFile = (index) => {
    setEditFiles(prev => prev.filter((_, i) => i !== index));
  };

  // [UPDATED] Open Edit Modal (Fetch details first)
  const handleEditClick = async (jobId) => {
    setIsLoadingDetails(true);
    setEditFiles([]); // ล้างไฟล์เก่าเมื่อเปิดใหม่
    try {
      const response = await fetch(`${API_BASE_URL}/inspection/${jobId}`);
      const result = await response.json();
      
      if (result.success) {
        const { header } = result.data;
        setEditFormData({
          id: header.job_id,
          lotNo: header.lot_no || '',
          reportNo: header.report_no || '',           
          internalHeatNo: header.heat_no_internal || '', 
          supplierHeatNo: header.heat_no_supplier || '', 
          processType: header.process_type || '',     
          inspector: header.inspector_name || '',
          remarks: header.remarks || '',
          status: header.overall_status || 'PASS',
          editReason: ''
        });
        setIsEditModalOpen(true);
      } else {
        alert('ไม่สามารถดึงข้อมูลเพื่อแก้ไขได้');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // [UPDATED] Submit Edit with FormData
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editFormData.editReason) {
      alert("กรุณาระบุเหตุผลการแก้ไข");
      return;
    }
    try {
      // ใช้ FormData เพื่อรองรับไฟล์
      const formData = new FormData();
      formData.append('updateData', JSON.stringify(editFormData));
      
      // แนบไฟล์
      editFiles.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await fetch(`${API_BASE_URL}/inspection/${editFormData.id}`, {
        method: 'PUT',
        // ไม่ต้องใส่ Content-Type header เมื่อใช้ FormData
        body: formData
      });

      const result = await response.json();
      if (response.ok && result.success) {
        alert("แก้ไขข้อมูลและอัปโหลดไฟล์สำเร็จ");
        setIsEditModalOpen(false);
        setEditFiles([]);
        fetchHistory();
      } else {
        alert(`แก้ไขไม่สำเร็จ: ${result.message}`);
      }
    } catch (error) {
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

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

  useEffect(() => { if(inputRef.current) inputRef.current.focus(); }, [measurements, jobInfo.partNo]);
  const filteredMeasurements = measurements.filter(m => inspectionMode === 'All' || m.inspectionType === inspectionMode);

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-slate-50"><Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" /><p className="text-gray-500">กำลังโหลดข้อมูล...</p></div>;

  return (
    <div className="hardness-container relative">
      {/* Detail Modal */}
      {selectedJobDetails && (
        <div className="modal-overlay">
          <div className="modal-content standard-modal" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 className="modal-title text-xl"><FileSearch size={24} className="icon-blue"/> รายละเอียดการตรวจสอบ (Job ID: {selectedJobDetails.header.job_id})</h3>
              <button onClick={() => setSelectedJobDetails(null)} className="btn-close"><X size={24} /></button>
            </div>
            <div className="modal-body p-6 space-y-6">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div><label className="detail-label">Date</label><div className="detail-value">{selectedJobDetails.header.job_date_fmt}</div></div>
                  <div><label className="detail-label">Time</label><div className="detail-value">{selectedJobDetails.header.job_time_fmt}</div></div>
                  <div><label className="detail-label">Inspector</label><div className="detail-value">{selectedJobDetails.header.inspector_name || '-'}</div></div>
                  <div><label className="detail-label">Status</label><span className={`status-pill ${selectedJobDetails.header.overall_status === 'PASS' ? 'pass' : 'fail'}`}>{selectedJobDetails.header.overall_status}</span></div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">Product</h4>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-gray-500">Part No:</span> <span className="font-semibold text-blue-700">{selectedJobDetails.header.part_no}</span>
                    <span className="text-gray-500">Spec:</span> <span>{selectedJobDetails.header.spec_min_snapshot} - {selectedJobDetails.header.spec_max_snapshot} {selectedJobDetails.header.scale_snapshot}</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-700 border-b pb-2 mb-3">Traceability</h4>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-gray-500">Lot No:</span> <span>{selectedJobDetails.header.lot_no}</span>
                    <span className="text-gray-500">Heat (Int):</span> <span>{selectedJobDetails.header.heat_no_internal || '-'}</span>
                    <span className="text-gray-500">Heat (Sup):</span> <span>{selectedJobDetails.header.heat_no_supplier || '-'}</span>
                    <span className="text-gray-500">Process:</span> <span>{selectedJobDetails.header.process_type || '-'}</span>
                  </div>
                </div>
               </div>
            </div>
            <div className="modal-footer"><button onClick={() => setSelectedJobDetails(null)} className="btn-secondary">ปิดหน้าต่าง</button></div>
          </div>
        </div>
      )}

      {/* --- [UPDATED] Edit Modal with File Upload --- */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content detail-modal">
            <div className="modal-header bg-yellow-50 border-yellow-200">
              <h3 className="modal-title text-yellow-700"><Edit size={20} className="mr-2"/> แก้ไขข้อมูล (Job ID: {editFormData.id})</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="btn-close"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmitEdit}>
              <div className="modal-body p-6 space-y-4">
                
                {/* 1. Production Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="info-group">
                        <label className="label-bold">Lot No</label>
                        <input type="text" className="input-text" value={editFormData.lotNo} onChange={e => setEditFormData({...editFormData, lotNo: e.target.value})} />
                    </div>
                    <div className="info-group">
                        <label className="label-bold">Report No</label>
                        <input type="text" className="input-text" value={editFormData.reportNo} onChange={e => setEditFormData({...editFormData, reportNo: e.target.value})} />
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="info-group">
                        <label>Heat No (Int)</label>
                        <input type="text" className="input-text" value={editFormData.internalHeatNo} onChange={e => setEditFormData({...editFormData, internalHeatNo: e.target.value})} />
                    </div>
                    <div className="info-group">
                        <label>Heat No (Sup)</label>
                        <input type="text" className="input-text" value={editFormData.supplierHeatNo} onChange={e => setEditFormData({...editFormData, supplierHeatNo: e.target.value})} />
                    </div>
                </div>

                <div className="info-group">
                    <label>Process Type</label>
                    <select className="input-select" value={editFormData.processType} onChange={e => setEditFormData({...editFormData, processType: e.target.value})}>
                        <option value="">- Select -</option>
                        {PROCESS_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>

                {/* 2. Inspection Info */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="info-group">
                        <label>Inspector</label>
                        <input type="text" className="input-text" value={editFormData.inspector} onChange={e => setEditFormData({...editFormData, inspector: e.target.value})} />
                    </div>
                    <div className="info-group">
                        <label>Status</label>
                        <select className="input-select" value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value})}>
                            <option value="PASS">PASS</option>
                            <option value="FAIL">FAIL</option>
                        </select>
                    </div>
                </div>

                <div className="info-group">
                  <label>Remarks</label>
                  <textarea className="input-text" rows="2" value={editFormData.remarks} onChange={e => setEditFormData({...editFormData, remarks: e.target.value})}></textarea>
                </div>

                {/* --- [NEW] Edit File Attachment Section --- */}
                <div className="info-group mt-3">
                  <label className="label-bold flex items-center gap-2">
                    <Paperclip size={16} /> แนบไฟล์เพิ่มเติม (PDF/รูปภาพ)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors"
                       onClick={() => editFileInputRef.current?.click()}>
                    <input 
                      type="file" 
                      multiple 
                      ref={editFileInputRef} 
                      onChange={handleEditFileUpload} 
                      className="hidden" 
                      accept=".pdf,.jpg,.jpeg,.png" 
                    />
                    <div className="flex flex-col items-center text-gray-500">
                      <FileUp size={24} />
                      <span className="text-sm mt-1">คลิกเพื่อเลือกไฟล์</span>
                    </div>
                  </div>
                  {editFiles.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {editFiles.map((file, index) => (
                        <div key={index} className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100 text-sm">
                          <span className="truncate max-w-[200px] text-blue-700">{file.name}</span>
                          <button type="button" onClick={() => handleRemoveEditFile(index)} className="text-red-500 hover:text-red-700">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="bg-red-50 p-3 rounded border border-red-100 mt-4">
                  <label className="label-bold text-red-600 flex items-center gap-1"><AlertTriangle size={14}/> เหตุผลการแก้ไข (บังคับระบุ)</label>
                  <input type="text" className="input-text border-red-200 focus:border-red-400 mt-1" placeholder="เช่น แก้ไข Lot No ผิด, Re-check" value={editFormData.editReason} onChange={e => setEditFormData({...editFormData, editReason: e.target.value})} required />
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

      {/* ... Header & Main Grid Code ... */}
      <div className="section-card header-section">
         <div className="card-title"><Target size={24} className="icon-blue" /><h2>Hardness Inspection System</h2></div>
         <div className="job-grid">
             <div className="info-group">
            <div className="flex justify-between items-center mb-1">
              <label className="label-bold text-blue-800">1. Part No *</label>
              <div className="flex gap-2">
                {jobInfo.standardRef && <button onClick={() => setIsStandardOpen(true)} className="btn-is-ref text-blue-600 border-blue-200 bg-blue-50" title="ดูมาตรฐานการตรวจสอบ"><Eye size={12} /> IS Ref</button>}
                <button onClick={onManageParts} className="btn-is-ref text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800" title="เพิ่มหรือแก้ไขข้อมูล Part"><Settings size={12} /> Manage Parts</button>
              </div>
            </div>
            <div className="select-wrapper"><Search size={16} className="search-icon" /><select name="partNo" value={jobInfo.partNo} onChange={handlePartChange} className="input-select highlight"><option value="">-- Select Part --</option>{partsList.map(part => (<option key={part.partNo} value={part.partNo}>{part.partNo} - {part.partName}</option>))}</select></div>
          </div>
          <div className="info-group"><label>Part Name</label><input type="text" value={jobInfo.partName} readOnly className="input-readonly bg-gray-50" placeholder="-" /></div>
          <div className="info-group"><label>Material</label><input type="text" value={jobInfo.material} readOnly className="input-readonly bg-gray-50 font-semibold text-blue-700" placeholder="-" /></div>
          <div className="info-group"><label>2. Supplier *</label><select name="supplier" value={jobInfo.supplier} onChange={handleSupplierChange} className="input-select"><option value="">-- Select Supplier --</option>{suppliersList.map(sup => (<option key={sup.id} value={sup.name}>{sup.name}</option>))}</select></div>
          <div className="info-group"><label>3. Report No</label><input type="text" name="reportNo" value={jobInfo.reportNo} onChange={handleInputChange} className="input-text" placeholder="ระบุเลขที่ Report" disabled={!jobInfo.supplier}/></div>
          <div className="info-group"><label>Process</label><select name="processType" value={jobInfo.processType} onChange={handleInputChange} className="input-select"><option value="">-- Select Process --</option>{PROCESS_TYPES.map(proc => (<option key={proc} value={proc}>{proc}</option>))}</select></div>
          <div className="info-group"><label>4. Lot No</label><input type="text" name="lotNo" value={jobInfo.lotNo} onChange={handleInputChange} className="input-text border-blue-200" placeholder="Lot No..." /></div>
          <div className="info-group"><label>5. Heat No (Int)</label><input type="text" name="internalHeatNo" value={jobInfo.internalHeatNo} onChange={handleInputChange} className="input-text" placeholder="Heat No..." /></div>
          <div className="info-group"><label>6. Heat No (Sup)</label><input type="text" name="supplierHeatNo" value={jobInfo.supplierHeatNo} onChange={handleInputChange} className="input-text" placeholder="Heat No..." /></div>
           <div className="spec-group-wrapper">
            <label className="spec-label">Spec ({jobInfo.scale || 'HRC'})</label>
            <div className="spec-group">
              <div className="info-group spec-input-group"><input type="number" value={jobInfo.specMin} readOnly className="input-spec min" /></div>
              <div className="divider">-</div>
              <div className="info-group spec-input-group"><input type="number" value={jobInfo.specMax} readOnly className="input-spec max" /></div>
            </div>
          </div>
         </div>
      </div>
      
      <div className="main-grid">
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
              {samplingEnabled && (<div className="sampling-inputs"><div className="input-group"><label>จำนวนที่สุ่ม</label><input type="number" value={samplingSize} onChange={(e) => setSamplingSize(Number(e.target.value))} min="1" className="sampling-input" /></div><div className="divider-text">จาก</div><div className="input-group"><label>Lot Size</label><input type="number" value={lotSize} onChange={(e) => setLotSize(Number(e.target.value))} step="100" className="sampling-input" /></div></div>)}
              <div className="sampling-progress"><div className="progress-bar"><div className="progress-fill" style={{ width: `${(measurements.length / samplingSize) * 100}%` }}></div></div><div className="progress-text">ตรวจแล้ว: {measurements.length}/{samplingSize} ชิ้น</div></div>
            </div>
          </div>
          <div className="section-card attachment-card">
            <h3>เอกสารอ้างอิง</h3>
            <div className="attachment-wrapper">
              <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xlsx" />
                <div className="flex flex-col items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors cursor-pointer"><FileUp size={32} /><span className="text-sm">คลิกเพื่อแนบไฟล์ (Mill Sheet, COA)</span></div>
              </div>
              {attachedFiles.length > 0 && (<div className="file-list">{attachedFiles.map(file => (<div key={file.id} className="file-item"><div className="file-icon"><Paperclip size={14} /></div><div className="file-info"><span className="file-name">{file.name}</span><span className="file-size">{file.size}</span></div><button onClick={() => handleRemoveFile(file.id)} className="file-remove"><X size={14} /></button></div>))}</div>)}
            </div>
          </div>
          <div className={`section-card input-card ${!jobInfo.partNo ? 'disabled' : ''}`}>
            <h3>บันทึกค่าความแข็ง - {inspectionMode}</h3>
            <form onSubmit={handleAddMeasurement} className="input-wrapper">
              <input ref={inputRef} type="number" step="0.1" placeholder={jobInfo.partNo ? "00.0" : "เลือก Part ก่อน"} value={currentInput} onChange={e => setCurrentInput(e.target.value)} className="big-input" disabled={!jobInfo.partNo || (samplingEnabled && measurements.length >= samplingSize)} />
              <div className="scale-display">{jobInfo.scale || customScale}</div>
              <button type="submit" className="add-btn" disabled={!jobInfo.partNo || (samplingEnabled && measurements.length >= samplingSize)}><PlusCircle size={24} /> บันทึก</button>
            </form>
            <div className="status-preview">{currentInput && jobInfo.partNo && (<span className={`badge-lg ${checkStatus(currentInput).toLowerCase()}`}>{checkStatus(currentInput) === 'PASS' ? 'ผ่าน' : 'ไม่ผ่าน'}</span>)}</div>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" /><XAxis dataKey="pieceNo" label={{ value: 'Piece #', position: 'insideBottom', offset: -5 }} /><YAxis domain={[jobInfo.specMin - 5, jobInfo.specMax + 5]} /><Tooltip /><ReferenceLine y={jobInfo.specMax} stroke="red" strokeDasharray="3 3" label="Max" /><ReferenceLine y={jobInfo.specMin} stroke="red" strokeDasharray="3 3" label="Min" /><Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={(props) => { const fill = props.payload.inspectionType === 'Core' ? '#10b981' : '#2563eb'; return <circle cx={props.cx} cy={props.cy} r={4} fill={fill} />; }} />
                  </LineChart>
                ) : (<div className="chart-placeholder"><Activity size={48} className="text-gray-300" /><p className="text-gray-400">ไม่มีข้อมูลสำหรับแสดงกราฟ</p></div>)}
              </ResponsiveContainer>
            </div>
          </div>
          <div className="section-card table-card">
            <div className="table-header-row">
              <h3>บันทึกการตรวจสอบ (Current Session)</h3>
              <div className="table-actions"><button className="btn-icon text-red" onClick={handleReset} disabled={measurements.length === 0}><RotateCcw size={18} /> ล้างข้อมูล</button><button className="btn-icon text-green" onClick={handleSaveReport} disabled={measurements.length === 0}><Save size={18} /> บันทึก</button></div>
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
                    <tr key={m.id}><td>{m.pieceNo}</td><td>{m.timestamp}</td><td className="value-cell">{m.value.toFixed(1)} {m.scale}</td><td><span className={`type-badge ${m.inspectionType.toLowerCase()}`}>{m.inspectionType === 'Surface' ? 'ผิว' : 'แกน'}</span></td><td><span className={`status-pill ${m.status.toLowerCase()}`}>{m.status === 'PASS' ? <CheckCircle2 size={12}/> : <XCircle size={12}/>} {m.status}</span></td><td><button onClick={() => handleDelete(m.id)} className="btn-trash"><Trash2 size={14} /></button></td></tr>
                  ))}
                  {filteredMeasurements.length === 0 && (<tr><td colSpan="6" className="no-data"><Database size={24} className="icon-gray" />ยังไม่มีการบันทึกข้อมูลในรอบนี้</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
         </div>
      </div>

      {/* --- Monthly History Log --- */}
      <div className="section-card history-section mt-5" style={{ marginTop: '20px' }}>
        <div className="card-title"><History size={24} className="text-orange-500" /><h2>ประวัติการตรวจสอบประจำเดือน (Monthly Inspection History)</h2></div>
        <div className="table-scroll" style={{ maxHeight: '600px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th><Calendar size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }}/> Date</th>
                <th>Part No</th>
                <th>Lot No</th>
                <th>Heat No (Int)</th> 
                <th>Point</th>
                <th>Value</th>
                <th>Result</th>
                <th>Inspector</th>
                <th>Note / Edit</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {historyList.map((log) => (
                <tr key={log.id}>
                  <td>{log.date}</td>
                  <td style={{ fontWeight: '500' }}>{log.partNo}</td>
                  <td>{log.lotNo}</td>
                  <td>{log.internalHeatNo || '-'}</td>
                  <td><span className={`type-badge ${log.point?.toLowerCase()}`}>{log.point}</span></td>
                  <td className="value-cell">{log.value} {log.scale}</td>
                  <td><span className={`status-pill ${log.status?.toLowerCase()}`}>{log.status === 'PASS' ? <CheckCircle2 size={12}/> : <XCircle size={12}/>} {log.status}</span></td>
                  <td>{log.inspector}</td>
                  <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{log.editDetails}</td>
                  <td className="flex gap-2">
                    <button onClick={() => handleViewDetails(log.id)} className="btn-icon-text text-blue" title="ดูรายละเอียด">{isLoadingDetails && selectedJobDetails?.header?.job_id === log.id ? <Loader2 size={18} className="animate-spin"/> : <FileSearch size={18} />}</button>
                    <button onClick={() => handleEditClick(log.id)} className="btn-icon-text text-orange-500" title="แก้ไข"><Edit size={18} /></button>
                    <button onClick={() => handleDeleteHistory(log.id)} className="btn-icon-text text-red-500" title="ลบ"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
              {historyList.length === 0 && (<tr><td colSpan="10" className="no-data">ไม่พบข้อมูลประวัติในเดือนนี้</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HardnessInspection;