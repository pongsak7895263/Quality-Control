// src/components/dashboard/Dashboard.js
import React, { useState, useEffect } from "react";
import useAuth from "../../hooks/useAuth";
import axios from "axios"; // ใช้สำหรับดึง API
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts'; // Library กราฟ
import { 
  LayoutDashboard, CheckCircle, AlertCircle, Clock, FileText, Activity 
} from "lucide-react"; // ไอคอนสวยๆ
import "./Dashboard.css";

// --- Sub-components ---

const DashboardHeader = ({ user }) => (
  <div className="dashboard-header">
    <div className="header-text">
      <h1>สวัสดี, {user?.fullName || "Admin"}! 👋</h1>
      <p>ภาพรวมคุณภาพการผลิตประจำวันนี้</p>
    </div>
    <div className="header-actions">
       <button className="btn-secondary">ดาวน์โหลดรายงาน</button>
    </div>
  </div>
);

const DashboardStatCard = ({ icon: Icon, label, value, color, loading }) => (
  <div className={`dashboard-stat-card border-${color}`}>
    <div className={`stat-icon-wrapper bg-${color}-light`}>
      <Icon className={`stat-icon text-${color}`} size={24} />
    </div>
    <div className="stat-info">
      <span className="stat-label">{label}</span>
      {loading ? (
        <div className="skeleton-text"></div>
      ) : (
        <span className="stat-value">{value}</span>
      )}
    </div>
  </div>
);

const RecentInspectionsTable = ({ inspections, loading }) => (
  <div className="dashboard-card full-width">
    <div className="card-header">
      <h3><FileText size={20} /> รายการตรวจสอบล่าสุด</h3>
    </div>
    {loading ? (
      <div className="loading-state">กำลังโหลดข้อมูล...</div>
    ) : (
      <div className="table-responsive">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Batch No.</th>
              <th>ประเภท</th>
              <th>เกรด</th>
              <th>สถานะ</th>
              <th>ผู้ตรวจสอบ</th>
              <th>วันที่</th>
            </tr>
          </thead>
          <tbody>
            {inspections.length > 0 ? inspections.map((insp) => (
              <tr key={insp.id}>
                <td className="font-medium">{insp.batchNumber}</td>
                <td>{insp.materialType === "bar" ? "เหล็กท่อน" : "เหล็กเส้น"}</td>
                <td><span className="badge-grade">{insp.materialGrade}</span></td>
                <td>
                  <span className={`status-badge status-${insp.status}`}>
                    {insp.status === 'pass' ? 'ผ่าน' : insp.status === 'fail' ? 'ไม่ผ่าน' : 'รอผล'}
                  </span>
                </td>
                <td>{insp.inspector || "-"}</td>
                <td className="text-muted">{new Date(insp.date).toLocaleDateString("th-TH")}</td>
              </tr>
            )) : (
              <tr><td colSpan="6" className="text-center">ไม่พบข้อมูล</td></tr>
            )}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

// กราฟวงกลม (Donut Chart)
const InspectionStatusChart = ({ data, loading }) => {
  const COLORS = ['#10B981', '#EF4444', '#F59E0B']; // Green, Red, Yellow

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3><CheckCircle size={20} /> สัดส่วนผลการตรวจสอบ</h3>
      </div>
      <div className="chart-container">
        {loading ? <div className="loading-placeholder" /> : (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// กราฟแท่ง (Bar Chart)
const InspectionTrendChart = ({ data, loading }) => {
  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3><Activity size={20} /> แนวโน้มการตรวจสอบ (7 วันล่าสุด)</h3>
      </div>
      <div className="chart-container">
        {loading ? <div className="loading-placeholder" /> : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <RechartsTooltip cursor={{fill: 'transparent'}} />
              <Legend />
              <Bar dataKey="pass" name="ผ่าน" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="fail" name="ไม่ผ่าน" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// --- Main Component ---

const Dashboard = () => {
  const { user } = useAuth();
  
  // States
  const [stats, setStats] = useState({ total: 0, passRate: "0%", pending: 0, defects: 0 });
  const [recentInspections, setRecentInspections] = useState([]);
  const [chartData, setChartData] = useState([]); 
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // ---------------------------------------------------------
        // TODO: เปลี่ยน URL ด้านล่างเป็น API ของคุณเมื่อพร้อมใช้งานจริง
        // const statsRes = await axios.get('/api/dashboard/stats');
        // const recentRes = await axios.get('/api/inspections/recent');
        // const trendRes = await axios.get('/api/dashboard/trend');
        // ---------------------------------------------------------

        // --- Mock API Call (จำลองความหน่วง Network) ---
        await new Promise(resolve => setTimeout(resolve, 800));

        // Mock Data: Stats
        setStats({
          total: 152,
          passRate: "92.1%",
          pending: 8,
          defects: 12,
        });

        // Mock Data: Table
        setRecentInspections([
          { id: 1, batchNumber: "BT2025-005", materialType: "bar", materialGrade: "S45C", status: "pass", date: "2025-10-13", inspector: "สมชาย" },
          { id: 2, batchNumber: "BT2025-004", materialType: "rod", materialGrade: "SCM440", status: "pending", date: "2025-10-13", inspector: "-" },
          { id: 3, batchNumber: "BT2025-003", materialType: "bar", materialGrade: "S20C", status: "fail", date: "2025-10-12", inspector: "วิชัย" },
          { id: 4, batchNumber: "BT2025-002", materialType: "bar", materialGrade: "S45C", status: "pass", date: "2025-10-11", inspector: "สมชาย" },
          { id: 5, batchNumber: "BT2025-001", materialType: "rod", materialGrade: "S45C", status: "pass", date: "2025-10-10", inspector: "อารีย์" },
        ]);

        // Mock Data: Pie Chart
        setChartData([
          { name: 'Pass', value: 75 },
          { name: 'Fail', value: 15 },
          { name: 'Pending', value: 10 },
        ]);

        // Mock Data: Bar Chart
        setTrendData([
            { name: '10/10', pass: 20, fail: 2 },
            { name: '11/10', pass: 18, fail: 1 },
            { name: '12/10', pass: 25, fail: 5 },
            { name: '13/10', pass: 22, fail: 0 },
            { name: '14/10', pass: 30, fail: 3 },
            { name: '15/10', pass: 15, fail: 1 },
            { name: '16/10', pass: 28, fail: 2 },
        ]);

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่ภายหลัง");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (error) return <div className="error-screen">{error}</div>;

  return (
    <div className="dashboard-content">
      <DashboardHeader user={user} />

      {/* KPI Cards Grid */}
      <div className="dashboard-kpi-grid">
        <DashboardStatCard 
          icon={LayoutDashboard} label="ตรวจสอบทั้งหมด" value={stats.total} color="blue" loading={loading} 
        />
        <DashboardStatCard 
          icon={CheckCircle} label="อัตราการผ่าน" value={stats.passRate} color="green" loading={loading} 
        />
        <DashboardStatCard 
          icon={AlertCircle} label="พบของเสีย (Defects)" value={stats.defects} color="red" loading={loading} 
        />
        <DashboardStatCard 
          icon={Clock} label="รอตรวจสอบ" value={stats.pending} color="yellow" loading={loading} 
        />
      </div>

      {/* Charts & Table Grid */}
      <div className="dashboard-main-grid">
        <div className="charts-section">
            <InspectionTrendChart data={trendData} loading={loading} />
            <InspectionStatusChart data={chartData} loading={loading} />
        </div>
        <RecentInspectionsTable inspections={recentInspections} loading={loading} />
      </div>
    </div>
  );
};

export default Dashboard;