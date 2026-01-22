// components/materials/MaterialManagement.js
import React, { useState } from 'react';
import { useMaterialInspections } from '../../hooks/useData';
import MaterialModal from './MaterialModal';
import MaterialTable from './MaterialTable';

const MaterialManagement = () => {
  const { data: inspections, loading, createRecord, updateRecord, deleteRecord } = useMaterialInspections();
  const [showModal, setShowModal] = useState(false);
  const [editingInspection, setEditingInspection] = useState(null);
  const [filter, setFilter] = useState({
    status: 'all',
    materialType: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const handleCreate = () => {
    setEditingInspection(null);
    setShowModal(true);
  };

  const handleEdit = (inspection) => {
    setEditingInspection(inspection);
    setShowModal(true);
  };

  const handleSave = async (data) => {
    if (editingInspection) {
      await updateRecord(editingInspection.id, data);
    } else {
      await createRecord(data);
    }
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('คุณต้องการลบข้อมูลนี้หรือไม่?')) {
      await deleteRecord(id);
    }
  };

  const filteredInspections = inspections.filter(inspection => {
    if (filter.status !== 'all' && inspection.status !== filter.status) return false;
    if (filter.materialType !== 'all' && inspection.materialType !== filter.materialType) return false;
    if (filter.dateFrom && new Date(inspection.receivedDate) < new Date(filter.dateFrom)) return false;
    if (filter.dateTo && new Date(inspection.receivedDate) > new Date(filter.dateTo)) return false;
    return true;
  });

  return (
    <div className="material-management">
      <div className="page-header">
        <h1>การตรวจรับวัตถุดิบ</h1>
        <button 
          onClick={handleCreate}
          className="btn btn-primary"
        >
          <i className="icon-plus"></i>
          สร้างใบตรวจรับใหม่
        </button>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>สถานะ:</label>
            <select 
              value={filter.status} 
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="all">ทั้งหมด</option>
              <option value="pending">รอตรวจสอบ</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ไม่อนุมัติ</option>
            </select>
          </div>

          <div className="filter-group">
            <label>ประเภทวัตถุดิบ:</label>
            <select 
              value={filter.materialType} 
              onChange={(e) => setFilter(prev => ({ ...prev, materialType: e.target.value }))}
            >
              <option value="all">ทั้งหมด</option>
              <option value="steel_bar">เหล็กเส้น</option>
              <option value="steel_pipe">เหล็กท่อน</option>
              <option value="hardened_work">งานชุบแข็ง</option>
            </select>
          </div>

          <div className="filter-group">
            <label>วันที่เริ่มต้น:</label>
            <input 
              type="date" 
              value={filter.dateFrom}
              onChange={(e) => setFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label>วันที่สิ้นสุด:</label>
            <input 
              type="date" 
              value={filter.dateTo}
              onChange={(e) => setFilter(prev => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-section">
        <div className="stat-card">
          <h3>{inspections.filter(i => i.status === 'pending').length}</h3>
          <p>รอตรวจสอบ</p>
        </div>
        <div className="stat-card">
          <h3>{inspections.filter(i => i.status === 'approved').length}</h3>
          <p>อนุมัติแล้ว</p>
        </div>
        <div className="stat-card">
          <h3>{inspections.filter(i => i.status === 'rejected').length}</h3>
          <p>ไม่อนุมัติ</p>
        </div>
        <div className="stat-card">
          <h3>{inspections.length}</h3>
          <p>ทั้งหมด</p>
        </div>
      </div>

      {/* Table */}
      <MaterialTable 
        inspections={filteredInspections}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Modal */}
      {showModal && (
        <MaterialModal
          inspection={editingInspection}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default MaterialManagement;