/**
 * Kpimonitoring/index.js
 * =======================
 * Export ทุก Component ของ KPI Monitoring Module
 */

export { default as KPIDashboard } from './KPIDashboard';
export { default as KPIOverviewCards } from './KPIOverviewCards';
export { default as KPITrendCharts } from './KPITrendCharts';
export { default as KPIParetoAnalysis } from './KPIParetoAnalysis';
export { default as KPIAndonBoard } from './KPIAndonBoard';
export { default as KPIDataEntry } from './KPIDataEntry';

export {
  CLAIM_TARGETS,
  INTERNAL_TARGETS,
  DEFECT_CODES,
  DISPOSITION_TYPES,
  ESCALATION_RULES,
  CSL_LEVELS,
  PRODUCT_LINES,
  SHIFTS,
  getKpiStatus,
  calculatePPM,
  calculatePercent,
  getEscalationLevel,
} from './product_categories';