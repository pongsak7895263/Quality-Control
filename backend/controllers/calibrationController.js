const calibrationService = require('../services/calibrationService');
const { Instrument, CalibrationPlan } = require('../models');
const { Op } = require('sequelize');

// 1. บันทึกผลสอบเทียบ
exports.createRecord = async (req, res) => {
    try {
        const { result, qprTicket } = await calibrationService.recordCalibration(req.body);
        
        let message = "Calibration recorded successfully.";
        if (qprTicket) {
            message = `Calibration FAILED. System auto-created QPR Ticket: ${qprTicket.ticket_no}`;
        }

        res.status(201).json({ 
            message: message, 
            data: result,
            qpr: qprTicket 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. ดึงรายการที่ใกล้ครบกำหนด (Due Soon)
exports.getDueInstruments = async (req, res) => {
    try {
        const instruments = await Instrument.findAll({
            include: [{
                model: CalibrationPlan,
                where: {
                    // Logic: ครบกำหนดภายใน 30 วันข้างหน้า
                    next_cal_date: { 
                        [Op.lte]: new Date(new Date().setDate(new Date().getDate() + 30)) 
                    }
                }
            }]
        });
        res.json(instruments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. ดึงรายการทั้งหมด (All)
exports.getAllInstruments = async (req, res) => {
    try {
        const instruments = await Instrument.findAll({
            include: [{ model: CalibrationPlan }],
            order: [['id', 'ASC']] // เรียงตาม ID
        });
        res.json(instruments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. ลงทะเบียนเครื่องมือใหม่ (Register)
exports.registerInstrument = async (req, res) => {
    try {
        const result = await calibrationService.registerInstrument(req.body);
        res.status(201).json({ message: "Registered successfully", data: result });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: "Serial Number นี้มีอยู่ในระบบแล้ว" });
        }
        res.status(500).json({ error: error.message });
    }
};

// 5. แก้ไขข้อมูลเครื่องมือ (Update)
exports.updateInstrument = async (req, res) => {
    try {
        await calibrationService.updateInstrument(req.params.id, req.body);
        res.json({ message: "Instrument updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 6. ดึงข้อมูลรายตัว (Get By ID)
exports.getInstrumentById = async (req, res) => {
    try {
        const result = await calibrationService.getInstrumentById(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};