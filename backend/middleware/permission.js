// middleware/permission.js - Fixed Permission Middleware
const permission = (requiredPermission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      // ✅ รองรับ role ทั้งแบบ string และ object
      const userRole = typeof req.user.role === 'string' 
        ? req.user.role 
        : req.user.role?.name;

      // ✅ Super Admin / Admin มีสิทธิ์ทุกอย่าง
      if (userRole === 'admin' || userRole === 'super admin' || userRole === 'admin') {
        return next();
      }

      // ✅ ดึง permissions จากหลายแหล่ง
      let userPermissions = [];

      // 1. จาก role.permissions (object format)
      if (req.user.role?.permissions) {
        if (Array.isArray(req.user.role.permissions)) {
          userPermissions = req.user.role.permissions.map(p => 
            typeof p === 'string' ? p : p.name
          );
        }
      }

      // 2. จาก user.permissions โดยตรง (array format)
      if (req.user.permissions) {
        if (Array.isArray(req.user.permissions)) {
          const directPermissions = req.user.permissions.map(p => 
            typeof p === 'string' ? p : p.name
          );
          userPermissions = [...userPermissions, ...directPermissions];
        }
      }

      // 3. ✅ Default permissions ตาม role (ถ้าไม่มี permissions ใน token)
      if (userPermissions.length === 0) {
        const defaultPermissions = getDefaultPermissions(userRole);
        userPermissions = defaultPermissions;
      }

      // ตรวจสอบสิทธิ์
      if (!userPermissions.includes(requiredPermission)) {
        console.log(`Permission denied for user ${req.user.username}:`, {
          required: requiredPermission,
          userRole: userRole,
          userPermissions: userPermissions
        });

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

// ✅ Default permissions ตาม role
function getDefaultPermissions(role) {
  const permissionMap = {
    'admin': [
      // Chemical Test
      'chemical_test_view',
      'chemical_test_create',
      'chemical_test_edit',
      'chemical_test_delete',
      'chemical_test_approve',
      // Material Inspection
      'material_inspection_view',
      'material_inspection_create',
      'material_inspection_edit',
      'material_inspection_delete',
      // Hardness
      'hardness_view',
      'hardness_create',
      'hardness_edit',
      'hardness_delete',
      // Calibration
      'calibration_view',
      'calibration_create',
      'calibration_edit',
      'calibration_delete',
    ],
    'manager': [
      'chemical_test_view',
      'chemical_test_create',
      'chemical_test_edit',
      'chemical_test_approve',
      'material_inspection_view',
      'material_inspection_create',
      'material_inspection_edit',
      'hardness_view',
      'hardness_create',
      'hardness_edit',
      'calibration_view',
    ],
    'user': [
      'chemical_test_view',
      'chemical_test_create',
      'material_inspection_view',
      'material_inspection_create',
      'hardness_view',
      'hardness_create',
      'calibration_view',
    ],
    'viewer': [
      'chemical_test_view',
      'material_inspection_view',
      'hardness_view',
      'calibration_view',
    ]
  };

  return permissionMap[role?.toLowerCase()] || permissionMap['viewer'];
}

module.exports = permission;