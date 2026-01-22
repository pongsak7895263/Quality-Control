// services/notifications/emailService.js - Email Service
const nodemailer = require('nodemailer');
const { logger } = require('../../utils/monitoring');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    this.defaultFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  }

  // Send quality alert email
  async sendQualityAlert(toEmail, alert) {
    try {
      const subject = `Quality Alert: ${alert.severity.toUpperCase()} - ${alert.title}`;
      
      const html = this.generateQualityAlertHTML(alert);
      
      const mailOptions = {
        from: this.defaultFrom,
        to: toEmail,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Quality alert email sent', {
        to: toEmail,
        alertCode: alert.alertCode,
        messageId: result.messageId
      });

      return result;
    } catch (error) {
      logger.error('Failed to send quality alert email', {
        to: toEmail,
        alert: alert.alertCode,
        error: error.message
      });
      throw error;
    }
  }

  // Send inspection report email
  async sendInspectionReport(toEmail, inspection, attachments = []) {
    try {
      const subject = `Inspection Report - ${inspection.inspectionNumber}`;
      
      const html = this.generateInspectionReportHTML(inspection);
      
      const mailOptions = {
        from: this.defaultFrom,
        to: toEmail,
        subject: subject,
        html: html,
        attachments: attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Inspection report email sent', {
        to: toEmail,
        inspectionNumber: inspection.inspectionNumber,
        messageId: result.messageId
      });

      return result;
    } catch (error) {
      logger.error('Failed to send inspection report email', error);
      throw error;
    }
  }

  // Generate quality alert HTML template
  generateQualityAlertHTML(alert) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .alert-critical { border-left: 5px solid #dc3545; }
          .alert-high { border-left: 5px solid #fd7e14; }
          .alert-medium { border-left: 5px solid #ffc107; }
          .alert-low { border-left: 5px solid #28a745; }
          .details { background-color: #f8f9fa; padding: 15px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Quality Control Alert</h2>
        </div>
        <div class="content alert-${alert.severity}">
          <h3>Alert: ${alert.title}</h3>
          <div class="details">
            <p><strong>Alert Code:</strong> ${alert.alertCode}</p>
            <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
            <p><strong>Process Stage:</strong> ${alert.processStage || 'N/A'}</p>
            <p><strong>Detected At:</strong> ${new Date(alert.detectedAt).toLocaleString()}</p>
          </div>
          <p><strong>Description:</strong></p>
          <p>${alert.description}</p>
          <p>Please take immediate action to investigate and resolve this quality issue.</p>
          <hr>
          <p><small>This is an automated message from the Quality Control System.</small></p>
        </div>
      </body>
      </html>
    `;
  }

  // Generate inspection report HTML template
  generateInspectionReportHTML(inspection) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .result-pass { color: #28a745; font-weight: bold; }
          .result-fail { color: #dc3545; font-weight: bold; }
          .details { background-color: #f8f9fa; padding: 15px; margin: 15px 0; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f8f9fa; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Inspection Report</h2>
          <h3>${inspection.inspectionNumber}</h3>
        </div>
        <div class="content">
          <div class="details">
            <p><strong>Batch Number:</strong> ${inspection.batch?.batchNumber || 'N/A'}</p>
            <p><strong>Material Grade:</strong> ${inspection.materialGrade || 'N/A'}</p>
            <p><strong>Overall Result:</strong> 
              <span class="result-${inspection.overallResult}">${inspection.overallResult?.toUpperCase()}</span>
            </p>
            <p><strong>Inspected At:</strong> ${new Date(inspection.inspectedAt).toLocaleString()}</p>
            <p><strong>Inspector:</strong> ${inspection.inspector?.firstName} ${inspection.inspector?.lastName}</p>
          </div>
          
          ${inspection.notes ? `<p><strong>Notes:</strong><br>${inspection.notes}</p>` : ''}
          
          <hr>
          <p><small>Generated automatically by the Quality Control System</small></p>
        </div>
      </body>
      </html>
    `;
  }

  // Test email connection
  async testConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', error);
      return false;
    }
  }
}

module.exports = new EmailService();
