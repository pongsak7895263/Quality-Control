// websocket/socketHandler.js - WebSocket Handler
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const RealtimeService = require('../services/dashboard/realtimeService');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
    this.setupMiddleware();
    this.setupEventHandlers();
    this.startRealtimeUpdates();
  }

  setupMiddleware() {
    // Authentication middleware for WebSocket
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id, {
          attributes: { exclude: ['passwordHash'] },
          include: ['role']
        });

        if (!user || !user.isActive) {
          return next(new Error('Authentication error: Invalid token or inactive user'));
        }

        socket.userId = user.id;
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error: ' + error.message));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.user.username} connected (${socket.id})`);
      
      // Store connected user
      this.connectedUsers.set(socket.userId, {
        socketId: socket.id,
        user: socket.user,
        connectedAt: new Date()
      });

      // Join user to personal room
      socket.join(`user_${socket.userId}`);
      
      // Join role-based rooms
      if (socket.user.role) {
        socket.join(`role_${socket.user.role.name.replace(/\s+/g, '_')}`);
      }

      // Handle dashboard subscription
      socket.on('subscribe_dashboard', (data) => {
        socket.join('dashboard_updates');
        console.log(`User ${socket.user.username} subscribed to dashboard updates`);
        
        // Send initial dashboard data
        this.sendDashboardUpdate(socket);
      });

      // Handle inspection updates subscription
      socket.on('subscribe_inspections', (data) => {
        socket.join('inspection_updates');
        console.log(`User ${socket.user.username} subscribed to inspection updates`);
      });

      // Handle quality alerts subscription
      socket.on('subscribe_quality_alerts', (data) => {
        socket.join('quality_alerts');
        console.log(`User ${socket.user.username} subscribed to quality alerts`);
      });

      // Handle custom events
      socket.on('request_realtime_data', async () => {
        try {
          const realtimeData = await RealtimeService.getCurrentMetrics();
          socket.emit('realtime_data_update', realtimeData);
        } catch (error) {
          socket.emit('error', { message: 'Failed to fetch realtime data' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`User ${socket.user.username} disconnected (${reason})`);
        this.connectedUsers.delete(socket.userId);
      });

      // Error handling
      socket.on('error', (error) => {
        console.error(`Socket error for user ${socket.user.username}:`, error);
      });
    });
  }

  // Send dashboard update to specific socket or all dashboard subscribers
  async sendDashboardUpdate(socket = null) {
    try {
      const dashboardData = await RealtimeService.getDashboardData();
      
      if (socket) {
        socket.emit('dashboard_update', dashboardData);
      } else {
        this.io.to('dashboard_updates').emit('dashboard_update', dashboardData);
      }
    } catch (error) {
      console.error('Send dashboard update error:', error);
    }
  }

  // Send quality alert to relevant users
  sendQualityAlert(alert) {
    const alertData = {
      id: alert.id,
      alertCode: alert.alertCode,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      createdAt: alert.createdAt
    };

    // Send to QA Manager and Production Supervisor roles
    this.io.to('role_QA_Manager').emit('quality_alert', alertData);
    this.io.to('role_Production_Supervisor').emit('quality_alert', alertData);
    
    // Send to quality alerts subscribers
    this.io.to('quality_alerts').emit('quality_alert', alertData);
  }

  // Send inspection update
  sendInspectionUpdate(inspectionData) {
    this.io.to('inspection_updates').emit('inspection_update', inspectionData);
  }

  // Send notification to specific user
  sendNotificationToUser(userId, notification) {
    this.io.to(`user_${userId}`).emit('notification', notification);
  }

  // Broadcast system announcement
  broadcastAnnouncement(message, type = 'info') {
    this.io.emit('system_announcement', {
      message,
      type,
      timestamp: new Date().toISOString()
    });
  }

  // Start periodic realtime updates
  startRealtimeUpdates() {
    // Send dashboard updates every 30 seconds
    setInterval(async () => {
      await this.sendDashboardUpdate();
    }, 30000);

    // Send realtime metrics every 10 seconds
    setInterval(async () => {
      try {
        const realtimeData = await RealtimeService.getCurrentMetrics();
        this.io.to('dashboard_updates').emit('realtime_data_update', realtimeData);
      } catch (error) {
        console.error('Realtime update error:', error);
      }
    }, 10000);
  }

  // Get connected users info
  getConnectedUsers() {
    return Array.from(this.connectedUsers.values()).map(conn => ({
      userId: conn.user.id,
      username: conn.user.username,
      role: conn.user.role?.name,
      connectedAt: conn.connectedAt
    }));
  }
}

let socketHandler;

const setupWebSocket = (io) => {
  socketHandler = new SocketHandler(io);
  return socketHandler;
};

const getSocketHandler = () => socketHandler;

module.exports = { setupWebSocket, getSocketHandler };

// services/dashboard/realtimeService.js - Real-time Data Service
const { ProductionBatch, MaterialInspection, ChemicalTest, QualityAlert, Equipment } = require('../../models');
const { Op } = require('sequelize');
const DashboardService = require('./dashboardService');

class RealtimeService {
  // Get current metrics for real-time display
  static async getCurrentMetrics() {
    try {
      const now = new Date();
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const last24Hours = new Date(now - 24 * 60 * 60 * 1000);

      const [
        hourlyProduction,
        dailyQualityMetrics,
        equipmentStatus,
        activeAlerts
      ] = await Promise.all([
        // Production rate current hour
        ProductionBatch.sum('actualQuantity', {
          where: {
            updatedAt: { [Op.gte]: currentHour }
          }
        }),
        
        // Quality metrics last 24 hours
        DashboardService.calculateQualityMetrics('24h'),
        
        // Equipment efficiency
        this.getEquipmentEfficiency(),
        
        // Active quality alerts
        QualityAlert.count({
          where: { status: { [Op.in]: ['open', 'investigating'] } }
        })
      ]);

      return {
        productionRate: Math.round(hourlyProduction || 0),
        qualityRate: Math.round(dailyQualityMetrics.qualityRate),
        equipmentEfficiency: equipmentStatus.efficiency,
        activeAlerts,
        timestamp: now.toISOString(),
        lastUpdated: now.toISOString()
      };
    } catch (error) {
      console.error('Get current metrics error:', error);
      throw error;
    }
  }

  // Get complete dashboard data
  static async getDashboardData() {
    try {
      const [
        productionEfficiency,
        qualityMetrics,
        alertSummary,
        recentActivity
      ] = await Promise.all([
        DashboardService.calculateProductionEfficiency(),
        DashboardService.calculateQualityMetrics(),
        DashboardService.getAlertSummary(),
        this.getRecentActivity(5)
      ]);

      return {
        production: productionEfficiency,
        quality: qualityMetrics,
        alerts: alertSummary,
        recentActivity,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Get dashboard data error:', error);
      throw error;
    }
  }

  // Get equipment efficiency
  static async getEquipmentEfficiency() {
    try {
      const [activeCount, totalCount] = await Promise.all([
        Equipment.count({ where: { status: 'active' } }),
        Equipment.count()
      ]);

      const efficiency = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

      return {
        efficiency,
        activeEquipment: activeCount,
        totalEquipment: totalCount
      };
    } catch (error) {
      console.error('Get equipment efficiency error:', error);
      return { efficiency: 0, activeEquipment: 0, totalEquipment: 0 };
    }
  }

  // Get recent activity
  static async getRecentActivity(limit = 10) {
    try {
      const [recentInspections, recentAlerts] = await Promise.all([
        MaterialInspection.findAll({
          limit,
          order: [['updatedAt', 'DESC']],
          include: [
            { model: ProductionBatch, as: 'batch', attributes: ['batchNumber'] },
            { model: User, as: 'inspector', attributes: ['firstName', 'lastName'] }
          ],
          attributes: ['id', 'inspectionNumber', 'overallResult', 'updatedAt']
        }),
        QualityAlert.findAll({
          limit,
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'alertCode', 'severity', 'title', 'status', 'createdAt']
        })
      ]);

      const activities = [
        ...recentInspections.map(inspection => ({
          type: 'inspection',
          id: `inspection_${inspection.id}`,
          title: `Inspection: ${inspection.inspectionNumber}`,
          description: `Batch: ${inspection.batch?.batchNumber || 'N/A'}`,
          status: inspection.overallResult,
          timestamp: inspection.updatedAt
        })),
        ...recentAlerts.map(alert => ({
          type: 'alert',
          id: `alert_${alert.id}`,
          title: alert.title,
          description: alert.alertCode,
          status: alert.status,
          severity: alert.severity,
          timestamp: alert.createdAt
        }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
       .slice(0, limit);

      return activities;
    } catch (error) {
      console.error('Get recent activity error:', error);
      return [];
    }
  }
}

module.exports = RealtimeService;