// backend/controllers/authController.js
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const { body, validationResult } = require("express-validator");
const { Op } = require("sequelize");

const ALLOWED_ROLES = ['operator', 'admin', 'inspector', 'manager', 'user'];

// --- Login Function ---
exports.loginUser = [
  body("identifier").optional().notEmpty().trim(),
  body("username").optional().notEmpty().trim(),
  body("password").notEmpty().withMessage("Password is required"),

  async (req, res) => {
    console.log('=== LOGIN REQUEST DEBUG ===');
    console.log('Request body:', {
      ...req.body,
      password: req.body.password ? '***' : undefined
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: "Validation failed",
        errors: errors.array() 
      });
    }

    const loginIdentifier = req.body.identifier || req.body.username;
    const { password } = req.body;
    
    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Username/email and password are required"
      });
    }

    try {
      console.log('🔍 Searching for user:', loginIdentifier);

      const user = await User.scope('withPassword').findOne({
        where: {
          [Op.or]: [
            { username: loginIdentifier.trim() }, 
            { email: loginIdentifier.trim().toLowerCase() }
          ],
        },
      });

      if (!user) {
        console.log('❌ User not found');
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      console.log('✅ User found:', {
        id: user.id,
        username: user.username,
        hasPassword: !!user.password  // เปลี่ยนจาก passwordHash
      });

      if (!user.password) {  // เปลี่ยนจาก passwordHash
        console.error('❌ No password in user object');
        return res.status(500).json({
          success: false,
          message: "User account configuration error",
        });
      }

      // ตรวจสอบว่า account ถูก lock หรือไม่
      if (user.isLocked && user.isLocked()) {
        const lockMinutes = Math.ceil((user.lockedUntil - new Date()) / 60000);
        return res.status(403).json({
          success: false,
          message: `Account is locked. Try again in ${lockMinutes} minutes.`,
        });
      }

      if (user.isActive === false) {
        return res.status(403).json({
          success: false,
          message: "Account is deactivated",
        });
      }

      console.log('🔐 Comparing passwords...');
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        console.log('❌ Invalid password');
        if (user.handleFailedLogin) {
          await user.handleFailedLogin();
        }
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      const payload = { 
        id: user.id,
        userId: user.id, 
        username: user.username, 
        role: user.role,
        email: user.email,
      };
      
      const token = jwt.sign(
        payload, 
        process.env.JWT_SECRET || 'your-secret-key', 
        {
          expiresIn: process.env.JWT_EXPIRES_IN || "24h",
        }
      );

      if (user.updateLastLogin) {
        await user.updateLastLogin();
      }

      const responseData = {
        success: true,
        message: "Login successful",
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            fullName: user.getFullName ? user.getFullName() : `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.email,
            role: user.role,
          },
        },
      };

      console.log('✅ Login successful');
      res.json(responseData);

    } catch (error) {
      console.error("💥 Login error:", error);
      
      if (error.name === 'SequelizeDatabaseError') {
        return res.status(503).json({
          success: false,
          message: "Database error occurred",
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
];

// --- Register Function ---
exports.registerUser = [
  body("username").isLength({ min: 4, max: 20 }).trim(),
  body("email").isEmail().normalizeEmail().trim(),
  body("password").isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body("firstName").optional().trim(),
  body("lastName").optional().trim(),
  body("role").optional().isIn(ALLOWED_ROLES),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: "Validation failed",
        errors: errors.array() 
      });
    }

    try {
      const { username, email, password, role, firstName, lastName } = req.body;

      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { username: username.trim() }, 
            { email: email.trim().toLowerCase() }
          ]
        }
      });

      if (existingUser) {
        const field = existingUser.username === username.trim() ? 'Username' : 'Email';
        return res.status(409).json({
          success: false,
          message: `${field} already exists.`,
        });
      }

      const userRole = role && ALLOWED_ROLES.includes(role) ? role : 'user';

      const newUser = await User.create({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        role: userRole,
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        isActive: true,
      });

      const responseData = {
        success: true,
        message: "User registered successfully.",
        data: { 
          id: newUser.id, 
          username: newUser.username,
          email: newUser.email,
          fullName: newUser.getFullName ? newUser.getFullName() : `${newUser.firstName || ''} ${newUser.lastName || ''}`.trim(),
          role: newUser.role
        },
      };

      res.status(201).json(responseData);

    } catch (error) {
      console.error("💥 Register error:", error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: "Username or email already exists.",
        });
      }
      
      res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  },
];

// --- Get Profile ---
exports.getProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    res.json({ 
      success: true, 
      data: {
        ...user.toJSON(),
        fullName: user.getFullName ? user.getFullName() : `${user.firstName || ''} ${user.lastName || ''}`.trim()
      }
    });
  } catch (error) {
    console.error("💥 Get profile error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error." 
    });
  }
};

// --- Update Profile ---
exports.updateProfile = [
  body("firstName").optional().isLength({ min: 2, max: 50 }).trim(),
  body("lastName").optional().isLength({ min: 2, max: 50 }).trim(),
  body("email").optional().isEmail().normalizeEmail().trim(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: "Validation failed",
        errors: errors.array() 
      });
    }

    try {
      const { firstName, lastName, email } = req.body;
      const userId = req.user.id;

      if (email) {
        const existingUser = await User.findOne({
          where: { 
            email: email.trim().toLowerCase(),
            id: { [Op.ne]: userId }
          }
        });

        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: "Email already exists.",
          });
        }
      }

      const updateData = {};
      if (firstName) updateData.firstName = firstName.trim();
      if (lastName) updateData.lastName = lastName.trim();
      if (email) updateData.email = email.trim().toLowerCase();

      await User.update(updateData, { where: { id: userId } });

      const updatedUser = await User.findByPk(userId);

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: {
          ...updatedUser.toJSON(),
          fullName: updatedUser.getFullName ? updatedUser.getFullName() : `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim()
        }
      });
    } catch (error) {
      console.error("💥 Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  },
];

// --- Logout ---
exports.logoutUser = async (req, res) => {
  res.json({
    success: true,
    message: "Logged out successfully",
  });
};

// --- Change Password ---
exports.changePassword = [
  body("currentPassword").notEmpty(),
  body("newPassword").isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: "Validation failed",
        errors: errors.array() 
      });
    }

    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.scope('withPassword').findByPk(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const isCurrentPasswordValid = await user.comparePassword(currentPassword);

      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("💥 Change password error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  },
];

// --- Health Check ---
exports.healthCheck = (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Quality Control System API',
    version: '1.0.0'
  });
};