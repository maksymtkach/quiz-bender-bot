const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

// Intermediate table with composite PK
const Record = sequelize.define(
    'record',
    {
        session_id: { 
            type: DataTypes.INTEGER, 
            primaryKey: true, // Composite PK part 1 
        },
        question_id: { 
            type: DataTypes.INTEGER, 
            primaryKey: true, // Composite PK part 2
        },
        status: {
            type: DataTypes.ENUM('correct', 'incorrect'),
            allowNull: false,
            defaultValue: 'incorrect', // Progress tracking for each question in a session
        },
    },
    {
        timestamps: false, // Disable createdAt and updatedAt
        indexes: [
            {
                unique: true, // Ensure composite uniqueness
                fields: ['session_id', 'question_id'],
            },
        ],
    }
);

module.exports = Record;
