// src/utils/pdfUtils.js (with jsPDF)
import jsPDF from 'jspdf';

export const generatePDFReport = (reportData) => {
  const doc = new jsPDF();
  
  // Set document properties
  doc.setProperties({
    title: 'Inspection Report',
    author: 'Quality Management System',
    creator: 'QMS Application'
  });
  
  // Add title
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('Inspection Report', 20, 20);
  
  // Reset font
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  
  // Add report information
  let yPosition = 40;
  const lineHeight = 10;
  
  const addLine = (label, value) => {
    doc.setFont(undefined, 'bold');
    doc.text(`${label}:`, 20, yPosition);
    doc.setFont(undefined, 'normal');
    doc.text(String(value || 'N/A'), 60, yPosition);
    yPosition += lineHeight;
  };
  
  addLine('Report ID', reportData.id);
  addLine('Date', reportData.date);
  addLine('Inspector', reportData.inspector);
  addLine('Status', reportData.status);
  
  // Add details section
  if (reportData.details) {
    yPosition += 10;
    doc.setFont(undefined, 'bold');
    doc.text('Details:', 20, yPosition);
    yPosition += lineHeight;
    
    doc.setFont(undefined, 'normal');
    const lines = doc.splitTextToSize(reportData.details, 170);
    doc.text(lines, 20, yPosition);
  }
  
  // Save the PDF
  const filename = `inspection-report-${reportData.id || new Date().getTime()}.pdf`;
  doc.save(filename);
  
  return filename;
};

// Keep other utility functions
export const formatReportData = (rawData) => {
  return {
    id: rawData.id || Math.random().toString(36).substr(2, 9),
    date: rawData.date || new Date().toISOString().split('T')[0],
    inspector: rawData.inspector || 'Unknown',
    details: rawData.details || 'No details available',
    status: rawData.status || 'Pending'
  };
};

export const validateReportData = (data) => {
  const errors = [];
  
  if (!data.inspector) {
    errors.push('Inspector name is required');
  }
  
  if (!data.date) {
    errors.push('Report date is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const exportToCSV = (data, filename = 'report.csv') => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const pdfUtils = {
  generatePDFReport,
  formatReportData,
  validateReportData,
  exportToCSV
};

export default pdfUtils;