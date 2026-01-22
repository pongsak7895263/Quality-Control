// controllers/settings/settingsController.js - Settings Management
const { SystemSettings, User, Role, Permission, QualityStandard } = require('../../models');
const { validationResult } = require('express-validator');
const { logger } = require('../../utils/monitoring');

const settingsController = {
  // GET /api/settings/system - Get system settings
  getSystemSettings: async (req, res) => {
    try {
      const { category } = req.query;
      
      let whereCondition = { isEditable: true };
      if (category) {
        whereCondition.category = category;
      }

      const settings = await SystemSettings.findAll({
        where: whereCondition,
        order: [['category', 'ASC'], ['settingKey', 'ASC']]
      });

      // Group settings by category
      const groupedSettings = settings.reduce((acc, setting) => {
        const category = setting.category || 'general';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          key: setting.settingKey,
          value: setting.settingValue,
          description: setting.description,
          dataType: setting.dataType
        });
        return acc;
      }, {});

      res.json({
        success: true,
        data: groupedSettings
      });
    } catch (error) {
      logger.error('Get system settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system settings',
        error: error.message
      });
    }
  },

  // PUT /api/settings/system - Update system settings
  updateSystemSettings: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { settings } = req.body; // Array of {key, value} objects
      const updatedSettings = [];

      for (const setting of settings) {
        const existingSetting = await SystemSettings.findOne({
          where: { settingKey: setting.key, isEditable: true }
        });

        if (!existingSetting) {
          return res.status(404).json({
            success: false,
            message: `Setting '${setting.key}' not found or not editable`
          });
        }

        await existingSetting.update({
          settingValue: setting.value,
          updatedBy: req.user.id
        });

        updatedSettings.push({
          key: setting.key,
          value: setting.value,
          category: existingSetting.category
        });
      }

      logger.info('System settings updated', {
        userId: req.user.id,
        settings: updatedSettings
      });

      res.json({
        success: true,
        message: 'System settings updated successfully',
        data: updatedSettings
      });
    } catch (error) {
      logger.error('Update system settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update system settings',
        error: error.message
      });
    }
  },

  // GET /api/settings/users - Get users management
  getUsers: async (req, res) => {
    try {
      const { page = 1, limit = 10, search, role, status } = req.query;
      const offset = (page - 1) * limit;
      
      let whereCondition = {};
      
      if (search) {
        whereCondition = {
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${search}%` } },
            { lastName: { [Op.iLike]: `%${search}%` } },
            { username: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } }
          ]
        };
      }
      
      if (status === 'active') whereCondition.isActive = true;
      if (status === 'inactive') whereCondition.isActive = false;

      let include = [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name', 'description']
      }];

      if (role) {
        include[0].where = { name: role };
      }

      const { count, rows: users } = await User.findAndCountAll({
        where: whereCondition,
        include,
        attributes: { exclude: ['passwordHash'] },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: offset
      });

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      logger.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      });
    }
  },

  // POST /api/settings/users - Create new user
  createUser: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userData = req.body;

      // Check if username or email already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { username: userData.username },
            { email: userData.email }
          ]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Username or email already exists'
        });
      }

      // Hash password
      const bcrypt = require('bcryptjs');
      const saltRounds = 12;
      userData.passwordHash = await bcrypt.hash(userData.password, saltRounds);
      delete userData.password;

      const user = await User.create(userData);

      // Return user data without password hash
      const { passwordHash, ...userResponse } = user.toJSON();

      logger.info('User created', {
        createdBy: req.user.id,
        newUserId: user.id,
        username: user.username
      });

      res.status(201).json({
        success: true,
        data: userResponse,
        message: 'User created successfully'
      });
    } catch (error) {
      logger.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: error.message
      });
    }
  },

  // GET /api/settings/quality-standards - Get quality standards
  getQualityStandards: async (req, res) => {
    try {
      const { materialGrade, processStage, isActive } = req.query;
      
      let whereCondition = {};
      if (materialGrade) whereCondition.materialGrade = materialGrade;
      if (processStage) whereCondition.processStage = processStage;
      if (isActive !== undefined) whereCondition.isActive = isActive === 'true';

      const standards = await QualityStandard.findAll({
        where: whereCondition,
        include: [{
          model: User,
          as: 'creator',
          attributes: ['firstName', 'lastName', 'employeeId']
        }],
        order: [['materialGrade', 'ASC'], ['processStage', 'ASC'], ['parameterName', 'ASC']]
      });

      res.json({
        success: true,
        data: standards
      });
    } catch (error) {
      logger.error('Get quality standards error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quality standards',
        error: error.message
      });
    }
  },

  // POST /api/settings/quality-standards - Create quality standard
  createQualityStandard: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const standardData = {
        ...req.body,
        createdBy: req.user.id
      };

      const standard = await QualityStandard.create(standardData);

      logger.info('Quality standard created', {
        createdBy: req.user.id,
        standardCode: standard.standardCode
      });

      res.status(201).json({
        success: true,
        data: standard,
        message: 'Quality standard created successfully'
      });
    } catch (error) {
      logger.error('Create quality standard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create quality standard',
        error: error.message
      });
    }
  }
};

module.exports = settingsController;