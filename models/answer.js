const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const Answer = sequelize.define('answer', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    answer_text: { type: DataTypes.STRING, allowNull: false },
}, {
    timestamps: false,
});

module.exports = Answer;