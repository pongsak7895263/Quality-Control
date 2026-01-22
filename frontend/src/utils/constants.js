// src/utils/constants.js
export const MENU_ITEMS = [
    { id: 'dashboard', name: 'แดชบอร์ด', icon: '📊' },
    { id: 'raw-material', name: 'การตรวจรับวัตถุดิบ', icon: '📦', shortName: 'วัตถุดิบ' },
    { id: 'chemical', name: 'การตรวจสอบส่วนผสมเหล็ก', icon: '🧪', shortName: 'เคมี' },
    { id: 'billet-inspection', name: 'ตรวจสอบเหล็กท่อน', icon: '🔍', shortName: 'ตรวจเหล็ก' },
    { id: 'hot-forging', name: 'กระบวนการขึ้นรูปงานร้อน', icon: '🔥', shortName: 'ขึ้นรูป' },
    { id: 'post-forging', name: 'การตรวจสอบหลังขึ้นรูป', icon: '🔨', shortName: 'หลังขึ้นรูป' },
    { id: 'heat-treatment', name: 'การตรวจสอบค่าความแข็ง', icon: '🌡️', shortName: 'ความแข็ง' },
    { id: 'final-inspection', name: 'ตรวจสอบขั้นตอนสุดท้าย', icon: '🔍', shortName: 'ตรวจสุดท้าย' },
    { id: 'reports', name: 'รายงาน', icon: '📈' },
    { id: 'settings', name: 'ตั้งค่า', icon: '⚙️' }
  ];
  
  export const ACTIVITY_ICONS = {
    quality: '✅',
    production: '🏭',
    alert: '⚠️',
    maintenance: '🔧'
  };
  
  // src/utils/roleUtils.js
  export const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#dc2626';
      case 'operator': return '#2563eb';
      case 'inspector': return '#059669';
      default: return '#6b7280';
    }
  };
  
  export const getRoleName = (role) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'operator': return 'พนักงานปฏิบัติการ';
      case 'inspector': return 'เจ้าหน้าที่ตรวจสอบ';
      default: return 'ผู้ใช้งาน';
    }
  };