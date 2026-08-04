const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const UserCategory = sequelize.define('UserCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'user_categories',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'category']
    }
  ]
});

module.exports = UserCategory;
