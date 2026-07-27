import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function GameRoom() {
  const { code } = useParams();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [scoreboard, setScoreboard] = useState([]);
  const [finished, setFinished] = useState(false);
  const [finalRanking, setFinalRanking] = useState([]);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const timerRef = useRef(null);
  const questionStartTime = useRef(null);

  useEffect(() => {
    if (!socket || !connected) return;

    socket.on('new-question', (data) => {
      setQuestion(data);
      setSelectedAnswer(null);
      setAnswered(false);
      setResult(null);
      setTimeLeft(data.timeLimit);
      setQuestionNumber(data.questionNumber);
      setTotalQuestions(data.totalQuestions);
      questionStartTime.current = Date.now();

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    socket.on('question-timeout', (data) => {
      if (!answered) {
        setAnswered(true);
        setResult({
          isCorrect: false,
          correctAnswer: data.correctAnswer,
          points: 0
        });
      }
      updateScoreboard();
    });

    socket.on('competition-finished', (data) => {
      setFinished(true);
      setFinalRanking(data.ranking);
      if (timerRef.current) clearInterval(timerRef.current);
    });

    updateScoreboard();

    return () => {
      socket.off('new-question');
      socket.off('question-timeout');
      socket.off('competition-finished');
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [socket, connected]);

  const updateScoreboard = () => {
    if (!socket) return;
    socket.emit('get-scoreboard', { code }, (data) => {
      if (Array.isArray(data)) {
        setScoreboard(data);
      }
    });
  };

  const handleAnswer = (index) => {
    if (answered || !question) return;

    const responseTimeMs = Date.now() - questionStartTime.current;
    setSelectedAnswer(index);
    setAnswered(true);

    socket.emit('submit-answer', {
      code,
      questionId: question.questionId,
      chosenAnswer: index,
      responseTimeMs
    }, (response) => {
      if (response.error) return;
      setResult(response);
      updateScoreboard();
    });
  };

  const handleNextQuestion = () => {
    socket.emit('next-question', { code }, (response) => {
      if (response.finished) {
        setFinished(true);
      }
    });
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  if (finished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card w-full max-w-lg text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
            className="text-6xl mb-4"
          >
            🏆
          </motion.div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
            Competição Encerrada!
          </h1>
          <p className="text-gray-400 mb-8">Confira o ranking final:</p>

          <div className="space-y-2 mb-8">
            {finalRanking.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                  i === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                  i === 1 ? 'bg-gray-400/10 border border-gray-400/30' :
                  i === 2 ? 'bg-orange-500/10 border border-orange-500/30' :
                  'bg-gray-800/50'
                }`}
              >
                <span className="text-lg font-bold w-8">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${p.position}°`}
                </span>
                <div className="flex-1 text-left">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-gray-400">
                    {p.correctAnswers}/{p.totalAnswered} ({p.accuracy}%)
                  </p>
                </div>
                <span className="font-bold text-primary-400">{p.score} pts</span>
              </motion.div>
            ))}
          </div>

          <button onClick={handleBackToDashboard} className="btn-primary w-full">
            Voltar ao Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Aguardando a primeira pergunta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Pergunta</span>
            <span className="font-bold text-primary-400">{questionNumber}/{totalQuestions}</span>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            timeLeft <= 5 ? 'bg-red-500/20 text-red-400 animate-pulse' :
            timeLeft <= 15 ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-gray-800/50 text-gray-300'
          }`}>
            <span className="text-lg font-mono font-bold">{timeLeft}s</span>
          </div>
          <div className="text-sm text-gray-400">
            {question.category}
          </div>
        </div>

        {/* Timer Bar */}
        <div className="w-full bg-gray-800 rounded-full h-2 mb-8">
          <motion.div
            className={`h-2 rounded-full ${
              timeLeft <= 5 ? 'bg-red-500' :
              timeLeft <= 15 ? 'bg-yellow-500' :
              'bg-primary-500'
            }`}
            initial={{ width: '100%' }}
            animate={{ width: `${(timeLeft / question.timeLimit) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Question Area */}
          <div className="lg:col-span-2">
            <motion.div
              key={question.questionId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card mb-6"
            >
              <h2 className="text-xl font-bold mb-6 leading-relaxed">
                {question.text}
              </h2>

              <div className="grid sm:grid-cols-2 gap-3">
                {question.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrect = result && index === result.correctAnswer;
                  const isWrong = isSelected && result && !result.isCorrect;

                  return (
                    <motion.button
                      key={index}
                      whileHover={!answered ? { scale: 1.02 } : {}}
                      whileTap={!answered ? { scale: 0.98 } : {}}
                      onClick={() => handleAnswer(index)}
                      disabled={answered}
                      className={`text-left p-4 rounded-xl border-2 transition-all duration-300 ${
                        isCorrect
                          ? 'border-green-500 bg-green-500/10 text-green-400'
                          : isWrong
                          ? 'border-red-500 bg-red-500/10 text-red-400'
                          : isSelected
                          ? 'border-primary-500 bg-primary-500/10'
                          : answered
                          ? 'border-gray-700 bg-gray-800/30 opacity-50'
                          : 'border-gray-700 bg-gray-800/50 hover:border-primary-500/50 hover:bg-gray-800'
                      }`}
                    >
                      <span className="font-bold text-sm mr-2">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      {option}
                    </motion.button>
                  );
                })}
              </div>

              {/* Result */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-6 p-4 rounded-xl text-center ${
                    result.isCorrect
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                  }`}
                >
                  <p className={`text-lg font-bold ${result.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                    {result.isCorrect ? '✓ Correto!' : '✗ Incorreto'}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    +{result.points} pontos
                  </p>
                </motion.div>
              )}
            </motion.div>

            {/* Next Button */}
            {answered && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <button onClick={handleNextQuestion} className="btn-primary">
                  {questionNumber >= totalQuestions ? 'Ver Resultado' : 'Próxima Pergunta'}
                </button>
              </motion.div>
            )}
          </div>

          {/* Scoreboard */}
          <div className="lg:col-span-1">
            <div className="card sticky top-4">
              <h3 className="font-bold mb-4 text-gray-400 text-sm uppercase tracking-wider">
                Placar ao Vivo
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {scoreboard.map((p, i) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                      p.id === user?.id ? 'bg-primary-500/10 border border-primary-500/30' :
                      'bg-gray-800/30'
                    }`}
                  >
                    <span className="text-sm font-bold text-gray-400 w-6">
                      {i + 1}°
                    </span>
                    <span className={`flex-1 text-sm ${p.id === user?.id ? 'font-bold text-primary-400' : ''}`}>
                      {p.name}
                    </span>
                    <span className="text-sm font-bold">
                      {p.correctAnswers}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
