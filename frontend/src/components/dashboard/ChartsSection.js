// src/components/dashboard/ChartsSection.js
import React, { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import './ChartsSection.css';

const ChartsSection = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('quality-trend');

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const response = await apiClient.getDashboardCharts();
        if (response.success) {
          setChartData(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, []);

  const chartTabs = [
    { id: 'quality-trend', label: 'Quality Trend', icon: '📈' },
    { id: 'production', label: 'Production', icon: '🏭' },
    { id: 'defects', label: 'Defects', icon: '⚠️' },
    { id: 'efficiency', label: 'Efficiency', icon: '⚡' }
  ];

  const renderChart = (chartType) => {
    if (loading) {
      return (
        <div className="chart-loading">
          <div className="chart-skeleton"></div>
        </div>
      );
    }

    if (!chartData) {
      return (
        <div className="chart-error">
          <p>No data available</p>
        </div>
      );
    }

    // Mock chart rendering - replace with your actual chart library
    switch (chartType) {
      case 'quality-trend':
        return (
          <div className="mock-chart">
            <div className="chart-title">Quality Score Over Time</div>
            <div className="chart-placeholder">
              <div className="chart-line">
                {Array.from({length: 30}, (_, i) => (
                  <div 
                    key={i} 
                    className="chart-point"
                    style={{ 
                      height: `${Math.random() * 80 + 20}%`,
                      left: `${(i / 29) * 100}%`
                    }}
                  ></div>
                ))}
              </div>
            </div>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-color quality"></span>
                Quality Score
              </span>
            </div>
          </div>
        );
      
      case 'production':
        return (
          <div className="mock-chart">
            <div className="chart-title">Production Volume</div>
            <div className="chart-placeholder">
              <div className="chart-bars">
                {Array.from({length: 12}, (_, i) => (
                  <div 
                    key={i} 
                    className="chart-bar"
                    style={{ height: `${Math.random() * 80 + 20}%` }}
                  ></div>
                ))}
              </div>
            </div>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-color production"></span>
                Units Produced
              </span>
            </div>
          </div>
        );
      
      case 'defects':
        return (
          <div className="mock-chart">
            <div className="chart-title">Defect Analysis</div>
            <div className="chart-placeholder">
              <div className="chart-pie">
                <div className="pie-segment segment-1" style={{ '--percentage': '45' }}></div>
                <div className="pie-segment segment-2" style={{ '--percentage': '30' }}></div>
                <div className="pie-segment segment-3" style={{ '--percentage': '25' }}></div>
              </div>
            </div>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-color defect-1"></span>
                Minor Defects (45%)
              </span>
              <span className="legend-item">
                <span className="legend-color defect-2"></span>
                Major Defects (30%)
              </span>
              <span className="legend-item">
                <span className="legend-color defect-3"></span>
                Critical Defects (25%)
              </span>
            </div>
          </div>
        );
      
      case 'efficiency':
        return (
          <div className="mock-chart">
            <div className="chart-title">Production Line Efficiency</div>
            <div className="chart-placeholder">
              <div className="efficiency-meters">
                {['Line A', 'Line B', 'Line C', 'Line D'].map((line, i) => (
                  <div key={line} className="efficiency-meter">
                    <div className="meter-label">{line}</div>
                    <div className="meter-bar">
                      <div 
                        className="meter-fill"
                        style={{ width: `${85 + Math.random() * 15}%` }}
                      ></div>
                    </div>
                    <div className="meter-value">{(85 + Math.random() * 15).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      default:
        return <div>Chart not found</div>;
    }
  };

  return (
    <div className="charts-section">
      <div className="charts-header">
        <h2>Analytics Dashboard</h2>
        <div className="chart-tabs">
          {chartTabs.map(tab => (
            <button
              key={tab.id}
              className={`chart-tab ${activeChart === tab.id ? 'active' : ''}`}
              onClick={() => setActiveChart(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="charts-content">
        {renderChart(activeChart)}
      </div>
    </div>
  );
};

export default ChartsSection;