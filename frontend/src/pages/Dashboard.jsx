import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [competitions, setCompetitions] = useState([]);
  const [lastFinished, setLastFinished] = useState(null);
  const [categories, setCategories] = useState([]);
  const [newCompetition, setNewCompetition] = useState({
    title: '',
    total_questions: 10,
    time_per_question: 30,
    categories: []
  });
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdCode, setCreatedCode] = useState('');

  useEffect(() => {
    fetchCompetitions();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/questions/category-stats');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateModal = () => {
    setNewCompetition((prev) => ({
      ...prev,
      categories: categories.map((c) => c.name)
    }));
    setShowCreate(true);
  };

  const toggleCategory = (name) => {
    setNewCompetition((prev) => {
      const selected = prev.categories.includes(name)
        ? prev.categories.filter((c) => c !== name)
        : [...prev.categories, name];
      return { ...prev, categories: selected };
    });
  };

  const toggleAllCategories = () => {
    setNewCompetition((prev) => ({
      ...prev,
      categories: prev.categories.length === categories.length
        ? []
        : categories.map((c) => c.name)
    }));
  };

  const selectedCount = newCompetition.categories.reduce((acc, name) => {
    const cat = categories.find((c) => c.name === name);
    return acc + (cat ? cat.count : 0);
  }, 0);

  const fetchCompetitions = async () => {
    try {
      const [activeRes, lastRes] = await Promise.all([
        axios.get('/api/competitions/active'),
        axios.get('/api/competitions/last-finished')
      ]);
      setCompetitions(activeRes.data);
      setLastFinished(lastRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/competitions', newCompetition);
      setCreatedCode(res.data.code);
      setShowCreate(false);
      fetchCompetitions();
      setTimeout(() => {
        navigate(`/lobby/${res.data.code}`);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar competição');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode || joinCode.length !== 4) {
      setError('Digite um código de 4 dígitos');
      return;
    }
    try {
      await axios.get(`/api/competitions/join/${joinCode}`);
      navigate(`/lobby/${joinCode}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Competição não encontrada');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-60 h-60 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-60 h-60 bg-accent-500/10 rounded-full blur-3xl"></div>
      </div>

      <header className="relative border-b border-gray-800 bg-gray-900/50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center">
              <span className="text-xl font-bold transform -rotate-12">Δ</span>
            </div>
            <h1 className="text-xl font-bold">Saber Delta</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">
              {user?.name} {user?.role === 'admin' && <span className="text-primary-400">(Admin)</span>}
            </span>
            <button onClick={logout} className="btn-secondary text-sm py-2 px-4">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Join Competition */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">🎮</span> Entrar em Competição
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Digite o código de 4 dígitos para entrar
            </p>
            <div className="flex flex-nowrap gap-2">
              <input
                type="text"
                placeholder="Código"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="input flex-1 min-w-0 text-center text-xl tracking-widest font-mono"
                maxLength={4}
              />
              <button onClick={handleJoin} className="btn-primary shrink-0">
                Entrar
              </button>
            </div>
          </motion.div>

          {/* Quick Training */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card cursor-pointer hover:border-primary-500/50 transition-all"
            onClick={() => navigate('/training')}
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">📚</span> Treinar
            </h2>
            <p className="text-gray-400 text-sm">
              Pratique sozinho a qualquer momento. Escolha categorias e teste seus conhecimentos.
            </p>
            <div className="mt-4 text-primary-400 font-semibold">
              Clique para começar →
            </div>
          </motion.div>

          {/* Rankings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card cursor-pointer hover:border-accent-500/50 transition-all"
            onClick={() => navigate('/rankings')}
          >
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">🏆</span> Rankings
            </h2>
            <p className="text-gray-400 text-sm">
              Veja o ranking geral e seu histórico de participações.
            </p>
            <div className="mt-4 text-accent-400 font-semibold">
              Ver rankings →
            </div>
          </motion.div>

          {/* Admin: Create Competition */}
          {user?.role === 'admin' && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="card border-primary-500/30"
              >
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-2xl">⚡</span> Criar Competição
                </h2>
                <p className="text-gray-400 text-sm mb-4">
                  Crie uma nova competição e compartilhe o código com os participantes.
                </p>
                <button onClick={() => openCreateModal()} className="btn-primary w-full">
                  Nova Competição
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="card cursor-pointer hover:border-green-500/50 transition-all"
                onClick={() => navigate('/questions')}
              >
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-2xl">📝</span> Gerenciar Perguntas
                </h2>
                <p className="text-gray-400 text-sm">
                  Adicione, edite ou gere perguntas novas a partir de PDFs.
                </p>
                <div className="mt-4 text-green-400 font-semibold">
                  Gerenciar →
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="card"
              >
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-2xl">📊</span> Última Competição
                </h2>
                {lastFinished ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-semibold text-sm">{lastFinished.title}</p>
                        <p className="text-gray-400 text-xs">
                          Código: <span className="text-primary-400 font-mono">{lastFinished.code}</span>
                          {lastFinished.finished_at && <> · {new Date(lastFinished.finished_at).toLocaleDateString('pt-BR')}</>}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {lastFinished.rankings.map((p, i) => (
                        <div
                          key={p.user_id}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                            p.user_id === user?.id
                              ? 'bg-primary-500/10 border border-primary-500/20'
                              : 'bg-gray-800/50'
                          }`}
                        >
                          <span className="font-bold w-5 text-center text-xs">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}°`}
                          </span>
                          <span className={`flex-1 font-medium ${p.user_id === user?.id ? 'text-primary-400' : ''}`}>
                            {p.name}
                          </span>
                          <span className="text-gray-400">{p.correct_answers}/{p.total_answered}</span>
                          <span className="font-bold text-primary-400">{p.score} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Nenhuma competição finalizada</p>
                )}
                {competitions.length > 0 && (
                  <>
                    <hr className="border-gray-800 my-3" />
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Aguardando / Ativas</p>
                      {competitions.map((comp) => (
                        <div key={comp.id} className="bg-gray-800/50 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm">{comp.title}</p>
                            <p className="text-gray-400 text-xs">
                              Código: <span className="text-primary-400 font-mono">{comp.code}</span> · {comp.participants?.length || 0} jogadores
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            comp.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                          }`}>
                            {comp.status === 'waiting' ? 'Aguardando' : 'Ativa'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            </>
          )}
        </div>

        {/* Create Competition Modal */}
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="card w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-6">Nova Competição</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <input
                  type="text"
                  placeholder="Título da competição"
                  value={newCompetition.title}
                  onChange={(e) => setNewCompetition({ ...newCompetition, title: e.target.value })}
                  className="input w-full"
                />
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Número de perguntas</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedCount || 1}
                    value={newCompetition.total_questions}
                    onChange={(e) => setNewCompetition({ ...newCompetition, total_questions: parseInt(e.target.value) })}
                    className="input w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedCount} pergunta(s) disponível(eis) nos grupos selecionados
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Tempo por pergunta (segundos)</label>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={newCompetition.time_per_question}
                    onChange={(e) => setNewCompetition({ ...newCompetition, time_per_question: parseInt(e.target.value) })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm text-gray-400 block">Grupos de Perguntas</label>
                    <button
                      type="button"
                      onClick={toggleAllCategories}
                      className="text-xs text-primary-400 hover:text-primary-300"
                    >
                      {newCompetition.categories.length === categories.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {categories.map((cat) => {
                      const checked = newCompetition.categories.includes(cat.name);
                      return (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => toggleCategory(cat.name)}
                          className={`w-full p-3 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                            checked
                              ? 'border-primary-500/60 bg-primary-500/10'
                              : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs shrink-0 ${
                            checked ? 'bg-primary-500 border-primary-500 text-white' : 'border-gray-500'
                          }`}>
                            {checked && '✓'}
                          </div>
                          <span className="flex-1 font-semibold">{cat.name}</span>
                          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}
                    {categories.length === 0 && (
                      <p className="text-gray-500 text-sm">
                        Nenhuma categoria disponível. Adicione perguntas primeiro.
                      </p>
                    )}
                  </div>
                </div>
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1">
                    {loading ? 'Criando...' : 'Criar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Created Code Modal */}
        {createdCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setCreatedCode('')}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="card w-full max-w-md text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-4">Competição Criada!</h2>
              <p className="text-gray-400 mb-4">Compartilhe este código com os participantes:</p>
              <div className="text-6xl font-mono font-bold text-primary-400 tracking-widest mb-6 animate-glow">
                {createdCode}
              </div>
              <p className="text-gray-500 text-sm">Redirecionando para o lobby...</p>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
