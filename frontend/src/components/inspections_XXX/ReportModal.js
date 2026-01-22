// src/components/inspections/ReportModal.js
import React, { useState } from 'react';
import Modal from '../common/Modal';
import { exportToPDF, generateQRCode } from '../../utils/pdfUtils';
import './SpecTests/ReportModal.css';

const ReportModal = ({ inspection, onClose, onExport }) => {
  const [loading, setLoading] = useState(false);
  const [reportOptions, setReportOptions] = useState({
    includeQR: true,
    includeSignatures: true,
    includePhotos: false,
    format: 'pdf'
  });

  const handleExport = async () => {
    setLoading(true);
    try {
      // สร้าง QR Code ถ้าเลือกไว้
      let qrCode = null;
      if (reportOptions.includeQR) {
        const qrData = {
          inspectionId: inspection.id,
          type: inspection.type,
          date: inspection.date,
          inspector: inspection.inspector
        };
        qrCode = await generateQRCode(qrData);
      }

      // ส่งออกรายงาน
      await exportToPDF({
        ...inspection,
        reportOptions,
        qrCode
      });

      if (onExport) {
        onExport(inspection.id, reportOptions);
      }

      onClose();
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('เกิดข้อผิดพลาดในการส่งออกรายงาน');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (option, value) => {
    setReportOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  if (!inspection) {
    return null;
  }

  return (
    <Modal title="ส่งออกรายงานการตรวจสอบ" onClose={onClose} size="medium">
      <div className="report-modal">
        
        {/* ข้อมูลการตรวจสอบ */}
        <div className="inspection-summary">
          <h3>ข้อมูลการตรวจสอบ</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <label>ประเภท:</label>
              <span>{inspection.type}</span>
            </div>
            <div className="summary-item">
              <label>วันที่:</label>
              <span>{new Date(inspection.date).toLocaleDateString('th-TH')}</span>
            </div>
            <div className="summary-item">
              <label>ผู้ตรวจสอบ:</label>
              <span>{inspection.inspector}</span>
            </div>
            <div className="summary-item">
              <label>สถานะ:</label>
              <span className={`status-badge status-${inspection.status}`}>
                {inspection.status === 'approved' ? 'อนุมัติแล้ว' :
                 inspection.status === 'rejected' ? 'ไม่อนุมัติ' : 'รอการอนุมัติ'}
              </span>
            </div>
          </div>
        </div>

        {/* ตั้งค่ารายงาน */}
        <div className="report-options">
          <h3>ตั้งค่ารายงาน</h3>
          
          <div className="option-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={reportOptions.includeQR}
                onChange={(e) => handleOptionChange('includeQR', e.target.checked)}
              />
              <span className="checkmark"></span>
              รวม QR Code สำหรับการตรวจสอบย้อนกลับ
            </label>
          </div>

          <div className="option-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={reportOptions.includeSignatures}
                onChange={(e) => handleOptionChange('includeSignatures', e.target.checked)}
              />
              <span className="checkmark"></span>
              รวมพื้นที่สำหรับลายเซ็น
            </label>
          </div>

          <div className="option-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={reportOptions.includePhotos}
                onChange={(e) => handleOptionChange('includePhotos', e.target.checked)}
              />
              <span className="checkmark"></span>
              รวมรูปภาพประกอบ (ถ้ามี)
            </label>
          </div>

          <div className="option-group">
            <label>รูปแบบไฟล์:</label>
            <select
              value={reportOptions.format}
              onChange={(e) => handleOptionChange('format', e.target.value)}
            >
              <option value="pdf">PDF</option>
              <option value="html">HTML</option>
              <option value="word">Word Document</option>
            </select>
          </div>
        </div>

        {/* ตัวอย่างรายงาน */}
        <div className="report-preview">
          <h3>ตัวอย่างรายงาน</h3>
          <div className="preview-container">
            <div className="preview-page">
              <div className="preview-header">
                <h4>รายงานการตรวจสอบคุณภาพ</h4>
                <p>เลขที่: {inspection.id}</p>
              </div>
              
              <div className="preview-content">
                <p><strong>ประเภทการตรวจสอบ:</strong> {inspection.type}</p>
                <p><strong>วันที่ตรวจสอบ:</strong> {new Date(inspection.date).toLocaleDateString('th-TH')}</p>
                <p><strong>ผู้ตรวจสอบ:</strong> {inspection.inspector}</p>
                
                {inspection.materialInfo && (
                  <div className="material-info">
                    <p><strong>ข้อมูลวัตถุดิบ:</strong></p>
                    <ul>
                      <li>ประเภท: {inspection.materialInfo.type}</li>
                      <li>Lot Number: {inspection.materialInfo.lotNumber}</li>
                      <li>ผู้จำหน่าย: {inspection.materialInfo.supplier}</li>
                    </ul>
                  </div>
                )}

                <div className="inspection-results">
                  <p><strong>ผลการตรวจสอบ:</strong></p>
                  <div className={`result-badge ${inspection.overallResult === 'ผ่าน' ? 'pass' : 'fail'}`}>
                    {inspection.overallResult || 'ผ่าน'}
                  </div>
                </div>

                {reportOptions.includeQR && (
                  <div className="qr-section">
                    <p><strong>QR Code:</strong> [QR Code จะปรากฏที่นี่]</p>
                  </div>
                )}

                {reportOptions.includeSignatures && (
                  <div className="signature-section">
                    <div className="signature-box">
                      <p>ลายเซ็นผู้ตรวจสอบ</p>
                      <div className="signature-line"></div>
                    </div>
                    <div className="signature-box">
                      <p>ลายเซ็นผู้อนุมัติ</p>
                      <div className="signature-line"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ปุ่มดำเนินการ */}
        <div className="modal-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={loading}
          >
            ยกเลิก
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleExport}
            disabled={loading}
          >
            {loading ? 'กำลังสร้างรายงาน...' : `ส่งออกเป็น ${reportOptions.format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ReportModal;