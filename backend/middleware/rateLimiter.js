// middleware/rateLimiter.js - Advanced Rate Limiting
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');

// Create Redis client if Redis URL is provided
let redisClient = null;
if (process.env.REDIS_URL) {
  redisClient = Redis.createClient({
    url: process.env.REDIS_URL
  });
}

// General API rate limiter
const apiLimiter = rateLimit({
  store: redisClient ? new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }) : undefined,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many API requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for authentication endpoints
const authLimiter = rateLimit({
  store: redisClient ? new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }) : undefined,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again later.'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
  message: {
    success: false,
    message: 'Too many file uploads from this IP, please try again later.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter
};

// seeders/001-default-roles-permissions.js - Database Seeders
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Insert Roles
      const roles = await queryInterface.bulkInsert('roles', [
        {
          name: 'Super Admin',
          description: 'ผู้ดูแลระบบสูงสุด มีสิทธิ์เข้าถึงทุกฟีเจอร์',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'QA Manager',
          description: 'ผู้จัดการฝ่ายประกันคุณภาพ',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'QC Inspector',
          description: 'เจ้าหน้าที่ตรวจสอบคุณภาพ',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Production Supervisor',
          description: 'หัวหน้างานผลิต',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Operator',
          description: 'พนักงานปฏิบัติการ',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Viewer',
          description: 'ผู้ดูข้อมูลเท่านั้น',
          created_at: new Date(),
          updated_at: new Date()
        }
      ], { transaction, returning: true });

      // Insert Permissions
      const permissions = await queryInterface.bulkInsert('permissions', [
        // Dashboard permissions
        { name: 'dashboard_view', description: 'ดูข้อมูล Dashboard', module: 'dashboard', action: 'read', created_at: new Date() },
        { name: 'dashboard_manage', description: 'จัดการ Dashboard', module: 'dashboard', action: 'manage', created_at: new Date() },

        // Material Inspection permissions
        { name: 'material_inspection_view', description: 'ดูการตรวจสอบวัตถุดิบ', module: 'inspections', action: 'read', created_at: new Date() },
        { name: 'material_inspection_create', description: 'สร้างการตรวจสอบวัตถุดิบ', module: 'inspections', action: 'create', created_at: new Date() },
        { name: 'material_inspection_edit', description: 'แก้ไขการตรวจสอบวัตถุดิบ', module: 'inspections', action: 'update', created_at: new Date() },
        { name: 'material_inspection_approve', description: 'อนุมัติการตรวจสอบวัตถุดิบ', module: 'inspections', action: 'approve', created_at: new Date() },

        // Chemical Test permissions
        { name: 'chemical_test_view', description: 'ดูการทดสอบเคมี', module: 'inspections', action: 'read', created_at: new Date() },
        { name: 'chemical_test_create', description: 'สร้างการทดสอบเคมี', module: 'inspections', action: 'create', created_at: new Date() },
        { name: 'chemical_test_edit', description: 'แก้ไขการทดสอบเคมี', module: 'inspections', action: 'update', created_at: new Date() },
        { name: 'chemical_test_approve', description: 'อนุมัติการทดสอบเคมี', module: 'inspections', action: 'approve', created_at: new Date() },

        // Billet Inspection permissions
        { name: 'billet_inspection_view', description: 'ดูการตรวจสอบเหล็กท่อน', module: 'inspections', action: 'read', created_at: new Date() },
        { name: 'billet_inspection_create', description: 'สร้างการตรวจสอบเหล็กท่อน', module: 'inspections', action: 'create', created_at: new Date() },
        { name: 'billet_inspection_edit', description: 'แก้ไขการตรวจสอบเหล็กท่อน', module: 'inspections', action: 'update', created_at: new Date() },
        { name: 'billet_inspection_approve', description: 'อนุมัติการตรวจสอบเหล็กท่อน', module: 'inspections', action: 'approve', created_at: new Date() },

        // Final Inspection permissions
        { name: 'final_inspection_view', description: 'ดูการตรวจสอบขั้นสุดท้าย', module: 'inspections', action: 'read', created_at: new Date() },
        { name: 'final_inspection_create', description: 'สร้างการตรวจสอบขั้นสุดท้าย', module: 'inspections', action: 'create', created_at: new Date() },
        { name: 'final_inspection_approve', description: 'อนุมัติการตรวจสอบขั้นสุดท้าย', module: 'inspections', action: 'approve', created_at: new Date() },

        // Reports permissions
        { name: 'reports_view', description: 'ดูรายงาน', module: 'reports', action: 'read', created_at: new Date() },
        { name: 'reports_export', description: 'ส่งออกรายงาน', module: 'reports', action: 'export', created_at: new Date() },
        { name: 'reports_manage', description: 'จัดการรายงาน', module: 'reports', action: 'manage', created_at: new Date() },

        // Settings permissions
        { name: 'settings_view', description: 'ดูการตั้งค่า', module: 'settings', action: 'read', created_at: new Date() },
        { name: 'settings_manage', description: 'จัดการการตั้งค่า', module: 'settings', action: 'manage', created_at: new Date() },
        { name: 'users_manage', description: 'จัดการผู้ใช้', module: 'settings', action: 'manage', created_at: new Date() },
        { name: 'quality_standards_manage', description: 'จัดการมาตรฐานคุณภาพ', module: 'settings', action: 'manage', created_at: new Date() }
      ], { transaction, returning: true });

      // Create Role-Permission mappings
      const rolePermissionMappings = [
        // Super Admin - All permissions
        ...permissions.map(permission => ({
          role_id: roles.find(r => r.name === 'Super Admin')?.id || 1,
          permission_id: permission.id,
          created_at: new Date()
        })),

        // QA Manager permissions
        ...[
          'dashboard_view', 'material_inspection_view', 'material_inspection_approve',
          'chemical_test_view', 'chemical_test_approve', 'billet_inspection_view',
          'billet_inspection_approve', 'final_inspection_view', 'final_inspection_approve',
          'reports_view', 'reports_export', 'quality_standards_manage'
        ].map(permName => ({
          role_id: roles.find(r => r.name === 'QA Manager')?.id || 2,
          permission_id: permissions.find(p => p.name === permName)?.id,
          created_at: new Date()
        })),

        // QC Inspector permissions
        ...[
          'dashboard_view', 'material_inspection_view', 'material_inspection_create',
          'material_inspection_edit', 'chemical_test_view', 'chemical_test_create',
          'chemical_test_edit', 'billet_inspection_view', 'billet_inspection_create',
          'billet_inspection_edit', 'final_inspection_view', 'final_inspection_create',
          'reports_view'
        ].map(permName => ({
          role_id: roles.find(r => r.name === 'QC Inspector')?.id || 3,
          permission_id: permissions.find(p => p.name === permName)?.id,
          created_at: new Date()
        })),

        // Production Supervisor permissions
        ...[
          'dashboard_view', 'material_inspection_view', 'billet_inspection_view',
          'final_inspection_view', 'reports_view'
        ].map(permName => ({
          role_id: roles.find(r => r.name === 'Production Supervisor')?.id || 4,
          permission_id: permissions.find(p => p.name === permName)?.id,
          created_at: new Date()
        })),

        // Operator permissions
        ...[
          'dashboard_view', 'material_inspection_view', 'billet_inspection_view'
        ].map(permName => ({
          role_id: roles.find(r => r.name === 'Operator')?.id || 5,
          permission_id: permissions.find(p => p.name === permName)?.id,
          created_at: new Date()
        })),

        // Viewer permissions
        ...[
          'dashboard_view', 'reports_view'
        ].map(permName => ({
          role_id: roles.find(r => r.name === 'Viewer')?.id || 6,
          permission_id: permissions.find(p => p.name === permName)?.id,
          created_at: new Date()
        }))
      ].filter(mapping => mapping.permission_id); // Filter out any undefined permission_id

      await queryInterface.bulkInsert('role_permissions', rolePermissionMappings, { transaction });

      // Create default admin user
      const adminPasswordHash = await bcrypt.hash('admin123456', 12);
      await queryInterface.bulkInsert('users', [{
        employee_id: 'ADM001',
        username: 'admin',
        email: 'admin@company.com',
        password_hash: adminPasswordHash,
        first_name: 'System',
        last_name: 'Administrator',
        department: 'IT',
        position: 'System Administrator',
        role_id: roles.find(r => r.name === 'Super Admin')?.id || 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }], { transaction });

      // Insert sample production lines
      await queryInterface.bulkInsert('production_lines', [
        {
          line_code: 'LINE-001',
          name: 'สายการผลิตหลัก #1',
          description: 'สายการผลิตเหล็กขึ้นรูปหลัก',
          capacity_per_hour: 500.00,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          line_code: 'LINE-002',
          name: 'สายการผลิต #2',
          description: 'สายการผลิตสำหรับผลิตภัณฑ์พิเศษ',
          capacity_per_hour: 300.00,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ], { transaction });

      // Insert sample equipment
      await queryInterface.bulkInsert('equipment', [
        {
          equipment_code: 'FURN-001',
          name: 'เตาเผาอุตสาหกรรม #1',
          type: 'furnace',
          production_line_id: 1,
          manufacturer: 'Industrial Furnace Co.',
          installation_date: '2020-01-15',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          equipment_code: 'PRESS-001',
          name: 'เครื่องอัดขึ้นรูป #1',
          type: 'press',
          production_line_id: 1,
          manufacturer: 'Heavy Machinery Ltd.',
          installation_date: '2020-02-01',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        }
      ], { transaction });

      // Insert quality standards
      await queryInterface.bulkInsert('quality_standards', [
        {
          standard_code: 'STD-C-1045',
          name: 'Carbon Content - AISI 1045',
          material_grade: 'AISI 1045',
          process_stage: 'chemical_test',
          parameter_name: 'Carbon (C)',
          min_value: 0.42,
          max_value: 0.50,
          target_value: 0.46,
          unit: '%',
          tolerance: 0.02,
          is_active: true,
          created_by: 1,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          standard_code: 'STD-MN-1045',
          name: 'Manganese Content - AISI 1045',
          material_grade: 'AISI 1045',
          process_stage: 'chemical_test',
          parameter_name: 'Manganese (Mn)',
          min_value: 0.60,
          max_value: 0.90,
          target_value: 0.75,
          unit: '%',
          tolerance: 0.05,
          is_active: true,
          created_by: 1,
          created_at: new Date(),
          updated_at: new Date()
        }
      ], { transaction });

      // Insert system settings
      await queryInterface.bulkInsert('system_settings', [
        {
          setting_key: 'company_name',
          setting_value: 'Steel Manufacturing Co., Ltd.',
          description: 'ชื่อบริษัท',
          category: 'general',
          data_type: 'string',
          is_editable: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          setting_key: 'default_material_grade',
          setting_value: 'AISI 1045',
          description: 'เกรดวัสดุเริ่มต้น',
          category: 'quality',
          data_type: 'string',
          is_editable: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          setting_key: 'quality_alert_email',
          setting_value: 'qa@company.com',
          description: 'อีเมลแจ้งเตือนคุณภาพ',
          category: 'notifications',
          data_type: 'string',
          is_editable: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ], { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Delete in reverse order due to foreign key constraints
      await queryInterface.bulkDelete('system_settings', null, { transaction });
      await queryInterface.bulkDelete('quality_standards', null, { transaction });
      await queryInterface.bulkDelete('equipment', null, { transaction });
      await queryInterface.bulkDelete('production_lines', null, { transaction });
      await queryInterface.bulkDelete('users', null, { transaction });
      await queryInterface.bulkDelete('role_permissions', null, { transaction });
      await queryInterface.bulkDelete('permissions', null, { transaction });
      await queryInterface.bulkDelete('roles', null, { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};