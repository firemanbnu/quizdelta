const express = require('express');
const { Op, QueryTypes } = require('sequelize');
const sequelize = require('../database');
const Competition = require('../models/Competition');
const CompetitionParticipant = require('../models/CompetitionParticipant');
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const User = require('../models/User');
const { countDistinctQuestions } = require('../services/questionPicker');
const { auth, adminOnly } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

function generateCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const {
      title,
      total_questions,
      time_per_question,
      negative_score,
      category,
      categories
    } = req.body;

    let selectedCategories = Array.isArray(categories)
      ? categories.filter(Boolean)
      : [];
    if (selectedCategories.length === 0 && category) {
      selectedCategories = [category];
    }

    let code = generateCode();
    let exists = await Competition.findOne({ where: { code, status: 'waiting' } });
    while (exists) {
      code = generateCode();
      exists = await Competition.findOne({ where: { code, status: 'waiting' } });
    }

    const where = { approved: true };
    if (selectedCategories.length > 0) {
      where.category = { [Op.in]: selectedCategories };
    }

    const availableQuestions = await countDistinctQuestions(where);

    if (availableQuestions === 0) {
      return res.status(400).json({ error: 'Nenhuma pergunta disponível nas categorias selecionadas' });
    }

    const competition = await Competition.create({
      code,
      host_id: req.user.id,
      title: title || 'Competição de Quiz',
      total_questions: Math.min(total_questions || 10, availableQuestions),
      time_per_question: time_per_question || 30,
      negative_score: negative_score || false,
      category: selectedCategories.length === 1 ? selectedCategories[0] : null,
      categories: selectedCategories
    });

    res.status(201).json(competition);
  } catch (error) {
    console.error('Erro ao criar competição:', error);
    res.status(500).json({ error: 'Erro ao criar competição' });
  }
});

router.get('/active', auth, async (req, res) => {
  try {
    const competitions = await Competition.findAll({
      where: { status: { [require('sequelize').Op.in]: ['waiting', 'active'] } },
      include: [
        { model: CompetitionParticipant, as: 'participants' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(competitions);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar competições' });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const competitions = await Competition.findAll({
      where: {
        status: 'finished',
        host_id: req.user.id
      },
      include: [
        { model: CompetitionParticipant, as: 'participants' }
      ],
      order: [['finished_at', 'DESC']],
      limit: 20
    });
    res.json(competitions);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const competition = await Competition.findByPk(req.params.id, {
      include: [
        { model: CompetitionParticipant, as: 'participants' }
      ]
    });
    if (!competition) {
      return res.status(404).json({ error: 'Competição não encontrada' });
    }
    res.json(competition);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar competição' });
  }
});

router.get('/:id/answers', auth, async (req, res) => {
  try {
    const competitionId = parseInt(req.params.id, 10);
    const competition = await Competition.findByPk(competitionId);
    if (!competition) {
      return res.status(404).json({ error: 'Competição não encontrada' });
    }

    let targetUserId = req.user.id;
    if (req.query.userId) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso restrito a administradores' });
      }
      if (competition.status !== 'finished') {
        return res.status(403).json({ error: 'Só é possível revisar respostas de outros após o término da competição' });
      }
      targetUserId = parseInt(req.query.userId, 10);
    }

    const participant = await CompetitionParticipant.findOne({
      where: { competition_id: competitionId, user_id: targetUserId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }]
    });

    if (!participant) {
      return res.status(404).json({ error: 'Participante não encontrado' });
    }

    const answers = await Answer.findAll({
      where: { competition_id: competitionId, user_id: targetUserId },
      include: [{ model: Question, as: 'question' }],
      order: [['id', 'ASC']]
    });

    res.json({
      competition: {
        id: competition.id,
        title: competition.title,
        code: competition.code,
        status: competition.status
      },
      participant: {
        userId: targetUserId,
        name: participant.user ? participant.user.name : 'Participante',
        score: participant.score,
        correctAnswers: participant.correct_answers,
        totalAnswered: participant.total_answered
      },
      answers: answers.map((a) => ({
        questionId: a.question_id,
        text: a.question.text,
        options: a.question.options,
        category: a.question.category,
        difficulty: a.question.difficulty,
        chosenAnswer: a.chosen_answer,
        correctAnswer: a.question.correct_answer,
        isCorrect: a.is_correct,
        responseTimeMs: a.response_time_ms,
        pointsEarned: a.points_earned
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar respostas:', error);
    res.status(500).json({ error: 'Erro ao buscar respostas' });
  }
});

router.get('/join/:code', auth, async (req, res) => {
  try {
    const competition = await Competition.findOne({
      where: { code: req.params.code, status: 'waiting' },
      include: [
        { model: CompetitionParticipant, as: 'participants' }
      ]
    });

    if (!competition) {
      return res.status(404).json({ error: 'Competição não encontrada ou já iniciada' });
    }

    const alreadyJoined = await CompetitionParticipant.findOne({
      where: { competition_id: competition.id, user_id: req.user.id }
    });

    if (!alreadyJoined) {
      await CompetitionParticipant.create({
        competition_id: competition.id,
        user_id: req.user.id
      });
    }

    const updated = await Competition.findByPk(competition.id, {
      include: [{ model: CompetitionParticipant, as: 'participants' }]
    });

    res.json(updated);
  } catch (error) {
    console.error('Erro ao entrar na competição:', error);
    res.status(500).json({ error: 'Erro ao entrar na competição' });
  }
});

router.get('/last-finished', auth, async (req, res) => {
  try {
    const competition = await Competition.findOne({
      where: { status: 'finished' },
      include: [{ model: CompetitionParticipant, as: 'participants' }],
      order: [['finished_at', 'DESC']]
    });

    if (!competition) {
      return res.json(null);
    }

    const rankings = await sequelize.query(`
      SELECT
        cp.user_id,
        u.name,
        cp.correct_answers,
        cp.total_answered,
        cp.score,
        CASE WHEN cp.total_answered > 0
          THEN ROUND((cp.score::numeric / cp.total_answered), 2)::float
          ELSE 0
        END as media,
        CASE WHEN cp.total_answered > 0
          THEN ROUND((cp.correct_answers::numeric / cp.total_answered) * 100, 1)::float
          ELSE 0
        END as accuracy
      FROM competition_participants cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.competition_id = :competitionId
      ORDER BY media DESC, cp.correct_answers DESC, cp.score DESC
    `, {
      replacements: { competitionId: competition.id },
      type: QueryTypes.SELECT
    });

    res.json({ ...competition.toJSON(), rankings });
  } catch (error) {
    console.error('Erro ao buscar última competição:', error);
    res.status(500).json({ error: 'Erro ao buscar última competição' });
  }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const competition = await Competition.findByPk(req.params.id);
    if (!competition) {
      return res.status(404).json({ error: 'Competição não encontrada' });
    }

    await CompetitionParticipant.destroy({ where: { competition_id: competition.id } });
    await competition.destroy();

    res.json({ message: 'Competição excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir competição:', error);
    res.status(500).json({ error: 'Erro ao excluir competição' });
  }
});

module.exports = router;
