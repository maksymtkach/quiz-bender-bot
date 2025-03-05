const { User, Question, Answer, Assessment } = require('../utils/associations');
const bot = require('../config/botInstance');
const { showMainMenu } = require('../helpers/markupHelper');
const information = require('../utils/textFile');
const { showAssessments, showAndDeleteAssessments } = require('../controllers/assessmentController');
const { pauseTest, endTest, showLastSessions, showLastSessionsForFixing } = require('../controllers/sessionController');
const { showUserStats } = require('../controllers/statsController');

const { chats, chatStates } = require('../helpers/globalState');

async function messageController(msg) {
    const text = msg.text;
    const chatId = String(msg.chat.id);

    if (msg.document) {
        return;
    }

    if (chatStates[chatId] === 'waiting_for_filename') {
        const fileName = text;
        delete chatStates[chatId];

        const questions = chats[chatId];
        if (!questions) {
            return bot.sendMessage(chatId, 'Немає питань для збереження.');
        }

        try {
            const user = await User.findOne({ where: { chatId } });
            const assessment = await Assessment.create({ title: fileName, author_id: user.id });

            for (let i = 0; i < questions.length; i++) {
                const questionData = questions[i];
                const question = await Question.create({
                    question_text: questionData.question,
                    assessment_id: assessment.id,
                });

                for (let j = 0; j < questionData.answers.length; j++) {
                    const answerData = questionData.answers[j];
                    const answer = await Answer.create({
                        answer_text: answerData.text,
                        question_id: question.id,
                    });

                    if (answerData.correct) {
                        await question.update({ correct_answer_id: answer.id });
                    }
                }
            }

            await bot.sendMessage(
                chatId,
                `✅ Питання збережено як <b>${fileName}</b>`,
                { parse_mode: 'HTML' }
            );
        } catch (err) {
            console.error('Error saving questions:', err);
            await bot.sendMessage(chatId, 'Сталася помилка при збереженні питань.');
        }
    }

    try {
        if (text === '/start') {
            const firstName = msg.from.first_name || 'Невідомо';
            const lastName = msg.from.last_name || '';
            let user = await User.findOne({ where: { chatId: chatId } });
            if (!user) {
                user = await User.create({
                    chatId,
                    firstName,
                    lastName,
                });
            }
            return await showMainMenu(chatId);
        }
        if (text === '💌 Інформація') {
            let infoMessage = information;
        
            // Надсилаємо повідомлення в HTML-форматі
            return await bot.sendMessage(chatId, infoMessage, { parse_mode: 'HTML' });
        }
        
        
        if (text === '📜 Мої останні сесії') {
            return showLastSessions(chatId);
        }
        if (text === '🔧 Робота над помилками') {
            return showLastSessionsForFixing(chatId);
        }
        if (text === '📋 Пройти тест') {
            return showAssessments(chatId);
        }
        if (text === '🏆 Рейтинг користувачів') {
            return showUserStats(chatId);
        }
        if (text === '⏩ Призупинити тест') {
            return pauseTest(chatId);
        }
        if (text === '🛑 Завершити тест') {
            return endTest(chatId);
        }
        if (text === '📃 Список тестів') {
            return showAndDeleteAssessments(chatId);
        }

    } catch (e) {
        console.error('Error:', e);
        return bot.sendMessage(chatId, 'Виникла помилка');
    }
}

module.exports = messageController;