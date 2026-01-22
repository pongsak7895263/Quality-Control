// components/inspections/InspectionManagement.js
import React, { useState } from 'react';
import { useData } from '../../hooks/useData';
import InspectionModal from './InspectionModal';
import ReportModal from './ReportModal';
import ODCheck from './SpecTests/ODCheck';
import LengthCheck from './SpecTests/LengthCheck';
import VisualInspection from './SpecTests/VisualInspection';
import ChemicalTest from './SpecTests/ChemicalTest';

const InspectionManagement = () => {
  const { data: inspections, loading, createRecord, updateRecord, deleteRecord } = useData('inspections');
  const [showModal, setShowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingInspection, setEditingInspection] = useState(null);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [activeTest, setActiveTest] = useState(null);
  const [filter, setFilter] = useState({
    status: 'all',
    testType: 'all',
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

  const handleViewReport = (inspection) => {
    setSelectedInspection(inspection);
    setShowReportModal(true);
  };

  const handleRunTest = (inspection, testType) => {
    setSelectedInspection(inspection);
    setActiveTest(testType);
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
    if (window.confirm('คุณต้องการลบข้อมูลการตรวจสอบนี้หรือไม่?')) {
      await deleteRecord(id);
    }
  };

  const handleTestComplete = async (testData) => {
    // Update inspection with test results
    const updatedInspection = {
      ...selectedInspection,
      testResults: {
        ...selectedInspection.testResults,
        [activeTest]: testData
      }
    };
    
    await updateRecord(selectedInspection.id, updatedInspection);
    setActiveTest(null);
    setSelectedInspection(null);
  };

  const filteredInspections = inspections.filter(inspection => {
    if (filter.status !== 'all' && inspection.status !== filter.status) return false;
    if (filter.testType !== 'all' && inspection.testType !== filter.testType) return false;
    if (filter.dateFrom && new Date(inspection.testDate) < new Date(filter.dateFrom)) return false;
    if (filter.dateTo && new Date(inspection.testDate) > new Date(filter.dateTo)) return false;
    return true;
  });

  // Render active test component
  const renderActiveTest = () => {
    if (!activeTest || !selectedInspection) return null;

    const commonProps = {
      inspection: selectedInspection,
      onComplete: handleTestComplete,
      onCancel: () => setActiveTest(null)
    };

    switch (activeTest) {
      case 'od_check':
        return <ODCheck {...commonProps} />;
      case 'length_check':
        return <LengthCheck {...commonProps} />;
      case 'visual_inspection':
        return <VisualInspection {...commonProps} />;
      case 'chemical_test':
        return <ChemicalTest {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="inspection-management">
      <div className="page-header">
        <h1>การตรวจสอบทั่วไป</h1>
        <button 
          onClick={handleCreate}
          className="btn btn-primary"
        >
          <i className="icon-plus"></i>
          สร้างการตรวจสอบใหม่
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
              <option value="pending">รอการทดสอบ</option>
              <option value="in_progress">กำลังทดสอบ</option>
              <option value="completed">เสร็จสิ้น</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ไม่อนุมัติ</option>
            </select>
          </div>

          <div className="filter-group">
            <label>ประเภทการทดสอบ:</label>
            <select 
              value={filter.testType} 
              onChange={(e) => setFilter(prev => ({ ...prev, testType: e.target.value }))}
            >
              <option value="all">ทั้งหมด</option>
              <option value="dimensional">การตรวจสอบขนาด</option>
              <option value="visual">การตรวจสอบภายนอก</option>
              <option value="chemical">การทดสอบทางเคมี</option>
              <option value="mechanical">การทดสอบเชิงกล</option>
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
          <p>รอการทดสอบ</p>
        </div>
        <div className="stat-card">
          <h3>{inspections.filter(i => i.status === 'in_progress').length}</h3>
          <p>กำลังทดสอบ</p>
        </div>
        <div className="stat-card">
          <h3>{inspections.filter(i => i.status === 'completed').length}</h3>
          <p>เสร็จสิ้น</p>
        </div>
        <div className="stat-card">
          <h3>{inspections.length}</h3>
          <p>ทั้งหมด</p>
        </div>
      </div>

      {/* Inspections Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>กำลังโหลดข้อมูล...</p>
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="empty-state">
            <i className="icon-empty"></i>
            <h3>ไม่มีข้อมูลการตรวจสอบ</h3>
            <p>คลิกปุ่ม "สร้างการตรวจสอบใหม่" เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>รหัสการทดสอบ</th>
                <th>วันที่ทดสอบ</th>
                <th>วัตถุดิบ</th>
                <th>Lot Number</th>
                <th>ประเภทการทดสอบ</th>
                <th>ผู้ทดสอบ</th>
                <th>สถานะ</th>
                <th>ความคืบหน้า</th>
                <th>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredInspections.map((inspection) => (
                <tr key={inspection.id}>
                  <td>
                    <strong>{inspection.testId}</strong>
                  </td>
                  <td>
                    {new Date(inspection.testDate).toLocaleDateString('th-TH')}
                  </td>
                  <td>
                    <div className="material-info">
                      <span className="material-name">{inspection.materialName}</span>
                      <span className="material-spec">{inspection.specifications}</span>
                    </div>
                  </td>
                  <td>{inspection.lotNumber}</td>
                  <td>
                    <span className="test-type-badge">
                      {getTestTypeLabel(inspection.testType)}
                    </span>
                  </td>
                  <td>{inspection.testerName}</td>
                  <td>
                    <span className={`status-badge status-${inspection.status}`}>
                      {getStatusLabel(inspection.status)}
                    </span>
                  </td>
                  <td>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${getProgressPercentage(inspection)}%` }}
                      ></div>
                      <span className="progress-text">
                        {getProgressPercentage(inspection)}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleEdit(inspection)}
                        className="btn btn-sm btn-primary"
                        title="แก้ไข"
                      >
                        <i className="icon-edit"></i>
                      </button>
                      
                      {inspection.status === 'pending' && (
                        <div className="test-actions">
                          <button
                            onClick={() => handleRunTest(inspection, 'od_check')}
                            className="btn btn-sm btn-info"
                            title="ตรวจสอบ OD"
                          >
                            OD
                          </button>
                          <button
                            onClick={() => handleRunTest(inspection, 'length_check')}
                            className="btn btn-sm btn-info"
                            title="ตรวจสอบความยาว"
                          >
                            L
                          </button>
                          <button
                            onClick={() => handleRunTest(inspection, 'visual_inspection')}
                            className="btn btn-sm btn-info"
                            title="ตรวจสอบภายนอก"
                          >
                            V
                          </button>
                          <button
                            onClick={() => handleRunTest(inspection, 'chemical_test')}
                            className="btn btn-sm btn-info"
                            title="ทดสอบทางเคมี"
                          >
                            C
                          </button>
                        </div>
                      )}
                      
                      <button
                        onClick={() => handleViewReport(inspection)}
                        className="btn btn-sm btn-success"
                        title="ดูรายงาน"
                      >
                        <i className="icon-report"></i>
                      </button>
                      
                      <button
                        onClick={() => handleDelete(inspection.id)}
                        className="btn btn-sm btn-danger"
                        title="ลบ"
                      >
                        <i className="icon-delete"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <InspectionModal
          inspection={editingInspection}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {showReportModal && selectedInspection && (
        <ReportModal
          inspection={selectedInspection}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Active Test Component */}
      {renderActiveTest()}
    </div>
  );
};

// Helper functions
const getTestTypeLabel = (type) => {
  const typeLabels = {
    dimensional: 'ตรวจสอบขนาด',
    visual: 'ตรวจสอบภายนอก',
    chemical: 'ทดสอบทางเคมี',
    mechanical: 'ทดสอบเชิงกล'
  };
  return typeLabels[type] || type;
};

const getStatusLabel = (status) => {
  const statusLabels = {
    pending: 'รอการทดสอบ',
    in_progress: 'กำลังทดสอบ',
    completed: 'เสร็จสิ้น',
    approved: 'อนุมัติแล้ว',
    rejected: 'ไม่อนุมัติ'
  };
  return statusLabels[status] || status;
};

const getProgressPercentage = (inspection) => {
  if (!inspection.testResults) return 0;
  
  const totalTests = 4; // OD, Length, Visual, Chemical
  const completedTests = Object.keys(inspection.testResults || {}).length;
  
  return Math.round((completedTests / totalTests) * 100);
};

export default InspectionManagement;