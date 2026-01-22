// components/inspections/InspectionModal.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { generateQRCode, exportToPDF } from '../../utils/calculations';

const InspectionModal = ({ inspection, onSave, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    // Basic Information
    testId: '',
    testDate: new Date().toISOString().split('T')[0],
    testType: 'dimensional',
    priority: 'normal',
    
    // Material Information
    materialName: '',
    materialType: 'steel_pipe',
    specifications: '',
    lotNumber: '',
    heatNumber: '',
    quantity: '',
    supplier: '',
    
    // Test Plan
    testPlan: {
      odCheck: false,
      lengthCheck: false,
      visualInspection: false,
      chemicalTest: false,
      mechanicalTest: false,
      customTests: []
    },
    
    // Requirements
    requirements: {
      standard: '',
      tolerance: '',
      acceptanceCriteria: '',
      samplingPlan: '4_per_bundle',
      notes: ''
    },
    
    // Assignment
    assignment: {
      assignedTo: '',
      estimatedDuration: '4',
      dueDate: '',
      specialInstructions: ''
    },
    
    // Status and Progress
    status: 'pending',
    progress: 0,
    testResults: {},
    
    // Audit Information
    createdBy: user?.name || '',
    testerName: '',
    supervisorName: '',
    notes: ''
  });

  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    if (inspection) {
      setFormData(inspection);
    } else {
      // Generate new test ID
      const timestamp = Date.now().toString().slice(-6);
      setFormData(prev => ({
        ...prev,
        testId: `INS-${new Date().getFullYear()}-${timestamp}`
      }));
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

  const handleTestPlanChange = (test, checked) => {
    setFormData(prev => ({
      ...prev,
      testPlan: {
        ...prev.testPlan,
        [test]: checked
      }
    }));
  };

  const calculateEstimatedDuration = () => {
    const testPlan = formData.testPlan;
    let duration = 0;
    
    if (testPlan.odCheck) duration += 1;
    if (testPlan.lengthCheck) duration += 1;
    if (testPlan.visualInspection) duration += 2;
    if (testPlan.chemicalTest) duration += 4;
    if (testPlan.mechanicalTest) duration += 6;
    
    // Add time for custom tests
    duration += testPlan.customTests.length * 2;
    
    setFormData(prev => ({
      ...prev,
      assignment: {
        ...prev.assignment,
        estimatedDuration: duration.toString()
      }
    }));
  };

  useEffect(() => {
    calculateEstimatedDuration();
  }, [formData.testPlan]);

  const addCustomTest = () => {
    const testName = prompt('ระบุชื่อการทดสอบพิเศษ:');
    if (testName && testName.trim()) {
      setFormData(prev => ({
        ...prev,
        testPlan: {
          ...prev.testPlan,
          customTests: [...prev.testPlan.customTests, {
            id: Date.now(),
            name: testName.trim(),
            description: '',
            estimatedTime: 2
          }]
        }
      }));
    }
  };

  const removeCustomTest = (testId) => {
    setFormData(prev => ({
      ...prev,
      testPlan: {
        ...prev.testPlan,
        customTests: prev.testPlan.customTests.filter(test => test.id !== testId)
      }
    }));
  };

  const validateForm = () => {
    const errors = [];

    // Check required fields
    if (!formData.testId) errors.push('กรุณาระบุรหัสการทดสอบ');
    if (!formData.materialName) errors.push('กรุณาระบุชื่อวัตถุดิบ');
    if (!formData.lotNumber) errors.push('กรุณาระบุ Lot Number');
    if (!formData.quantity) errors.push('กรุณาระบุจำนวน');

    // Check test plan
    const hasTests = Object.values(formData.testPlan).some(value => 
      Array.isArray(value) ? value.length > 0 : value === true
    );
    if (!hasTests) {
      errors.push('กรุณาเลือกการทดสอบอย่างน้อย 1 รายการ');
    }

    // Check assignment
    if (!formData.assignment.assignedTo) {
      errors.push('กรุณาระบุผู้รับผิดชอบการทดสอบ');
    }

    // Check due date
    if (formData.assignment.dueDate && new Date(formData.assignment.dueDate) < new Date()) {
      errors.push('วันที่กำหนดเสร็จต้องเป็นวันในอนาคต');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Generate QR Code data
    const qrData = {
      testId: formData.testId,
      materialName: formData.materialName,
      lotNumber: formData.lotNumber,
      testDate: formData.testDate,
      testType: formData.testType
    };
    
    const dataToSave = {
      ...formData,
      qrCode: generateQRCode(qrData),
      lastModified: new Date().toISOString()
    };

    onSave(dataToSave);
  };

  const getTestTypeLabel = (type) => {
    const types = {
      dimensional: 'การตรวจสอบขนาด',
      visual: 'การตรวจสอบภายนอก',
      chemical: 'การทดสอบทางเคมี',
      mechanical: 'การทดสอบเชิงกล',
      comprehensive: 'การทดสอบครอบคลุม'
    };
    return types[type] || type;
  };

  const getMaterialTypeLabel = (type) => {
    const types = {
      steel_pipe: 'เหล็กท่อน',
      steel_bar: 'เหล็กเส้น',
      steel_plate: 'เหล็กแผ่น',
      hardened_work: 'งานชุบแข็ง',
      casting: 'งานหล่อ',
      forging: 'งานตีขึ้นรูป'
    };
    return types[type] || type;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h2>{inspection ? 'แก้ไขการทดสอบ' : 'สร้างการทดสอบใหม่'}</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="inspection-form">
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
                  placeholder="INS-YYYY-XXXXXX"
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
                <label>ประเภทการทดสอบ *</label>
                <select
                  value={formData.testType}
                  onChange={(e) => handleInputChange('testType', e.target.value)}
                  required
                >
                  <option value="dimensional">การตรวจสอบขนาด</option>
                  <option value="visual">การตรวจสอบภายนอก</option>
                  <option value="chemical">การทดสอบทางเคมี</option>
                  <option value="mechanical">การทดสอบเชิงกล</option>
                  <option value="comprehensive">การทดสอบครอบคลุม</option>
                </select>
              </div>
              <div className="form-group">
                <label>ความสำคัญ</label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                >
                  <option value="low">ต่ำ</option>
                  <option value="normal">ปกติ</option>
                  <option value="high">สูง</option>
                  <option value="urgent">เร่งด่วน</option>
                </select>
              </div>
            </div>
          </div>

          {/* Material Information */}
          <div className="form-section">
            <h3>ข้อมูลวัตถุดิบ</h3>
            <div className="form-row">
              <div className="form-group">
                <label>ชื่อวัตถุดิบ *</label>
                <input
                  type="text"
                  value={formData.materialName}
                  onChange={(e) => handleInputChange('materialName', e.target.value)}
                  placeholder="เช่น เหล็กท่อน SCM440"
                  required
                />
              </div>
              <div className="form-group">
                <label>ประเภทวัตถุดิบ</label>
                <select
                  value={formData.materialType}
                  onChange={(e) => handleInputChange('materialType', e.target.value)}
                >
                  <option value="steel_pipe">เหล็กท่อน</option>
                  <option value="steel_bar">เหล็กเส้น</option>
                  <option value="steel_plate">เหล็กแผ่น</option>
                  <option value="hardened_work">งานชุบแข็ง</option>
                  <option value="casting">งานหล่อ</option>
                  <option value="forging">งานตีขึ้นรูป</option>
                </select>
              </div>
              <div className="form-group">
                <label>ข้อกำหนด/มาตรฐาน</label>
                <input
                  type="text"
                  value={formData.specifications}
                  onChange={(e) => handleInputChange('specifications', e.target.value)}
                  placeholder="เช่น OD 25.4±0.1mm, L=6000±5mm"
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
                  placeholder="LOT2501001"
                  required
                />
              </div>
              <div className="form-group">
                <label>Heat Number</label>
                <input
                  type="text"
                  value={formData.heatNumber}
                  onChange={(e) => handleInputChange('heatNumber', e.target.value)}
                  placeholder="HT250115A"
                />
              </div>
              <div className="form-group">
                <label>จำนวน *</label>
                <input
                  type="text"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  placeholder="100 เส้น"
                  required
                />
              </div>
              <div className="form-group">
                <label>ผู้จำหน่าย</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => handleInputChange('supplier', e.target.value)}
                  placeholder="บริษัท ABC จำกัด"
                />
              </div>
            </div>
          </div>

          {/* Test Plan */}
          <div className="form-section">
            <h3>แผนการทดสอบ</h3>
            <div className="test-plan-grid">
              <div className="test-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.testPlan.odCheck}
                    onChange={(e) => handleTestPlanChange('odCheck', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  การตรวจสอบ OD
                  <small>ตรวจสอบขนาดเส้นผ่านศูนย์กลางภายนอก</small>
                </label>
              </div>

              <div className="test-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.testPlan.lengthCheck}
                    onChange={(e) => handleTestPlanChange('lengthCheck', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  การตรวจสอบความยาว
                  <small>ตรวจสอบความยาวโดยรวม</small>
                </label>
              </div>

              <div className="test-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.testPlan.visualInspection}
                    onChange={(e) => handleTestPlanChange('visualInspection', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  การตรวจสอบภายนอก
                  <small>ตรวจสอบรูปร่างลักษณะและข้อบกพร่อง</small>
                </label>
              </div>

              <div className="test-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.testPlan.chemicalTest}
                    onChange={(e) => handleTestPlanChange('chemicalTest', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  การทดสอบทางเคมี
                  <small>วิเคราะห์องค์ประกอบทางเคมี</small>
                </label>
              </div>

              <div className="test-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.testPlan.mechanicalTest}
                    onChange={(e) => handleTestPlanChange('mechanicalTest', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  การทดสอบเชิงกล
                  <small>ทดสอบสมบัติเชิงกล</small>
                </label>
              </div>
            </div>

            {/* Custom Tests */}
            <div className="custom-tests-section">
              <h4>การทดสอบพิเศษ</h4>
              {formData.testPlan.customTests.map((test, index) => (
                <div key={test.id} className="custom-test-item">
                  <span className="test-name">{test.name}</span>
                  <button
                    type="button"
                    onClick={() => removeCustomTest(test.id)}
                    className="btn btn-sm btn-danger"
                  >
                    ลบ
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addCustomTest}
                className="btn btn-secondary"
              >
                + เพิ่มการทดสอบพิเศษ
              </button>
            </div>
          </div>

          {/* Requirements */}
          <div className="form-section">
            <h3>ข้อกำหนดการทดสอบ</h3>
            <div className="form-row">
              <div className="form-group">
                <label>มาตรฐานอ้างอิง</label>
                <input
                  type="text"
                  value={formData.requirements.standard}
                  onChange={(e) => handleNestedChange('requirements', 'standard', e.target.value)}
                  placeholder="เช่น JIS G4051, ASTM A36"
                />
              </div>
              <div className="form-group">
                <label>ความคลาดเคลื่อนที่ยอมรับ</label>
                <input
                  type="text"
                  value={formData.requirements.tolerance}
                  onChange={(e) => handleNestedChange('requirements', 'tolerance', e.target.value)}
                  placeholder="เช่น ±0.1mm, ±5mm"
                />
              </div>
              <div className="form-group">
                <label>แผนการสุ่มตัวอย่าง</label>
                <select
                  value={formData.requirements.samplingPlan}
                  onChange={(e) => handleNestedChange('requirements', 'samplingPlan', e.target.value)}
                >
                  <option value="4_per_bundle">4 เส้นต่อมัด</option>
                  <option value="10_percent">10% ของจำนวนทั้งหมด</option>
                  <option value="5_percent">5% ของจำนวนทั้งหมด</option>
                  <option value="random_10">สุ่ม 10 เส้น</option>
                  <option value="random_20">สุ่ม 20 เส้น</option>
                  <option value="custom">กำหนดเอง</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>เกณฑ์การยอมรับ</label>
              <textarea
                value={formData.requirements.acceptanceCriteria}
                onChange={(e) => handleNestedChange('requirements', 'acceptanceCriteria', e.target.value)}
                placeholder="ระบุเกณฑ์การยอมรับผลการทดสอบ เช่น ผ่าน 95% ของตัวอย่าง, ไม่มีข้อบกพร่องร้ายแรง"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>หมายเหตุเพิ่มเติม</label>
              <textarea
                value={formData.requirements.notes}
                onChange={(e) => handleNestedChange('requirements', 'notes', e.target.value)}
                placeholder="ข้อกำหนดพิเศษหรือข้อสังเกตเพิ่มเติม"
                rows="2"
              />
            </div>
          </div>

          {/* Assignment */}
          <div className="form-section">
            <h3>การมอบหมายงาน</h3>
            <div className="form-row">
              <div className="form-group">
                <label>ผู้รับผิดชอบ *</label>
                <input
                  type="text"
                  value={formData.assignment.assignedTo}
                  onChange={(e) => handleNestedChange('assignment', 'assignedTo', e.target.value)}
                  placeholder="ชื่อผู้ทดสอบ"
                  required
                />
              </div>
              <div className="form-group">
                <label>ระยะเวลาโดยประมาณ (ชั่วโมง)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.assignment.estimatedDuration}
                  onChange={(e) => handleNestedChange('assignment', 'estimatedDuration', e.target.value)}
                  readOnly
                  className="readonly-input"
                />
              </div>
              <div className="form-group">
                <label>กำหนดเสร็จ</label>
                <input
                  type="date"
                  value={formData.assignment.dueDate}
                  onChange={(e) => handleNestedChange('assignment', 'dueDate', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>คำแนะนำพิเศษ</label>
              <textarea
                value={formData.assignment.specialInstructions}
                onChange={(e) => handleNestedChange('assignment', 'specialInstructions', e.target.value)}
                placeholder="คำแนะนำพิเศษสำหรับผู้ทดสอบ เช่น ข้อควรระวัง, เครื่องมือพิเศษที่ต้องใช้"
                rows="3"
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="form-section">
            <h3>ข้อมูลเพิ่มเติม</h3>
            <div className="form-row">
              <div className="form-group">
                <label>ผู้สร้างรายการ</label>
                <input
                  type="text"
                  value={formData.createdBy}
                  readOnly
                  className="readonly-input"
                />
              </div>
              <div className="form-group">
                <label>ผู้ทดสอบ</label>
                <input
                  type="text"
                  value={formData.testerName}
                  onChange={(e) => handleInputChange('testerName', e.target.value)}
                  placeholder="จะถูกกำหนดอัตโนมัติเมื่อเริ่มทดสอบ"
                />
              </div>
              <div className="form-group">
                <label>ผู้ดูแล/ผู้อนุมัติ</label>
                <input
                  type="text"
                  value={formData.supervisorName}
                  onChange={(e) => handleInputChange('supervisorName', e.target.value)}
                  placeholder="ชื่อผู้ดูแลหรือผู้อนุมัติ"
                />
              </div>
            </div>

            <div className="form-group">
              <label>หมายเหตุทั่วไป</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="หมายเหตุเพิ่มเติมเกี่ยวกับการทดสอบนี้"
                rows="3"
              />
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="error-section">
              <h4>กรุณาแก้ไขข้อผิดพลาดต่อไปนี้:</h4>
              <ul className="error-list">
                {validationErrors.map((error, index) => (
                  <li key={index} className="error-item">{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              ยกเลิก
            </button>
            <button type="submit" className="btn btn-primary">
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InspectionModal;