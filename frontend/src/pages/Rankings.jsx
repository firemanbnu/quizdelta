import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';

export default function Rankings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [generalRanking, setGeneralRanking] = useState([]);
  const [myHistory, setMyHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankings();
  }, [activeTab]);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      if (activeTab === 'general') {
        const res = await axios.get('/api/rankings/general');
        setGeneralRanking(res.data);
      } else {
        const res = await axios.get('/api/rankings/my-history');
        setMyHistory(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all ${
              activeTab === 'general'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Ranking Geral
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Minhas Participações
          </button>
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
