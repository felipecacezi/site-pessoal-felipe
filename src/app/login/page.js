'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { user, isApproved, loginWithGoogle, logout, loading } = useAuth();
  const router = useRouter();

  // Redirect to restricted area if already authenticated and approved
  useEffect(() => {
    if (user && isApproved) {
      router.push('/restricted');
    }
  }, [user, isApproved, router]);

  const handleLogin = async () => {
    const now = Date.now();
    const attemptsStr = localStorage.getItem('login_attempts') || '[]';
    let attempts = JSON.parse(attemptsStr);
    
    // Filter attempts within the last 60 seconds
    attempts = attempts.filter(timestamp => now - timestamp < 60000);
    
    if (attempts.length >= 5) {
      const oldestAttempt = attempts[0];
      const cooldownSecs = Math.ceil((60000 - (now - oldestAttempt)) / 1000);
      alert(`Muitas tentativas de login! Por favor, aguarde ${cooldownSecs} segundos antes de tentar novamente.`);
      return;
    }
    
    attempts.push(now);
    localStorage.setItem('login_attempts', JSON.stringify(attempts));

    try {
      await loginWithGoogle();
    } catch (err) {
      alert('Erro ao realizar o login. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#121210] px-6 py-12">
      <div className="max-w-md w-full bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-2xl p-8 shadow-xl flex flex-col items-center">
        
        {/* Brand/Logo */}
        <Link href="/" className="text-2xl font-bold text-primary dark:text-inverse-primary tracking-tighter mb-8">
          Felipe Silva
        </Link>

        {loading ? (
          <div className="flex flex-col items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-sm font-semibold text-on-surface-variant dark:text-[#d1c4bb]">Verificando credenciais...</p>
          </div>
        ) : !user ? (
          /* State 1: Unauthenticated */
          <div className="w-full text-center space-y-6">
            <div>
              <h2 className="text-xl font-bold text-primary dark:text-[#fcf9f4]">Área Restrita</h2>
              <p className="text-sm text-on-surface-variant dark:text-[#d1c4bb] mt-2">
                Faça login com sua conta do Google para solicitar acesso à dashboard secreta de ferramentas.
              </p>
            </div>

            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container font-semibold py-3.5 px-4 rounded-xl shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer"
            >
              {/* Google G Logo SVG */}
              <svg className="w-5 h-5 bg-white p-0.5 rounded-full" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Entrar com o Google</span>
            </button>
            
            <div className="pt-4">
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
                className="w-16 h-16 rounded-full border-2 border-primary mb-3 shadow-md"
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
              Avise o administrador para que ele aprove seu email no painel de controle do banco de dados.
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
