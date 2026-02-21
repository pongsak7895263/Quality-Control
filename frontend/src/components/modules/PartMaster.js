import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, Edit3, Trash2, Save, X, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Filter, Download, RefreshCw,
  Package, FileText, Image, AlertCircle, CheckCircle2, Loader2,
  Database, Hash, Layers, Target, ArrowUpDown, ArrowUp, ArrowDown, Copy, Eye
} from 'lucide-react';

import './partmastermanagement.css';

// --- Config ---
const API_BASE_URL = 'http://192.168.0.26:5000/api/hardness'; 

const HARDNESS_SCALES = ['HRC', 'HRB', 'HRA', 'HV', 'HB'];

// ✅ เปลี่ยน Key เป็นตัวเล็กทั้งหมด
const INITIAL_PART = {
  partno: '',
  partname: '',
  material: '',
  specmin: '',
  specmax: '',
  scale: 'HRC',
  standardref: '',
  standardimage: '',
  description: '',
  category: '',
  isactive: true
};

const PartMasterManagement = ({ onBack }) => {
  // --- State ---
  const [parts, setParts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScale, setFilterScale] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); 
  const [currentPart, setCurrentPart] = useState(INITIAL_PART);
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  // Pagination & Sort
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'partno', direction: 'asc' }); // ✅ ใช้ partno

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/parts`);
      if (response.ok) {
        const data = await response.json();
        // Backend ส่งมาเป็นตัวเล็กแล้ว ใช้งานได้เลย
        setParts(data);
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
      showToast('error', 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredAndSortedParts = useMemo(() => {
    let result = [...parts];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.partno?.toLowerCase().includes(term) || // ✅ ใช้ partno
        p.partname?.toLowerCase().includes(term) || // ✅ ใช้ partname
        p.material?.toLowerCase().includes(term)
      );
    }
    
    if (filterScale) {
      result = result.filter(p => p.scale === filterScale);
    }
    
    if (filterStatus) {
      const isActive = filterStatus === 'active';
      result = result.filter(p => p.isactive === isActive); // ✅ ใช้ isactive
    }
    
    result.sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [parts, searchTerm, filterScale, filterStatus, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedParts.length / itemsPerPage);
  const paginatedParts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedParts.slice(start, start + itemsPerPage);
  }, [filteredAndSortedParts, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterScale, filterStatus]);

  const openAddModal = () => {
    setCurrentPart(INITIAL_PART);
    setFormErrors({});
    setModalMode('add');
    setIsModalOpen(true);
  };

  const openEditModal = (part) => {
    setCurrentPart({ ...part });
    setFormErrors({});
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const openViewModal = (part) => {
    setCurrentPart({ ...part });
    setModalMode('view');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentPart(INITIAL_PART);
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentPart(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!currentPart.partno?.trim()) errors.partno = 'กรุณาระบุ Part No'; // ✅ partno
    if (!currentPart.partname?.trim()) errors.partname = 'กรุณาระบุ Part Name'; // ✅ partname
    if (!currentPart.material?.trim()) errors.material = 'กรุณาระบุ Material';
    if (!currentPart.specmin && currentPart.specmin !== 0) errors.specmin = 'กรุณาระบุค่า Min'; // ✅ specmin
    if (!currentPart.specmax && currentPart.specmax !== 0) errors.specmax = 'กรุณาระบุค่า Max'; // ✅ specmax
    
    if (Number(currentPart.specmin) >= Number(currentPart.specmax)) {
      errors.specmax = 'ค่า Max ต้องมากกว่า Min';
    }
    
    if (modalMode === 'add' && parts.some(p => p.partno === currentPart.partno)) {
      errors.partno = 'Part No นี้มีอยู่แล้ว';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      // ✅ ส่งข้อมูลเป็นตัวเล็กทั้งหมดไป Backend
      const url = modalMode === 'add' 
        ? `${API_BASE_URL}/parts`
        : `${API_BASE_URL}/parts/${currentPart.partno}`; // ✅ partno
      
      const method = modalMode === 'add' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentPart)
      });
      
      if (response.ok) {
        showToast('success', modalMode === 'add' ? 'เพิ่มข้อมูลสำเร็จ' : 'แก้ไขข้อมูลสำเร็จ');
        closeModal();
        fetchParts();
      } else {
        const err = await response.json();
        throw new Error(err.message || 'Save failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      showToast('error', error.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (partno) => { // ✅ รับ partno
    try {
      const response = await fetch(`${API_BASE_URL}/parts/${partno}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        showToast('success', 'ลบข้อมูลสำเร็จ');
        setDeleteConfirm(null);
        fetchParts();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      showToast('error', 'เกิดข้อผิดพลาดในการลบ');
    }
  };

  const handleDuplicate = (part) => {
    setCurrentPart({
      ...part,
      partno: `${part.partno}-COPY`, // ✅ partno
      partname: `${part.partname} (Copy)` // ✅ partname
    });
    setFormErrors({});
    setModalMode('add');
    setIsModalOpen(true);
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="pm-sort-icon" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="pm-sort-icon active" />
      : <ArrowDown size={14} className="pm-sort-icon active" />;
  };

  if (isLoading) {
    return (
      <div className="pm-loading">
        <div className="pm-loading-content">
          <Loader2 size={48} className="pm-spinner" />
          <h2>Part Master Management</h2>
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pm-container">
      {toast && (
        <div className={`pm-toast pm-toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
      
      {deleteConfirm && (
        <div className="pm-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="pm-modal pm-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="pm-modal-header pm-modal-header-danger">
              <div className="pm-modal-title"><AlertCircle size={20} /><span>ยืนยันการลบ</span></div>
            </div>
            <div className="pm-modal-body">
              <p className="pm-confirm-text">คุณต้องการลบ Part No: <strong>{deleteConfirm}</strong> หรือไม่?</p>
            </div>
            <div className="pm-modal-footer">
              <button onClick={() => setDeleteConfirm(null)} className="pm-btn pm-btn-secondary">ยกเลิก</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="pm-btn pm-btn-danger"><Trash2 size={16} /> ลบข้อมูล</button>
            </div>
          </div>
        </div>
      )}
      
      {isModalOpen && (
        <div className="pm-modal-overlay" onClick={closeModal}>
          <div className="pm-modal pm-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="pm-modal-header">
              <div className="pm-modal-title">
                {modalMode === 'add' && <><Plus size={20} /><span>เพิ่ม Part ใหม่</span></>}
                {modalMode === 'edit' && <><Edit3 size={20} /><span>แก้ไขข้อมูล Part</span></>}
                {modalMode === 'view' && <><Eye size={20} /><span>รายละเอียด Part</span></>}
              </div>
              <button onClick={closeModal} className="pm-modal-close"><X size={20} /></button>
            </div>
            
            <div className="pm-modal-body">
              <div className="pm-form">
                <div className="pm-form-row">
                  <div className="pm-form-group">
                    <label className="pm-label pm-label-required"><Hash size={14} /> Part No</label>
                    {/* ✅ name="partno" */}
                    <input type="text" name="partno" value={currentPart.partno} onChange={handleInputChange}
                      className={`pm-input ${formErrors.partno ? 'pm-input-error' : ''}`} placeholder="เช่น P-001" disabled={modalMode === 'edit' || modalMode === 'view'} />
                    {formErrors.partno && <span className="pm-error">{formErrors.partno}</span>}
                  </div>
                  
                  <div className="pm-form-group">
                    <label className="pm-label pm-label-required"><Package size={14} /> Part Name</label>
                    {/* ✅ name="partname" */}
                    <input type="text" name="partname" value={currentPart.partname} onChange={handleInputChange}
                      className={`pm-input ${formErrors.partname ? 'pm-input-error' : ''}`} placeholder="ชื่อชิ้นงาน" disabled={modalMode === 'view'} />
                    {formErrors.partname && <span className="pm-error">{formErrors.partname}</span>}
                  </div>
                </div>
                
                <div className="pm-form-row">
                  <div className="pm-form-group">
                    <label className="pm-label pm-label-required"><Layers size={14} /> Material</label>
                    <input type="text" name="material" value={currentPart.material} onChange={handleInputChange}
                      className={`pm-input ${formErrors.material ? 'pm-input-error' : ''}`} disabled={modalMode === 'view'} />
                  </div>
                  <div className="pm-form-group">
                    <label className="pm-label"><Database size={14} /> Category</label>
                    <input type="text" name="category" value={currentPart.category} onChange={handleInputChange} className="pm-input" disabled={modalMode === 'view'} />
                  </div>
                </div>
                
                <div className="pm-form-section">
                  <h3 className="pm-section-title"><Target size={16} /> Hardness Specification</h3>
                  <div className="pm-spec-row">
                    <div className="pm-form-group">
                      <label className="pm-label pm-label-required">Min</label>
                      {/* ✅ name="specmin" */}
                      <input type="number" name="specmin" value={currentPart.specmin} onChange={handleInputChange}
                        className={`pm-input pm-input-spec ${formErrors.specmin ? 'pm-input-error' : ''}`} disabled={modalMode === 'view'} />
                    </div>
                    <span className="pm-spec-divider">—</span>
                    <div className="pm-form-group">
                      <label className="pm-label pm-label-required">Max</label>
                      {/* ✅ name="specmax" */}
                      <input type="number" name="specmax" value={currentPart.specmax} onChange={handleInputChange}
                        className={`pm-input pm-input-spec ${formErrors.specmax ? 'pm-input-error' : ''}`} disabled={modalMode === 'view'} />
                    </div>
                    <div className="pm-form-group">
                      <label className="pm-label">Scale</label>
                      <select name="scale" value={currentPart.scale} onChange={handleInputChange} className="pm-select" disabled={modalMode === 'view'}>
                        {HARDNESS_SCALES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="pm-form-section">
                  <h3 className="pm-section-title"><FileText size={16} /> Inspection Standard</h3>
                  <div className="pm-form-row">
                    <div className="pm-form-group">
                      <label className="pm-label">Standard Reference</label>
                      {/* ✅ name="standardref" */}
                      <input type="text" name="standardref" value={currentPart.standardref} onChange={handleInputChange} className="pm-input" disabled={modalMode === 'view'} />
                    </div>
                  </div>
                </div>
                
                <div className="pm-form-group pm-form-group-full">
                  <label className="pm-label">Description / Note</label>
                  <textarea name="description" value={currentPart.description} onChange={handleInputChange} className="pm-textarea" rows="3" disabled={modalMode === 'view'} />
                </div>
                
                <div className="pm-form-group">
                  <label className="pm-switch-label">
                    {/* ✅ name="isactive" */}
                    <input type="checkbox" name="isactive" checked={currentPart.isactive} onChange={handleInputChange} className="pm-checkbox" disabled={modalMode === 'view'} />
                    <span className="pm-switch-slider"></span>
                    <span className="pm-switch-text">{currentPart.isactive ? 'Active' : 'Inactive'}</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="pm-modal-footer">
              <button onClick={closeModal} className="pm-btn pm-btn-secondary">{modalMode === 'view' ? 'ปิด' : 'ยกเลิก'}</button>
              {modalMode !== 'view' && (
                <button onClick={handleSave} className="pm-btn pm-btn-primary" disabled={isSaving}>
                  {isSaving ? <><Loader2 size={16} className="pm-spinner" /> กำลังบันทึก...</> : <><Save size={16} /> บันทึก</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="pm-header">
        <div className="pm-header-left">
          <button onClick={onBack} className="pm-btn pm-btn-ghost"><ChevronLeft size={20} /><span>กลับ</span></button>
          <div className="pm-header-title"><h1>Part Master Management</h1></div>
        </div>
        <div className="pm-header-right">
          <button onClick={fetchParts} className="pm-btn pm-btn-outline"><RefreshCw size={16} /></button>
          <button onClick={openAddModal} className="pm-btn pm-btn-primary"><Plus size={16} /><span>เพิ่ม Part ใหม่</span></button>
        </div>
      </header>

      <section className="pm-filters">
        <div className="pm-search-wrapper">
          <Search size={18} className="pm-search-icon" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pm-search-input" placeholder="ค้นหา Part No..." />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="pm-search-clear"><X size={16} /></button>}
        </div>
        <div className="pm-results-count">พบ <strong>{filteredAndSortedParts.length}</strong> รายการ</div>
      </section>

      <section className="pm-table-section">
        <div className="pm-table-wrapper">
          <table className="pm-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('partno')} className="pm-th-sortable">Part No {renderSortIcon('partno')}</th>
                <th onClick={() => handleSort('partname')} className="pm-th-sortable">Part Name {renderSortIcon('partname')}</th>
                <th onClick={() => handleSort('material')} className="pm-th-sortable">Material {renderSortIcon('material')}</th>
                <th>Spec (Min-Max)</th>
                <th>Scale</th>
                <th>Status</th>
                <th className="pm-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedParts.map((part) => (
                <tr key={part.partno} className={!part.isactive ? 'pm-row-inactive' : ''}>
                  <td className="pm-td-partno">{part.partno}</td>
                  <td>{part.partname}</td>
                  <td className="pm-td-material">{part.material}</td>
                  <td className="pm-td-spec"><span className="pm-spec-badge">{part.specmin} - {part.specmax}</span></td>
                  <td><span className="pm-scale-badge">{part.scale}</span></td>
                  <td><span className={`pm-status ${part.isactive ? 'pm-status-active' : 'pm-status-inactive'}`}>{part.isactive ? 'Active' : 'Inactive'}</span></td>
                  <td className="pm-td-actions">
                    <div className="pm-action-group">
                      <button onClick={() => openViewModal(part)} className="pm-action-btn"><Eye size={16} /></button>
                      <button onClick={() => openEditModal(part)} className="pm-action-btn pm-action-edit"><Edit3 size={16} /></button>
                      <button onClick={() => handleDuplicate(part)} className="pm-action-btn"><Copy size={16} /></button>
                      <button onClick={() => setDeleteConfirm(part.partno)} className="pm-action-btn pm-action-delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedParts.length === 0 && (
                <tr><td colSpan="8" className="pm-table-empty"><Database size={32} /><span>ไม่พบข้อมูล</span></td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls ... (Same logic, updated props if needed) */}
      </section>
    </div>
  );
};

export default PartMasterManagement;