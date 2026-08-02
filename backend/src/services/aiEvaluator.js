const { GoogleGenerativeAI } = require('@google/generative-ai');

const BATCH_SIZE = 10;

let genAI = null;

function getClient() {
  if (!genAI && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

async function generateContent(prompt) {
  const client = getClient();
  const models = ['gemini-1.5-flash', 'gemini-pro'];
  let lastError = null;

  for (const modelName of models) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function parseAnswers(text) {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  let data;
  try {
    data = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('Resposta da IA não contém JSON válido');
    }
    data = JSON.parse(match[0]);
  }

  const list = Array.isArray(data) ? data : (data.answers || data.results || []);
  const map = new Map();
  for (const item of list) {
    if (item && item.id !== undefined && item.correct_answer !== undefined) {
      map.set(String(item.id), Number(item.correct_answer));
    }
  }
  return map;
}

async function evaluateBatch(batch) {
  const client = getClient();
  if (!client) {
    throw new Error('GEMINI_API_KEY não configurada. Adicione sua chave no arquivo .env');
  }

  const payload = batch.map((q, i) => ({
    ref: i + 1,
    id: q.id,
    text: q.text,
    options: q.options
  }));

  const prompt = `Você é um especialista em provas de múltipla escolha. Para cada pergunta abaixo, identifique qual opção é a resposta correta.

Perguntas (JSON):
${JSON.stringify(payload)}

Regras:
- Responda APENAS com um JSON válido, sem markdown, sem texto extra.
- Formato: {"answers":[{"id": <id da pergunta>, "correct_answer": <índice da opção correta, 0-based>}, ...]}
- Use o índice (0-based) da opção correta. Se não houver uma resposta claramente correta, escolha a mais plausível.`;

  const text = await generateContent(prompt);
  return parseAnswers(text);
}

async function evaluateQuestions(questions) {
  const client = getClient();
  if (!client) {
    throw new Error('GEMINI_API_KEY não configurada. Adicione sua chave no arquivo .env');
  }

  const results = {
    total: questions.length,
    evaluated: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
    errors: []
  };

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    let idToAnswer;
    try {
      idToAnswer = await evaluateBatch(batch);
    } catch (error) {
      results.failed += batch.length;
      results.errors.push(`Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      continue;
    }

    for (const q of batch) {
      const newAnswer = idToAnswer.get(String(q.id));
      const isValid = typeof newAnswer === 'number' &&
        newAnswer >= 0 &&
        newAnswer < q.options.length &&
        typeof q.options[newAnswer] === 'string' &&
        q.options[newAnswer].trim() !== '';

      if (isValid) {
        results.evaluated++;
        if (newAnswer !== q.correct_answer) {
          q.correct_answer = newAnswer;
          await q.save();
          results.updated++;
        } else {
          results.unchanged++;
        }
      } else {
        results.failed++;
      }
    }
  }

  return results;
}

module.exports = { evaluateQuestions, getClient, BATCH_SIZE };
