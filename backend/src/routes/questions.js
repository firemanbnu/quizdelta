const express = require('express');
const { Op } = require('sequelize');
const sequelize = require('../database');
const Question = require('../models/Question');
const { pickQuestions, findDuplicateIds } = require('../services/questionPicker');
const { createTrainingSession } = require('../services/trainingSessions');
const { auth, adminOnly } = require('../middleware/auth');
const { applyCategoryRestriction, isAdminOnlyCategory } = require('../config/categories');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { category, difficulty, approved } = req.query;
    const where = {};

    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (approved !== undefined) where.approved = approved === 'true';
    else if (req.user.role !== 'admin') where.approved = true;

    applyCategoryRestriction(where, req.user);

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
    const { category, difficulty, approved, search } = req.query;
    const where = {};

    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (approved !== undefined) where.approved = approved === 'true';
    if (search) where.text = { [Op.iLike]: `%${search}%` };

    const questions = await Question.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar perguntas' });
  }
});

router.get('/categories', auth, async (req, res) => {
  try {
    const where = req.user.role !== 'admin' ? { approved: true } : {};
    applyCategoryRestriction(where, req.user);
    const questions = await Question.findAll({
      where,
      attributes: ['category'],
      group: ['category']
    });
    const categories = questions.map(q => q.category).filter(Boolean);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

router.get('/category-stats', auth, async (req, res) => {
  try {
    const where = req.user.role !== 'admin' ? { approved: true } : {};
    applyCategoryRestriction(where, req.user);
    const rows = await Question.findAll({
      where,
      attributes: ['category', [sequelize.fn('COUNT', sequelize.col('category')), 'count']],
      group: ['category'],
      raw: true
    });
    const stats = rows
      .map(r => ({ name: r.category, count: Number(r.count) }))
      .filter(r => r.name);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas de categorias' });
  }
});

router.get('/training', auth, async (req, res) => {
  try {
    const { category, categories, limit } = req.query;
    const where = { approved: true };
    if (category) where.category = category;
    if (categories) {
      const list = categories.split(',').map(c => c.trim()).filter(Boolean);
      if (list.length) where.category = { [Op.in]: list };
    }

    applyCategoryRestriction(where, req.user);

    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const questions = await pickQuestions(where, parsedLimit > 0 ? parsedLimit : undefined);
    const sessionId = createTrainingSession(req.user.id, questions);

    res.json({ sessionId, questions });
  } catch (error) {
    console.error('Erro ao buscar perguntas de treino:', error);
    res.status(500).json({ error: 'Erro ao buscar perguntas de treino' });
  }
});

router.post('/import', auth, adminOnly, async (req, res) => {
  try {
    const { questions, category } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Nenhuma pergunta para importar' });
    }

    const saved = [];
    for (const q of questions) {
      if (!q.text || !q.options || q.options.length < 2) continue;

      const question = await Question.create({
        text: q.text,
        options: q.options,
        correct_answer: q.correct_answer || 0,
        category: q.category || category || 'Importado',
        difficulty: q.difficulty || 'medio',
        source: 'pdf',
        approved: false,
        created_by: req.user.id
      });
      saved.push(question);
    }

    res.status(201).json({
      message: `${saved.length} perguntas importadas com sucesso`,
      questions: saved
    });
  } catch (error) {
    console.error('Erro ao importar perguntas:', error);
    res.status(500).json({ error: 'Erro ao importar perguntas' });
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
      approved: false,
      created_by: req.user.id
    });

    res.status(201).json(question);
  } catch (error) {
    console.error('Erro ao criar pergunta:', error);
    res.status(500).json({ error: 'Erro ao criar pergunta' });
  }
});

router.put('/bulk', auth, adminOnly, async (req, res) => {
  try {
    const { ids, approved } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Nenhuma pergunta selecionada' });
    }

    const [affected] = await Question.update(
      { approved: approved === true },
      { where: { id: { [Op.in]: ids } } }
    );

    res.json({ message: `${affected} perguntas atualizadas`, count: affected });
  } catch (error) {
    console.error('Erro ao atualizar perguntas em lote:', error);
    res.status(500).json({ error: 'Erro ao atualizar perguntas em lote' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findByPk(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Pergunta não encontrada' });
    }
    if (req.user.role !== 'admin' && isAdminOnlyCategory(question.category)) {
      return res.status(404).json({ error: 'Pergunta não encontrada' });
    }
    res.json(question);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pergunta' });
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

router.delete('/duplicates', auth, adminOnly, async (req, res) => {
  try {
    const ids = await findDuplicateIds();
    if (ids.length === 0) {
      return res.json({ message: 'Nenhuma pergunta duplicada encontrada', count: 0 });
    }
    await Question.destroy({ where: { id: { [Op.in]: ids } } });
    res.json({ message: `${ids.length} perguntas duplicadas removidas`, count: ids.length });
  } catch (error) {
    console.error('Erro ao remover duplicatas:', error);
    res.status(500).json({ error: 'Erro ao remover duplicatas' });
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
