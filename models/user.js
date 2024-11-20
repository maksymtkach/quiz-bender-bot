const sequelize = require('../config/database');
const {DataTypes} = require('sequelize');

const User = sequelize.define('user', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    chatId: { type: DataTypes.STRING, unique: true, allowNull: false },
    firstName: { type: DataTypes.STRING },
    lastName: { type: DataTypes.STRING, allowNull: true },
},{
    timestamps: true,
    updatedAt: false,
});

module.exports = User;