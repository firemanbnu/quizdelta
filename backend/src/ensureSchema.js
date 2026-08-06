const sequelize = require('./database');

const COLUMNS = [
  { table: 'users', column: 'must_change_password', type: 'BOOLEAN', def: 'false' },
  { table: 'competitions', column: 'categories', type: 'JSON' },
  { table: 'competitions', column: 'started_at', type: 'TIMESTAMP' },
  { table: 'competitions', column: 'current_question_index', type: 'INTEGER', def: '0' },
  { table: 'competitions', column: 'negative_score', type: 'BOOLEAN', def: 'false' },
  { table: 'competitions', column: 'finished_at', type: 'TIMESTAMP' },
  { table: 'competition_participants', column: 'score', type: 'INTEGER', def: '0' },
  { table: 'competition_participants', column: 'correct_answers', type: 'INTEGER', def: '0' },
  { table: 'competition_participants', column: 'total_answered', type: 'INTEGER', def: '0' },
  { table: 'competition_participants', column: 'joined_at', type: 'TIMESTAMP', def: 'NOW()' },
  { table: 'answers', column: 'chosen_answer', type: 'INTEGER' },
  { table: 'answers', column: 'is_correct', type: 'BOOLEAN', def: 'false' },
  { table: 'answers', column: 'response_time_ms', type: 'INTEGER', def: '0' },
  { table: 'answers', column: 'points_earned', type: 'INTEGER', def: '0' },
  { table: 'questions', column: 'approved', type: 'BOOLEAN', def: 'false' },
  { table: 'questions', column: 'options', type: 'JSON' },
  { table: 'questions', column: 'source', type: 'TEXT', def: "'manual'" },
  { table: 'questions', column: 'source_file', type: 'TEXT' },
  { table: 'questions', column: 'difficulty', type: 'TEXT', def: "'medio'" },
  { table: 'questions', column: 'correct_answer', type: 'INTEGER' },
  { table: 'training_sessions', column: 'chosen_answer', type: 'INTEGER' },
  { table: 'training_sessions', column: 'is_correct', type: 'BOOLEAN', def: 'false' },
  { table: 'training_sessions', column: 'response_time_ms', type: 'INTEGER', def: '0' },
  { table: 'training_sessions', column: 'category', type: 'TEXT', def: "'Geral'" }
];

async function ensureSchema() {
  for (const { table, column, type, def } of COLUMNS) {
    const defaultSql = def ? ` DEFAULT ${def}` : '';
    await sequelize.query(
      `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${type}${defaultSql}`,
      { raw: true }
    );
  }

  console.log('Schema garantido: colunas adicionadas se ausentes');
}

module.exports = { ensureSchema, COLUMNS };
