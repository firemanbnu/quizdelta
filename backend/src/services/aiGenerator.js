const OpenAI = require('openai');

let openai = null;

function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

async function generateQuestions(text, count = 5, category = 'Geral') {
  const client = getOpenAI();
  if (!client) {
    throw new Error('OpenAI API não configurada. Adicione sua chave no arquivo .env');
  }

  const prompt = `Com base no texto abaixo, gere ${count} perguntas de múltipla escolha no formato JSON.
Cada pergunta deve ter:
- "text": o texto da pergunta
- "options": array de 4 opções (A, B, C, D)
- "correct_answer": índice da opção correta (0-3)
- "category": "${category}"
- "difficulty": "facil", "medio" ou "dificil"

Responda APENAS com o JSON, sem markdown ou explicação.

Texto:
${text.substring(0, 8000)}`;

  const response = await client.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 4000
  });

  const content = response.choices[0].message.content;

  let questions;
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    questions = JSON.parse(cleaned);
  } catch {
    throw new Error('Erro ao parsear resposta da IA. Tente novamente.');
  }

  if (!Array.isArray(questions)) {
    questions = [questions];
  }

  return questions.map(q => ({
    text: q.text,
    options: q.options,
    correct_answer: q.correct_answer,
    category: q.category || category,
    difficulty: q.difficulty || 'medio',
    source: 'ai'
  }));
}

module.exports = { generateQuestions };
