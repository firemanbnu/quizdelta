const express = require('express');
const Question = require('../models/Question');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { category, difficulty, approved } = req.query;
    const where = {};

    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (approved !== undefined) where.approved = approved === 'true';
    else if (req.user.role !== 'admin') where.approved = true;

    const questions = await Question.findAll({
      where,
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['correct_answer'] }
    });

    res.json(questions);
  } catch (error) {
    console.error('Erro ao buscar perguntas:', error);
    res.status(500).json({ error: 'Erro ao buscar perguntas' });
  }
});

router.get('/all', auth, adminOnly, async (req, res) => {
  try {
    const questions = await Question.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar perguntas' });
  }
});

router.get('/categories', auth, async (req, res) => {
  try {
    const questions = await Question.findAll({
      where: { approved: true },
      attributes: ['category'],
      group: ['category']
    });
    const categories = questions.map(q => q.category).filter(Boolean);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Pergunta não encontrada' });
    }
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pergunta' });
  }
});

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { text, options, correct_answer, category, difficulty } = req.body;

    if (!text || !options || correct_answer === undefined) {
      return res.status(400).json({ error: 'Texto, opções e resposta correta são obrigatórios' });
    }

    if (options.length < 2) {
      return res.status(400).json({ error: 'Mínimo de 2 opções' });
    }

    if (correct_answer < 0 || correct_answer >= options.length) {
      return res.status(400).json({ error: 'Resposta correta inválida' });
    }

    const question = await Question.create({
      text,
      options,
      correct_answer,
      category: category || 'Geral',
      difficulty: difficulty || 'medio',
      source: 'manual',
      approved: true,
      created_by: req.user.id
    });

    res.status(201).json(question);
  } catch (error) {
    console.error('Erro ao criar pergunta:', error);
    res.status(500).json({ error: 'Erro ao criar pergunta' });
  }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Pergunta não encontrada' });
    }

    const { text, options, correct_answer, category, difficulty, approved } = req.body;

    if (text !== undefined) question.text = text;
    if (options !== undefined) question.options = options;
    if (correct_answer !== undefined) question.correct_answer = correct_answer;
    if (category !== undefined) question.category = category;
    if (difficulty !== undefined) question.difficulty = difficulty;
    if (approved !== undefined) question.approved = approved;

    await question.save();
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar pergunta' });
  }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Pergunta não encontrada' });
    }
    await question.destroy();
    res.json({ message: 'Pergunta removida' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover pergunta' });
  }
});

module.exports = router;
