// utils/api.js - Enhanced API Client with New Endpoints
import React, { useState, useCallback } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('authToken');
  }
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

  // Material Inspections - Enhanced
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

  // Quick Create
  async quickCreateInspection(data) {
    return this.request('/Materialinspections/quick-create', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        creationMethod: 'quick'
      }),
    });
  }

  // Bulk Import
  async bulkImportInspections(formData) {
    return this.request('/Materialinspections/bulk-import', {
      method: 'POST',
      headers: {
        // Remove Content-Type to let browser set it with boundary for FormData
        'Content-Type': undefined,
      },
      body: formData,
    });
  }

  async validateImportFile(formData) {
    return this.request('/Materialinspections/validate-import', {
      method: 'POST',
      headers: {
        'Content-Type': undefined,
      },
      body: formData,
    });
  }

  // Templates
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
      body: JSON.stringify({
        templateId,
        ...data,
        creationMethod: 'template'
      }),
    });
  }

  // Duplicate
  async duplicateInspection(originalId, data) {
    return this.request('/material-inspections/duplicate', {
      method: 'POST',
      body: JSON.stringify({
        originalInspectionId: originalId,
        ...data,
        creationMethod: 'duplicate'
      }),
    });
  }

  // Specifications
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

  // Approval & Rejection
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

  // Statistics & Dashboard
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

  // Reports & Export
  async generateInspectionPDF(id) {
    return this.request(`/material-inspections/${id}/pdf`, {
      method: 'POST',
    });
  }

  async exportInspections(filters = {}, format = 'excel') {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        queryParams.append(key, value);
      }
    });

    queryParams.append('format', format);

    return this.request(`/material-inspections/export?${queryParams.toString()}`, {
      method: 'POST',
    });
  }

  // File Upload
  async uploadFile(file, type = 'inspection') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.request('/files/upload', {
      method: 'POST',
      headers: {
        'Content-Type': undefined,
      },
      body: formData,
    });
  }

  async deleteFile(fileId) {
    return this.request(`/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  // Suppliers
  async getSuppliers() {
    return this.request('/suppliers');
  }

  async createSupplier(data) {
    return this.request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Material Grades
  async getMaterialGrades() {
    return this.request('/material-grades');
  }

  async createMaterialGrade(data) {
    return this.request('/material-grades', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Inspectors
  async getInspectors() {
    return this.request('/inspectors');
  }

  async getInspectorById(id) {
    return this.request(`/inspectors/${id}`);
  }

  // Auto-complete & Search
  async searchSuppliers(query) {
    return this.request(`/suppliers/search?q=${encodeURIComponent(query)}`);
  }

  async searchMaterialGrades(query) {
    return this.request(`/material-grades/search?q=${encodeURIComponent(query)}`);
  }

  async searchLotNumbers(query) {
    return this.request(`/lot-numbers/search?q=${encodeURIComponent(query)}`);
  }

  // System Settings
  async getSystemSettings() {
    return this.request('/settings');
  }

  async updateSystemSettings(settings) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Notifications
  async getNotifications() {
    return this.request('/notifications');
  }

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  // Audit Log
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

// Backend API Routes Documentation
/*
Required Backend Routes:

POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/material-inspections
POST   /api/material-inspections
GET    /api/material-inspections/:id
PUT    /api/material-inspections/:id
DELETE /api/material-inspections/:id
POST   /api/material-inspections/quick-create
POST   /api/material-inspections/bulk-import
POST   /api/material-inspections/validate-import
POST   /api/material-inspections/from-template
POST   /api/material-inspections/duplicate
POST   /api/material-inspections/:id/approve
POST   /api/material-inspections/:id/reject
POST   /api/material-inspections/:id/pdf
POST   /api/material-inspections/export
GET    /api/material-inspections/stats

GET    /api/inspection-templates
POST   /api/inspection-templates
GET    /api/inspection-templates/:id
PUT    /api/inspection-templates/:id
DELETE /api/inspection-templates/:id

GET    /api/inspection-specs
POST   /api/inspection-specs
GET    /api/inspection-specs/material-type/:type

GET    /api/suppliers
POST   /api/suppliers
GET    /api/suppliers/search

GET    /api/material-grades
POST   /api/material-grades
GET    /api/material-grades/search

GET    /api/inspectors
GET    /api/inspectors/:id

POST   /api/files/upload
DELETE /api/files/:id

GET    /api/dashboard/material-inspections
GET    /api/notifications
POST   /api/notifications/:id/read
GET    /api/audit-log
GET    /api/settings
PUT    /api/settings

Database Schema Requirements:

material_inspections:
- id (primary key)
- inspection_number (unique)
- lot_number
- batch_number
- material_type (enum: steel_bar, steel_pipe, hardened_work)
- material_grade
- supplier_name
- supplier_id (foreign key)
- received_quantity
- received_date
- measurements (json)
- inspection_specs (json)
- calculated_results (json)
- overall_result (enum: pass, fail, pending)
- status (enum: pending, approved, rejected)
- inspector_id (foreign key)
- approver_id (foreign key)
- creation_method (enum: single, quick, bulk, template, duplicate)
- template_id (foreign key, nullable)
- original_inspection_id (foreign key, nullable)
- notes
- inspector_notes
- approval_notes
- rejection_notes
- created_at
- updated_at
- inspected_at
- approved_at
- rejected_at

inspection_templates:
- id (primary key)
- name
- material_type
- material_grade
- specs (json)
- description
- created_by (foreign key)
- created_at
- updated_at

inspection_specs:
- id (primary key)
- material_type
- specs (json)
- created_by (foreign key)
- created_at
- updated_at

suppliers:
- id (primary key)
- name
- contact_person
- email
- phone
- address
- rating
- created_at
- updated_at

material_grades:
- id (primary key)
- code
- name
- description
- material_type
- created_at
- updated_at

users (inspectors):
- id (primary key)
- username
- email
- first_name
- last_name
- role
- permissions (json)
- certification
- created_at
- updated_at

files:
- id (primary key)
- filename
- original_name
- mime_type
- size
- path
- inspection_id (foreign key)
- uploaded_by (foreign key)
- created_at

audit_logs:
- id (primary key)
- entity_type
- entity_id
- action
- old_values (json)
- new_values (json)
- user_id (foreign key)
- ip_address
- user_agent
- created_at
*/