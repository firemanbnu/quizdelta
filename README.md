# Quiz Competition - Plataforma de Quiz Online

Plataforma de competição de quiz online com suporte a treinamento individual, ranking histórico e geração de perguntas via IA.

## Pré-requisitos

- Node.js v18+ (v24 recomendado)
- PostgreSQL (local ou Render.com)
- Chave de API OpenAI (opcional, para gerar perguntas via IA)

## Configuração

### 1. Banco de Dados

Opção A - PostgreSQL local:
```bash
# Criar banco de dados
psql -U postgres -c "CREATE DATABASE quiz_competition;"
```

Opção B - Render.com:
- Crie um banco PostgreSQL no Render.com
- Copie a DATABASE_URL

### 2. Variáveis de Ambiente

Edite `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@host:5432/quiz_competition
JWT_SECRET=sua_chave_secreta_aqui
OPENAI_API_KEY=sk-sua-chave-openai-aqui  # Opcional
SMTP_HOST=smtp.gmail.com                # Para "Esqueci a senha" (obrigatório em produção)
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_de_app
SMTP_FROM=Saber Delta <seu_email@gmail.com>
PORT=3001
```

## Executar

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend (em outro terminal)
```bash
cd frontend
npm install
npm run dev
```

### Acessar
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Funcionalidades

### Admin (Host - PC)
- Criar competições com código numérico
- Gerenciar perguntas (criar, editar, excluir)
- Upload de PDFs para extração de texto
- Gerar perguntas via IA (OpenAI)
- Aprovar/desaprovar perguntas geradas
- Iniciar e finalizar competições
- Participar como jogador

### Participante
- Entrar em competições com código
- Treinar individualmente a qualquer momento
- Ver rankings e histórico de participações
- Acessar pelo celular ou computador
- Redefinir a senha esquecida via código enviado por email

### Competição
- Código de 4 dígitos para entrada
- Timer regressivo por pergunta
- Placar ao vivo
- Pontuação baseada em velocidade
- Ranking final com posições

### Treinamento
- Categorias ou todas as perguntas
- Feedback imediato (certo/errado)
- Histórico de treinos

## Estrutura

```
quiz-competition/
├── backend/          # Node.js + Express + Socket.io
│   ├── src/
│   │   ├── server.js
│   │   ├── models/
│   │   ├── routes/
│   │   ├── socket/
│   │   └── services/
│   └── uploads/
└── frontend/         # React + Vite + TailwindCSS
    └── src/
        ├── pages/
        ├── components/
        └── contexts/
```

## Deploy no Render.com

1. Crie um account no Render.com
2. Crie um Web Service para o backend
3. Crie um banco PostgreSQL
4. Configure as variáveis de ambiente
5. Deploy automático via GitHub
