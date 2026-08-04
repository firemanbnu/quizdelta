const { sequelize, User, Question, Competition } = require('./src/models');

async function main() {
  await sequelize.sync({ force: true });
  const admin = await User.create({
    name: 'Admin Teste',
    email: 'admin@teste.com',
    password_hash: 'senha123',
    role: 'admin'
  });
  const player = await User.create({
    name: 'Jogador Teste',
    email: 'player@teste.com',
    password_hash: 'senha123',
    role: 'player'
  });

  const opts = [
    ['Qual a capital do Brasil?', ['SP', 'RJ', 'Brasília', 'Salvador'], 2],
    ['Quanto é 2+2?', ['3', '4', '5', '6'], 1],
    ['Maior planeta?', ['Terra', 'Marte', 'Júpiter', 'Saturno'], 2],
    ['Primeiro presidente?', ['Lula', 'Bolsonaro', 'Deodoro', 'Vargas'], 2],
    ['Ano da independência?', ['1500', '1822', '1889', '1964'], 1]
  ];
  for (const [text, options, correct_answer] of opts) {
    await Question.create({ text, options, correct_answer, category: 'Geral', difficulty: 'medio', approved: true, created_by: admin.id });
  }

  const comp = await Competition.create({
    code: '1234',
    host_id: admin.id,
    title: 'Comp Teste',
    total_questions: 5,
    time_per_question: 60,
    status: 'waiting',
    categories: ['Geral']
  });

  console.log(JSON.stringify({ adminId: admin.id, playerId: player.id, compId: comp.id }));
  await sequelize.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
