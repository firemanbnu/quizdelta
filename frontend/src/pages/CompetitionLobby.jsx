import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function CompetitionLobby() {
  const { code } = useParams();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState([]);
  const [competition, setCompetition] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit('join-room', { code }, (response) => {
      if (response.error) {
        setError(response.error);
        return;
      }
      setCompetition(response.competition);
      setParticipants(response.participants);
      setIsHost(response.isHost);
      setJoined(true);

      if (response.competition.status === 'active') {
        navigate(`/game/${code}`);
      }
    });

    socket.on('participant-joined', (participant) => {
      setParticipants((prev) => {
        if (prev.find((p) => p.id === participant.id)) return prev;
        return [...prev, { ...participant, score: 0, correctAnswers: 0 }];
      });
    });

    socket.on('competition-started', () => {
      navigate(`/game/${code}`);
    });

    return () => {
      socket.off('participant-joined');
      socket.off('competition-started');
    };
  }, [socket, connected, code]);

  const handleStart = () => {
    if (!socket) return;
    socket.emit('start-competition', { code }, (response) => {
      if (response.error) {
        setError(response.error);
      }
    });
  };

  const handleCancel = () => {
    if (!socket) return;
    socket.emit('cancel-competition', { code }, () => {
      navigate('/dashboard');
    });
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
        <div className="card text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-60 h-60 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-accent-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative card w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">
            {competition?.title || 'Competição'}
          </h1>
          <p className="text-gray-400 text-sm">
            {competition?.categories?.length
              ? competition.categories.join(' · ')
              : competition?.category
              ? `Categoria: ${competition.category}`
              : 'Todas as categorias'}
          </p>
        </div>

        {/* Code Display */}
        <div className="text-center mb-8">
          <p className="text-gray-400 text-sm mb-2">Código da Competição</p>
          <div className="text-5xl font-mono font-bold text-primary-400 tracking-widest">
            {code}
          </div>
        </div>

        {/* Competition Info */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center bg-gray-800/50 rounded-xl p-3">
            <p className="text-2xl font-bold text-primary-400">
              {competition?.totalQuestions || '?'}
            </p>
            <p className="text-xs text-gray-400">Perguntas</p>
          </div>
          <div className="text-center bg-gray-800/50 rounded-xl p-3">
            <p className="text-2xl font-bold text-accent-400">
              {competition?.timePerQuestion || '?'}s
            </p>
            <p className="text-xs text-gray-400">Por pergunta</p>
          </div>
          <div className="text-center bg-gray-800/50 rounded-xl p-3">
            <p className="text-2xl font-bold text-green-400">
              {participants.length}
            </p>
            <p className="text-xs text-gray-400">Jogadores</p>
          </div>
        </div>

        {/* Participants List */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            Participantes ({participants.length})
          </h3>
          <div className="max-h-48 overflow-y-auto space-y-2">
            <AnimatePresence>
              {participants.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 bg-gray-800/50 rounded-xl px-4 py-3"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center text-sm font-bold">
                    {p.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 font-semibold">{p.name}</span>
                  {p.isHost && (
                    <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-1 rounded-full">
                      Host
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Status */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-gray-800/50 rounded-full px-4 py-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            <span className="text-sm text-gray-400">
              {joined ? 'Conectado à sala' : 'Conectando...'}
            </span>
          </div>
        </div>

        {/* Actions */}
        {isHost && (
          <div className="flex gap-2">
            <button onClick={handleCancel} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button
              onClick={handleStart}
              disabled={participants.length < 1}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Iniciar Competição
            </button>
          </div>
        )}

        {!isHost && (
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Aguardando o host iniciar a competição...</p>
            <div className="flex justify-center">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
