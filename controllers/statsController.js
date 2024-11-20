const { User, Session, Record } = require('../utils/associations');
const { Op } = require('sequelize');
const bot = require('../config/botInstance');
const { formatTime } = require('../helpers/formatHelper')

async function showUserStats(chatId) {
    try {
        // Отримуємо всіх користувачів
        const users = await User.findAll();
        if (!users.length) {
            return bot.sendMessage(chatId, 'Користувачів не знайдено.');
        }

        // Підготовка даних
        let stats = [];
        for (const user of users) {
            const sessions = await Session.findAll({ where: { user_id: user.id } });
            if (!sessions.length) continue;

            const totalTests = sessions.length;

            const totalCorrectAnswers = await Record.count({
                where: { session_id: { [Op.in]: sessions.map(s => s.id) }, status: 'correct' },
            });

            const totalQuestions = await Record.count({
                where: { session_id: { [Op.in]: sessions.map(s => s.id) } },
            });

            const totalIncorrectAnswers = totalQuestions - totalCorrectAnswers;

            const totalTime = sessions.reduce((acc, session) => {
                const start = new Date(session.started_at);
                const end = session.completed_at ? new Date(session.completed_at) : new Date();
                return acc + (end - start);
            }, 0);

            const avgTimePerSession = totalTime / totalTests;

            const avgSuccessRate = totalQuestions ? (totalCorrectAnswers / totalQuestions) * 100 : 0;

            stats.push({
                user,
                totalTests,
                totalCorrectAnswers,
                totalIncorrectAnswers,
                totalTime,
                avgTimePerSession,
                avgSuccessRate,
            });
        }

        const topTotalTests = [...stats].sort((a, b) => b.totalTests - a.totalTests).slice(0, 3);
        const topSuccessRate = [...stats].sort((a, b) => b.avgSuccessRate - a.avgSuccessRate).slice(0, 3);
        const topLongestSessions = [...stats].sort((a, b) => b.totalTime - a.totalTime).slice(0, 3);

        let message = `📊 <b>Рейтинг користувачів</b>\n\n`;

        // Топ-3 за кількістю пройдених тестів
        message += `🏆 <b>Топ-3 за кількістю пройдених тестів</b>:\n`;
        topTotalTests.forEach((stat, index) => {
            message += `${index + 1}. ${stat.user.firstName} ${stat.user.lastName}: ${stat.totalTests} тестів\n`;
        });

        // Топ-3 за успішністю
        message += `\n🎯 <b>Топ-3 за успішністю</b>:\n`;
        topSuccessRate.forEach((stat, index) => {
            message += `${index + 1}. ${stat.user.firstName} ${stat.user.lastName}: ${stat.avgSuccessRate.toFixed(2)}%\n`;
        });

        // Топ-3 за тривалістю сесій
        message += `\n⏱ <b>Топ-3 найдовших сесій</b>:\n`;
        topLongestSessions.forEach((stat, index) => {
            message += `${index + 1}. ${stat.user.firstName} ${stat.user.lastName}: ${formatTime(stat.totalTime)}\n`;
        });

        // Загальна статистика
        const totalTests = stats.reduce((sum, stat) => sum + stat.totalTests, 0);
        const totalTime = stats.reduce((sum, stat) => sum + stat.totalTime, 0);
        const avgTime = stats.reduce((sum, stat) => sum + stat.avgTimePerSession, 0) / stats.length || 0;
        const avgSuccessRate = stats.reduce((sum, stat) => sum + stat.avgSuccessRate, 0) / stats.length || 0;

        message += `\n📈 <b>Персональна статистика</b>:\n`;
        message += `- Всього пройдено тестів: ${totalTests}\n`;
        message += `- Всього часу витрачено: ${formatTime(totalTime)}\n`;
        message += `- Середня тривалість сесії: ${formatTime(avgTime)}\n`;
        message += `- Середня успішність: ${avgSuccessRate.toFixed(2)}%\n`;

        // Відправляємо повідомлення
        await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (err) {
        console.error('Error showing user stats:', err);
        await bot.sendMessage(chatId, 'Сталася помилка при отриманні статистики.');
    }
}

module.exports = {
    showUserStats
}