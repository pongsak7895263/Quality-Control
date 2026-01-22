// src/components/inspections/SpecTests/LengthCheck.js
import React, { useState, useEffect } from 'react';
import useAuth from '../../../hooks/useAuth';
import { calculateAverage, calculateStandardDeviation, isWithinTolerance } from '../../../utils/calculations';
import './LengthCheck.css';

const LengthCheck = ({ materialData, onSave, existingData }) => {
  const { user } = useAuth();
  
  const [measurementData, setMeasurementData] = useState({
    // ข้อมูลพื้นฐาน
    materialId: materialData?.id || '',
    testDate: new Date().toISOString().split('T')[0],
    tester: user.fullName,
    
    // ข้อมูลมาตรฐาน
    standardLength: '',
    tolerance: '±10',
    unit: 'mm',
    samplesPerBundle: 4,
    
    // การวัด
    measurements: [
      { sampleNo: 1, lengthValue: '', measuringTool: 'ตลับเมตร', measurementMethod: 'ตรง', operator: user.fullName },
      { sampleNo: 2, lengthValue: '', measuringTool: 'ตลับเมตร', measurementMethod: 'ตรง', operator: user.fullName },
      { sampleNo: 3, lengthValue: '', measuringTool: 'ตลับเมตร', measurementMethod: 'ตรง', operator: user.fullName },
      { sampleNo: 4, lengthValue: '', measuringTool: 'ตลับเมตร', measurementMethod: 'ตรง', operator: user.fullName }
    ],
    
    // เครื่องมือวัด
    measuringEquipment: {
      toolId: '',
      toolName: 'ตลับเมตร',
      brand: 'Tajima',
      model: '',
      accuracy: '±1',
      calibrationDate: '',
      nextCalibrationDate: '',
      serialNumber: '',
      range: '0-6000'
    },
    
    // สภาพแวดล้อม
    environmentalConditions: {
      temperature: '',
      humidity: '',
      surfaceCondition: 'ราบเรียบ',
      supportMethod: 'วางบนโต๊ะ',
      operator: user.fullName
    },
    
    // การตรวจสอบเพิ่มเติม
    additionalChecks: {
      straightness: '',
      uniformity: '',
      endCondition: '',
      markingPosition: ''
    },
    
    // ผลการคำนวณ
    statistics: {
      average: '',
      standardDeviation: '',
      max: '',
      min: '',
      range: ''
    },
    
    // ผลการทดสอบ
    result: '',
    remarks: '',
    photos: []
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (existingData) {
      setMeasurementData(prev => ({ ...prev, ...existingData }));
    }
  }, [existingData]);

  useEffect(() => {
    if (materialData) {
      setMeasurementData(prev => ({
        ...prev,
        materialId: materialData.id
      }));
    }
  }, [materialData]);

  const handleInputChange = (field, value) => {
    setMeasurementData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNestedInputChange = (section, field, value) => {
    setMeasurementData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleMeasurementChange = (index, field, value) => {
    setMeasurementData(prev => ({
      ...prev,
      measurements: prev.measurements.map((measurement, i) => 
        i === index ? { ...measurement, [field]: value } : measurement
      )
    }));
    
    // คำนวณสถิติใหม่เมื่อค่าการวัดเปลี่ยน
    if (field === 'lengthValue') {
      calculateStatistics();
    }
  };

  const calculateStatistics = () => {
    const values = measurementData.measurements
      .map(m => parseFloat(m.lengthValue))
      .filter(v => !isNaN(v));

    if (values.length === 0) return;

    const stats = {
      average: calculateAverage(values),
      standardDeviation: calculateStandardDeviation(values),
      max: Math.max(...values).toFixed(1),
      min: Math.min(...values).toFixed(1),
      range: (Math.max(...values) - Math.min(...values)).toFixed(1)
    };

    setMeasurementData(prev => ({
      ...prev,
      statistics: stats
    }));

    // คำนวณผลการทดสอบ
    const standardLength = parseFloat(measurementData.standardLength);
    const toleranceValue = parseFloat(measurementData.tolerance.replace('±', ''));
    
    if (standardLength && toleranceValue) {
      const allWithinTolerance = values.every(value => 
        isWithinTolerance(value, standardLength, toleranceValue)
      );
      
      const result = allWithinTolerance ? 'ผ่าน' : 'ไม่ผ่าน';
      setMeasurementData(prev => ({ ...prev, result }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!measurementData.standardLength) {
      newErrors.standardLength = 'กรุณาระบุความยาวมาตรฐาน';
    }
    
    if (!measurementData.tester) {
      newErrors.tester = 'กรุณาระบุชื่อผู้ทดสอบ';
    }
    
    // ตรวจสอบการวัดว่าครบทุกตัวอย่าง
    const incompleteCount = measurementData.measurements.filter(m => !m.lengthValue).length;
    if (incompleteCount > 0) {
      newErrors.measurements = `ยังไม่ได้วัดครบ ${incompleteCount} ตัวอย่าง`;
    }
    
    // ตรวจสอบค่าการวัดที่สมเหตุสมผล
    const values = measurementData.measurements
      .map(m => parseFloat(m.lengthValue))
      .filter(v => !isNaN(v));
      
    if (values.some(v => v <= 0 || v > 50000)) {
      newErrors.measurements = 'พบค่าการวัดที่ไม่สมเหตุสมผล (ควรอยู่ระหว่าง 0-50,000 mm)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    
    const finalData = {
      ...measurementData,
      completedAt: new Date().toISOString(),
      testType: 'length_measurement'
    };
    
    onSave(finalData);
  };

  const addMeasurement = () => {
    const newMeasurement = {
      sampleNo: measurementData.measurements.length + 1,
      lengthValue: '',
      measuringTool: 'ตลับเมตร',
      measurementMethod: 'ตรง',
      operator: user.fullName
    };
    
    setMeasurementData(prev => ({
      ...prev,
      measurements: [...prev.measurements, newMeasurement]
    }));
  };

  const removeMeasurement = (index) => {
    if (measurementData.measurements.length > 1) {
      setMeasurementData(prev => ({
        ...prev,
        measurements: prev.measurements.filter((_, i) => i !== index)
      }));
      calculateStatistics();
    }
  };

  const measuringTools = [
    'ตลับเมตร',
    'ไม้บรรทัดเหล็ก',
    'เครื่องวัดความยาวดิจิตอล',
    'เลเซอร์เมชเชอร์'
  ];

  const measurementMethods = [
    'ตรง',
    'แบ่งส่วน',
    'จากปลายไปปลาย',
    'จากจุดกึ่งกลาง'
  ];

  const straightnessOptions = [
    'ตรงมาก',
    'ตรง',
    'โค้งเล็กน้อย',
    'โค้งมาก'
  ];

  const uniformityOptions = [
    'สม่ำเสมอมาก',
    'สม่ำเสมอ',
    'ไม่สม่ำเสมอเล็กน้อย',
    'ไม่สม่ำเสมอ'
  ];

  return (
    <div className="length-check">
      <div className="test-header">
        <h2>การตรวจสอบความยาว (Length Measurement)</h2>
        <p>การวัดความยาวของวัตถุดิบตามข้อกำหนด</p>
      </div>

      <div className="length-form">
        
        {/* ข้อมูลมาตรฐาน */}
        <div className="form-section">
          <h3>ข้อมูลมาตรฐาน</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>ความยาวมาตรฐาน *</label>
              <div className="input-with-unit">
                <input
                  type="number"
                  step="1"
                  value={measurementData.standardLength}
                  onChange={(e) => handleInputChange('standardLength', e.target.value)}
                  className={errors.standardLength ? 'error' : ''}
                  placeholder="เช่น 6000"
                />
                <span className="unit">mm</span>
              </div>
              {errors.standardLength && <span className="error-text">{errors.standardLength}</span>}
            </div>
            
            <div className="form-group">
              <label>ค่าความคลาดเคลื่อนที่ยอมรับได้</label>
              <select
                value={measurementData.tolerance}
                onChange={(e) => handleInputChange('tolerance', e.target.value)}
              >
                <option value="±5">±5 mm</option>
                <option value="±10">±10 mm</option>
                <option value="±15">±15 mm</option>
                <option value="±20">±20 mm</option>
                <option value="±25">±25 mm</option>
                <option value="±50">±50 mm</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>จำนวนตัวอย่างต่อมัด</label>
              <input
                type="number"
                min="1"
                max="10"
                value={measurementData.samplesPerBundle}
                onChange={(e) => handleInputChange('samplesPerBundle', parseInt(e.target.value))}
              />
            </div>
            
            <div className="form-group">
              <label>วันที่ทดสอบ</label>
              <input
                type="date"
                value={measurementData.testDate}
                onChange={(e) => handleInputChange('testDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ข้อมูลเครื่องมือวัด */}
        <div className="form-section">
          <h3>ข้อมูลเครื่องมือวัด</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>ชื่อเครื่องมือ</label>
              <input
                type="text"
                value={measurementData.measuringEquipment.toolName}
                onChange={(e) => handleNestedInputChange('measuringEquipment', 'toolName', e.target.value)}
                placeholder="เช่น ตลับเมตร"
              />
            </div>
            
            <div className="form-group">
              <label>ยี่ห้อ</label>
              <input
                type="text"
                value={measurementData.measuringEquipment.brand}
                onChange={(e) => handleNestedInputChange('measuringEquipment', 'brand', e.target.value)}
                placeholder="เช่น Tajima"
              />
            </div>
            
            <div className="form-group">
              <label>รุ่น</label>
              <input
                type="text"
                value={measurementData.measuringEquipment.model}
                onChange={(e) => handleNestedInputChange('measuringEquipment', 'model', e.target.value)}
                placeholder="เช่น G-25M"
              />
            </div>
            
            <div className="form-group">
              <label>ความแม่นยำ</label>
              <input
                type="text"
                value={measurementData.measuringEquipment.accuracy}
                onChange={(e) => handleNestedInputChange('measuringEquipment', 'accuracy', e.target.value)}
                placeholder="เช่น ±1 mm"
              />
            </div>
            
            <div className="form-group">
              <label>ช่วงการวัด</label>
              <input
                type="text"
                value={measurementData.measuringEquipment.range}
                onChange={(e) => handleNestedInputChange('measuringEquipment', 'range', e.target.value)}
                placeholder="เช่น 0-6000 mm"
              />
            </div>
            
            <div className="form-group">
              <label>วันที่ปรับเทียบล่าสุด</label>
              <input
                type="date"
                value={measurementData.measuringEquipment.calibrationDate}
                onChange={(e) => handleNestedInputChange('measuringEquipment', 'calibrationDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* การวัด */}
        <div className="form-section">
          <h3>การวัดความยาว</h3>
          
          <div className="measurements-header">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={addMeasurement}
            >
              + เพิ่มการวัด
            </button>
            {errors.measurements && <span className="error-text">{errors.measurements}</span>}
          </div>
          
          <div className="measurements-table">
            <table>
              <thead>
                <tr>
                  <th>ลำดับ</th>
                  <th>ความยาวที่วัดได้ (mm)</th>
                  <th>เครื่องมือวัด</th>
                  <th>วิธีการวัด</th>
                  <th>ผู้วัด</th>
                  <th>การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {measurementData.measurements.map((measurement, index) => (
                  <tr key={index}>
                    <td>{measurement.sampleNo}</td>
                    <td>
                      <input
                        type="number"
                        step="1"
                        value={measurement.lengthValue}
                        onChange={(e) => handleMeasurementChange(index, 'lengthValue', e.target.value)}
                        placeholder="0"
                        className="measurement-input"
                      />
                    </td>
                    <td>
                      <select
                        value={measurement.measuringTool}
                        onChange={(e) => handleMeasurementChange(index, 'measuringTool', e.target.value)}
                        className="tool-select"
                      >
                        {measuringTools.map(tool => (
                          <option key={tool} value={tool}>{tool}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={measurement.measurementMethod}
                        onChange={(e) => handleMeasurementChange(index, 'measurementMethod', e.target.value)}
                        className="method-select"
                      >
                        {measurementMethods.map(method => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={measurement.operator}
                        onChange={(e) => handleMeasurementChange(index, 'operator', e.target.value)}
                        placeholder="ชื่อผู้วัด"
                        className="operator-input"
                      />
                    </td>
                    <td>
                      {measurementData.measurements.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => removeMeasurement(index)}
                        >
                          ลบ
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* การตรวจสอบเพิ่มเติม */}
        <div className="form-section">
          <h3>การตรวจสอบคุณภาพเพิ่มเติม</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>ความตรง</label>
              <select
                value={measurementData.additionalChecks.straightness}
                onChange={(e) => handleNestedInputChange('additionalChecks', 'straightness', e.target.value)}
              >
                <option value="">เลือกความตรง</option>
                {straightnessOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>ความสม่ำเสมอ</label>
              <select
                value={measurementData.additionalChecks.uniformity}
                onChange={(e) => handleNestedInputChange('additionalChecks', 'uniformity', e.target.value)}
              >
                <option value="">เลือกความสม่ำเสมอ</option>
                {uniformityOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>สภาพปลาย</label>
              <select
                value={measurementData.additionalChecks.endCondition}
                onChange={(e) => handleNestedInputChange('additionalChecks', 'endCondition', e.target.value)}
              >
                <option value="">เลือกสภาพปลาย</option>
                <option value="ตัดเรียบร้อย">ตัดเรียบร้อย</option>
                <option value="ตัดเอียง">ตัดเอียง</option>
                <option value="มีรอยขาด">มีรอยขาด</option>
                <option value="ไม่เรียบ">ไม่เรียบ</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>ตำแหน่งการทำเครื่องหมาย</label>
              <select
                value={measurementData.additionalChecks.markingPosition}
                onChange={(e) => handleNestedInputChange('additionalChecks', 'markingPosition', e.target.value)}
              >
                <option value="">เลือกตำแหน่ง</option>
                <option value="ปลาย">ปลาย</option>
                <option value="กลาง">กลาง</option>
                <option value="ทั้งสองปลาย">ทั้งสองปลาย</option>
                <option value="ไม่มี">ไม่มี</option>
              </select>
            </div>
          </div>
        </div>

        {/* สถิติการวัด */}
        {measurementData.statistics.average && (
          <div className="form-section">
            <h3>สถิติการวัด</h3>
            <div className="statistics-grid">
              <div className="stat-item">
                <label>ค่าเฉลี่ย</label>
                <span className="stat-value">{measurementData.statistics.average} mm</span>
              </div>
              <div className="stat-item">
                <label>ส่วนเบี่ยงเบนมาตรฐาน</label>
                <span className="stat-value">{measurementData.statistics.standardDeviation} mm</span>
              </div>
              <div className="stat-item">
                <label>ค่าสูงสุด</label>
                <span className="stat-value">{measurementData.statistics.max} mm</span>
              </div>
              <div className="stat-item">
                <label>ค่าต่ำสุด</label>
                <span className="stat-value">{measurementData.statistics.min} mm</span>
              </div>
              <div className="stat-item">
                <label>ช่วงค่า</label>
                <span className="stat-value">{measurementData.statistics.range} mm</span>
              </div>
            </div>
          </div>
        )}

        {/* สภาพแวดล้อม */}
        <div className="form-section">
          <h3>สภาพแวดล้อมการทดสอบ</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>อุณหภูมิ (°C)</label>
              <input
                type="number"
                step="0.1"
                value={measurementData.environmentalConditions.temperature}
                onChange={(e) => handleNestedInputChange('environmentalConditions', 'temperature', e.target.value)}
                placeholder="เช่น 25.0"
              />
            </div>
            
            <div className="form-group">
              <label>ความชื้น (%)</label>
              <input
                type="number"
                step="0.1"
                value={measurementData.environmentalConditions.humidity}
                onChange={(e) => handleNestedInputChange('environmentalConditions', 'humidity', e.target.value)}
                placeholder="เช่น 60.0"
              />
            </div>
            
            <div className="form-group">
              <label>สภาพพื้นผิว</label>
              <select
                value={measurementData.environmentalConditions.surfaceCondition}
                onChange={(e) => handleNestedInputChange('environmentalConditions', 'surfaceCondition', e.target.value)}
              >
                <option value="ราบเรียบ">ราบเรียบ</option>
                <option value="ขรุขระเล็กน้อย">ขรุขระเล็กน้อย</option>
                <option value="ไม่เรียบ">ไม่เรียบ</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>วิธีการพยุง</label>
              <select
                value={measurementData.environmentalConditions.supportMethod}
                onChange={(e) => handleNestedInputChange('environmentalConditions', 'supportMethod', e.target.value)}
              >
                <option value="วางบนโต๊ะ">วางบนโต๊ะ</option>
                <option value="พยุงสองจุด">พยุงสองจุด</option>
                <option value="แขวน">แขวน</option>
                <option value="ยึดปลายหนึ่ง">ยึดปลายหนึ่ง</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>ผู้ทดสอบ *</label>
              <input
                type="text"
                value={measurementData.tester}
                onChange={(e) => handleInputChange('tester', e.target.value)}
                className={errors.tester ? 'error' : ''}
                placeholder="ชื่อผู้ทดสอบ"
              />
              {errors.tester && <span className="error-text">{errors.tester}</span>}
            </div>
          </div>
        </div>

        {/* ผลการทดสอบ */}
        {measurementData.result && (
          <div className="form-section">
            <h3>ผลการทดสอบ</h3>
            <div className={`result-display ${measurementData.result === 'ผ่าน' ? 'pass' : 'fail'}`}>
              <div className="result-badge">
                {measurementData.result}
              </div>
              <div className="result-details">
                <p>ความยาวมาตรฐาน: {measurementData.standardLength} {measurementData.tolerance} mm</p>
                <p>ค่าเฉลี่ยที่วัดได้: {measurementData.statistics.average} mm</p>
                <p>ความแตกต่าง: {Math.abs(parseFloat(measurementData.statistics.average) - parseFloat(measurementData.standardLength)).toFixed(1)} mm</p>
              </div>
            </div>
          </div>
        )}

        {/* หมายเหตุ */}
        <div className="form-section">
          <h3>หมายเหตุ</h3>
          <div className="form-group">
            <textarea
              value={measurementData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              placeholder="ระบุหมายเหตุ ข้อสังเกต หรือข้อควรระวัง..."
              rows={4}
            />
          </div>
        </div>

        {/* ปุ่มดำเนินการ */}
        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={handleSubmit}
          >
            บันทึกผลการวัดความยาว
          </button>
        </div>
      </div>
    </div>
  );
};

export default LengthCheck;