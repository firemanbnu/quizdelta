const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const { sendPasswordResetCode } = require('../services/mailer');
const { auth } = require('../middleware/auth');

const router = express.Router();

const RESET_CODE_TTL_MS = 15 * 60 * 1000;

function generateResetCode() {
  return String(crypto.randomInt(100000, 1000000));
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const user = await User.create({
      name,
      email,
      password_hash: password,
      role: 'player'
    });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: user.toSafeJSON()
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const valid = await user.validatePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: user.toSafeJSON()
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.json({ message: 'Se o email existir, você receberá um código de redefinição.' });
    }

    await PasswordReset.update(
      { used_at: new Date() },
      { where: { user_id: user.id, used_at: null } }
    );

    const code = generateResetCode();
    const codeHash = await bcrypt.hash(code, 10);

    await PasswordReset.create({
      user_id: user.id,
      code_hash: codeHash,
      expires_at: new Date(Date.now() + RESET_CODE_TTL_MS)
    });

    await sendPasswordResetCode(user.email, code, user.name);

    res.json({ message: 'Código de redefinição enviado para o seu email.' });
  } catch (error) {
    console.error('Erro no forgot-password:', error);
    res.status(500).json({ error: 'Erro ao solicitar redefinição de senha' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, código e nova senha são obrigatórios' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Código inválido ou expirado' });
    }

    const reset = await PasswordReset.findOne({
      where: { user_id: user.id, used_at: null },
      order: [['createdAt', 'DESC']]
    });

    if (!reset) {
      return res.status(400).json({ error: 'Código inválido ou expirado' });
    }

    if (new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Código expirado. Solicite um novo.' });
    }

    const valid = await bcrypt.compare(code, reset.code_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Código inválido ou expirado' });
    }

    await user.update({ password_hash: newPassword });
    await reset.update({ used_at: new Date() });

    res.json({ message: 'Senha redefinida com sucesso. Faça login com a nova senha.' });
  } catch (error) {
    console.error('Erro no reset-password:', error);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
});

router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

module.exports = router;
