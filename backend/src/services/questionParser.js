function parseQuestionsFromText(text) {
  const lines = text.split('\n');
  const questions = [];
  let currentQuestion = null;

  const questionPattern = /^(\d{1,3})[\.\)]\s*(.+)/;
  const optionPattern = /^\(?([A-Da-d])\)?[\.\):]\s*(.+)/;
  const answerKeyPattern = /(?:resposta|gabarito|resp\.?|gab\.?)\s*[:\-=]?\s*(?:correta\s*[:\-=]?\s*)?(?:letra\s*)?\(?([a-dA-D])\)?/i;
  const isMarkedCorrect = (line) =>
    /[\*✓✔☑]|\([xX]\)|\[[xX]\]|\(certa\)|\(correta\)|\(gabarito\)|correta|gabarito/i.test(line);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const questionMatch = trimmed.match(questionPattern);
    if (questionMatch) {
      if (currentQuestion && currentQuestion.text) {
        questions.push(currentQuestion);
      }
      currentQuestion = {
        number: parseInt(questionMatch[1]),
        text: questionMatch[2],
        options: [],
        correct_answer: -1
      };
      continue;
    }

    if (currentQuestion) {
      const keyMatch = trimmed.match(answerKeyPattern);
      if (keyMatch) {
        currentQuestion.correct_answer = keyMatch[1].toUpperCase().charCodeAt(0) - 65;
        continue;
      }

      const optionMatch = trimmed.match(optionPattern);
      const strippedOptionMatch = !optionMatch
        ? trimmed.replace(/^\*{1,2}\s*/, '').match(optionPattern)
        : null;
      if (optionMatch || strippedOptionMatch) {
        const optionText = (optionMatch || strippedOptionMatch)[2] || (optionMatch || strippedOptionMatch)[1];
        currentQuestion.options.push(optionText.trim());

        if (currentQuestion.correct_answer < 0 && isMarkedCorrect(trimmed)) {
          currentQuestion.correct_answer = currentQuestion.options.length - 1;
        }
      } else if (currentQuestion.options.length === 0 && !currentQuestion.text.includes('?')) {
        currentQuestion.text += ' ' + trimmed;
      }
    }
  }

  if (currentQuestion && currentQuestion.text) {
    questions.push(currentQuestion);
  }

  return questions.filter(q => q.options.length >= 2).map((q, index) => ({
    number: index + 1,
    text: q.text,
    options: q.options.length >= 4 ? q.options.slice(0, 4) : [...q.options, ...Array(4 - q.options.length).fill('')],
    correct_answer: q.correct_answer >= 0 && q.correct_answer < q.options.length ? q.correct_answer : 0,
    category: 'Importado',
    difficulty: 'medio',
    source: 'pdf'
  }));
}

module.exports = { parseQuestionsFromText };
