// src/hooks/useRealTimeData.js
import { useState, useEffect } from 'react';

const useRealTimeData = () => {
  const [data, setData] = useState({
    efficiency: 87,
    quality: 94,
    temperature: 850,
    pressure: 145
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => ({
        efficiency: Math.max(80, Math.min(95, prev.efficiency + (Math.random() - 0.5) * 2)),
        quality: Math.max(85, Math.min(98, prev.quality + (Math.random() - 0.5) * 1)),
        temperature: Math.max(800, Math.min(900, prev.temperature + (Math.random() - 0.5) * 10)),
        pressure: Math.max(120, Math.min(160, prev.pressure + (Math.random() - 0.5) * 5))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return data;
};

export default useRealTimeData;

// src/hooks/useDashboard.js
import { useState, useEffect } from 'react';

const useDashboard = () => {
  const [stats] = useState([
    { title: 'ผลิตรวม', value: '2,250', unit: 'ชิ้น', trend: '+12%', color: '#3b82f6' },
    { title: 'คะแนนคุณภาพ', value: '94.0', unit: '%', trend: '+2.1%', color: '#10b981' },
    { title: 'ประสิทธิภาพ', value: '87.0', unit: '%', trend: 'ปกติ', color: '#f59e0b' },
    { title: 'ออเดอร์เสร็จสิ้น', value: '89', unit: 'ออเดอร์', trend: '+8%', color: '#8b5cf6' }
  ]);

  const [recentActivities] = useState([
    { 
      id: 1, 
      type: 'quality', 
      message: 'ตรวจสอบคุณภาพแบทช์ #QC001 เสร็จสิ้น', 
      time: '5 นาทีที่แล้ว', 
      status: 'success' 
    },
    { 
      id: 2, 
      type: 'production', 
      message: 'เริ่มกระบวนการตีขึ้นรูปร้อนแบทช์ #HF002', 
      time: '15 นาทีที่แล้ว', 
      status: 'info' 
    },
    { 
      id: 3, 
      type: 'alert', 
      message: 'อุณหภูมิเตาผิดปกติ - หน่วย HT-01', 
      time: '30 นาทีที่แล้ว', 
      status: 'warning' 
    },
    { 
      id: 4, 
      type: 'maintenance', 
      message: 'บำรุงรักษาเครื่องกดขึ้นรูป #3 เสร็จสิ้น', 
      time: '1 ชั่วโมงที่แล้ว', 
      status: 'success' 
    }
  ]);

  return { stats, recentActivities };
};

export default useDashboard;