// components/ui/TemplateSelector.js - Template Selection Component
import React, { useState } from 'react';
import { 
  FileTemplate, Check, Search, Filter, Package, 
  Ruler, Eye, FileText, X, Plus, Edit3 ,FileImage
} from 'lucide-react';

const TemplateSelector = ({ templates, onSelect, onCancel, onCreateNew, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterialType, setSelectedMaterialType] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const materialTypes = [
    { value: 'all', label: 'ทุกประเภท' },
    { value: 'steel_bar', label: 'เหล็กเส้น' },
    { value: 'steel_pipe', label: 'เหล็กท่อน' },
    { value: 'hardened_work', label: 'งานชุบแข็ง' }
  ];

  // Filter templates based on search and material type
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.materialGrade.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedMaterialType === 'all' || template.materialType === selectedMaterialType;
    return matchesSearch && matchesType;
  });

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleConfirmSelection = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate.id);
    }
  };

  const getMaterialTypeLabel = (type) => {
    const typeObj = materialTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  const formatSpecValue = (value, unit = '') => {
    return `${value}${unit ? ' ' + unit : ''}`;
  };

  const getSpecStatusIcon = (required) => {
    return required ? (
      <Check className="w-4 h-4 text-green-500" />
    ) : (
      <X className="w-4 h-4 text-gray-400" />
    );
  };

  return (
    <div className="template-selector">
      <div className="selector-header">
        <h3>เลือกแม่แบบการตรวจสอบ</h3>
        <p className="header-description">
          เลือกแม่แบบที่เหมาะสมกับประเภทวัสดุที่ต้องการตรวจสอบ
        </p>
      </div>

      {/* Search and Filter */}
      <div className="filter-section">
        <div className="search-box">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาแม่แบบ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-dropdown">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={selectedMaterialType}
            onChange={(e) => setSelectedMaterialType(e.target.value)}
          >
            {materialTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="btn btn-outline btn-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            สร้างแม่แบบใหม่
          </button>
        )}
      </div>

      {/* Templates Grid */}
      <div className="templates-grid">
        {filteredTemplates.length === 0 ? (
          <div className="no-templates">
            <FileImage className="w-12 h-12 text-gray-300 mb-4" />
            <h4>ไม่พบแม่แบบที่ตรงกับเงื่อนไข</h4>
            <p>ลองเปลี่ยนคำค้นหาหรือประเภทวัสดุ</p>
          </div>
        ) : (
          filteredTemplates.map(template => (
            <div
              key={template.id}
              className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
              onClick={() => handleTemplateSelect(template)}
            >
              <div className="template-header">
                <div className="template-info">
                  <h4>{template.name}</h4>
                  <div className="template-meta">
                    <span className="material-type">
                      <Package className="w-3 h-3 mr-1" />
                      {getMaterialTypeLabel(template.materialType)}
                    </span>
                    <span className="material-grade">
                      {template.materialGrade}
                    </span>
                  </div>
                </div>
                
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(template);
                    }}
                    className="edit-btn"
                    title="แก้ไขแม่แบบ"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="template-specs">
                <div className="spec-item">
                  <Ruler className="w-3 h-3 mr-1" />
                  <span>OD Check</span>
                  {getSpecStatusIcon(template.specs.odCheck?.required)}
                </div>
                
                <div className="spec-item">
                  <Ruler className="w-3 h-3 mr-1" />
                  <span>Length Check</span>
                  {getSpecStatusIcon(template.specs.lengthCheck?.required)}
                </div>
                
                <div className="spec-item">
                  <Eye className="w-3 h-3 mr-1" />
                  <span>Visual Inspection</span>
                  {getSpecStatusIcon(template.specs.visualInspection?.required)}
                </div>
                
                <div className="spec-item">
                  <Package className="w-3 h-3 mr-1" />
                  <span>Packaging Check</span>
                  {getSpecStatusIcon(template.specs.packagingCheck?.required)}
                </div>
              </div>

              {template.description && (
                <div className="template-description">
                  <p>{template.description}</p>
                </div>
              )}

              <div className="template-footer">
                <span className="created-info">
                  สร้างเมื่อ: {new Date(template.createdAt || Date.now()).toLocaleDateString('th-TH')}
                </span>
                {selectedTemplate?.id === template.id && (
                  <div className="selected-indicator">
                    <Check className="w-4 h-4 text-white" />
                    เลือกแล้ว
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Template Preview */}
      {showPreview && selectedTemplate && (
        <div className="template-preview">
          <h4>รายละเอียดแม่แบบ: {selectedTemplate.name}</h4>
          
          <div className="preview-grid">
            <div className="preview-section">
              <h5>ข้อมูลทั่วไป</h5>
              <div className="preview-items">
                <div className="preview-item">
                  <span className="label">ประเภทวัสดุ:</span>
                  <span className="value">{getMaterialTypeLabel(selectedTemplate.materialType)}</span>
                </div>
                <div className="preview-item">
                  <span className="label">เกรดวัสดุ:</span>
                  <span className="value">{selectedTemplate.materialGrade}</span>
                </div>
              </div>
            </div>

            {/* OD Check Specs */}
            {selectedTemplate.specs.odCheck?.required && (
              <div className="preview-section">
                <h5>
                  <Ruler className="w-4 h-4 mr-1" />
                  การตรวจสอบ OD
                </h5>
                <div className="preview-items">
                  <div className="preview-item">
                    <span className="label">ช่วงค่า:</span>
                    <span className="value">
                      {formatSpecValue(selectedTemplate.specs.odCheck.minValue, selectedTemplate.specs.odCheck.unit)} - 
                      {formatSpecValue(selectedTemplate.specs.odCheck.maxValue, selectedTemplate.specs.odCheck.unit)}
                    </span>
                  </div>
                  <div className="preview-item">
                    <span className="label">ค่าเผื่อ:</span>
                    <span className="value">
                      ±{formatSpecValue(selectedTemplate.specs.odCheck.tolerance, selectedTemplate.specs.odCheck.unit)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Length Check Specs */}
            {selectedTemplate.specs.lengthCheck?.required && (
              <div className="preview-section">
                <h5>
                  <Ruler className="w-4 h-4 mr-1" />
                  การตรวจสอบความยาว
                </h5>
                <div className="preview-items">
                  <div className="preview-item">
                    <span className="label">ช่วงค่า:</span>
                    <span className="value">
                      {formatSpecValue(selectedTemplate.specs.lengthCheck.minValue, selectedTemplate.specs.lengthCheck.unit)} - 
                      {formatSpecValue(selectedTemplate.specs.lengthCheck.maxValue, selectedTemplate.specs.lengthCheck.unit)}
                    </span>
                  </div>
                  <div className="preview-item">
                    <span className="label">ค่าเผื่อ:</span>
                    <span className="value">
                      ±{formatSpecValue(selectedTemplate.specs.lengthCheck.tolerance, selectedTemplate.specs.lengthCheck.unit)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Visual Inspection Specs */}
            {selectedTemplate.specs.visualInspection?.required && (
              <div className="preview-section">
                <h5>
                  <Eye className="w-4 h-4 mr-1" />
                  การตรวจสอบภายนอก
                </h5>
                <div className="preview-items">
                  <div className="checkbox-grid">
                    <div className="checkbox-item">
                      <input type="checkbox" checked={selectedTemplate.specs.visualInspection.checkCracks} readOnly />
                      <span>ตรวจรอยแตก</span>
                    </div>
                    <div className="checkbox-item">
                      <input type="checkbox" checked={selectedTemplate.specs.visualInspection.checkGrinding} readOnly />
                      <span>ตรวจรอยเจียร์</span>
                    </div>
                    <div className="checkbox-item">
                      <input type="checkbox" checked={selectedTemplate.specs.visualInspection.checkBurr} readOnly />
                      <span>ตรวจครีบสูง</span>
                    </div>
                    <div className="checkbox-item">
                      <input type="checkbox" checked={selectedTemplate.specs.visualInspection.checkSurfaceFinish} readOnly />
                      <span>ตรวจผิวหน้า</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Packaging Check Specs */}
            {selectedTemplate.specs.packagingCheck?.required && (
              <div className="preview-section">
                <h5>
                  <Package className="w-4 h-4 mr-1" />
                  การตรวจสอบบรรจุภัณฑ์
                </h5>
                <div className="preview-items">
                  <div className="checkbox-grid">
                    <div className="checkbox-item">
                      <input type="checkbox" checked={selectedTemplate.specs.packagingCheck.checkCondition} readOnly />
                      <span>ตรวจสภาพบรรจุภัณฑ์</span>
                    </div>
                    <div className="checkbox-item">
                      <input type="checkbox" checked={selectedTemplate.specs.packagingCheck.checkLabeling} readOnly />
                      <span>ตรวจฉลาก</span>
                    </div>
                    <div className="checkbox-item">
                      <input type="checkbox" checked={selectedTemplate.specs.packagingCheck.checkProtection} readOnly />
                      <span>ตรวจการป้องกัน</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="form-actions">
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
          onClick={handleConfirmSelection}
          className="btn btn-primary"
          disabled={!selectedTemplate}
        >
          <Check className="w-4 h-4 mr-2" />
          ใช้แม่แบบนี้
        </button>
      </div>

      <style jsx>{`
        .template-selector {
          max-width: 1000px;
          margin: 0 auto;
        }

        .selector-header {
          margin-bottom: 24px;
          text-align: center;
        }

        .selector-header h3 {
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .header-description {
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
        }

        .filter-section {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          flex: 1;
          min-width: 200px;
        }

        .search-box input {
          width: 100%;
          padding: 12px 16px 12px 40px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s ease;
        }

        .search-box input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-box svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
        }

        .filter-dropdown {
          position: relative;
          display: flex;
          align-items: center;
        }

        .filter-dropdown select {
          padding: 12px 16px 12px 40px;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          background: white;
          cursor: pointer;
        }

        .filter-dropdown svg {
          position: absolute;
          left: 12px;
          z-index: 1;
        }

        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .no-templates {
          grid-column: 1 / -1;
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }

        .no-templates h4 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #374151;
        }

        .template-card {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }

        .template-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
          transform: translateY(-2px);
        }

        .template-card.selected {
          border-color: #10b981;
          background: #ecfdf5;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .template-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .template-info h4 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .template-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .material-type,
        .material-grade {
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 500;
        }

        .material-type {
          background: #dbeafe;
          color: #1e40af;
        }

        .material-grade {
          background: #f3f4f6;
          color: #374151;
        }

        .edit-btn {
          padding: 6px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .edit-btn:hover {
          background: #f9fafb;
          color: #374151;
        }

        .template-specs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 16px;
        }

        .spec-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #6b7280;
        }

        .template-description {
          margin-bottom: 12px;
        }

        .template-description p {
          font-size: 14px;
          color: #6b7280;
          line-height: 1.5;
          margin: 0;
        }

        .template-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #9ca3af;
        }

        .selected-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #10b981;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 500;
        }

        .template-preview {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .template-preview h4 {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 20px;
        }

        .preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .preview-section {
          background: white;
          border-radius: 8px;
          padding: 16px;
        }

        .preview-section h5 {
          display: flex;
          align-items: center;
          font-size: 16px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
        }

        .preview-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .preview-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }

        .preview-item .label {
          color: #6b7280;
          font-weight: 500;
        }

        .preview-item .value {
          color: #1f2937;
          font-weight: 600;
        }

        .checkbox-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #374151;
        }

        .checkbox-item input[type="checkbox"] {
          margin: 0;
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

        .btn-outline {
          background: transparent;
          color: #3b82f6;
          border-color: #3b82f6;
        }

        .btn-outline:hover:not(:disabled) {
          background: #3b82f6;
          color: white;
        }

        .btn-sm {
          padding: 8px 16px;
          font-size: 12px;
        }

        @media (max-width: 768px) {
          .templates-grid {
            grid-template-columns: 1fr;
          }
          
          .filter-section {
            flex-direction: column;
            align-items: stretch;
          }
          
          .template-specs {
            grid-template-columns: 1fr;
          }
          
          .preview-grid {
            grid-template-columns: 1fr;
          }
          
          .checkbox-grid {
            grid-template-columns: 1fr;
          }
          
          .form-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default TemplateSelector;