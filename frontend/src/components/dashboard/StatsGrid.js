// Frontend React Components Examples

// components/dashboard/StatsGrid.js - Statistics Grid Component
import React from 'react';
import StatCard from '../ui/StatCard';
import './StatsGrid.css';

const StatsGrid = ({ stats }) => {
  if (!stats) return <div className="stats-loading">Loading statistics...</div>;

  const { production, quality } = stats;

  return (
    <div className="stats-grid">
      <div className="stats-row">
        <StatCard
          title="Total Batches"
          value={production.totalBatches}
          icon="📦"
          color="blue"
          trend="+5%"
        />
        <StatCard
          title="Active Batches"
          value={production.activeBatches}
          icon="⚡"
          color="orange"
          trend="+2%"
        />
        <StatCard
          title="Production Efficiency"
          value={`${production.efficiency}%`}
          icon="📈"
          color={production.efficiency >= 90 ? 'green' : production.efficiency >= 80 ? 'orange' : 'red'}
          trend={production.efficiency >= 90 ? '+1.2%' : '-0.5%'}
        />
        <StatCard
          title="Monthly Production"
          value={`${production.monthlyProduction.toLocaleString()} kg`}
          icon="🏭"
          color="purple"
          trend="+8.5%"
        />
      </div>
      
      <div className="stats-row">
        <StatCard
          title="Quality Rate"
          value={`${quality.qualityRate}%`}
          icon="✅"
          color={quality.qualityRate >= 95 ? 'green' : quality.qualityRate >= 90 ? 'orange' : 'red'}
          trend={quality.qualityRate >= 95 ? '+0.3%' : '-0.2%'}
        />
        <StatCard
          title="Pending Inspections"
          value={quality.pendingInspections}
          icon="⏳"
          color={quality.pendingInspections <= 5 ? 'green' : quality.pendingInspections <= 10 ? 'orange' : 'red'}
        />
        <StatCard
          title="Failed Inspections"
          value={quality.failedInspections}
          icon="❌"
          color={quality.failedInspections === 0 ? 'green' : quality.failedInspections <= 3 ? 'orange' : 'red'}
        />
        <StatCard
          title="Critical Alerts"
          value={quality.criticalAlerts}
          icon="🚨"
          color={quality.criticalAlerts === 0 ? 'green' : 'red'}
          urgent={quality.criticalAlerts > 0}
        />
      </div>
    </div>
  );
};

export default StatsGrid;