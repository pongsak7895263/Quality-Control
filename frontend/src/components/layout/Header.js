import React, { useState } from 'react';

// Utility Functions (ย้ายมาไว้ที่นี่เพราะ Header ใช้งาน)
const getRoleColor = (role) => {
    switch (role) {
        case "admin": return "#dc2626";
        case "manager": return "#d97706";
        case "operator": return "#2563eb";
        case "inspector": return "#059669";
        default: return "#6b7280";
    }
};

const getRoleName = (role) => {
    switch (role) {
        case "admin": return "ผู้ดูแลระบบ";
        case "operator": return "พนักงานปฏิบัติการ";
        case "inspector": return "เจ้าหน้าที่ตรวจสอบ";
        case "manager": return "ผู้จัดการ";
        default: return "ผู้ใช้งาน";
    }
};

const Header = ({ user, onLogout }) => {
    const [showUserMenu, setShowUserMenu] = useState(false);

    return (
        <header className="app-header">
            <div className="logo">
                <span className="logo-icon">🏭</span>
                <span className="logo-text">SRIBORISUTH INDUSTRIAL CO.,LTD</span>
            </div>
            <div className="header-title">
                <h1>Quality Control System</h1>
            </div>
            <div className="user-info" onClick={() => setShowUserMenu(!showUserMenu)}>
                <div className="user-avatar" style={{ backgroundColor: getRoleColor(user?.role) }}>
                    {user?.fullName?.charAt(0) || 'U'}
                </div>
                <div className="user-details">
                    <span className="user-name">{user?.fullName || 'User'}</span>
                    <span className="user-email">{user?.email || '...'}</span>
                </div>
                <div className="user-menu-arrow">{showUserMenu ? '▲' : '▼'}</div>
                {showUserMenu && (
                    <div className="user-dropdown">
                       {/* ... โค้ด Dropdown เดิม ... */}
                       <button className="dropdown-item logout" onClick={onLogout}>
                           🚪 ออกจากระบบ
                       </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;