const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Answer = sequelize.define('Answer', {
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
  question_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  chosen_answer: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  is_correct: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  response_time_ms: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  points_earned: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'answers',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['competition_id', 'user_id', 'question_id'] }
  ]
});

module.exports = Answer;
