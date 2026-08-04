const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  options: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  correct_answer: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Index of correct option (0-based)'
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'Geral'
  },
  difficulty: {
    type: DataTypes.ENUM('facil', 'medio', 'dificil'),
    defaultValue: 'medio'
  },
  source: {
    type: DataTypes.ENUM('manual', 'pdf', 'ai'),
    defaultValue: 'manual'
  },
  source_file: {
    type: DataTypes.STRING,
    allowNull: true
  },
  approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'questions',
  timestamps: true
});

module.exports = Question;
