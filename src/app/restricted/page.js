'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RestrictedDashboard() {
  const { user, isApproved, logout, loading } = useAuth();
  const router = useRouter();

  // Route protection
  useEffect(() => {
    if (!loading && (!user || !isApproved)) {
      router.push('/login');
    }
  }, [user, isApproved, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#121210]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isApproved) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background dark:bg-[#121210]">
      {/* Header */}
      <header className="bg-white dark:bg-inverse-surface border-b border-secondary/20 dark:border-secondary/10 w-full h-20 z-40 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center w-full h-full">
          <div className="flex items-center gap-3">
            <span className="bg-primary text-on-primary text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
              Painel
            </span>
            <span className="text-lg font-bold text-primary dark:text-[#fcf9f4]">Área Restrita</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-9 h-9 rounded-full border border-secondary/20 shadow-sm"
              />
              <span className="hidden sm:inline text-sm font-semibold text-primary dark:text-[#fcf9f4]">
                {user.displayName}
              </span>
            </div>
            
            <button
              onClick={logout}
              className="px-3.5 py-2 text-xs font-bold border border-secondary/30 rounded-lg text-primary dark:text-inverse-primary hover:bg-secondary/10 transition-colors cursor-pointer"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 md:px-12 py-10">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary dark:text-[#fcf9f4]">
            Olá, {user.displayName?.split(' ')[0]}!
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant dark:text-[#d1c4bb]">
            Bem-vindo à sua área de ferramentas privadas. Escolha um dos módulos abaixo para acessar:
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Tool Card: Setlist Creator */}
          <Link
            href="/criador_setlist"
            className="group bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-primary/40 dark:hover:border-secondary/30 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary dark:text-inverse-primary mb-4 group-hover:scale-105 transition-transform duration-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 0v10.5m0-10.5H9m0 0v10.5m0-10.5L19.5 6M9 19.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm10.5-3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-primary dark:text-[#fcf9f4] group-hover:text-secondary dark:group-hover:text-inverse-primary transition-colors">
                Criador de Setlist
              </h3>
              <p className="mt-2 text-sm text-on-surface-variant dark:text-[#d1c4bb] leading-relaxed">
                Acesse o repertório completo do ministério de louvor, pesquise áudios, abra letras/cifras e monte roteiros de música prontos para enviar no WhatsApp.
              </p>
            </div>
            
            <div className="mt-6 flex items-center gap-1.5 text-sm font-bold text-secondary dark:text-inverse-primary group-hover:text-primary transition-colors">
              <span>Acessar Módulo</span>
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </Link>

          {/* Placeholder for future tools */}
          <div className="bg-surface-container/30 dark:bg-inverse-surface/20 border border-dashed border-secondary/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center text-on-surface-variant/60 min-h-[220px]">
            <svg className="w-8 h-8 mb-3 opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span className="text-sm font-semibold">Nova ferramenta em breve</span>
            <p className="text-xs px-4 mt-1 opacity-75">Novos utilitários privados estão em fase de planejamento.</p>
          </div>

        </div>

        <div className="mt-12 text-center">
          <Link href="/" className="text-xs font-semibold text-secondary hover:underline">
            &larr; Voltar para o Site Principal
          </Link>
        </div>
      </main>
    </div>
  );
}
