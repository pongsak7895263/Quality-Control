// services/notifications/notificationService.js - Notification Service
const { Notification, User } = require('../../models');
const emailService = require('./emailService');

class NotificationService {
  // ส่งการแจ้งเตือน Quality Alert
  static async sendQualityAlert(alert) {
    try {
      // หาผู้ใช้ที่ต้องได้รับการแจ้งเตือน
      const usersToNotify = await User.findAll({
        include: [{
          model: Role,
          as: 'role',
          where: {
            name: { [Op.in]: ['QA Manager', 'Production Supervisor'] }
          }
        }],
        where: { isActive: true }
      });

      // สร้างการแจ้งเตือนในระบบ
      const notifications = usersToNotify.map(user => ({
        userId: user.id,
        title: alert.title,
        message: alert.description,
        type: this.getSeverityType(alert.severity),
        sourceTable: 'quality_alerts',
        sourceRecordId: alert.id
      }));

      await Notification.bulkCreate(notifications);

      // ส่งอีเมลสำหรับ Alert ที่ Critical
      if (alert.severity === 'critical') {
        const emailPromises = usersToNotify.map(user => 
          emailService.sendQualityAlert(user.email, alert)
        );
        await Promise.all(emailPromises);
      }

      return notifications;
    } catch (error) {
      console.error('Send quality alert error:', error);
      throw error;
    }
  }

  // ส่งการแจ้งเตือนทั่วไป
  static async sendNotification(userId, title, message, type = 'info', sourceData = {}) {
    try {
      const notification = await Notification.create({
        userId,
        title,
        message,
        type,
        sourceTable: sourceData.table || null,
        sourceRecordId: sourceData.recordId || null
      });

      // ส่งผ่าน WebSocket (Real-time)
      // TODO: Implement WebSocket notification
      
      return notification;
    } catch (error) {
      console.error('Send notification error:', error);
      throw error;
    }
  }

  // Helper function
  static getSeverityType(severity) {
    const severityMap = {
      'low': 'info',
      'medium': 'warning',
      'high': 'error',
      'critical': 'error'
    };
    return severityMap[severity] || 'info';
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        where: { id: notificationId, userId }
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      await notification.update({
        isRead: true,
        readAt: new Date()
      });

      return notification;
    } catch (error) {
      console.error('Mark notification as read error:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;