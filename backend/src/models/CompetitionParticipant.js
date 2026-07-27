const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const CompetitionParticipant = sequelize.define('CompetitionParticipant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  competition_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  correct_answers: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_answered: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  joined_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'competition_participants',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['competition_id', 'user_id'] }
  ]
});

module.exports = CompetitionParticipant;
