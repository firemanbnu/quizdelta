const Question = require('../models/Question');

function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dedupeByText(questions) {
  const seen = new Set();
  const result = [];
  for (const q of questions) {
    const key = normalizeText(q.text);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(q);
  }
  return result;
}

function toPlain(q) {
  return {
    id: q.id,
    text: q.text,
    options: q.options,
    correct_answer: q.correct_answer,
    category: q.category,
    difficulty: q.difficulty
  };
}

function shuffleOptions(question) {
  const labeled = question.options.map((text, index) => ({ text, index }));
  const shuffled = shuffleArray(labeled);
  return {
    ...question,
    options: shuffled.map(o => o.text),
    correct_answer: shuffled.findIndex(o => o.index === question.correct_answer)
  };
}

async function pickQuestions(where, limit) {
  const all = await Question.findAll({ where });
  const unique = dedupeByText(all).map(toPlain);
  const shuffled = shuffleArray(unique);
  const selected = limit && limit > 0 ? shuffled.slice(0, limit) : shuffled;
  return selected.map(shuffleOptions);
}

async function countDistinctQuestions(where) {
  const all = await Question.findAll({ where, attributes: ['text'] });
  return dedupeByText(all).length;
}

async function findDuplicateIds() {
  const all = await Question.findAll({ attributes: ['id', 'text'], order: [['id', 'ASC']] });
  const groups = new Map();
  for (const q of all) {
    const key = normalizeText(q.text);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(q.id);
  }
  const duplicates = [];
  for (const ids of groups.values()) {
    if (ids.length > 1) {
      ids.slice(1).forEach(id => duplicates.push(id));
    }
  }
  return duplicates;
}

module.exports = {
  pickQuestions,
  countDistinctQuestions,
  findDuplicateIds,
  shuffleOptions,
  dedupeByText
};
