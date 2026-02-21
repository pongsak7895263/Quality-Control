/**
 * utils/kpiApi.js
 * ================
 * API Service สำหรับเชื่อมต่อ Frontend กับ Backend
 * ใช้ใน KPI Monitoring Components ทั้งหมด
 * 
 * วิธีใช้: import { kpiApi } from '../utils/kpiApi';
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://192.168.0.25:5000';
const KPI_URL = `${API_BASE}/api/kpi`;

/**
 * Base fetch wrapper with error handling
 */
const fetchApi = async (endpoint, options = {}) => {
  const url = `${KPI_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      // ถ้ามี auth token:
      // 'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`[KPI API] ${options.method || 'GET'} ${endpoint}:`, error.message);
    throw error;
  }
};

/**
 * Build query string from params object
 */
const qs = (params) => {
  const filtered = Object.entries(params).filter(([_, v]) => v != null && v !== '');
  return filtered.length > 0 ? '?' + new URLSearchParams(filtered).toString() : '';
};


// ═══════════════════════════════════════════════════════════
// API Methods
// ═══════════════════════════════════════════════════════════

export const kpiApi = {

  // ─── Dashboard ────────────────────────────────────────────
  getDashboard: (params = {}) =>
    fetchApi(`/dashboard${qs(params)}`),

  getKpiValues: (params = {}) =>
    fetchApi(`/values${qs(params)}`),

  getMasterData: () =>
    fetchApi('/master'),

  // ─── Trends ───────────────────────────────────────────────
  getTrends: (params = {}) =>
    fetchApi(`/trends${qs(params)}`),

  // ─── Pareto ───────────────────────────────────────────────
  getPareto: (params = {}) =>
    fetchApi(`/pareto${qs(params)}`),

  // ─── Entries ──────────────────────────────────────────────
  createEntry: (data) =>
    fetchApi('/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getEntries: (params = {}) =>
    fetchApi(`/entries${qs(params)}`),

  // ─── Andon ────────────────────────────────────────────────
  getAndonAlerts: (params = {}) =>
    fetchApi(`/andon${qs(params)}`),

  acknowledgeAlert: (id, data) =>
    fetchApi(`/andon/${id}/acknowledge`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  resolveAlert: (id, data) =>
    fetchApi(`/andon/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // ─── Machines ─────────────────────────────────────────────
  getMachineStatus: () =>
    fetchApi('/machines/status'),

  // ─── Claims ───────────────────────────────────────────────
  createClaim: (data) =>
    fetchApi('/claims', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getClaims: (params = {}) =>
    fetchApi(`/claims${qs(params)}`),

  // ─── Action Plans ─────────────────────────────────────────
  createActionPlan: (data) =>
    fetchApi('/actions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getActionPlans: (params = {}) =>
    fetchApi(`/actions${qs(params)}`),
};

export default kpiApi;