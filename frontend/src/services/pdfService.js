// src/services/pdfService.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { sarabun } from '../assets/fonts/sarabun_font'; // ต้องมีไฟล์ฟอนต์ภาษาไทย

export const generatePdf = (inspection) => {
    const doc = new jsPDF();

    // Add Sarabun font
    doc.addFileToVFS('Sarabun-Regular.ttf', sarabun);
    doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
    doc.setFont('Sarabun');

    doc.setFontSize(18);
    doc.text(`รายงานการตรวจสอบวัตถุดิบ - เลขที่: ${inspection.inspection_number}`, 14, 22);

    doc.setFontSize(11);
    doc.text(`วันที่ตรวจสอบ: ${new Date(inspection.created_at).toLocaleDateString('th-TH')}`, 14, 32);
    doc.text(`ผู้จำหน่าย: ${inspection.supplier_name}`, 14, 39);
    doc.text(`เกรดวัตถุดิบ: ${inspection.material_grade}`, 100, 39);
    
    const tableColumn = ["#", "OD (mm)", "ความยาว (mm)", "น้ำหนัก (kg)", "สถานะ"];
    const tableRows = [];

    // สมมติว่าข้อมูล bar inspections อยู่ใน inspection.barInspections
    inspection.barInspections.forEach(bar => {
        const barData = [
            bar.barNumber,
            bar.odMeasurement,
            bar.lengthMeasurement,
            bar.weight,
            bar.status
        ];
        tableRows.push(barData);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 50,
        theme: 'grid',
        headStyles: { font: 'Sarabun', fontStyle: 'bold', fillColor: [22, 160, 133] },
        styles: { font: 'Sarabun' },
    });
    
    doc.setFontSize(11);
    doc.text(`ผลการตรวจสอบโดยรวม: ${inspection.overall_result.toUpperCase()}`, 14, doc.autoTable.previous.finalY + 10);
    doc.text(`หมายเหตุ: ${inspection.notes || '-'}`, 14, doc.autoTable.previous.finalY + 17);

    doc.save(`inspection-report-${inspection.inspection_number}.pdf`);
};