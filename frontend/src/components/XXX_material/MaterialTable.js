// components/materials/MaterialTable.js
import React from 'react';

const MaterialTable = ({ inspections, loading, onEdit, onDelete }) => {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (inspections.length === 0) {
    return (
      <div className="empty-state">
        <i className="icon-empty"></i>
        <h3>ไม่มีข้อมูลการตรวจรับวัตถุดิบ</h3>
        <p>คลิกปุ่ม "สร้างใบตรวจรับใหม่" เพื่อเริ่มต้น</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'status-pending', label: 'รอตรวจสอบ' },
      approved: { class: 'status-approved', label: 'อนุมัติแล้ว' },
      rejected: { class: 'status-rejected', label: 'ไม่อนุมัติ' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  const getMaterialTypeLabel = (type) => {
    const typeLabels = {
      steel_pipe: 'เหล็กท่อน',
      steel_bar: 'เหล็กเส้น',
      hardened_work: 'งานชุบแข็ง'
    };
    return typeLabels[type] || type;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH');
  };

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>รหัส</th>
            <th>วันที่รับเข้า</th>
            <th>Lot Number</th>
            <th>Heat Number</th>
            <th>ประเภท</th>
            <th>ผู้จำหน่าย</th>
            <th>OD (มม.)</th>
            <th>ความยาว (มม.)</th>
            <th>จำนวน</th>
            <th>สถานะ</th>
            <th>ผู้ตรวจสอบ</th>
            <th>การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          {inspections.map((inspection) => (
            <tr key={inspection.id || inspection.inspectionId}>
              <td>
                <div className="id-cell">
                  <span className="inspection-id">{inspection.inspectionId}</span>
                  {inspection.qrCode && (
                    <div className="qr-icon" title="มี QR Code">
                      <i className="icon-qr"></i>
                    </div>
                  )}
                </div>
              </td>
              <td>{formatDate(inspection.receivedDate)}</td>
              <td>
                <strong>{inspection.lotNumber}</strong>
              </td>
              <td>{inspection.heatNumber}</td>
              <td>
                <span className="material-type">
                  {getMaterialTypeLabel(inspection.materialType)}
                </span>
              </td>
              <td>{inspection.supplier}</td>
              <td>
                {inspection.outerDiameter ? 
                  `${inspection.outerDiameter}` : '-'
                }
              </td>
              <td>
                {inspection.length ? 
                  `${inspection.length}` : '-'
                }
              </td>
              <td>
                {inspection.quantity ? 
                  `${inspection.quantity} เส้น` : '-'
                }
              </td>
              <td>{getStatusBadge(inspection.status)}</td>
              <td>{inspection.inspectedBy}</td>
              <td>
                <div className="action-buttons">
                  <button
                    onClick={() => onEdit(inspection)}
                    className="btn btn-sm btn-primary"
                    title="แก้ไข"
                  >
                    <i className="icon-edit"></i>
                  </button>
                  
                  {inspection.status === 'approved' && (
                    <button
                      onClick={() => window.open(`/api/inspections/${inspection.id}/pdf`, '_blank')}
                      className="btn btn-sm btn-info"
                      title="ดาวน์โหลด PDF"
                    >
                      <i className="icon-download"></i>
                    </button>
                  )}
                  
                  {inspection.qrCode && (
                    <button
                      onClick={() => {
                        // Show QR Code modal
                        const qrModal = document.createElement('div');
                        qrModal.innerHTML = `
                          <div class="qr-modal-overlay">
                            <div class="qr-modal-content">
                              <h3>QR Code สำหรับการสอบย้อนกลับ</h3>
                              <div class="qr-code-display">
                                <img src="${inspection.qrCode}" alt="QR Code" />
                              </div>
                              <p>Inspection ID: ${inspection.inspectionId}</p>
                              <button class="btn btn-secondary" onclick="this.closest('.qr-modal-overlay').remove()">ปิด</button>
                            </div>
                          </div>
                        `;
                        document.body.appendChild(qrModal);
                      }}
                      className="btn btn-sm btn-secondary"
                      title="ดู QR Code"
                    >
                      <i className="icon-qr"></i>
                    </button>
                  )}
                  
                  <button
                    onClick={() => onDelete(inspection.id)}
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
      
      {/* Table Summary */}
      <div className="table-summary">
        <p>แสดง {inspections.length} รายการ</p>
      </div>
    </div>
  );
};

export default MaterialTable;