// hooks/useData.js
import { useState, useEffect } from 'react';

// PostgreSQL connection hook (จะต้องใช้ร่วมกับ backend API)
export const useData = (endpoint) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual API endpoint
      const response = await fetch(`/api/${endpoint}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createRecord = async (recordData) => {
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordData)
      });
      if (!response.ok) throw new Error('Failed to create record');
      const newRecord = await response.json();
      setData(prev => [...prev, newRecord]);
      return { success: true, data: newRecord };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateRecord = async (id, recordData) => {
    try {
      const response = await fetch(`/api/${endpoint}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordData)
      });
      if (!response.ok) throw new Error('Failed to update record');
      const updatedRecord = await response.json();
      setData(prev => prev.map(item => item.id === id ? updatedRecord : item));
      return { success: true, data: updatedRecord };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteRecord = async (id) => {
    try {
      const response = await fetch(`/api/${endpoint}/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete record');
      setData(prev => prev.filter(item => item.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    if (endpoint) {
      fetchData();
    }
  }, [endpoint]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    createRecord,
    updateRecord,
    deleteRecord
  };
};

// Hook สำหรับการจัดการ Material Inspections
export const useMaterialInspections = () => {
  return useData('material-inspections');
};

// Hook สำหรับการจัดการ Chemical Tests
export const useChemicalTests = () => {
  return useData('chemical-tests');
};
