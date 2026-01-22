// backend/models/User.js
const { DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash' // ชี้ไปที่ column password_hash ในฐานข้อมูล
      },
      firstName: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'first_name',
      },
      lastName: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'last_name',
      },
      role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "user",
      },
      department: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active',
      },
      failedLoginAttempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'failed_login_attempts',
      },
      lockedUntil: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'locked_until',
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_login',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
      },
    },
    {
      tableName: "users",
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      
      defaultScope: {
        attributes: { exclude: ["password"] },
      },
      
      scopes: {
        withPassword: {
          attributes: { include: ["password"] },
        },
      },
      
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed("password")) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        },
      },
    }
  );

  User.prototype.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  User.prototype.updateLastLogin = async function () {
    this.lastLogin = new Date();
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
    await this.save({ 
      fields: ["lastLogin", "failedLoginAttempts", "lockedUntil"] 
    });
  };

  User.prototype.handleFailedLogin = async function () {
    this.failedLoginAttempts += 1;
    if (this.failedLoginAttempts >= 5) {
      this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await this.save({ 
      fields: ["failedLoginAttempts", "lockedUntil"] 
    });
  };

  User.prototype.isLocked = function () {
    return this.lockedUntil && this.lockedUntil > new Date();
  };

  User.prototype.getFullName = function() {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.username;
  };

  console.log('User model loaded successfully');

  return User;
};