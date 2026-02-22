const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Floor = sequelize.define('Floor', {
	id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	name: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'floors', timestamps: true });

module.exports = Floor;
