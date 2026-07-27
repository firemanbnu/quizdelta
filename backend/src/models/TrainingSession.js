const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const TrainingSession = sequelize.define('TrainingSession', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  category: {
    type: DataTypes.STRING,
    defaultValue: 'Geral'
  }
}, {
  tableName: 'training_sessions',
  timestamps: true
});

module.exports = TrainingSession;
