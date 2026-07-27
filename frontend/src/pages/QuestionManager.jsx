import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuestionManager() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [filter, setFilter] = useState({ category: '', difficulty: '', approved: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [form, setForm] = useState({
    text: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    category: '',
    difficulty: 'medio'
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfText, setPdfText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchQuestions();
  }, [filter]);

  const fetchQuestions = async () => {
    try {
      const params = {};
      if (filter.category) params.category = filter.category;
      if (filter.difficulty) params.difficulty = filter.difficulty;
      if (filter.approved) params.approved = filter.approved;
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
      if (editingQuestion) {
        await axios.put(`/api/questions/${editingQuestion.id}`, form);
        setMessage('Pergunta atualizada!');
      } else {
        await axios.post('/api/questions', form);
        setMessage('Pergunta criada!');
      }
      resetForm();
      fetchQuestions();
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

  const handlePdfUpload = async () => {
    if (!pdfFile) return;
    const formData = new FormData();
    formData.append('file', pdfFile);

    try {
      setGenerating(true);
      const res = await axios.post('/api/upload/extract-text', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPdfText(res.data.text);
      setMessage('Texto extraído com sucesso!');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Erro ao extrair texto');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!pdfText) return;
    try {
      setGenerating(true);
      const res = await axios.post('/api/ai/generate', {
        text: pdfText,
        count: 10,
        category: filter.category || 'Geral'
      });
      setGeneratedQuestions(res.data.questions);
      setMessage(`${res.data.questions.length} perguntas geradas!`);
      fetchQuestions();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Erro ao gerar perguntas');
    } finally {
      setGenerating(false);
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: 'list', label: 'Lista', icon: '📋' },
            { key: 'create', label: 'Criar', icon: '✏️' },
            { key: 'pdf', label: 'Upload PDF + IA', icon: '🤖' }
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

        {/* List Tab */}
        {activeTab === 'list' && (
          <>
            {/* Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
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
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {questions.length === 0 ? (
                  <div className="card text-center text-gray-400">
                    Nenhuma pergunta encontrada
                  </div>
                ) : (
                  questions.map((q) => (
                    <div key={q.id} className="card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              q.approved ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
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

        {/* Create/Edit Tab */}
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

        {/* PDF + IA Tab */}
        {activeTab === 'pdf' && (
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
              <h2 className="text-xl font-bold mb-4">📄 Upload de Arquivo</h2>
              <p className="text-gray-400 text-sm mb-4">
                Faça upload de um PDF, DOC ou TXT para extrair o conteúdo e gerar perguntas automaticamente.
              </p>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setPdfFile(e.target.files[0])}
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary flex-1"
                >
                  {pdfFile ? pdfFile.name : 'Selecionar arquivo'}
                </button>
                <button
                  onClick={handlePdfUpload}
                  disabled={!pdfFile || generating}
                  className="btn-primary"
                >
                  {generating ? 'Extraindo...' : 'Extrair Texto'}
                </button>
              </div>
            </motion.div>

            {pdfText && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
                <h2 className="text-xl font-bold mb-4">📝 Texto Extraído</h2>
                <div className="bg-gray-800/50 rounded-xl p-4 max-h-64 overflow-y-auto mb-4">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">
                    {pdfText.substring(0, 3000)}
                    {pdfText.length > 3000 && '...'}
                  </pre>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPdfText(''); setPdfFile(null); setGeneratedQuestions([]); }}
                    className="btn-secondary"
                  >
                    Limpar
                  </button>
                  <button
                    onClick={handleGenerateQuestions}
                    disabled={generating}
                    className="btn-primary flex-1"
                  >
                    {generating ? 'Gerando perguntas com IA...' : '🤖 Gerar Perguntas com IA'}
                  </button>
                </div>
              </motion.div>
            )}

            {generatedQuestions.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
                <h2 className="text-xl font-bold mb-4">
                  ✨ Perguntas Geradas ({generatedQuestions.length})
                </h2>
                <p className="text-gray-400 text-sm mb-4">
                  As perguntas foram salvas como pendentes. Revise e aprove na aba Lista.
                </p>
                <div className="space-y-2">
                  {generatedQuestions.map((q) => (
                    <div key={q.id} className="bg-gray-800/50 rounded-xl p-3">
                      <p className="font-semibold text-sm mb-2">{q.text}</p>
                      <div className="flex flex-wrap gap-1">
                        {q.options?.map((opt, i) => (
                          <span key={i} className={`text-xs px-2 py-1 rounded-lg ${
                            i === q.correct_answer ? 'bg-green-500/10 text-green-400' : 'bg-gray-800 text-gray-400'
                          }`}>
                            {String.fromCharCode(65 + i)}: {opt.substring(0, 40)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
