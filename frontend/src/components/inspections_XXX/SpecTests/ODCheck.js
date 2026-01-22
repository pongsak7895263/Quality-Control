// components/inspections/SpecTests/ODCheck.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';

const ODCheck = ({ inspection, onComplete, onCancel }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    sampleCount: 4,
    measurements: ['', '', '', ''],
    measuringTool: 'vernier',
    specification: {
      nominal: '',
      tolerance: '',
      min: '',
      max: ''
    },
    environment: {
      temperature: '',
      humidity: '',
      pressure: ''
    },
    results: {
      average: 0,
      standardDeviation: 0,
      range: 0,
      isWithinSpec: null,
      notes: ''
    },
    tester: user?.name || '',
    testDate: new Date().toISOString().split('T')[0],
    testTime: new Date().toTimeString().slice(0, 5)
  });

  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    // Load existing data if available
    if (inspection?.testResults?.od_check) {
      setFormData(prev => ({
        ...prev,
        ...inspection.testResults.od_check
      }));
    }
  }, [inspection]);

  const handleMeasurementChange = (index, value) => {
    const newMeasurements = [...formData.measurements];
    newMeasurements[index] = value;
    
    setFormData(prev => ({
      ...prev,
      measurements: newMeasurements
    }));

    // Auto-calculate results when all measurements are filled
    const validMeasurements = newMeasurements.filter(m => m !== '' && !isNaN(parseFloat(m)));
    if (validMeasurements.length === formData.sampleCount) {
      calculateResults(validMeasurements);
    }
  };

  const handleSpecificationChange = (field, value) => {
    const newSpec = { ...formData.specification };
    newSpec[field] = value;

    // Auto-calculate min/max from nominal and tolerance
    if (field === 'nominal' || field === 'tolerance') {
      const nominal = parseFloat(newSpec.nominal) || 0;
      const tolerance = parseFloat(newSpec.tolerance) || 0;
      newSpec.min = (nominal - tolerance).toFixed(3);
      newSpec.max = (nominal + tolerance).toFixed(3);
    }

    setFormData(prev => ({
      ...prev,
      specification: newSpec
    }));
  };

  const calculateResults = (measurements) => {
    const values = measurements.map(m => parseFloat(m));
    const count = values.length;
    
    if (count === 0) return;

    // Calculate average
    const average = values.reduce((sum, val) => sum + val, 0) / count;
    
    // Calculate standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / count;
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate range
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    // Check if within specification
    const specMin = parseFloat(formData.specification.min);
    const specMax = parseFloat(formData.specification.max);
    const isWithinSpec = !isNaN(specMin) && !isNaN(specMax) ? 
      (min >= specMin && max <= specMax) : null;

    setFormData(prev => ({
      ...prev,
      results: {
        ...prev.results,
        average: average.toFixed(3),
        standardDeviation: standardDeviation.toFixed(4),
        range: range.toFixed(3),
        isWithinSpec
      }
    }));
  };

  const validateForm = () => {
    const errors = [];

    // Check measurements
    const validMeasurements = formData.measurements.filter(m => m !== '' && !isNaN(parseFloat(m)));
    if (validMeasurements.length < formData.sampleCount) {
      errors.push(`กรุณากรอกข้อมูลการวัดให้ครบ ${formData.sampleCount} ตัวอย่าง`);
    }

    // Check specification
    if (!formData.specification.nominal || !formData.specification.tolerance) {
      errors.push('กรุณากรอกข้อมูลขนาดมาตรฐานและความคลาดเคลื่อน');
    }

    // Check environment data
    if (!formData.environment.temperature) {
      errors.push('กรุณากรอกอุณหภูมิขณะทดสอบ');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Prepare final results
    const finalResults = {
      ...formData,
      completedAt: new Date().toISOString(),
      status: 'completed'
    };

    onComplete(finalResults);
  };

  const handleSampleCountChange = (count) => {
    const newMeasurements = Array(count).fill('');
    // Copy existing measurements if available
    for (let i = 0; i < Math.min(count, formData.measurements.length); i++) {
      newMeasurements[i] = formData.measurements[i];
    }

    setFormData(prev => ({
      ...prev,
      sampleCount: count,
      measurements: newMeasurements
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h2>การตรวจสอบขนาด OD (Outer Diameter)</h2>
          <button onClick={onCancel} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="od-check-form">
          {/* Test Information */}
          <div className="form-section">
            <h3>ข้อมูลการทดสอบ</h3>
            <div className="form-row">
              <div className="form-group">
                <label>ผู้ทดสอบ</label>
                <input
                  type="text"
                  value={formData.tester}
                  onChange={(e) => setFormData(prev => ({ ...prev, tester: e.target.value }))}
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

            <div className="form-row">
              <div className="form-group">
                <label>เครื่องมือวัด</label>
                <select
                  value={formData.measuringTool}
                  onChange={(e) => setFormData(prev => ({ ...prev, measuringTool: e.target.value }))}
                >
                  <option value="vernier">เวอร์เนียร์คาลิปเปอร์</option>
                  <option value="micrometer">ไมโครมิเตอร์</option>
                  <option value="gauge">เกจวัด</option>
                  <option value="cmm">CMM</option>
                </select>
              </div>
              <div className="form-group">
                <label>จำนวนตัวอย่าง</label>
                <select
                  value={formData.sampleCount}
                  onChange={(e) => handleSampleCountChange(parseInt(e.target.value))}
                >
                  <option value={3}>3 ตัวอย่าง</option>
                  <option value={4}>4 ตัวอย่าง</option>
                  <option value={5}>5 ตัวอย่าง</option>
                  <option value={10}>10 ตัวอย่าง</option>
                </select>
              </div>
            </div>
          </div>

          {/* Specification */}
          <div className="form-section">
            <h3>ข้อกำหนดขนาด</h3>
            <div className="form-row">
              <div className="form-group">
                <label>ขนาดมาตรฐาน (มม.) *</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.specification.nominal}
                  onChange={(e) => handleSpecificationChange('nominal', e.target.value)}
                  placeholder="เช่น 25.400"
                  required
                />
              </div>
              <div className="form-group">
                <label>ความคลาดเคลื่อน (±มม.) *</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.specification.tolerance}
                  onChange={(e) => handleSpecificationChange('tolerance', e.target.value)}
                  placeholder="เช่น 0.100"
                  required
                />
              </div>
              <div className="form-group">
                <label>ขนาดต่ำสุด (มม.)</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.specification.min}
                  readOnly
                  className="readonly-input"
                />
              </div>
              <div className="form-group">
                <label>ขนาดสูงสุด (มม.)</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.specification.max}
                  readOnly
                  className="readonly-input"
                />
              </div>
            </div>
          </div>

          {/* Environment Conditions */}
          <div className="form-section">
            <h3>สภาพแวดล้อมการทดสอบ</h3>
            <div className="form-row">
              <div className="form-group">
                <label>อุณหภูมิ (°C) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.environment.temperature}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    environment: { ...prev.environment, temperature: e.target.value }
                  }))}
                  placeholder="เช่น 23.5"
                  required
                />
              </div>
              <div className="form-group">
                <label>ความชื้น (%RH)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.environment.humidity}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    environment: { ...prev.environment, humidity: e.target.value }
                  }))}
                  placeholder="เช่น 55.0"
                />
              </div>
              <div className="form-group">
                <label>ความดันอากาศ (hPa)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.environment.pressure}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    environment: { ...prev.environment, pressure: e.target.value }
                  }))}
                  placeholder="เช่น 1013.25"
                />
              </div>
            </div>
          </div>

          {/* Measurements */}
          <div className="form-section">
            <h3>ผลการวัด</h3>
            <div className="measurements-grid">
              {formData.measurements.map((measurement, index) => (
                <div key={index} className="form-group">
                  <label>ตัวอย่างที่ {index + 1} (มม.) *</label>
                  <input
                    type="number"
                    step="0.001"
                    value={measurement}
                    onChange={(e) => handleMeasurementChange(index, e.target.value)}
                    placeholder="0.000"
                    className={measurement && formData.specification.min && formData.specification.max ? 
                      (parseFloat(measurement) >= parseFloat(formData.specification.min) && 
                       parseFloat(measurement) <= parseFloat(formData.specification.max) ? 
                       'valid' : 'invalid') : ''}
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="form-section">
            <h3>ผลการคำนวณ</h3>
            <div className="results-grid">
              <div className="result-item">
                <label>ค่าเฉลี่ย</label>
                <span className="result-value">{formData.results.average} มม.</span>
              </div>
              <div className="result-item">
                <label>ส่วนเบียงเบนมาตรฐาน</label>
                <span className="result-value">{formData.results.standardDeviation} มม.</span>
              </div>
              <div className="result-item">
                <label>พิสัย (Range)</label>
                <span className="result-value">{formData.results.range} มม.</span>
              </div>
              <div className="result-item">
                <label>ผลการประเมิน</label>
                <span className={`result-value ${
                  formData.results.isWithinSpec === null ? 'pending' :
                  formData.results.isWithinSpec ? 'pass' : 'fail'
                }`}>
                  {formData.results.isWithinSpec === null ? 'รอการประเมิน' :
                   formData.results.isWithinSpec ? 'ผ่าน' : 'ไม่ผ่าน'}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>หมายเหตุ</label>
              <textarea
                value={formData.results.notes}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  results: { ...prev.results, notes: e.target.value }
                }))}
                placeholder="บันทึกข้อสังเกตเพิ่มเติม..."
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

export default ODCheck;