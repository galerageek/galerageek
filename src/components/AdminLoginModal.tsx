import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, X, ArrowRight, AlertCircle, KeyRound, User } from 'lucide-react';
import { GaleraGeekLogo } from './GaleraGeekLogo';
import { AdminUser, AdminRole } from '../types';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  expectedPassword?: string;
  users?: AdminUser[];
  onSuccessLogin: (remember: boolean, user: { username: string; role: AdminRole; name: string }) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  expectedPassword = 'admin',
  users = [],
  onSuccessLogin,
}) => {
  if (!isOpen) return null;

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setErrorMessage('');

    const trimmedEntered = password.trim();
    const trimmedUser = username.trim().toLowerCase();

    // Check if matching any registered adminUser
    let matchedUser: { username: string; role: AdminRole; name: string } | null = null;

    if (users && users.length > 0) {
      const found = users.find(u => u.username.toLowerCase() === trimmedUser && u.password === trimmedEntered);
      if (found) {
        matchedUser = {
          username: found.username,
          role: found.role,
          name: found.name || found.username,
        };
      }
    }

    // Fallback: master admin password check if username is 'admin' or matches master password
    if (!matchedUser) {
      const cleanExpected = (expectedPassword || 'admin').trim();
      if ((trimmedUser === 'admin' || trimmedUser === '') && trimmedEntered === cleanExpected) {
        matchedUser = {
          username: 'admin',
          role: 'admin',
          name: 'Administrador Geral',
        };
      }
    }

    if (matchedUser) {
      setFailedAttempts(0);
      onSuccessLogin(rememberMe, matchedUser);
      setPassword('');
      onClose();
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (nextAttempts >= 4) {
        setIsLocked(true);
        setLockCountdown(30);
        setErrorMessage('Muitas tentativas incorretas. Acesso bloqueado temporariamente por 30 segundos.');

        const interval = window.setInterval(() => {
          setLockCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              setIsLocked(false);
              setFailedAttempts(0);
              setErrorMessage('');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setErrorMessage(`Usuário ou senha incorretos (${nextAttempts}/4 tentativas).`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ambient Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-purple-600 to-cyan-500" />

        {/* Modal Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header Identity */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-3">
              <GaleraGeekLogo className="w-14 h-14" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-800/60 text-[11px] font-bold text-amber-300 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Painel do Administrador</span>
            </div>
            <h2 className="font-display font-black text-2xl text-white">
              Acesso Restrito ao Estoque
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
              Autentique-se para gerenciar produtos, cadastrar novos cards, atualizar preços e controlar o estoque da Galera Geek.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Usuário / Identificação
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Senha de Acesso</span>
                </label>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha..."
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <span>Lembrar neste navegador</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLocked}
              className={`w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                isLocked
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>{isLocked ? `Aguarde ${lockCountdown}s...` : 'Entrar no Gerenciador de Estoque'}</span>
              {!isLocked && <ArrowRight className="w-4 h-4 ml-1" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
