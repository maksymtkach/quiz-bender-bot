require('dotenv').config();
const sequelize = require('./config/database');
const { Op } = require('sequelize');
const { es } = require('date-fns/locale'); // not used? 
const callbackController = require('./controllers/callbackContoller');
const documentController = require('./controllers/documentController');
const messageController = require('./controllers/messageController');

const bot = require('./config/botInstance');

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established.');

        await sequelize.sync();

        console.log('All models synchronized successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

testConnection();

bot.setMyCommands([
    { command: '/start', description: 'Початок роботи із ботом' },
    { command: '/info', description: 'Інформація про студента' },
    { command: '/assessments', description: 'Показати всі тестування' },
])

bot.on('message', async (msg) => messageController(msg));

bot.on('callback_query', async (msg) => callbackController(msg));

bot.on('document', async (msg) => documentController(msg));

module.exports = bot;