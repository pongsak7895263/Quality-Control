/**
 * MaterialInspection.jsx
 * ระบบตรวจสอบวัตถุดิบ - Material Inspection Management System
 * ฉบับสมบูรณ์ (Full Version)
 * 
 * Features:
 * - ✅ Search by Type (Batch, Supplier, etc.)
 * - ✅ Datalist Autocomplete (Batch, Supplier, Maker)
 * - ✅ Appearance Check (OK/NG) for Bar Inspection
 * - ✅ Save & Continue (Keep Modal Open)
 * - ✅ Prevent Accidental Modal Close
 * - ✅ File Upload (PDF/Image support)
 * - ✅ Navigate to Report Page
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from 'react-router-dom'; // ✅ เพิ่ม useNavigate
import useAuth from "../../hooks/useAuth";
import { API_BASE_URL } from '../../config';
import "./MaterialInspection.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

// ============================================
// 🔧 CONFIGURATION & CONSTANTS
// ============================================

const DEBOUNCE_DELAY = 300;
const DEFAULT_PAGE_SIZE = 10;

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

// ============================================
// 🛠️ HELPER FUNCTIONS
// ============================================

const formatDate = (dateString) => {
  if (!dateString || dateString === "-") return "-";
  try {
    const date = new Date(dateString);
    if (date.getFullYear() > 2400) date.setFullYear(date.getFullYear() - 543);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (e) {
    return "-";
  }
};

const formatMonthYear = (date) =>
  date.toLocaleDateString("th-TH", { year: "numeric", month: "long" });

const getYearMonth = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: getYearMonth(date),
      label: formatMonthYear(date),
    });
  }
  return options;
};

const normalizeInspectionData = (data) => {
  if (!data) return null;

  const getArray = (key1, key2) =>
    Array.isArray(data[key1])
      ? data[key1]
      : Array.isArray(data[key2])
        ? data[key2]
        : [];

  return {
    id: data.id,
    inspectionNumber: data.inspection_number || data.inspectionNumber,
    materialType: data.material_type || data.materialType || "-",
    materialGrade: data.material_grade || data.materialGrade || "-",
    batchNumber: data.batch_number || data.batchNumber || "-",
    supplierName: data.supplier_name || data.supplierName || "-",
    makerMat: data.maker_mat || data.makerMat || "-",
    receiptDate: data.receipt_date || data.receiptDate,
    invoiceNumber: data.invoice_number || data.invoiceNumber || "-",
    cerNumber: data.cer_number || data.cerNumber || "-",
    inspector: data.inspector || "-",
    inspectionQuantity: data.inspection_quantity || data.inspectionQuantity || 0,
    notes: data.notes || "",
    overallResult: data.overall_result || data.overallResult || "pending",
    createdAt: data.created_at || data.createdAt,
    barInspections: getArray("bar_inspections", "barInspections"),
    rodInspections: getArray("rod_inspections", "rodInspections"),
    attachedFiles: getArray("attached_files", "InspectionFiles") || [],
    attachedImages: getArray("attached_images", "images") || [],
  };
};

const createInitialBarInspections = (data = [], count = 4) =>
  data.length > 0
    ? data.map((item) => ({
      barNumber: item.barNumber || item.bar_number,
      odMeasurement: item.odMeasurement || "",
      lengthMeasurement: item.lengthMeasurement || "",
      surfaceCondition: item.surfaceCondition || "",
      appearance: item.appearance || "OK",
    }))
    : Array.from({ length: count }, (_, i) => ({
      barNumber: i + 1,
      odMeasurement: "",
      lengthMeasurement: "",
      surfaceCondition: "",
      appearance: "OK",
    }));

const createInitialRodInspection = (data = [], count = 4) =>
  data.length > 0
    ? data.map((item, idx) => ({
      rodNumber: item.rodNumber || item.rod_number || idx + 1,
      diameter: item.diameter || "",
      length: item.length || "",
      weight: item.weight || "",
      surfaceCondition: item.surfaceCondition || "good",
    }))
    : Array.from({ length: count }, (_, i) => ({
      rodNumber: i + 1,
      diameter: "",
      length: "",
      weight: "",
      surfaceCondition: "good",
    }));

// ============================================
// 🎨 UI COMPONENTS
// ============================================

const LoadingComponent = ({ message = "Loading..." }) => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>{message}</p>
  </div>
);

const StatsCard = ({ icon, label, value, color }) => (
  <div className={`stats-card ${color}`}>
    <div className="stats-icon">{icon}</div>
    <div className="stats-content">
      <div className="stats-value">{value}</div>
      <div className="stats-label">{label}</div>
    </div>
  </div>
);

// ✅ SearchBar แบบใหม่: มี Dropdown เลือกประเภท
const SearchBar = ({ searchTerm, onSearchChange, onSearchClear, isSearching, searchType, onSearchTypeChange }) => (
  <div className="search-bar-container">
    <div className="search-input-wrapper">
      <select
        className="search-type-select"
        value={searchType}
        onChange={(e) => onSearchTypeChange(e.target.value)}
        style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#555', marginRight: '10px' }}
      >
        <option value="all">🔍 ทั้งหมด</option>
        <option value="batch">📦 Batch</option>
        <option value="supplier">🛒 ผู้จำหน่าย</option>
        <option value="invoice">📄 Invoice</option>
        <option value="grade">⭐ เกรด</option>
      </select>

      <div style={{ width: '1px', height: '20px', background: '#ddd', margin: '0 10px' }}></div>

      <input
        type="text"
        className="search-input"
        placeholder={
          searchType === 'all' ? "ค้นหา Batch, ผู้จำหน่าย, Invoice..." :
            searchType === 'batch' ? "กรอกเลข Batch..." :
              searchType === 'supplier' ? "กรอกชื่อผู้จำหน่าย..." :
                searchType === 'invoice' ? "กรอกเลข Invoice..." :
                  "กรอกเกรด..."
        }
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
      />
      {isSearching && <span style={{ marginRight: '5px' }}>⏳</span>}
      {searchTerm && (
        <button className="search-clear-btn" onClick={onSearchClear}>✕</button>
      )}
    </div>
  </div>
);

const MonthSelector = ({ selectedMonth, onMonthChange, monthOptions, showAllData, onToggleAllData }) => (
  <div className="month-selector-container">
    <div className="month-selector-wrapper">
      <label className="month-label">
        <span className="label-icon">📅</span>
        <span>เดือน:</span>
      </label>
      <select
        className="month-select"
        value={selectedMonth}
        onChange={(e) => onMonthChange(e.target.value)}
        disabled={showAllData}
      >
        {monthOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <label className="show-all-checkbox">
        <input
          type="checkbox"
          checked={showAllData}
          onChange={(e) => onToggleAllData(e.target.checked)}
        />
        <span>แสดงทั้งหมด</span>
      </label>
    </div>
  </div>
);

const FilterSection = ({ filters, onFilterChange, onClearFilters, materialGradeOptions, activeFilterCount, isExpanded, onToggleExpand }) => {
  const statusOptions = [
    { value: "", label: "ทุกสถานะ" },
    { value: "pass", label: "✅ ผ่าน" },
    { value: "fail", label: "❌ ไม่ผ่าน" },
    { value: "pending", label: "⏳ รอตรวจ" },
  ];

  const gradeOptions = [
    { value: "", label: "ทุกเกรด" },
    ...(materialGradeOptions || []).filter((opt) => opt.value !== ""),
  ];

  return (
    <div className={`filter-section-modern ${isExpanded ? "expanded" : "collapsed"}`}>
      <div className="filter-header-modern">
        <div className="filter-title-group">
          <button className="filter-toggle-btn" onClick={onToggleExpand}>
            <span className={`toggle-icon ${isExpanded ? "expanded" : ""}`}>▶</span>
            <h3>🎛️ ตัวกรองขั้นสูง</h3>
          </button>
          {activeFilterCount > 0 && (
            <span className="filter-badge">{activeFilterCount} ตัวกรอง</span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button className="btn-clear-filters" onClick={onClearFilters}>🗑️ ล้าง</button>
        )}
      </div>

      {isExpanded && (
        <div className="filter-grid-modern">
          <div className="filter-group-modern">
            <label className="filter-label"><span className="label-icon">📊</span><span>สถานะ</span></label>
            <select name="status" value={filters.status} onChange={onFilterChange} className="filter-input-modern">
              {statusOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className="filter-group-modern">
            <label className="filter-label"><span className="label-icon">⭐</span><span>เกรด</span></label>
            <select name="materialGrade" value={filters.materialGrade} onChange={onFilterChange} className="filter-input-modern">
              {gradeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className="filter-group-modern">
            <label className="filter-label"><span className="label-icon">🛒</span><span>ผู้จำหน่าย</span></label>
            <input type="text" name="supplier" placeholder="ค้นหา..." value={filters.supplier} onChange={onFilterChange} className="filter-input-modern" />
          </div>
          <div className="filter-group-modern">
            <label className="filter-label"><span className="label-icon">🔨</span><span>ผู้ผลิต</span></label>
            <input type="text" name="makerMat" placeholder="ค้นหา..." value={filters.makerMat} onChange={onFilterChange} className="filter-input-modern" />
          </div>
        </div>
      )}
    </div>
  );
};

// ------------------------------------------
// Component: InspectionTable
// ------------------------------------------
const InspectionTable = ({ inspections, onEdit, onView, onDelete, searchTerm, deletingId }) => {

  const highlight = (text, term) => {
    if (!term || !text) return text;
    const parts = String(text).split(new RegExp(`(${term})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase() ? <mark key={i} className="search-highlight">{part}</mark> : part
    );
  };

  const getFileType = (file) => {
    if (file.file_type) {
      if (file.file_type.toLowerCase().includes('pdf')) return 'pdf';
      if (file.file_type.toLowerCase().includes('image')) return 'image';
    }
    const name = file.original_name || file.file_path || "";
    const ext = name.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    return 'other';
  };

  const getFileUrl = (path) => {
    if (!path) return "#";
    const cleanPath = path.replace(/\\/g, "/").replace(/^\//, "");
    return path.startsWith("http") ? path : `${API_BASE_URL}/${cleanPath}`;
  };

  return (
    <div className="table-container">
      <div className="table-header">
        <h3>📋 รายการตรวจสอบวัตถุดิบ</h3>
        <span className="result-count">พบ {inspections?.length || 0} รายการ</span>
      </div>

      <div className="table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th width="5%" className="text-center">#</th>
              <th width="25%">📦 ข้อมูลวัตถุดิบ</th>
              <th width="25%">🏭 แหล่งที่มา</th>
              <th width="15%">📎 ไฟล์แนบ</th>
              <th width="10%">📅 วันที่</th>
              <th width="10%" className="text-center">สถานะ</th>
              <th width="5%" className="text-center">จำนวน</th>
              <th width="10%" className="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {inspections?.length > 0 ? (
              inspections.map((insp, i) => (
                <tr key={insp.id || i}>
                  <td className="text-center">{i + 1}</td>
                  <td>
                    <div className="info-group">
                      <span className="main-text fw-bold text-primary">{highlight(insp.batchNumber, searchTerm)}</span>
                      <div className="sub-info">
                        <span className="type-badge-small">{insp.materialType === "bar" ? "เหล็กเส้น" : "เหล็กท่อน"}</span>
                        <span className="grade-text">Grade: {highlight(insp.materialGrade, searchTerm)}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="info-group">
                      <div className="supplier-row"><span className="label-icon">🛒</span><span className="main-text">{highlight(insp.supplierName, searchTerm)}</span></div>
                      <div className="maker-row sub-text"><span className="label-icon">🔨</span><span>ผู้ผลิต: {highlight(insp.makerMat, searchTerm)}</span></div>
                    </div>
                  </td>
                  <td>
                    <div className="file-list-cell">
                      {[...(insp.attachedFiles || []), ...(insp.attachedImages || [])].length > 0 ? (
                        [...(insp.attachedFiles || []), ...(insp.attachedImages || [])].map((file, idx) => {
                          const fileType = getFileType(file);
                          const isPdf = fileType === 'pdf';
                          return (
                            <a
                              key={idx}
                              href={getFileUrl(file.file_path || file.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={isPdf ? "pdf-badge" : "img-badge"}
                              title={file.original_name || "Download"}
                              style={{ marginRight: "5px", display: "inline-block", marginBottom: "2px", textDecoration: "none" }}
                            >
                              {isPdf ? "📄 PDF" : "📷 Image"}
                            </a>
                          );
                        })
                      ) : (
                        <span className="no-file">-</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="info-group">
                      <div className="date-row"><span className="sub-text-label">รับเข้า:</span><span className="main-text">{formatDate(insp.receiptDate)}</span></div>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`status-badge status-${insp.overallResult}`}>
                      {insp.overallResult === "pass" ? "✅ ผ่าน" : insp.overallResult === "fail" ? "❌ ไม่ผ่าน" : "⏳ รอตรวจ"}
                    </span>
                  </td>
                  <td className="text-center"><span className="qty-badge">{insp.inspectionQuantity}</span></td>
                  <td>
                    <div className="action-buttons center-actions">
                      <button className="action-btn view-btn" onClick={() => onView(insp)} title="ดูรายละเอียด">👁️</button>
                      <button className="action-btn edit-btn" onClick={() => onEdit(insp)} title="แก้ไข">✏️</button>
                      <button className="action-btn delete-btn" onClick={() => onDelete(insp)} disabled={deletingId === insp.id} title="ลบ">
                        {deletingId === insp.id ? "⏳" : "🗑️"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="empty-state">
                  <div className="empty-content">
                    <div className="empty-icon">📋</div>
                    <h3>ไม่พบข้อมูล</h3>
                    <p>ลองปรับตัวกรองหรือเพิ่มข้อมูลใหม่</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Pagination = ({ pagination, onPageChange, disabled }) => (
  <div className="pagination-container">
    <button className="pagination-btn" onClick={() => onPageChange(pagination.page - 1)} disabled={disabled || pagination.page <= 1}>← ก่อนหน้า</button>
    <span className="pagination-info">หน้า {pagination.page} / {pagination.totalPages || 1} <span className="total-items"> (ทั้งหมด {pagination.total || 0} รายการ)</span></span>
    <button className="pagination-btn" onClick={() => onPageChange(pagination.page + 1)} disabled={disabled || pagination.page >= pagination.totalPages}>ถัดไป →</button>
  </div>
);

// ------------------------------------------
// Component: MaterialFormModal
// ------------------------------------------
const MaterialFormModal = ({
  showModal,
  isEditing,
  formData,
  handleInputChange,
  handleBarInputChange,
  handleRodInputChange,
  handleFileUpload,
  handleSubmit,
  setShowModal,
  saving,
  materialTypeOptions,
  materialGradeOptions,
  batchOptions = [],
  supplierOptions = [],
  makerOptions = []
}) => {

  const [keepOpen, setKeepOpen] = useState(false);

  if (!showModal) return null;
  const { material_type } = formData;

  const renderMeasurements = () => {
    if (!material_type) return <div className="warning-box">⚠️ กรุณาเลือกประเภทเหล็ก</div>;

    if (material_type === "bar") {
      return (
        <div className="bars-container">
          <div className="section-header"><h3>📏 ตรวจสอบเหล็กเส้น</h3></div>
          <div className="rod-measurements">
            {formData.barInspections.map((bar, i) => (
              <div key={i} className="bar-inspection-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
                <h5 style={{ margin: 0, color: '#2c3e50' }}>เส้นที่ {bar.barNumber}</h5>

                <div className="input-group">
                  <label style={{ fontSize: '12px', color: '#666' }}>OD (mm)</label>
                  <input type="number" className="form-input" placeholder="OD" value={bar.odMeasurement} onChange={(e) => handleBarInputChange(i, { target: { name: "odMeasurement", value: e.target.value } })} />
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '12px', color: '#666' }}>Length (mm)</label>
                  <input type="number" className="form-input" placeholder="Length" value={bar.lengthMeasurement} onChange={(e) => handleBarInputChange(i, { target: { name: "lengthMeasurement", value: e.target.value } })} />
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '12px', color: '#666' }}>Surface</label>
                  <input type="text" className="form-input" placeholder="Condition" value={bar.surfaceCondition} onChange={(e) => handleBarInputChange(i, { target: { name: "surfaceCondition", value: e.target.value } })} />
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '12px', color: '#666' }}>Appearance</label>
                  <select
                    className="form-select"
                    style={{ width: '100%', padding: '8px', borderColor: bar.appearance === 'NG' ? 'red' : '#ddd', color: bar.appearance === 'NG' ? 'red' : 'green', fontWeight: 'bold' }}
                    value={bar.appearance}
                    onChange={(e) => handleBarInputChange(i, { target: { name: "appearance", value: e.target.value } })}
                  >
                    <option value="OK">✅ OK (ปกติ)</option>
                    <option value="NG">❌ NG (ไม่ผ่าน)</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="rod-inspection-container">
        <div className="section-header"><h3>📏 ตรวจสอบเหล็กท่อน</h3></div>
        <div className="rod-measurements">
          {formData.rodInspections.map((rod, i) => (
            <div key={i} className="rod-inspection-card">
              <h5>ท่อนที่ {rod.rodNumber}</h5>
              <input type="number" className="form-input" placeholder="Diameter (mm)" value={rod.diameter} onChange={(e) => handleRodInputChange(i, { target: { name: "diameter", value: e.target.value } })} />
              <input type="number" className="form-input" placeholder="Length (mm)" value={rod.length} onChange={(e) => handleRodInputChange(i, { target: { name: "length", value: e.target.value } })} />
              <input type="number" className="form-input" placeholder="Weight (kg)" value={rod.weight} onChange={(e) => handleRodInputChange(i, { target: { name: "weight", value: e.target.value } })} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content inspection-form-modal">
        <div className="modal-header">
          <h2>{isEditing ? "📝 แก้ไขรายการ" : "➕ เพิ่มรายการใหม่"}</h2>
          <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, keepOpen)} className="inspection-form">
          <div className="modal-scroll-body">
            <div className="form-section">
              <div className="section-header"><h3>📦 ข้อมูลวัตถุดิบ</h3><div className="section-divider"></div></div>
              <div className="form-grid">
                <div className="form-group"><label className="form-label">ประเภท <span className="required">*</span></label><select name="material_type" className="form-select" value={formData.material_type} onChange={handleInputChange} required>{materialTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                <div className="form-group"><label className="form-label">เกรด <span className="required">*</span></label><select name="material_grade" className="form-select" value={formData.material_grade} onChange={handleInputChange} required>{materialGradeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>

                <div className="form-group">
                  <label className="form-label">Batch No. <span className="required">*</span></label>
                  <input type="text" className="form-input" name="batch_number" value={formData.batch_number} onChange={handleInputChange} required list="batch-options-list" autoComplete="off" />
                  <datalist id="batch-options-list">
                    {batchOptions?.map((opt, i) => <option key={i} value={opt} />)}
                  </datalist>
                </div>

                <div className="form-group"><label className="form-label">Invoice <span className="required">*</span></label><input type="text" className="form-input" name="invoice_number" value={formData.invoice_number} onChange={handleInputChange} required /></div>

                <div className="form-group">
                  <label className="form-label">ผู้จำหน่าย <span className="required">*</span></label>
                  <input type="text" className="form-input" name="supplier_name" value={formData.supplier_name} onChange={handleInputChange} required list="supplier-options-list" autoComplete="off" />
                  <datalist id="supplier-options-list">
                    {supplierOptions?.map((opt, i) => <option key={i} value={opt} />)}
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="form-label">ผู้ผลิต <span className="required">*</span></label>
                  <input type="text" className="form-input" name="maker_mat" value={formData.maker_mat} onChange={handleInputChange} required list="maker-options-list" autoComplete="off" />
                  <datalist id="maker-options-list">
                    {makerOptions?.map((opt, i) => <option key={i} value={opt} />)}
                  </datalist>
                </div>

                <div className="form-group"><label className="form-label">วันที่รับเข้า <span className="required">*</span></label><input type="date" className="form-input" name="receipt_date" value={formData.receipt_date} onChange={handleInputChange} required /></div>
                <div className="form-group"><label className="form-label">ผู้ตรวจสอบ <span className="required">*</span></label><input type="text" className="form-input" name="inspector" value={formData.inspector} onChange={handleInputChange} required /></div>
                <div className="form-group"><label className="form-label">จำนวน</label><input type="number" className="form-input" name="inspection_quantity" value={formData.inspection_quantity} onChange={handleInputChange} /></div>
                <div className="form-group"><label className="form-label">ผลลัพธ์</label><select className="form-select" name="overall_result" value={formData.overall_result} onChange={handleInputChange}><option value="pending">🟡 รอตรวจสอบ</option><option value="pass">🟢 ผ่าน</option><option value="fail">🔴 ไม่ผ่าน</option></select></div>
                <div className="form-group"><label className="form-label">Cer No.</label><input type="text" className="form-input" name="cer_number" value={formData.cer_number} onChange={handleInputChange} /></div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-header"><h3>📎 เอกสารแนบ</h3><div className="section-divider"></div></div>
              <div className="file-upload-section">
                <div className="upload-group">
                  <label className="form-label">📷 รูปภาพ</label>
                  <input type="file" accept="image/*" multiple onChange={(e) => handleFileUpload(e, "image")} className="form-input" />
                  {formData.attached_images.length > 0 && <div className="upload-count">✅ แนบแล้ว {formData.attached_images.length} รูป</div>}
                </div>
                <div className="upload-group">
                  <label className="form-label">📄 เอกสาร PDF</label>
                  <input type="file" accept="application/pdf" multiple onChange={(e) => handleFileUpload(e, "pdf")} className="form-input" />
                  {formData.attached_files.length > 0 && <div className="upload-count">✅ แนบแล้ว {formData.attached_files.length} ไฟล์</div>}
                </div>
              </div>
            </div>

            <div className="form-section">{renderMeasurements()}</div>

            <div className="form-section">
              <div className="form-group full-width">
                <label className="form-label">📝 หมายเหตุ</label>
                <textarea name="notes" className="form-textarea" rows="4" placeholder="กรอกหมายเหตุเพิ่มเติม (ถ้ามี)..." value={formData.notes} onChange={handleInputChange}></textarea>
              </div>
            </div>
          </div>

          <div className="modal-actions" style={{ justifyContent: 'flex-end', gap: '15px' }}>

            <label className="checkbox-container" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px', color: '#333' }}>
              <input
                type="checkbox"
                checked={keepOpen}
                onChange={(e) => setKeepOpen(e.target.checked)}
                style={{ width: '18px', height: '18px', marginRight: '8px', cursor: 'pointer' }}
              />
              บันทึกแล้วเขียนต่อ (ไม่ปิดหน้าต่าง)
            </label>

            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>❌ ยกเลิก</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "⏳ กำลังบันทึก..." : "💾 บันทึกข้อมูล"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DetailsModal = ({ show, inspection, onClose, onGeneratePDF, onGenerateExcel }) => {
  if (!show || !inspection) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h2>📋 รายละเอียด</h2><button className="close-btn" onClick={onClose}>✕</button></div>
        <div className="details-content">
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Batch</span><span className="detail-value">{inspection.batchNumber}</span></div>
            <div className="detail-item"><span className="detail-label">ประเภท</span><span className="detail-value">{inspection.materialType === "bar" ? "เหล็กเส้น" : "เหล็กท่อน"}</span></div>
            <div className="detail-item"><span className="detail-label">เกรด</span><span className="detail-value">{inspection.materialGrade}</span></div>
            <div className="detail-item"><span className="detail-label">ผู้จำหน่าย</span><span className="detail-value">{inspection.supplierName}</span></div>
            <div className="detail-item"><span className="detail-label">ผู้ผลิต</span><span className="detail-value">{inspection.makerMat}</span></div>
            <div className="detail-item"><span className="detail-label">วันที่รับ</span><span className="detail-value">{formatDate(inspection.receiptDate)}</span></div>
            <div className="detail-item"><span className="detail-label">จำนวน</span><span className="detail-value">{inspection.inspectionQuantity}</span></div>
            <div className="detail-item"><span className="detail-label">ผลลัพธ์</span><span className={`status-badge status-${inspection.overallResult}`}>{inspection.overallResult === "pass" ? "✅ ผ่าน" : inspection.overallResult === "fail" ? "❌ ไม่ผ่าน" : "⏳ รอ"}</span></div>

            {inspection.materialType === 'bar' && inspection.barInspections && inspection.barInspections.length > 0 && (
              <div className="detail-item" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                <span className="detail-label">ผลตรวจเหล็กเส้น:</span>
                <div style={{ marginTop: '5px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {inspection.barInspections.map((b, i) => (
                    <span key={i} style={{ padding: '5px 10px', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #ddd', fontSize: '12px' }}>
                      เส้น {b.barNumber}: OD {b.odMeasurement} / Len {b.lengthMeasurement} /
                      <span style={{ fontWeight: 'bold', color: b.appearance === 'NG' ? 'red' : 'green', marginLeft: '5px' }}>
                        {b.appearance || 'OK'}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="modal-actions">
            <div className="export-buttons">
              <button className="btn btn-export btn-pdf" onClick={() => onGeneratePDF(inspection)}>📄 PDF</button>
              <button className="btn btn-export btn-excel" onClick={() => onGenerateExcel(inspection)}>📊 Excel</button>
            </div>
            <button className="btn btn-secondary" onClick={onClose}>ปิด</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 🎯 MAIN COMPONENT
// ============================================

const MaterialInspection = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate(); // ✅ เพิ่ม navigate hook
  const searchTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);

  const [searchType, setSearchType] = useState("all");

  const materialTypeOptions = useMemo(() => [
    { value: "", label: "กรุณาเลือกประเภท" },
    { value: "bar", label: "เหล็กเส้น (Bar)" },
    { value: "rod", label: "เหล็กท่อน (Rod)" }
  ], []);

  const materialGradeOptions = useMemo(() => [
    { value: "", label: "กรุณาเลือกเกรดวัตถุดิบ" },
    { value: "S10C", label: "S10C" },
    { value: "S20C", label: "S20C" },
    { value: "S35C", label: "S35C" },
    { value: "S45C", label: "S45C" },
    { value: "S48C", label: "S48C" },
    { value: "S50C", label: "S50C" },
    { value: "S53C", label: "S53C" },
    { value: "SS400", label: "SS400" },
    { value: "SCM415", label: "SCM415" },
    { value: "SCM415H", label: "SCM415H" },
    { value: "SCM415HV", label: "SCM415HV" },
    { value: "SCM435", label: "SCM435" },
    { value: "SCM435H", label: "SCM435H" },
    { value: "SCM440", label: "SCM440" },
    { value: "HSCM420V", label: "HSCM420V" },
    { value: "SCM420H", label: "SCM420H" },
    { value: "SCR420H", label: "SCR420H" },
  ], []);

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const batchOptions = useMemo(() => [
    "22-S45C-040-58-SMC",
    "23-SCM440-028-60-FBT",
  ], []);

  const supplierOptions = useMemo(() => [
    "TOYOTA TSUSHO (THAILAND) CO., LTD",
    "San-en (Thailand) Co., Ltd",
    "Nippon Steel Trading (Thailand) Co., Ltd",
    "KITATI INDUSTRY",
    "Kanehira Steel (Thailand) Co., Ltd.)",
  ], []);

  const makerOptions = useMemo(() => [
    "SHIJIAZHUANG IRON & STEEL CO.,LTD",
    "Daido Steel Co.,Ltd",
    "Nippon Steel Corporation",
    "SeAH Besteel",
    "China Steel Corporation",
    "Jiangsu Lihuai iron and Steel Co.,Ltd",
    "Nakayama Steel Works LTD",
    "JFE Steel Corporation",
    "HUAIGANG",
  ], []);

  const initialFormState = useMemo(() => ({
    material_type: "",
    material_grade: "",
    batch_number: "",
    supplier_name: "",
    maker_mat: "",
    receipt_date: "",
    invoice_number: "",
    cer_number: "",
    inspector: "",
    inspection_quantity: "",
    notes: "",
    overall_result: "pending",
    attached_images: [],
    attached_files: [],
    barInspections: createInitialBarInspections([], 4),
    rodInspections: createInitialRodInspection([], 4),
  }), []);

  const [inspections, setInspections] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getYearMonth(new Date()));
  const [showAllData, setShowAllData] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [filters, setFilters] = useState({ status: "", supplier: "", makerMat: "", materialGrade: "", page: 1, limit: DEFAULT_PAGE_SIZE });

  const activeFilterCount = useMemo(() => Object.entries(filters).filter(([k, v]) => !["page", "limit"].includes(k) && v).length, [filters]);

  const apiCall = useCallback(async (endpoint, options = {}) => {
    const token = localStorage.getItem("authToken");
    const headers = token ? { ...options.headers, Authorization: `Bearer ${token}` } : { ...options.headers };
    let body = options.body;
    if (body && !(body instanceof FormData) && typeof body !== "string") {
      body = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
    }
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers, body });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || res.statusText);
      }
      if (res.status === 204) return { success: true, data: null };
      return { success: true, data: await res.json() };
    } catch (e) {
      console.error("API Error:", e);
      return { success: false, error: e };
    }
  }, []);

  const fetchInspections = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params.append(key, filters[key]);
      });
      if (searchTerm) {
        params.append("search", searchTerm);
        params.append("searchType", searchType);
      }
      if (!showAllData && selectedMonth) params.append("month", selectedMonth);

      const res = await apiCall(`/api/material?${params.toString()}`);
      if (res.success) {
        const data = (res.data.data || []).map(normalizeInspectionData);
        setInspections(data);
        setPagination(res.data.pagination || {
          page: filters.page || 1,
          limit: filters.limit || DEFAULT_PAGE_SIZE,
          total: data.length,
          totalPages: Math.ceil(data.length / (filters.limit || DEFAULT_PAGE_SIZE))
        });
      } else {
        Toast.fire({ icon: "error", title: res.error?.message || "เกิดข้อผิดพลาด" });
      }
    } catch (e) {
      console.error("Fetch Error:", e);
      Toast.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการโหลดข้อมูล" });
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [apiCall, filters, searchTerm, searchType, selectedMonth, showAllData]);

  const fetchStats = useCallback(async () => {
    const res = await apiCall("/api/material/stats/summary");
    if (res.success) setStats(res.data.data || {});
  }, [apiCall]);

  useEffect(() => {
    if (user && isInitialMount.current) {
      isInitialMount.current = false;
      fetchInspections();
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    if (user && !isInitialMount.current) fetchInspections();
  }, [filters, searchTerm, searchType, selectedMonth, showAllData]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const handleFilterChange = (e) => setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));
  const handleClearFilters = () => {
    setFilters({ status: "", supplier: "", makerMat: "", materialGrade: "", page: 1, limit: DEFAULT_PAGE_SIZE });
    Toast.fire({ icon: "info", title: "ล้างตัวกรองแล้ว" });
  };

  const handleSearchChange = (value) => {
    setSearchInput(value);
    setIsSearching(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value);
      setFilters((prev) => ({ ...prev, page: 1 }));
    }, DEBOUNCE_DELAY);
  };

  const handleSearchClear = () => {
    setSearchInput("");
    setSearchTerm("");
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handleMonthChange = (value) => {
    setSelectedMonth(value);
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handleToggleAllData = (checked) => {
    setShowAllData(checked);
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page) => setFilters((prev) => ({ ...prev, page }));
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleBarInputChange = (idx, e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      barInspections: prev.barInspections.map((b, i) => i === idx ? { ...b, [name]: value } : b)
    }));
  };

  const handleRodInputChange = (idx, e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      rodInspections: prev.rodInspections.map((r, i) => i === idx ? { ...r, [name]: value } : r)
    }));
  };

  const handleFileUpload = (e, type) => {
    const files = Array.from(e.target.files);
    const key = type === "image" ? "attached_images" : "attached_files";
    setFormData((prev) => ({ ...prev, [key]: [...prev[key], ...files] }));
  };

  const handleSubmit = async (e, keepOpen = false) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = new FormData();
      Object.keys(formData).forEach((key) => {
        if (["attached_images", "attached_files", "barInspections", "rodInspections", "files"].includes(key)) return;
        payload.append(key, formData[key] === null ? "" : formData[key]);
      });

      const bars = formData.barInspections || [];
      const rods = formData.rodInspections || [];
      payload.append("bar_inspections", JSON.stringify(bars));
      payload.append("rod_inspections", JSON.stringify(rods));

      const allFiles = [...formData.attached_images, ...formData.attached_files];
      allFiles.forEach((file) => {
        if (file && file instanceof File) {
          payload.append("files", file);
        }
      });

      const endpoint = isEditing ? `/api/material/${formData.id}` : "/api/material";
      const method = isEditing ? "PUT" : "POST";
      const res = await apiCall(endpoint, { method, body: payload });

      if (res.success) {
        Toast.fire({ icon: "success", title: isEditing ? "แก้ไขสำเร็จ!" : "บันทึกสำเร็จ!" });
        await fetchInspections();
        await fetchStats();

        if (keepOpen && !isEditing) {
          setFormData(initialFormState);
        } else {
          setShowModal(false);
          setFormData(initialFormState);
        }
      } else {
        Swal.fire("Error", res.error?.message || "เกิดข้อผิดพลาด", "error");
      }
    } catch (err) {
      console.error("Submit Error:", err);
      Swal.fire("Error", err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (insp) => {
    setIsEditing(true);
    setFormData({
      id: insp.id,
      material_type: insp.materialType,
      material_grade: insp.materialGrade,
      batch_number: insp.batchNumber,
      supplier_name: insp.supplierName,
      maker_mat: insp.makerMat,
      receipt_date: insp.receiptDate?.split("T")[0] || "",
      invoice_number: insp.invoiceNumber,
      cer_number: insp.cerNumber,
      inspector: insp.inspector,
      inspection_quantity: insp.inspectionQuantity,
      notes: insp.notes,
      overall_result: insp.overallResult,
      attached_images: [],
      attached_files: [],
      barInspections: insp.materialType === "bar" ? createInitialBarInspections(insp.barInspections, 4) : createInitialBarInspections([], 4),
      rodInspections: insp.materialType === "rod" ? createInitialRodInspection(insp.rodInspections, 4) : createInitialRodInspection([], 4),
    });
    setShowModal(true);
  };

  const handleDeleteClick = (insp) => {
    Swal.fire({
      title: "ยืนยันการลบ?",
      html: `<p><strong>Batch:</strong> ${insp.batchNumber}</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "🗑️ ลบ",
      cancelButtonText: "ยกเลิก"
    }).then(async (result) => {
      if (result.isConfirmed) {
        setDeletingId(insp.id);
        try {
          const res = await apiCall(`/api/material/${insp.id}`, { method: "DELETE" });
          if (res.success) {
            Toast.fire({ icon: "success", title: "ลบสำเร็จ" });
            fetchInspections();
            fetchStats();
          } else {
            Swal.fire("Error", res.error?.message || "เกิดข้อผิดพลาด", "error");
          }
        } catch (err) {
          Swal.fire("Error", err.message, "error");
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const handleViewClick = (insp) => {
    setSelectedInspection(insp);
    setShowDetailsModal(true);
  };

  const handleAddNew = () => {
    setIsEditing(false);
    setFormData(initialFormState);
    setShowModal(true);
  };

  const generatePDF = (insp) => {
    const doc = new jsPDF();
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 210, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("Material Inspection Report", 105, 20, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    autoTable(doc, {
      startY: 45,
      body: [
        ["Batch", insp.batchNumber, "Type", insp.materialType],
        ["Grade", insp.materialGrade, "Qty", String(insp.inspectionQuantity)],
        ["Supplier", insp.supplierName, "Maker", insp.makerMat],
        ["Result", insp.overallResult.toUpperCase(), "Date", formatDate(insp.receiptDate)]
      ],
      theme: "grid"
    });
    doc.save(`Inspection_${insp.batchNumber}.pdf`);
    Toast.fire({ icon: "success", title: "PDF สำเร็จ" });
  };

  const generateExcel = (insp) => {
    const wb = XLSX.utils.book_new();
    const data = [
      ["Batch", insp.batchNumber],
      ["Type", insp.materialType],
      ["Grade", insp.materialGrade],
      ["Supplier", insp.supplierName],
      ["Result", insp.overallResult]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Info");
    XLSX.writeFile(wb, `Inspection_${insp.batchNumber}.xlsx`);
    Toast.fire({ icon: "success", title: "Excel สำเร็จ" });
  };

  if (authLoading) return <LoadingComponent />;
  if (!user) return <LoadingComponent message="กำลังเข้าสู่ระบบ..." />;

  return (
    <div className="material-inspection-container">
      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="page-title">🔬 ตรวจสอบวัตถุดิบ</h1>
            <p className="page-subtitle">Material Inspection Management System</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {/* ✅ ปุ่มไปหน้ารายงาน */}
            <button
              className="add-new-btn"
              onClick={() => navigate('/inspections/material/report')}
              style={{
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              📊 ดูรายงาน
            </button>

            <button className="add-new-btn" onClick={handleAddNew}>
              ➕ เพิ่มรายการใหม่
            </button>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <StatsCard icon="📊" label="ทั้งหมด" value={stats.totalInspections || 0} color="blue" />
        <StatsCard icon="✅" label="ผ่าน" value={stats.passCount || 0} color="green" />
        <StatsCard icon="❌" label="ไม่ผ่าน" value={stats.failCount || 0} color="red" />
        <StatsCard icon="⏳" label="รอตรวจ" value={stats.pendingCount || 0} color="yellow" />
      </div>

      <div className="search-filter-section">
        <SearchBar
          searchTerm={searchInput}
          onSearchChange={handleSearchChange}
          onSearchClear={handleSearchClear}
          isSearching={isSearching}
          searchType={searchType}
          onSearchTypeChange={(val) => {
            setSearchType(val);
            handleSearchChange(searchInput);
          }}
        />
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
          monthOptions={monthOptions}
          showAllData={showAllData}
          onToggleAllData={handleToggleAllData}
        />
      </div>

      <FilterSection
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        materialGradeOptions={materialGradeOptions}
        activeFilterCount={activeFilterCount}
        isExpanded={filterExpanded}
        onToggleExpand={() => setFilterExpanded(!filterExpanded)}
      />

      <div className="content-section">
        {loading ? (
          <LoadingComponent message="กำลังโหลดข้อมูล..." />
        ) : (
          <>
            <InspectionTable
              inspections={inspections}
              onEdit={handleEditClick}
              onView={handleViewClick}
              onDelete={handleDeleteClick}
              searchTerm={searchTerm}
              deletingId={deletingId}
            />
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
              disabled={loading}
            />
          </>
        )}
      </div>

      <MaterialFormModal
        showModal={showModal}
        isEditing={isEditing}
        formData={formData}
        handleInputChange={handleInputChange}
        handleBarInputChange={handleBarInputChange}
        handleRodInputChange={handleRodInputChange}
        handleFileUpload={handleFileUpload}
        handleSubmit={handleSubmit}
        setShowModal={setShowModal}
        saving={saving}
        materialTypeOptions={materialTypeOptions}
        materialGradeOptions={materialGradeOptions}
        batchOptions={batchOptions}
        supplierOptions={supplierOptions}
        makerOptions={makerOptions}
      />

      <DetailsModal
        show={showDetailsModal}
        inspection={selectedInspection}
        onClose={() => setShowDetailsModal(false)}
        onGeneratePDF={generatePDF}
        onGenerateExcel={generateExcel}
      />
    </div>
  );
};

export default MaterialInspection;