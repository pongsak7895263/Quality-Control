// src/utils/pdfGenerator.js

/**
 * สร้างรายงาน PDF สำหรับการตรวจสอบวัตถุดิบ
 * @param {Object} inspection - ข้อมูลการตรวจสอบ
 * @param {Function} showNotification - ฟังก์ชันแสดงการแจ้งเตือน
 */
export const generateInspectionPDF = (inspection, showNotification) => {
    // สร้าง PDF ใหม่
    const pdfWindow = window.open('', '_blank');
    
    // เนื้อหา HTML สำหรับ PDF
    const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>รายงานการตรวจสอบ - ${inspection.inspectionNumber}</title>
        <style>
          body { font-family: 'Sarabun', sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .status-pass { color: green; }
          .status-fail { color: red; }
          .signature-area { margin-top: 50px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>รายงานการตรวจสอบวัตถุดิบ</h1>
          <h2>เลขที่: ${inspection.inspectionNumber}</h2>
        </div>
        
        <div class="section">
          <h3>ข้อมูลพื้นฐาน</h3>
          <table>
            <tr><th>เกรดวัตถุดิบ</th><td>${inspection.materialGrade}</td></tr>
            <tr><th>ประเภท</th><td>${inspection.materialType === 'steel_bar' ? 'เหล็กเส้น' : 'เหล็กท่อน'}</td></tr>
            <tr><th>ผู้จำหน่าย</th><td>${inspection.supplierName}</td></tr>
            <tr><th>หมายเลข Batch</th><td>${inspection.batch?.batchNumber || '-'}</td></tr>
            <tr><th>หมายเลข Lot</th><td>${inspection.lotNumber}</td></tr>
            <tr><th>ปริมาณที่รับ</th><td>${inspection.receivedQuantity} กก.</td></tr>
            <tr><th>วันที่รับ</th><td>${new Date(inspection.receivedAt).toLocaleDateString('th-TH')}</td></tr>
          </table>
        </div>
        
        <div class="section">
          <h3>ผลการตรวจสอบ</h3>
          <table>
            <tr>
              <th>เส้นที่</th>
              <th>OD (mm)</th>
              <th>ความยาว (mm)</th>
              <th>น้ำหนัก (kg)</th>
              <th>สถานะ</th>
            </tr>
            ${inspection.barInspections.map(bar => `
              <tr>
                <td>${bar.barNumber}</td>
                <td>${bar.odMeasurement || '-'}</td>
                <td>${bar.lengthMeasurement || '-'}</td>
                <td>${bar.weight || '-'}</td>
                <td class="${bar.status === 'pass' ? 'status-pass' : 'status-fail'}">
                  ${bar.status === 'pass' ? 'ผ่าน' : 'ไม่ผ่าน'}
                </td>
              </tr>
            `).join('')}
          </table>
        </div>
        
        <div class="section">
          <h3>สรุปผล</h3>
          <table>
            <tr><th>อัตราการผ่าน</th><td>${inspection.calculatedResults?.passRate || '0'}%</td></tr>
            <tr><th>OD เฉลี่ย</th><td>${inspection.calculatedResults?.averageOd || '0'} mm</td></tr>
            <tr><th>ความยาวเฉลี่ย</th><td>${inspection.calculatedResults?.averageLength || '0'} mm</td></tr>
            <tr><th>เกรดโดยรวม</th><td>${inspection.calculatedResults?.overallGrade || '-'}</td></tr>
            <tr><th>สถานะการตรวจสอบ</th><td>${inspection.overallResult === 'pass' ? 'ผ่าน' : inspection.overallResult === 'fail' ? 'ไม่ผ่าน' : 'รอตรวจ'}</td></tr>
          </table>
        </div>
        
        <div class="signature-area">
          <p>ลงชื่อ __________________________ ผู้ตรวจสอบ</p>
          <p>วันที่ ________ / ________ / ________</p>
        </div>
      </body>
      </html>
    `;
    
    // เขียนเนื้อหาและพิมพ์ PDF
    pdfWindow.document.write(pdfContent);
    pdfWindow.document.close();
    pdfWindow.print();
    
    // แจ้งเตือนผู้ใช้
    if (showNotification) {
      showNotification('กำลังสร้างรายงาน PDF', 'info');
    }
  };
  
  export default generateInspectionPDF;