// components/forms/BulkImportForm.js - Bulk Import Inspection Form
import React, { useState, useRef } from 'react';
import { 
  Upload, Download, FileText, AlertCircle, CheckCircle, 
  X, FileSpreadsheet, FileUp, Info, RotateCcw 
} from 'lucide-react';

const BulkImportForm = ({ onImport, onCancel }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // CSV Template structure
  const csvTemplate = [
    'materialGrade,supplierName,receivedQuantity,receivedDate,materialType,lotNumber,notes',
    'SS400,บริษัท เหล็กกล้า จำกัด,1500.5,2024-01-15,steel_bar,LOT-001,เหล็กเส้นคุณภาพดี',
    'A36,บริษัท โลหะคุณภาพ จำกัด,2200.0,2024-01-16,steel_pipe,LOT-002,เหล็กท่อนมาตรฐาน',
    'SCM440,บริษัท ชุบแข็งไทย จำกัด,850.0,2024-01-17,hardened_work,LOT-003,งานชุบแข็งพิเศษ'
  ].join('\n');

  const requiredFields = [
    { field: 'materialGrade', label: 'เกรดวัสดุ' },
    { field: 'supplierName', label: 'ผู้จำหน่าย' },
    { field: 'receivedQuantity', label: 'ปริมาณที่รับ' },
    { field: 'receivedDate', label: 'วันที่รับ' },
    { field: 'materialType', label: 'ประเภทวัสดุ' }
  ];

  const acceptedFormats = [
    { ext: '.csv', mime: 'text/csv', icon: FileText },
    { ext: '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', icon: FileSpreadsheet },
    { ext: '.xls', mime: 'application/vnd.ms-excel', icon: FileSpreadsheet }
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = async (file) => {
    // Validate file type
    const validTypes = acceptedFormats.map(format => format.mime);
    if (!validTypes.includes(file.type)) {
      alert('รูปแบบไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์ CSV หรือ Excel');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('ขนาดไฟล์ใหญ่เกินไป (สูงสุด 10MB)');
      return;
    }

    setSelectedFile(file);
    await validateFile(file);
  };

  const validateFile = async (file) => {
    try {
      // Mock validation - in real app, send to server for validation
      const formData = new FormData();
      formData.append('file', file);
      
      // Simulate validation process
      setTimeout(() => {
        // Mock validation results
        const mockResults = {
          totalRows: 125,
          validRows: 120,
          invalidRows: 5,
          errors: [
            { row: 15, field: 'receivedQuantity', message: 'ปริมาณต้องเป็นตัวเลข' },
            { row: 23, field: 'materialType', message: 'ประเภทวัสดุไม่ถูกต้อง' },
            { row: 45, field: 'supplierName', message: 'ชื่อผู้จำหน่ายจำเป็นต้องระบุ' },
            { row: 67, field: 'receivedDate', message: 'รูปแบบวันที่ไม่ถูกต้อง' },
            { row: 89, field: 'materialGrade', message: 'เกรดวัสดุจำเป็นต้องระบุ' }
          ],
          warnings: [
            { row: 30, field: 'lotNumber', message: 'หมายเลข Lot ซ้ำ จะสร้างใหม่อัตโนมัติ' },
            { row: 55, field: 'notes', message: 'ไม่มีหมายเหตุ' }
          ]
        };
        setValidationResults(mockResults);
      }, 1500);
    } catch (error) {
      console.error('Validation failed:', error);
      alert('การตรวจสอบไฟล์ล้มเหลว');
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    try {
      await onImport(selectedFile);
      // Reset form on success
      setSelectedFile(null);
      setValidationResults(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'inspection_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setValidationResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bulk-import-form">
      <div className="form-header">
        <h3>นำเข้าข้อมูลการตรวจสอบแบบกลุ่ม</h3>
        <p className="form-description">
          อัปโหลดไฟล์ CSV หรือ Excel เพื่อสร้างการตรวจสอบหลายรายการพร้อมกัน
        </p>
      </div>

      {/* Template Download Section */}
      <div className="template-section">
        <div className="template-info">
          <Info className="w-5 h-5 text-blue-500" />
          <div>
            <h4>ดาวน์โหลดแม่แบบไฟล์นำเข้า</h4>
            <p>ใช้แม่แบบนี้เพื่อให้แน่ใจว่าข้อมูลมีรูปแบบที่ถูกต้อง</p>
          </div>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="btn btn-outline"
        >
          <Download className="w-4 h-4 mr-2" />
          ดาวน์โหลดแม่แบบ CSV
        </button>
      </div>

      {/* Required Fields Info */}
      <div className="required-fields">
        <h4>ฟิลด์ที่จำเป็นต้องมี:</h4>
        <div className="fields-grid">
          {requiredFields.map((field, index) => (
            <div key={index} className="field-item">
              <span className="field-name">{field.field}</span>
              <span className="field-label">{field.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* File Upload Area */}
      <div 
        className={`file-upload-area ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />

        {!selectedFile ? (
          <div className="upload-content">
            <FileUp className="w-12 h-12 text-gray-400 mb-4" />
            <h3>ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</h3>
            <p>รองรับไฟล์: CSV, Excel (.xlsx, .xls)</p>
            <p>ขนาดไฟล์สูงสุด: 10MB</p>
          </div>
        ) : (
          <div className="file-info">
            <div className="file-details">
              <FileText className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <h4>{selectedFile.name}</h4>
                <p>ขนาด: {(selectedFile.size / 1024).toFixed(1)} KB</p>
                <p>ประเภท: {selectedFile.type}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetForm();
              }}
              className="btn btn-sm btn-outline"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              เลือกไฟล์ใหม่
            </button>
          </div>
        )}
      </div>

      {/* Validation Results */}
      {validationResults && (
        <div className="validation-results">
          <h4>ผลการตรวจสอบไฟล์</h4>
          
          <div className="validation-summary">
            <div className="summary-item success">
              <CheckCircle className="w-5 h-5" />
              <span>แถวที่ถูกต้อง: {validationResults.validRows}/{validationResults.totalRows}</span>
            </div>
            
            {validationResults.invalidRows > 0 && (
              <div className="summary-item error">
                <AlertCircle className="w-5 h-5" />
                <span>แถวที่มีข้อผิดพลาด: {validationResults.invalidRows}</span>
              </div>
            )}
            
            {validationResults.warnings.length > 0 && (
              <div className="summary-item warning">
                <Info className="w-5 h-5" />
                <span>คำเตือน: {validationResults.warnings.length} รายการ</span>
              </div>
            )}
          </div>

          {/* Errors */}
          {validationResults.errors.length > 0 && (
            <div className="validation-errors">
              <h5>ข้อผิดพลาดที่ต้องแก้ไข:</h5>
              <div className="error-list">
                {validationResults.errors.map((error, index) => (
                  <div key={index} className="error-item">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span>แถว {error.row}: {error.message} ({error.field})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {validationResults.warnings.length > 0 && (
            <div className="validation-warnings">
              <h5>คำเตือน:</h5>
              <div className="warning-list">
                {validationResults.warnings.map((warning, index) => (
                  <div key={index} className="warning-item">
                    <Info className="w-4 h-4 text-yellow-500" />
                    <span>แถว {warning.row}: {warning.message} ({warning.field})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Accepted Formats */}
      <div className="accepted-formats">
        <h4>รูปแบบไฟล์ที่รองรับ:</h4>
        <div className="formats-list">
          {acceptedFormats.map((format, index) => {
            const IconComponent = format.icon;
            return (
              <div key={index} className="format-item">
                <IconComponent className="w-5 h-5 text-gray-500" />
                <span>{format.ext}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={importing}
        >
          <X className="w-4 h-4 mr-2" />
          ยกเลิก
        </button>
        
        <button
          type="button"
          onClick={handleImport}
          className="btn btn-primary"
          disabled={!selectedFile || importing || (validationResults?.invalidRows > 0)}
        >
          <Upload className="w-4 h-4 mr-2" />
          {importing ? 'กำลังนำเข้า...' : `นำเข้าข้อมูล ${validationResults?.validRows || 0} รายการ`}
        </button>
      </div>

      <style jsx>{`
        .bulk-import-form {
          max-width: 900px;
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

        .template-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f0f9ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .template-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .template-info h4 {
          font-size: 16px;
          font-weight: 600;
          color: #1e40af;
          margin: 0;
        }

        .template-info p {
          font-size: 14px;
          color: #3730a3;
          margin: 0;
        }

        .required-fields {
          margin-bottom: 24px;
          padding: 16px;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 8px;
        }

        .required-fields h4 {
          font-size: 16px;
          font-weight: 600;
          color: #92400e;
          margin-bottom: 12px;
        }

        .fields-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 8px;
        }

        .field-item {
          display: flex;
          flex-direction: column;
          font-size: 14px;
        }

        .field-name {
          font-family: monospace;
          font-weight: 600;
          color: #1f2937;
        }

        .field-label {
          color: #6b7280;
          font-size: 12px;
        }

        .file-upload-area {
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #fafafa;
          margin-bottom: 24px;
        }

        .file-upload-area:hover {
          border-color: #3b82f6;
          background: #f0f9ff;
        }

        .file-upload-area.drag-active {
          border-color: #10b981;
          background: #ecfdf5;
        }

        .file-upload-area.has-file {
          background: #f8fafc;
          border-color: #3b82f6;
        }

        .upload-content h3 {
          font-size: 18px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .upload-content p {
          color: #6b7280;
          margin: 4px 0;
        }

        .file-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .file-details {
          display: flex;
          align-items: center;
          text-align: left;
        }

        .file-details h4 {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 4px 0;
        }

        .file-details p {
          font-size: 14px;
          color: #6b7280;
          margin: 2px 0;
        }

        .validation-results {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .validation-results h4 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 16px;
        }

        .validation-summary {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .summary-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
        }

        .summary-item.success {
          color: #059669;
        }

        .summary-item.error {
          color: #dc2626;
        }

        .summary-item.warning {
          color: #d97706;
        }

        .validation-errors,
        .validation-warnings {
          margin-bottom: 16px;
        }

        .validation-errors h5,
        .validation-warnings h5 {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .validation-errors h5 {
          color: #dc2626;
        }

        .validation-warnings h5 {
          color: #d97706;
        }

        .error-list,
        .warning-list {
          max-height: 200px;
          overflow-y: auto;
        }

        .error-item,
        .warning-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          margin-bottom: 4px;
          background: white;
          border-radius: 4px;
          font-size: 14px;
        }

        .accepted-formats {
          margin-bottom: 24px;
        }

        .accepted-formats h4 {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
        }

        .formats-list {
          display: flex;
          gap: 16px;
        }

        .format-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 14px;
          color: #6b7280;
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
          .template-section {
            flex-direction: column;
            gap: 12px;
          }
          
          .validation-summary {
            flex-direction: column;
            gap: 8px;
          }
          
          .form-actions {
            flex-direction: column;
          }
          
          .file-info {
            flex-direction: column;
            gap: 12px;
          }
          
          .formats-list {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
};

export default BulkImportForm;