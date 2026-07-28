const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL não definida');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  },
  logging: console.log
});

const User = require('./models/User');
const Question = require('./models/Question');
const Competition = require('./models/Competition');
const CompetitionParticipant = require('./models/CompetitionParticipant');
const Answer = require('./models/Answer');
const TrainingSession = require('./models/TrainingSession');

require('./models/index');

async function sync() {
  try {
    await sequelize.authenticate();
    console.log('Conectado ao Neon');
    await sequelize.sync({ force: false });
    console.log('Tabelas criadas/sincronizadas');
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await sequelize.close();
  }
}

sync();
