// models/InspectionFile.js
module.exports = (sequelize, DataTypes) => {
  const InspectionFile = sequelize.define(
    "InspectionFile",
    {
      // กำหนดชื่อ Field ให้ตรงกับ Database
      file_path: { 
        type: DataTypes.STRING, 
        field: 'file_path' // บังคับให้ map กับ column นี้
      },
      original_name: { 
        type: DataTypes.STRING, 
        field: 'original_name' 
      },
      file_type: { 
        type: DataTypes.STRING, 
        field: 'file_type' 
      },
      file_size: { 
        type: DataTypes.INTEGER, 
        field: 'file_size' 
      },
      inspection_id: {
        type: DataTypes.INTEGER,
        field: 'inspection_id'
      }
    },
    {
      tableName: "inspection_files", // ชื่อตารางใน DB
      underscored: true,             // สำคัญ! เพื่อให้ created_at, updated_at ทำงานถูก
      timestamps: true,
    }
  );

  InspectionFile.associate = (models) => {
    InspectionFile.belongsTo(models.MaterialInspection, {
      foreignKey: "inspection_id",
      as: "inspection",
    });
  };

  return InspectionFile;
};