const bot = require('../config/botInstance');

async function sendMessageWithDelay(chatId, text, options) {
    try {
        await bot.sendChatAction(chatId, 'typing');

        await new Promise(resolve => setTimeout(resolve, 2000));

        await bot.sendMessage(chatId, text, options);
    } catch (err) {
        console.error('Error sending message with delay:', err);
    }
}

async function disableButtons(chatId, messageId) {
    try {
        await bot.editMessageReplyMarkup(
            { inline_keyboard: [] }, // Порожній об'єкт видаляє кнопки
            { chat_id: chatId, message_id: messageId }
        );
    } catch (err) {
        console.error(`Error disabling buttons for message ${messageId}:`, err);
    }
}

async function sendTestResults(chatId, correctAnswers, incorrectAnswers) {
    const stickers = {
        excellent: 'CAACAgIAAxkBAAIDhWc6nX3Ka7HOX0H7EYMQkjU_th1FAALxTQACUtpgSw5fdX_zLux-NgQ',
        good: 'CAACAgIAAxkBAAIF6mc60qIH40IZUZTuz4xdlu7iQYj_AAK_XAACg5vZS-1_k3aZyVGgNgQ',
        average: 'CAACAgIAAxkBAAIF6Wc60ePHc8Q4d4wAARr7TxrK93mG_wACy0wAAn8XAAFLo7T88GpWuUQ2BA',
        poor: 'CAACAgIAAxkBAAIFYmc6yKS6SNBKz8Q7uhjUh1bL7sxkAAIVSAACyleZSDYFw5bMEKLwNgQ',
    };

    let stickerId;
    const totalQuestions = correctAnswers + incorrectAnswers;
    const successRate = (correctAnswers / totalQuestions) * 100;

    if (successRate >= 90) {
        stickerId = stickers.excellent;
    } else if (successRate >= 70) {
        stickerId = stickers.good;
    } else if (successRate >= 50) {
        stickerId = stickers.average;
    } else {
        stickerId = stickers.poor;
    }

    // Відправка повідомлення та стікера
    return await bot.sendMessage(
        chatId,
        `✅ Тест завершено!\n\n📊 Результати:\n- Правильні відповіді: ${correctAnswers}\n- Неправильні відповіді: ${incorrectAnswers}\n🎉 Успішність: ${successRate.toFixed(2)}%`
    );
}

// bot.sendMessage
// bot.sendSticker
// bot.editMessageReplyMarkup

module.exports = {
    sendMessageWithDelay,
    disableButtons,
    sendTestResults
}