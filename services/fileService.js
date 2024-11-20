const axios = require('axios');
const readline = require('readline');
const bot = require('../config/botInstance');

async function parseQstFile(fileUrl, chatId) {
    try {
        const response = await axios({
            method: 'get',
            url: fileUrl,
            responseType: 'stream',
        });

        const questions = [];
        let currentQuestion = null;

        const rl = readline.createInterface({
            input: response.data,
            output: process.stdout,
            terminal: false,
        });

        rl.on('line', (line) => {
            if (line.startsWith('?')) {
                if (currentQuestion) questions.push(currentQuestion);
                currentQuestion = { question: line.slice(1).trim(), answers: [] };
            } else if (line.startsWith('+')) {
                currentQuestion.answers.push({ text: line.slice(1).trim(), correct: true });
            } else if (line.startsWith('-')) {
                currentQuestion.answers.push({ text: line.slice(1).trim(), correct: false });
            }
        });

        return new Promise((resolve) => {
            rl.on('close', () => {
                if (currentQuestion) questions.push(currentQuestion);
    
                resolve(questions);
            });
        });
    } catch (err) {
        console.error('Error parsing file:', err);
        await bot.sendMessage(chatId, 'Сталася помилка під час завантаження або обробки документа.');
        return [];
    }
}

module.exports = parseQstFile;