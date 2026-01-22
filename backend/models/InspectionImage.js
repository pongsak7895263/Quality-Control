// backend/models/InspectionImage.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InspectionImage = sequelize.define('InspectionImage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    inspectionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'inspection_id', // แก้ไข typo จาก inspectiob_id
      references: {
        model: 'material_inspections',
        key: 'id'
      }
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'image_url'
    },
    imageType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'image_type',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    tableName: 'inspection_images',
    underscored: true
  });

  console.log('✅ InspectionImage model loaded');

  return InspectionImage;
};