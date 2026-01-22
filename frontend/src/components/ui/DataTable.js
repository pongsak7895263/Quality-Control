// components/ui/DataTable.js - Reusable Data Table Component
import React, { useState, useMemo } from 'react';
import './DataTable.css';

const DataTable = ({ 
  columns = [], 
  data = [], 
  loading = false, 
  error = null, 
  pagination = null, 
  onPageChange, 
  onLimitChange,
  onRowClick,
  sortable = true,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  className = '',
  emptyMessage = 'No data available'
}) => {
  const [sortConfig, setSortConfig] = useState(null);

  const handleSort = (key) => {
    if (!sortable) return;

    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig || !data) return data;

    return [...data].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key);
      const bValue = getNestedValue(b, sortConfig.key);

      // Handle different data types
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle strings
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      
      if (aStr < bStr) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aStr > bStr) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  const getNestedValue = (obj, key) => {
    if (!obj || !key) return '';
    return key.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : '', obj);
  };

  const handleSelectAll = (checked) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      const allIds = sortedData.map(row => row.id).filter(Boolean);
      onSelectionChange(allIds);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (rowId, checked) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      onSelectionChange([...selectedRows, rowId]);
    } else {
      onSelectionChange(selectedRows.filter(id => id !== rowId));
    }
  };

  const isAllSelected = selectedRows.length > 0 && 
    sortedData.every(row => row.id && selectedRows.includes(row.id));
  
  const isSomeSelected = selectedRows.length > 0 && 
    sortedData.some(row => row.id && selectedRows.includes(row.id));

  if (loading) {
    return (
      <div className="data-table-loading">
        <div className="loading-spinner"></div>
        <p>Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-table-error">
        <div className="error-icon">❌</div>
        <p>{error}</p>
        <button 
          className="btn btn-sm btn-primary"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`data-table-container ${className}`}>
      <div className="data-table-wrapper">
        <table className="data-table" role="table">
          <thead>
            <tr>
              {selectable && (
                <th className="select-column">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={input => {
                      if (input) input.indeterminate = isSomeSelected && !isAllSelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th 
                  key={column.key}
                  className={`${column.sortable !== false && sortable ? 'sortable' : ''} ${
                    sortConfig?.key === column.key ? `sorted-${sortConfig.direction}` : ''
                  } ${column.className || ''}`}
                  style={{ 
                    width: column.width, 
                    minWidth: column.minWidth,
                    textAlign: column.align || 'left'
                  }}
                  onClick={() => column.sortable !== false && sortable && handleSort(column.key)}
                  role="columnheader"
                  tabIndex={column.sortable !== false && sortable ? 0 : -1}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && column.sortable !== false && sortable) {
                      handleSort(column.key);
                    }
                  }}
                >
                  <div className="th-content">
                    {column.label}
                    {column.sortable !== false && sortable && (
                      <span className="sort-indicator">
                        {sortConfig?.key === column.key ? 
                          (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'
                        }
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="no-data">
                  <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr 
                  key={row.id || index}
                  className={`${onRowClick ? 'clickable' : ''} ${
                    selectedRows.includes(row.id) ? 'selected' : ''
                  }`}
                  onClick={() => onRowClick && onRowClick(row)}
                  role="row"
                >
                  {selectable && (
                    <td className="select-column">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(row.id)}
                        onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select row ${index + 1}`}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td 
                      key={column.key}
                      className={column.className || ''}
                      style={{ textAlign: column.align || 'left' }}
                      role="cell"
                    >
                      {column.render 
                        ? column.render(getNestedValue(row, column.key), row, index)
                        : getNestedValue(row, column.key) || '-'
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="data-table-pagination">
          <div className="pagination-info">
            Showing{' '}
            <strong>
              {((pagination.currentPage - 1) * pagination.limit) + 1}
            </strong>
            {' '}to{' '}
            <strong>
              {Math.min(pagination.currentPage * pagination.limit, pagination.total)}
            </strong>
            {' '}of{' '}
            <strong>{pagination.total}</strong>
            {' '}entries
          </div>
          
          <div className="pagination-controls">
            <div className="limit-selector-wrapper">
              <label htmlFor="limit-select">Show:</label>
              <select 
                id="limit-select"
                value={pagination.limit}
                onChange={(e) => onLimitChange && onLimitChange(parseInt(e.target.value))}
                className="limit-selector"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="page-buttons">
              <button
                disabled={pagination.currentPage <= 1}
                onClick={() => onPageChange && onPageChange(1)}
                className="btn btn-sm"
                aria-label="Go to first page"
              >
                ««
              </button>
              <button
                disabled={pagination.currentPage <= 1}
                onClick={() => onPageChange && onPageChange(pagination.currentPage - 1)}
                className="btn btn-sm"
                aria-label="Go to previous page"
              >
                ‹
              </button>
              
              <span className="page-info">
                Page <strong>{pagination.currentPage}</strong> of <strong>{pagination.totalPages}</strong>
              </span>
              
              <button
                disabled={pagination.currentPage >= pagination.totalPages}
                onClick={() => onPageChange && onPageChange(pagination.currentPage + 1)}
                className="btn btn-sm"
                aria-label="Go to next page"
              >
                ›
              </button>
              <button
                disabled={pagination.currentPage >= pagination.totalPages}
                onClick={() => onPageChange && onPageChange(pagination.totalPages)}
                className="btn btn-sm"
                aria-label="Go to last page"
              >
                »»
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;