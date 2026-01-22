// src/config.js
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://192.168.0.26:5000";

// แถม: ฟังก์ชันสำหรับดึง Headers (ใส่ Token ให้เองอัตโนมัติ)
export const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};