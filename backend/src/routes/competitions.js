const express = require('express');
const { QueryTypes } = require('sequelize');
const sequelize = require('../database');
const Competition = require('../models/Competition');
const CompetitionParticipant = require('../models/CompetitionParticipant');
const Question = require('../models/Question');
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
      category
    } = req.body;

    let code = generateCode();
    let exists = await Competition.findOne({ where: { code, status: 'waiting' } });
    while (exists) {
      code = generateCode();
      exists = await Competition.findOne({ where: { code, status: 'waiting' } });
    }

    const where = { approved: true };
    if (category) where.category = category;

    const availableQuestions = await Question.count({ where });

    const competition = await Competition.create({
      code,
      host_id: req.user.id,
      title: title || 'Competição de Quiz',
      total_questions: Math.min(total_questions || 10, availableQuestions),
      time_per_question: time_per_question || 30,
      negative_score: negative_score || false,
      category: category || null
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
          THEN ROUND((cp.correct_answers::float / cp.total_answered) * 100, 1)
          ELSE 0
        END as accuracy
      FROM competition_participants cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.competition_id = :competitionId
      ORDER BY cp.correct_answers DESC, cp.score DESC
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

module.exports = router;
