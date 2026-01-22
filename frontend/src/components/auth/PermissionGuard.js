// src/components/auth/PermissionGuard.js
import React from "react";
import { useAuth } from "../../hooks/useAuth";
import AccessDenied from "../common/AccessDenied";

const PermissionGuard = ({ children, requiredPermission }) => {
  const { hasPermission } = useAuth();

  // ถ้าไม่ต้องการ permission หรือ user มี permission ก็ให้แสดงผล children
  if (!requiredPermission || hasPermission(requiredPermission)) {
    return children;
  }

  // ถ้าไม่มี permission ให้แสดงหน้า Access Denied
  return <AccessDenied />;
};

export default PermissionGuard;