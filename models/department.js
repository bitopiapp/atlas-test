const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Department = sequelize.define('Department', {
	id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	name: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'departments', timestamps: true });

module.exports = Department;
