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
  { code: 'DIM-001', name: 'ขนาดเกินพิกัด', nameEn: 'Dimension Out of Spec', category: 'dimensional', severity: 'critical' },
  { code: 'DIM-002', name: 'รูเยื้องศูนย์', nameEn: 'Hole Position Error', category: 'dimensional', severity: 'critical' },
  { code: 'DIM-003', name: 'ความกลมไม่ได้', nameEn: 'Roundness Out', category: 'dimensional', severity: 'major' },
  { code: 'SUR-001', name: 'รอยขีดข่วน', nameEn: 'Scratch', category: 'surface', severity: 'major' },
  { code: 'SUR-002', name: 'ผิวไม่เรียบ', nameEn: 'Surface Roughness', category: 'surface', severity: 'major' },
  { code: 'SUR-003', name: 'รอยกดทับ', nameEn: 'Dent', category: 'surface', severity: 'minor' },
  { code: 'SUR-004', name: 'เศษครีบ', nameEn: 'Burr', category: 'surface', severity: 'minor' },
  { code: 'MAT-001', name: 'วัตถุดิบไม่ได้มาตรฐาน', nameEn: 'Material Defect', category: 'material', severity: 'critical' },
  { code: 'MAT-002', name: 'ความแข็งไม่ผ่าน', nameEn: 'Hardness Fail', category: 'material', severity: 'major' },
  { code: 'PRO-001', name: 'ทำงานผิดขั้นตอน', nameEn: 'Process Error', category: 'process', severity: 'major' },
  { code: 'PRO-002', name: 'เครื่องจักรเสีย', nameEn: 'Machine Breakdown', category: 'process', severity: 'critical' },
  { code: 'OTH-001', name: 'อื่นๆ', nameEn: 'Others', category: 'other', severity: 'minor' },
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
  { id: 'machining-auto', name: 'Machining - Automotive', category: 'machining' },
  { id: 'machining-ind', name: 'Machining - Industrial', category: 'machining' },
  { id: 'heat-treat', name: 'Heat Treatment', category: 'industrial' },
  { id: 'assembly', name: 'Assembly', category: 'automotive' },
];

// ─── SHIFT DEFINITIONS ───────────────────────────────────────────
export const SHIFTS = {
  A: { id: 'A', label: 'Shift A (Day)', start: '06:00', end: '18:00' },
  B: { id: 'B', label: 'Shift B (Night)', start: '18:00', end: '06:00' },
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