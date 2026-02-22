const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Unit = sequelize.define('Unit', {
	id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	name: { type: DataTypes.STRING, allowNull: false },
	organization: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'units', timestamps: true });

module.exports = Unit;
