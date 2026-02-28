/**
 * product_categories.js
 * =====================
 * กำหนดค่า KPI Targets, Defect Codes, Escalation Rules
 * สำหรับระบบ Good/Scrap Management
 */

// ─── KPI TARGETS: External Customer Claims (PPM) ─────────────────
export const CLAIM_TARGETS = {
  automotive: {
    id: 'automotive',
    label: 'Automotive Parts Claim',
    labelTh: 'ชิ้นส่วนยานยนต์',
    target: 50,
    unit: 'PPM',
    standard: 'IATF 16949',
    strategy: 'Error Proofing (Poka-Yoke)',
    severity: 'high',
    icon: '🚗',
    color: '#3b82f6',
  },
  industrial: {
    id: 'industrial',
    label: 'Other Industrial Claim',
    labelTh: 'อุตสาหกรรมทั่วไป',
    target: 90,
    unit: 'PPM',
    standard: 'ISO 9001',
    strategy: 'Sampling Inspection',
    severity: 'medium',
    icon: '🏭',
    color: '#8b5cf6',
  },
  machining: {
    id: 'machining',
    label: 'Machining Claim',
    labelTh: 'งาน Machining',
    target: 5,
    unit: 'PPM',
    standard: '6σ Level',
    strategy: '100% Automated Inspection + Sensor',
    severity: 'critical',
    icon: '⚙️',
    color: '#ef4444',
  },
};

// ─── KPI TARGETS: Internal Quality (%) ───────────────────────────
export const INTERNAL_TARGETS = {
  productionRework: {
    id: 'productionRework',
    label: 'Production Rework',
    labelTh: 'งานซ่อม (สายการผลิต)',
    target: 0.40,
    unit: '%',
    strategy: 'Re-occurrence Analysis',
    icon: '🔧',
    color: '#f59e0b',
  },
  machiningRework: {
    id: 'machiningRework',
    label: 'Machining Rework',
    labelTh: 'งานซ่อม (Machining)',
    target: 0.50,
    unit: '%',
    strategy: 'Tool Life & Machine Calibration',
    icon: '🔩',
    color: '#f97316',
  },
  productionScrap: {
    id: 'productionScrap',
    label: 'Production Scrap',
    labelTh: 'ของเสียทิ้ง',
    target: 0.30,
    unit: '%',
    strategy: 'FIFO Control + NG Segregation',
    icon: '🗑️',
    color: '#ef4444',
  },
};

// ─── DEFECT CODES (สำหรับ Categorization & Pareto) ───────────────
export const DEFECT_CODES = [
  // ─── Process (กระบวนการ) ───
  { code: 'PRO-001', name: 'Trial', nameEn: 'Trial', category: 'process', severity: 'minor' },
  { code: 'PRO-002', name: 'Block NG', nameEn: 'Block NG', category: 'process', severity: 'major' },
  { code: 'PRO-003', name: 'Pre-forg NG', nameEn: 'Pre-forg NG', category: 'process', severity: 'major' },
  { code: 'PRO-004', name: 'Trim Mistake', nameEn: 'Trim Mistake', category: 'process', severity: 'major' },
  { code: 'PRO-005', name: 'Burr', nameEn: 'Burr', category: 'process', severity: 'minor' },
  // ─── Dimensional (มิติ/ขนาด) ───
  { code: 'DIM-001', name: 'Lower Spec', nameEn: 'Lower Spec', category: 'dimensional', severity: 'critical' },
  { code: 'DIM-002', name: 'Over Spec', nameEn: 'Over Spec', category: 'dimensional', severity: 'critical' },
  { code: 'DIM-003', name: 'Mismatch', nameEn: 'Mismatch', category: 'dimensional', severity: 'major' },
  { code: 'DIM-004', name: 'Dis Center', nameEn: 'Dis Center', category: 'dimensional', severity: 'major' },
  // ─── Appearance (ลักษณะภายนอก) ───
  { code: 'APP-001', name: 'Short Shot', nameEn: 'Short Shot', category: 'appearance', severity: 'critical' },
  { code: 'APP-002', name: 'Crack', nameEn: 'Crack', category: 'appearance', severity: 'critical' },
  { code: 'APP-003', name: 'Nick', nameEn: 'Nick', category: 'appearance', severity: 'major' },
  { code: 'APP-004', name: 'Scale', nameEn: 'Scale', category: 'appearance', severity: 'minor' },
  { code: 'APP-005', name: 'Deep Scale', nameEn: 'Deep Scale', category: 'appearance', severity: 'major' },
  { code: 'APP-006', name: 'Die Worn', nameEn: 'Die Worn', category: 'appearance', severity: 'major' },
  { code: 'APP-007', name: 'Bending', nameEn: 'Bending', category: 'appearance', severity: 'major' },
  { code: 'APP-008', name: 'Short Shot Small', nameEn: 'Short Shot Small', category: 'appearance', severity: 'minor' },
  { code: 'APP-009', name: 'Other', nameEn: 'Other', category: 'appearance', severity: 'minor' },
];

// ─── DEFECT CATEGORIES ──────────────────────────────────────────
export const DEFECT_CATEGORIES = [
  { id: 'process', name: 'Process', nameTh: 'กระบวนการ', color: '#f59e0b', icon: '⚙️' },
  { id: 'dimensional', name: 'Dimensional', nameTh: 'มิติ/ขนาด', color: '#3b82f6', icon: '📐' },
  { id: 'appearance', name: 'Appearance', nameTh: 'ลักษณะภายนอก', color: '#8b5cf6', icon: '👁️' },
];

// ─── REWORK METHODS (วิธีซ่อมชิ้นงาน) ──────────────────────────
export const REWORK_METHODS = [
  { code: 'RW-001', name: 'Welding', nameTh: 'เชื่อม', icon: '🔥' },
  { code: 'RW-002', name: 'Grinding', nameTh: 'เจียร', icon: '⚡' },
  { code: 'RW-003', name: 'Shotblast', nameTh: 'ยิงทราย', icon: '💨' },
  { code: 'RW-004', name: 'Drilling', nameTh: 'เจาะ', icon: '🔩' },
  { code: 'RW-005', name: 'Trimming', nameTh: 'ตัดแต่ง', icon: '✂️' },
  { code: 'RW-006', name: 'Heat Treatment', nameTh: 'อบชุบ', icon: '🌡️' },
  { code: 'RW-007', name: 'Cold Coin', nameTh: 'ตีเย็น', icon: '❄️' },
  { code: 'RW-008', name: 'Special Used', nameTh: 'ใช้พิเศษ', icon: '⭐' },
  { code: 'RW-009', name: 'Machine', nameTh: 'กลึง', icon: '🔧' },
  { code: 'RW-010', name: 'Other', nameTh: 'อื่นๆ', icon: '📝' },
];

// ─── DISPOSITION TYPES (การจัดการชิ้นงาน) ────────────────────────
export const DISPOSITION_TYPES = {
  GOOD: { id: 'GOOD', label: 'ผ่าน (Good)', color: '#10b981' },
  REWORK: { id: 'REWORK', label: 'ซ่อมแซม (Rework)', color: '#f59e0b' },
  SCRAP: { id: 'SCRAP', label: 'ของเสียทิ้ง (Scrap)', color: '#ef4444' },
  HOLD: { id: 'HOLD', label: 'กักรอตรวจ (Hold)', color: '#6366f1' },
  CONCESSION: { id: 'CONCESSION', label: 'ผ่อนผัน (Concession)', color: '#8b5cf6' },
};

// ─── ANDON / ESCALATION RULES ────────────────────────────────────
export const ESCALATION_RULES = {
  level1: {
    level: 1,
    label: 'Line Leader',
    triggerScrap: 1,              // 1 NG ติดกัน
    triggerReworkPctPerHr: 0.30,  // Rework > 0.3%/hr
    responseMinutes: 5,
    color: '#f59e0b',
    actions: ['หยุดเครื่องชั่วคราว', 'ตรวจสอบเบื้องต้น'],
  },
  level2: {
    level: 2,
    label: 'Supervisor / QC',
    triggerScrap: 3,              // 3 NG ติดกัน
    triggerReworkPctPerHr: 0.50,  // Rework > 0.5%/hr
    responseMinutes: 15,
    color: '#f97316',
    actions: ['วิเคราะห์สาเหตุ', 'แจ้ง Maintenance', 'เริ่มทำ 8D'],
  },
  level3: {
    level: 3,
    label: 'QC Manager / Plant Manager',
    triggerScrap: 5,              // 5 NG ติดกัน
    triggerReworkPctPerHr: 1.00,  // Rework > 1.0%/hr
    triggerLineStopMinutes: 30,   // Line Stop > 30 min
    responseMinutes: 30,
    color: '#ef4444',
    actions: ['เรียกประชุมฉุกเฉิน', 'Controlled Shipping', 'แจ้งลูกค้า (ถ้าจำเป็น)'],
  },
};

// ─── CSL (Controlled Shipping Level) ─────────────────────────────
export const CSL_LEVELS = {
  CSL1: {
    id: 'CSL1',
    label: 'Controlled Shipping Level 1',
    description: 'เพิ่มจุดตรวจสอบภายในโรงงานก่อนส่งมอบ',
    owner: 'Supplier (ภายใน)',
  },
  CSL2: {
    id: 'CSL2',
    label: 'Controlled Shipping Level 2',
    description: 'ลูกค้ากำหนดให้ใช้หน่วยงานภายนอกตรวจสอบเพิ่ม',
    owner: 'Third Party / ลูกค้า',
  },
};

// ─── PRODUCT LINES / CATEGORIES ──────────────────────────────────
export const PRODUCT_LINES = [
  { id: 'forging-auto', name: 'Forging - Automotive', category: 'automotive' },
  { id: 'forging-ind', name: 'Forging - Industrial', category: 'industrial' },
  { id: 'forging-ind', name: 'Forging - Industrial', category: 'industrial' },
  { id: 'machining-auto', name: 'Machining - Automotive', category: 'machining' },
  { id: 'machining-ind', name: 'Machining - Industrial', category: 'machining' },
  { id: 'heat-treat', name: 'Heat Treatment', category: 'industrial' },
  { id: 'assembly', name: 'Assembly', category: 'automotive' },
];

// ─── SHIFT DEFINITIONS ───────────────────────────────────────────
export const SHIFTS = {
  A: { id: 'A', label: 'Shift A (Day)', start: '06:00', end: '18:00' },B: { id: 'B', label: 'Shift B (Night)', start: '18:00', end: '06:00' },
  
  AB: { id: 'AB', label: 'Shift AB ', start: '18:00', end: '06:00' },
};

// ─── HELPER: เช็คสถานะ KPI ───────────────────────────────────────
export const getKpiStatus = (actual, target, unit) => {
  if (unit === 'PPM') {
    const ratio = actual / target;
    if (ratio <= 0.6) return { status: 'excellent', label: 'Excellent', color: '#10b981' };
    if (ratio <= 1.0) return { status: 'onTarget', label: 'On Target', color: '#10b981' };
    if (ratio <= 1.3) return { status: 'atRisk', label: 'At Risk', color: '#f59e0b' };
    return { status: 'overTarget', label: 'Over Target', color: '#ef4444' };
  }
  // % targets (lower is better)
  const ratio = actual / target;
  if (ratio <= 0.6) return { status: 'excellent', label: 'Excellent', color: '#10b981' };
  if (ratio <= 1.0) return { status: 'onTarget', label: 'On Target', color: '#10b981' };
  if (ratio <= 1.3) return { status: 'atRisk', label: 'At Risk', color: '#f59e0b' };
  return { status: 'overTarget', label: 'Over Target', color: '#ef4444' };
};

// ─── HELPER: คำนวณ PPM ──────────────────────────────────────────
export const calculatePPM = (defectCount, totalProduced) => {
  if (!totalProduced || totalProduced === 0) return 0;
  return Math.round((defectCount / totalProduced) * 1000000);
};

// ─── HELPER: คำนวณ % ────────────────────────────────────────────
export const calculatePercent = (count, total) => {
  if (!total || total === 0) return 0;
  return parseFloat(((count / total) * 100).toFixed(2));
};

// ─── HELPER: เช็ค Escalation Level ──────────────────────────────
export const getEscalationLevel = (consecutiveNG, reworkPctPerHr, lineStopMinutes = 0) => {
  if (
    consecutiveNG >= ESCALATION_RULES.level3.triggerScrap ||
    reworkPctPerHr >= ESCALATION_RULES.level3.triggerReworkPctPerHr ||
    lineStopMinutes >= ESCALATION_RULES.level3.triggerLineStopMinutes
  ) {
    return ESCALATION_RULES.level3;
  }
  if (
    consecutiveNG >= ESCALATION_RULES.level2.triggerScrap ||
    reworkPctPerHr >= ESCALATION_RULES.level2.triggerReworkPctPerHr
  ) {
    return ESCALATION_RULES.level2;
  }
  if (
    consecutiveNG >= ESCALATION_RULES.level1.triggerScrap ||
    reworkPctPerHr >= ESCALATION_RULES.level1.triggerReworkPctPerHr
  ) {
    return ESCALATION_RULES.level1;
  }
  return null;
};