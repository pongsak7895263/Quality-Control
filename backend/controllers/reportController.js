const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');

// ❌ ของเดิมที่ผิด: const { MaterialInspection } = require('../models/index').db;
// ✅ แก้ไขเป็น: ดึง MaterialInspection ออกมาตรงๆ จาก index
const { MaterialInspection } = require('../models/index'); 

exports.exportInspectionPDF = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. ดึงข้อมูลจาก DB (ใช้ตัวแปร MaterialInspection ที่ import มาข้างบนได้เลย)
        const inspection = await MaterialInspection.findByPk(id);

        if (!inspection) {
            return res.status(404).send('Inspection not found');
        }

        const rawData = inspection.get({ plain: true });

        // 2. จัดเตรียมข้อมูลให้ Template
        const templateData = {
            ...rawData,
            // จัดรูปแบบวันที่ให้เป็นภาษาไทย (ถ้ามีข้อมูล)
            receiptDateFormatted: rawData.receiptDate 
                ? new Date(rawData.receiptDate).toLocaleDateString('th-TH') 
                : '-',
            // เลือกใช้ข้อมูล bar หรือ rod ตามประเภท
            items: rawData.materialType === 'bar' ? rawData.barInspections : rawData.rodInspections
        };

        // 3. อ่านไฟล์ Template
        // ตรวจสอบ path ให้แน่ใจว่าไฟล์ .ejs อยู่ที่ backend/templates/inspection-report.ejs
        const templatePath = path.join(__dirname, '../templates/inspection-report.ejs');
        
        // เช็คว่าไฟล์มีอยู่จริงไหม เพื่อป้องกัน error
        if (!fs.existsSync(templatePath)) {
             throw new Error(`Template file not found at ${templatePath}`);
        }

        const templateHtml = await ejs.renderFile(templatePath, { data: templateData });

        // 4. ใช้ Puppeteer สร้าง PDF
        const browser = await puppeteer.launch({ 
            headless: 'new', 
            args: ['--no-sandbox'] // จำเป็นสำหรับ Server Linux/Docker
        });
        const page = await browser.newPage();
        
        await page.setContent(templateHtml, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ 
            format: 'A4', 
            printBackground: true,
            margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } 
        });

        await browser.close();

        // 5. ส่งไฟล์กลับ
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': `attachment; filename="Report_${rawData.batchNumber}.pdf"`
        });
        
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF Generation Error:', error);
        res.status(500).json({ message: "Error generating PDF", error: error.message });
    }
};