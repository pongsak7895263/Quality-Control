// src/services/excelService.js
import * as XLSX from 'xlsx';

export const exportToExcel = (inspections, fileName = 'inspections_report') => {
    // แปลงข้อมูลให้เหมาะกับ Excel
    const dataToExport = inspections.map(insp => ({
        'หมายเลขตรวจสอบ': insp.inspection_number,
        'เกรดวัตถุดิบ': insp.material_grade,
        'ผู้จำหน่าย': insp.supplier_name,
        'ผลลัพธ์': insp.overall_result,
        'วันที่': new Date(insp.created_at).toLocaleDateString('th-TH'),
        'หมายเหตุ': insp.notes
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inspections');

    // ตั้งค่าความกว้างของคอลัมน์
    worksheet['!cols'] = [
        { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 40 }
    ];

    XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};