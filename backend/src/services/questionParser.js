function parseQuestionsFromText(text) {
  const lines = text.split('\n');
  const questions = [];
  let currentQuestion = null;

  const questionPattern = /^(\d{1,3})[\.\)]\s*(.+)/;
  const optionPattern = /^[A-Da-d][\.\)]\s*(.+)/;
  const letterOptionPattern = /^\(?([A-Da-d])\)?[\.\s]+(.+)/;

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
        correct_answer: 0
      };
      continue;
    }

    if (currentQuestion) {
      const optionMatch = trimmed.match(optionPattern) || trimmed.match(letterOptionPattern);
      if (optionMatch) {
        const optionText = optionMatch[2] || optionMatch[1];
        const letter = (optionMatch[1] || trimmed.charAt(0)).toUpperCase();
        const letterIndex = letter.charCodeAt(0) - 65;

        currentQuestion.options.push(optionText.trim());

        if (trimmed.includes('*') || trimmed.includes('✓') || trimmed.includes('X') || trimmed.includes('(certa)') || trimmed.includes('(correta)')) {
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
    correct_answer: q.correct_answer < q.options.length ? q.correct_answer : 0,
    category: 'Importado',
    difficulty: 'medio',
    source: 'pdf'
  }));
}

module.exports = { parseQuestionsFromText };
