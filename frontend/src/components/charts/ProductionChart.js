// components/charts/ProductionChart.js - Production Chart Component
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import apiClient from '../../utils/api';
import './ProductionChart.css';

const ProductionChart = () => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('7d');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchChartData();
  }, [period]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getProductionChart(period);
      
      if (response.success) {
        setChartData(response.data.chartData);
        setSummary(response.data.summary);
      } else {
        setError(response.message);
      }
    } catch (error) {
      console.error('Failed to fetch production chart data:', error);
      setError('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const formatTooltip = (value, name) => {
    if (name === 'totalQuantity' || name === 'completedQuantity') {
      return [`${value} kg`, name === 'totalQuantity' ? 'Total Quantity' : 'Completed Quantity'];
    }
    return [value, name];
  };

  if (loading) {
    return (
      <div className="chart-container">
        <div className="chart-loading">
          <div className="loading-spinner"></div>
          <p>Loading production chart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-container">
        <div className="chart-error">
          <p>❌ {error}</p>
          <button onClick={fetchChartData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>Production Overview</h3>
        <div className="chart-controls">
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className="period-selector"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {summary && (
        <div className="chart-summary">
          <div className="summary-item">
            <span className="summary-label">Total Produced:</span>
            <span className="summary-value">{summary.totalProduced.toLocaleString()} kg</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Batches:</span>
            <span className="summary-value">{summary.totalBatches}</span>
          </div>
        </div>
      )}

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={formatTooltip} />
            <Legend />
            <Line
              type="monotone"
              dataKey="totalQuantity"
              stroke="#007bff"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Total Production"
            />
            <Line
              type="monotone"
              dataKey="completedQuantity"
              stroke="#28a745"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Completed Production"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProductionChart;