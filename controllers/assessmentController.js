const { User, Assessment } = require('../utils/associations');
const bot = require('../config/botInstance');
const { chats } = require('../helpers/globalState');

async function showAssessments(chatId) {
    try {
        const user = await User.findOne({ where: { chatId } });
        if (!user) {
            return bot.sendMessage(chatId, 'Користувач не знайдений.');
        }

        const assessments = await Assessment.findAll({ where: { author_id: user.id } });

        if (!assessments.length) {
            return bot.sendMessage(chatId, 'Немає доступних тестів.');
        }

        const inlineKeyboard = assessments.map((assessment) => [
            { text: assessment.title, callback_data: `assessment_${assessment.id}` },
        ]);

        await bot.sendMessage(chatId, 'Оберіть тест із переліку:', {
            reply_markup: { inline_keyboard: inlineKeyboard },
        });
    } catch (err) {
        console.error(`Error showing assessments for chatId ${chatId}:`, err);
        await bot.sendMessage(chatId, 'Сталася помилка при отриманні тестів.');
    }
}

async function showAndDeleteAssessments(chatId) {
    try {
        const user = await User.findOne({ where: { chatId } });
        if (!user) {
            return bot.sendMessage(chatId, 'Користувач не знайдений.');
        }

        // Отримуємо всі тести користувача
        const assessments = await Assessment.findAll({ where: { author_id: user.id } });

        if (!assessments.length) {
            return bot.sendMessage(chatId, 'Немає доступних тестів.');
        }

        // Формуємо кнопки для кожного тесту
        const inlineKeyboard = assessments.map((assessment) => [
            { text: `🗑 Видалити ${assessment.title}`, callback_data: `delete_assessment_${assessment.id}` },
        ]);

        const message = await bot.sendMessage(chatId, 'Оберіть тест, який ви хочете видалити:', {
            reply_markup: { inline_keyboard: inlineKeyboard },
        });

        // Зберігаємо message_id для подальшого редагування
        chats[chatId] = { messageId: message.message_id };
    } catch (err) {
        console.error(`Error showing assessments for chatId ${chatId}:`, err);
        await bot.sendMessage(chatId, 'Сталася помилка при отриманні тестів.');
    }
}

// deleteAssessment
// saveQuestions

module.exports = {
    showAndDeleteAssessments,
    showAssessments
}
