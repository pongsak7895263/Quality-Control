// utils/calculations.js
// Utility functions for calculations, QR Code generation, and PDF export

// Generate QR Code (you'll need to install qrcode library: npm install qrcode)
export const generateQRCode = (data) => {
    try {
      // For production, use actual QR code library
      // import QRCode from 'qrcode';
      // return QRCode.toDataURL(JSON.stringify(data));
      
      // Mock QR code for development
      const qrString = JSON.stringify(data);
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      
      // Simple placeholder QR code
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.fillText('QR Code', 10, 100);
      ctx.fillText(data.id || data.testId, 10, 120);
      
      return canvas.toDataURL();
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  };
  
  // Export to PDF (you'll need to install jspdf library: npm install jspdf)
  export const exportToPDF = (data, type) => {
    try {
      // For production, use actual PDF library
      // import jsPDF from 'jspdf';
      // const doc = new jsPDF();
      
      // Mock PDF export for development
      const printWindow = window.open('', '_blank');
      let htmlContent = '';
      
      if (type === 'material-inspection') {
        htmlContent = generateMaterialInspectionPDF(data);
      } else if (type === 'chemical-test') {
        htmlContent = generateChemicalTestPDF(data);
      }
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF');
    }
  };
  
  // Generate Material Inspection PDF content
  const generateMaterialInspectionPDF = (data) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ใบตรวจรับวัตถุดิบ - ${data.inspectionId}</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Sarabun', Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .section { margin: 20px 0; }
          .section h3 { background: #f0f0f0; padding: 10px; margin: 0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .info-item { margin: 5px 0; }
          .label { font-weight: bold; }
          .value { margin-left: 10px; }
          .status { padding: 5px 10px; border-radius: 3px; }
          .status.approved { background: #4CAF50; color: white; }
          .status.pending { background: #FF9800; color: white; }
          .status.rejected { background: #F44336; color: white; }
          .measurement-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .measurement-table th, .measurement-table td { 
            border: 1px solid #ddd; padding: 8px; text-align: center; 
          }
          .qr-code { text-align: center; margin: 20px 0; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ใบตรวจรับวัตถุดิบ</h1>
          <h2>Material Inspection Report</h2>
          <p>รหัส: ${data.inspectionId}</p>
        </div>
        
        <div class="section">
          <h3>ข้อมูลพื้นฐาน / Basic Information</h3>
          <div class="info-grid">
            <div>
              <div class="info-item">
                <span class="label">วันที่รับเข้า:</span>
                <span class="value">${formatDateThai(data.receivedDate)}</span>
              </div>
              <div class="info-item">
                <span class="label">Lot Number:</span>
                <span class="value">${data.lotNumber}</span>
              </div>
              <div class="info-item">
                <span class="label">Heat Number:</span>
                <span class="value">${data.heatNumber}</span>
              </div>
              <div class="info-item">
                <span class="label">ผู้จำหน่าย:</span>
                <span class="value">${data.supplier}</span>
              </div>
            </div>
            <div>
              <div class="info-item">
                <span class="label">ประเภทวัตถุดิบ:</span>
                <span class="value">${getMaterialTypeLabel(data.materialType)}</span>
              </div>
              <div class="info-item">
                <span class="label">เกรด:</span>
                <span class="value">${data.grade}</span>
              </div>
              <div class="info-item">
                <span class="label">OD (มม.):</span>
                <span class="value">${data.outerDiameter}</span>
              </div>
              <div class="info-item">
                <span class="label">ความยาว (มม.):</span>
                <span class="value">${data.length}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h3>การตรวจสอบขนาด / Dimensional Check</h3>
          <p><strong>เครื่องมือวัด:</strong> ${getToolLabel(data.measurementTool)}</p>
          <table class="measurement-table">
            <thead>
              <tr>
                <th>ตัวอย่าง</th>
                <th>OD (มม.)</th>
                <th>ความยาว (มม.)</th>
              </tr>
            </thead>
            <tbody>
              ${data.dimensionalCheck.odMeasurements.map((od, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${od || '-'}</td>
                  <td>${data.dimensionalCheck.lengthMeasurements[index] || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p><strong>ผลการตรวจสอบ:</strong> 
            <span class="status ${data.dimensionalCheck.results}">
              ${getResultLabel(data.dimensionalCheck.results)}
            </span>
          </p>
        </div>
        
        <div class="section">
          <h3>การตรวจสอบรูปร่างลักษณะ / Visual Inspection</h3>
          <div class="info-grid">
            <div>
              <div class="info-item">
                <span class="label">รูปร่างลักษณะทั่วไป:</span>
                <span class="value">${getAppearanceLabel(data.visualInspection.generalAppearance)}</span>
              </div>
              <div class="info-item">
                <span class="label">ไม่มีรอยแตก:</span>
                <span class="value">${data.visualInspection.noCracks ? '✓' : '✗'}</span>
              </div>
            </div>
            <div>
              <div class="info-item">
                <span class="label">ไม่มีรอยร้าว:</span>
                <span class="value">${data.visualInspection.noFissures ? '✓' : '✗'}</span>
              </div>
              <div class="info-item">
                <span class="label">การบรรจุ:</span>
                <span class="value">${getPackagingLabel(data.visualInspection.packaging)}</span>
              </div>
            </div>
          </div>
          ${data.visualInspection.notes ? `<p><strong>หมายเหตุ:</strong> ${data.visualInspection.notes}</p>` : ''}
        </div>
        
        <div class="section">
          <h3>การอนุมัติ / Approval</h3>
          <div class="info-grid">
            <div>
              <div class="info-item">
                <span class="label">ผู้ตรวจสอบ:</span>
                <span class="value">${data.inspectedBy}</span>
              </div>
              <div class="info-item">
                <span class="label">สถานะ:</span>
                <span class="status ${data.status}">${getStatusLabel(data.status)}</span>
              </div>
            </div>
            <div>
              ${data.approvedBy ? `
                <div class="info-item">
                  <span class="label">ผู้อนุมัติ:</span>
                  <span class="value">${data.approvedBy}</span>
                </div>
                <div class="info-item">
                  <span class="label">วันที่อนุมัติ:</span>
                  <span class="value">${formatDateThai(data.approvalDate)}</span>
                </div>
              ` : ''}
            </div>
          </div>
          ${data.remarks ? `<p><strong>ข้อสังเกต:</strong> ${data.remarks}</p>` : ''}
        </div>
        
        ${data.qrCode ? `
          <div class="qr-code">
            <h3>QR Code สำหรับการสอบย้อนกลับ</h3>
            <img src="${data.qrCode}" alt="QR Code" style="width: 150px; height: 150px;">
            <p>รหัส: ${data.inspectionId}</p>
          </div>
        ` : ''}
        
        <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #666;">
          <p>สร้างเมื่อ: ${formatDateThai(new Date().toISOString())}</p>
          <p>ระบบตรวจสอบคุณภาพในสายการผลิต</p>
        </div>
      </body>
      </html>
    `;
  };
  
  // Generate Chemical Test PDF content
  const generateChemicalTestPDF = (data) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>รายงานการทดสอบทางเคมี - ${data.testId}</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Sarabun', Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .section { margin: 20px 0; }
          .section h3 { background: #f0f0f0; padding: 10px; margin: 0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .info-item { margin: 5px 0; }
          .label { font-weight: bold; }
          .value { margin-left: 10px; }
          .chemical-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .chemical-table th, .chemical-table td { 
            border: 1px solid #ddd; padding: 8px; text-align: center; 
          }
          .pass { color: #4CAF50; font-weight: bold; }
          .fail { color: #F44336; font-weight: bold; }
          .status { padding: 5px 10px; border-radius: 3px; }
          .status.approved { background: #4CAF50; color: white; }
          .status.pending { background: #FF9800; color: white; }
          .status.rejected { background: #F44336; color: white; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>รายงานการทดสอบทางเคมี</h1>
          <h2>Chemical Test Report</h2>
          <p>รหัสการทดสอบ: ${data.testId}</p>
        </div>
        
        <div class="section">
          <h3>ข้อมูลการทดสอบ / Test Information</h3>
          <div class="info-grid">
            <div>
              <div class="info-item">
                <span class="label">วันที่ทดสอบ:</span>
                <span class="value">${formatDateThai(data.testDate)}</span>
              </div>
              <div class="info-item">
                <span class="label">Lot Number:</span>
                <span class="value">${data.lotNumber}</span>
              </div>
              <div class="info-item">
                <span class="label">Heat Number:</span>
                <span class="value">${data.heatNumber}</span>
              </div>
              <div class="info-item">
                <span class="label">มาตรฐาน:</span>
                <span class="value">JIS ${data.jisStandard}</span>
              </div>
            </div>
            <div>
              <div class="info-item">
                <span class="label">เกรด:</span>
                <span class="value">${data.grade}</span>
              </div>
              <div class="info-item">
                <span class="label">OD (มม.):</span>
                <span class="value">${data.outerDiameter}</span>
              </div>
              <div class="info-item">
                <span class="label">จำนวนตัวอย่าง:</span>
                <span class="value">${data.sampleCount}</span>
              </div>
              <div class="info-item">
                <span class="label">ผู้จำหน่าย:</span>
                <span class="value">${data.supplier}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h3>Chemical Composition (%)</h3>
          <table class="chemical-table">
            <thead>
              <tr>
                <th>Element</th>
                <th>Actual (%)</th>
                <th>JIS ${data.jisStandard} Limit</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(data.chemicalComposition)
                .filter(([element, value]) => value !== '')
                .map(([element, value]) => {
                  const limit = getJISLimit(data.jisStandard, element);
                  const isWithinLimit = checkChemicalLimit(value, limit);
                  return `
                    <tr>
                      <td><strong>${element.toUpperCase()}</strong></td>
                      <td>${value}</td>
                      <td>${formatLimit(limit)}</td>
                      <td class="${isWithinLimit ? 'pass' : 'fail'}">
                        ${isWithinLimit ? 'PASS' : 'FAIL'}
                      </td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="section">
          <h3>ผลการทดสอบ / Test Results</h3>
          <div class="info-item">
            <span class="label">ผลรวม:</span>
            <span class="value ${data.testResults.conformsToStandard ? 'pass' : 'fail'}">
              ${data.testResults.conformsToStandard ? 
                '✓ ผ่านมาตรฐาน JIS ' + data.jisStandard : 
                '✗ ไม่ผ่านมาตรฐาน JIS ' + data.jisStandard
              }
            </span>
          </div>
          
          ${data.testResults.deviations.length > 0 ? `
            <div class="info-item">
              <span class="label">รายการที่ไม่เป็นไปตามมาตรฐาน:</span>
              <ul>
                ${data.testResults.deviations.map(deviation => `<li>${deviation}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${data.testResults.notes ? `
            <div class="info-item">
              <span class="label">หมายเหตุ:</span>
              <span class="value">${data.testResults.notes}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="section">
          <h3>การยืนยันและอนุมัติ / Verification & Approval</h3>
          <div class="info-grid">
            <div>
              <div class="info-item">
                <span class="label">ผู้ทดสอบ:</span>
                <span class="value">${data.testedBy}</span>
              </div>
              ${data.verifiedBy ? `
                <div class="info-item">
                  <span class="label">ผู้ยืนยันผล:</span>
                  <span class="value">${data.verifiedBy}</span>
                </div>
              ` : ''}
            </div>
            <div>
              <div class="info-item">
                <span class="label">สถานะ:</span>
                <span class="status ${data.status}">${getStatusLabel(data.status)}</span>
              </div>
              ${data.approvedBy ? `
                <div class="info-item">
                  <span class="label">ผู้อนุมัติ:</span>
                  <span class="value">${data.approvedBy}</span>
                </div>
                <div class="info-item">
                  <span class="label">วันที่อนุมัติ:</span>
                  <span class="value">${formatDateThai(data.approvalDate)}</span>
                </div>
              ` : ''}
            </div>
          </div>
          ${data.remarks ? `<p><strong>ข้อสังเกต:</strong> ${data.remarks}</p>` : ''}
        </div>
        
        ${data.qrCode ? `
          <div class="qr-code">
            <h3>QR Code สำหรับการสอบย้อนกลับ</h3>
            <img src="${data.qrCode}" alt="QR Code" style="width: 150px; height: 150px;">
            <p>รหัส: ${data.testId}</p>
          </div>
        ` : ''}
        
        <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #666;">
          <p>สร้างเมื่อ: ${formatDateThai(new Date().toISOString())}</p>
          <p>ระบบตรวจสอบคุณภาพในสายการผลิต</p>
        </div>
      </body>
      </html>
    `;
  };
  
  // Helper functions for PDF generation
  const formatDateThai = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const getMaterialTypeLabel = (type) => {
    const labels = {
      steel_pipe: 'เหล็กท่อน',
      steel_bar: 'เหล็กเส้น',
      hardened_work: 'งานชุบแข็ง'
    };
    return labels[type] || type;
  };
  
  const getToolLabel = (tool) => {
    const labels = {
      vernier: 'เวอร์เนียร์',
      micrometer: 'ไมโครมิเตอร์',
      gauge: 'เกจวัด'
    };
    return labels[tool] || tool;
  };
  
  const getResultLabel = (result) => {
    const labels = {
      pass: 'ผ่าน',
      fail: 'ไม่ผ่าน',
      pending: 'รอการประเมิน'
    };
    return labels[result] || result;
  };
  
  const getAppearanceLabel = (appearance) => {
    const labels = {
      good: 'ดี',
      acceptable: 'ยอมรับได้',
      poor: 'ไม่ดี'
    };
    return labels[appearance] || appearance;
  };
  
  const getPackagingLabel = (packaging) => {
    const labels = {
      good: 'ดี',
      acceptable: 'ยอมรับได้',
      damaged: 'เสียหาย'
    };
    return labels[packaging] || packaging;
  };
  
  const getStatusLabel = (status) => {
    const labels = {
      pending: 'รอการอนุมัติ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ไม่อนุมัติ',
      completed: 'เสร็จสิ้น'
    };
    return labels[status] || status;
  };
  
  // Mock JIS limit checking functions
  const getJISLimit = (standard, element) => {
    // This should be imported from mockData.js
    const mockLimits = {
      G4051: {
        carbon: { max: 0.60 },
        silicon: { max: 0.35 },
        manganese: { max: 1.35 },
        phosphorus: { max: 0.040 },
        sulfur: { max: 0.040 }
      }
    };
    return mockLimits[standard]?.[element] || {};
  };
  
  const checkChemicalLimit = (value, limit) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return true;
    
    if (limit.max !== undefined && numValue > limit.max) return false;
    if (limit.min !== undefined && numValue < limit.min) return false;
    return true;
  };
  
  const formatLimit = (limit) => {
    if (limit.min !== undefined && limit.max !== undefined) {
      return `${limit.min} - ${limit.max}`;
    } else if (limit.max !== undefined) {
      return `≤ ${limit.max}`;
    } else if (limit.min !== undefined) {
      return `≥ ${limit.min}`;
    }
    return '-';
  };
  
  // Calculate statistics for dashboard
  export const calculateStatistics = (data, type) => {
    if (!Array.isArray(data)) return {};
    
    const total = data.length;
    const approved = data.filter(item => item.status === 'approved').length;
    const pending = data.filter(item => item.status === 'pending').length;
    const rejected = data.filter(item => item.status === 'rejected').length;
    
    return {
      total,
      approved,
      pending,
      rejected,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0
    };
  };
  
  // Validate form data
  export const validateFormData = (data, requiredFields) => {
    const errors = [];
    
    requiredFields.forEach(field => {
      if (!data[field] || data[field].toString().trim() === '') {
        errors.push(`${field} is required`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  // src/utils/calculations.js

// ฟังก์ชันคำนวณค่าเฉลี่ย
export const calculateAverage = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  
  const numericValues = values
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v));
    
  if (numericValues.length === 0) return 0;
  
  const sum = numericValues.reduce((acc, val) => acc + val, 0);
  return (sum / numericValues.length).toFixed(3);
};

// ฟังก์ชันคำนวณค่าเบี่ยงเบนมาตรฐาน
export const calculateStandardDeviation = (values) => {
  if (!Array.isArray(values) || values.length <= 1) return 0;
  
  const numericValues = values
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v));
    
  if (numericValues.length <= 1) return 0;
  
  const avg = parseFloat(calculateAverage(numericValues));
  const squaredDiffs = numericValues.map(value => Math.pow(value - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / (numericValues.length - 1);
  
  return Math.sqrt(avgSquaredDiff).toFixed(3);
};

// ฟังก์ชันคำนวณค่าสูงสุด
export const calculateMax = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  
  const numericValues = values
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v));
    
  if (numericValues.length === 0) return 0;
  
  return Math.max(...numericValues).toFixed(3);
};

// ฟังก์ชันคำนวณค่าต่ำสุด
export const calculateMin = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  
  const numericValues = values
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v));
    
  if (numericValues.length === 0) return 0;
  
  return Math.min(...numericValues).toFixed(3);
};

// ฟังก์ชันคำนวณช่วงค่า (Range)
export const calculateRange = (values) => {
  const max = parseFloat(calculateMax(values));
  const min = parseFloat(calculateMin(values));
  return (max - min).toFixed(3);
};

// ฟังก์ชันตรวจสอบว่าค่าอยู่ในช่วงที่กำหนดหรือไม่
export const isWithinTolerance = (value, target, tolerance) => {
  const numericValue = parseFloat(value);
  const numericTarget = parseFloat(target);
  const numericTolerance = parseFloat(tolerance);
  
  if (isNaN(numericValue) || isNaN(numericTarget) || isNaN(numericTolerance)) {
    return false;
  }
  
  const lowerBound = numericTarget - numericTolerance;
  const upperBound = numericTarget + numericTolerance;
  
  return numericValue >= lowerBound && numericValue <= upperBound;
};

// ฟังก์ชันคำนวณค่าความคลาดเคลื่อน
export const calculateDeviation = (value, target) => {
  const numericValue = parseFloat(value);
  const numericTarget = parseFloat(target);
  
  if (isNaN(numericValue) || isNaN(numericTarget)) {
    return 0;
  }
  
  return (numericValue - numericTarget).toFixed(3);
};

// ฟังก์ชันคำนวณเปอร์เซ็นต์ความคลาดเคลื่อน
export const calculatePercentageDeviation = (value, target) => {
  const numericValue = parseFloat(value);
  const numericTarget = parseFloat(target);
  
  if (isNaN(numericValue) || isNaN(numericTarget) || numericTarget === 0) {
    return 0;
  }
  
  const deviation = numericValue - numericTarget;
  const percentageDeviation = (deviation / numericTarget) * 100;
  
  return percentageDeviation.toFixed(2);
};

// ฟังก์ชันตรวจสอบการวัดทั้งหมด
export const validateMeasurements = (measurements, standardValue, tolerance) => {
  if (!Array.isArray(measurements) || measurements.length === 0) {
    return {
      isValid: false,
      message: 'ไม่มีข้อมูลการวัด',
      details: []
    };
  }
  
  const results = measurements.map((measurement, index) => {
    const value = parseFloat(measurement.value || measurement.odValue || measurement.lengthValue);
    const isValid = isWithinTolerance(value, standardValue, tolerance);
    const deviation = calculateDeviation(value, standardValue);
    const percentageDeviation = calculatePercentageDeviation(value, standardValue);
    
    return {
      index: index + 1,
      value,
      isValid,
      deviation,
      percentageDeviation,
      message: isValid ? 'ผ่าน' : 'ไม่ผ่าน'
    };
  });
  
  const allValid = results.every(result => result.isValid);
  const passCount = results.filter(result => result.isValid).length;
  const failCount = results.length - passCount;
  
  return {
    isValid: allValid,
    message: allValid ? 'ผ่านการตรวจสอบ' : 'ไม่ผ่านการตรวจสอบ',
    passCount,
    failCount,
    totalCount: results.length,
    passRate: ((passCount / results.length) * 100).toFixed(1),
    details: results,
    statistics: {
      average: calculateAverage(measurements.map(m => m.value || m.odValue || m.lengthValue)),
      standardDeviation: calculateStandardDeviation(measurements.map(m => m.value || m.odValue || m.lengthValue)),
      max: calculateMax(measurements.map(m => m.value || m.odValue || m.lengthValue)),
      min: calculateMin(measurements.map(m => m.value || m.odValue || m.lengthValue)),
      range: calculateRange(measurements.map(m => m.value || m.odValue || m.lengthValue))
    }
  };
};

// ฟังก์ชันคำนวณ Cp และ Cpk (Process Capability)
export const calculateProcessCapability = (measurements, lowerLimit, upperLimit) => {
  if (!Array.isArray(measurements) || measurements.length < 2) {
    return null;
  }
  
  const values = measurements
    .map(m => parseFloat(m.value || m.odValue || m.lengthValue))
    .filter(v => !isNaN(v));
    
  if (values.length < 2) return null;
  
  const mean = parseFloat(calculateAverage(values));
  const std = parseFloat(calculateStandardDeviation(values));
  
  if (std === 0) return null;
  
  const cp = (upperLimit - lowerLimit) / (6 * std);
  const cpkUpper = (upperLimit - mean) / (3 * std);
  const cpkLower = (mean - lowerLimit) / (3 * std);
  const cpk = Math.min(cpkUpper, cpkLower);
  
  return {
    cp: cp.toFixed(3),
    cpk: cpk.toFixed(3),
    mean: mean.toFixed(3),
    standardDeviation: std,
    interpretation: {
      cp: cp >= 1.33 ? 'ดีมาก' : cp >= 1.0 ? 'พอใช้' : 'ไม่ดี',
      cpk: cpk >= 1.33 ? 'ดีมาก' : cpk >= 1.0 ? 'พอใช้' : 'ไม่ดี'
    }
  };
};

// ฟังก์ชันคำนวณสถิติสำหรับรายงาน
export const calculateReportStatistics = (data, field) => {
  if (!Array.isArray(data) || data.length === 0) {
    return {
      total: 0,
      average: 0,
      max: 0,
      min: 0,
      standardDeviation: 0,
      range: 0
    };
  }
  
  const values = data
    .map(item => parseFloat(item[field]))
    .filter(v => !isNaN(v));
    
  return {
    total: data.length,
    average: calculateAverage(values),
    max: calculateMax(values),
    min: calculateMin(values),
    standardDeviation: calculateStandardDeviation(values),
    range: calculateRange(values)
  };
};

// ฟังก์ชันคำนวณอัตราผ่าน
export const calculatePassRate = (totalCount, passCount) => {
  if (totalCount === 0) return 0;
  return ((passCount / totalCount) * 100).toFixed(1);
};

// ฟังก์ชันคำนวณแนวโน้ม (Trend Analysis)
export const calculateTrend = (data, timeField, valueField) => {
  if (!Array.isArray(data) || data.length < 2) {
    return {
      trend: 'ไม่สามารถวิเคราะห์ได้',
      slope: 0,
      correlation: 0
    };
  }
  
  // เรียงข้อมูลตามเวลา
  const sortedData = data
    .filter(item => item[timeField] && item[valueField])
    .sort((a, b) => new Date(a[timeField]) - new Date(b[timeField]))
    .map((item, index) => ({
      x: index + 1,
      y: parseFloat(item[valueField])
    }))
    .filter(item => !isNaN(item.y));
    
  if (sortedData.length < 2) {
    return {
      trend: 'ไม่สามารถวิเคราะห์ได้',
      slope: 0,
      correlation: 0
    };
  }
  
  // คำนวณ Linear Regression
  const n = sortedData.length;
  const sumX = sortedData.reduce((sum, item) => sum + item.x, 0);
  const sumY = sortedData.reduce((sum, item) => sum + item.y, 0);
  const sumXY = sortedData.reduce((sum, item) => sum + (item.x * item.y), 0);
  const sumX2 = sortedData.reduce((sum, item) => sum + (item.x * item.x), 0);
  const sumY2 = sortedData.reduce((sum, item) => sum + (item.y * item.y), 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const correlation = (n * sumXY - sumX * sumY) / 
    Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  let trendText = 'คงที่';
  if (Math.abs(slope) > 0.1) {
    trendText = slope > 0 ? 'เพิ่มขึ้น' : 'ลดลง';
  }
  
  return {
    trend: trendText,
    slope: slope.toFixed(4),
    correlation: correlation.toFixed(3),
    strength: Math.abs(correlation) > 0.7 ? 'แข็งแกร่ง' : 
              Math.abs(correlation) > 0.5 ? 'ปานกลาง' : 'อ่อน'
  };
};

// ฟังก์ชันปัดเศษตามกฎการวัด
export const roundMeasurement = (value, precision = 3) => {
  const factor = Math.pow(10, precision);
  return Math.round(parseFloat(value) * factor) / factor;
};

// ฟังก์ชันตรวจสอบความสม่ำเสมอของการวัด
export const checkMeasurementConsistency = (measurements, maxDeviation = 0.1) => {
  if (!Array.isArray(measurements) || measurements.length < 2) {
    return {
      isConsistent: true,
      message: 'ข้อมูลไม่เพียงพอ'
    };
  }
  
  const values = measurements
    .map(m => parseFloat(m.value || m.odValue || m.lengthValue))
    .filter(v => !isNaN(v));
    
  if (values.length < 2) {
    return {
      isConsistent: true,
      message: 'ข้อมูลไม่เพียงพอ'
    };
  }
  
  const average = parseFloat(calculateAverage(values));
  const maxDiff = Math.max(...values.map(v => Math.abs(v - average)));
  
  const isConsistent = maxDiff <= maxDeviation;
  
  return {
    isConsistent,
    maxDeviation: maxDiff.toFixed(3),
    allowedDeviation: maxDeviation,
    message: isConsistent ? 'การวัดสม่ำเสมอ' : 'การวัดไม่สม่ำเสมอ'
  };
};