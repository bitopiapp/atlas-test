const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const CompanySetup = sequelize.define('CompanySetup', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  organization: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  floor: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  block: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'company_setup',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
});

module.exports = CompanySetup;
