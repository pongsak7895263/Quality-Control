// components/chemical/ChemicalTestManagement.js
import React, { useState } from 'react';
import { useChemicalTests } from '../../hooks/useData';
import ChemicalTestModal from './ChemicalTestModal';
import ChemicalReport from './ChemicalReport';

const ChemicalTestManagement = () => {
  const { data: chemicalTests, loading, createRecord, updateRecord, deleteRecord } = useChemicalTests();
  const [showModal, setShowModal] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [filter, setFilter] = useState({
    status: 'all',
    jisStandard: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const handleCreate = () => {
    setEditingTest(null);
    setShowModal(true);
  };

  const handleEdit = (test) => {
    setEditingTest(test);
    setShowModal(true);
  };

  const handleViewReport = (test) => {
    setSelectedTest(test);
    setShowReport(true);
  };

  const handleSave = async (data) => {
    if (editingTest) {
      await updateRecord(editingTest.id, data);
    } else {
      await createRecord(data);
    }
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('คุณต้องการลบข้อมูลการทดสอบนี้หรือไม่?')) {
      await deleteRecord(id);
    }
  };

  const filteredTests = chemicalTests.filter(test => {
    if (filter.status !== 'all' && test.status !== filter.status) return false;
    if (filter.jisStandard !== 'all' && test.jisStandard !== filter.jisStandard) return false;
    if (filter.dateFrom && new Date(test.testDate) < new Date(filter.dateFrom)) return false;
    if (filter.dateTo && new Date(test.testDate) > new Date(filter.dateTo)) return false;
    return true;
  });

  return (
    <div className="chemical-test-management">
      <div className="page-header">
        <h1>การทดสอบทางเคมี</h1>
        <button 
          onClick={handleCreate}
          className="btn btn-primary"
        >
          <i className="icon-plus"></i>
          สร้างการทดสอบใหม่
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
              <option value="pending">รอผลทดสอบ</option>
              <option value="completed">เสร็จสิ้น</option>
              <option value="approved">อนุมัติแล้ว</option>
              <option value="rejected">ไม่อนุมัติ</option>
            </select>
          </div>

          <div className="filter-group">
            <label>มาตรฐาน JIS:</label>
            <select 
              value={filter.jisStandard} 
              onChange={(e) => setFilter(prev => ({ ...prev, jisStandard: e.target.value }))}
            >
              <option value="all">ทั้งหมด</option>
              <option value="G4051">JIS G4051</option>
              <option value="G4052">JIS G4052</option>
              <option value="G4053">JIS G4053</option>
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
          <h3>{chemicalTests.filter(t => t.status === 'pending').length}</h3>
          <p>รอผลทดสอบ</p>
        </div>
        <div className="stat-card">
          <h3>{chemicalTests.filter(t => t.status === 'completed').length}</h3>
          <p>เสร็จสิ้น</p>
        </div>
        <div className="stat-card">
          <h3>{chemicalTests.filter(t => t.status === 'approved').length}</h3>
          <p>อนุมัติแล้ว</p>
        </div>
        <div className="stat-card">
          <h3>{chemicalTests.length}</h3>
          <p>ทั้งหมด</p>
        </div>
      </div>

      {/* Tests Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>กำลังโหลดข้อมูล...</p>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="empty-state">
            <i className="icon-empty"></i>
            <h3>ไม่มีข้อมูลการทดสอบทางเคมี</h3>
            <p>คลิกปุ่ม "สร้างการทดสอบใหม่" เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>รหัสทดสอบ</th>
                <th>วันที่ทดสอบ</th>
                <th>Lot Number</th>
                <th>Heat Number</th>
                <th>เกรด</th>
                <th>มาตรฐาน JIS</th>
                <th>OD (มม.)</th>
                <th>จำนวนตัวอย่าง</th>
                <th>Cert No.</th>
                <th>ผู้จำหน่าย</th>
                <th>สถานะ</th>
                <th>ผู้ทดสอบ</th>
                <th>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTests.map((test) => (
                <tr key={test.id}>
                  <td>
                    <strong>{test.testId}</strong>
                  </td>
                  <td>
                    {new Date(test.testDate).toLocaleDateString('th-TH')}
                  </td>
                  <td>{test.lotNumber}</td>
                  <td>{test.heatNumber}</td>
                  <td>{test.grade}</td>
                  <td>
                    <span className="jis-badge">JIS {test.jisStandard}</span>
                  </td>
                  <td>{test.outerDiameter}</td>
                  <td>{test.sampleCount}</td>
                  <td>{test.certificationNumber}</td>
                  <td>{test.supplier}</td>
                  <td>
                    <span className={`status-badge status-${test.status}`}>
                      {getStatusLabel(test.status)}
                    </span>
                  </td>
                  <td>{test.testedBy}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleEdit(test)}
                        className="btn btn-sm btn-primary"
                        title="แก้ไข"
                      >
                        <i className="icon-edit"></i>
                      </button>
                      
                      <button
                        onClick={() => handleViewReport(test)}
                        className="btn btn-sm btn-info"
                        title="ดูรายงาน"
                      >
                        <i className="icon-report"></i>
                      </button>
                      
                      {test.status === 'approved' && (
                        <button
                          onClick={() => window.open(`/api/chemical-tests/${test.id}/pdf`, '_blank')}
                          className="btn btn-sm btn-success"
                          title="ดาวน์โหลด PDF"
                        >
                          <i className="icon-download"></i>
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDelete(test.id)}
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
        <ChemicalTestModal
          test={editingTest}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {showReport && selectedTest && (
        <ChemicalReport
          test={selectedTest}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

// Helper function for status labels
const getStatusLabel = (status) => {
  const statusLabels = {
    pending: 'รอผลทดสอบ',
    completed: 'เสร็จสิ้น',
    approved: 'อนุมัติแล้ว',
    rejected: 'ไม่อนุมัติ'
  };
  return statusLabels[status] || status;
};

export default ChemicalTestManagement;