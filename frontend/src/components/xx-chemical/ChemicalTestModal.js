// components/chemical/ChemicalTestModal.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { JIS_STANDARDS } from '../../utils/mockData';
import { generateQRCode, exportToPDF } from '../../utils/calculations';

const ChemicalTestModal = ({ test, onSave, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    // Basic Information
    testDate: new Date().toISOString().split('T')[0],
    testId: '',
    lotNumber: '',
    heatNumber: '',
    grade: '',
    jisStandard: 'G4051',
    outerDiameter: '',
    sampleCount: 1,
    certificationNumber: '',
    supplier: '',
    
    // Chemical Composition (%)
    chemicalComposition: {
      carbon: '', // C
      silicon: '', // Si
      manganese: '', // Mn
      phosphorus: '', // P
      sulfur: '', // S
      chromium: '', // Cr
      nickel: '', // Ni
      molybdenum: '', // Mo
      copper: '', // Cu
      aluminum: '', // Al
      nitrogen: '', // N
      vanadium: '', // V
      titanium: '', // Ti
      boron: '', // B
      tin: '', // Sn
      arsenic: '', // As
      lead: '', // Pb
      antimony: '' // Sb
    },
    
    // Test Results Verification
    testResults: {
      conformsToStandard: null,
      deviations: [],
      notes: ''
    },
    
    // Approval
    status: 'pending',
    testedBy: user?.name || '',
    verifiedBy: '',
    approvedBy: '',
    approvalDate: '',
    remarks: ''
  });

  useEffect(() => {
    if (test) {
      setFormData(test);
    } else {
      // Generate new test ID
      const newTestId = `CHM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      setFormData(prev => ({ ...prev, testId: newTestId }));
    }
  }, [test]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleChemicalChange = (element, value) => {
    // Validate percentage input (0-100)
    if (value !== '' && (isNaN(value) || parseFloat(value) < 0 || parseFloat(value) > 100)) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      chemicalComposition: {
        ...prev.chemicalComposition,
        [element]: value
      }
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

  const verifyResults = () => {
    const selectedStandard = JIS_STANDARDS[formData.jisStandard];
    if (!selectedStandard) return;

    const deviations = [];
    const composition = formData.chemicalComposition;

    // Check each element against standards
    Object.keys(selectedStandard.chemicalLimits).forEach(element => {
      const limit = selectedStandard.chemicalLimits[element];
      const actualValue = parseFloat(composition[element]);
      
      if (isNaN(actualValue)) return;

      let isWithinLimit = true;
      let deviation = '';

      if (limit.max !== undefined && actualValue > limit.max) {
        isWithinLimit = false;
        deviation = `${element.toUpperCase()}: ${actualValue}% เกินค่าสูงสุด ${limit.max}%`;
      }
      
      if (limit.min !== undefined && actualValue < limit.min) {
        isWithinLimit = false;
        deviation = `${element.toUpperCase()}: ${actualValue}% ต่ำกว่าค่าต่ำสุด ${limit.min}%`;
      }

      if (!isWithinLimit) {
        deviations.push(deviation);
      }
    });

    const conformsToStandard = deviations.length === 0;
    
    setFormData(prev => ({
      ...prev,
      testResults: {
        ...prev.testResults,
        conformsToStandard,
        deviations
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Generate QR Code data
    const qrData = {
      testId: formData.testId,
      lotNumber: formData.lotNumber,
      heatNumber: formData.heatNumber,
      testDate: formData.testDate,
      jisStandard: formData.jisStandard
    };
    
    const dataToSave = {
      ...formData,
      qrCode: generateQRCode(qrData),
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

  const selectedStandard = JIS_STANDARDS[formData.jisStandard];

  return (
    <div className="modal-overlay">
      <div className="modal-content extra-large">
        <div className="modal-header">
          <h2>{test ? 'แก้ไขการทดสอบทางเคมี' : 'สร้างการทดสอบทางเคมีใหม่'}</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="chemical-form">
          {/* Basic Information */}
          <div className="form-section">
            <h3>ข้อมูลพื้นฐาน</h3>
            <div className="form-row">
              <div className="form-group">
                <label>รหัสการทดสอบ *</label>
                <input
                  type="text"
                  value={formData.testId}
                  onChange={(e) => handleInputChange('testId', e.target.value)}
                  placeholder="รหัสการทดสอบ"
                  required
                />
              </div>
              <div className="form-group">
                <label>วันที่ทดสอบ *</label>
                <input
                  type="date"
                  value={formData.testDate}
                  onChange={(e) => handleInputChange('testDate', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>ผู้ทดสอบ *</label>
                <input
                  type="text"
                  value={formData.testedBy}
                  onChange={(e) => handleInputChange('testedBy', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
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
              <div className="form-group">
                <label>เกรดเหล็ก *</label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => handleInputChange('grade', e.target.value)}
                  placeholder="เกรดเหล็ก"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>มาตรฐาน JIS *</label>
                <select
                  value={formData.jisStandard}
                  onChange={(e) => handleInputChange('jisStandard', e.target.value)}
                  required
                >
                  <option value="G4051">JIS G4051</option>
                  <option value="G4052">JIS G4052</option>
                  <option value="G4053">JIS G4053</option>
                </select>
              </div>
              <div className="form-group">
                <label>OD (มม.) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.outerDiameter}
                  onChange={(e) => handleInputChange('outerDiameter', e.target.value)}
                  placeholder="ขนาด OD"
                  required
                />
              </div>
              <div className="form-group">
                <label>จำนวนตัวอย่าง *</label>
                <input
                  type="number"
                  value={formData.sampleCount}
                  onChange={(e) => handleInputChange('sampleCount', e.target.value)}
                  min="1"
                  required
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
            </div>
          </div>

          {/* Chemical Composition */}
          <div className="form-section">
            <div className="section-header">
              <h3>Chemical Composition (%)</h3>
              <div className="standard-info">
                <strong>มาตรฐาน JIS {formData.jisStandard}</strong>
                {selectedStandard && (
                  <p>{selectedStandard.description}</p>
                )}
              </div>
            </div>

            <div className="chemical-grid">
              {Object.keys(formData.chemicalComposition).map(element => {
                const limit = selectedStandard?.chemicalLimits[element];
                return (
                  <div key={element} className="chemical-input-group">
                    <label>
                      {element.toUpperCase()}
                      {limit && (
                        <span className="limit-info">
                          ({limit.min !== undefined ? `${limit.min}-` : '≤'}{limit.max}%)
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.chemicalComposition[element]}
                      onChange={(e) => handleChemicalChange(element, e.target.value)}
                      placeholder="0.000"
                      className={
                        limit && formData.chemicalComposition[element] ? 
                        (checkElementLimit(formData.chemicalComposition[element], limit) ? 
                         'valid' : 'invalid') : ''
                      }
                    />
                  </div>
                );
              })}
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                onClick={verifyResults}
                className="btn btn-info"
              >
                ตรวจสอบผลลัพธ์
              </button>
            </div>
          </div>

          {/* Test Results */}
          <div className="form-section">
            <h3>ผลการทดสอบ</h3>
            
            {formData.testResults.conformsToStandard !== null && (
              <div className={`result-summary ${formData.testResults.conformsToStandard ? 'pass' : 'fail'}`}>
                <h4>
                  {formData.testResults.conformsToStandard ? 
                    '✓ ผ่านมาตรฐาน JIS ' + formData.jisStandard : 
                    '✗ ไม่ผ่านมาตรฐาน JIS ' + formData.jisStandard
                  }
                </h4>
              </div>
            )}

            {formData.testResults.deviations.length > 0 && (
              <div className="deviations-list">
                <h4>รายการที่ไม่เป็นไปตามมาตรฐาน:</h4>
                <ul>
                  {formData.testResults.deviations.map((deviation, index) => (
                    <li key={index} className="deviation-item">{deviation}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="form-group">
              <label>หมายเหตุผลการทดสอบ</label>
              <textarea
                value={formData.testResults.notes}
                onChange={(e) => handleNestedChange('testResults', 'notes', e.target.value)}
                placeholder="บันทึกข้อสังเกตเพิ่มเติม"
                rows="3"
              />
            </div>
          </div>

          {/* Verification & Approval */}
          <div className="form-section">
            <h3>การยืนยันและอนุมัติ</h3>
            <div className="form-row">
              <div className="form-group">
                <label>ผู้ยืนยันผล</label>
                <input
                  type="text"
                  value={formData.verifiedBy}
                  onChange={(e) => handleInputChange('verifiedBy', e.target.value)}
                  placeholder="ชื่อผู้ยืนยันผลการทดสอบ"
                />
              </div>
              <div className="form-group">
                <label>สถานะ</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  disabled={!user.permissions?.canApprove}
                >
                  <option value="pending">รอผลทดสอบ</option>
                  <option value="completed">เสร็จสิ้น</option>
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
            
            {user.permissions?.canApprove && formData.status === 'completed' && (
              <button type="button" onClick={handleApprove} className="btn btn-success">
                อนุมัติ
              </button>
            )}
            
            {formData.status === 'approved' && (
              <button 
                type="button" 
                onClick={() => exportToPDF(formData, 'chemical-test')} 
                className="btn btn-info"
              >
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

// Helper function to check if element value is within limits
const checkElementLimit = (value, limit) => {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return true;
  
  if (limit.max !== undefined && numValue > limit.max) return false;
  if (limit.min !== undefined && numValue < limit.min) return false;
  return true;
};

export default ChemicalTestModal;