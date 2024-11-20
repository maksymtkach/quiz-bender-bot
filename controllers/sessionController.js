const { format } = require('date-fns');
const { User, Session, Record, Question, Answer, Assessment } = require('../utils/associations');
const { updateMainMenu } = require('../helpers/markupHelper');
const { sendTestResults } = require('../services/telegramService');

const bot = require('../config/botInstance');
const { Op } = require('sequelize');
let { activeDifficultQuestions } = require('../helpers/globalState');

async function pauseTest(chatId) {
    try {
        const user = await User.findOne({ where: { chatId } });
        if (!user) {
            return bot.sendMessage(chatId, 'Користувач не знайдений.');
        }

        const activeSession = await Session.findOne({
            where: {
                user_id: user.id,
                status: 'in_progress',
            },
        });

        if (!activeSession) {
            return bot.sendMessage(chatId, 'Активного тесту не знайдено.');
        }

        await activeSession.update({ status: 'paused' });

        await bot.sendMessage(chatId, 'Тест призупинено. Ви можете продовжити пізніше.');
        return updateMainMenu(chatId); // Оновлюємо меню
    } catch (err) {
        console.error(`Error pausing test for chatId ${chatId}:`, err);
        await bot.sendMessage(chatId, 'Сталася помилка при призупиненні тесту.');
    }
}

async function endTest(chatId) {
    try {
        const user = await User.findOne({ where: { chatId } });
        if (!user) {
            return bot.sendMessage(chatId, 'Користувач не знайдений.');
        }

        const activeSession = await Session.findOne({
            where: {
                user_id: user.id,
                status: 'in_progress',
            },
        });

        if (!activeSession) {
            return bot.sendMessage(chatId, 'Активного тесту не знайдено.');
        }

        // Завершуємо тест
        await activeSession.update({ status: 'completed', completed_at: new Date() });

        const totalQuestions = await Question.count({ where: { assessment_id: activeSession.assessment_id } });
        const correctAnswers = await Record.count({ where: { session_id: activeSession.id, status: 'correct' } });

        const incorrectAnswers = totalQuestions - correctAnswers;

        return await updateMainMenu(chatId); // Оновлюємо меню
    } catch (err) {
        console.error(`Error ending test for chatId ${chatId}:`, err);
        await bot.sendMessage(chatId, 'Сталася помилка при завершенні тесту.');
    }
}

async function showLastSessions(chatId) {
    try {
        const user = await User.findOne({ where: { chatId } });
        if (!user) {
            return bot.sendMessage(chatId, 'Користувач не знайдений.');
        }

        // Отримуємо сесії користувача, відсортовані за датою
        const sessions = await Session.findAll({
            where: { user_id: user.id },
            order: [['started_at', 'DESC']], // Сортування за датою у спадному порядку
            limit: 10, // Обмеження до 10 останніх сесій
        });

        if (!sessions.length) {
            return bot.sendMessage(chatId, 'Немає доступних сесій.');
        }

        const inlineKeyboard = [];
        for (const session of sessions) {
            console.log(session.assessment_id);
            const assessment = await Assessment.findOne({ where: { id: session.assessment_id } });

            const formattedDate = format(new Date(session.started_at), 'dd/MM HH:mm');

            if (session.status !== 'completed') {
                inlineKeyboard.push([{
                    text: `${assessment.title} (призупинено)`,
                    callback_data: `session_${session.id}`,
                }]);
            } else {
                inlineKeyboard.push([{
                    text: `${assessment.title} (${formattedDate})`,
                    callback_data: `session_${session.id}`,
                }]);
            }
        }

        await bot.sendMessage(chatId, 'Оберіть сесію із переліку:', {
            reply_markup: { inline_keyboard: inlineKeyboard },
        });
    } catch (err) {
        console.error(`Error showing assessments for chatId ${chatId}:`, err);
        await bot.sendMessage(chatId, 'Сталася помилка при отриманні сесій.');
    }
}

async function startLightSession(chatId, assessmentId) {
    try {
        const user = await User.findOne({ where: { chatId } });
        if (!user) {
            return bot.sendMessage(chatId, 'Користувач не знайдений.');
        }

        const session = await Session.create({
            status: 'in_progress',
            assessment_id: assessmentId,
            user_id: user.id,
        });

        await bot.sendMessage(chatId, `Сесія почата! ID сесії: ${session.id}`);
        showQuestion(chatId, session.id)
    } catch (err) {
        console.error(`Error starting session for assessment ${assessmentId}:`, err);
        await bot.sendMessage(chatId, 'Сталася помилка при створенні сесії.');
    }
}

async function showQuestion(chatId, sessionId) {
    try {
        const session = await Session.findByPk(sessionId);
        if (!session) {
            return bot.sendMessage(chatId, 'Сесію не знайдено.');
        }

        // Отримуємо список уже відповілих питань
        const answeredQuestions = await Record.findAll({
            where: { session_id: sessionId },
            attributes: ['question_id'],
        });

        const answeredIds = answeredQuestions.map((record) => record.question_id);
        console.log(answeredIds);

        // Шукаємо наступне питання
        const nextQuestion = await Question.findOne({
            where: {
                assessment_id: session.assessment_id,
                id: { [Op.notIn]: answeredIds }, // Тільки ті, на які ще не відповідали
            },
            include: [Answer],
        });

        // Якщо немає наступного питання, завершуємо тест
        if (!nextQuestion) {
            await session.update({
                status: 'completed',
                completed_at: new Date(), // Призначення дати завершення
            });

            // Отримуємо результати тесту
            const totalQuestions = await Question.count({
                where: { assessment_id: session.assessment_id },
            });

            const correctAnswers = await Record.count({
                where: { session_id: sessionId, status: 'correct' },
            });

            const incorrectAnswers = totalQuestions - correctAnswers;
            await updateMainMenu(chatId);

            return sendTestResults(chatId, correctAnswers, incorrectAnswers);
        }

        // Shuffle answers using Fisher-Yates algorithm
        const answers = nextQuestion.answers.map(answer => ({
            text: answer.answer_text,
            callback_data: `answer_${answer.id}`,
        }));

        for (let i = answers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [answers[i], answers[j]] = [answers[j], answers[i]];
        }

        const options = {
            reply_markup: {
                inline_keyboard: answers.map(answer => [answer]),
            },
        };

        await bot.sendMessage(
            chatId,
            `Питання: ${nextQuestion.question_text}`,
            options
        );
    } catch (err) {
        console.error(`Error showing next question for session ${sessionId}:`, err);
        await bot.sendMessage(chatId, 'Сталася помилка при показі наступного питання.');
    }
}

async function showDifficultQuestion(chatId, sessionId) {
    try {
        const session = await Session.findByPk(sessionId);
        if (!session) {
            return bot.sendMessage(chatId, 'Сесію не знайдено.');
        }

        // Ініціалізуємо масив оброблених питань для сесії, якщо його ще немає
        if (!activeDifficultQuestions[sessionId]) {
            activeDifficultQuestions[sessionId] = [];
        }

        // Отримуємо список питань з помилками
        const incorrectRecords = await Record.findAll({
            where: { session_id: sessionId, status: 'incorrect' },
            attributes: ['question_id'],
        });

        if (!incorrectRecords.length) {
            return bot.sendMessage(chatId, 'У вас немає питань із помилками у цій сесії.');
        }

        const incorrectQuestionIds = incorrectRecords.map(record => record.question_id);

        // Фільтруємо питання, які ще не були оброблені
        const remainingQuestions = incorrectQuestionIds.filter(
            questionId => !activeDifficultQuestions[sessionId].includes(questionId)
        );

        if (!remainingQuestions.length) {
            delete activeDifficultQuestions[sessionId]; // Очищаємо стан для цієї сесії
            return bot.sendMessage(chatId, 'Ви переглянули всі питання з помилками.');
        }

        // Вибираємо перше питання з помилками, яке ще не було оброблено
        const nextQuestion = await Question.findOne({
            where: { id: remainingQuestions[0] },
            include: [Answer],
        });

        if (!nextQuestion) {
            return bot.sendMessage(chatId, 'Питання з помилками не знайдено.');
        }

        // Додаємо це питання до оброблених
        activeDifficultQuestions[sessionId].push(nextQuestion.id);

        // Shuffle answers using Fisher-Yates algorithm
        const answers = nextQuestion.answers.map(answer => ({
            text: answer.answer_text,
            callback_data: `check_${answer.id}_${sessionId}`,
        }));

        for (let i = answers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [answers[i], answers[j]] = [answers[j], answers[i]];
        }

        const options = {
            reply_markup: {
                inline_keyboard: answers.map(answer => [answer]),
            },
        };

        await bot.sendMessage(
            chatId,
            `Питання: ${nextQuestion.question_text}`,
            options
        );
    } catch (err) {
        console.error(`Error showing difficult question for session ${sessionId}:`, err);
        await bot.sendMessage(chatId, 'Сталася помилка при показі питання.');
    }
}

async function showLastSessionsForFixing(chatId) {
    try {
        const user = await User.findOne({ where: { chatId } });
        if (!user) {
            return bot.sendMessage(chatId, 'Користувач не знайдений.');
        }

        const sessions = await Session.findAll({ where: { user_id: user.id } });

        if (!sessions.length) {
            return bot.sendMessage(chatId, 'Немає доступних сесій.');
        }

        const inlineKeyboard = [];
        for (let i = 0; i < sessions.length; i++) {
            console.log(sessions[i].assessment_id);
            const assessment = await Assessment.findOne({ where: { id: sessions[i].assessment_id } });

            const mistakes = await Record.findAll({
                where: {
                    session_id: sessions[i].id,
                    status: 'incorrect',
                }
            });

            const all = await Record.findAll({
                where: {
                    session_id: sessions[i].id,
                }
            });

            inlineKeyboard.push([{
                text: `${assessment.title} - ${((all.length - mistakes.length) / all.length) * 100}%`,
                callback_data: `revision_${sessions[i].id}`
            }]);
        }

        activeDifficultQuestions = {};

        await bot.sendMessage(chatId, 'Оберіть сесію для роботи над помилками:', {
            reply_markup: { inline_keyboard: inlineKeyboard },
        });
    } catch (err) {
        console.error(`Error showing assessments for chatId ${chatId}:`, err);
        await bot.sendMessage(chatId, 'Сталася помилка при отриманні сесій.');
    }
}

module.exports = { 
    pauseTest, 
    endTest, 
    showLastSessions, 
    startLightSession, 
    showQuestion, 
    showDifficultQuestion,
    showLastSessionsForFixing
};