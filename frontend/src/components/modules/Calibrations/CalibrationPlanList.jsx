import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://192.168.0.26:3000/api';

const CalibrationPlanList = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, [selectedYear]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/plans/year/${selectedYear}`);
      setPlans(response.data.data);
      setStatistics(response.data.statistics);
    } catch (error) {
      console.error('Error fetching plans:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (planId, newStatus) => {
    try {
      await axios.patch(`${API_BASE_URL}/plans/${planId}/status`, {
        status: newStatus,
        actual_date: newStatus === 'COMPLETED' ? new Date().toISOString().split('T')[0] : null
      });
      alert('อัพเดทสถานะสำเร็จ');
      fetchPlans();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      PLANNED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      DELAYED: 'bg-orange-100 text-orange-800'
    };
    const labels = {
      PLANNED: 'วางแผนแล้ว',
      IN_PROGRESS: 'กำลังดำเนินการ',
      COMPLETED: 'เสร็จสิ้น',
      CANCELLED: 'ยกเลิก',
      DELAYED: 'ล่าช้า'
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getTypeBadge = (isInternal) => {
    return isInternal ? (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
        ภายใน
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
        ภายนอก
      </span>
    );
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">แผนการสอบเทียบ</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map(year => (
              <option key={year} value={year}>ปี {year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="ทั้งหมด" value={statistics.total} bgColor="bg-gray-500" />
          <StatCard title="วางแผนแล้ว" value={statistics.planned} bgColor="bg-blue-500" />
          <StatCard title="กำลังดำเนินการ" value={statistics.inProgress} bgColor="bg-yellow-500" />
          <StatCard title="เสร็จสิ้น" value={statistics.completed} bgColor="bg-green-500" />
          <StatCard title="ล่าช้า" value={statistics.delayed} bgColor="bg-orange-500" />
        </div>
      )}

      {/* Timeline View */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          ไทม์ไลน์แผนการสอบเทียบ ปี {selectedYear}
        </h3>
        
        {plans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            ไม่มีแผนการสอบเทียบในปีนี้
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-gray-800">
                        {plan.instrument?.instrument_code}
                      </h4>
                      {getStatusBadge(plan.status)}
                      {getTypeBadge(plan.is_internal)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {plan.instrument?.instrument_name}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">วันที่วางแผน:</span>
                        <p className="font-medium">
                          {new Date(plan.planned_date).toLocaleDateString('th-TH')}
                        </p>
                      </div>
                      {plan.actual_date && (
                        <div>
                          <span className="text-gray-500">วันที่สอบเทียบจริง:</span>
                          <p className="font-medium">
                            {new Date(plan.actual_date).toLocaleDateString('th-TH')}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">วิธีการ:</span>
                        <p className="font-medium">{plan.calibration_method || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">จำนวนจุด:</span>
                        <p className="font-medium">{plan.calibration_points || '-'}</p>
                      </div>
                    </div>
                    {!plan.is_internal && plan.calibration_vendor && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-500">หน่วงานสอบเทียบ:</span>
                        <p className="font-medium">{plan.calibration_vendor}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Status Update Buttons */}
                  {plan.status !== 'COMPLETED' && plan.status !== 'CANCELLED' && (
                    <div className="ml-4 flex flex-col space-y-2">
                      {plan.status === 'PLANNED' && (
                        <button
                          onClick={() => handleStatusUpdate(plan.id, 'IN_PROGRESS')}
                          className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        >
                          เริ่มดำเนินการ
                        </button>
                      )}
                      {plan.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleStatusUpdate(plan.id, 'COMPLETED')}
                          className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          เสร็จสิ้น
                        </button>
                      )}
                      <button
                        onClick={() => handleStatusUpdate(plan.id, 'DELAYED')}
                        className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                      >
                        ล่าช้า
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(plan.id, 'CANCELLED')}
                        className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly View */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          แผนแยกตามเดือน
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(12)].map((_, monthIndex) => {
            const monthPlans = plans.filter(plan => {
              const planMonth = new Date(plan.planned_date).getMonth();
              return planMonth === monthIndex;
            });

            const monthNames = [
              'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
              'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
            ];

            return (
              <div key={monthIndex} className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">
                  {monthNames[monthIndex]}
                </h4>
                <div className="text-2xl font-bold text-blue-600">
                  {monthPlans.length}
                </div>
                <div className="text-sm text-gray-600">
                  แผนการสอบเทียบ
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, bgColor }) => (
  <div className={`${bgColor} rounded-lg shadow-md p-4 text-white`}>
    <div className="text-sm font-medium opacity-90">{title}</div>
    <div className="text-2xl font-bold mt-1">{value}</div>
  </div>
);

export default CalibrationPlanList;