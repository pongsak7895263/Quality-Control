// components/forms/QuickCreateForm.js - Quick Create Inspection Form
import React, { useState } from 'react';
import { Save, X, AlertCircle, Package, User, Hash, Calendar } from 'lucide-react';

const QuickCreateForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    materialGrade: '',
    supplierName: '',
    receivedQuantity: '',
    receivedDate: new Date().toISOString().split('T')[0],
    materialType: 'steel_bar',
    priority: 'normal',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const materialTypes = [
    { value: 'steel_bar', label: 'เหล็กเส้น' },
    { value: 'steel_pipe', label: 'เหล็กท่อน' },
    { value: 'hardened_work', label: 'งานชุบแข็ง' }
  ];

  const priorityLevels = [
    { value: 'low', label: '🟢 ต่ำ', color: 'green' },
    { value: 'normal', label: '🟡 ปกติ', color: 'yellow' },
    { value: 'high', label: '🟠 สูง', color: 'orange' },
    { value: 'urgent', label: '🔴 เร่งด่วน', color: 'red' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.materialGrade.trim()) {
      newErrors.materialGrade = 'เกรดวัสดุจำเป็นต้องระบุ';
    }

    if (!formData.supplierName.trim()) {
      newErrors.supplierName = 'ชื่อผู้จำหน่ายจำเป็นต้องระบุ';
    }

    if (!formData.receivedQuantity || formData.receivedQuantity <= 0) {
      newErrors.receivedQuantity = 'ปริมาณที่รับต้องมากกว่า 0';
    }

    if (!formData.receivedDate) {
      newErrors.receivedDate = 'วันที่รับจำเป็นต้องระบุ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Quick create failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="quick-create-form">
      <div className="form-header">
        <h3>สร้างใบตรวจรับด่วน</h3>
        <p className="form-description">
          กรอกข้อมูลเฉพาะที่จำเป็น ระบบจะสร้างหมายเลข Lot และ Batch อัตโนมัติ
        </p>
      </div>

      <form onSubmit={handleSubmit} className="quick-form">
        <div className="form-grid">
          {/* Material Grade */}
          <div className="form-group">
            <label className="required">
              <Package className="w-4 h-4 mr-2" />
              เกรดวัสดุ
            </label>
            <input
              type="text"
              value={formData.materialGrade}
              onChange={(e) => handleInputChange('materialGrade', e.target.value)}
              className={errors.materialGrade ? 'error' : ''}
              placeholder="เช่น SS400, A36, SCM440"
              autoFocus
            />
            {errors.materialGrade && (
              <span className="error-message">
                <AlertCircle className="w-4 h-4" />
                {errors.materialGrade}
              </span>
            )}
          </div>

          {/* Supplier Name */}
          <div className="form-group">
            <label className="required">
              <User className="w-4 h-4 mr-2" />
              ผู้จำหน่าย
            </label>
            <input
              type="text"
              value={formData.supplierName}
              onChange={(e) => handleInputChange('supplierName', e.target.value)}
              className={errors.supplierName ? 'error' : ''}
              placeholder="ชื่อบริษัทผู้จำหน่าย"
            />
            {errors.supplierName && (
              <span className="error-message">
                <AlertCircle className="w-4 h-4" />
                {errors.supplierName}
              </span>
            )}
          </div>

          {/* Material Type */}
          <div className="form-group">
            <label>
              <Hash className="w-4 h-4 mr-2" />
              ประเภทวัสดุ
            </label>
            <select
              value={formData.materialType}
              onChange={(e) => handleInputChange('materialType', e.target.value)}
            >
              {materialTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Received Quantity */}
          <div className="form-group">
            <label className="required">
              <Package className="w-4 h-4 mr-2" />
              ปริมาณที่รับ (กก.)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.receivedQuantity}
              onChange={(e) => handleInputChange('receivedQuantity', parseFloat(e.target.value))}
              className={errors.receivedQuantity ? 'error' : ''}
              placeholder="น้ำหนักในหน่วยกิโลกรัม"
            />
            {errors.receivedQuantity && (
              <span className="error-message">
                <AlertCircle className="w-4 h-4" />
                {errors.receivedQuantity}
              </span>
            )}
          </div>

          {/* Received Date */}
          <div className="form-group">
            <label className="required">
              <Calendar className="w-4 h-4 mr-2" />
              วันที่รับวัสดุ
            </label>
            <input
              type="date"
              value={formData.receivedDate}
              onChange={(e) => handleInputChange('receivedDate', e.target.value)}
              className={errors.receivedDate ? 'error' : ''}
            />
            {errors.receivedDate && (
              <span className="error-message">
                <AlertCircle className="w-4 h-4" />
                {errors.receivedDate}
              </span>
            )}
          </div>

          {/* Priority */}
          <div className="form-group">
            <label>ความสำคัญ</label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
            >
              {priorityLevels.map(priority => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div className="form-group full-width">
          <label>หมายเหตุ (ไม่บังคับ)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            placeholder="หมายเหตุเพิ่มเติมเกี่ยวกับวัสดุนี้..."
          />
        </div>

        {/* Auto-generated Info */}
        <div className="auto-info">
          <h4>ข้อมูลที่สร้างอัตโนมัติ</h4>
          <div className="auto-info-grid">
            <div className="auto-info-item">
              <span className="label">หมายเลข Lot:</span>
              <span className="value">LOT-{Date.now()}</span>
            </div>
            <div className="auto-info-item">
              <span className="label">หมายเลข Batch:</span>
              <span className="value">B-{Date.now()}</span>
            </div>
            <div className="auto-info-item">
              <span className="label">สถานะ:</span>
              <span className="value status pending">รอตรวจสอบ</span>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={submitting}
          >
            <X className="w-4 h-4 mr-2" />
            ยกเลิก
          </button>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            <Save className="w-4 h-4 mr-2" />
            {submitting ? 'กำลังสร้าง...' : 'สร้างใบตรวจรับ'}
          </button>
        </div>
      </form>

      <style jsx>{`
        .quick-create-form {
          max-width: 800px;
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

        .quick-form {
          background: #f8fafc;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #e2e8f0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          display: flex;
          align-items: center;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .form-group label.required::after {
          content: ' *';
          color: #ef4444;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 12px 16px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s ease;
          background: white;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group input.error,
        .form-group select.error,
        .form-group textarea.error {
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

        .auto-info {
          margin-bottom: 24px;
          padding: 16px;
          background: #f0f9ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
        }

        .auto-info h4 {
          font-size: 16px;
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 12px;
        }

        .auto-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .auto-info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }

        .auto-info-item .label {
          color: #64748b;
          font-weight: 500;
        }

        .auto-info-item .value {
          font-weight: 600;
          color: #1e293b;
        }

        .auto-info-item .value.status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .auto-info-item .value.status.pending {
          background: #fef3c7;
          color: #d97706;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
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

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #4b5563;
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          
          .form-actions {
            flex-direction: column;
          }
          
          .auto-info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default QuickCreateForm;