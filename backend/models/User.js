// backend/models/User.js
const bcrypt = require("bcryptjs");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'user',
    },
    firstName: { type: DataTypes.STRING },
    lastName: { type: DataTypes.STRING },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // สำหรับระบบ Lock Account
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lockedUntil: {
      type: DataTypes.DATE,
    },
    lastLogin: {
      type: DataTypes.DATE,
    }
  }, {
    tableName: 'users',
    timestamps: true,
    scopes: {
      // Scope สำหรับดึง Password (ปกติเราจะไม่ดึงมา)
      withPassword: {
        attributes: { include: ['password'] },
      }
    }
  });

  // --- Instance Methods (ฟังก์ชันที่ authController เรียกใช้) ---

  // 1. เทียบรหัสผ่าน
  User.prototype.comparePassword = async function (enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
  };

  // 2. เช็คว่าโดนล็อคไหม
  User.prototype.isLocked = function () {
    return this.lockedUntil && this.lockedUntil > new Date();
  };

  // 3. อัปเดตเวลาล็อกอินล่าสุด
  User.prototype.updateLastLogin = async function () {
    this.lastLogin = new Date();
    this.loginAttempts = 0;
    this.lockedUntil = null;
    await this.save();
  };

  // 4. จัดการเมื่อล็อกอินผิด (Lock Account logic)
  User.prototype.handleFailedLogin = async function () {
    this.loginAttempts += 1;
    if (this.loginAttempts >= 5) { // ผิด 5 ครั้ง ล็อค 15 นาที
      this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await this.save();
  };
  
  // 5. ดึงชื่อเต็ม
  User.prototype.getFullName = function () {
      return `${this.firstName || ''} ${this.lastName || ''}`.trim();
  };

  // --- Hooks ---
  // Hash Password ก่อนบันทึก
  User.beforeSave(async (user) => {
    if (user.changed("password")) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  });

  return User;
};