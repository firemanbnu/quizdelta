const express = require('express');
const User = require('../models/User');
const UserCategory = require('../models/UserCategory');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.findAll({ order: [['createdAt', 'ASC']] });
    const categoryRows = await UserCategory.findAll();
    const byUser = {};
    for (const row of categoryRows) {
      (byUser[row.user_id] = byUser[row.user_id] || []).push(row.category);
    }

    res.json(users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      categories: byUser[u.id] || [],
      createdAt: u.createdAt
    })));
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { role, categories } = req.body;
    const target = await User.findByPk(req.params.id);

    if (!target) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (role !== undefined) {
      if (!['admin', 'player'].includes(role)) {
        return res.status(400).json({ error: 'Permissão inválida' });
      }
      if (target.id === req.user.id && role !== 'admin') {
        return res.status(400).json({ error: 'Você não pode remover seu próprio acesso de administrador' });
      }
      target.role = role;
      await target.save();
    }

    if (Array.isArray(categories)) {
      const list = [...new Set(categories.map((c) => String(c).trim()).filter(Boolean))];
      await UserCategory.destroy({ where: { user_id: target.id } });
      if (list.length > 0) {
        await UserCategory.bulkCreate(list.map((c) => ({ user_id: target.id, category: c })));
      }
    }

    const saved = await User.findByPk(target.id);
    const savedRows = await UserCategory.findAll({ where: { user_id: target.id } });

    res.json({
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: saved.role,
      categories: savedRows.map((row) => row.category),
      createdAt: saved.createdAt
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

module.exports = router;
