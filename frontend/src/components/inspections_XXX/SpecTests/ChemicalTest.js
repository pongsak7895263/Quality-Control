// components/inspections/SpecTests/ChemicalTest.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { JIS_STANDARDS } from '../../../utils/mockData';

const ChemicalTest = ({ inspection, onComplete, onCancel }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    // Test Information
    testId: '',
    tester: user?.name || '',
    testDate: new Date().toISOString().split('T')[0],
    testTime: new Date().toTimeString().slice(0, 5),
    
    // Sample Information
    sampleId: '',
    sampleLocation: 'end',
    sampleSize: '10x10x10',
    samplePreparation: 'grinding',
    
    // Standard and Grade
    jisStandard: 'G4051',
    materialGrade: '',
    
    // Test Equipment
    equipment: {
      spectrometer: 'OES',
      model: '',
      calibrationDate: '',
      operator: user?.name || ''
    },
    
    // Chemical Composition Results (%)
    chemicalComposition: {
      carbon: '',      // C
      silicon: '',     // Si
      manganese: '',   // Mn
      phosphorus: '',  // P
      sulfur: '',      // S
      chromium: '',    // Cr
      nickel: '',      // Ni
      molybdenum: '',  // Mo
      copper: '',      // Cu
      aluminum: '',    // Al
      vanadium: '',    // V
      titanium: '',    // Ti
      boron: '',       // B
      nitrogen: '',    // N
      niobium: '',     // Nb
      tin: '',         // Sn
      arsenic: '',     // As
      lead: '',        // Pb
      antimony: ''     // Sb
    },
    
    // Test Conditions
    testConditions: {
      temperature: '23',
      humidity: '50',
      atmosphere: 'air',
      duration: '30'
    },
    
    // Analysis Results
    results: {
      conformsToStandard: null,
      deviations: [],
      confidence: '95',
      repeatability: 'good',
      notes: ''
    },
    
    // Quality Control
    qualityControl: {
      referenceStandard: '',
      blankTest: false,
      duplicateTest: false,
      spikeRecovery: '',
      notes: ''
    },
    
    completedAt: '',
    status: 'in_progress'
  });

  const [validationErrors, setValidationErrors] = useState([]);
  const [selectedStandard, setSelectedStandard] = useState(null);

  useEffect(() => {
    // Load existing data if available
    if (inspection?.testResults?.chemical_test) {
      setFormData(prev => ({
        ...prev,
        ...inspection.testResults.chemical_test
      }));
    }

    // Generate test ID if not present
    if (!formData.testId) {
      const timestamp = Date.now().toString().slice(-6);
      setFormData(prev => ({
        ...prev,
        testId: `CHM-${new Date().getFullYear()}-${timestamp}`
      }));
    }
  }, [inspection]);

  useEffect(() => {
    // Update selected standard when JIS standard changes
    setSelectedStandard(JIS_STANDARDS[formData.jisStandard]);
  }, [formData.jisStandard]);

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

    // Auto-validate against standards
    if (value !== '' && selectedStandard) {
      validateElement(element, parseFloat(value));
    }
  };

  const handleEquipmentChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      equipment: {
        ...prev.equipment,
        [field]: value
      }
    }));
  };

  const handleTestConditionsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      testConditions: {
        ...prev.testConditions,
        [field]: value
      }
    }));
  };

  const handleResultsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      results: {
        ...prev.results,
        [field]: value
      }
    }));
  };

  const handleQualityControlChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      qualityControl: {
        ...prev.qualityControl,
        [field]: value
      }
    }));
  };

  const validateElement = (element, value) => {
    if (!selectedStandard || !selectedStandard.chemicalLimits[element]) {
      return true;
    }

    const limit = selectedStandard.chemicalLimits[element];
    
    if (limit.max !== undefined && value > limit.max) {
      return false;
    }
    
    if (limit.min !== undefined && value < limit.min) {
      return false;
    }
    
    return true;
  };

  const validateAllElements = () => {
    if (!selectedStandard) return { conformsToStandard: null, deviations: [] };

    const deviations = [];
    let hasValues = false;

    Object.entries(formData.chemicalComposition).forEach(([element, value]) => {
      if (value === '' || value === null) return;
      
      hasValues = true;
      const numValue = parseFloat(value);
      const limit = selectedStandard.chemicalLimits[element];
      
      if (!limit) return;

      if (limit.max !== undefined && numValue > limit.max) {
        deviations.push(`${element.toUpperCase()}: ${numValue}% เกินค่าสูงสุด ${limit.max}%`);
      }
      
      if (limit.min !== undefined && numValue < limit.min) {
        deviations.push(`${element.toUpperCase()}: ${numValue}% ต่ำกว่าค่าต่ำสุด ${limit.min}%`);
      }
    });

    const conformsToStandard = hasValues ? deviations.length === 0 : null;

    setFormData(prev => ({
      ...prev,
      results: {
        ...prev.results,
        conformsToStandard,
        deviations
      }
    }));

    return { conformsToStandard, deviations };
  };

  const validateForm = () => {
    const errors = [];

    // Check required fields
    if (!formData.testId) errors.push('กรุณาระบุรหัสการทดสอบ');
    if (!formData.sampleId) errors.push('กรุณาระบุรหัสตัวอย่าง');
    if (!formData.materialGrade) errors.push('กรุณาระบุเกรดวัสดุ');

    // Check equipment information
    if (!formData.equipment.model) errors.push('กรุณาระบุรุ่นเครื่องมือ');
    if (!formData.equipment.calibrationDate) errors.push('กรุณาระบุวันที่สอบเทียบเครื่องมือ');

    // Check if at least some chemical composition data is provided
    const hasChemicalData = Object.values(formData.chemicalComposition).some(value => value !== '');
    if (!hasChemicalData) {
      errors.push('กรุณากรอกข้อมูลองค์ประกอบทางเคมีอย่างน้อย 1 ธาตุ');
    }

    // Check test conditions
    if (!formData.testConditions.temperature) errors.push('กรุณาระบุอุณหภูมิการทดสอบ');

    // Check quality control
    if (formData.qualityControl.duplicateTest && !formData.qualityControl.referenceStandard) {
      errors.push('กรุณาระบุมาตรฐานอ้างอิงเมื่อทำการทดสอบซ้ำ');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Validate chemical composition against standards
    const validationResult = validateAllElements();

    // Prepare final results
    const finalResults = {
      ...formData,
      results: {
        ...formData.results,
        ...validationResult
      },
      completedAt: new Date().toISOString(),
      status: 'completed'
    };

    onComplete(finalResults);
  };

  const getElementLimit = (element) => {
    if (!selectedStandard || !selectedStandard.chemicalLimits[element]) {
      return null;
    }
    
    const limit = selectedStandard.chemicalLimits[element];
    if (limit.min !== undefined && limit.max !== undefined) {
      return `${limit.min} - ${limit.max}`;
    } else if (limit.max !== undefined) {
      return `≤ ${limit.max}`;
    } else if (limit.min !== undefined) {
      return `≥ ${limit.min}`;
    }
    return null;
  };

  const getElementStatus = (element, value) => {
    if (!value || value === '') return 'not-tested';
    if (!selectedStandard || !selectedStandard.chemicalLimits[element]) return 'no-limit';
    
    const isValid = validateElement(element, parseFloat(value));
    return isValid ? 'pass' : 'fail';
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content extra-large">
        <div className="modal-header">
          <h2>การทดสอบทางเคมี (Chemical Analysis)</h2>
          <button onClick={onCancel} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="chemical-test-form">
          {/* Test Information */}
          <div className="form-section">
            <h3>ข้อมูลการทดสอบ</h3>
            <div className="form-row">
              <div className="form-group">
                <label>รหัสการทดสอบ *</label>
                <input
                  type="text"
                  value={formData.testId}
                  onChange={(e) => setFormData(prev => ({ ...prev, testId: e.target.value }))}
                  placeholder="CHM-YYYY-XXXXXX"
                  required
                />
              </div>
              <div className="form-group">
                <label>ผู้ทดสอบ</label>
                <input
                  type="text"
                  value={formData.tester}
                  readOnly
                  className="readonly-input"
                />
              </div>
              <div className="form-group">
                <label>วันที่ทดสอบ</label>
                <input
                  type="date"
                  value={formData.testDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, testDate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>เวลาทดสอบ</label>
                <input
                  type="time"
                  value={formData.testTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, testTime: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Sample Information */}
          <div className="form-section">
            <h3>ข้อมูลตัวอย่าง</h3>
            <div className="form-row">
              <div className="form-group">
                <label>รหัสตัวอย่าง *</label>
                <input
                  type="text"
                  value={formData.sampleId}
                  onChange={(e) => setFormData(prev => ({ ...prev, sampleId: e.target.value }))}
                  placeholder="SAMPLE-001"
                  required
                />
              </div>
              <div className="form-group">
                <label>ตำแหน่งการเก็บตัวอย่าง</label>
                <select
                  value={formData.sampleLocation}
                  onChange={(e) => setFormData(prev => ({ ...prev, sampleLocation: e.target.value }))}
                >
                  <option value="end">ปลายท่อน</option>
                  <option value="middle">กลางท่อน</option>
                  <option value="surface">ผิวหน้า</option>
                  <option value="core">แกนกลาง</option>
                </select>
              </div>
              <div className="form-group">
                <label>ขนาดตัวอย่าง (มม.)</label>
                <input
                  type="text"
                  value={formData.sampleSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, sampleSize: e.target.value }))}
                  placeholder="10x10x10"
                />
              </div>
              <div className="form-group">
                <label>การเตรียมตัวอย่าง</label>
                <select
                  value={formData.samplePreparation}
                  onChange={(e) => setFormData(prev => ({ ...prev, samplePreparation: e.target.value }))}
                >
                  <option value="grinding">ขัดผิวหน้า</option>
                  <option value="polishing">ขัดเงา</option>
                  <option value="cutting">ตัด</option>
                  <option value="drilling">เจาะ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Standard and Grade */}
          <div className="form-section">
            <h3>มาตรฐานและเกรด</h3>
            <div className="form-row">
              <div className="form-group">
                <label>มาตรฐาน JIS</label>
                <select
                  value={formData.jisStandard}
                  onChange={(e) => setFormData(prev => ({ ...prev, jisStandard: e.target.value }))}
                >
                  <option value="G4051">JIS G4051 - Carbon Steels</option>
                  <option value="G4052">JIS G4052 - Alloy Steels</option>
                  <option value="G4053">JIS G4053 - Stainless Steels</option>
                </select>
              </div>
              <div className="form-group">
                <label>เกรดวัสดุ *</label>
                <input
                  type="text"
                  value={formData.materialGrade}
                  onChange={(e) => setFormData(prev => ({ ...prev, materialGrade: e.target.value }))}
                  placeholder="เช่น S45C, SCM440, SUS304"
                  required
                />
              </div>
            </div>
            {selectedStandard && (
              <div className="standard-info">
                <p><strong>คำอธิบาย:</strong> {selectedStandard.description}</p>
              </div>
            )}
          </div>

          {/* Test Equipment */}
          <div className="form-section">
            <h3>เครื่องมือทดสอบ</h3>
            <div className="form-row">
              <div className="form-group">
                <label>ประเภทเครื่องมือ</label>
                <select
                  value={formData.equipment.spectrometer}
                  onChange={(e) => handleEquipmentChange('spectrometer', e.target.value)}
                >
                  <option value="OES">Optical Emission Spectrometer (OES)</option>
                  <option value="XRF">X-Ray Fluorescence (XRF)</option>
                  <option value="ICP">Inductively Coupled Plasma (ICP)</option>
                  <option value="AAS">Atomic Absorption Spectroscopy (AAS)</option>
                </select>
              </div>
              <div className="form-group">
                <label>รุ่น/โมเดล *</label>
                <input
                  type="text"
                  value={formData.equipment.model}
                  onChange={(e) => handleEquipmentChange('model', e.target.value)}
                  placeholder="เช่น SPECTRO MAXx"
                  required
                />
              </div>
              <div className="form-group">
                <label>วันที่สอบเทียบล่าสุด *</label>
                <input
                  type="date"
                  value={formData.equipment.calibrationDate}
                  onChange={(e) => handleEquipmentChange('calibrationDate', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>ผู้ปฏิบัติการ</label>
                <input
                  type="text"
                  value={formData.equipment.operator}
                  onChange={(e) => handleEquipmentChange('operator', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Chemical Composition */}
          <div className="form-section">
            <h3>องค์ประกอบทางเคมี (%)</h3>
            <div className="chemical-composition-grid">
              {Object.entries(formData.chemicalComposition).map(([element, value]) => {
                const limit = getElementLimit(element);
                const status = getElementStatus(element, value);
                
                return (
                  <div key={element} className="chemical-input-group">
                    <label>
                      <strong>{element.toUpperCase()}</strong>
                      {limit && (
                        <span className="limit-info">({limit}%)</span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={value}
                      onChange={(e) => handleChemicalChange(element, e.target.value)}
                      placeholder="0.000"
                      className={`chemical-input ${status}`}
                    />
                    <div className={`element-status ${status}`}>
                      {status === 'pass' && '✓'}
                      {status === 'fail' && '✗'}
                      {status === 'not-tested' && '-'}
                      {status === 'no-limit' && 'N/A'}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="composition-actions">
              <button 
                type="button" 
                onClick={validateAllElements}
                className="btn btn-info"
              >
                ตรวจสอบผลลัพธ์
              </button>
            </div>
          </div>

          {/* Test Conditions */}
          <div className="form-section">
            <h3>สภาวะการทดสอบ</h3>
            <div className="form-row">
              <div className="form-group">
                <label>อุณหภูมิ (°C) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.testConditions.temperature}
                  onChange={(e) => handleTestConditionsChange('temperature', e.target.value)}
                  placeholder="23"
                  required
                />
              </div>
              <div className="form-group">
                <label>ความชื้น (%RH)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.testConditions.humidity}
                  onChange={(e) => handleTestConditionsChange('humidity', e.target.value)}
                  placeholder="50"
                />
              </div>
              <div className="form-group">
                <label>บรรยากาศ</label>
                <select
                  value={formData.testConditions.atmosphere}
                  onChange={(e) => handleTestConditionsChange('atmosphere', e.target.value)}
                >
                  <option value="air">อากาศ</option>
                  <option value="argon">อาร์กอน</option>
                  <option value="nitrogen">ไนโตรเจน</option>
                  <option value="vacuum">สุญญากาศ</option>
                </select>
              </div>
              <div className="form-group">
                <label>ระยะเวลา (วินาที)</label>
                <input
                  type="number"
                  value={formData.testConditions.duration}
                  onChange={(e) => handleTestConditionsChange('duration', e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="form-section">
            <h3>ผลการทดสอบ</h3>
            
            {formData.results.conformsToStandard !== null && (
              <div className={`result-summary ${formData.results.conformsToStandard ? 'pass' : 'fail'}`}>
                <h4>
                  {formData.results.conformsToStandard ? 
                    '✓ ผ่านมาตรฐาน JIS ' + formData.jisStandard : 
                    '✗ ไม่ผ่านมาตรฐาน JIS ' + formData.jisStandard
                  }
                </h4>
              </div>
            )}

            {formData.results.deviations.length > 0 && (
              <div className="deviations-list">
                <h4>รายการที่ไม่เป็นไปตามมาตรฐาน:</h4>
                <ul>
                  {formData.results.deviations.map((deviation, index) => (
                    <li key={index} className="deviation-item">{deviation}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>ความเชื่อมั่น</label>
                <select
                  value={formData.results.confidence}
                  onChange={(e) => handleResultsChange('confidence', e.target.value)}
                >
                  <option value="90">90%</option>
                  <option value="95">95%</option>
                  <option value="99">99%</option>
                </select>
              </div>
              <div className="form-group">
                <label>ความสามารถในการทำซ้ำ</label>
                <select
                  value={formData.results.repeatability}
                  onChange={(e) => handleResultsChange('repeatability', e.target.value)}
                >
                  <option value="excellent">ดีเยี่ยม</option>
                  <option value="good">ดี</option>
                  <option value="acceptable">ยอมรับได้</option>
                  <option value="poor">ไม่ดี</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>หมายเหตุผลการทดสอบ</label>
              <textarea
                value={formData.results.notes}
                onChange={(e) => handleResultsChange('notes', e.target.value)}
                placeholder="บันทึกข้อสังเกตเพิ่มเติมเกี่ยวกับผลการทดสอบ..."
                rows="3"
              />
            </div>
          </div>

          {/* Quality Control */}
          <div className="form-section">
            <h3>การควบคุมคุณภาพ</h3>
            <div className="form-row">
              <div className="form-group">
                <label>มาตรฐานอ้างอิง</label>
                <input
                  type="text"
                  value={formData.qualityControl.referenceStandard}
                  onChange={(e) => handleQualityControlChange('referenceStandard', e.target.value)}
                  placeholder="เช่น NIST SRM 361"
                />
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.qualityControl.blankTest}
                    onChange={(e) => handleQualityControlChange('blankTest', e.target.checked)}
                  />
                  ทดสอบตัวอย่างเปล่า (Blank)
                </label>
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.qualityControl.duplicateTest}
                    onChange={(e) => handleQualityControlChange('duplicateTest', e.target.checked)}
                  />
                  ทดสอบซ้ำ (Duplicate)
                </label>
              </div>
              <div className="form-group">
                <label>% Recovery (ถ้ามี)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.qualityControl.spikeRecovery}
                  onChange={(e) => handleQualityControlChange('spikeRecovery', e.target.value)}
                  placeholder="95.0"
                />
              </div>
            </div>

            <div className="form-group">
              <label>หมายเหตุควบคุมคุณภาพ</label>
              <textarea
                value={formData.qualityControl.notes}
                onChange={(e) => handleQualityControlChange('notes', e.target.value)}
                placeholder="บันทึกข้อมูลเกี่ยวกับการควบคุมคุณภาพ..."
                rows="2"
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
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              ยกเลิก
            </button>
            <button type="submit" className="btn btn-primary">
              บันทึกผลการทดสอบ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChemicalTest;