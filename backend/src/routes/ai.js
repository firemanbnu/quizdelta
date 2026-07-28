const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/status', auth, adminOnly, async (req, res) => {
  res.json({ message: 'Sistema de importação de PDF ativo' });
});

module.exports = router;
