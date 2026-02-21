module.exports = (sequelize, DataTypes) => {
    const InspectionFile = sequelize.define("InspectionFile", {
      filePath: { 
        type: DataTypes.STRING, 
        field: 'file_path' // แมพกับชื่อ field ใน DB (snake_case)
      },
      originalName: { 
        type: DataTypes.STRING,
        field: 'original_name'
      },
      fileType: { 
        type: DataTypes.STRING,
        field: 'file_type'
      },
      fileSize: { 
        type: DataTypes.INTEGER,
        field: 'file_size'
      },
      inspectionId: {
        type: DataTypes.INTEGER,
        field: 'inspection_id'
      }
    }, {
      tableName: 'inspection_files',
      underscored: true
    });
  
    return InspectionFile;
  };