// components/materials/MaterialModal.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { generateQRCode, exportToPDF } from '../../utils/calculations';

const MaterialModal = ({ inspection, onSave, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    // Basic Information
    receivedDate: new Date().toISOString().split('T')[0],
    approvalDate: '',
    lotNumber: '',
    heatNumber: '',
    supplier: '',
    materialType: 'steel_pipe',
    grade: '',
    certificationNumber: '',
    
    // Steel Pipe Specific
    outerDiameter: '',
    length: '',
    quantity: '',
    samplesInspected: 4, // Default 4 samples per bundle
    
    // Inspection Tools
    measurementTool: 'vernier',
    measuringTape: false,
    
    // Quality Checks
    dimensionalCheck: {
      odMeasurements: ['', '', '', ''],
      lengthMeasurements: ['', '', '', ''],
      results: 'pending'
    },
    
    visualInspection: {
      generalAppearance: 'good',
      noCracks: true,
      noFissures: true,
      packaging: 'good',
      notes: ''
    },
    
    // Approval
    status: 'pending',
    inspectedBy: user?.name || '',
    approvedBy: '',
    remarks: ''
  });

  useEffect(() => {
    if (inspection) {
      setFormData(inspection);
    }
  }, [inspection]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleArrayChange = (section, field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: prev[section][field].map((item, i) => i === index ? value : item)
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Generate QR Code data
    const qrData = {
      id: inspection?.id || `MAT-${Date.now()}`,
      lotNumber: formData.lotNumber,
      heatNumber: formData.heatNumber,
      receivedDate: formData.receivedDate,
      materialType: formData.materialType
    };
    
    const dataToSave = {
      ...formData,
      qrCode: generateQRCode(qrData),
      inspectionId: qrData.id,
      lastModified: new Date().toISOString()
    };
    
    onSave(dataToSave);
  };

  const handleApprove = () => {
    if (!user.permissions?.canApprove) {
      alert('คุณไม่มีสิทธิ์อนุมัติ');
      return;
    }
    
    const approvedData = {
      ...formData,
      status: 'approved',
      approvedBy: user.name,
      approvalDate: new Date().toISOString().split('T')[0]
    };
    
    setFormData(approvedData);
  };

  const handleExportPDF = () => {
    exportToPDF(formData, 'material-inspection');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h2>{inspection ? 'แก้ไขใบตรวจรับวัตถุดิบ' : 'สร้างใบตรวจรับวัตถุดิบใหม่'}</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="material-form">
          {/* Basic Information */}
          <div className="form-section">
            <h3>ข้อมูลพื้นฐาน</h3>
            <div className="form-row">
              <div className="form-group">
                <label>วันที่รับเข้า *</label>
                <input
                  type="date"
                  value={formData.receivedDate}
                  onChange={(e) => handleInputChange('receivedDate', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Lot Number *</label>
                <input
                  type="text"
                  value={formData.lotNumber}
                  onChange={(e) => handleInputChange('lotNumber', e.target.value)}
                  placeholder="กรอก Lot Number"
                  required
                />
              </div>
              <div className="form-group">
                <label>Heat Number *</label>
                <input
                  type="text"
                  value={formData.heatNumber}
                  onChange={(e) => handleInputChange('heatNumber', e.target.value)}
                  placeholder="กรอก Heat Number"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>ผู้จำหน่าย *</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => handleInputChange('supplier', e.target.value)}
                  placeholder="ชื่อผู้จำหน่าย"
                  required
                />
              </div>
              <div className="form-group">
                <label>ประเภทวัตถุดิบ *</label>
                <select
                  value={formData.materialType}
                  onChange={(e) => handleInputChange('materialType', e.target.value)}
                  required
                >
                  <option value="steel_pipe">เหล็กท่อน</option>
                  <option value="steel_bar">เหล็กเส้น</option>
                  <option value="hardened_work">งานชุบแข็ง</option>
                </select>
              </div>
              <div className="form-group">
                <label>เกรด</label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => handleInputChange('grade', e.target.value)}
                  placeholder="เกรดของวัตถุดิบ"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Certification Number</label>
                <input
                  type="text"
                  value={formData.certificationNumber}
                  onChange={(e) => handleInputChange('certificationNumber', e.target.value)}
                  placeholder="หมายเลขใบรับรอง"
                />
              </div>
            </div>
          </div>

          {/* Steel Pipe Specific Information */}
          {formData.materialType === 'steel_pipe' && (
            <div className="form-section">
              <h3>ข้อมูลเฉพาะเหล็กท่อน</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>OD (มม.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.outerDiameter}
                    onChange={(e) => handleInputChange('outerDiameter', e.target.value)}
                    placeholder="ขนาด Outer Diameter"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>ความยาว (มม.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.length}
                    onChange={(e) => handleInputChange('length', e.target.value)}
                    placeholder="ความยาวของท่อน"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>จำนวน (เส้น) *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                    placeholder="จำนวนท่อนทั้งหมด"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>จำนวนที่ตรวจ (เส้นต่อมัด)</label>
                  <input
                    type="number"
                    value={formData.samplesInspected}
                    onChange={(e) => handleInputChange('samplesInspected', e.target.value)}
                    min="1"
                    max="10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Measurement Tools */}
          <div className="form-section">
            <h3>เครื่องมือการวัด</h3>
            <div className="form-row">
              <div className="form-group">
                <label>เครื่องมือหลัก *</label>
                <select
                  value={formData.measurementTool}
                  onChange={(e) => handleInputChange('measurementTool', e.target.value)}
                  required
                >
                  <option value="vernier">เวอร์เนียร์</option>
                  <option value="micrometer">ไมโครมิเตอร์</option>
                  <option value="gauge">เกจวัด</option>
                </select>
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.measuringTape}
                    onChange={(e) => handleInputChange('measuringTape', e.target.checked)}
                  />
                  ใช้ตลับเมตรร่วมด้วย
                </label>
              </div>
            </div>
          </div>

          {/* Dimensional Check */}
          <div className="form-section">
            <h3>การตรวจสอบขนาด</h3>
            <div className="measurement-grid">
              <div className="measurement-group">
                <h4>การวัด OD (มม.)</h4>
                {formData.dimensionalCheck.odMeasurements.map((measurement, index) => (
                  <div key={index} className="form-group">
                    <label>ตัวอย่างที่ {index + 1}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={measurement}
                      onChange={(e) => handleArrayChange('dimensionalCheck', 'odMeasurements', index, e.target.value)}
                      placeholder="ค่าการวัด OD"
                    />
                  </div>
                ))}
              </div>

              <div className="measurement-group">
                <h4>การวัดความยาว (มม.)</h4>
                {formData.dimensionalCheck.lengthMeasurements.map((measurement, index) => (
                  <div key={index} className="form-group">
                    <label>ตัวอย่างที่ {index + 1}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={measurement}
                      onChange={(e) => handleArrayChange('dimensionalCheck', 'lengthMeasurements', index, e.target.value)}
                      placeholder="ค่าการวัดความยาว"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>ผลการตรวจสอบขนาด</label>
              <select
                value={formData.dimensionalCheck.results}
                onChange={(e) => handleNestedChange('dimensionalCheck', 'results', e.target.value)}
              >
                <option value="pending">รอการประเมิน</option>
                <option value="pass">ผ่าน</option>
                <option value="fail">ไม่ผ่าน</option>
              </select>
            </div>
          </div>

          {/* Visual Inspection */}
          <div className="form-section">
            <h3>การตรวจสอบรูปร่างลักษณะ</h3>
            <div className="form-row">
              <div className="form-group">
                <label>รูปร่างลักษณะทั่วไป</label>
                <select
                  value={formData.visualInspection.generalAppearance}
                  onChange={(e) => handleNestedChange('visualInspection', 'generalAppearance', e.target.value)}
                >
                  <option value="good">ดี</option>
                  <option value="acceptable">ยอมรับได้</option>
                  <option value="poor">ไม่ดี</option>
                </select>
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.visualInspection.noCracks}
                    onChange={(e) => handleNestedChange('visualInspection', 'noCracks', e.target.checked)}
                  />
                  ไม่มีรอยแตก
                </label>
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.visualInspection.noFissures}
                    onChange={(e) => handleNestedChange('visualInspection', 'noFissures', e.target.checked)}
                  />
                  ไม่มีรอยร้าว
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>การบรรจุ</label>
                <select
                  value={formData.visualInspection.packaging}
                  onChange={(e) => handleNestedChange('visualInspection', 'packaging', e.target.value)}
                >
                  <option value="good">ดี</option>
                  <option value="acceptable">ยอมรับได้</option>
                  <option value="damaged">เสียหาย</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>หมายเหตุ</label>
              <textarea
                value={formData.visualInspection.notes}
                onChange={(e) => handleNestedChange('visualInspection', 'notes', e.target.value)}
                placeholder="บันทึกข้อสังเกตเพิ่มเติม"
                rows="3"
              />
            </div>
          </div>

          {/* Approval Section */}
          <div className="form-section">
            <h3>การอนุมัติ</h3>
            <div className="form-row">
              <div className="form-group">
                <label>ผู้ตรวจสอบ</label>
                <input
                  type="text"
                  value={formData.inspectedBy}
                  readOnly
                  className="readonly-input"
                />
              </div>
              <div className="form-group">
                <label>สถานะ</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  disabled={!user.permissions?.canApprove}
                >
                  <option value="pending">รอการอนุมัติ</option>
                  <option value="approved">อนุมัติแล้ว</option>
                  <option value="rejected">ไม่อนุมัติ</option>
                </select>
              </div>
            </div>

            {formData.status === 'approved' && (
              <div className="form-row">
                <div className="form-group">
                  <label>ผู้อนุมัติ</label>
                  <input
                    type="text"
                    value={formData.approvedBy}
                    readOnly
                    className="readonly-input"
                  />
                </div>
                <div className="form-group">
                  <label>วันที่อนุมัติ</label>
                  <input
                    type="date"
                    value={formData.approvalDate}
                    readOnly
                    className="readonly-input"
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>ข้อสังเกต/หมายเหตุ</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                placeholder="ข้อสังเกตเพิ่มเติมจากผู้อนุมัติ"
                rows="3"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              ยกเลิก
            </button>
            
            {user.permissions?.canApprove && formData.status === 'pending' && (
              <button type="button" onClick={handleApprove} className="btn btn-success">
                อนุมัติ
              </button>
            )}
            
            {formData.status === 'approved' && (
              <button type="button" onClick={handleExportPDF} className="btn btn-info">
                Export PDF
              </button>
            )}
            
            <button type="submit" className="btn btn-primary">
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialModal;