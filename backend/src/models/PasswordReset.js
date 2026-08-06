const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const PasswordReset = sequelize.define('PasswordReset', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  code_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  used_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'password_resets',
  timestamps: true
});

module.exports = PasswordReset;
