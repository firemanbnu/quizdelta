const express = require('express');
const Question = require('../models/Question');
const { auth, adminOnly } = require('../middleware/auth');
const { generateQuestions } = require('../services/aiGenerator');

const router = express.Router();

router.post('/generate', auth, adminOnly, async (req, res) => {
  try {
    const { text, count, category } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Texto é obrigatório para gerar perguntas' });
    }

    const questions = await generateQuestions(text, count || 5, category || 'Geral');

    const saved = [];
    for (const q of questions) {
      const question = await Question.create({
        text: q.text,
        options: q.options,
        correct_answer: q.correct_answer,
        category: q.category,
        difficulty: q.difficulty,
        source: 'ai',
        approved: false,
        created_by: req.user.id
      });
      saved.push(question);
    }

    res.status(201).json({
      message: `${saved.length} perguntas geradas e pendentes de aprovação`,
      questions: saved
    });
  } catch (error) {
    console.error('Erro ao gerar perguntas:', error);
    res.status(500).json({ error: error.message || 'Erro ao gerar perguntas' });
  }
});

module.exports = router;
