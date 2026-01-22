// src/components/common/Navigation.js
import React from 'react';
const Navigation = ({ currentModule, setCurrentModule, user, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', name: 'แดชบอร์ด', icon: '📊' },
    { id: 'raw-material', name: 'การตรวจรับวัตถุดิบ', icon: '📦', shortName: 'วัตถุดิบ' },
    { id: 'chemical', name: 'การตรวจสอบส่วนผสมเหล็ก', icon: '🧪', shortName: 'เคมี' },
    { id: 'billet-inspection', name: 'ตรวจสอบเหล็กท่อน', icon: '🔍', shortName: 'ตรวจเหล็ก' },
    { id: 'hot-forging', name: 'กระบวนการขึ้นรูปงานร้อน', icon: '🔥', shortName: 'ขึ้นรูป' },
    { id: 'post-forging', name: 'การตรวจสอบหลังขึ้นรูป', icon: '🔨', shortName: 'หลังขึ้นรูป' },
    { id: 'heat-treatment', name: 'การตรวจสอบค่าความแข็ง', icon: '🌡️', shortName: 'ความแข็ง' },
    { id: 'final-inspection', name: 'ตรวจสอบขั้นตอนสุดท้าย', icon: '🔍', shortName: 'ตรวจสุดท้าย' },
    { id: 'inspections', name: 'Inspection Management', icon: '📋', shortName: 'Inspections' },
    { id: 'materials', name: 'Material Management', icon: '📦', shortName: 'Materials' },
    { id: 'reports', name: 'รายงาน', icon: '📈' },
    { id: 'settings', name: 'ตั้งค่า', icon: '⚙️' }
  ];

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <span className="logo-icon">🏭</span>
        <div className="brand-text">
          <h1>SRIBORISUTH</h1>
          <p>Quality Control System</p>
        </div>
      </div>
      
      <div className="nav-menu">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`nav-button ${currentModule === item.id ? 'active' : ''}`}
            onClick={() => setCurrentModule(item.id)}
            title={item.name}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-text">{item.shortName || item.name}</span>
          </button>
        ))}
      </div>
      
      <div className="nav-user">
        <span className="user-info">
          Welcome, {user?.fullName || user?.name || 'User'}
        </span>
        <button className="logout-button" onClick={onLogout}>
          🚪 Logout
        </button>
      </div>
    </nav>
  );
};

export default Navigation;