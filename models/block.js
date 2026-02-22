const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Block = sequelize.define('Block', {
	id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
	name: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'blocks', timestamps: true });

module.exports = Block;
