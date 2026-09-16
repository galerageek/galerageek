import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, X, ArrowRight, AlertCircle, KeyRound } from 'lucide-react';
import { GaleraGeekLogo } from './GaleraGeekLogo';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  expectedPassword?: string;
  onSuccessLogin: (remember: boolean) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  expectedPassword = 'admin',
  onSuccessLogin,
}) => {
  if (!isOpen) return null;

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedEntered = password.trim();
    const cleanExpected = (expectedPassword || 'admin').trim();

    if (trimmedEntered === cleanExpected) {
      onSuccessLogin(rememberMe);
      setPassword('');
      onClose();
    } else {
      setErrorMessage('Senha incorreta. Verifique os dados e tente novamente.');
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
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <Lock className="w-4 h-4" />
              <span>Entrar no Gerenciador de Estoque</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </form>

          {/* Quick Credential Helper / Hint */}
          <div className="mt-6 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 text-center">
            <span className="text-amber-400 font-semibold">Dica de Acesso Inicial:</span>
            <p className="mt-0.5">
              A senha padrão inicial é <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-bold">admin</code>. Você pode alterá-la nas configurações após o login.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
