// src/components/dashboard/ActivityFeed.js
import React, { useState, useEffect } from 'react';
import './ActivityFeed.css';

const ActivityFeed = ({ notifications = [] }) => {
  const [filter, setFilter] = useState('all');
  const [isExpanded, setIsExpanded] = useState(false);

  // Mock notifications data if none provided
  const mockNotifications = [
    {
      id: 1,
      type: 'alert',
      title: 'Quality threshold exceeded',
      message: 'Production Line B quality score dropped below 95%',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      severity: 'high',
      source: 'Line B',
      read: false
    },
    {
      id: 2,
      type: 'maintenance',
      title: 'Scheduled maintenance completed',
      message: 'Production Line C maintenance completed successfully',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      severity: 'low',
      source: 'Line C',
      read: true
    },
    {
      id: 3,
      type: 'production',
      title: 'Production target achieved',
      message: 'Production Line A exceeded daily target by 15%',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      severity: 'medium',
      source: 'Line A',
      read: true
    },
    {
      id: 4,
      type: 'alert',
      title: 'Temperature warning',
      message: 'Production Line D temperature reached 85°C',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      severity: 'medium',
      source: 'Line D',
      read: false
    },
    {
      id: 5,
      type: 'inspection',
      title: 'Quality inspection completed',
      message: 'Batch #QC-2024-0891 passed all quality checks',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      severity: 'low',
      source: 'QC Lab',
      read: true
    },
    {
      id: 6,
      type: 'system',
      title: 'System backup completed',
      message: 'Daily system backup completed successfully',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
      severity: 'low',
      source: 'System',
      read: true
    }
  ];

  const allNotifications = notifications.length > 0 ? notifications : mockNotifications;

  const filteredNotifications = filter === 'all' 
    ? allNotifications 
    : allNotifications.filter(notification => notification.type === filter);

  const displayedNotifications = isExpanded 
    ? filteredNotifications 
    : filteredNotifications.slice(0, 5);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'alert': return '⚠️';
      case 'maintenance': return '🔧';
      case 'production': return '📦';
      case 'inspection': return '🔍';
      case 'system': return '⚙️';
      default: return 'ℹ️';
    }
  };

  const getNotificationColor = (severity) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const unreadCount = allNotifications.filter(n => !n.read).length;

  const filterOptions = [
    { value: 'all', label: 'All', count: allNotifications.length },
    { value: 'alert', label: 'Alerts', count: allNotifications.filter(n => n.type === 'alert').length },
    { value: 'maintenance', label: 'Maintenance', count: allNotifications.filter(n => n.type === 'maintenance').length },
    { value: 'production', label: 'Production', count: allNotifications.filter(n => n.type === 'production').length },
    { value: 'inspection', label: 'Inspection', count: allNotifications.filter(n => n.type === 'inspection').length }
  ];

  return (
    <div className="activity-feed">
      <div className="feed-header">
        <div className="header-title">
          <h2>Activity Feed</h2>
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount} unread</span>
          )}
        </div>
        
        <div className="feed-controls">
          <div className="filter-tabs">
            {filterOptions.map(option => (
              <button
                key={option.value}
                className={`filter-tab ${filter === option.value ? 'active' : ''}`}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
                {option.count > 0 && (
                  <span className="count-badge">{option.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="feed-content">
        {displayedNotifications.length === 0 ? (
          <div className="empty-feed">
            <div className="empty-icon">📭</div>
            <p>No {filter !== 'all' ? filter : ''} notifications</p>
          </div>
        ) : (
          <div className="notifications-list">
            {displayedNotifications.map(notification => (
              <div 
                key={notification.id} 
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
              >
                <div className="notification-content">
                  <div className="notification-header">
                    <div className="notification-meta">
                      <span className="notification-icon">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <span 
                        className="severity-indicator"
                        style={{ backgroundColor: getNotificationColor(notification.severity) }}
                      ></span>
                      <span className="notification-source">{notification.source}</span>
                      <span className="notification-timestamp">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>
                    {!notification.read && (
                      <div className="unread-indicator"></div>
                    )}
                  </div>
                  
                  <div className="notification-body">
                    <h4 className="notification-title">{notification.title}</h4>
                    <p className="notification-message">{notification.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredNotifications.length > 5 && (
          <div className="feed-footer">
            <button 
              className="expand-button"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  Show Less
                  <span className="expand-icon">↑</span>
                </>
              ) : (
                <>
                  Show {filteredNotifications.length - 5} More
                  <span className="expand-icon">↓</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;