const User = require('./User');
const Question = require('./Question');
const Competition = require('./Competition');
const CompetitionParticipant = require('./CompetitionParticipant');
const Answer = require('./Answer');
const TrainingSession = require('./TrainingSession');
const sequelize = require('../database');

User.hasMany(Competition, { foreignKey: 'host_id', as: 'hostedCompetitions' });
Competition.belongsTo(User, { foreignKey: 'host_id', as: 'host' });

Competition.hasMany(CompetitionParticipant, { foreignKey: 'competition_id', as: 'participants' });
CompetitionParticipant.belongsTo(Competition, { foreignKey: 'competition_id', as: 'competition' });

User.hasMany(CompetitionParticipant, { foreignKey: 'user_id', as: 'competitions' });
CompetitionParticipant.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Competition.hasMany(Answer, { foreignKey: 'competition_id', as: 'answers' });
Answer.belongsTo(Competition, { foreignKey: 'competition_id', as: 'competition' });

User.hasMany(Answer, { foreignKey: 'user_id', as: 'answers' });
Answer.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Question.hasMany(Answer, { foreignKey: 'question_id', as: 'answers' });
Answer.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });

User.hasMany(TrainingSession, { foreignKey: 'user_id', as: 'trainingSessions' });
TrainingSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Question.hasMany(TrainingSession, { foreignKey: 'question_id', as: 'trainingSessions' });
TrainingSession.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });

User.hasMany(Question, { foreignKey: 'created_by', as: 'createdQuestions' });
Question.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

module.exports = {
  sequelize,
  User,
  Question,
  Competition,
  CompetitionParticipant,
  Answer,
  TrainingSession
};
