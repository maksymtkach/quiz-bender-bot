const { sendMessageWithDelay } = require('../services/telegramService');
const bot = require('../config/botInstance');
const { User, Session } = require('../utils/associations');


async function showMainMenu(chatId) {
    const options = {
        reply_markup: {
            keyboard: [
                [{ text: '📋 Пройти тест' }, { text: '💌 Інформація' }],
                [{ text: '📜 Мої останні сесії' }, { text: '🔧 Робота над помилками' }],
                [{ text: '📃 Список тестів' }, { text: '🏆 Рейтинг користувачів' }],
            ],
            resize_keyboard: true, // Робить кнопки компактними
            one_time_keyboard: false, // Кнопки залишаються постійно
        },
    };
    return await sendMessageWithDelay(chatId, 'Оберіть дію або надішліть .qst файл', options);
}

async function updateMainMenu(chatId) {
    try {
        const user = await User.findOne({ where: { chatId } });
        if (!user) {
            return bot.sendMessage(chatId, 'Користувач не знайдений.');
        }

        // Перевіряємо, чи є активна сесія
        const activeSession = await Session.findOne({
            where: {
                user_id: user.id,
                status: 'in_progress',
            },
        });

        // Основні кнопки
        const keyboard = [
            [{ text: '📋 Пройти тест' }, { text: '💌 Інформація' }],
            [{ text: '📜 Мої останні сесії' }, { text: '🔧 Робота над помилками' }],
            [{ text: '📃 Список тестів' }, { text: '🏆 Рейтинг користувачів' }],
        ];

        // Додаткові кнопки, якщо є активна сесія
        if (activeSession) {
            keyboard.push([
                { text: '⏩ Призупинити тест' },
                { text: '🛑 Завершити тест' },
            ]);
        }

        const options = {
            reply_markup: {
                keyboard: keyboard,
                resize_keyboard: true,
                one_time_keyboard: false,
            },
        };

        return await bot.sendMessage(chatId, 'Оновлено меню', options);
    } catch (err) {
        console.error(`Error updating main menu for chatId ${chatId}:`, err);
        await bot.sendMessage(chatId, 'Сталася помилка при оновленні меню.');
    }
}

async function showTimers(chatId) {
    try {
        const timers = ['1 хвилина', '2 хвилини', '4 хвилини', '16 хвилин'];

        const inlineKeyboard = timers.map((timer, index) => [
            { text: timer, callback_data: `timer_${2 ** index}` },
        ]);

        await bot.sendMessage(chatId, 'Оберіть таймер для кожного питання строгого режиму:', {
            reply_markup: { inline_keyboard: inlineKeyboard },
        });
    } catch (err) {
        console.error(`Error showing timers for chatId ${chatId}:`, err);
        await bot.sendMessage(chatId, 'Сталася помилка при встановленні таймеру.');
    }
}

// inline_keyboard

module.exports = { 
    showMainMenu,
    updateMainMenu,
    showTimers
}