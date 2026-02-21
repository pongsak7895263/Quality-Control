// models/QualityStandard.js
module.exports = (sequelize, DataTypes) => {
    const QualityStandard = sequelize.define('QualityStandard', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      materialGrade: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'material_grade',
        comment: 'เช่น S45C, SCM415, SCM420H'
      },
      standardName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'standard_name',
        comment: 'เช่น JIS G4051, JIS G4053'
      },
      processStage: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'process_stage',
        comment: 'เช่น chemical_test, hardness_test, dimension'
      },
      parameterName: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'parameter_name',
        comment: 'เช่น Carbon (C), Silicon (Si)'
      },
      minValue: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        field: 'min_value'
      },
      maxValue: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        field: 'max_value'
      },
      unit: {
        type: DataTypes.STRING(20),
        defaultValue: '%',
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
      }
    }, {
      tableName: 'quality_standards',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
  
    return QualityStandard;
  };