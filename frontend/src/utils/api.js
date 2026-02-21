// utils/api.js - Enhanced API Client with KPI Endpoints
// ✅ เพิ่ม: get/post/patch helpers + KPI Good/Scrap Management APIs
import React, { useState, useCallback } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.0.26:5000';

class APIClient {
  constructor() {
    // ✅ ต่อ /api ให้อัตโนมัติ ถ้า .env ไม่ได้ใส่มา
    const raw = API_BASE_URL.replace(/\/+$/, ''); // ลบ trailing slash
    this.baseURL = raw.endsWith('/api') ? raw : `${raw}/api`;
    this.token = localStorage.getItem('authToken');
  }

  // ─── Core Request (เดิม — ไม่แก้) ───────────────────────────
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error(`API Error [${options.method || 'GET'}] ${endpoint}:`, error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ✅ NEW: HTTP Helper Methods (ใช้โดย KPIDashboard.js)
  // ═══════════════════════════════════════════════════════════════

  async get(endpoint, { params = {} } = {}) {
    const filtered = Object.entries(params).filter(([_, v]) => v != null && v !== '' && v !== undefined);
    const qs = filtered.length > 0 ? '?' + new URLSearchParams(filtered).toString() : '';
    return this.request(`${endpoint}${qs}`);
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ✅ NEW: KPI Good/Scrap Management APIs
  // ═══════════════════════════════════════════════════════════════

  // Dashboard ภาพรวม
  async getKPIDashboard(params = {}) {
    return this.get('/kpi/dashboard', { params });
  }

  // KPI Values (PPM + %)
  async getKPIValues(params = {}) {
    return this.get('/kpi/values', { params });
  }

  // Trend 12 เดือน
  async getKPITrends(params = {}) {
    return this.get('/kpi/trends', { params });
  }

  // Pareto วิเคราะห์ข้อบกพร่อง
  async getKPIPareto(params = {}) {
    return this.get('/kpi/pareto', { params });
  }

  // Master data (เครื่อง, defect codes, สายผลิต, targets)
  async getKPIMasterData() {
    return this.request('/kpi/master');
  }

  // บันทึกผลตรวจสอบ
  async createKPIEntry(data) {
    return this.request('/kpi/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ดึงรายการตรวจสอบ
  async getKPIEntries(params = {}) {
    return this.get('/kpi/entries', { params });
  }

  // Andon alerts
  async getAndonAlerts(params = {}) {
    return this.get('/kpi/andon', { params });
  }

  async acknowledgeAndon(id, data) {
    return this.request(`/kpi/andon/${id}/acknowledge`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async resolveAndon(id, data) {
    return this.request(`/kpi/andon/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Machine status
  async getMachineStatus() {
    return this.request('/kpi/machines/status');
  }

  // Customer Claims
  async createClaim(data) {
    return this.request('/kpi/claims', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getClaims(params = {}) {
    return this.get('/kpi/claims', { params });
  }

  // Action Plans (CAPA)
  async createActionPlan(data) {
    return this.request('/kpi/actions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getActionPlans(params = {}) {
    return this.get('/kpi/actions', { params });
  }

  // ═══════════════════════════════════════════════════════════════
  // KPI เดิมที่มีอยู่แล้ว (ไม่แก้)
  // ═══════════════════════════════════════════════════════════════

  async getKPICategories() {
    return this.request('/kpi/categories');
  }

  async getKPIProducts() {
    return this.request('/kpi/products');
  }

  async saveDailyLog(data) {
    return this.request('/kpi/daily-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getKPISummaryMonthly() {
    return this.request('/kpi/summary-monthly');
  }

  // ═══════════════════════════════════════════════════════════════
  // Material Inspections (เดิม — ไม่แก้)
  // ═══════════════════════════════════════════════════════════════

  async getMaterialInspections(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        queryParams.append(key, value);
      }
    });
    return this.request(`/Materialinspections?${queryParams.toString()}`);
  }

  async getMaterialInspectionById(id) {
    return this.request(`/Materialinspections/${id}`);
  }

  async createMaterialInspection(data) {
    return this.request('/Materialinspections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMaterialInspection(id, data) {
    return this.request(`/Materialinspections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMaterialInspection(id) {
    return this.request(`/Materialinspections/${id}`, {
      method: 'DELETE',
    });
  }

  async quickCreateInspection(data) {
    return this.request('/Materialinspections/quick-create', {
      method: 'POST',
      body: JSON.stringify({ ...data, creationMethod: 'quick' }),
    });
  }

  async bulkImportInspections(formData) {
    return this.request('/Materialinspections/bulk-import', {
      method: 'POST',
      headers: { 'Content-Type': undefined },
      body: formData,
    });
  }

  async validateImportFile(formData) {
    return this.request('/Materialinspections/validate-import', {
      method: 'POST',
      headers: { 'Content-Type': undefined },
      body: formData,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Templates (เดิม — ไม่แก้)
  // ═══════════════════════════════════════════════════════════════

  async getInspectionTemplates() {
    return this.request('/inspection-templates');
  }

  async getInspectionTemplateById(id) {
    return this.request(`/inspection-templates/${id}`);
  }

  async saveInspectionTemplate(data) {
    return this.request('/inspection-templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInspectionTemplate(id, data) {
    return this.request(`/inspection-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInspectionTemplate(id) {
    return this.request(`/inspection-templates/${id}`, {
      method: 'DELETE',
    });
  }

  async createFromTemplate(templateId, data) {
    return this.request('/material-inspections/from-template', {
      method: 'POST',
      body: JSON.stringify({ templateId, ...data, creationMethod: 'template' }),
    });
  }

  async duplicateInspection(originalId, data) {
    return this.request('/material-inspections/duplicate', {
      method: 'POST',
      body: JSON.stringify({ originalInspectionId: originalId, ...data, creationMethod: 'duplicate' }),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Specifications (เดิม — ไม่แก้)
  // ═══════════════════════════════════════════════════════════════

  async getInspectionSpecs() {
    return this.request('/inspection-specs');
  }

  async saveInspectionSpecs(specs) {
    return this.request('/inspection-specs', {
      method: 'POST',
      body: JSON.stringify(specs),
    });
  }

  async getSpecsByMaterialType(materialType) {
    return this.request(`/inspection-specs/material-type/${materialType}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // Approval & Rejection (เดิม — ไม่แก้)
  // ═══════════════════════════════════════════════════════════════

  async approveMaterialInspection(id, data) {
    return this.request(`/material-inspections/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async rejectMaterialInspection(id, data) {
    return this.request(`/material-inspections/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Statistics & Dashboard (เดิม — ไม่แก้)
  // ═══════════════════════════════════════════════════════════════

  async getMaterialInspectionStats(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        queryParams.append(key, value);
      }
    });
    return this.request(`/material-inspections/stats?${queryParams.toString()}`);
  }

  async getDashboardData(dateRange = '30d') {
    return this.request(`/dashboard/material-inspections?range=${dateRange}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // Reports & Export (เดิม — ไม่แก้)
  // ═══════════════════════════════════════════════════════════════

  async generateInspectionPDF(id) {
    return this.request(`/material-inspections/${id}/pdf`, { method: 'POST' });
  }

  async exportInspections(filters = {}, format = 'excel') {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        queryParams.append(key, value);
      }
    });
    queryParams.append('format', format);
    return this.request(`/material-inspections/export?${queryParams.toString()}`, { method: 'POST' });
  }

  // ═══════════════════════════════════════════════════════════════
  // File, Suppliers, Grades, Inspectors, etc (เดิม — ไม่แก้)
  // ═══════════════════════════════════════════════════════════════

  async uploadFile(file, type = 'inspection') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return this.request('/files/upload', { method: 'POST', headers: { 'Content-Type': undefined }, body: formData });
  }

  async deleteFile(fileId) { return this.request(`/files/${fileId}`, { method: 'DELETE' }); }
  async getSuppliers() { return this.request('/suppliers'); }
  async createSupplier(data) { return this.request('/suppliers', { method: 'POST', body: JSON.stringify(data) }); }
  async getMaterialGrades() { return this.request('/material-grades'); }
  async createMaterialGrade(data) { return this.request('/material-grades', { method: 'POST', body: JSON.stringify(data) }); }
  async getInspectors() { return this.request('/inspectors'); }
  async getInspectorById(id) { return this.request(`/inspectors/${id}`); }

  async searchSuppliers(query) { return this.request(`/suppliers/search?q=${encodeURIComponent(query)}`); }
  async searchMaterialGrades(query) { return this.request(`/material-grades/search?q=${encodeURIComponent(query)}`); }
  async searchLotNumbers(query) { return this.request(`/lot-numbers/search?q=${encodeURIComponent(query)}`); }

  async getSystemSettings() { return this.request('/settings'); }
  async updateSystemSettings(settings) { return this.request('/settings', { method: 'PUT', body: JSON.stringify(settings) }); }
  async getNotifications() { return this.request('/notifications'); }
  async markNotificationRead(id) { return this.request(`/notifications/${id}/read`, { method: 'POST' }); }

  async getAuditLog(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        queryParams.append(key, value);
      }
    });
    return this.request(`/audit-log?${queryParams.toString()}`);
  }
}

// API Error Handler
export class APIError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.response = response;
  }
}

// Create and export singleton instance
const apiClient = new APIClient();
export default apiClient;

// Custom hooks for API calls
export const useAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const makeRequest = useCallback(async (apiCall) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { makeRequest, loading, error };
};