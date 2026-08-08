import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';

function formatTime(ms) {
  const total = Number(ms) || 0;
  const s = total / 1000;
  return s >= 60
    ? `${Math.floor(s / 60)}min ${Math.round(s % 60)}s`
    : `${s.toFixed(1)}s`;
}

function letter(index) {
  return String.fromCharCode(65 + index);
}

export default function AnswerReview() {
  const { competitionId, userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const query = userId && Number(userId) !== user?.id ? `?userId=${userId}` : '';
    axios
      .get(`/api/competitions/${competitionId}/answers${query}`)
      .then((res) => {
        if (active) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.response?.data?.error || 'Erro ao carregar respostas');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [competitionId, userId, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
        <div className="card text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => navigate(-1)} className="btn-primary">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const { competition, participant, answers } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white mb-6 flex items-center gap-1">
          ← Voltar
        </button>

        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          📋 Revisão de Respostas
        </h1>
        <p className="text-gray-400 mb-6">
          {competition.title} · Código <span className="text-primary-400 font-mono">{competition.code}</span>
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-primary-400">{participant.score} pts</p>
            <p className="text-xs text-gray-400">Pontuação</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-green-400">{participant.correctAnswers}/{participant.totalAnswered}</p>
            <p className="text-xs text-gray-400">Acertos</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-accent-400">
              {participant.totalAnswered > 0
                ? Math.round((participant.correctAnswers / participant.totalAnswered) * 100)
                : 0}%
            </p>
            <p className="text-xs text-gray-400">Precisão</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-white">{answers.length}</p>
            <p className="text-xs text-gray-400">Questões</p>
          </div>
        </div>

        <div className="space-y-4">
          {answers.map((a, i) => (
            <motion.div
              key={a.questionId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card"
            >
              <div className="flex items-center justify-between mb-3 gap-3">
                <span className="text-sm font-bold text-primary-400 shrink-0">
                  Questão {i + 1}
                </span>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className="text-xs text-gray-500">
                    {a.category}
                    {a.difficulty ? ` · ${a.difficulty}` : ''}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    a.isCorrect
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {a.isCorrect ? '✓ Correta' : '✗ Incorreta'}
                  </span>
                </div>
              </div>

              <h3 className="font-semibold mb-4 leading-relaxed">{a.text}</h3>

              <div className="space-y-2">
                {Array.isArray(a.options) && a.options.map((option, idx) => {
                  const isChosen = idx === a.chosenAnswer;
                  const isCorrectOpt = idx === a.correctAnswer;
                  const showChosen = isChosen && !isCorrectOpt;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border-2 flex items-center gap-3 ${
                        isCorrectOpt
                          ? 'border-green-500 bg-green-500/10 text-green-400'
                          : showChosen
                          ? 'border-red-500 bg-red-500/10 text-red-400'
                          : 'border-gray-700 bg-gray-800/30 text-gray-400'
                      }`}
                    >
                      <span className="font-bold text-sm shrink-0">{letter(idx)}.</span>
                      <span className="flex-1">{option}</span>
                      {isCorrectOpt && (
                        <span className="text-xs font-semibold shrink-0">
                          {isChosen ? '✓ Correta' : 'Correta'}
                        </span>
                      )}
                      {showChosen && (
                        <span className="text-xs font-semibold shrink-0">Sua resposta</span>
                      )}
                    </div>
                  );
                })}
                {a.chosenAnswer === null && (
                  <p className="text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                    ⏰ Tempo esgotado · não respondeu
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>Tempo de resposta: <span className="text-gray-300">{formatTime(a.responseTimeMs)}</span></span>
                <span>Pontos: <span className="font-bold text-primary-400">+{a.pointsEarned}</span></span>
              </div>
            </motion.div>
          ))}

          {answers.length === 0 && (
            <div className="card text-center text-gray-400 py-8">
              Nenhuma resposta registrada.
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-2">
          <button onClick={() => navigate(-1)} className="btn-secondary flex-1">
            Voltar
          </button>
          <button onClick={() => navigate('/rankings')} className="btn-primary flex-1">
            Ver Rankings
          </button>
        </div>
      </div>
    </div>
  );
}
