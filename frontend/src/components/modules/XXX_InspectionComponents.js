// src/components/modules/InspectionComponents.js
import React from "react";

export const LoadingComponent = ({ message = "Loading..." }) => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>{message}</p>
  </div>
);
export const ErrorComponent = ({ message, onRetry }) => (
  <div className="error-container">
    <div className="error-icon">⚠️</div>
    <h3>เกิดข้อผิดพลาด</h3>
    <p>{message}</p>
    <button className="retry-btn" onClick={onRetry}>
      🔄 ลองใหม่
    </button>
  </div>
);

const StatCard = ({ icon, label, value, color, isPercentage }) => (
  <div className={`stats-card ${color}`}>
    <div className="stats-icon">{icon}</div>
    <div className="stats-content">
      <div className="stats-value">
        {value}
        {isPercentage && "%"}
      </div>
      <div className="stats-label">{label}</div>
    </div>
  </div>
);
export const StatCards = ({ stats }) => (
  <div className="stats-section">
    <StatCard
      icon="📊"
      label="ทั้งหมด"
      value={stats.totalInspections || 0}
      color="blue"
    />
    <StatCard
      icon="✅"
      label="ผ่าน"
      value={stats.passCount || 0}
      color="green"
    />
    <StatCard
      icon="❌"
      label="ไม่ผ่าน"
      value={stats.failCount || 0}
      color="red"
    />
    <StatCard
      icon="⏳"
      label="รอตรวจ"
      value={stats.pendingCount || 0}
      color="yellow"
    />
    <StatCard
      icon="📈"
      label="อัตราผ่าน"
      value={stats.passRate || "0.0"}
      color="purple"
      isPercentage={true}
    />
  </div>
);

export const FilterSection = ({ filters, onFilterChange }) => {
  const statusOptions = [
    { value: "", label: "ทุกสถานะ" },
    { value: "pass", label: "✅ ผ่าน" },
    { value: "fail", label: "❌ ไม่ผ่าน" },
    { value: "pending", label: "⏳ รอตรวจ" },
  ];
  return (
    <div className="filter-section">
      <div className="filter-header">
        <h3>🔍 ตัวกรองข้อมูล</h3>
      </div>
      <div className="filter-controls">
        <div className="filter-group">
          <label>สถานะ</label>
          <select
            name="status"
            value={filters.status}
            onChange={onFilterChange}
            className="filter-select"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>ผู้จำหน่าย</label>
          <input
            type="text"
            name="supplier"
            placeholder="ค้นหา..."
            value={filters.supplier}
            onChange={onFilterChange}
            className="filter-input"
          />
        </div>
      </div>
    </div>
  );
};

export const InspectionTable = ({
  inspections,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="table-container">
      <div className="table-header">
        <h3>📋 รายการตรวจสอบวัตถุดิบ</h3>
      </div>
      <div className="table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th>#</th>
              <th>ประเภทเหล็ก</th>
              <th>เกรด</th>
              <th>Batch No.</th>
              <th>ผู้จำหน่าย</th>
              <th>สถานะ</th>
              <th>วันที่สร้าง</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {inspections.length > 0 ? (
              inspections.map((insp, index) => (
                <tr key={insp.id}>
                  <td>
                    {pagination.limit * (pagination.page - 1) + index + 1}
                  </td>
                  <td>
                    {insp.materialType === "bar"
                      ? "🔩 เหล็กท่อน"
                      : "📏 เหล็กเส้น"}
                  </td>
                  <td>{insp.materialGrade}</td>
                  <td>{insp.batchNumber}</td>
                  <td>{insp.supplierName}</td>
                  <td>
                    <span
                      className={`status-badge status-${insp.overallResult}`}
                    >
                      {insp.overallResult}
                    </span>
                  </td>
                  <td>
                    {new Date(insp.createdAt).toLocaleDateString("th-TH")}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => onEdit(insp)}
                        className="action-btn edit-btn"
                        title="แก้ไข"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onDelete(insp)}
                        className="action-btn delete-btn"
                        title="ลบ"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="empty-state">
                  <h3>ไม่พบข้อมูล</h3>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pagination.totalPages > 1 && (
        <div className="pagination-container">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            ← ก่อนหน้า
          </button>
          <span>
            หน้า {pagination.page} จาก {pagination.totalPages}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            ถัดไป →
          </button>
        </div>
      )}
    </div>
  );
};
