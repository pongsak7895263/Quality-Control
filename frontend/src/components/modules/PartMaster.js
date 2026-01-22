import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Package,
  FileText,
  Image,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MoreVertical,
  Copy,
  Eye,
  Settings,
  Database,
  Hash,
  Layers,
  Target,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

import './partmastermanagement.css';

// --- Config ---
const API_BASE_URL = 'http://192.168.0.26:5000/api/hardness'; 

const HARDNESS_SCALES = ['HRC', 'HRB', 'HRA', 'HV', 'HB'];

const INITIAL_PART = {
  partNo: '',
  partName: '',
  material: '',
  specMin: '',
  specMax: '',
  scale: 'HRC',
  standardRef: '',
  standardImage: '',
  description: '',
  category: '',
  isActive: true
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
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit' | 'view'
  const [currentPart, setCurrentPart] = useState(INITIAL_PART);
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete Confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'partNo', direction: 'asc' });
  
  // Toast
  const [toast, setToast] = useState(null);

  // --- Fetch Data ---
  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/parts`);
      if (response.ok) {
        const data = await response.json();
        setParts(data);
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
      showToast('error', 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Toast ---
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Sorting ---
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // --- Filtering & Sorting ---
  const filteredAndSortedParts = useMemo(() => {
    let result = [...parts];
    
    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.partNo?.toLowerCase().includes(term) ||
        p.partName?.toLowerCase().includes(term) ||
        p.material?.toLowerCase().includes(term)
      );
    }
    
    // Filter by scale
    if (filterScale) {
      result = result.filter(p => p.scale === filterScale);
    }
    
    // Filter by status
    if (filterStatus) {
      const isActive = filterStatus === 'active';
      result = result.filter(p => p.isActive === isActive);
    }
    
    // Sort
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

  // --- Pagination ---
  const totalPages = Math.ceil(filteredAndSortedParts.length / itemsPerPage);
  const paginatedParts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedParts.slice(start, start + itemsPerPage);
  }, [filteredAndSortedParts, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterScale, filterStatus]);

  // --- Modal Handlers ---
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

  // --- Form Handlers ---
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentPart(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error on change
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!currentPart.partNo?.trim()) {
      errors.partNo = 'กรุณาระบุ Part No';
    }
    
    if (!currentPart.partName?.trim()) {
      errors.partName = 'กรุณาระบุ Part Name';
    }
    
    if (!currentPart.material?.trim()) {
      errors.material = 'กรุณาระบุ Material';
    }
    
    if (!currentPart.specMin && currentPart.specMin !== 0) {
      errors.specMin = 'กรุณาระบุค่า Min';
    }
    
    if (!currentPart.specMax && currentPart.specMax !== 0) {
      errors.specMax = 'กรุณาระบุค่า Max';
    }
    
    if (Number(currentPart.specMin) >= Number(currentPart.specMax)) {
      errors.specMax = 'ค่า Max ต้องมากกว่า Min';
    }
    
    // Check duplicate Part No (for add mode)
    if (modalMode === 'add' && parts.some(p => p.partNo === currentPart.partNo)) {
      errors.partNo = 'Part No นี้มีอยู่แล้ว';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsSaving(true);
    
    try {
      const url = modalMode === 'add' 
        ? `${API_BASE_URL}/parts`
        : `${API_BASE_URL}/parts/${currentPart.partNo}`;
      
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
        throw new Error('Save failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      showToast('error', 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Delete Handler ---
  const handleDelete = async (partNo) => {
    try {
      const response = await fetch(`${API_BASE_URL}/parts/${partNo}`, {
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
      console.error('Delete error:', error);
      showToast('error', 'เกิดข้อผิดพลาดในการลบ');
    }
  };

  // --- Duplicate Handler ---
  const handleDuplicate = (part) => {
    setCurrentPart({
      ...part,
      partNo: `${part.partNo}-COPY`,
      partName: `${part.partName} (Copy)`
    });
    setFormErrors({});
    setModalMode('add');
    setIsModalOpen(true);
  };

  // --- Render Sort Icon ---
  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown size={14} className="pm-sort-icon" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="pm-sort-icon active" />
      : <ArrowDown size={14} className="pm-sort-icon active" />;
  };

  // --- Loading State ---
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
      
      {/* Toast */}
      {toast && (
        <div className={`pm-toast pm-toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="pm-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="pm-modal pm-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="pm-modal-header pm-modal-header-danger">
              <div className="pm-modal-title">
                <AlertCircle size={20} />
                <span>ยืนยันการลบ</span>
              </div>
            </div>
            <div className="pm-modal-body">
              <p className="pm-confirm-text">
                คุณต้องการลบ Part No: <strong>{deleteConfirm}</strong> หรือไม่?
              </p>
              <p className="pm-confirm-warning">
                การดำเนินการนี้ไม่สามารถย้อนกลับได้
              </p>
            </div>
            <div className="pm-modal-footer">
              <button onClick={() => setDeleteConfirm(null)} className="pm-btn pm-btn-secondary">
                ยกเลิก
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="pm-btn pm-btn-danger">
                <Trash2 size={16} />
                ลบข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="pm-modal-overlay" onClick={closeModal}>
          <div className="pm-modal pm-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="pm-modal-header">
              <div className="pm-modal-title">
                {modalMode === 'add' && <><Plus size={20} /><span>เพิ่ม Part ใหม่</span></>}
                {modalMode === 'edit' && <><Edit3 size={20} /><span>แก้ไขข้อมูล Part</span></>}
                {modalMode === 'view' && <><Eye size={20} /><span>รายละเอียด Part</span></>}
              </div>
              <button onClick={closeModal} className="pm-modal-close">
                <X size={20} />
              </button>
            </div>
            
            <div className="pm-modal-body">
              <div className="pm-form">
                {/* Row 1: Part No & Part Name */}
                <div className="pm-form-row">
                  <div className="pm-form-group">
                    <label className="pm-label pm-label-required">
                      <Hash size={14} /> Part No
                    </label>
                    <input
                      type="text"
                      name="partNo"
                      value={currentPart.partNo}
                      onChange={handleInputChange}
                      className={`pm-input ${formErrors.partNo ? 'pm-input-error' : ''}`}
                      placeholder="เช่น P-001"
                      disabled={modalMode === 'edit' || modalMode === 'view'}
                    />
                    {formErrors.partNo && (
                      <span className="pm-error">{formErrors.partNo}</span>
                    )}
                  </div>
                  
                  <div className="pm-form-group">
                    <label className="pm-label pm-label-required">
                      <Package size={14} /> Part Name
                    </label>
                    <input
                      type="text"
                      name="partName"
                      value={currentPart.partName}
                      onChange={handleInputChange}
                      className={`pm-input ${formErrors.partName ? 'pm-input-error' : ''}`}
                      placeholder="ชื่อชิ้นงาน"
                      disabled={modalMode === 'view'}
                    />
                    {formErrors.partName && (
                      <span className="pm-error">{formErrors.partName}</span>
                    )}
                  </div>
                </div>
                
                {/* Row 2: Material & Category */}
                <div className="pm-form-row">
                  <div className="pm-form-group">
                    <label className="pm-label pm-label-required">
                      <Layers size={14} /> Material
                    </label>
                    <input
                      type="text"
                      name="material"
                      value={currentPart.material}
                      onChange={handleInputChange}
                      className={`pm-input ${formErrors.material ? 'pm-input-error' : ''}`}
                      placeholder="เช่น SCM440, S45C"
                      disabled={modalMode === 'view'}
                    />
                    {formErrors.material && (
                      <span className="pm-error">{formErrors.material}</span>
                    )}
                  </div>
                  
                  <div className="pm-form-group">
                    <label className="pm-label">
                      <Database size={14} /> Category
                    </label>
                    <input
                      type="text"
                      name="category"
                      value={currentPart.category}
                      onChange={handleInputChange}
                      className="pm-input"
                      placeholder="หมวดหมู่ (ถ้ามี)"
                      disabled={modalMode === 'view'}
                    />
                  </div>
                </div>
                
                {/* Row 3: Specification */}
                <div className="pm-form-section">
                  <h3 className="pm-section-title">
                    <Target size={16} /> Hardness Specification
                  </h3>
                  <div className="pm-spec-row">
                    <div className="pm-form-group">
                      <label className="pm-label pm-label-required">Min</label>
                      <input
                        type="number"
                        name="specMin"
                        value={currentPart.specMin}
                        onChange={handleInputChange}
                        className={`pm-input pm-input-spec ${formErrors.specMin ? 'pm-input-error' : ''}`}
                        placeholder="0"
                        disabled={modalMode === 'view'}
                      />
                      {formErrors.specMin && (
                        <span className="pm-error">{formErrors.specMin}</span>
                      )}
                    </div>
                    
                    <span className="pm-spec-divider">—</span>
                    
                    <div className="pm-form-group">
                      <label className="pm-label pm-label-required">Max</label>
                      <input
                        type="number"
                        name="specMax"
                        value={currentPart.specMax}
                        onChange={handleInputChange}
                        className={`pm-input pm-input-spec ${formErrors.specMax ? 'pm-input-error' : ''}`}
                        placeholder="0"
                        disabled={modalMode === 'view'}
                      />
                      {formErrors.specMax && (
                        <span className="pm-error">{formErrors.specMax}</span>
                      )}
                    </div>
                    
                    <div className="pm-form-group">
                      <label className="pm-label">Scale</label>
                      <select
                        name="scale"
                        value={currentPart.scale}
                        onChange={handleInputChange}
                        className="pm-select"
                        disabled={modalMode === 'view'}
                      >
                        {HARDNESS_SCALES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Row 4: Standard Reference */}
                <div className="pm-form-section">
                  <h3 className="pm-section-title">
                    <FileText size={16} /> Inspection Standard
                  </h3>
                  <div className="pm-form-row">
                    <div className="pm-form-group">
                      <label className="pm-label">Standard Reference</label>
                      <input
                        type="text"
                        name="standardRef"
                        value={currentPart.standardRef}
                        onChange={handleInputChange}
                        className="pm-input"
                        placeholder="เช่น IS-HT-001"
                        disabled={modalMode === 'view'}
                      />
                    </div>
                    
                    <div className="pm-form-group">
                      <label className="pm-label">
                        <Image size={14} /> Standard Image URL
                      </label>
                      <input
                        type="text"
                        name="standardImage"
                        value={currentPart.standardImage}
                        onChange={handleInputChange}
                        className="pm-input"
                        placeholder="URL รูปภาพมาตรฐาน"
                        disabled={modalMode === 'view'}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Row 5: Description */}
                <div className="pm-form-group pm-form-group-full">
                  <label className="pm-label">Description / Note</label>
                  <textarea
                    name="description"
                    value={currentPart.description}
                    onChange={handleInputChange}
                    className="pm-textarea"
                    rows="3"
                    placeholder="รายละเอียดเพิ่มเติม..."
                    disabled={modalMode === 'view'}
                  />
                </div>
                
                {/* Row 6: Status */}
                <div className="pm-form-group">
                  <label className="pm-switch-label">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={currentPart.isActive}
                      onChange={handleInputChange}
                      className="pm-checkbox"
                      disabled={modalMode === 'view'}
                    />
                    <span className="pm-switch-slider"></span>
                    <span className="pm-switch-text">
                      {currentPart.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="pm-modal-footer">
              <button onClick={closeModal} className="pm-btn pm-btn-secondary">
                {modalMode === 'view' ? 'ปิด' : 'ยกเลิก'}
              </button>
              {modalMode !== 'view' && (
                <button 
                  onClick={handleSave} 
                  className="pm-btn pm-btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <><Loader2 size={16} className="pm-spinner" /> กำลังบันทึก...</>
                  ) : (
                    <><Save size={16} /> บันทึก</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="pm-header">
        <div className="pm-header-left">
          <button onClick={onBack} className="pm-btn pm-btn-ghost">
            <ChevronLeft size={20} />
            <span>กลับ</span>
          </button>
          <div className="pm-header-title">
            <div className="pm-logo">
              <Settings size={24} />
            </div>
            <div>
              <h1>Part Master Management</h1>
              <span>จัดการข้อมูล Part สำหรับการตรวจสอบความแข็ง</span>
            </div>
          </div>
        </div>
        <div className="pm-header-right">
          <button onClick={fetchParts} className="pm-btn pm-btn-outline" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button className="pm-btn pm-btn-outline">
            <Download size={16} />
            <span>Export</span>
          </button>
          <button onClick={openAddModal} className="pm-btn pm-btn-primary">
            <Plus size={16} />
            <span>เพิ่ม Part ใหม่</span>
          </button>
        </div>
      </header>

      {/* Filters & Search */}
      <section className="pm-filters">
        <div className="pm-search-wrapper">
          <Search size={18} className="pm-search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pm-search-input"
            placeholder="ค้นหา Part No, Part Name, Material..."
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="pm-search-clear">
              <X size={16} />
            </button>
          )}
        </div>
        
        <div className="pm-filter-group">
          <div className="pm-filter-item">
            <Filter size={14} />
            <select
              value={filterScale}
              onChange={(e) => setFilterScale(e.target.value)}
              className="pm-filter-select"
            >
              <option value="">Scale ทั้งหมด</option>
              {HARDNESS_SCALES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          
          <div className="pm-filter-item">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pm-filter-select"
            >
              <option value="">สถานะทั้งหมด</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        
        <div className="pm-results-count">
          พบ <strong>{filteredAndSortedParts.length}</strong> รายการ
        </div>
      </section>

      {/* Data Table */}
      <section className="pm-table-section">
        <div className="pm-table-wrapper">
          <table className="pm-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('partNo')} className="pm-th-sortable">
                  Part No {renderSortIcon('partNo')}
                </th>
                <th onClick={() => handleSort('partName')} className="pm-th-sortable">
                  Part Name {renderSortIcon('partName')}
                </th>
                <th onClick={() => handleSort('material')} className="pm-th-sortable">
                  Material {renderSortIcon('material')}
                </th>
                <th>Spec (Min-Max)</th>
                <th onClick={() => handleSort('scale')} className="pm-th-sortable">
                  Scale {renderSortIcon('scale')}
                </th>
                <th>Standard Ref</th>
                <th>Status</th>
                <th className="pm-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedParts.map((part) => (
                <tr key={part.partNo} className={!part.isActive ? 'pm-row-inactive' : ''}>
                  <td className="pm-td-partno">{part.partNo}</td>
                  <td>{part.partName}</td>
                  <td className="pm-td-material">{part.material}</td>
                  <td className="pm-td-spec">
                    <span className="pm-spec-badge">
                      {part.specMin} - {part.specMax}
                    </span>
                  </td>
                  <td>
                    <span className="pm-scale-badge">{part.scale}</span>
                  </td>
                  <td className="pm-td-ref">
                    {part.standardRef || '-'}
                  </td>
                  <td>
                    <span className={`pm-status ${part.isActive ? 'pm-status-active' : 'pm-status-inactive'}`}>
                      {part.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="pm-td-actions">
                    <div className="pm-action-group">
                      <button 
                        onClick={() => openViewModal(part)}
                        className="pm-action-btn"
                        title="ดูรายละเอียด"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => openEditModal(part)}
                        className="pm-action-btn pm-action-edit"
                        title="แก้ไข"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDuplicate(part)}
                        className="pm-action-btn"
                        title="คัดลอก"
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm(part.partNo)}
                        className="pm-action-btn pm-action-delete"
                        title="ลบ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedParts.length === 0 && (
                <tr>
                  <td colSpan="8" className="pm-table-empty">
                    <Database size={32} />
                    <span>ไม่พบข้อมูล</span>
                    {searchTerm && <p>ลองค้นหาด้วยคำอื่น หรือล้างตัวกรอง</p>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pm-pagination">
            <div className="pm-pagination-info">
              แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedParts.length)} จาก {filteredAndSortedParts.length}
            </div>
            
            <div className="pm-pagination-controls">
              <button 
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="pm-page-btn"
              >
                <ChevronsLeft size={16} />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="pm-page-btn"
              >
                <ChevronLeft size={16} />
              </button>
              
              <div className="pm-page-numbers">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`pm-page-num ${currentPage === pageNum ? 'active' : ''}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="pm-page-btn"
              >
                <ChevronRight size={16} />
              </button>
              <button 
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="pm-page-btn"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
            
            <div className="pm-page-size">
              <span>แสดง</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="pm-page-size-select"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>รายการ</span>
            </div>
          </div>
        )}
      </section>

    </div>
  );
};

export default PartMasterManagement;