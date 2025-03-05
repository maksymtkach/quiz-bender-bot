const { User, Session, Record, Question, Answer, Assessment } = require('../utils/associations');
const parseQstFile = require('../services/fileService');
const bot = require('../config/botInstance');
const { chats, chatStates } = require('../helpers/globalState');

async function documentController(msg) {
    const chatId = msg.chat.id;
    const fileId = msg.document.file_id;

    try {
        const fileInfo = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${fileInfo.file_path}`;

        const questions = await parseQstFile(fileUrl, chatId, bot);
        chats[chatId] = questions;

        await bot.sendMessage(chatId, `Чи хочете ви зберегти виявлені питання (${questions.length} питань)?`, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Так', callback_data: 'save_questions' },
                        { text: 'Ні', callback_data: 'skip_questions' },
                    ],
                ],
            },
        });
    } catch (err) {
        console.error('Error fetching file:', err);
        await bot.sendMessage(chatId, 'Сталася помилка при отриманні файлу.');
    }
}

module.exports = documentController;