// middleware/permission.js - Permission Middleware
const permission = (requiredPermission) => {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required.'
          });
        }
  
        // Super Admin มีสิทธิ์ทุกอย่าง
        if (req.user.role?.name === 'Super Admin') {
          return next();
        }
  
        // ตรวจสอบสิทธิ์
        const userPermissions = req.user.role?.permissions?.map(p => p.name) || [];
        
        if (!userPermissions.includes(requiredPermission)) {
          return res.status(403).json({
            success: false,
            message: `Insufficient permissions. Required: ${requiredPermission}`
          });
        }
  
        next();
      } catch (error) {
        console.error('Permission middleware error:', error);
        res.status(500).json({
          success: false,
          message: 'Permission check failed.'
        });
      }
    };
  };
  
  module.exports = permission;