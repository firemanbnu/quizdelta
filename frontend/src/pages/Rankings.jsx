import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

export default function Rankings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [generalRanking, setGeneralRanking] = useState([]);
  const [myHistory, setMyHistory] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [selectedComp, setSelectedComp] = useState(null);
  const [compRanking, setCompRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingComp, setLoadingComp] = useState(false);

  useEffect(() => {
    if (activeTab === 'general') {
      fetchGeneralRanking();
    } else if (activeTab === 'history') {
      fetchMyHistory();
    } else if (activeTab === 'competitions') {
      fetchCompetitions();
    }
  }, [activeTab]);

  const fetchGeneralRanking = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/rankings/general');
      setGeneralRanking(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/rankings/my-history');
      setMyHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompetitions = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/rankings/competitions');
      setCompetitions(res.data);
      setSelectedComp(null);
      setCompRanking([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompetitionRanking = async (compId) => {
    setLoadingComp(true);
    try {
      const res = await axios.get(`/api/rankings/competition/${compId}`);
      setCompRanking(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComp(false);
    }
  };

  const handleSelectCompetition = (comp) => {
    if (selectedComp?.id === comp.id) {
      setSelectedComp(null);
      setCompRanking([]);
    } else {
      setSelectedComp(comp);
      fetchCompetitionRanking(comp.id);
    }
  };

  const handleDeleteCompetition = async (compId, e) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir esta competição do ranking?')) return;
    try {
      await axios.delete(`/api/competitions/${compId}`);
      setCompetitions((prev) => prev.filter((c) => c.id !== compId));
      if (selectedComp?.id === compId) {
        setSelectedComp(null);
        setCompRanking([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white mb-6 flex items-center gap-1">
          ← Voltar
        </button>

        <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
          🏆 Rankings
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: 'general', label: 'Ranking Geral' },
            { key: 'competitions', label: 'Por Competição' },
            { key: 'history', label: 'Minhas Participações' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          </div>
        ) : (
          <>
            {activeTab === 'general' && (
              <div className="space-y-2">
                {generalRanking.length === 0 ? (
                  <div className="card text-center text-gray-400">
                    Nenhum participante ainda
                  </div>
                ) : (
                  generalRanking.map((player, i) => (
                    <motion.div
                      key={player.user_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                        player.user_id === user?.id
                          ? 'card border-primary-500/30'
                          : 'card'
                      } ${i === 0 ? 'border-yellow-500/30' : ''}`}
                    >
                      <span className="text-lg font-bold w-8">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}°`}
                      </span>
                      <div className="flex-1">
                        <p className={`font-semibold ${player.user_id === user?.id ? 'text-primary-400' : ''}`}>
                          {player.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {player.competitions_count} competições · {player.accuracy}% acerto
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary-400">{player.total_correct}</p>
                        <p className="text-xs text-gray-400">acertos</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'competitions' && (
              <div className="space-y-2">
                {competitions.length === 0 ? (
                  <div className="card text-center text-gray-400">
                    Nenhuma competição finalizada ainda
                  </div>
                ) : (
                  competitions.map((comp, i) => (
                    <div key={comp.id}>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`card cursor-pointer transition-all ${
                          selectedComp?.id === comp.id ? 'ring-2 ring-primary-500' : ''
                        }`}
                        onClick={() => handleSelectCompetition(comp)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold">{comp.title}</p>
                            <p className="text-xs text-gray-400">
                              Código: {comp.code} · {comp.participants_count} participantes · {comp.finished_at ? new Date(comp.finished_at).toLocaleDateString('pt-BR') : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {user?.role === 'admin' && (
                              <button
                                onClick={(e) => handleDeleteCompetition(comp.id, e)}
                                className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs"
                                title="Excluir competição"
                              >
                                🗑
                              </button>
                            )}
                            <span className={`text-sm transition-all ${selectedComp?.id === comp.id ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </div>
                        </div>
                      </motion.div>

                      <AnimatePresence>
                        {selectedComp?.id === comp.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-4 mt-1 space-y-1">
                              {loadingComp ? (
                                <div className="text-center py-4">
                                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
                                </div>
                              ) : compRanking.length === 0 ? (
                                <div className="card text-center text-gray-500 text-sm py-3">
                                  Nenhum participante
                                </div>
                              ) : (
                                compRanking.map((p, j) => (
                                  <div
                                    key={p.user_id}
                                    className={`flex items-center gap-3 rounded-xl px-4 py-2 ${
                                      p.user_id === user?.id
                                        ? 'bg-primary-500/10 border border-primary-500/20'
                                        : 'bg-gray-800/50'
                                    }`}
                                  >
                                    <span className="text-sm font-bold w-6 text-center">
                                      {j === 0 ? '🥇' : j === 1 ? '🥈' : j === 2 ? '🥉' : `${j + 1}°`}
                                    </span>
                                    <span className={`flex-1 text-sm font-medium ${p.user_id === user?.id ? 'text-primary-400' : ''}`}>
                                      {p.name}
                                    </span>
                                    <span className="text-sm text-gray-400">{p.correct_answers}/{p.total_answered}</span>
                                    <span className="text-sm font-bold text-primary-400">{p.score} pts</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-2">
                {myHistory.length === 0 ? (
                  <div className="card text-center text-gray-400">
                    Você ainda não participou de nenhuma competição
                  </div>
                ) : (
                  myHistory.map((comp, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="card"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{comp.title}</p>
                          <p className="text-xs text-gray-400">
                            {comp.started_at ? new Date(comp.started_at).toLocaleDateString('pt-BR') : 'Data desconhecida'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary-400">
                            {comp.correct_answers}/{comp.total_answered}
                          </p>
                          <p className="text-xs text-gray-400">
                            {comp.accuracy}% · {comp.score} pts
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
