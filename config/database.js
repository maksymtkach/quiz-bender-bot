const {Sequelize} = require('sequelize');

const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
          dialect: 'postgres',
          protocol: 'postgres',
          dialectOptions: {
              ssl: {
                  require: true,
                  rejectUnauthorized: false,
              },
          },
      })
    : new Sequelize(
          process.env.DB_NAME || 'assessment_bot',
          process.env.DB_USER || 'postgres',
          process.env.DB_PASSWORD || '50024260',
          {
              host: process.env.DB_HOST || 'localhost',
              dialect: 'postgres',
              pool: {
                  max: 10,
                  min: 1,
                  acquire: 30000,
                  idle: 10000,
              },
          }
      );

module.exports = sequelize;

