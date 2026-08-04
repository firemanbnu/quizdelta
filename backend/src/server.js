const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const { sequelize } = require('./models');
const { ensureSchema } = require('./ensureSchema');
const { initSocket } = require('./socket/gameSocket');

const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const competitionRoutes = require('./routes/competitions');
const rankingRoutes = require('./routes/rankings');
const uploadRoutes = require('./routes/upload');
const aiRoutes = require('./routes/ai');
const trainingRoutes = require('./routes/training');
const userRoutes = require('./routes/users');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

initSocket(io);

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Conectado ao banco de dados');

    await ensureSchema();
    await sequelize.sync();
    console.log('Tabelas sincronizadas');

    server.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

start();
