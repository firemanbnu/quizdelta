const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Competition = require('../models/Competition');
const CompetitionParticipant = require('../models/CompetitionParticipant');
const Answer = require('../models/Answer');
const { pickQuestions } = require('../services/questionPicker');

const rooms = new Map();

function getRoom(code) {
  return rooms.get(code);
}

function calculatePoints(responseTimeMs, timeLimitMs, isCorrect) {
  if (!isCorrect) return 0;
  const maxPoints = 1000;
  const timeRatio = Math.max(0, 1 - (responseTimeMs / timeLimitMs));
  return Math.round(maxPoints * (0.5 + 0.5 * timeRatio));
}

async function getSelectedQuestions(competition) {
  const where = { approved: true };
  const categories = competition.categories && competition.categories.length
    ? competition.categories
    : (competition.category ? [competition.category] : []);
  if (categories.length) where.category = { [require('sequelize').Op.in]: categories };

  return pickQuestions(where, competition.total_questions);
}

function scheduleNextQuestion(io, code, room, delayMs = 2000) {
  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(async () => {
    if (room.status !== 'active') return;
    advanceQuestion(io, code, room);
  }, delayMs);
}

async function advanceQuestion(io, code, room) {
  room.currentQuestionIndex++;

  if (room.currentQuestionIndex >= room.totalQuestions) {
    await finishCompetition(io, code, room);
    return;
  }

  room.answers.clear();
  sendQuestion(io, code, room);
}

function sendQuestion(io, code, room) {
  const question = room.questions[room.currentQuestionIndex];
  room.questionStartTime = Date.now();
  room.answers.clear();

  io.to(`quiz-${code}`).emit('new-question', {
    questionId: question.id,
    text: question.text,
    options: question.options,
    category: question.category,
    difficulty: question.difficulty,
    questionNumber: room.currentQuestionIndex + 1,
    totalQuestions: room.totalQuestions,
    timeLimit: room.timePerQuestion
  });

  if (room.timer) clearTimeout(room.timer);

  room.timer = setTimeout(async () => {
    if (room.status === 'active') {
      const question = room.questions[room.currentQuestionIndex];
      io.to(`quiz-${code}`).emit('question-timeout', {
        questionId: question.id,
        correctAnswer: question.correct_answer
      });
      scheduleNextQuestion(io, code, room, 2000);
    }
  }, room.timePerQuestion * 1000);
}

async function finishCompetition(io, code, room, cancelled = false) {
  if (room.timer) clearTimeout(room.timer);
  room.status = 'finished';

  const competition = await Competition.findByPk(room.competitionId);
  if (competition) {
    await competition.update({ status: 'finished', finished_at: new Date() });
  }

  const participants = await CompetitionParticipant.findAll({
    where: { competition_id: room.competitionId },
    include: [{ model: require('../models/User'), as: 'user', attributes: ['id', 'name'] }],
    order: [['correct_answers', 'DESC'], ['score', 'DESC']]
  });

  const finalRanking = participants.map((p, i) => ({
    position: i + 1,
    id: p.user.id,
    name: p.user.name,
    score: p.score,
    correctAnswers: p.correct_answers,
    totalAnswered: p.total_answered,
    accuracy: p.total_answered > 0 ? Math.round((p.correct_answers / p.total_answered) * 100) : 0
  }));

  io.to(`quiz-${code}`).emit('competition-finished', {
    ranking: finalRanking,
    cancelled
  });

  rooms.delete(code);
}

function initSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Autenticação necessária'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const User = require('../models/User');
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
          where: { code, status: { [require('sequelize').Op.in]: ['waiting', 'active'] } }
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

        if (!rooms.has(code)) {
          rooms.set(code, {
            competitionId: competition.id,
            status: competition.status,
            currentQuestion: null,
            currentQuestionIndex: 0,
            totalQuestions: competition.total_questions,
            timePerQuestion: competition.time_per_question,
            negativeScore: competition.negative_score,
            answers: new Map(),
            questionStartTime: null,
            questions: [],
            timer: null,
            hostId: competition.host_id,
            participantCount: 0
          });
        }

        const room = rooms.get(code);
        const allParticipants = await CompetitionParticipant.findAll({
          where: { competition_id: competition.id },
          include: [{ model: require('../models/User'), as: 'user', attributes: ['id', 'name'] }]
        });

        room.participantCount = allParticipants.length;

        callback({
          success: true,
          competition: {
            id: competition.id,
            code: competition.code,
            title: competition.title,
            status: competition.status,
            totalQuestions: competition.total_questions,
            timePerQuestion: competition.time_per_question,
            currentQuestionIndex: room.currentQuestionIndex,
            category: competition.category,
            categories: competition.categories || []
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

        const competition = await Competition.findByPk(room.competitionId);
        if (!competition) {
          return callback({ error: 'Competição não encontrada' });
        }

        const questions = await getSelectedQuestions(competition);
        if (questions.length === 0) {
          return callback({ error: 'Nenhuma pergunta disponível' });
        }

        room.questions = questions;
        room.totalQuestions = questions.length;
        room.status = 'active';
        room.currentQuestionIndex = 0;

        const allParticipants = await CompetitionParticipant.findAll({
          where: { competition_id: competition.id }
        });
        room.participantCount = allParticipants.length;

        await competition.update({
          status: 'active',
          total_questions: questions.length,
          started_at: new Date()
        });

        io.to(`quiz-${code}`).emit('competition-started', {
          totalQuestions: questions.length
        });

        sendQuestion(io, code, room);
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

        const answerKey = `${socket.user.id}-${questionId}`;
        if (room.answers.has(answerKey)) {
          return callback({ error: 'Já respondeu esta pergunta' });
        }

        const question = room.questions.find(q => q.id === questionId);
        if (!question) {
          return callback({ error: 'Pergunta não encontrada' });
        }

        const isCorrect = chosenAnswer === question.correct_answer;
        const timeLimit = room.timePerQuestion * 1000;
        const points = calculatePoints(responseTimeMs, timeLimit, isCorrect);

        room.answers.set(answerKey, {
          userId: socket.user.id,
          questionId,
          chosenAnswer,
          isCorrect,
          points,
          responseTimeMs
        });

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

        if (room.answers.size >= room.participantCount) {
          if (room.timer) clearTimeout(room.timer);
          const question = room.questions[room.currentQuestionIndex];
          io.to(`quiz-${code}`).emit('question-timeout', {
            questionId: question.id,
            correctAnswer: question.correct_answer
          });
          scheduleNextQuestion(io, code, room, 2000);
        }
      } catch (error) {
        console.error('Erro ao enviar resposta:', error);
        callback({ error: 'Erro ao enviar resposta' });
      }
    });

    socket.on('get-scoreboard', async ({ code }, callback) => {
      try {
        const room = rooms.get(code);
        if (!room) return callback({ error: 'Sala não encontrada' });

        const participants = await CompetitionParticipant.findAll({
          where: { competition_id: room.competitionId },
          include: [{ model: require('../models/User'), as: 'user', attributes: ['id', 'name'] }],
          order: [['score', 'DESC']]
        });

        const scoreboard = participants.map((p, i) => ({
          position: i + 1,
          id: p.user.id,
          name: p.user.name,
          score: p.score,
          correctAnswers: p.correct_answers,
          totalAnswered: p.total_answered
        }));

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
      console.log(`Usuário desconectado: ${socket.user.name}`);
    });
  });
}

module.exports = { initSocket, getRoom };
