import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const { login, register, requestPasswordReset, resetPassword } = useAuth();
  const [mode, setMode] = useState('login');
  const [resetStep, setResetStep] = useState('request');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setResetStep('request');
    setError('');
    setInfo('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(name, email, password);
      } else if (mode === 'forgot') {
        if (resetStep === 'request') {
          const res = await requestPasswordReset(email);
          setInfo(res.message || 'Código enviado para o seu email.');
          setResetStep('confirm');
        } else {
          const res = await resetPassword(email, code, password);
          setInfo(res.message || 'Senha redefinida com sucesso.');
          switchMode('login');
          setPassword('');
        }
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao conectar ao servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-500/20 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative card w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center"
          >
            <span className="text-4xl font-bold text-white transform -rotate-12">Δ</span>
          </motion.div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            Saber Delta
          </h1>
          <p className="text-gray-400 mt-2">
            {mode === 'register'
              ? 'Crie sua conta'
              : mode === 'forgot'
                ? resetStep === 'request'
                  ? 'Recuperar senha'
                  : 'Defina uma nova senha'
                : 'Entre na competição'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={`${mode}-${resetStep}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {mode === 'register' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input w-full"
                  required
                />
              </motion.div>
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input w-full"
              required
              disabled={mode === 'forgot' && resetStep === 'confirm'}
            />
            {mode === 'forgot' && resetStep === 'confirm' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Código enviado por email"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input w-full"
                  required
                  maxLength={6}
                />
              </motion.div>
            )}
            <div className="relative">
              <input
                type="password"
                placeholder={mode === 'forgot' ? 'Nova senha' : 'Senha'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full"
                required
                minLength={6}
              />
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  Esqueci a senha?
                </button>
              )}
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg"
              >
                {error}
              </motion.p>
            )}

            {info && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-green-400 text-sm text-center bg-green-500/10 py-2 rounded-lg"
              >
                {info}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Carregando...'
                : mode === 'register'
                  ? 'Criar Conta'
                  : mode === 'forgot'
                    ? resetStep === 'request'
                      ? 'Enviar Código'
                      : 'Redefinir Senha'
                    : 'Entrar'}
            </button>
          </motion.form>
        </AnimatePresence>

        <div className="mt-6 text-center">
          <button
            onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}
            className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
          >
            {mode === 'login'
              ? 'Não tem conta? Cadastre-se'
              : mode === 'register'
                ? 'Já tem conta? Entre aqui'
                : 'Voltar para o login'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
