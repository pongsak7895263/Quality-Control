import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate, // เพิ่ม useNavigate เพื่อใช้ในการเปลี่ยนหน้า
} from "react-router-dom";

// Auth
import { AuthProvider } from "./hooks/useAuth";
import LoginRegister from "./components/auth/LoginRegister";
import ProtectedRoutes from "./components/auth/ProtectedRoutes";

// Main Layout and Pages
import Layout from "./components/layout/Layout";
import Dashboard from "./components/dashboard/Dashboard";
import MaterialInspection from "./components/modules/MaterialInspection";
import MaterialInspectionReport from "./components/modules/MaterialInspectionReport"; // ✅ เพิ่มหน้ารายงาน
import ChemicalTest from "./components/modules/ChemicalTest";
import HardnessInspection from "./components/modules/HardnessInspection";
import PartMaster from './components/modules/PartMaster';
import HardnessReport from './components/modules/HardnessReport';
//import TroubleHistory from "./components/modules/TroubleHistory/TroubleHistory";
//import Reports from "./components/modules/Reports";
//import Settings from "./components/modules/Settings";
import ComingSoon from "./components/common/ComingSoon";
import NotFound from "./components/common/NotFound";

// Import Calibration Components
import CalibrationDashboard from './components/modules/Calibrations/CalibrationDashboard';
import CalibrationForm from './components/modules/Calibrations/CalibrationForm';

// เพิ่ม Import ด้านบนของ App.js
import KPIDashboard from "./components/modules/Kpimonitoring/KPIDashboard";
import ProductRegister from "./components/modules/Kpimonitoring/ProductRegister";
import DailyQualityEntry from "./components/modules/Kpimonitoring/DailyQualityEntry";

//import "./App.css";
import InstrumentRegister from './components/modules/Calibrations/InstrumentRegister'; // 👈 Import เข้ามา

// --- Wrapper Components ---
// สร้าง Wrapper เพื่อส่งฟังก์ชันนำทาง (Navigate) ให้กับ Component เดิมโดยไม่ต้องแก้โค้ดข้างใน
const HardnessInspectionWrapper = () => {
  const navigate = useNavigate();
  return (
    <HardnessInspection
      onManageParts={() => navigate('/inspections/hardness/parts')}
    />
  );
};

const PartMasterWrapper = () => {
  const navigate = useNavigate();
  return (
    <PartMaster
      onBack={() => navigate('/inspections/hardness')}
    />
  );
};
// ✅ 2. สร้าง Wrapper สำหรับ Hardness Report เพื่อใช้ปุ่ม Back ได้
const HardnessReportWrapper = () => {
  const navigate = useNavigate();
  return (
    <HardnessReport 
      onBack={() => navigate('/inspections/hardness')} 
    />
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginRegister />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoutes />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />

              {/* ✅ Material Inspection Routes */}
              <Route path="inspections/material" element={<MaterialInspection />} />
              <Route path="inspections/material/report" element={<MaterialInspectionReport />} />
              
              <Route path="inspections/chemical" element={<ChemicalTest />} />

              {/* ใช้ Wrapper แทน Component ตรงๆ เพื่อให้ปุ่มเปลี่ยนหน้าทำงานได้ */}
              <Route path="inspections/hardness" element={<HardnessInspectionWrapper />} />
              <Route path="inspections/hardness/parts" element={<PartMasterWrapper />} />
              <Route path="inspections/hardness/report" element={<HardnessReportWrapper />} /> {/* ✅ 3. เพิ่ม Route สำหรับรายงาน */}
              <Route path="inspections/billet" element={<ComingSoon title="Billet Inspection" />} />

              {/* Other Routes */}
              <Route path="reports" element={<ComingSoon title="รายงาน" />} />
              <Route path="settings" element={<ComingSoon title="ตั้งค่า" />} />

              {/* --- Calibration Routes --- */}
              <Route path="Calibrations" element={<CalibrationDashboard />} />
              <Route path="calibrations/register" element={<InstrumentRegister />} />
              <Route path="calibrations/edit/:id" element={<InstrumentRegister />} />
              <Route path="Calibrations/calibrate/:id" element={<CalibrationForm />} />
              {/* --- End Calibration Routes --- */}
              
              {/* --- Kpimonitoring Routes --- */}
              {/* สร้าง Route แม่สำหรับจัดกลุ่ม URL ขึ้นต้นด้วย /Kpimonitoring */}
              <Route path="Kpimonitoring">
                {/* ถ้าเข้า /Kpimonitoring เฉยๆ ให้โชว์ Dashboard */}
                <Route index element={<KPIDashboard/>} />

                {/* ถ้าเข้า /Kpimonitoring/KPIDashboard (เผื่อไว้) */}
                <Route path="KPIDashboard" element={<KPIDashboard />} />

                {/* ถ้าเข้า /Kpimonitoring/register */}
                <Route path="register" element={<ProductRegister />} />

                {/* ถ้าเข้า /Kpimonitoring/daily-entry */}
                <Route path="daily-entry" element={<DailyQualityEntry />} />
              </Route>
              {/* --- End Kpimonitoring Routes --- */}

              {/*<Route path="TroubleHistory" element={<TroubleHistory />} />*/}

            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;