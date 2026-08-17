'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { user, isApproved, loginWithEmail, registerWithEmail, logout, loading, authError } = useAuth();
  const router = useRouter();

  // Tab mode: 'login' or 'register'
  const [mode, setMode] = useState('login');
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Redirect to restricted area if already authenticated and approved
  useEffect(() => {
    if (user && isApproved) {
      router.push('/restricted');
    }
  }, [user, isApproved, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Rate limit check: Max 5 actions (login/signup) per minute
    const now = Date.now();
    const attemptsStr = localStorage.getItem('auth_attempts') || '[]';
    let attempts = JSON.parse(attemptsStr);
    
    // Keep attempts in the last 60 seconds
    attempts = attempts.filter(timestamp => now - timestamp < 60000);
    
    if (attempts.length >= 5) {
      const oldestAttempt = attempts[0];
      const cooldownSecs = Math.ceil((60000 - (now - oldestAttempt)) / 1000);
      alert(`Muitas requisições! Por favor, aguarde ${cooldownSecs} segundos antes de tentar novamente.`);
      return;
    }
    
    attempts.push(now);
    localStorage.setItem('auth_attempts', JSON.stringify(attempts));

    setSubmitting(true);
    setSuccessMsg('');

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(name, email, password);
        setSuccessMsg('Cadastro realizado com sucesso! Aguarde aprovação.');
        // Reset fields
        setName('');
        setEmail('');
        setPassword('');
        setMode('login');
      }
    } catch (err) {
      console.warn("Auth action error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#121210] px-6 py-12">
      <div className="max-w-md w-full bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-2xl p-8 shadow-xl flex flex-col items-center">
        
        {/* Brand/Logo */}
        <Link href="/" className="text-2xl font-bold text-primary dark:text-inverse-primary tracking-tighter mb-6">
          Felipe Silva
        </Link>

        {authError && (
          <div className="w-full bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl p-3.5 text-xs font-semibold mb-6">
            {authError}
          </div>
        )}

        {successMsg && (
          <div className="w-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-xl p-3.5 text-xs font-semibold mb-6">
            {successMsg}
          </div>
        )}

        {loading || submitting ? (
          <div className="flex flex-col items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-sm font-semibold text-on-surface-variant dark:text-[#d1c4bb]">
              {loading ? 'Verificando credenciais...' : 'Processando requisição...'}
            </p>
          </div>
        ) : !user ? (
          /* State 1: Unauthenticated - Form Login/Register */
          <div className="w-full space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-primary dark:text-[#fcf9f4]">Área Restrita</h2>
              <p className="text-sm text-on-surface-variant dark:text-[#d1c4bb] mt-1.5">
                {mode === 'login' 
                  ? 'Acesse a dashboard secreta de ferramentas' 
                  : 'Cadastre-se para solicitar acesso à dashboard'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-secondary/15">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  mode === 'login' 
                    ? 'border-primary text-primary dark:text-[#fcf9f4]' 
                    : 'border-transparent text-secondary/60 hover:text-primary'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  mode === 'register' 
                    ? 'border-primary text-primary dark:text-[#fcf9f4]' 
                    : 'border-transparent text-secondary/60 hover:text-primary'
                }`}
              >
                Criar Conta
              </button>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-bold text-primary dark:text-[#fcf9f4] uppercase tracking-wider block">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full px-3.5 py-2.5 bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-primary dark:text-[#fcf9f4] outline-none"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-bold text-primary dark:text-[#fcf9f4] uppercase tracking-wider block">
                  Endereço de E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@e-mail.com"
                  className="w-full px-3.5 py-2.5 bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-primary dark:text-[#fcf9f4] outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pass" className="text-xs font-bold text-primary dark:text-[#fcf9f4] uppercase tracking-wider block">
                  Senha
                </label>
                <input
                  type="password"
                  id="pass"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full px-3.5 py-2.5 bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm text-primary dark:text-[#fcf9f4] outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container font-bold py-3.5 rounded-xl shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer text-sm mt-6"
              >
                {mode === 'login' ? 'Entrar' : 'Cadastrar'}
              </button>
            </form>
            
            <div className="pt-2 text-center">
              <Link href="/" className="text-xs font-semibold text-secondary hover:underline">
                &larr; Voltar para o Site Principal
              </Link>
            </div>
          </div>
        ) : (
          /* State 2: Authenticated but Pending Approval */
          <div className="w-full text-center space-y-6">
            <div className="flex flex-col items-center">
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-16 h-16 rounded-full border-2 border-primary mb-3 shadow-md object-cover"
              />
              <h3 className="font-bold text-primary dark:text-[#fcf9f4]">{user.displayName}</h3>
              <p className="text-xs text-on-surface-variant dark:text-[#d1c4bb]">{user.email}</p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-left">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm mb-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
                </svg>
                <span>Acesso Pendente</span>
              </div>
              <p className="text-xs text-on-surface-variant dark:text-[#d1c4bb] leading-relaxed">
                Seu cadastro foi registrado com sucesso! Por questões de segurança, sua conta precisa ser **aprovada manualmente** pelo administrador antes de acessar as ferramentas.
              </p>
            </div>

            <p className="text-xs text-on-surface-variant/70 dark:text-[#d1c4bb]/70 italic">
              Avise o administrador para que ele aprove o seu acesso no painel de controle do banco de dados (Realtime Database).
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={logout}
                className="w-full border border-secondary/30 hover:bg-secondary/10 text-primary dark:text-inverse-primary font-bold py-2.5 px-4 rounded-xl text-sm transition-all duration-200 cursor-pointer"
              >
                Sair da Conta
              </button>
              <Link href="/" className="text-xs font-semibold text-secondary hover:underline mt-2">
                Voltar para o Site Principal
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
