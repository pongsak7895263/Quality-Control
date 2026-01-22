import React, { useState, useEffect, useCallback, useMemo } from "react";
import useAuth from "../../hooks/useAuth";
import { API_BASE_URL } from '../../config';
import "./MaterialInspection.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

const Toast = Swal.mixin({
  toast: true, position: "top-end", showConfirmButton: false, timer: 3000, timerProgressBar: true,
  didOpen: (toast) => { toast.onmouseenter = Swal.stopTimer; toast.onmouseleave = Swal.resumeTimer; },
});

// --- Helper Functions ---
const formatDate = (dateString) => {
  if (!dateString || dateString === "-") return "-";
  try {
    const date = new Date(dateString);
    if (date.getFullYear() > 2400) date.setFullYear(date.getFullYear() - 543);
    return date.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
  } catch (e) { return "-"; }
};

const formatMonthYear = (date) => date.toLocaleDateString("th-TH", { year: "numeric", month: "long" });

const getYearMonth = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({ value: getYearMonth(date), label: formatMonthYear(date) });
  }
  return options;
};

const normalizeInspectionData = (data) => {
  if (!data) return null;
  const getArray = (key1, key2) => Array.isArray(data[key1]) ? data[key1] : Array.isArray(data[key2]) ? data[key2] : [];
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
    // ✅ เพิ่ม 2 บรรทัดนี้ครับ (ถ้าไม่มี ไฟล์จะไม่โชว์)
    attachedFiles: getArray("attached_files", "InspectionFiles") || [], // รองรับทั้งชื่อ alias และชื่อ default
    attachedImages: getArray("attached_images", "images") || [],
  };
};

// --- Components ---
const LoadingComponent = ({ message = "Loading..." }) => (
  <div className="loading-container"><div className="loading-spinner"></div><p>{message}</p></div>
);

const StatsCard = ({ icon, label, value, color }) => (
  <div className={`stats-card ${color}`}>
    <div className="stats-icon">{icon}</div>
    <div className="stats-content"><div className="stats-value">{value}</div><div className="stats-label">{label}</div></div>
  </div>
);

// ✨ Search Bar
const SearchBar = ({ searchTerm, onSearchChange, onSearchClear }) => (
  <div className="search-bar-container">
    <div className="search-input-wrapper">
      <span className="search-icon">🔍</span>
      <input type="text" className="search-input" placeholder="ค้นหา Batch, ผู้จำหน่าย, Invoice, เกรด..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} />
      {searchTerm && <button className="search-clear-btn" onClick={onSearchClear}>✕</button>}
    </div>
  </div>
);

// ✨ Month Selector
const MonthSelector = ({ selectedMonth, onMonthChange, monthOptions, showAllData, onToggleAllData }) => (
  <div className="month-selector-container">
    <div className="month-selector-wrapper">
      <label className="month-label"><span className="label-icon">📅</span><span>เดือน:</span></label>
      <select className="month-select" value={selectedMonth} onChange={(e) => onMonthChange(e.target.value)} disabled={showAllData}>
        {monthOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <label className="show-all-checkbox">
        <input type="checkbox" checked={showAllData} onChange={(e) => onToggleAllData(e.target.checked)} />
        <span>แสดงทั้งหมด</span>
      </label>
    </div>
  </div>
);

// Filter Section
const FilterSection = ({ filters, onFilterChange, onClearFilters, materialGradeOptions, activeFilterCount, isExpanded, onToggleExpand }) => {
  const statusOptions = [{ value: "", label: "ทุกสถานะ" }, { value: "pass", label: "✅ ผ่าน" }, { value: "fail", label: "❌ ไม่ผ่าน" }, { value: "pending", label: "⏳ รอตรวจ" }];
  const gradeOptions = [{ value: "", label: "ทุกเกรด" }, ...(materialGradeOptions || []).filter((opt) => opt.value !== "")];

  return (
    <div className={`filter-section-modern ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="filter-header-modern">
        <div className="filter-title-group">
          <button className="filter-toggle-btn" onClick={onToggleExpand}>
            <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
            <h3>🎛️ ตัวกรองขั้นสูง</h3>
          </button>
          {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount} ตัวกรอง</span>}
        </div>
        {activeFilterCount > 0 && <button className="btn-clear-filters" onClick={onClearFilters}>🗑️ ล้าง</button>}
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

// Table
const InspectionTable = ({ inspections, onEdit, onView, onDelete, searchTerm }) => {
  const highlight = (text, term) => {
    if (!term || !text) return text;
    const parts = String(text).split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part, i) => part.toLowerCase() === term.toLowerCase() ? <mark key={i} className="search-highlight">{part}</mark> : part);
  };
  // 🔴 เพิ่มฟังก์ชันนี้เข้าไปตรงนี้ครับ (ก่อน return) 🔴
  const getFileUrl = (path) => {
    if (!path) return "#";
    // ถ้ามี http นำหน้าอยู่แล้ว (เป็น Full URL) ให้ใช้เลย
    if (path.startsWith("http")) return path;
    
    // ถ้าเป็น path จาก Server (เช่น uploads/file.pdf) ให้เติม API_BASE_URL ข้างหน้า
    // หมายเหตุ: ต้องมั่นใจว่า import { API_BASE_URL } มาจาก config แล้ว
    return `${API_BASE_URL}/${path.replace(/^\//, "")}`; 
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
              <th width="10%">📎 ไฟล์แนบ</th> {/* เพิ่มคอลัมน์นี้ */}
              <th width="15%">📅 วันที่</th>
              <th width="10%" className="text-center">สถานะ</th>
              <th width="10%" className="text-center">จำนวน</th>
              <th width="10%" className="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {inspections?.length > 0 ? inspections.map((insp, i) => (
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
{/* --- ส่วนแสดงไฟล์ PDF --- */}
                  <td>
                    <div className="file-list-cell">
                        {insp.attachedFiles && insp.attachedFiles.length > 0 ? (
                            insp.attachedFiles.map((file, idx) => (
                                <a 
                                    key={idx} 
                                    href={getFileUrl(file.file_path || file.url)} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="pdf-badge"
                                    title={file.original_name || "Download PDF"}
                                >
                                    📄 {file.original_name || "PDF"} {/* แสดงชื่อไฟล์ */}
                                </a>
                            ))
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
                    <button className="action-btn view-btn" onClick={() => onView(insp)}>👁️</button>
                    <button className="action-btn edit-btn" onClick={() => onEdit(insp)}>✏️</button>
                    <button className="action-btn delete-btn" onClick={() => onDelete(insp)}>🗑️</button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="7" className="empty-state"><div className="empty-content"><div className="empty-icon">📋</div><h3>ไม่พบข้อมูล</h3><p>ลองปรับตัวกรองหรือเพิ่มข้อมูลใหม่</p></div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Pagination = ({ pagination, onPageChange }) => (
  <div className="pagination-container">
    <button className="pagination-btn" onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page <= 1}>←</button>
    <span className="pagination-info">หน้า {pagination.page} / {pagination.totalPages || 1} <span className="total-items">(ทั้งหมด {pagination.total || 0} รายการ)</span></span>
    <button className="pagination-btn" onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>→</button>
  </div>
);

// Form helpers
const createInitialBarInspections = (data = [], count = 4) => data.length > 0 ? data.map((item) => ({ barNumber: item.barNumber || item.bar_number, odMeasurement: item.odMeasurement || "", lengthMeasurement: item.lengthMeasurement || "", surfaceCondition: item.surfaceCondition || "excellent" })) : Array.from({ length: count }, (_, i) => ({ barNumber: i + 1, odMeasurement: "", lengthMeasurement: "", surfaceCondition: "excellent" }));
const createInitialRodInspection = (data = [], count = 4) => data.length > 0 ? data.map((item, idx) => ({ rodNumber: item.rodNumber || item.rod_number || idx + 1, diameter: item.diameter || "", length: item.length || "", weight: item.weight || "", surfaceCondition: item.surfaceCondition || "good" })) : Array.from({ length: count }, (_, i) => ({ rodNumber: i + 1, diameter: "", length: "", weight: "", surfaceCondition: "good" }));
// Modal Form
const MaterialFormModal = ({ showModal, isEditing, formData, materialTypeOptions, materialGradeOptions, handleInputChange, handleBarInputChange, handleRodInputChange, handleFileUpload, handleSubmit, setShowModal, saving }) => {
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
              <div key={i} className="bar-inspection-card">
                <h5>เส้นที่ {bar.barNumber}</h5>
                <input type="number" className="form-input" placeholder="OD (mm)" value={bar.odMeasurement} onChange={(e) => handleBarInputChange(i, { target: { name: "odMeasurement", value: e.target.value } })} />
                <input type="number" className="form-input" placeholder="Length (mm)" value={bar.lengthMeasurement} onChange={(e) => handleBarInputChange(i, { target: { name: "lengthMeasurement", value: e.target.value } })} />
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
    <div className="modal-overlay" onClick={() => setShowModal(false)}>
      <div className="modal-content inspection-form-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* 1. Header (ติดตายด้านบน) */}
        <div className="modal-header">
          <h2>{isEditing ? "📝 แก้ไขรายการ" : "➕ เพิ่มรายการ"}</h2>
          <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
        </div>

        {/* 2. Form Wrapper */}
        <form onSubmit={handleSubmit} className="inspection-form">
          
          {/* 3. ส่วนเนื้อหาที่เลื่อนได้ (ต้องเพิ่ม div นี้เข้าไป!) */}
          <div className="modal-scroll-body">
            
            <div className="form-section">
              <div className="section-header"><h3>📦 ข้อมูลวัตถุดิบ</h3></div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">ประเภท <span className="required">*</span></label>
                  <select name="material_type" className="form-select" value={formData.material_type} onChange={handleInputChange} required>
                    {materialTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">เกรด <span className="required">*</span></label>
                  <select name="material_grade" className="form-select" value={formData.material_grade} onChange={handleInputChange} required>
                    {materialGradeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Batch No. <span className="required">*</span></label>
                  <input type="text" className="form-input" name="batch_number" value={formData.batch_number} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Invoice <span className="required">*</span></label>
                  <input type="text" className="form-input" name="invoice_number" value={formData.invoice_number} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">ผู้จำหน่าย <span className="required">*</span></label>
                  <input type="text" className="form-input" name="supplier_name" value={formData.supplier_name} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">ผู้ผลิต <span className="required">*</span></label>
                  <input type="text" className="form-input" name="maker_mat" value={formData.maker_mat} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">วันที่รับเข้า <span className="required">*</span></label>
                  <input type="date" className="form-input" name="receipt_date" value={formData.receipt_date} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">ผู้ตรวจสอบ <span className="required">*</span></label>
                  <input type="text" className="form-input" name="inspector" value={formData.inspector} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">จำนวน</label>
                  <input type="number" className="form-input" name="inspection_quantity" value={formData.inspection_quantity} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">ผลลัพธ์</label>
                  <select className="form-select" name="overall_result" value={formData.overall_result} onChange={handleInputChange}>
                    <option value="pending">🟡 รอตรวจสอบ</option>
                    <option value="pass">🟢 ผ่าน</option>
                    <option value="fail">🔴 ไม่ผ่าน</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cer No.</label>
                  <input type="text" className="form-input" name="cer_number" value={formData.cer_number} onChange={handleInputChange} />
                </div>
              </div>
            </div>

            <div className="form-section" style={{ marginTop: "20px" }}>
              <div className="section-header">
                <h3>📎 เอกสารแนบ</h3>
                <div className="section-divider"></div>
              </div>
              <div className="file-upload-section">
                <div className="upload-group" style={{ marginBottom: "15px" }}>
                  <label className="form-label">📷 รูปภาพ</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileUpload(e, "image")}
                    className="form-input"
                  />
                  {formData.attached_images.length > 0 && (
                    <div style={{ marginTop: "10px", fontSize: "0.9rem" }}>
                      แนบแล้ว {formData.attached_images.length} รูป
                    </div>
                  )}
                </div>
                <div className="upload-group">
                  <label className="form-label">📄 เอกสาร PDF</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={(e) => handleFileUpload(e, "pdf")}
                    className="form-input"
                  />
                  {formData.attached_files.length > 0 && (
                    <div style={{ marginTop: "10px", fontSize: "0.9rem" }}>
                      แนบแล้ว {formData.attached_files.length} ไฟล์
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-section">{renderMeasurements()}</div>
            
            <div className="form-group full-width">
              <label className="form-label">หมายเหตุ</label>
              <textarea name="notes" className="form-textarea" rows="3" value={formData.notes} onChange={handleInputChange}></textarea>
            </div>

          </div> 
          {/* จบส่วน modal-scroll-body */}

          {/* 4. Footer Actions (ติดตายด้านล่าง) */}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "กำลังบันทึก..." : "💾 บันทึก"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- MAIN COMPONENT ---
const MaterialInspection = () => {
  const { user, loading: authLoading } = useAuth();

  const materialTypeOptions = useMemo(() => [
    { value: "", label: "กรุณาเลือกประเภท" },
    { value: "bar", label: "เหล็กเส้น (Bar)" },
    { value: "rod", label: "เหล็กท่อน (Rod)" },
  ], []);

  const materialGradeOptions = useMemo(() => [
    { value: "", label: "กรุณาเลือกเกรดวัตถุดิบ" },
    { value: "S10C", label: "S10C" }, { value: "S20C", label: "S20C" }, { value: "S35C", label: "S35C" },
    { value: "S45C", label: "S45C" }, { value: "S48C", label: "S48C" }, { value: "S50C", label: "S50C" },
    { value: "S53C", label: "S53C" }, { value: "SS400", label: "SS400" }, { value: "SCM415", label: "SCM415" },
    { value: "SCM415H", label: "SCM415H" }, { value: "SCM435", label: "SCM435" }, { value: "SCM435H", label: "SCM435H" },{ value: "SCM440", label: "SCM440" },
    { value: "SCM420H", label: "SCM420H" }, { value: "SCR420H", label: "SCR420H" },
  ], []);

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const initialFormState = {
    material_type: "", material_grade: "", batch_number: "", supplier_name: "", maker_mat: "",
    receipt_date: "", invoice_number: "", cer_number: "", inspector: "", inspection_quantity: "",
    notes: "", overall_result: "pending", attached_images: [], attached_files: [],
    barInspections: createInitialBarInspections([], 4),
    rodInspections: createInitialRodInspection([], 4),
  };

  const [inspections, setInspections] = useState([]);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);

  // ✨ New States for Search & Month Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getYearMonth(new Date()));
  const [showAllData, setShowAllData] = useState(false);
  const [filterExpanded, setFilterExpanded] = useState(false);

  const [filters, setFilters] = useState({
    status: "", supplier: "", makerMat: "", materialGrade: "", page: 1, limit: 10,
  });

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
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
      if (res.status === 204) return { success: true, data: null };
      return { success: true, data: await res.json() };
    } catch (e) { return { success: false, error: e }; }
  }, []);

  // ✨ Fetch with search & month filter
  const fetchInspections = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => { if (filters[key]) params.append(key, filters[key]); });
      if (searchTerm) params.append("search", searchTerm);
      if (!showAllData && selectedMonth) params.append("month", selectedMonth);

      const res = await apiCall(`/api/v1/inspections?${params.toString()}`);
      if (res.success) {
        let data = (res.data.data || []).map(normalizeInspectionData);

        // Client-side search filter
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          data = data.filter((item) =>
            item.batchNumber?.toLowerCase().includes(term) ||
            item.supplierName?.toLowerCase().includes(term) ||
            item.makerMat?.toLowerCase().includes(term) ||
            item.invoiceNumber?.toLowerCase().includes(term) ||
            item.materialGrade?.toLowerCase().includes(term)
          );
        }

        // Client-side month filter
        if (!showAllData && selectedMonth) {
          data = data.filter((item) => item.receiptDate && getYearMonth(new Date(item.receiptDate)) === selectedMonth);
        }

        setInspections(data);
        setPagination({ ...res.data.pagination, total: data.length });
      }
    } catch (e) {
      console.error(e);
      Toast.fire({ icon: "error", title: "เกิดข้อผิดพลาด" });
    }
    setLoading(false);
  }, [filters, apiCall, searchTerm, selectedMonth, showAllData]);

  const fetchStats = useCallback(async () => {
    const res = await apiCall("/api/v1/inspections/stats/summary");
    if (res.success) setStats(res.data.data);
  }, [apiCall]);

  useEffect(() => { if (user) { fetchInspections(); fetchStats(); } }, [user, fetchInspections, fetchStats]);

  // Handlers
  const handleFilterChange = (e) => setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));
  const handleClearFilters = () => { setFilters({ status: "", supplier: "", makerMat: "", materialGrade: "", page: 1, limit: 10 }); Toast.fire({ icon: "info", title: "ล้างตัวกรองแล้ว" }); };
  const handleSearchChange = (v) => { setSearchTerm(v); setFilters((p) => ({ ...p, page: 1 })); };
  const handleSearchClear = () => { setSearchTerm(""); setFilters((p) => ({ ...p, page: 1 })); };
  const handleMonthChange = (v) => { setSelectedMonth(v); setFilters((p) => ({ ...p, page: 1 })); };
  const handleToggleAllData = (c) => { setShowAllData(c); setFilters((p) => ({ ...p, page: 1 })); };
  const handlePageChange = (p) => setFilters((prev) => ({ ...prev, page: p }));
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleBarInputChange = (idx, e) => { const { name, value } = e.target; setFormData((prev) => ({ ...prev, barInspections: prev.barInspections.map((b, i) => i === idx ? { ...b, [name]: value } : b) })); };
  const handleRodInputChange = (idx, e) => { const { name, value } = e.target; setFormData((prev) => ({ ...prev, rodInspections: prev.rodInspections.map((r, i) => i === idx ? { ...r, [name]: value } : r) })); };
  const handleFileUpload = (e, type) => { const files = Array.from(e.target.files); const key = type === "image" ? "attached_images" : "attached_files"; setFormData((prev) => ({ ...prev, [key]: [...prev[key], ...files] })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = new FormData();
      Object.keys(formData).forEach((key) => {
        if (["attached_images", "attached_files", "barInspections", "rodInspections"].includes(key)) return;
        payload.append(key, formData[key] || "");
      });
      if (formData.material_type === "bar") payload.append("bar_inspections", JSON.stringify(formData.barInspections));
      if (formData.material_type === "rod") payload.append("rod_inspections", JSON.stringify(formData.rodInspections));

      const endpoint = isEditing ? `/api/v1/inspections/${formData.id}` : "/api/v1/inspections";
      const method = isEditing ? "PUT" : "POST";
      const res = await apiCall(endpoint, { method, body: payload });

      if (res.success) {
        setShowModal(false);
        setFormData(initialFormState);
        Toast.fire({ icon: "success", title: isEditing ? "แก้ไขสำเร็จ!" : "บันทึกสำเร็จ!" });
        fetchInspections();
        fetchStats();
      } else {
        Swal.fire("Error", res.error.message, "error");
      }
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    } finally { setSaving(false); }
  };

  const handleEditClick = (insp) => {
    setIsEditing(true);
    setFormData({
      id: insp.id, material_type: insp.materialType, material_grade: insp.materialGrade,
      batch_number: insp.batchNumber, supplier_name: insp.supplierName, maker_mat: insp.makerMat,
      receipt_date: insp.receiptDate?.split("T")[0] || "", invoice_number: insp.invoiceNumber,
      cer_number: insp.cerNumber, inspector: insp.inspector, inspection_quantity: insp.inspectionQuantity,
      notes: insp.notes, overall_result: insp.overallResult, attached_images: [], attached_files: [],
      barInspections: insp.materialType === "bar" ? createInitialBarInspections(insp.barInspections, 4) : createInitialBarInspections([], 4),
      rodInspections: insp.materialType === "rod" ? createInitialRodInspection(insp.rodInspections, 4) : createInitialRodInspection([], 4),
    });
    setShowModal(true);
  };

  const handleDeleteClick = (insp) => {
    Swal.fire({ title: "ยืนยันการลบ?", html: `<p><strong>Batch:</strong> ${insp.batchNumber}</p>`, icon: "warning", showCancelButton: true, confirmButtonColor: "#d33", confirmButtonText: "🗑️ ลบ", cancelButtonText: "ยกเลิก" })
      .then(async (result) => {
        if (result.isConfirmed) {
          const res = await apiCall(`/api/v1/inspections/${insp.id}`, { method: "DELETE" });
          if (res.success) { Toast.fire({ icon: "success", title: "ลบสำเร็จ" }); fetchInspections(); fetchStats(); }
          else { Swal.fire("Error", res.error.message, "error"); }
        }
      });
  };

  const generatePDF = (insp) => {
    const doc = new jsPDF();
    doc.setFillColor(41, 128, 185); doc.rect(0, 0, 210, 35, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(20);
    doc.text("Material Inspection Report", 105, 20, { align: "center" });
    doc.setTextColor(0, 0, 0); doc.setFontSize(12);
    autoTable(doc, {
      startY: 45, body: [
        ["Batch", insp.batchNumber, "Type", insp.materialType],
        ["Grade", insp.materialGrade, "Qty", String(insp.inspectionQuantity)],
        ["Supplier", insp.supplierName, "Maker", insp.makerMat],
        ["Result", insp.overallResult.toUpperCase(), "Date", formatDate(insp.receiptDate)],
      ], theme: "grid"
    });
    doc.save(`Inspection_${insp.batchNumber}.pdf`);
    Toast.fire({ icon: "success", title: "PDF สำเร็จ" });
  };

  const generateExcel = (insp) => {
    const wb = XLSX.utils.book_new();
    const data = [["Batch", insp.batchNumber], ["Type", insp.materialType], ["Grade", insp.materialGrade], ["Supplier", insp.supplierName], ["Result", insp.overallResult]];
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
          <button className="add-new-btn" onClick={() => { setIsEditing(false); setFormData(initialFormState); setShowModal(true); }}>➕ เพิ่มรายการใหม่</button>
        </div>
      </div>

      <div className="stats-section">
        <StatsCard icon="📊" label="ทั้งหมด" value={stats.totalInspections || 0} color="blue" />
        <StatsCard icon="✅" label="ผ่าน" value={stats.passCount || 0} color="green" />
        <StatsCard icon="❌" label="ไม่ผ่าน" value={stats.failCount || 0} color="red" />
        <StatsCard icon="⏳" label="รอตรวจ" value={stats.pendingCount || 0} color="yellow" />
      </div>

      {/* ✨ Search & Month Filter */}
      <div className="search-filter-section">
        <SearchBar searchTerm={searchTerm} onSearchChange={handleSearchChange} onSearchClear={handleSearchClear} />
        <MonthSelector selectedMonth={selectedMonth} onMonthChange={handleMonthChange} monthOptions={monthOptions} showAllData={showAllData} onToggleAllData={handleToggleAllData} />
      </div>

      <FilterSection filters={filters} onFilterChange={handleFilterChange} onClearFilters={handleClearFilters} materialGradeOptions={materialGradeOptions} activeFilterCount={activeFilterCount} isExpanded={filterExpanded} onToggleExpand={() => setFilterExpanded(!filterExpanded)} />

      <div className="content-section">
        {loading ? <LoadingComponent message="กำลังโหลดข้อมูล..." /> : (
          <>
            <InspectionTable inspections={inspections} onEdit={handleEditClick} onView={(i) => { setSelectedInspection(i); setShowDetailsModal(true); }} onDelete={handleDeleteClick} searchTerm={searchTerm} />
            <Pagination pagination={pagination} onPageChange={handlePageChange} />
          </>
        )}
      </div>

      <MaterialFormModal showModal={showModal} isEditing={isEditing} formData={formData} handleInputChange={handleInputChange} handleBarInputChange={handleBarInputChange} handleRodInputChange={handleRodInputChange} handleFileUpload={handleFileUpload} handleSubmit={handleSubmit} setShowModal={setShowModal} saving={saving} materialTypeOptions={materialTypeOptions} materialGradeOptions={materialGradeOptions} />

      {showDetailsModal && selectedInspection && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 รายละเอียด</h2>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>✕</button>
            </div>
            <div className="details-content">
              <div className="detail-grid">
                <div className="detail-item"><span className="detail-label">Batch</span><span className="detail-value">{selectedInspection.batchNumber}</span></div>
                <div className="detail-item"><span className="detail-label">ประเภท</span><span className="detail-value">{selectedInspection.materialType === "bar" ? "เหล็กเส้น" : "เหล็กท่อน"}</span></div>
                <div className="detail-item"><span className="detail-label">เกรด</span><span className="detail-value">{selectedInspection.materialGrade}</span></div>
                <div className="detail-item"><span className="detail-label">ผู้จำหน่าย</span><span className="detail-value">{selectedInspection.supplierName}</span></div>
                <div className="detail-item"><span className="detail-label">ผู้ผลิต</span><span className="detail-value">{selectedInspection.makerMat}</span></div>
                <div className="detail-item"><span className="detail-label">วันที่รับ</span><span className="detail-value">{formatDate(selectedInspection.receiptDate)}</span></div>
                <div className="detail-item"><span className="detail-label">จำนวน</span><span className="detail-value">{selectedInspection.inspectionQuantity}</span></div>
                <div className="detail-item"><span className="detail-label">ผลลัพธ์</span><span className={`status-badge status-${selectedInspection.overallResult}`}>{selectedInspection.overallResult === "pass" ? "✅ ผ่าน" : selectedInspection.overallResult === "fail" ? "❌ ไม่ผ่าน" : "⏳ รอ"}</span></div>
              </div>
              <div className="modal-actions">
                <div className="export-buttons">
                  <button className="btn btn-export btn-pdf" onClick={() => generatePDF(selectedInspection)}>📄 PDF</button>
                  <button className="btn btn-export btn-excel" onClick={() => generateExcel(selectedInspection)}>📊 Excel</button>
                </div>
                <button className="btn btn-secondary" onClick={() => setShowDetailsModal(false)}>ปิด</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialInspection;