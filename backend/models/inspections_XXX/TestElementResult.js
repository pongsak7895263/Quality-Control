// models/inspections/TestElementResult.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TestElementResult = sequelize.define('TestElementResult', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    elementSymbol: {
      type: DataTypes.STRING(5),
      allowNull: false,
      field: 'element_symbol'
    },
    elementName: {
      type: DataTypes.STRING(50),
      field: 'element_name'
    },
    specificationMin: {
      type: DataTypes.DECIMAL(15, 5),
      field: 'specification_min'
    },
    specificationMax: {
      type: DataTypes.DECIMAL(15, 5),
      field: 'specification_max'
    },
    measuredValue: {
      type: DataTypes.DECIMAL(15, 5),
      field: 'measured_value'
    },
    unit: {
      type: DataTypes.STRING(10),
      defaultValue: '%'
    },
    result: {
      type: DataTypes.ENUM('pass', 'fail')
    },
    analysisMethod: {
      type: DataTypes.STRING(50),
      field: 'analysis_method'
    }
  }, {
    tableName: 'test_element_results',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  TestElementResult.associate = (models) => {
    TestElementResult.belongsTo(models.ChemicalTest, {
      foreignKey: 'chemicalTestId',
      as: 'chemicalTest'
    });
  };

  return TestElementResult;
};