// components/forms/InspectionSpecForm.js - Inspection Specifications Configuration Form
import React, { useState, useEffect } from 'react';
import { 
  Save, X, Settings, Ruler, Eye, Package, AlertCircle, 
  Info, CheckCircle, RotateCcw, Copy, Upload 
} from 'lucide-react';

const InspectionSpecForm = ({ specs, onSave, onCancel }) => {
  const [formSpecs, setFormSpecs] = useState({
    odCheck: {
      required: false,
      minValue: '',
      maxValue: '',
      tolerance: '',
      unit: 'mm'
    },
    lengthCheck: {
      required: false,
      minValue: '',
      maxValue: '',
      tolerance: '',
      unit: 'mm'
    },
    visualInspection: {
      required: false,
      checkCracks: true,
      checkGrinding: true,
      checkBurr: true,
      checkSurfaceFinish: true
    },
    packagingCheck: {
      required: false,
      checkCondition: true,
      checkLabeling: true,
      checkProtection: true
    }
  });

  const [errors, setErrors] = useState({});
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState('odCheck');

  // Predefined presets for common material types
  const presets = {
    steel_bar: {
      name: 'เหล็กเส้นมาตรฐาน',
      odCheck: { required: true, minValue: 20, maxValue: 25, tolerance: 0.5, unit: 'mm' },
      lengthCheck: { required: true, minValue: 6000, maxValue: 12000, tolerance: 50, unit: 'mm' },
      visualInspection: { required: true, checkCracks: true, checkGrinding: true, checkBurr: true, checkSurfaceFinish: true },
      packagingCheck: { required: true, checkCondition: true, checkLabeling: true, checkProtection: true }
    },
    steel_pipe: {
      name: 'เหล็กท่อนมาตรฐาน',
      odCheck: { required: true, minValue: 15, maxValue: 30, tolerance: 0.3, unit: 'mm' },
      lengthCheck: { required: true, minValue: 3000, maxValue: 8000, tolerance: 30, unit: 'mm' },
      visualInspection: { required: true, checkCracks: true, checkGrinding: true, checkBurr: true, checkSurfaceFinish: true },
      packagingCheck: { required: true, checkCondition: true, checkLabeling: true, checkProtection: true }
    },
    hardened_work: {
      name: 'งานชุบแข็งมาตรฐาน',
      odCheck: { required: true, minValue: 10, maxValue: 50, tolerance: 0.2, unit: 'mm' },
      lengthCheck: { required: true, minValue: 1000, maxValue: 6000, tolerance: 20, unit: 'mm' },
      visualInspection: { required: true, checkCracks: true, checkGrinding: true, checkBurr: true, checkSurfaceFinish: true },
      packagingCheck: { required: true, checkCondition: true, checkLabeling: true, checkProtection: true }
    }
  };

  const tabs = [
    { id: 'odCheck', label: 'OD Check', icon: Ruler, description: 'ตรวจสอบขนาดเส้นผ่านศูนย์กลาง' },
    { id: 'lengthCheck', label: 'Length Check', icon: Ruler, description: 'ตรวจสอบความยาว' },
    { id: 'visualInspection', label: 'Visual Inspection', icon: Eye, description: 'ตรวจสอบภายนอก' },
    { id: 'packagingCheck', label: 'Packaging Check', icon: Package, description: 'ตรวจสอบบรรจุภัณฑ์' }
  ];

  const units = [
    { value: 'mm', label: 'มิลลิเมตร (mm)' },
    { value: 'cm', label: 'เซนติเมตร (cm)' },
    { value: 'inch', label: 'นิ้ว (inch)' }
  ];

  useEffect(() => {
    if (specs) {
      setFormSpecs(specs);
    }
  }, [specs]);

  const handleSpecChange = (section, field, value) => {
    setFormSpecs(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));

    // Clear related errors
    const errorKey = `${section}.${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const validateSpecs = () => {
    const newErrors = {};

    // Validate OD Check
    if (formSpecs.odCheck.required) {
      if (!formSpecs.odCheck.minValue || formSpecs.odCheck.minValue <= 0) {
        newErrors['odCheck.minValue'] = 'ค่าต่ำสุดต้องมากกว่า 0';
      }
      if (!formSpecs.odCheck.maxValue || formSpecs.odCheck.maxValue <= 0) {
        newErrors['odCheck.maxValue'] = 'ค่าสูงสุดต้องมากกว่า 0';
      }
      if (formSpecs.odCheck.minValue && formSpecs.odCheck.maxValue && 
          parseFloat(formSpecs.odCheck.minValue) >= parseFloat(formSpecs.odCheck.maxValue)) {
        newErrors['odCheck.maxValue'] = 'ค่าสูงสุดต้องมากกว่าค่าต่ำสุด';
      }
      if (!formSpecs.odCheck.tolerance || formSpecs.odCheck.tolerance < 0) {
        newErrors['odCheck.tolerance'] = 'ค่าเผื่อต้องไม่น้อยกว่า 0';
      }
    }

    // Validate Length Check
    if (formSpecs.lengthCheck.required) {
      if (!formSpecs.lengthCheck.minValue || formSpecs.lengthCheck.minValue <= 0) {
        newErrors['lengthCheck.minValue'] = 'ค่าต่ำสุดต้องมากกว่า 0';
      }
      if (!formSpecs.lengthCheck.maxValue || formSpecs.lengthCheck.maxValue <= 0) {
        newErrors['lengthCheck.maxValue'] = 'ค่าสูงสุดต้องมากกว่า 0';
      }
      if (formSpecs.lengthCheck.minValue && formSpecs.lengthCheck.maxValue && 
          parseFloat(formSpecs.lengthCheck.minValue) >= parseFloat(formSpecs.lengthCheck.maxValue)) {
        newErrors['lengthCheck.maxValue'] = 'ค่าสูงสุดต้องมากกว่าค่าต่ำสุด';
      }
      if (!formSpecs.lengthCheck.tolerance || formSpecs.lengthCheck.tolerance < 0) {
        newErrors['lengthCheck.tolerance'] = 'ค่าเผื่อต้องไม่น้อยกว่า 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateSpecs()) {
      onSave(formSpecs);
    }
  };

  const handlePresetLoad = (presetKey) => {
    const preset = presets[presetKey];
    if (preset) {
      setFormSpecs({
        odCheck: { ...preset.odCheck },
        lengthCheck: { ...preset.lengthCheck },
        visualInspection: { ...preset.visualInspection },
        packagingCheck: { ...preset.packagingCheck }
      });
    }
  };

  const handleReset = () => {
    setFormSpecs({
      odCheck: { required: false, minValue: '', maxValue: '', tolerance: '', unit: 'mm' },
      lengthCheck: { required: false, minValue: '', maxValue: '', tolerance: '', unit: 'mm' },
      visualInspection: { required: false, checkCracks: true, checkGrinding: true, checkBurr: true, checkSurfaceFinish: true },
      packagingCheck: { required: false, checkCondition: true, checkLabeling: true, checkProtection: true }
    });
    setErrors({});
  };

  const renderODCheckForm = () => (
    <div className="spec-form-section">
      <div className="section-header">
        <div className="section-title">
          <Ruler className="w-5 h-5 text-blue-500" />
          <h4>การตรวจสอบขนาดเส้นผ่านศูนย์กลาง (OD)</h4>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={formSpecs.odCheck.required}
            onChange={(e) => handleSpecChange('odCheck', 'required', e.target.checked)}
          />
          <span className="slider"></span>
          <span className="toggle-label">เปิดใช้งาน</span>
        </label>
      </div>

      {formSpecs.odCheck.required && (
        <div className="spec-form-content">
          <div className="form-grid">
            <div className="form-group">
              <label>ค่าต่ำสุด *</label>
              <input
                type="number"
                step="0.001"
                value={formSpecs.odCheck.minValue}
                onChange={(e) => handleSpecChange('odCheck', 'minValue', parseFloat(e.target.value))}
                className={errors['odCheck.minValue'] ? 'error' : ''}
                placeholder="เช่น 20.0"
              />
              {errors['odCheck.minValue'] && (
                <span className="error-message">
                  <AlertCircle className="w-4 h-4" />
                  {errors['odCheck.minValue']}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>ค่าสูงสุด *</label>
              <input
                type="number"
                step="0.001"
                value={formSpecs.odCheck.maxValue}
                onChange={(e) => handleSpecChange('odCheck', 'maxValue', parseFloat(e.target.value))}
                className={errors['odCheck.maxValue'] ? 'error' : ''}
                placeholder="เช่น 25.0"
              />
              {errors['odCheck.maxValue'] && (
                <span className="error-message">
                  <AlertCircle className="w-4 h-4" />
                  {errors['odCheck.maxValue']}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>ค่าเผื่อ (Tolerance) *</label>
              <input
                type="number"
                step="0.001"
                value={formSpecs.odCheck.tolerance}
                onChange={(e) => handleSpecChange('odCheck', 'tolerance', parseFloat(e.target.value))}
                className={errors['odCheck.tolerance'] ? 'error' : ''}
                placeholder="เช่น 0.5"
              />
              {errors['odCheck.tolerance'] && (
                <span className="error-message">
                  <AlertCircle className="w-4 h-4" />
                  {errors['odCheck.tolerance']}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>หน่วย</label>
              <select
                value={formSpecs.odCheck.unit}
                onChange={(e) => handleSpecChange('odCheck', 'unit', e.target.value)}
              >
                {units.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="spec-info">
            <Info className="w-4 h-4 text-blue-500" />
            <p>
              ระบบจะตรวจสอบว่าค่า OD อยู่ในช่วง {formSpecs.odCheck.minValue || 'X'} - {formSpecs.odCheck.maxValue || 'Y'} ±{formSpecs.odCheck.tolerance || 'Z'} {formSpecs.odCheck.unit}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderLengthCheckForm = () => (
    <div className="spec-form-section">
      <div className="section-header">
        <div className="section-title">
          <Ruler className="w-5 h-5 text-green-500" />
          <h4>การตรวจสอบความยาว</h4>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={formSpecs.lengthCheck.required}
            onChange={(e) => handleSpecChange('lengthCheck', 'required', e.target.checked)}
          />
          <span className="slider"></span>
          <span className="toggle-label">เปิดใช้งาน</span>
        </label>
      </div>

      {formSpecs.lengthCheck.required && (
        <div className="spec-form-content">
          <div className="form-grid">
            <div className="form-group">
              <label>ค่าต่ำสุด *</label>
              <input
                type="number"
                step="0.1"
                value={formSpecs.lengthCheck.minValue}
                onChange={(e) => handleSpecChange('lengthCheck', 'minValue', parseFloat(e.target.value))}
                className={errors['lengthCheck.minValue'] ? 'error' : ''}
                placeholder="เช่น 6000"
              />
              {errors['lengthCheck.minValue'] && (
                <span className="error-message">
                  <AlertCircle className="w-4 h-4" />
                  {errors['lengthCheck.minValue']}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>ค่าสูงสุด *</label>
              <input
                type="number"
                step="0.1"
                value={formSpecs.lengthCheck.maxValue}
                onChange={(e) => handleSpecChange('lengthCheck', 'maxValue', parseFloat(e.target.value))}
                className={errors['lengthCheck.maxValue'] ? 'error' : ''}
                placeholder="เช่น 12000"
              />
              {errors['lengthCheck.maxValue'] && (
                <span className="error-message">
                  <AlertCircle className="w-4 h-4" />
                  {errors['lengthCheck.maxValue']}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>ค่าเผื่อ (Tolerance) *</label>
              <input
                type="number"
                step="0.1"
                value={formSpecs.lengthCheck.tolerance}
                onChange={(e) => handleSpecChange('lengthCheck', 'tolerance', parseFloat(e.target.value))}
                className={errors['lengthCheck.tolerance'] ? 'error' : ''}
                placeholder="เช่น 50"
              />
              {errors['lengthCheck.tolerance'] && (
                <span className="error-message">
                  <AlertCircle className="w-4 h-4" />
                  {errors['lengthCheck.tolerance']}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>หน่วย</label>
              <select
                value={formSpecs.lengthCheck.unit}
                onChange={(e) => handleSpecChange('lengthCheck', 'unit', e.target.value)}
              >
                {units.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="spec-info">
            <Info className="w-4 h-4 text-green-500" />
            <p>
              ระบบจะตรวจสอบว่าความยาวอยู่ในช่วง {formSpecs.lengthCheck.minValue || 'X'} - {formSpecs.lengthCheck.maxValue || 'Y'} ±{formSpecs.lengthCheck.tolerance || 'Z'} {formSpecs.lengthCheck.unit}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderVisualInspectionForm = () => (
    <div className="spec-form-section">
      <div className="section-header">
        <div className="section-title">
          <Eye className="w-5 h-5 text-purple-500" />
          <h4>การตรวจสอบภายนอก</h4>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={formSpecs.visualInspection.required}
            onChange={(e) => handleSpecChange('visualInspection', 'required', e.target.checked)}
          />
          <span className="slider"></span>
          <span className="toggle-label">เปิดใช้งาน</span>
        </label>
      </div>

      {formSpecs.visualInspection.required && (
        <div className="spec-form-content">
          <div className="checkbox-grid">
            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={formSpecs.visualInspection.checkCracks}
                onChange={(e) => handleSpecChange('visualInspection', 'checkCracks', e.target.checked)}
              />
              <div className="checkbox-content">
                <span className="checkbox-title">ตรวจรอยแตก</span>
                <span className="checkbox-description">ตรวจหาแยกแยกหรือรอยแตกบนผิววัสดุ</span>
              </div>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={formSpecs.visualInspection.checkGrinding}
                onChange={(e) => handleSpecChange('visualInspection', 'checkGrinding', e.target.checked)}
              />
              <div className="checkbox-content">
                <span className="checkbox-title">ตรวจรอยเจียร์</span>
                <span className="checkbox-description">ตรวจหารอยเจียร์หรือรอยขีดข่วน</span>
              </div>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={formSpecs.visualInspection.checkBurr}
                onChange={(e) => handleSpecChange('visualInspection', 'checkBurr', e.target.checked)}
              />
              <div className="checkbox-content">
                <span className="checkbox-title">ตรวจครีบสูง</span>
                <span className="checkbox-description">ตรวจหาครีบหรือขอบที่แหลมคม</span>
              </div>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={formSpecs.visualInspection.checkSurfaceFinish}
                onChange={(e) => handleSpecChange('visualInspection', 'checkSurfaceFinish', e.target.checked)}
              />
              <div className="checkbox-content">
                <span className="checkbox-title">ตรวจผิวหน้า</span>
                <span className="checkbox-description">ตรวจสอบคุณภาพผิวหน้าและความเรียบ</span>
              </div>
            </label>
          </div>

          <div className="spec-info">
            <Info className="w-4 h-4 text-purple-500" />
            <p>
              ระบบจะตรวจสอบตามรายการที่เลือกไว้ หากพบข้อบกพร่องใดๆ จะถือว่าไม่ผ่านการตรวจสอบ
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderPackagingCheckForm = () => (
    <div className="spec-form-section">
      <div className="section-header">
        <div className="section-title">
          <Package className="w-5 h-5 text-orange-500" />
          <h4>การตรวจสอบบรรจุภัณฑ์</h4>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={formSpecs.packagingCheck.required}
            onChange={(e) => handleSpecChange('packagingCheck', 'required', e.target.checked)}
          />
          <span className="slider"></span>
          <span className="toggle-label">เปิดใช้งาน</span>
        </label>
      </div>

      {formSpecs.packagingCheck.required && (
        <div className="spec-form-content">
          <div className="checkbox-grid">
            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={formSpecs.packagingCheck.checkCondition}
                onChange={(e) => handleSpecChange('packagingCheck', 'checkCondition', e.target.checked)}
              />
              <div className="checkbox-content">
                <span className="checkbox-title">ตรวจสภาพบรรจุภัณฑ์</span>
                <span className="checkbox-description">ตรวจหาความเสียหายของบรรจุภัณฑ์</span>
              </div>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={formSpecs.packagingCheck.checkLabeling}
                onChange={(e) => handleSpecChange('packagingCheck', 'checkLabeling', e.target.checked)}
              />
              <div className="checkbox-content">
                <span className="checkbox-title">ตรวจฉลาก</span>
                <span className="checkbox-description">ตรวจสอบความถูกต้องและชัดเจนของฉลาก</span>
              </div>
            </label>

            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={formSpecs.packagingCheck.checkProtection}
                onChange={(e) => handleSpecChange('packagingCheck', 'checkProtection', e.target.checked)}
              />
              <div className="checkbox-content">
                <span className="checkbox-title">ตรวจการป้องกัน</span>
                <span className="checkbox-description">ตรวจสอบความเพียงพอของการป้องกัน</span>
              </div>
            </label>
          </div>

          <div className="spec-info">
            <Info className="w-4 h-4 text-orange-500" />
            <p>
              ระบบจะตรวจสอบตามรายการที่เลือกไว้ หากพบปัญหาใดๆ จะถือว่าไม่ผ่านการตรวจสอบ
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'odCheck':
        return renderODCheckForm();
      case 'lengthCheck':
        return renderLengthCheckForm();
      case 'visualInspection':
        return renderVisualInspectionForm();
      case 'packagingCheck':
        return renderPackagingCheckForm();
      default:
        return renderODCheckForm();
    }
  };

  return (
    <div className="inspection-spec-form">
      <div className="form-header">
        <h3>กำหนดค่าการตรวจสอบ</h3>
        <p className="form-description">
          ตั้งค่าเกณฑ์การตรวจสอบคุณภาพสำหรับวัสดุแต่ละประเภท
        </p>
      </div>

      {/* Presets */}
      <div className="presets-section">
        <h4>ค่าตั้งต้นแนะนำ:</h4>
        <div className="presets-grid">
          {Object.entries(presets).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handlePresetLoad(key)}
              className="preset-button"
            >
              <Copy className="w-4 h-4 mr-2" />
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs-header">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            const isEnabled = formSpecs[tab.id].required;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button ${isActive ? 'active' : ''} ${isEnabled ? 'enabled' : ''}`}
              >
                <IconComponent className="w-4 h-4" />
                <div className="tab-content">
                  <span className="tab-label">{tab.label}</span>
                  <span className="tab-description">{tab.description}</span>
                </div>
                {isEnabled && <CheckCircle className="w-3 h-3 enabled-indicator" />}
              </button>
            );
          })}
        </div>

        <div className="tab-content-area">
          {renderCurrentTab()}
        </div>
      </div>

      {/* Preview Summary */}
      <div className="preview-summary">
        <h4>สรุปการกำหนดค่า</h4>
        <div className="summary-grid">
          {Object.entries(formSpecs).map(([key, spec]) => (
            <div key={key} className={`summary-item ${spec.required ? 'enabled' : 'disabled'}`}>
              <div className="summary-header">
                <span className="summary-title">
                  {tabs.find(tab => tab.id === key)?.label}
                </span>
                <span className={`summary-status ${spec.required ? 'enabled' : 'disabled'}`}>
                  {spec.required ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                </span>
              </div>
              {spec.required && (
                <div className="summary-details">
                  {(key === 'odCheck' || key === 'lengthCheck') && (
                    <p>ช่วง: {spec.minValue}-{spec.maxValue} ±{spec.tolerance} {spec.unit}</p>
                  )}
                  {key === 'visualInspection' && (
                    <p>ตรวจสอบ: {[
                      spec.checkCracks && 'รอยแตก',
                      spec.checkGrinding && 'รอยเจียร์',
                      spec.checkBurr && 'ครีบสูง',
                      spec.checkSurfaceFinish && 'ผิวหน้า'
                    ].filter(Boolean).join(', ')}</p>
                  )}
                  {key === 'packagingCheck' && (
                    <p>ตรวจสอบ: {[
                      spec.checkCondition && 'สภาพบรรจุภัณฑ์',
                      spec.checkLabeling && 'ฉลาก',
                      spec.checkProtection && 'การป้องกัน'
                    ].filter(Boolean).join(', ')}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        <div className="actions-left">
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-outline"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            รีเซ็ต
          </button>
        </div>
        
        <div className="actions-right">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
          >
            <X className="w-4 h-4 mr-2" />
            ยกเลิก
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
          >
            <Save className="w-4 h-4 mr-2" />
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>

      <style jsx>{`
        .inspection-spec-form {
          max-width: 1200px;
          margin: 0 auto;
        }

        .form-header {
          margin-bottom: 24px;
          text-align: center;
        }

        .form-header h3 {
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .form-description {
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
        }

        .presets-section {
          margin-bottom: 32px;
          padding: 20px;
          background: #f0f9ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
        }

        .presets-section h4 {
          font-size: 16px;
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 12px;
        }

        .presets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .preset-button {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: white;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
          font-weight: 500;
          color: #1e40af;
        }

        .preset-button:hover {
          background: #dbeafe;
          border-color: #3b82f6;
        }

        .tabs-container {
          background: white;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .tabs-header {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border-bottom: 1px solid #e5e7eb;
        }

        .tab-button {
          padding: 16px;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          border-right: 1px solid #e5e7eb;
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tab-button:last-child {
          border-right: none;
        }

        .tab-button.active {
          background: #f8fafc;
          border-bottom: 2px solid #3b82f6;
        }

        .tab-button.enabled {
          color: #059669;
        }

        .tab-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          flex: 1;
        }

        .tab-label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .tab-description {
          font-size: 12px;
          color: #6b7280;
        }

        .enabled-indicator {
          color: #059669;
        }

        .tab-content-area {
          padding: 24px;
        }

        .spec-form-section {
          margin-bottom: 32px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .section-title h4 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .toggle-switch {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .toggle-switch input[type="checkbox"] {
          display: none;
        }

        .slider {
          width: 40px;
          height: 20px;
          background-color: #d1d5db;
          border-radius: 20px;
          position: relative;
          transition: background-color 0.3s ease;
        }

        .slider::before {
          content: '';
          position: absolute;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background-color: white;
          top: 2px;
          left: 2px;
          transition: transform 0.3s ease;
        }

        .toggle-switch input[type="checkbox"]:checked + .slider {
          background-color: #3b82f6;
        }

        .toggle-switch input[type="checkbox"]:checked + .slider::before {
          transform: translateX(20px);
        }

        .toggle-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .spec-form-content {
          margin-top: 20px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }

        .form-group input,
        .form-group select {
          padding: 10px 12px;
          border: 2px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s ease;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group input.error {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
          font-size: 12px;
          color: #ef4444;
        }

        .checkbox-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .checkbox-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .checkbox-item:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .checkbox-item input[type="checkbox"] {
          margin-top: 2px;
        }

        .checkbox-content {
          display: flex;
          flex-direction: column;
        }

        .checkbox-title {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 2px;
        }

        .checkbox-description {
          font-size: 12px;
          color: #6b7280;
          line-height: 1.4;
        }

        .spec-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #f0f9ff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          font-size: 14px;
        }

        .spec-info p {
          margin: 0;
          color: #1e40af;
        }

        .preview-summary {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .preview-summary h4 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 16px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 12px;
        }

        .summary-item {
          background: white;
          border-radius: 6px;
          padding: 12px;
          border: 1px solid #e5e7eb;
        }

        .summary-item.enabled {
          border-color: #10b981;
          background: #ecfdf5;
        }

        .summary-item.disabled {
          opacity: 0.6;
        }

        .summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .summary-title {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .summary-status {
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .summary-status.enabled {
          background: #dcfce7;
          color: #166534;
        }

        .summary-status.disabled {
          background: #f3f4f6;
          color: #6b7280;
        }

        .summary-details {
          font-size: 12px;
          color: #6b7280;
        }

        .summary-details p {
          margin: 0;
          line-height: 1.4;
        }

        .form-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .actions-left,
        .actions-right {
          display: flex;
          gap: 12px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
        }

        .btn-secondary:hover {
          background: #4b5563;
        }

        .btn-outline {
          background: transparent;
          color: #6b7280;
          border-color: #d1d5db;
        }

        .btn-outline:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        @media (max-width: 768px) {
          .tabs-header {
            grid-template-columns: 1fr 1fr;
          }
          
          .form-grid {
            grid-template-columns: 1fr;
          }
          
          .checkbox-grid {
            grid-template-columns: 1fr;
          }
          
          .summary-grid {
            grid-template-columns: 1fr;
          }
          
          .presets-grid {
            grid-template-columns: 1fr;
          }
          
          .form-actions {
            flex-direction: column;
            gap: 12px;
          }
          
          .actions-left,
          .actions-right {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default InspectionSpecForm;