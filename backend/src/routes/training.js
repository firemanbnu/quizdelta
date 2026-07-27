const express = require('express');
const TrainingSession = require('../models/TrainingSession');
const Question = require('../models/Question');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/submit', auth, async (req, res) => {
  try {
    const { question_id, chosen_answer, response_time_ms } = req.body;

    if (question_id === undefined || chosen_answer === undefined) {
      return res.status(400).json({ error: 'question_id e chosen_answer são obrigatórios' });
    }

    const question = await Question.findByPk(question_id);
    if (!question) {
      return res.status(404).json({ error: 'Pergunta não encontrada' });
    }

    const is_correct = chosen_answer === question.correct_answer;

    const session = await TrainingSession.create({
      user_id: req.user.id,
      question_id,
      chosen_answer,
      is_correct,
      response_time_ms: response_time_ms || 0,
      category: question.category
    });

    res.status(201).json({
      is_correct,
      correct_answer: question.correct_answer,
      points: is_correct ? 100 : 0
    });
  } catch (error) {
    console.error('Erro ao registrar treino:', error);
    res.status(500).json({ error: 'Erro ao registrar resposta' });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const { QueryTypes } = require('sequelize');
    const sequelize = require('../database');

    const stats = await sequelize.query(`
      SELECT
        COUNT(*) as total_answered,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as total_correct,
        category,
        DATE_TRUNC('day', created_at) as date
      FROM training_sessions
      WHERE user_id = :userId
      GROUP BY category, DATE_TRUNC('day', created_at)
      ORDER BY date DESC
    `, {
      replacements: { userId: req.user.id },
      type: QueryTypes.SELECT
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

module.exports = router;
