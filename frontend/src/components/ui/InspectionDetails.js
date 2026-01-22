// components/ui/InspectionDetails.js
import React from 'react';
import './InspectionDetails.css';

const InspectionDetails = ({ inspection, onEdit, onClose, loading = false }) => {
  if (!inspection) {
    return (
      <div className="inspection-details-empty">
        <p>No inspection data available</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'passed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'pending': return '#f59e0b';
      case 'requires_retest': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      case 'requires_retest': return '🔄';
      default: return '❓';
    }
  };

  const getQualityScoreColor = (score) => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#f59e0b';
    return '#ef4444';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatNumber = (number, decimals = 2) => {
    if (number === null || number === undefined || number === '') return 'N/A';
    return Number(number).toFixed(decimals);
  };

  if (loading) {
    return (
      <div className="inspection-details-loading">
        <div className="loading-spinner"></div>
        <p>Loading inspection details...</p>
      </div>
    );
  }

  return (
    <div className="inspection-details">
      <div className="details-header">
        <div className="header-left">
          <h2>Inspection Details</h2>
          <div className="batch-info">
            <span className="batch-number">#{inspection.batchNumber || 'Unknown'}</span>
            <span 
              className="status-badge"
              style={{ backgroundColor: getStatusColor(inspection.status) }}
            >
              {getStatusIcon(inspection.status)} {inspection.status?.replace('_', ' ') || 'Unknown'}
            </span>
          </div>
        </div>
        <div className="header-actions">
          {onEdit && (
            <button onClick={onEdit} className="btn btn-secondary">
              Edit
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="btn-close">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="details-content">
        {/* Basic Information */}
        <section className="details-section">
          <h3 className="section-title">Basic Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Material Type</label>
              <span>{inspection.materialType || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Supplier</label>
              <span>{inspection.supplierName || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Inspection Date</label>
              <span>{formatDate(inspection.inspectionDate)}</span>
            </div>
            <div className="info-item">
              <label>Inspector</label>
              <span>{inspection.inspectorName || 'N/A'}</span>
            </div>
          </div>
        </section>

        {/* Quality Score */}
        <section className="details-section">
          <h3 className="section-title">Quality Assessment</h3>
          <div className="quality-score-display">
            <div className="score-circle">
              <div 
                className="score-progress"
                style={{ 
                  background: `conic-gradient(${getQualityScoreColor(inspection.qualityScore)} ${(inspection.qualityScore || 0) * 3.6}deg, #f3f4f6 0deg)`
                }}
              >
                <div className="score-inner">
                  <span className="score-value">{inspection.qualityScore || 0}</span>
                  <span className="score-unit">%</span>
                </div>
              </div>
            </div>
            <div className="score-info">
              <h4>Quality Score</h4>
              <p className="score-description">
                {inspection.qualityScore >= 90 ? 'Excellent quality' :
                 inspection.qualityScore >= 75 ? 'Good quality' :
                 inspection.qualityScore >= 60 ? 'Acceptable quality' : 'Poor quality'}
              </p>
            </div>
          </div>
        </section>

        {/* Dimensions */}
        {inspection.dimensions && Object.values(inspection.dimensions).some(v => v) && (
          <section className="details-section">
            <h3 className="section-title">Dimensions (mm)</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Length</label>
                <span>{formatNumber(inspection.dimensions.length)} mm</span>
              </div>
              <div className="info-item">
                <label>Width</label>
                <span>{formatNumber(inspection.dimensions.width)} mm</span>
              </div>
              <div className="info-item">
                <label>Height</label>
                <span>{formatNumber(inspection.dimensions.height)} mm</span>
              </div>
            </div>
          </section>
        )}

        {/* Test Results */}
        {inspection.testResults && Object.values(inspection.testResults).some(v => v) && (
          <section className="details-section">
            <h3 className="section-title">Test Results</h3>
            <div className="test-results">
              <div className="test-item">
                <div className="test-header">
                  <label>Tensile Strength</label>
                  <span className="test-value">{formatNumber(inspection.testResults.tensileStrength)} MPa</span>
                </div>
                <div className="test-bar">
                  <div 
                    className="test-progress"
                    style={{ width: `${Math.min((inspection.testResults.tensileStrength / 500) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="test-item">
                <div className="test-header">
                  <label>Flexibility</label>
                  <span className="test-value">{formatNumber(inspection.testResults.flexibility)}/10</span>
                </div>
                <div className="test-bar">
                  <div 
                    className="test-progress"
                    style={{ width: `${(inspection.testResults.flexibility / 10) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="test-item">
                <div className="test-header">
                  <label>Durability</label>
                  <span className="test-value">{formatNumber(inspection.testResults.durability)}/10</span>
                </div>
                <div className="test-bar">
                  <div 
                    className="test-progress"
                    style={{ width: `${(inspection.testResults.durability / 10) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Defects */}
        {inspection.defects && inspection.defects.length > 0 && (
          <section className="details-section">
            <h3 className="section-title">
              Defects ({inspection.defects.length})
            </h3>
            <div className="defects-list">
              {inspection.defects.map((defect, index) => (
                <div key={index} className="defect-item">
                  <span className="defect-icon">⚠️</span>
                  <span className="defect-text">{defect}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Additional Notes */}
        {inspection.notes && (
          <section className="details-section">
            <h3 className="section-title">Additional Notes</h3>
            <div className="notes-content">
              <p>{inspection.notes}</p>
            </div>
          </section>
        )}

        {/* Images */}
        {inspection.images && inspection.images.length > 0 && (
          <section className="details-section">
            <h3 className="section-title">Images</h3>
            <div className="images-grid">
              {inspection.images.map((image, index) => (
                <div key={index} className="image-item">
                  <img src={image.url || image} alt={`Inspection ${index + 1}`} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Metadata */}
        <section className="details-section metadata">
          <h3 className="section-title">Metadata</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Created</label>
              <span>{formatDate(inspection.createdAt)}</span>
            </div>
            <div className="info-item">
              <label>Updated</label>
              <span>{formatDate(inspection.updatedAt)}</span>
            </div>
            <div className="info-item">
              <label>ID</label>
              <span className="id-text">{inspection.id || 'N/A'}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default InspectionDetails;