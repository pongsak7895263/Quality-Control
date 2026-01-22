// src/components/layout/Layout.js
import React from "react";
import { Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import Header from './Header';
import Sidebar from './Sidebar';
import "./Layout.css";

const Layout = () => {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        // ใช้ confirm แบบสวยงามกว่านี้ได้ในอนาคต (เช่น SweetAlert2)
        if (window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
            logout();
        }
    };

    return (
        <div className="qc-app">
            {/* Header อยู่ด้านบนสุด ความสูง fix ตาม CSS */}
            <Header user={user} onLogout={handleLogout} />
            
            <div className="app-body">
                {/* Sidebar อยู่ด้านซ้าย ความสูงจะเต็มพื้นที่ app-body อัตโนมัติ */}
                <Sidebar />
                
                {/* Main Content คือส่วนที่จะเปลี่ยนไปตามหน้า และมี Scrollbar ของตัวเอง */}
                <main className="main-content">
                    {/* เพิ่ม Container ย่อยเพื่อจำกัดความกว้างเนื้อหาไม่ให้ยาวเกินไปในจอใหญ่ (Optional) */}
                    <div className="content-container">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;