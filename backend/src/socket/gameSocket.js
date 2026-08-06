const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const Competition = require('../models/Competition');
const CompetitionParticipant = require('../models/CompetitionParticipant');
const Answer = require('../models/Answer');
const User = require('../models/User');
const { pickQuestions } = require('../services/questionPicker');

const rooms = new Map();
const NEXT_QUESTION_DELAY_MS = 1200;

function getRoom(code) {
  return rooms.get(code);
}

function calculatePoints(responseTimeMs, timeLimitMs, isCorrect) {
  if (!isCorrect) return 0;
  const maxPoints = 1000;
  const timeRatio = Math.max(0, 1 - (responseTimeMs / timeLimitMs));
  return Math.round(maxPoints * (0.5 + 0.5 * timeRatio));
}

function parseCategories(competition) {
  let categories = [];
  if (Array.isArray(competition.categories)) {
    categories = competition.categories;
  } else if (typeof competition.categories === 'string') {
    try {
      const parsed = JSON.parse(competition.categories);
      categories = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      categories = [];
    }
  }
  if (categories.length === 0 && competition.category) {
    categories = [competition.category];
  }
  return categories.filter(Boolean);
}

async function getSelectedQuestions(competition) {
  const where = { approved: true };
  const categories = parseCategories(competition);
  if (categories.length) {
    where.category = { [Op.in]: categories };
  }
  return pickQuestions(where, competition.total_questions);
}

function questionPayload(room, index) {
  const q = room.questions[index];
  return {
    questionId: q.id,
    text: q.text,
    options: q.options,
    category: q.category,
    difficulty: q.difficulty,
    questionNumber: index + 1,
    totalQuestions: room.totalQuestions,
    timeLimit: room.timePerQuestion
  };
}

async function buildRanking(competitionId) {
  const participants = await CompetitionParticipant.findAll({
    where: { competition_id: competitionId },
    include: [{ model: User, as: 'user', attributes: ['id', 'name'] }]
  });

  return participants
    .map((p) => ({
      id: p.user.id,
      name: p.user.name,
      score: p.score,
      correctAnswers: p.correct_answers,
      totalAnswered: p.total_answered,
      media: p.total_answered > 0 ? Math.round((p.score / p.total_answered) * 100) / 100 : 0,
      accuracy: p.total_answered > 0 ? Math.round((p.correct_answers / p.total_answered) * 100) : 0
    }))
    .sort((a, b) =>
      b.media - a.media ||
      b.correctAnswers - a.correctAnswers ||
      b.score - a.score
    )
    .map((p, i) => ({ position: i + 1, ...p }));
}

function sendQuestionToUser(socket, room, index) {
  socket.emit('new-question', questionPayload(room, index));
}

function advanceUser(io, code, room, socket) {
  const state = room.userState.get(socket.user.id);
  state.index++;

  if (state.index >= room.totalQuestions) {
    state.done = true;
    buildRanking(room.competitionId).then((ranking) => {
      if (room.sockets.has(socket)) {
        socket.emit('competition-finished', { ranking, cancelled: false });
      }
    });
    checkRoomFinished(io, code, room);
    return;
  }

  const index = state.index;
  setTimeout(() => {
    if (
      room.status === 'active' &&
      room.sockets.has(socket) &&
      room.userState.get(socket.user.id)?.index === index
    ) {
      sendQuestionToUser(socket, room, index);
    }
  }, NEXT_QUESTION_DELAY_MS);
}

function checkRoomFinished(io, code, room) {
  if (room.status !== 'active') return;
  const remaining = [...room.sockets].filter((s) => !(room.userState.get(s.user.id) || {}).done);
  if (remaining.length === 0) {
    finishCompetition(io, code, room, false);
  }
}

async function finishCompetition(io, code, room, cancelled = false) {
  try {
    if (room.timer) clearTimeout(room.timer);
    room.status = 'finished';

    const competition = await Competition.findByPk(room.competitionId);
    if (competition && competition.status !== 'finished') {
      await competition.update({ status: 'finished', finished_at: new Date() });
    }

    const ranking = await buildRanking(room.competitionId);

    for (const socket of room.sockets) {
      socket.emit('competition-finished', { ranking, cancelled });
    }
  } catch (error) {
    console.error('Erro ao finalizar competição:', error);
  } finally {
    rooms.delete(code);
  }
}

function createRoom(competition) {
  return {
    competitionId: competition.id,
    status: competition.status,
    timePerQuestion: competition.time_per_question,
    hostId: competition.host_id,
    questions: [],
    totalQuestions: 0,
    sockets: new Set(),
    userState: new Map(),
    timer: null
  };
}

function initSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Autenticação necessária'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      if (!user) return next(new Error('Usuário não encontrado'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Usuário conectado: ${socket.user.name} (${socket.id})`);

    socket.on('join-room', async ({ code }, callback) => {
      try {
        const competition = await Competition.findOne({
          where: { code, status: { [Op.in]: ['waiting', 'active'] } }
        });

        if (!competition) {
          return callback({ error: 'Competição não encontrada ou finalizada' });
        }

        const participant = await CompetitionParticipant.findOne({
          where: { competition_id: competition.id, user_id: socket.user.id }
        });

        if (!participant) {
          await CompetitionParticipant.create({
            competition_id: competition.id,
            user_id: socket.user.id
          });
        }

        socket.join(`quiz-${code}`);
        socket.competitionCode = code;
        socket.competitionId = competition.id;

        let room = rooms.get(code);
        if (room && room.competitionId !== competition.id) {
          rooms.delete(code);
          room = null;
        }
        if (!room) {
          room = createRoom(competition);
          rooms.set(code, room);
        }

        room.sockets.add(socket);

        if (room.status === 'active' && room.questions.length === 0) {
          room.questions = await getSelectedQuestions(competition);
          room.totalQuestions = room.questions.length;
        }

        const allParticipants = await CompetitionParticipant.findAll({
          where: { competition_id: competition.id },
          include: [{ model: User, as: 'user', attributes: ['id', 'name'] }]
        });

        callback({
          success: true,
          competition: {
            id: competition.id,
            code: competition.code,
            title: competition.title,
            status: competition.status,
            totalQuestions: competition.total_questions,
            timePerQuestion: competition.time_per_question,
            currentQuestionIndex: room.userState.get(socket.user.id)?.index || 0,
            category: competition.category,
            categories: parseCategories(competition)
          },
          participants: allParticipants.map(p => ({
            id: p.user.id,
            name: p.user.name,
            score: p.score,
            correctAnswers: p.correct_answers,
            isHost: p.user_id === competition.host_id
          })),
          isHost: socket.user.id === competition.host_id
        });

        io.to(`quiz-${code}`).emit('participant-joined', {
          id: socket.user.id,
          name: socket.user.name
        });

        if (room.status === 'active' && room.totalQuestions > 0) {
          const answeredCount = await Answer.count({
            where: { competition_id: competition.id, user_id: socket.user.id }
          });
          const index = Math.min(answeredCount, room.totalQuestions);
          const state = { index, done: index >= room.totalQuestions };
          room.userState.set(socket.user.id, state);

          if (state.done) {
            const ranking = await buildRanking(room.competitionId);
            socket.emit('competition-finished', { ranking, cancelled: false });
          } else {
            sendQuestionToUser(socket, room, index);
          }
        }
      } catch (error) {
        console.error('Erro ao entrar na sala:', error);
        callback({ error: 'Erro ao entrar na sala' });
      }
    });

    socket.on('start-competition', async ({ code }, callback) => {
      try {
        const room = rooms.get(code);
        if (!room || room.hostId !== socket.user.id) {
          return callback({ error: 'Apenas o host pode iniciar' });
        }

        const competition = await Competition.findOne({ where: { code } });
        if (!competition) {
          return callback({ error: 'Competição não encontrada' });
        }

        if (room.competitionId !== competition.id) {
          rooms.delete(code);
          return callback({ error: 'Sala desatualizada. Saia e entre novamente.' });
        }

        const questions = await getSelectedQuestions(competition);
        if (questions.length === 0) {
          return callback({ error: 'Nenhuma pergunta disponível' });
        }

        room.questions = questions;
        room.totalQuestions = questions.length;
        room.status = 'active';
        room.userState.clear();

        const allParticipants = await CompetitionParticipant.findAll({
          where: { competition_id: competition.id }
        });
        for (const p of allParticipants) {
          room.userState.set(p.user_id, { index: 0, done: false });
        }

        await competition.update({
          status: 'active',
          total_questions: questions.length,
          started_at: new Date()
        });

        io.to(`quiz-${code}`).emit('competition-started', {
          totalQuestions: questions.length
        });

        for (const sock of room.sockets) {
          sendQuestionToUser(sock, room, 0);
        }

        callback({ success: true });
      } catch (error) {
        console.error('Erro ao iniciar competição:', error);
        callback({ error: 'Erro ao iniciar competição' });
      }
    });

    socket.on('submit-answer', async ({ code, questionId, chosenAnswer, responseTimeMs }, callback) => {
      try {
        const room = rooms.get(code);
        if (!room || room.status !== 'active') {
          return callback({ error: 'Competição não ativa' });
        }
        if (!room.sockets.has(socket)) {
          return callback({ error: 'Entre na sala primeiro' });
        }

        const state = room.userState.get(socket.user.id);
        if (!state || state.done) {
          return callback({ error: 'Você já finalizou' });
        }

        const question = room.questions[state.index];
        if (!question || question.id !== questionId) {
          return callback({ error: 'Pergunta não encontrada ou já respondida' });
        }

        const existing = await Answer.findOne({
          where: {
            competition_id: room.competitionId,
            user_id: socket.user.id,
            question_id: questionId
          }
        });
        if (existing) {
          return callback({ error: 'Você já respondeu esta pergunta' });
        }

        const isCorrect = chosenAnswer === question.correct_answer;
        const timeLimit = room.timePerQuestion * 1000;
        const points = calculatePoints(responseTimeMs, timeLimit, isCorrect);

        await Answer.create({
          competition_id: room.competitionId,
          user_id: socket.user.id,
          question_id: questionId,
          chosen_answer: chosenAnswer,
          is_correct: isCorrect,
          response_time_ms: responseTimeMs,
          points_earned: points
        });

        await CompetitionParticipant.increment(
          { score: points, correct_answers: isCorrect ? 1 : 0, total_answered: 1 },
          { where: { competition_id: room.competitionId, user_id: socket.user.id } }
        );

        callback({
          isCorrect,
          correctAnswer: question.correct_answer,
          points
        });

        advanceUser(io, code, room, socket);
      } catch (error) {
        console.error('Erro ao enviar resposta:', error);
        callback({ error: 'Erro ao enviar resposta' });
      }
    });

    socket.on('get-scoreboard', async ({ code }, callback) => {
      try {
        const room = rooms.get(code);
        if (!room) return callback({ error: 'Sala não encontrada' });

        const scoreboard = await buildRanking(room.competitionId);
        callback(scoreboard);
      } catch (error) {
        callback({ error: 'Erro ao buscar placar' });
      }
    });

    socket.on('cancel-competition', async ({ code }, callback) => {
      try {
        const room = rooms.get(code);
        if (!room || room.hostId !== socket.user.id) {
          return callback({ error: 'Apenas o host pode cancelar' });
        }

        await finishCompetition(io, code, room, true);
        callback({ success: true });
      } catch (error) {
        callback({ error: 'Erro ao cancelar' });
      }
    });

    socket.on('disconnect', () => {
      const code = socket.competitionCode;
      console.log(`Usuário desconectado: ${socket.user.name}`);
      if (!code) return;
      const room = rooms.get(code);
      if (!room) return;

      room.sockets.delete(socket);

      if (room.sockets.size === 0) {
        if (room.status === 'active') {
          finishCompetition(io, code, room, false);
        } else {
          rooms.delete(code);
        }
      } else {
        checkRoomFinished(io, code, room);
      }
    });
  });
}

module.exports = { initSocket, getRoom };
