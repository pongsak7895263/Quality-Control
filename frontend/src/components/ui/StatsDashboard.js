// components/ui/StatsDashboard.js - Material Inspection Statistics Dashboard
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart,
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, Users, Package, 
  CheckCircle, XCircle, Clock, AlertTriangle, Filter,
  Calendar, Download, RefreshCw 
} from 'lucide-react';

const StatsDashboard = ({ data, stats, filters, onFilterChange }) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('results');
  const [loading, setLoading] = useState(false);

  // Color schemes for charts
  const COLORS = {
    pass: '#10B981',
    fail: '#EF4444', 
    pending: '#F59E0B',
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#06B6D4'
  };

  const PIE_COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6'];

  // Calculate derived statistics
  const derivedStats = useMemo(() => {
    const total = data.length;
    const passCount = data.filter(item => item.overallResult === 'pass').length;
    const failCount = data.filter(item => item.overallResult === 'fail').length;
    const pendingCount = data.filter(item => item.overallResult === 'pending').length;
    
    const passRate = total > 0 ? ((passCount / total) * 100).toFixed(1) : 0;
    const failRate = total > 0 ? ((failCount / total) * 100).toFixed(1) : 0;
    
    // Calculate trends (mock data - in real app, compare with previous period)
    const passRateTrend = Math.random() > 0.5 ? 'up' : 'down';
    const passRateChange = (Math.random() * 10).toFixed(1);
    
    return {
      total,
      passCount,
      failCount,
      pendingCount,
      passRate: parseFloat(passRate),
      failRate: parseFloat(failRate),
      passRateTrend,
      passRateChange: parseFloat(passRateChange)
    };
  }, [data]);

  // Prepare chart data
  const resultDistribution = [
    { name: 'Pass', value: derivedStats.passCount, color: COLORS.pass },
    { name: 'Fail', value: derivedStats.failCount, color: COLORS.fail },
    { name: 'Pending', value: derivedStats.pendingCount, color: COLORS.pending }
  ];

  const materialTypeStats = useMemo(() => {
    const materialTypes = {};
    data.forEach(item => {
      const type = item.materialGrade || 'Unknown';
      if (!materialTypes[type]) {
        materialTypes[type] = { pass: 0, fail: 0, pending: 0, total: 0 };
      }
      materialTypes[type][item.overallResult || 'pending']++;
      materialTypes[type].total++;
    });

    return Object.entries(materialTypes).map(([name, counts]) => ({
      name,
      pass: counts.pass,
      fail: counts.fail,
      pending: counts.pending,
      total: counts.total,
      passRate: counts.total > 0 ? ((counts.pass / counts.total) * 100).toFixed(1) : 0
    }));
  }, [data]);

  const supplierStats = useMemo(() => {
    const suppliers = {};
    data.forEach(item => {
      const supplier = item.supplierName || 'Unknown';
      if (!suppliers[supplier]) {
        suppliers[supplier] = { pass: 0, fail: 0, pending: 0, total: 0, quantities: [] };
      }
      suppliers[supplier][item.overallResult || 'pending']++;
      suppliers[supplier].total++;
      if (item.receivedQuantity) {
        suppliers[supplier].quantities.push(item.receivedQuantity);
      }
    });

    return Object.entries(suppliers).map(([name, counts]) => ({
      name,
      pass: counts.pass,
      fail: counts.fail,
      pending: counts.pending,
      total: counts.total,
      passRate: counts.total > 0 ? ((counts.pass / counts.total) * 100).toFixed(1) : 0,
      avgQuantity: counts.quantities.length > 0 ? 
        (counts.quantities.reduce((a, b) => a + b, 0) / counts.quantities.length).toFixed(0) : 0
    })).sort((a, b) => b.total - a.total);
  }, [data]);

  const timeSeriesData = useMemo(() => {
    // Group by date
    const dailyStats = {};
    data.forEach(item => {
      const date = item.inspectedAt ? 
        new Date(item.inspectedAt).toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0];
      
      if (!dailyStats[date]) {
        dailyStats[date] = { date, pass: 0, fail: 0, pending: 0, total: 0 };
      }
      dailyStats[date][item.overallResult || 'pending']++;
      dailyStats[date].total++;
    });

    return Object.values(dailyStats)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(day => ({
        ...day,
        passRate: day.total > 0 ? ((day.pass / day.total) * 100).toFixed(1) : 0
      }));
  }, [data]);

  const inspectorStats = useMemo(() => {
    const inspectors = {};
    data.forEach(item => {
      const inspector = item.inspector ? 
        `${item.inspector.firstName} ${item.inspector.lastName}`.trim() : 
        'Unassigned';
      
      if (!inspectors[inspector]) {
        inspectors[inspector] = { pass: 0, fail: 0, pending: 0, total: 0 };
      }
      inspectors[inspector][item.overallResult || 'pending']++;
      inspectors[inspector].total++;
    });

    return Object.entries(inspectors).map(([name, counts]) => ({
      name,
      pass: counts.pass,
      fail: counts.fail,
      pending: counts.pending,
      total: counts.total,
      passRate: counts.total > 0 ? ((counts.pass / counts.total) * 100).toFixed(1) : 0
    })).sort((a, b) => b.total - a.total);
  }, [data]);

  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
    // In real app, this would trigger a new data fetch
  };

  const handleExportDashboard = () => {
    // Export dashboard data as Excel/PDF
    console.log('Exporting dashboard...');
  };

  const handleRefreshData = () => {
    setLoading(true);
    // Simulate refresh
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div className="stats-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h2>📊 Material Inspection Dashboard</h2>
          <p>Real-time analytics and insights</p>
        </div>
        <div className="header-actions">
          <div className="time-range-selector">
            <select value={timeRange} onChange={(e) => handleTimeRangeChange(e.target.value)}>
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>
          <button className="btn btn-sm btn-outline" onClick={handleRefreshData}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            Refresh
          </button>
          <button className="btn btn-sm btn-primary" onClick={handleExportDashboard}>
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="kpi-grid">
        <div className="kpi-card primary">
          <div className="kpi-header">
            <Activity className="kpi-icon" />
            <span className="kpi-label">Total Inspections</span>
          </div>
          <div className="kpi-value">{derivedStats.total.toLocaleString()}</div>
          <div className="kpi-change positive">
            <TrendingUp size={16} />
            +12% vs last period
          </div>
        </div>

        <div className="kpi-card success">
          <div className="kpi-header">
            <CheckCircle className="kpi-icon" />
            <span className="kpi-label">Pass Rate</span>
          </div>
          <div className="kpi-value">{derivedStats.passRate}%</div>
          <div className={`kpi-change ${derivedStats.passRateTrend === 'up' ? 'positive' : 'negative'}`}>
            {derivedStats.passRateTrend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {derivedStats.passRateTrend === 'up' ? '+' : '-'}{derivedStats.passRateChange}% vs last period
          </div>
        </div>

        <div className="kpi-card warning">
          <div className="kpi-header">
            <Clock className="kpi-icon" />
            <span className="kpi-label">Pending</span>
          </div>
          <div className="kpi-value">{derivedStats.pendingCount}</div>
          <div className="kpi-change neutral">
            Awaiting inspection
          </div>
        </div>

        <div className="kpi-card danger">
          <div className="kpi-header">
            <XCircle className="kpi-icon" />
            <span className="kpi-label">Failed</span>
          </div>
          <div className="kpi-value">{derivedStats.failCount}</div>
          <div className="kpi-change neutral">
            {derivedStats.failRate}% failure rate
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Results Distribution Pie Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>📈 Results Distribution</h3>
            <div className="chart-filters">
              <Filter size={16} />
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={resultDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {resultDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Material Type Performance */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>🏗️ Material Type Performance</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={materialTypeStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="pass" stackId="a" fill={COLORS.pass} name="Pass" />
                <Bar dataKey="fail" stackId="a" fill={COLORS.fail} name="Fail" />
                <Bar dataKey="pending" stackId="a" fill={COLORS.pending} name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline Chart */}
        <div className="chart-card wide">
          <div className="chart-header">
            <h3>📅 Inspection Trends Over Time</h3>
            <div className="metric-selector">
              <button 
                className={selectedMetric === 'results' ? 'active' : ''}
                onClick={() => setSelectedMetric('results')}
              >
                Results
              </button>
              <button 
                className={selectedMetric === 'passRate' ? 'active' : ''}
                onClick={() => setSelectedMetric('passRate')}
              >
                Pass Rate
              </button>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              {selectedMetric === 'results' ? (
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="pass" stackId="1" stroke={COLORS.pass} fill={COLORS.pass} />
                  <Area type="monotone" dataKey="fail" stackId="1" stroke={COLORS.fail} fill={COLORS.fail} />
                  <Area type="monotone" dataKey="pending" stackId="1" stroke={COLORS.pending} fill={COLORS.pending} />
                </AreaChart>
              ) : (
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Pass Rate']} />
                  <Line type="monotone" dataKey="passRate" stroke={COLORS.primary} strokeWidth={3} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Supplier Performance */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>🏢 Top Suppliers Performance</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={supplierStats.slice(0, 5)} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip formatter={(value) => [`${value}%`, 'Pass Rate']} />
                <Bar dataKey="passRate" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Tables */}
      <div className="tables-grid">
        {/* Inspector Performance Table */}
        <div className="table-card">
          <div className="table-header">
            <h3>👨‍🔬 Inspector Performance</h3>
          </div>
          <div className="table-container">
            <table className="performance-table">
              <thead>
                <tr>
                  <th>Inspector</th>
                  <th>Total</th>
                  <th>Pass</th>
                  <th>Fail</th>
                  <th>Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {inspectorStats.map((inspector, index) => (
                  <tr key={index}>
                    <td>{inspector.name}</td>
                    <td>{inspector.total}</td>
                    <td className="pass-count">{inspector.pass}</td>
                    <td className="fail-count">{inspector.fail}</td>
                    <td>
                      <div className="pass-rate-cell">
                        <span className={`rate-value ${inspector.passRate >= 90 ? 'excellent' : inspector.passRate >= 75 ? 'good' : 'needs-improvement'}`}>
                          {inspector.passRate}%
                        </span>
                        <div className="rate-bar">
                          <div 
                            className="rate-fill" 
                            style={{ width: `${inspector.passRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Supplier Details Table */}
        <div className="table-card">
          <div className="table-header">
            <h3>🏢 Supplier Details</h3>
          </div>
          <div className="table-container">
            <table className="performance-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Total</th>
                  <th>Avg Qty (kg)</th>
                  <th>Pass Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {supplierStats.slice(0, 10).map((supplier, index) => (
                  <tr key={index}>
                    <td>{supplier.name}</td>
                    <td>{supplier.total}</td>
                    <td>{parseInt(supplier.avgQuantity).toLocaleString()}</td>
                    <td>
                      <span className={`rate-badge ${supplier.passRate >= 90 ? 'excellent' : supplier.passRate >= 75 ? 'good' : 'needs-improvement'}`}>
                        {supplier.passRate}%
                      </span>
                    </td>
                    <td>
                      {supplier.passRate >= 90 ? (
                        <span className="status-badge excellent">⭐ Excellent</span>
                      ) : supplier.passRate >= 75 ? (
                        <span className="status-badge good">✅ Good</span>
                      ) : (
                        <span className="status-badge warning">⚠️ Monitor</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Real-time Alerts */}
      <div className="alerts-section">
        <div className="alerts-header">
          <AlertTriangle className="alerts-icon" />
          <h3>🚨 Real-time Alerts</h3>
        </div>
        <div className="alerts-list">
          {derivedStats.failRate > 10 && (
            <div className="alert alert-warning">
              <AlertTriangle size={16} />
              <span>High failure rate detected: {derivedStats.failRate}% (above 10% threshold)</span>
              <button className="alert-action">Investigate</button>
            </div>
          )}
          {derivedStats.pendingCount > 5 && (
            <div className="alert alert-info">
              <Clock size={16} />
              <span>{derivedStats.pendingCount} inspections pending approval</span>
              <button className="alert-action">Review</button>
            </div>
          )}
          <div className="alert alert-success">
            <CheckCircle size={16} />
            <span>All systems operational - dashboard updated {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;