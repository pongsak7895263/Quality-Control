// components/chemical/ChemicalReport.js
import React from 'react';
import { JIS_STANDARDS } from '../../utils/mockData';
import { exportToPDF } from '../../utils/calculations';

const ChemicalReport = ({ test, onClose }) => {
  if (!test) return null;

  const selectedStandard = JIS_STANDARDS[test.jisStandard];
  
  const handleExportPDF = () => {
    exportToPDF(test, 'chemical-test');
  };

  const checkElementLimit = (value, limit) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return true;
    
    if (limit.max !== undefined && numValue > limit.max) return false;
    if (limit.min !== undefined && numValue < limit.min) return false;
    return true;
  };

  const formatLimit = (limit) => {
    if (!limit) return '-';
    if (limit.min !== undefined && limit.max !== undefined) {
      return `${limit.min} - ${limit.max}`;
    } else if (limit.max !== undefined) {
      return `≤ ${limit.max}`;
    } else if (limit.min !== undefined) {
      return `≥ ${limit.min}`;
    }
    return '-';
  };

  const getElementResult = (element, value) => {
    if (!value || value === '') return { status: 'not-tested', label: 'ไม่ได้ทดสอบ' };
    
    const limit = selectedStandard?.chemicalLimits[element];
    if (!limit) return { status: 'no-limit', label: 'ไม่มีข้อกำหนด' };
    
    const isWithinLimit = checkElementLimit(value, limit);
    return {
      status: isWithinLimit ? 'pass' : 'fail',
      label: isWithinLimit ? 'ผ่าน' : 'ไม่ผ่าน'
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content extra-large">
        <div className="modal-header">
          <h2>รายงานการทดสอบทางเคมี - {test.testId}</h2>
          <div className="modal-header-actions">
            <button 
              onClick={handleExportPDF} 
              className="btn btn-info"
              title="Export เป็น PDF"
            >
              <i className="icon-download"></i>
              Export PDF
            </button>
            <button onClick={onClose} className="close-btn">&times;</button>
          </div>
        </div>

        <div className="report-content">
          {/* Report Header */}
          <div className="report-header">
            <div className="report-title">
              <h1>รายงานการทดสอบทางเคมี</h1>
              <h2>Chemical Test Report</h2>
              <div className="report-id">รหัสการทดสอบ: {test.testId}</div>
            </div>
            
            <div className="report-status">
              <span className={`status-badge status-${test.status}`}>
                {getStatusLabel(test.status)}
              </span>
            </div>
          </div>

          {/* Basic Information */}
          <div className="report-section">
            <h3>ข้อมูลการทดสอบ / Test Information</h3>
            <div className="info-grid">
              <div className="info-column">
                <div className="info-item">
                  <span className="label">วันที่ทดสอบ:</span>
                  <span className="value">{formatDate(test.testDate)}</span>
                </div>
                <div className="info-item">
                  <span className="label">Lot Number:</span>
                  <span className="value">{test.lotNumber}</span>
                </div>
                <div className="info-item">
                  <span className="label">Heat Number:</span>
                  <span className="value">{test.heatNumber}</span>
                </div>
                <div className="info-item">
                  <span className="label">เกรด:</span>
                  <span className="value">{test.grade}</span>
                </div>
                <div className="info-item">
                  <span className="label">มาตรฐาน:</span>
                  <span className="value">JIS {test.jisStandard}</span>
                </div>
              </div>
              
              <div className="info-column">
                <div className="info-item">
                  <span className="label">OD (มม.):</span>
                  <span className="value">{test.outerDiameter}</span>
                </div>
                <div className="info-item">
                  <span className="label">จำนวนตัวอย่าง:</span>
                  <span className="value">{test.sampleCount}</span>
                </div>
                <div className="info-item">
                  <span className="label">Cert No.:</span>
                  <span className="value">{test.certificationNumber || '-'}</span>
                </div>
                <div className="info-item">
                  <span className="label">ผู้จำหน่าย:</span>
                  <span className="value">{test.supplier}</span>
                </div>
                <div className="info-item">
                  <span className="label">ผู้ทดสอบ:</span>
                  <span className="value">{test.testedBy}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chemical Composition Table */}
          <div className="report-section">
            <h3>Chemical Composition (%)</h3>
            <div className="standard-info">
              <strong>มาตรฐาน: JIS {test.jisStandard}</strong>
              {selectedStandard && (
                <p className="standard-description">{selectedStandard.description}</p>
              )}
            </div>
            
            <div className="chemical-table-container">
              <table className="chemical-results-table">
                <thead>
                  <tr>
                    <th>Element</th>
                    <th>Actual Value (%)</th>
                    <th>JIS {test.jisStandard} Limit (%)</th>
                    <th>Result</th>
                    <th>Deviation</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(test.chemicalComposition)
                    .filter(([element, value]) => value !== '')
                    .map(([element, value]) => {
                      const limit = selectedStandard?.chemicalLimits[element];
                      const result = getElementResult(element, value);
                      const numValue = parseFloat(value);
                      
                      let deviation = '-';
                      if (!isNaN(numValue) && limit) {
                        if (limit.max !== undefined && numValue > limit.max) {
                          deviation = `+${(numValue - limit.max).toFixed(3)}`;
                        } else if (limit.min !== undefined && numValue < limit.min) {
                          deviation = `-${(limit.min - numValue).toFixed(3)}`;
                        }
                      }
                      
                      return (
                        <tr key={element} className={`result-${result.status}`}>
                          <td className="element-name">
                            <strong>{element.toUpperCase()}</strong>
                          </td>
                          <td className="actual-value">{value}</td>
                          <td className="limit-value">{formatLimit(limit)}</td>
                          <td className={`result-status result-${result.status}`}>
                            <span className={`result-badge ${result.status}`}>
                              {result.label}
                            </span>
                          </td>
                          <td className="deviation-value">{deviation}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Test Results Summary */}
          <div className="report-section">
            <h3>สรุปผลการทดสอบ / Test Results Summary</h3>
            
            {test.testResults.conformsToStandard !== null && (
              <div className={`overall-result ${test.testResults.conformsToStandard ? 'pass' : 'fail'}`}>
                <div className="result-icon">
                  {test.testResults.conformsToStandard ? '✓' : '✗'}
                </div>
                <div className="result-text">
                  <h4>
                    {test.testResults.conformsToStandard ? 
                      `ผ่านมาตรฐาน JIS ${test.jisStandard}` : 
                      `ไม่ผ่านมาตรฐาน JIS ${test.jisStandard}`
                    }
                  </h4>
                  <p>
                    {test.testResults.conformsToStandard ? 
                      'องค์ประกอบทางเคมีทั้งหมดเป็นไปตามข้อกำหนด' : 
                      'พบองค์ประกอบทางเคมีที่ไม่เป็นไปตามข้อกำหนด'
                    }
                  </p>
                </div>
              </div>
            )}

            {test.testResults.deviations && test.testResults.deviations.length > 0 && (
              <div className="deviations-section">
                <h4>รายการที่ไม่เป็นไปตามมาตรฐาน:</h4>
                <ul className="deviations-list">
                  {test.testResults.deviations.map((deviation, index) => (
                    <li key={index} className="deviation-item">
                      <i className="icon-warning"></i>
                      {deviation}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {test.testResults.notes && (
              <div className="test-notes">
                <h4>หมายเหตุ:</h4>
                <p>{test.testResults.notes}</p>
              </div>
            )}
          </div>

          {/* Verification and Approval */}
          <div className="report-section">
            <h3>การยืนยันและอนุมัติ / Verification & Approval</h3>
            <div className="approval-grid">
              <div className="approval-step">
                <h4>ผู้ทดสอบ / Tested By</h4>
                <div className="signature-box">
                  <div className="signature-name">{test.testedBy}</div>
                  <div className="signature-date">วันที่: {formatDate(test.testDate)}</div>
                </div>
              </div>

              {test.verifiedBy && (
                <div className="approval-step">
                  <h4>ผู้ยืนยันผล / Verified By</h4>
                  <div className="signature-box">
                    <div className="signature-name">{test.verifiedBy}</div>
                    <div className="signature-date">วันที่: {formatDate(test.testDate)}</div>
                  </div>
                </div>
              )}

              {test.approvedBy && (
                <div className="approval-step">
                  <h4>ผู้อนุมัติ / Approved By</h4>
                  <div className="signature-box">
                    <div className="signature-name">{test.approvedBy}</div>
                    <div className="signature-date">วันที่: {formatDate(test.approvalDate)}</div>
                  </div>
                </div>
              )}
            </div>

            {test.remarks && (
              <div className="approval-remarks">
                <h4>ข้อสังเกต / Remarks:</h4>
                <p>{test.remarks}</p>
              </div>
            )}
          </div>

          {/* QR Code */}
          {test.qrCode && (
            <div className="report-section qr-section">
              <h3>QR Code สำหรับการสอบย้อนกลับ</h3>
              <div className="qr-container">
                <img src={test.qrCode} alt="QR Code" className="qr-image" />
                <div className="qr-info">
                  <p><strong>Test ID:</strong> {test.testId}</p>
                  <p><strong>Heat No:</strong> {test.heatNumber}</p>
                  <p><strong>Date:</strong> {formatDate(test.testDate)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="report-footer">
            <div className="footer-info">
              <p>สร้างเมื่อ: {formatDate(new Date().toISOString())}</p>
              <p>ระบบตรวจสอบคุณภาพในสายการผลิต</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">
            ปิด
          </button>
          <button onClick={handleExportPDF} className="btn btn-primary">
            <i className="icon-download"></i>
            Export PDF
          </button>
        </div>
      </div>
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

export default ChemicalReport;