// src/components/auth/ProtectedRoutes.js (เวอร์ชันที่ถูกต้อง)
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import LoadingSpinner from "../common/LoadingSpinner";

const ProtectedRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // แสดง Spinner ขณะกำลังตรวจสอบสถานะ Login
    return <LoadingSpinner message="Authenticating..." />;
  }

  // หลังจากตรวจสอบเสร็จ
  // ถ้า Login แล้ว ให้แสดง Component ลูก (ที่ถูกกำหนดใน App.js) ผ่าน <Outlet /> ได้เลย
  // ถ้ายังไม่ Login ให้ Redirect ไปหน้า /login
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoutes;

