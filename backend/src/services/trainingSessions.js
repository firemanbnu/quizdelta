const { v4: uuidv4 } = require('uuid');

const sessions = new Map();
const TTL = 60 * 60 * 1000;

function createTrainingSession(userId, questions) {
  const sessionId = uuidv4();
  const questionsMap = new Map();
  for (const q of questions) {
    if (!questionsMap.has(q.id)) {
      questionsMap.set(q.id, q.correct_answer);
    }
  }
  sessions.set(sessionId, { userId, createdAt: Date.now(), questions: questionsMap });
  cleanupExpired();
  return sessionId;
}

function resolveTrainingAnswer(userId, sessionId, questionId) {
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.userId !== userId) return { error: 'Sessão inválida' };
  const correct = session.questions.get(questionId);
  if (correct === undefined) return { error: 'Pergunta fora da sessão' };
  return { correct };
}

function cleanupExpired() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > TTL) sessions.delete(id);
  }
}

module.exports = { createTrainingSession, resolveTrainingAnswer };
