
// src/components/ui/StatCard.js
import React from 'react';
import './StatCard.css';

const StatCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  color = 'blue',
  subtitle,
  onClick 
}) => {
  const getTrendIcon = (trend) => {
    if (!trend) return null;
    
    if (trend.direction === 'up') {
      return <span className="trend-icon trend-up">↗</span>;
    } else if (trend.direction === 'down') {
      return <span className="trend-icon trend-down">↘</span>;
    } else {
      return <span className="trend-icon trend-stable">→</span>;
    }
  };

  const getTrendText = (trend) => {
    if (!trend) return null;
    
    const sign = trend.value > 0 ? '+' : '';
    return `${sign}${trend.value}${trend.unit || '%'}`;
  };

  const getTrendClass = (trend) => {
    if (!trend) return '';
    
    if (trend.direction === 'up') {
      return trend.isPositive !== false ? 'trend-positive' : 'trend-negative';
    } else if (trend.direction === 'down') {
      return trend.isPositive !== false ? 'trend-negative' : 'trend-positive';
    }
    return 'trend-neutral';
  };

  return (
    <div 
      className={`stat-card stat-card-${color} ${onClick ? 'stat-card-clickable' : ''}`}
      onClick={onClick}
    >
      <div className="stat-card-header">
        <div className="stat-card-icon">
          {icon}
        </div>
        {trend && (
          <div className={`stat-card-trend ${getTrendClass(trend)}`}>
            {getTrendIcon(trend)}
            <span className="trend-value">{getTrendText(trend)}</span>
          </div>
        )}
      </div>
      
      <div className="stat-card-content">
        <div className="stat-card-value">
          {value}
        </div>
        <div className="stat-card-title">
          {title}
        </div>
        {subtitle && (
          <div className="stat-card-subtitle">
            {subtitle}
          </div>
        )}
      </div>
      
      {trend && trend.description && (
        <div className="stat-card-footer">
          <span className="trend-description">{trend.description}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;