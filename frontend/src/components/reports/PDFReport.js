// components/reports/PDFReport.js - PDF Report Generator for Material Inspections
import React, { useRef, useEffect, useState } from 'react';
import { 
  FileText, Download, Printer, Share2, Eye, 
  CheckCircle, XCircle, Clock, AlertTriangle 
} from 'lucide-react';

const PDFReport = ({ inspection, specs, onClose, companyInfo }) => {
  const printRef = useRef();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Default company info if not provided
  const defaultCompanyInfo = {
    name: 'Steel Manufacturing Co., Ltd.',
    address: '123 Industrial Zone, Bangkok, Thailand',
    phone: '+66 2 xxx xxxx',
    email: 'quality@steelco.com',
    logo: '/assets/company-logo.png'
  };

  const company = companyInfo || defaultCompanyInfo;

  useEffect(() => {
    generateReportData();
  }, [inspection, specs]);

  const generateReportData = () => {
    const currentDate = new Date();
    
    setReportData({
      reportNumber: `RPT-${inspection.inspectionNumber}-${currentDate.getFullYear()}`,
      generatedAt: currentDate.toISOString(),
      generatedBy: 'System User', // Should come from current user
      inspection,
      specs,
      summary: calculateSummary()
    });
  };

  const calculateSummary = () => {
    const results = inspection.calculatedResults || {};
    const totalChecks = Object.keys(results).filter(key => 
      key !== 'overallResult' && key !== 'passRate' && results[key].status !== 'pending'
    ).length;
    
    const passedChecks = Object.keys(results).filter(key => 
      key !== 'overallResult' && key !== 'passRate' && results[key].status === 'pass'
    ).length;

    return {
      totalChecks,
      passedChecks,
      failedChecks: totalChecks - passedChecks,
      passRate: totalChecks > 0 ? ((passedChecks / totalChecks) * 100).toFixed(1) : 0
    };
  };

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    
    try {
      // In a real application, you would use a library like jsPDF or html2pdf
      // For now, we'll simulate the PDF generation
      
      // Option 1: Using window.print() for simple PDF generation
      window.print();
      
      // Option 2: Using html2pdf library (would need to be installed)
      /*
      const html2pdf = (await import('html2pdf.js')).default;
      const element = printRef.current;
      const opt = {
        margin: 1,
        filename: `Inspection_Report_${inspection.inspectionNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      html2pdf().set(opt).from(element).save();
      */
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Inspection Report - ${inspection.inspectionNumber}`,
          text: `Material inspection report for ${inspection.materialGrade}`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Sharing failed:', error);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      alert('Report URL copied to clipboard');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return <CheckCircle className="status-icon pass" size={16} />;
      case 'fail': return <XCircle className="status-icon fail" size={16} />;
      case 'pending': return <Clock className="status-icon pending" size={16} />;
      default: return <AlertTriangle className="status-icon warning" size={16} />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pass': return 'status-pass';
      case 'fail': return 'status-fail';
      case 'pending': return 'status-pending';
      default: return 'status-warning';
    }
  };

  if (!reportData) {
    return <div className="loading">Generating report...</div>;
  }

  return (
    <div className="pdf-report-container">
      {/* Print Actions - Hidden when printing */}
      <div className="report-actions no-print">
        <div className="actions-left">
          <h3>📄 Inspection Report Preview</h3>
          <p>Report #{reportData.reportNumber}</p>
        </div>
        <div className="actions-right">
          <button className="btn btn-outline" onClick={handleShare}>
            <Share2 size={16} />
            Share
          </button>
          <button className="btn btn-outline" onClick={handlePrint}>
            <Printer size={16} />
            Print
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleGeneratePDF}
            disabled={isGenerating}
          >
            <Download size={16} />
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* PDF Content */}
      <div ref={printRef} className="pdf-content">
        {/* Header */}
        <div className="report-header">
          <div className="company-info">
            <img src={company.logo} alt="Company Logo" className="company-logo" />
            <div className="company-details">
              <h1>{company.name}</h1>
              <p>{company.address}</p>
              <p>Tel: {company.phone} | Email: {company.email}</p>
            </div>
          </div>
          <div className="report-info">
            <h2>MATERIAL INSPECTION REPORT</h2>
            <table className="report-meta">
              <tr>
                <td><strong>Report No:</strong></td>
                <td>{reportData.reportNumber}</td>
              </tr>
              <tr>
                <td><strong>Inspection No:</strong></td>
                <td>{inspection.inspectionNumber}</td>
              </tr>
              <tr>
                <td><strong>Generated:</strong></td>
                <td>{new Date(reportData.generatedAt).toLocaleString()}</td>
              </tr>
              <tr>
                <td><strong>Generated By:</strong></td>
                <td>{reportData.generatedBy}</td>
              </tr>
            </table>
          </div>
        </div>

        {/* Material Information */}
        <div className="report-section">
          <h3>📦 Material Information</h3>
          <div className="info-grid">
            <div className="info-row">
              <span className="label">Material Grade:</span>
              <span className="value">{inspection.materialGrade}</span>
            </div>
            <div className="info-row">
              <span className="label">Batch Number:</span>
              <span className="value">{inspection.batch?.batchNumber || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="label">Lot Number:</span>
              <span className="value">{inspection.lotNumber || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="label">Supplier:</span>
              <span className="value">{inspection.supplierName}</span>
            </div>
            <div className="info-row">
              <span className="label">Received Quantity:</span>
              <span className="value">{inspection.receivedQuantity?.toLocaleString()} kg</span>
            </div>
            <div className="info-row">
              <span className="label">Received Date:</span>
              <span className="value">{inspection.receivedAt ? new Date(inspection.receivedAt).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Inspection Details */}
        <div className="report-section">
          <h3>🔍 Inspection Details</h3>
          <div className="info-grid">
            <div className="info-row">
              <span className="label">Inspector:</span>
              <span className="value">
                {inspection.inspector ? 
                  `${inspection.inspector.firstName} ${inspection.inspector.lastName}` : 
                  'N/A'
                }
              </span>
            </div>
            <div className="info-row">
              <span className="label">Inspection Date:</span>
              <span className="value">
                {inspection.inspectedAt ? 
                  new Date(inspection.inspectedAt).toLocaleDateString() : 
                  'Not yet inspected'
                }
              </span>
            </div>
            <div className="info-row">
              <span className="label">Overall Result:</span>
              <span className={`value ${getStatusClass(inspection.overallResult)}`}>
                {getStatusIcon(inspection.overallResult)}
                {(inspection.overallResult || 'pending').toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Inspection Results */}
        <div className="report-section">
          <h3>📊 Inspection Results</h3>
          
          {/* OD Check */}
          {specs.odCheck?.required && (
            <div className="check-section">
              <h4>📏 Outside Diameter (OD) Check</h4>
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Specification</th>
                    <th>Measured Value</th>
                    <th>Deviation</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>OD Measurement</td>
                    <td>
                      {specs.odCheck.minValue} - {specs.odCheck.maxValue} {specs.odCheck.unit}
                      <br />
                      <small>Tolerance: ±{specs.odCheck.tolerance} {specs.odCheck.unit}</small>
                    </td>
                    <td>
                      {inspection.calculatedResults?.odCheck?.value || 'N/A'} {specs.odCheck.unit}
                    </td>
                    <td>
                      {inspection.calculatedResults?.odCheck?.deviation ? 
                        `±${inspection.calculatedResults.odCheck.deviation.toFixed(3)} ${specs.odCheck.unit}` : 
                        'N/A'
                      }
                    </td>
                    <td className={getStatusClass(inspection.calculatedResults?.odCheck?.status)}>
                      {getStatusIcon(inspection.calculatedResults?.odCheck?.status)}
                      {(inspection.calculatedResults?.odCheck?.status || 'pending').toUpperCase()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Length Check */}
          {specs.lengthCheck?.required && (
            <div className="check-section">
              <h4>📐 Length Check</h4>
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Specification</th>
                    <th>Measured Value</th>
                    <th>Deviation</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Length Measurement</td>
                    <td>
                      {specs.lengthCheck.minValue} - {specs.lengthCheck.maxValue} {specs.lengthCheck.unit}
                      <br />
                      <small>Tolerance: ±{specs.lengthCheck.tolerance} {specs.lengthCheck.unit}</small>
                    </td>
                    <td>
                      {inspection.calculatedResults?.lengthCheck?.value || 'N/A'} {specs.lengthCheck.unit}
                    </td>
                    <td>
                      {inspection.calculatedResults?.lengthCheck?.deviation ? 
                        `±${inspection.calculatedResults.lengthCheck.deviation.toFixed(1)} ${specs.lengthCheck.unit}` : 
                        'N/A'
                      }
                    </td>
                    <td className={getStatusClass(inspection.calculatedResults?.lengthCheck?.status)}>
                      {getStatusIcon(inspection.calculatedResults?.lengthCheck?.status)}
                      {(inspection.calculatedResults?.lengthCheck?.status || 'pending').toUpperCase()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Visual Inspection */}
          {specs.visualInspection?.required && (
            <div className="check-section">
              <h4>👁️ Visual Inspection</h4>
              <div className="visual-checks">
                <div className="check-grid">
                  {specs.visualInspection.checkCracks && (
                    <div className="check-item">
                      <span className="check-label">🔍 Cracks:</span>
                      <span className={`check-result ${inspection.calculatedResults?.visualInspection?.defects?.includes('cracks') ? 'fail' : 'pass'}`}>
                        {inspection.calculatedResults?.visualInspection?.defects?.includes('cracks') ? 'DETECTED' : 'NOT DETECTED'}
                      </span>
                    </div>
                  )}
                  {specs.visualInspection.checkGrinding && (
                    <div className="check-item">
                      <span className="check-label">⚙️ Grinding Marks:</span>
                      <span className={`check-result ${inspection.calculatedResults?.visualInspection?.defects?.includes('grinding_marks') ? 'fail' : 'pass'}`}>
                        {inspection.calculatedResults?.visualInspection?.defects?.includes('grinding_marks') ? 'DETECTED' : 'NOT DETECTED'}
                      </span>
                    </div>
                  )}
                  {specs.visualInspection.checkBurr && (
                    <div className="check-item">
                      <span className="check-label">🔧 Burr:</span>
                      <span className={`check-result ${inspection.calculatedResults?.visualInspection?.defects?.includes('burr') ? 'fail' : 'pass'}`}>
                        {inspection.calculatedResults?.visualInspection?.defects?.includes('burr') ? 'DETECTED' : 'NOT DETECTED'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="visual-overall">
                  <strong>Overall Visual Result: </strong>
                  <span className={getStatusClass(inspection.calculatedResults?.visualInspection?.status)}>
                    {getStatusIcon(inspection.calculatedResults?.visualInspection?.status)}
                    {(inspection.calculatedResults?.visualInspection?.status || 'pending').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Packaging Check */}
          {specs.packagingCheck?.required && (
            <div className="check-section">
              <h4>📦 Packaging Check</h4>
              <div className="packaging-checks">
                <div className="check-grid">
                  {specs.packagingCheck.checkCondition && (
                    <div className="check-item">
                      <span className="check-label">📦 Package Condition:</span>
                      <span className={`check-result ${inspection.calculatedResults?.packagingCheck?.issues?.includes('damaged_packaging') ? 'fail' : 'pass'}`}>
                        {inspection.calculatedResults?.packagingCheck?.issues?.includes('damaged_packaging') ? 'DAMAGED' : 'GOOD'}
                      </span>
                    </div>
                  )}
                  {specs.packagingCheck.checkLabeling && (
                    <div className="check-item">
                      <span className="check-label">🏷️ Labeling:</span>
                      <span className={`check-result ${inspection.calculatedResults?.packagingCheck?.issues?.includes('incorrect_labeling') ? 'fail' : 'pass'}`}>
                        {inspection.calculatedResults?.packagingCheck?.issues?.includes('incorrect_labeling') ? 'INCORRECT' : 'CORRECT'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="packaging-overall">
                  <strong>Overall Packaging Result: </strong>
                  <span className={getStatusClass(inspection.calculatedResults?.packagingCheck?.status)}>
                    {getStatusIcon(inspection.calculatedResults?.packagingCheck?.status)}
                    {(inspection.calculatedResults?.packagingCheck?.status || 'pending').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="report-section">
          <h3>📈 Inspection Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Total Checks Performed:</span>
              <span className="summary-value">{reportData.summary.totalChecks}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Checks Passed:</span>
              <span className="summary-value pass">{reportData.summary.passedChecks}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Checks Failed:</span>
              <span className="summary-value fail">{reportData.summary.failedChecks}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Pass Rate:</span>
              <span className="summary-value">{reportData.summary.passRate}%</span>
            </div>
          </div>
          
          <div className="final-result">
            <h4>Final Inspection Result:</h4>
            <div className={`result-badge ${getStatusClass(inspection.overallResult)}`}>
              {getStatusIcon(inspection.overallResult)}
              <span className="result-text">
                {(inspection.overallResult || 'pending').toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Notes and Comments */}
        {inspection.notes && (
          <div className="report-section">
            <h3>📝 Notes and Comments</h3>
            <div className="notes-content">
              {inspection.notes}
            </div>
          </div>
        )}

        {/* Approval Section */}
        <div className="report-section">
          <h3>✅ Approval</h3>
          <div className="approval-grid">
            <div className="approval-item">
              <span className="label">Approved By:</span>
              <span className="value">{inspection.approvedBy || 'Pending'}</span>
            </div>
            <div className="approval-item">
              <span className="label">Approval Date:</span>
              <span className="value">
                {inspection.approvedAt ? 
                  new Date(inspection.approvedAt).toLocaleDateString() : 
                  'Pending'
                }
              </span>
            </div>
            <div className="approval-item">
              <span className="label">Status:</span>
              <span className={`value ${getStatusClass(inspection.approvalStatus || 'pending')}`}>
                {(inspection.approvalStatus || 'pending').toUpperCase()}
              </span>
            </div>
          </div>
          
          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-line"></div>
              <p>Inspector Signature</p>
            </div>
            <div className="signature-box">
              <div className="signature-line"></div>
              <p>Quality Manager Signature</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="report-footer">
          <div className="footer-content">
            <p>This report is generated automatically by the Material Inspection System.</p>
            <p>Report generated on {new Date(reportData.generatedAt).toLocaleString()}</p>
            <p className="confidential">CONFIDENTIAL - For internal use only</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFReport;