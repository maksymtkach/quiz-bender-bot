const sequelize = require('../config/database');
const {DataTypes} = require('sequelize');

const Assessment = sequelize.define('assessment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
},{
    timestamps: true,
    updatedAt: false,
});

// belongs to User (author)
module.exports = Assessment;