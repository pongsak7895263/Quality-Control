// middleware/adminAuth.js
const User = require('../models/User');

exports.requireAdmin = async (req, res, next) => {
  try {
    // ตรวจสอบว่ามี user จาก auth middleware หรือไม่
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบก่อน'
      });
    }

    // ตรวจสอบว่าเป็น admin หรือไม่
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์ในการเข้าถึงหน้านี้ (Admin เท่านั้น)'
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์'
    });
  }
};

exports.requireManagerOrAbove = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบก่อน'
      });
    }

    const allowedRoles = ['admin', 'manager'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ไม่มีสิทธิ์ในการเข้าถึงหน้านี้'
      });
    }

    next();
  } catch (error) {
    console.error('Manager auth error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์'
    });
  }
};