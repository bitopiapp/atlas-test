const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  adminId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'unlock',
  },
  deviceToken: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  factoryReset: {
    type: DataTypes.STRING,
    defaultValue: 'disable',
  },
  location: {
    type: DataTypes.STRING,
    defaultValue: 'disable',
  },
  batteryStatus: {
    type: DataTypes.STRING,
    defaultValue: 'disable',
  },
  lockDevice: {
    type: DataTypes.STRING,
    defaultValue: 'disable',
  },
  unlockDevice: {
    type: DataTypes.STRING,
    defaultValue: 'disable',
  },
  employeeId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  latitude: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  longitude: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  deviceInfo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'devices',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
});

module.exports = Device;
