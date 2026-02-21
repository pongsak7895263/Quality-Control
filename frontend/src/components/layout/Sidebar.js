import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChartLine, faBoxOpen, faFlask, faTemperatureHigh,
    faCheckDouble, faClipboardCheck, faCog, faBars, faTimes,
    faHammer, faBalanceScale, faRulerCombined, faUsers, faSitemap,
    faFileContract, faSignOutAlt
} from '@fortawesome/free-solid-svg-icons';

// Add keyframes for spinner (Standard JS way to inject style)
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  tbody tr:hover { background-color: #f8fafc; }
`;

// จัดกลุ่มเมนูเพื่อให้ Loop แสดงผลง่ายขึ้น
const MENU_GROUPS = [
    {
        title: "Main",
        items: [
            { path: "/dashboard", name: "Dashboard", icon: faChartLine },
        ]
    },
    {
        title: "Inspections (หน้างาน)",
        items: [
            { path: "/inspections/material", name: "IQC (วัตถุดิบ)", icon: faBoxOpen },
            { path: "/inspections/chemical", name: "Chemical Lab", icon: faFlask },
            { path: "/inspections/hardness", name: "IQC Hardness", icon: faTemperatureHigh },
            { path: "/inspections/hot-forging", name: "Hot Forging", icon: faHammer },
            { path: "/inspections/finishing", name: "Final QC", icon: faCheckDouble },
        ]
    },
    {
        title: "Management & Standards",
        items: [
            { path: "/Kpimonitoring/KPIDashboard", name: "KPI Monitoring", icon: faChartLine },
            { path: "/Calibrations", name: "Calibration (สอบเทียบ)", icon: faBalanceScale },
            { path: "/msa", name: "MSA (ระบบวัด)", icon: faRulerCombined }, 
            { path: "/inspections/doc", name: "Documents (ISO/IATF)", icon: faFileContract },
        ]
    },
    {
        title: "Organization",
        items: [
            { path: "/department-structure", name: "Structure", icon: faSitemap },
            { path: "/training", name: "Training", icon: faUsers },
            { path: "/reports", name: "All Reports", icon: faClipboardCheck },
        ]
    },
    {
        title: "System",
        items: [
            { path: "/settings", name: "Settings", icon: faCog },
        ]
    }
];

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            {/* Header / Logo */}
            <div className="sidebar-header">
                <div className="logo-container">
                    <div className="logo-icon">QC</div>
                    {!isCollapsed && <h3 className="logo-text">System Control</h3>}
                </div>
                <button className="toggle-btn" onClick={toggleSidebar}>
                    <FontAwesomeIcon icon={isCollapsed ? faBars : faTimes} />
                </button>
            </div>

            {/* Menu List */}
            <nav className="nav-menu">
                {MENU_GROUPS.map((group, groupIndex) => (
                    <div key={groupIndex} className="menu-group">
                        {/* ซ่อนชื่อกลุ่มเมื่อเมนูถูกยุบ */}
                        {!isCollapsed && <div className="group-title">{group.title}</div>}
                        
                        {group.items.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                                title={isCollapsed ? item.name : ""} // Tooltip แบบง่ายเมื่อยุบ
                            >
                                <span className="nav-icon">
                                    <FontAwesomeIcon icon={item.icon} fixedWidth />
                                </span>
                                <span className="nav-text">{item.name}</span>
                            </NavLink>
                        ))}
                        {/* เส้นคั่นบางๆ ระหว่างกลุ่ม (Optional) */}
                        {!isCollapsed && groupIndex < MENU_GROUPS.length - 1 && <hr className="group-divider" />}
                    </div>
                ))}
            </nav>
            
            {/* Footer / Logout Zone (Optional) */}
            <div className="sidebar-footer">
                <div className="nav-item logout">
                     <span className="nav-icon"><FontAwesomeIcon icon={faSignOutAlt} /></span>
                     {!isCollapsed && <span className="nav-text">Logout</span>}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;