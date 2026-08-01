import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuestionManager() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [filter, setFilter] = useState({ category: '', difficulty: '', approved: '', search: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [form, setForm] = useState({
    text: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    category: '',
    difficulty: 'medio'
  });
  const [inputText, setInputText] = useState('');
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [importCategory, setImportCategory] = useState('Importado');
  const [highlightedId, setHighlightedId] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    fetchQuestions();
  }, [filter]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get('/api/questions/categories');
        setCategories(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (highlightedId && listRef.current) {
      const el = listRef.current.querySelector(`[data-question-id="${highlightedId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const timer = setTimeout(() => setHighlightedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedId, questions]);

  const fetchQuestions = async () => {
    try {
      const params = {};
      if (filter.category) params.category = filter.category;
      if (filter.difficulty) params.difficulty = filter.difficulty;
      if (filter.approved) params.approved = filter.approved;
      if (filter.search) params.search = filter.search;
      const res = await axios.get('/api/questions/all', { params });
      setQuestions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const editId = editingQuestion?.id;
      if (editingQuestion) {
        await axios.put(`/api/questions/${editingQuestion.id}`, form);
        setMessage('Pergunta atualizada!');
      } else {
        await axios.post('/api/questions', form);
        setMessage('Pergunta criada!');
      }
      resetForm();
      setActiveTab('list');
      await fetchQuestions();
      if (editId) {
        setHighlightedId(editId);
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Erro ao salvar pergunta');
    }
  };

  const handleEdit = (q) => {
    setEditingQuestion(q);
    setForm({
      text: q.text,
      options: q.options,
      correct_answer: q.correct_answer,
      category: q.category,
      difficulty: q.difficulty
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta pergunta?')) return;
    try {
      await axios.delete(`/api/questions/${id}`);
      fetchQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (id, approved) => {
    try {
      await axios.put(`/api/questions/${id}`, { approved });
      fetchQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  const parseQuestionsFromText = (text) => {
    const separator = /\n?\*{4,}\n?/;
    const blocks = text.split(separator).filter(b => b.trim());

    const questions = [];
    let number = 0;

    for (const block of blocks) {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 2) continue;

      let questionText = '';
      const options = [];
      let correctAnswer = 0;

      for (const line of lines) {
        const optionMatch = line.match(/^([A-Da-d])[\.\)]\s*(.+)/);
        if (optionMatch) {
          options.push(optionMatch[2].trim());
          if (line.includes('*') || line.includes('✓') || line.includes('(certa)') || line.includes('(correta)')) {
            correctAnswer = options.length - 1;
          }
        } else if (options.length === 0) {
          const cleanLine = line.replace(/^\d{1,3}[\.\)]\s*/, '');
          questionText += (questionText ? ' ' : '') + cleanLine;
        }
      }

      if (questionText && options.length >= 2) {
        number++;
        questions.push({
          number,
          text: questionText,
          options: options.length >= 4 ? options.slice(0, 4) : [...options, ...Array(4 - options.length).fill('')],
          correct_answer: correctAnswer < options.length ? correctAnswer : 0,
          category: importCategory,
          difficulty: 'medio',
          source: 'pdf'
        });
      }
    }

    return questions;
  };

  const handleParseAndImport = async () => {
    if (!inputText.trim()) {
      setMessage('Cole o texto com as perguntas primeiro');
      return;
    }

    const parsed = parseQuestionsFromText(inputText);
    if (parsed.length === 0) {
      setMessage('Nenhuma pergunta encontrada. Verifique o formato: perguntas separadas por ****');
      return;
    }

    try {
      setImporting(true);
      const res = await axios.post('/api/questions/import', {
        questions: parsed,
        category: importCategory
      });
      setMessage(`${res.data.questions.length} perguntas importadas com sucesso!`);
      setInputText('');
      fetchQuestions();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Erro ao importar perguntas');
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setForm({
      text: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      category: '',
      difficulty: 'medio'
    });
    setEditingQuestion(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white mb-6 flex items-center gap-1">
          ← Voltar
        </button>

        <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
          📝 Gerenciar Perguntas
        </h1>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-primary-500/10 border border-primary-500/30 text-primary-400 text-sm"
          >
            {message}
            <button onClick={() => setMessage('')} className="ml-2 text-gray-400">✕</button>
          </motion.div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: 'list', label: 'Lista', icon: '📋' },
            { key: 'create', label: 'Criar', icon: '✏️' },
            { key: 'import', label: 'Importar', icon: '📋' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key === 'create') {
                  resetForm();
                  setShowForm(true);
                }
              }}
              className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'list' && (
          <>
            <div className="flex gap-2 mb-4 flex-wrap">
              <input
                type="text"
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                placeholder="Buscar por título da pergunta..."
                className="input text-sm flex-1 min-w-40"
              />
              <select
                value={filter.approved}
                onChange={(e) => setFilter({ ...filter, approved: e.target.value })}
                className="input text-sm"
              >
                <option value="">Todos os status</option>
                <option value="true">Aprovadas</option>
                <option value="false">Pendentes</option>
              </select>
              <select
                value={filter.difficulty}
                onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
                className="input text-sm"
              >
                <option value="">Todas dificuldades</option>
                <option value="facil">Fácil</option>
                <option value="medio">Médio</option>
                <option value="dificil">Difícil</option>
              </select>
              <select
                value={filter.category}
                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                className="input text-sm"
              >
                <option value="">Todos os grupos</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-2" ref={listRef}>
                {questions.length === 0 ? (
                  <div className="card text-center text-gray-400">
                    Nenhuma pergunta encontrada
                  </div>
                ) : (
                  questions.map((q) => (
                    <div
                      key={q.id}
                      data-question-id={q.id}
                      className={`card transition-all duration-500 ${
                        highlightedId === q.id
                          ? 'ring-2 ring-primary-500 bg-primary-500/10'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              onClick={() => handleApprove(q.id, !q.approved)}
                              className={`cursor-pointer text-xs px-2 py-1 rounded-full transition-all hover:scale-105 ${
                                q.approved
                                  ? 'bg-green-500/20 text-green-400 hover:bg-yellow-500/20 hover:text-yellow-400'
                                  : 'bg-yellow-500/20 text-yellow-400 hover:bg-green-500/20 hover:text-green-400'
                              }`}
                              title={q.approved ? 'Clique para desaprovar' : 'Clique para aprovar'}
                            >
                              {q.approved ? 'Aprovada' : 'Pendente'}
                            </span>
                            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
                              {q.category}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              q.difficulty === 'facil' ? 'bg-green-500/20 text-green-400' :
                              q.difficulty === 'dificil' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {q.difficulty}
                            </span>
                          </div>
                          <p className="font-semibold text-sm mb-2 line-clamp-2">{q.text}</p>
                          <div className="flex flex-wrap gap-1">
                            {q.options?.map((opt, i) => (
                              <span key={i} className={`text-xs px-2 py-1 rounded-lg ${
                                i === q.correct_answer ? 'bg-green-500/10 text-green-400' : 'bg-gray-800 text-gray-400'
                              }`}>
                                {String.fromCharCode(65 + i)}: {opt.substring(0, 30)}{opt.length > 30 ? '...' : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {!q.approved && (
                            <button
                              onClick={() => handleApprove(q.id, true)}
                              className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs"
                              title="Aprovar"
                            >
                              ✓
                            </button>
                          )}
                          {q.approved && (
                            <button
                              onClick={() => handleApprove(q.id, false)}
                              className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 text-xs"
                              title="Desaprovar"
                            >
                              ✕
                            </button>
                          )}
                          <button
                            onClick={() => { handleEdit(q); setActiveTab('create'); }}
                            className="p-2 rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 text-xs"
                            title="Editar"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs"
                            title="Excluir"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'create' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
            <h2 className="text-xl font-bold mb-4">
              {editingQuestion ? 'Editar Pergunta' : 'Nova Pergunta'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                placeholder="Texto da pergunta"
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                className="input w-full h-24 resize-none"
                required
              />

              <div className="grid sm:grid-cols-2 gap-3">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={form.correct_answer === i}
                      onChange={() => setForm({ ...form, correct_answer: i })}
                      className="accent-green-500"
                    />
                    <input
                      type="text"
                      placeholder={`Opção ${String.fromCharCode(65 + i)}`}
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...form.options];
                        newOptions[i] = e.target.value;
                        setForm({ ...form, options: newOptions });
                      }}
                      className="input flex-1 text-sm"
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Categoria"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input flex-1"
                />
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  className="input"
                >
                  <option value="facil">Fácil</option>
                  <option value="medio">Médio</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={resetForm} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingQuestion ? 'Salvar Alterações' : 'Criar Pergunta'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {activeTab === 'import' && (
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
              <h2 className="text-xl font-bold mb-4">📋 Importar Perguntas</h2>
              <p className="text-gray-400 text-sm mb-4">
                Cole o texto com as perguntas abaixo. Separe cada pergunta com uma linha de asterísticos (****).
              </p>

              <div className="bg-gray-800/50 rounded-xl p-3 mb-4">
                <p className="text-gray-500 text-xs mb-2">Formato esperado:</p>
                <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono">
{`1. Qual é a capital do Brasil?
A. São Paulo
B. Rio de Janeiro
C. Brasília
D. Salvador

****

2. Qual é o maior planeta?
A. Terra
B. Marte
C. Júpiter
D. Saturno`}
                </pre>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Categoria:</label>
                <input
                  type="text"
                  value={importCategory}
                  onChange={(e) => setImportCategory(e.target.value)}
                  placeholder="Ex: Direito Penal"
                  className="input w-full"
                />
              </div>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Cole aqui o texto com as perguntas..."
                className="input w-full h-64 resize-y font-mono text-sm"
              />

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setInputText('')}
                  className="btn-secondary"
                >
                  Limpar
                </button>
                <button
                  onClick={handleParseAndImport}
                  disabled={!inputText.trim() || importing}
                  className="btn-primary flex-1"
                >
                  {importing ? 'Salvando perguntas...' : '📥 Separar e Salvar Perguntas'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
