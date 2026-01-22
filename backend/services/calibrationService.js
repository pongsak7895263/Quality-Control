const { Instrument, CalibrationPlan, CalibrationResult, QPRTicket } = require('../models');

// --- 1. บันทึกผลสอบเทียบ + Auto QPR ---
exports.recordCalibration = async (data) => {
    const { instrument_id, standard_value, measured_value, performed_by } = data;

    // 1.1 ดึงแผนเพื่อเอาเกณฑ์การยอมรับ
    const plan = await CalibrationPlan.findOne({ where: { instrument_id } });
    if (!plan) throw new Error("Instrument has no calibration plan.");

    // 1.2 คำนวณ Error และผลลัพธ์
    const errorVal = parseFloat(measured_value) - parseFloat(standard_value);
    const isPass = Math.abs(errorVal) <= parseFloat(plan.acceptance_criteria);
    const resultStatus = isPass ? 'PASS' : 'FAIL';

    // 1.3 บันทึกผลลง DB
    const result = await CalibrationResult.create({
        instrument_id,
        standard_value,
        measured_value,
        error_value: errorVal,
        result_status: resultStatus,
        performed_by
    });

    let qprTicket = null;

    // 1.4 Automation Logic
    if (isPass) {
        // --- CASE: PASS ---
        // คำนวณวันครบกำหนดครั้งถัดไป
        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + plan.frequency_months);
        
        // อัปเดตแผนและสถานะเครื่องมือ
        await plan.update({ last_cal_date: new Date(), next_cal_date: nextDate });
        await Instrument.update({ next_cal_date: nextDate, status: 'ACTIVE' }, { where: { id: instrument_id } });
    
    } else {
        // --- CASE: FAIL (Phase 2 Quality) ---
        
        // เปลี่ยนสถานะเครื่องมือเป็น NG ทันที
        await Instrument.update({ status: 'NG' }, { where: { id: instrument_id } });

        // สร้างเลขที่ใบ QPR (Format: QPR-YYYYMMDD-XXXX)
        const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const ticketNo = `QPR-${dateStr}-${randomSuffix}`;

        // สร้างใบ QPR อัตโนมัติ
        qprTicket = await QPRTicket.create({
            ticket_no: ticketNo,
            instrument_id: instrument_id,
            issue_type: 'CAL_NG',
            description: `Auto-generated: Calibration Failed. Standard: ${standard_value}, Measured: ${measured_value}, Error: ${errorVal.toFixed(4)}`,
            approval_status: 'PENDING',
        });
    }

    return { result, qprTicket };
};

// --- 2. ลงทะเบียนเครื่องมือใหม่ ---
exports.registerInstrument = async (data) => {
    const { 
        name, serial_number, location, department, 
        manufacturer, model, responsible_person, // Field ใหม่
        frequency_months, acceptance_criteria,
        calibration_location // Map ไปที่ vendor_name ของ Plan
    } = data;

    // คำนวณวันครบกำหนดครั้งแรก
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + parseInt(frequency_months || 6));

    // สร้างข้อมูลเครื่องมือ
    const newInstrument = await Instrument.create({
        name,
        serial_number,
        location,
        department,
        manufacturer,
        model,
        responsible_person,
        status: 'ACTIVE',
        next_cal_date: nextDate
    });

    // สร้างแผนการสอบเทียบคู่กัน
    await CalibrationPlan.create({
        instrument_id: newInstrument.id,
        frequency_months: frequency_months || 6,
        acceptance_criteria: acceptance_criteria || 0.05,
        vendor_name: calibration_location,
        last_cal_date: null,
        next_cal_date: nextDate
    });

    return newInstrument;
};

// --- 3. แก้ไขข้อมูลเครื่องมือ (Update) ---
exports.updateInstrument = async (id, data) => {
    const { 
        name, serial_number, location, department, 
        manufacturer, model, responsible_person,
        frequency_months, acceptance_criteria, calibration_location
    } = data;

    // อัปเดตตาราง Instrument
    await Instrument.update({
        name, serial_number, location, department,
        manufacturer, model, responsible_person
    }, { where: { id } });

    // อัปเดตตาราง CalibrationPlan
    // หมายเหตุ: การเปลี่ยน frequency ไม่ได้เปลี่ยน next_cal_date อัตโนมัติในที่นี้ (เปลี่ยนเฉพาะรอบถัดไป)
    await CalibrationPlan.update({
        frequency_months,
        acceptance_criteria,
        vendor_name: calibration_location
    }, { where: { instrument_id: id } });

    return { message: "Updated successfully" };
};

// --- 4. ดึงข้อมูลเครื่องมือรายตัว (Get By ID) ---
exports.getInstrumentById = async (id) => {
    const instrument = await Instrument.findByPk(id, {
        include: [{ model: CalibrationPlan }]
    });
    
    if (!instrument) throw new Error("Instrument not found");
    return instrument;
};