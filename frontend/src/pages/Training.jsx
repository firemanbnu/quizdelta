import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';

export default function Training() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (sessionStarted) {
      fetchQuestions();
    }
  }, [selectedCategory, sessionStarted]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/questions/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      const res = await axios.get('/api/questions/training', { params });
      const shuffled = res.data.sort(() => Math.random() - 0.5);
      setSessionQuestions(shuffled.slice(0, Math.min(10, shuffled.length)));
      setCurrentIndex(0);
      setScore(0);
      setTotalAnswered(0);
      setSelectedAnswer(null);
      setAnswered(false);
      setLastResult(null);
      setStartTime(Date.now());
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartSession = () => {
    setSessionStarted(true);
  };

  const handleAnswer = async (index) => {
    if (answered) return;
    setSelectedAnswer(index);
    setAnswered(true);
    setTotalAnswered((prev) => prev + 1);

    const currentQuestion = sessionQuestions[currentIndex];
    const responseTime = startTime ? Date.now() - startTime : 0;

    try {
      const res = await axios.post('/api/training/submit', {
        question_id: currentQuestion.id,
        chosen_answer: index,
        response_time_ms: responseTime
      });

      setLastResult(res.data);

      if (res.data.is_correct) {
        setScore((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Erro ao registrar resposta:', err);
      if (index === currentQuestion.correct_answer) {
        setScore((prev) => prev + 1);
      }
    }

    setStartTime(Date.now());
  };

  const handleNext = () => {
    if (currentIndex + 1 >= sessionQuestions.length) {
      setCurrentIndex(sessionQuestions.length);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setAnswered(false);
    setLastResult(null);
    setStartTime(Date.now());
  };

  const handleNewSession = () => {
    setSessionStarted(false);
    setCurrentIndex(0);
    setScore(0);
    setTotalAnswered(0);
    setSelectedAnswer(null);
    setAnswered(false);
    setSessionQuestions([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
        <div className="max-w-md mx-auto pt-8">
          <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white mb-6 flex items-center gap-1">
            ← Voltar
          </button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card text-center">
            <div className="text-5xl mb-4">📚</div>
            <h1 className="text-2xl font-bold mb-2">Modo Treinamento</h1>
            <p className="text-gray-400 mb-6">
              Pratique no seu ritmo. Escolha uma categoria ou treine com todas.
            </p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => { setSelectedCategory(''); handleStartSession(); }}
                className="w-full p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-primary-500/50 hover:bg-gray-800 transition-all text-left"
              >
                <p className="font-semibold">Todas as Categorias</p>
                <p className="text-sm text-gray-400">Perguntas aleatórias de todas as categorias</p>
              </button>

              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); handleStartSession(); }}
                  className="w-full p-4 rounded-xl border-2 border-gray-700 bg-gray-800/50 hover:border-primary-500/50 hover:bg-gray-800 transition-all text-left"
                >
                  <p className="font-semibold">{cat}</p>
                  <p className="text-sm text-gray-400">Focado em {cat}</p>
                </button>
              ))}

              {categories.length === 0 && (
                <p className="text-gray-500 text-sm">
                  Nenhuma pergunta disponível. Peça ao admin para adicionar perguntas.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (sessionQuestions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="card text-center max-w-md">
          <p className="text-gray-400 mb-4">Nenhuma pergunta encontrada para esta categoria.</p>
          <button onClick={handleNewSession} className="btn-primary">Voltar</button>
        </div>
      </div>
    );
  }

  if (currentIndex >= sessionQuestions.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card w-full max-w-md text-center"
        >
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold mb-2">Sessão Concluída!</h2>
          <div className="my-8">
            <div className="text-6xl font-bold text-primary-400 mb-2">
              {score}/{sessionQuestions.length}
            </div>
            <p className="text-gray-400">
              {Math.round((score / sessionQuestions.length) * 100)}% de acerto
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleNewSession} className="btn-secondary flex-1">
              Nova Sessão
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-primary flex-1">
              Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = sessionQuestions[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
      <div className="max-w-2xl mx-auto pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={handleNewSession} className="text-gray-400 hover:text-white text-sm">
            ← Sair
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {currentIndex + 1}/{sessionQuestions.length}
            </span>
            <span className="text-sm font-bold text-primary-400">
              {score} acertos
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-800 rounded-full h-2 mb-8">
          <div
            className="bg-primary-500 h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / sessionQuestions.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
              {currentQuestion.category}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              currentQuestion.difficulty === 'facil' ? 'bg-green-500/20 text-green-400' :
              currentQuestion.difficulty === 'dificil' ? 'bg-red-500/20 text-red-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              {currentQuestion.difficulty === 'facil' ? 'Fácil' :
               currentQuestion.difficulty === 'dificil' ? 'Difícil' : 'Médio'}
            </span>
          </div>

          <h2 className="text-lg font-bold mb-6 leading-relaxed">
            {currentQuestion.text}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const correctIdx = lastResult ? lastResult.correct_answer : currentQuestion.correct_answer;
              const isCorrect = answered && index === correctIdx;
              const isWrong = isSelected && answered && index !== correctIdx;

              return (
                <motion.button
                  key={index}
                  whileHover={!answered ? { scale: 1.01 } : {}}
                  whileTap={!answered ? { scale: 0.99 } : {}}
                  onClick={() => handleAnswer(index)}
                  disabled={answered}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isCorrect
                      ? 'border-green-500 bg-green-500/10 text-green-400'
                      : isWrong
                      ? 'border-red-500 bg-red-500/10 text-red-400'
                      : isSelected
                      ? 'border-primary-500 bg-primary-500/10'
                      : answered
                      ? 'border-gray-700 bg-gray-800/30 opacity-50'
                      : 'border-gray-700 bg-gray-800/50 hover:border-primary-500/50'
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

          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-center"
            >
              <button onClick={handleNext} className="btn-primary">
                {currentIndex + 1 >= sessionQuestions.length ? 'Ver Resultado' : 'Próxima'}
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
