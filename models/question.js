const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const Question = sequelize.define('question', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    question_text: { type: DataTypes.TEXT, allowNull: false },
}, {
    timestamps: false,
});

module.exports = Question;
