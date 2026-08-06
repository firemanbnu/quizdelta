# AGENTS.md

Notas de contexto e pendências do projeto **Quiz Delta** (frontend: Vercel `estudosdelta.vercel.app` · backend: Render `quizdelta-backend.onrender.com`).

## PENDENTE — destravar criação de competições no Render

- **Status:** implementado em `backend/src/ensureSchema.js` (chamado no startup em `server.js`), aguardando **deploy no Render**.
- **Sintoma:** `POST /api/competitions` retorna 500 "Erro ao criar competição" no Render; funciona localmente.
- **Causa:** schema do PostgreSQL no Render desatualizado. `sequelize.sync()` só cria tabelas novas, NÃO adiciona colunas em tabelas existentes. Faltam colunas em:
  - `competitions`: `categories`, `started_at`, `current_question_index`, `negative_score`, `finished_at`
  - `competition_participants`: `score`, `correct_answers`, `total_answered`, `joined_at`
  - `answers`: `chosen_answer`, `is_correct`, `response_time_ms`, `points_earned`
  - `questions`: `approved`, `options`, `source`, `source_file`, `difficulty`, `correct_answer`
  - `training_sessions`: `chosen_answer`, `is_correct`, `response_time_ms`, `category`
- **Solução aplicada:** script idempotente no startup (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para todas as colunas acima), roda em cada boot, não apaga dados. Validado com mock (23 statements gerados corretamente).
- **Histórico:** correção anterior foi revertida por pedido do usuário (2x); a autorização para aplicar foi dada apenas depois, agendada para esta pendência.

## Outras pendências lembradas

- Liberar bancos de perguntas para players existentes no Render via Painel de Permissões (`/admin`). Players só enxergam bancos explicitamente liberados (e nunca o grupo admin-only `Guarda`).

## Contexto útil

- Banco local de teste: PostgreSQL `quiz_competition` · admin `admin@teste.com` / `senha123`.
- Backend local: rodando na porta 3111 (processo `node src/server.js` em `C:\Users\micha\quizdelta\backend`). Para subir com outro banco, exige `DATABASE_URL`.
- Feature já implementada (committed): Painel de Permissões — rota `GET/PUT /api/users` (admin), model/tabela `UserCategory`, página `frontend/src/pages/AdminPanel.jsx` em `/admin`, novos usuários nascem com `role: player`.
- Restrição por categoria em `backend/src/config/categories.js` (`applyCategoryRestriction`) usa `req.user.allowedCategories`, anexado no middleware `auth`.
- Feature "Esqueci a senha": rotas `POST /api/auth/forgot-password` e `POST /api/auth/reset-password`; tabela `password_resets` criada via `sequelize.sync()` e também garantida em `ensureSchema.js`. Envio por e-mail via `backend/src/services/mailer.js` (nodemailer) usando env vars `SMTP_HOST/PORT/USER/PASS/FROM`; sem SMTP configurado, o código é logado no console (dev). UI no `frontend/src/pages/Login.jsx` (modo "forgot").
