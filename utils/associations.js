const User = require('../models/user');
const Session = require('../models/session');
const Record = require('../models/record');
const Question = require('../models/question');
const Answer = require('../models/answer');
const Assessment = require('../models/assessment');

// Answer belongs to Question
Answer.belongsTo(Question, { foreignKey: 'question_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// Assessment belongs to User (author)
Assessment.belongsTo(User, { foreignKey: 'author_id', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

// Question relationships
Question.hasMany(Answer, { foreignKey: 'question_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Question.belongsTo(Assessment, { foreignKey: 'assessment_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Question.belongsTo(Answer, { foreignKey: 'correct_answer_id', as: 'correctAnswer', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

// Record belongs to Session and Question
Record.belongsTo(Session, { foreignKey: 'session_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Record.belongsTo(Question, { foreignKey: 'question_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// Session belongs to User and Assessment
Session.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Session.belongsTo(Assessment, { foreignKey: 'assessment_id', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

module.exports = { User, Session, Record, Question, Answer, Assessment };
