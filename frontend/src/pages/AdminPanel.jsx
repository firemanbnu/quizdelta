import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, catsRes] = await Promise.all([
        axios.get('/api/users'),
        axios.get('/api/questions/category-stats')
      ]);
      setUsers(usersRes.data);
      setCategories(catsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (id, patch) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const toggleCategory = (id, name) => {
    setUsers((prev) => prev.map((u) => {
      if (u.id !== id) return u;
      const selected = u.categories.includes(name)
        ? u.categories.filter((c) => c !== name)
        : [...u.categories, name];
      return { ...u, categories: selected };
    }));
  };

  const handleSave = async (target) => {
    setSavingId(target.id);
    setMessage({ type: '', text: '' });
    try {
      const res = await axios.put(`/api/users/${target.id}`, {
        role: target.role,
        categories: target.categories
      });
      setUsers((prev) => prev.map((u) => (u.id === target.id ? res.data : u)));
      setMessage({ type: 'success', text: `Permissões de ${res.data.name} atualizadas!` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erro ao salvar' });
    } finally {
      setSavingId(null);
    }
  };

  const roleLabel = (role) => (role === 'admin' ? 'Admin' : 'Usuário');

  const handleResetPassword = async (target) => {
    const temp = window.prompt(
      `Defina uma senha temporária para ${target.name} (mínimo 6 caracteres). O usuário criará uma nova no próximo login.`,
      '123456'
    );
    if (temp === null) return;
    if (temp.length < 6) {
      return setMessage({ type: 'error', text: 'A senha temporária deve ter pelo menos 6 caracteres' });
    }
    setSavingId(target.id);
    setMessage({ type: '', text: '' });
    try {
      const res = await axios.post(`/api/users/${target.id}/reset-password`, { newPassword: temp });
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, mustChangePassword: true } : u)));
      setMessage({ type: 'success', text: res.data.message });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erro ao resetar senha' });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white mb-6 flex items-center gap-1">
          ← Voltar
        </button>

        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          👥 Painel de Permissões
        </h1>
        <p className="text-gray-400 text-sm mb-6">
          Gerencie quem tem acesso de administrador e quais bancos de perguntas cada pessoa pode acessar.
        </p>

        <div className="mb-6 p-4 rounded-xl bg-primary-500/10 border border-primary-500/30 text-sm text-primary-300">
          💡 Novos usuários entram sempre com permissão de <strong>Usuário</strong>. Somente um administrador pode
          conceder acesso de admin ou liberar bancos de perguntas.
        </div>

        {message.text && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-3 rounded-xl border text-sm flex items-center justify-between ${
              message.type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-green-500/10 border-green-500/30 text-green-400'
            }`}
          >
            {message.text}
            <button onClick={() => setMessage({ type: '', text: '' })} className="ml-2 text-gray-400">✕</button>
          </motion.div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((u, index) => {
              const isSelf = u.id === currentUser?.id;
              const isAdmin = u.role === 'admin';
              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="card"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {u.name} {isSelf && <span className="text-gray-500 text-xs">(você)</span>}
                      </p>
                      <p className="text-gray-400 text-sm truncate">{u.email}</p>
                      <p className="text-gray-600 text-xs mt-1">
                        Cadastrado em {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                        isAdmin ? 'bg-primary-500/20 text-primary-400' : 'bg-gray-700/50 text-gray-300'
                      }`}>
                        {roleLabel(u.role)}
                      </span>
                      {u.mustChangePassword && (
                        <span className="block text-xs text-yellow-400 mt-1 text-right">
                          ⚠ senha temporária
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm text-gray-400 block mb-1">Nível de acesso</label>
                    <select
                      value={u.role}
                      disabled={isSelf}
                      onChange={(e) => updateUser(u.id, { role: e.target.value })}
                      className={`input w-full sm:w-64 ${isSelf ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="player">Usuário</option>
                      <option value="admin">Admin</option>
                    </select>
                    {isSelf && (
                      <p className="text-xs text-gray-500 mt-1">
                        Você não pode alterar o próprio nível de acesso.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-2">
                      Bancos de perguntas liberados
                      {isAdmin && <span className="text-xs text-gray-500 ml-2">(admin tem acesso a todos)</span>}
                    </label>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                      {categories.map((cat) => {
                        const checked = u.categories.includes(cat.name);
                        return (
                          <button
                            key={cat.name}
                            type="button"
                            disabled={isAdmin}
                            onClick={() => toggleCategory(u.id, cat.name)}
                            className={`p-3 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                              isAdmin
                                ? 'border-gray-800 bg-gray-800/20 opacity-60 cursor-not-allowed'
                                : checked
                                  ? 'border-primary-500/60 bg-primary-500/10'
                                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs shrink-0 ${
                              checked ? 'bg-primary-500 border-primary-500 text-white' : 'border-gray-500'
                            }`}>
                              {checked && '✓'}
                            </div>
                            <span className="flex-1 font-semibold text-sm truncate">{cat.name}</span>
                            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                              {cat.count}
                            </span>
                          </button>
                        );
                      })}
                      {categories.length === 0 && (
                        <p className="text-gray-500 text-sm col-span-full">
                          Nenhum banco de perguntas cadastrado.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => handleResetPassword(u)}
                      disabled={savingId === u.id || isSelf}
                      className="px-5 py-2 text-sm font-semibold rounded-xl border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isSelf ? 'Você não pode resetar a própria senha' : 'Redefinir senha (temporária)'}
                    >
                      {savingId === u.id ? 'Resetando...' : 'Resetar senha'}
                    </button>
                    <button
                      onClick={() => handleSave(u)}
                      disabled={savingId === u.id}
                      className="btn-primary text-sm py-2 px-5"
                    >
                      {savingId === u.id ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
