const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Competition = sequelize.define('Competition', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING(6),
    allowNull: false,
    unique: true
  },
  host_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    defaultValue: 'Competição de Quiz'
  },
  status: {
    type: DataTypes.ENUM('waiting', 'active', 'finished'),
    defaultValue: 'waiting'
  },
  total_questions: {
    type: DataTypes.INTEGER,
    defaultValue: 10
  },
  time_per_question: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
    comment: 'Seconds per question'
  },
  negative_score: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  current_question_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  categories: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  finished_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'competitions',
  timestamps: true
});

module.exports = Competition;
