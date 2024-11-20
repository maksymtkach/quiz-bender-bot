const { User, Session, Record, Question, Answer, Assessment } = require('../utils/associations');
const bot = require('../config/botInstance');
const { format } = require('date-fns');

const { escapeMarkdownV2 } = require('../helpers/formatHelper');
const { updateMainMenu, showTimers } = require('../helpers/markupHelper');
const { disableButtons } = require('../services/telegramService');

const { chatStates } = require('../helpers/globalState');

const { startLightSession, showQuestion, showDifficultQuestion } = require('../controllers/sessionController');

async function callbackController(msg) {
    const data = msg.data;
    const chatId = String(msg.message.chat.id);
    const user = await User.findOne({ where: { chatId } });

    try {
        switch (true) {
            case data.startsWith('assessment_'):
                var assessmentId = data.split('_')[1];
                var assessment = await Assessment.findByPk(assessmentId);

                if (!assessment) {
                    return bot.sendMessage(chatId, 'Обраного тесту не існує.');
                }

                await disableButtons(chatId, msg.message.message_id);


                // Завершити попередні сесії, якщо такі є
                await Session.update(
                    { status: 'completed' },
                    { where: { user_id: user.id, assessment_id: assessmentId, status: 'in_progress' } }
                );

                // Створити нову сесію
                var session = await Session.create({
                    status: 'in_progress',
                    assessment_id: assessmentId,
                    user_id: user.id,
                });

                await updateMainMenu(chatId);

                await bot.sendMessage(chatId, `Тест "${assessment.title}" розпочато. ID сесії: ${session.id}`);

                // Показати перше питання
                return showQuestion(chatId, session.id);

            case data.startsWith('session_'):
                var sessionId = data.split('_')[1];
                var session = await Session.findByPk(sessionId);

                if (!session) {
                    return bot.sendMessage(chatId, 'Обраної сесії не існує.');
                }

                var assessment = await Assessment.findOne({
                    where: {
                        id: session.assessment_id,
                    }
                });

                if (session.status === 'paused') {
                    // Відновлення сесії
                    await session.update({ status: 'in_progress' });

                    const all = await Record.findAll({ where: { session_id: session.id } })

                    await bot.sendMessage(chatId, `Сесію тестування "${assessment.title}" відновлено.\nВи уже відповіли на ${all.length} питань.`);

                    // Відображення наступного питання
                    return showQuestion(chatId, session.id);
                }

                var formattedDate = format(new Date(session.started_at), 'dd/MM/yyyy HH:mm');

                const records = await Record.findAll({
                    where: {
                        session_id: session.id,
                        status: 'incorrect'
                    }
                });

                await disableButtons(chatId, msg.message.message_id);

                let questions = '';

                for (let i = 0; i < records.length; i++) {
                    const question = await Question.findOne({
                        where: {
                            id: records[i].question_id,
                        }
                    });

                    const answer = await Answer.findOne({
                        where: {
                            id: question.correct_answer_id,
                        }
                    });

                    const escapedQuestionText = escapeMarkdownV2(question.question_text);
                    const escapedAnswerText = escapeMarkdownV2(answer.answer_text);
                    questions += `> ${escapedQuestionText}\n\n`;
                    questions += `||${escapedAnswerText}||\n\n`;
                }

                const escapedTitle = escapeMarkdownV2(assessment.title);
                const escapedDate = escapeMarkdownV2(formattedDate);

                if (questions === '') {
                    await bot.sendMessage(chatId, `Здається, ти геній, у якого нема помилок`, { parse_mode: 'MarkdownV2' });
                    return await bot.sendSticker(chatId, 'CAACAgIAAxkBAAIDhWc6nX3Ka7HOX0H7EYMQkjU_th1FAALxTQACUtpgSw5fdX_zLux-NgQ');
                }

                const finalMessage = `Обрано *${escapedTitle}* \\(${escapedDate}\\)\n\nПитання у яких допущено помилки:\n\n${questions}*Будь уважнішим наступного разу*`;

                return await bot.sendMessage(chatId, finalMessage, { parse_mode: 'MarkdownV2' });

            case data.startsWith('revision_'):
                var sessionId = data.split('_')[1];
                var session = await Session.findByPk(sessionId);

                if (!session) {
                    return bot.sendMessage(chatId, 'Обраного тесту не існує.');
                }

                await disableButtons(chatId, msg.message.message_id);

                var assessment = await Assessment.findOne({
                    where: {
                        id: session.assessment_id,
                    }
                });

                await bot.sendMessage(chatId, `Опрацювання помилок тесту "${assessment.title}" розпочато`);

                return showDifficultQuestion(chatId, session.id);

            case data.startsWith('mode_'):
                const mode = data.split('_')[1];
                var assessmentId = data.split('_')[2];
                if (mode === '0') {
                    return showTimers(chatId);
                }
                console.log(assessmentId);
                return startLightSession(chatId, assessmentId);

            case data.startsWith('answer_'):
                const answerId = data.split('_')[1];
                const answer = await Answer.findByPk(answerId);

                if (!answer) {
                    return bot.sendMessage(chatId, 'Обраної відповіді не знайдено.');
                }

                const question = await Question.findByPk(answer.question_id);
                if (!question) {
                    return bot.sendMessage(chatId, 'Питання, пов’язане з цією відповіддю, не знайдено.');
                }

                const isCorrect = question.correct_answer_id === answer.id;
                var session = await Session.findOne({ where: { user_id: user.id, status: 'in_progress' } });
                if (!session) {
                    return bot.sendMessage(chatId, 'Активної сесії не знайдено.');
                }

                // Блокування кнопок
                await disableButtons(chatId, msg.message.message_id);

                console.log(session.id);

                await Record.create({
                    session_id: session.id,
                    question_id: question.id,
                    status: isCorrect ? 'correct' : 'incorrect',
                });

                await bot.sendMessage(chatId, isCorrect ? `✅ ${answer.answer_text}` : `❌ ${answer.answer_text}`);

                return showQuestion(chatId, session.id);

            case data.startsWith('check_'):
                const answerIdToCheck = data.split('_')[1];
                const answerToCheck = await Answer.findByPk(answerIdToCheck);
                var sessionId = data.split('_')[2];

                if (!answerToCheck) {
                    return bot.sendMessage(chatId, 'Обраної відповіді не знайдено.');
                }

                const relatedQuestion = await Question.findByPk(answerToCheck.question_id);
                if (!relatedQuestion) {
                    return bot.sendMessage(chatId, 'Питання, пов’язане з цією відповіддю, не знайдено.');
                }

                await disableButtons(chatId, msg.message.message_id);

                const isCorrectCheck = relatedQuestion.correct_answer_id === answerToCheck.id;

                // Відповідь без запису до бази
                await bot.sendMessage(
                    chatId,
                    isCorrectCheck
                        ? `✅ Це правильна відповідь: ${answerToCheck.answer_text}`
                        : `❌ Неправильно. Правильна відповідь: ${await Answer.findByPk(relatedQuestion.correct_answer_id).then(a => a.answer_text)}`
                );

                return showDifficultQuestion(chatId, sessionId);

            case data === 'save_questions':
                await disableButtons(chatId, msg.message.message_id);

                chatStates[chatId] = 'waiting_for_filename';
                return bot.sendMessage(chatId, 'Введіть назву для вашого файлу:');

            case data === 'skip_questions':
                await disableButtons(chatId, msg.message.message_id);

                return bot.sendMessage(chatId, 'Показ питань пропущено.');

            case data.startsWith('delete_assessment_'):
                var assessmentId = data.split('_')[2];

                // Знаходимо тест за ID
                var assessment = await Assessment.findByPk(assessmentId);
                if (!assessment) {
                    return bot.sendMessage(chatId, 'Тест не знайдено.');
                }

                // Підтвердження видалення
                const confirmKeyboard = [
                    [
                        { text: '✅ Так, видалити', callback_data: `confirm_delete_${assessment.id}` },
                        { text: '❌ Скасувати', callback_data: 'cancel_delete' },
                    ],
                ];

                // Видаляємо старі кнопки
                await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
                    chat_id: chatId,
                    message_id: msg.message.message_id,
                });

                return bot.sendMessage(
                    chatId,
                    `Ви впевнені, що хочете видалити тест "${assessment.title}"?`,
                    { reply_markup: { inline_keyboard: confirmKeyboard } }
                );

            case data.startsWith('confirm_delete_'):
                var assessmentId = data.split('_')[2];

                // Видаляємо тест і пов'язані записи
                await Assessment.destroy({ where: { id: assessmentId } });
                await Question.destroy({ where: { assessment_id: assessmentId } });
                await Record.destroy({ where: { session_id: assessmentId } });

                // Видаляємо старі кнопки
                await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
                    chat_id: chatId,
                    message_id: msg.message.message_id,
                });

                return bot.sendMessage(chatId, 'Тест успішно видалено.');

            case data === 'cancel_delete':
                await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
                    chat_id: chatId,
                    message_id: msg.message.message_id,
                });

                return bot.sendMessage(chatId, 'Видалення скасовано.');

            default:
                return bot.sendMessage(chatId, 'Невідома команда.');
        }
    } catch (err) {
        console.error('Error in callback_query handler:', err);
        await bot.sendMessage(chatId, 'Сталася помилка при обробці запиту.');
    }
}

module.exports = callbackController;