const express = require('express');
const { QueryTypes } = require('sequelize');
const sequelize = require('../database');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/competition/:competitionId', auth, async (req, res) => {
  try {
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
      replacements: { competitionId: req.params.competitionId },
      type: QueryTypes.SELECT
    });

    const ranked = rankings.map((r, i) => ({
      position: i + 1,
      ...r
    }));

    res.json(ranked);
  } catch (error) {
    console.error('Erro ao buscar ranking:', error);
    res.status(500).json({ error: 'Erro ao buscar ranking' });
  }
});

router.get('/general', auth, async (req, res) => {
  try {
    const rankings = await sequelize.query(`
      WITH comp_medias AS (
        SELECT
          cp.user_id,
          cp.competition_id,
          CASE WHEN cp.total_answered > 0
            THEN cp.score::numeric / cp.total_answered
            ELSE 0
          END as media
        FROM competition_participants cp
      ),
      totals AS (
        SELECT
          cp.user_id,
          COUNT(*) as competitions_count,
          COALESCE(SUM(cp.correct_answers), 0) as total_correct,
          COALESCE(SUM(cp.total_answered), 0) as total_answered,
          COALESCE(SUM(cp.score), 0) as total_score
        FROM competition_participants cp
        GROUP BY cp.user_id
      )
      SELECT
        u.id as user_id,
        u.name,
        t.competitions_count,
        t.total_correct,
        t.total_answered,
        t.total_score,
        ROUND(AVG(cm.media), 2)::float as media,
        CASE WHEN t.total_answered > 0
          THEN ROUND((t.total_correct::numeric / t.total_answered) * 100, 1)::float
          ELSE 0
        END as accuracy
      FROM users u
      JOIN totals t ON t.user_id = u.id
      JOIN comp_medias cm ON cm.user_id = u.id
      GROUP BY u.id, u.name, t.competitions_count, t.total_correct, t.total_answered, t.total_score
      ORDER BY media DESC, t.total_correct DESC, t.total_score DESC
      LIMIT 50
    `, {
      type: QueryTypes.SELECT
    });

    const ranked = rankings.map((r, i) => ({
      position: i + 1,
      ...r
    }));

    res.json(ranked);
  } catch (error) {
    console.error('Erro ao buscar ranking geral:', error);
    res.status(500).json({ error: 'Erro ao buscar ranking geral' });
  }
});

router.get('/my-history', auth, async (req, res) => {
  try {
    const history = await sequelize.query(`
      WITH ranked AS (
        SELECT
          cp.competition_id,
          cp.user_id,
          cp.correct_answers,
          cp.total_answered,
          cp.score,
          CASE WHEN cp.total_answered > 0
            THEN cp.score::numeric / cp.total_answered
            ELSE 0
          END as media,
          RANK() OVER (
            PARTITION BY cp.competition_id
            ORDER BY
              (CASE WHEN cp.total_answered > 0 THEN cp.score::numeric / cp.total_answered ELSE 0 END) DESC,
              cp.correct_answers DESC,
              cp.score DESC
          ) as position
        FROM competition_participants cp
      ),
      counts AS (
        SELECT competition_id, COUNT(*) as participants_count
        FROM competition_participants
        GROUP BY competition_id
      )
      SELECT
        r.competition_id,
        c.title,
        c.code,
        c.started_at,
        c.finished_at,
        r.correct_answers,
        r.total_answered,
        r.score,
        ROUND(r.media, 2)::float as media,
        CASE WHEN r.total_answered > 0
          THEN ROUND((r.correct_answers::numeric / r.total_answered) * 100, 1)::float
          ELSE 0
        END as accuracy,
        r.position,
        co.participants_count
      FROM ranked r
      JOIN competitions c ON c.id = r.competition_id
      JOIN counts co ON co.competition_id = r.competition_id
      WHERE r.user_id = :userId
      ORDER BY c.finished_at DESC
      LIMIT 50
    `, {
      replacements: { userId: req.user.id },
      type: QueryTypes.SELECT
    });

    res.json(history);
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

router.get('/competitions', auth, async (req, res) => {
  try {
    const competitions = await sequelize.query(`
      SELECT
        c.id,
        c.title,
        c.code,
        c.finished_at,
        COUNT(cp.id) as participants_count
      FROM competitions c
      LEFT JOIN competition_participants cp ON cp.competition_id = c.id
      WHERE c.status = 'finished'
      GROUP BY c.id, c.title, c.code, c.finished_at
      ORDER BY c.finished_at DESC
      LIMIT 20
    `, {
      type: QueryTypes.SELECT
    });

    res.json(competitions);
  } catch (error) {
    console.error('Erro ao buscar competições:', error);
    res.status(500).json({ error: 'Erro ao buscar competições' });
  }
});

module.exports = router;
