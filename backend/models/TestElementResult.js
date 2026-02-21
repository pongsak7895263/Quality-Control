// models/TestElementResult.js
module.exports = (sequelize, DataTypes) => {
    const TestElementResult = sequelize.define('TestElementResult', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      chemicalTestId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'chemical_test_id',
        references: {
          model: 'chemical_tests',
          key: 'id'
        }
      },
      elementSymbol: {
        type: DataTypes.STRING(10),
        allowNull: false,
        field: 'element_symbol',
        comment: 'เช่น C, Si, Mn, P, S, Cu, Ni, Cr, Mo'
      },
      elementName: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'element_name',
        comment: 'ชื่อเต็ม เช่น Carbon, Silicon'
      },
      measuredValue: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        field: 'measured_value'
      },
      specificationMin: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        field: 'specification_min'
      },
      specificationMax: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        field: 'specification_max'
      },
      result: {
        type: DataTypes.ENUM('pass', 'fail', 'pending'),
        defaultValue: 'pending'
      },
      unit: {
        type: DataTypes.STRING(20),
        defaultValue: '%',
        allowNull: true
      }
    }, {
      tableName: 'test_element_results',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
  
    return TestElementResult;
  };