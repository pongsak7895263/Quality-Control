// src/components/dashboard/RealtimeMonitor.js
import React, { useState, useEffect } from 'react';
import './RealtimeMonitor.css';

const RealtimeMonitor = ({ data }) => {
  const [selectedLine, setSelectedLine] = useState('all');
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    if (data) {
      setLastUpdate(new Date());
    }
  }, [data]);

  // Mock production lines data
  const defaultData = {
    lines: [
      {
        id: 'line-a',
        name: 'Production Line A',
        status: 'running',
        efficiency: 94.2,
        currentProduction: 847,
        targetProduction: 1000,
        temperature: 72.5,
        pressure: 2.1,
        qualityScore: 98.5,
        alerts: 0
      },
      {
        id: 'line-b',
        name: 'Production Line B',
        status: 'running',
        efficiency: 87.8,
        currentProduction: 623,
        targetProduction: 800,
        temperature: 71.2,
        pressure: 2.3,
        qualityScore: 96.2,
        alerts: 1
      },
      {
        id: 'line-c',
        name: 'Production Line C',
        status: 'maintenance',
        efficiency: 0,
        currentProduction: 0,
        targetProduction: 900,
        temperature: 68.0,
        pressure: 0.0,
        qualityScore: 0,
        alerts: 2
      },
      {
        id: 'line-d',
        name: 'Production Line D',
        status: 'running',
        efficiency: 91.5,
        currentProduction: 756,
        targetProduction: 850,
        temperature: 73.8,
        pressure: 2.2,
        qualityScore: 97.8,
        alerts: 0
      }
    ],
    ...data
  };

  const filteredLines = selectedLine === 'all' 
    ? defaultData.lines 
    : defaultData.lines.filter(line => line.id === selectedLine);

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      case 'maintenance': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return '🟢';
      case 'warning': return '🟡';
      case 'error': return '🔴';
      case 'maintenance': return '🔧';
      default: return '⚪';
    }
  };

  const formatLastUpdate = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="realtime-monitor">
      <div className="monitor-header">
        <div className="header-left">
          <h2>Real-time Production Monitor</h2>
          <div className="last-update">
            Last update: {formatLastUpdate(lastUpdate)}
            <div className="update-indicator"></div>
          </div>
        </div>
        
        <div className="line-selector">
          <select 
            value={selectedLine} 
            onChange={(e) => setSelectedLine(e.target.value)}
            className="line-select"
          >
            <option value="all">All Lines</option>
            {defaultData.lines.map(line => (
              <option key={line.id} value={line.id}>
                {line.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="monitor-grid">
        {filteredLines.map(line => (
          <div key={line.id} className="line-card">
            <div className="line-header">
              <div className="line-title">
                <span className="line-icon">{getStatusIcon(line.status)}</span>
                <h3>{line.name}</h3>
              </div>
              <div className="line-status">
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(line.status) }}
                >
                  {line.status.charAt(0).toUpperCase() + line.status.slice(1)}
                </span>
                {line.alerts > 0 && (
                  <span className="alerts-badge">
                    ⚠️ {line.alerts}
                  </span>
                )}
              </div>
            </div>

            <div className="line-metrics">
              <div className="metric-group">
                <div className="metric">
                  <div className="metric-label">Efficiency</div>
                  <div className="metric-value">
                    {line.efficiency.toFixed(1)}%
                    <div 
                      className="metric-bar"
                      style={{ 
                        width: `${line.efficiency}%`,
                        backgroundColor: line.efficiency > 90 ? '#10b981' : line.efficiency > 75 ? '#f59e0b' : '#ef4444'
                      }}
                    ></div>
                  </div>
                </div>

                <div className="metric">
                  <div className="metric-label">Production</div>
                  <div className="metric-value">
                    {line.currentProduction.toLocaleString()} / {line.targetProduction.toLocaleString()}
                    <div className="metric-subtext">
                      {((line.currentProduction / line.targetProduction) * 100).toFixed(1)}% of target
                    </div>
                  </div>
                </div>
              </div>

              <div className="metric-group">
                <div className="metric">
                  <div className="metric-label">Temperature</div>
                  <div className="metric-value">
                    {line.temperature.toFixed(1)}°C
                  </div>
                </div>

                <div className="metric">
                  <div className="metric-label">Pressure</div>
                  <div className="metric-value">
                    {line.pressure.toFixed(1)} bar
                  </div>
                </div>
              </div>

              <div className="metric-group">
                <div className="metric quality-metric">
                  <div className="metric-label">Quality Score</div>
                  <div className="metric-value quality-score">
                    {line.qualityScore.toFixed(1)}%
                    <div className="quality-indicator">
                      {line.qualityScore >= 95 ? '🥇' : line.qualityScore >= 90 ? '🥈' : '🥉'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedLine === 'all' && (
        <div className="monitor-summary">
          <div className="summary-stats">
            <div className="summary-stat">
              <span className="stat-label">Total Lines Active</span>
              <span className="stat-value">
                {defaultData.lines.filter(line => line.status === 'running').length}/
                {defaultData.lines.length}
              </span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Average Efficiency</span>
              <span className="stat-value">
                {(defaultData.lines
                  .filter(line => line.status === 'running')
                  .reduce((acc, line) => acc + line.efficiency, 0) / 
                  defaultData.lines.filter(line => line.status === 'running').length
                ).toFixed(1)}%
              </span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Total Production</span>
              <span className="stat-value">
                {defaultData.lines
                  .reduce((acc, line) => acc + line.currentProduction, 0)
                  .toLocaleString()}
              </span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Active Alerts</span>
              <span className="stat-value alert-count">
                {defaultData.lines.reduce((acc, line) => acc + line.alerts, 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimeMonitor;