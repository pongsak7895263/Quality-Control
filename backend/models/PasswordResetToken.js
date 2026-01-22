// backend/models/PasswordResetToken.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PasswordResetToken = sequelize.define('PasswordResetToken', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      field: 'user_id'
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    },
    used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'used_at'
    }
  }, {
    tableName: 'password_reset_tokens',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  // Instance method: check if token is valid
  PasswordResetToken.prototype.isValid = function () {
    return !this.used && this.expiresAt > new Date();
  };

  // Instance method: mark token as used
  PasswordResetToken.prototype.markAsUsed = async function () {
    this.used = true;
    this.usedAt = new Date();
    await this.save({ fields: ["used", "usedAt"] });
  };

  console.log('✅ PasswordResetToken model loaded');

  return PasswordResetToken;
};