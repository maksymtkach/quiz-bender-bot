const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const Session = sequelize.define('session', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    started_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    status: {
        type: DataTypes.ENUM('in_progress', 'completed', 'paused'),
        allowNull: false,
        defaultValue: 'in_progress',
    }
}, {
    timestamps: false,
});

// belongs to User
// belongs to Assessment
module.exports = Session;