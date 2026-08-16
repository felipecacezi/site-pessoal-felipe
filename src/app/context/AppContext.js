'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../../i18n/translations';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [lang, setLang] = useState('pt');
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read from localStorage
    const savedLang = localStorage.getItem('preferred-language');
    if (savedLang) {
      setLang(savedLang);
    } else {
      const browserLang = typeof navigator !== 'undefined' && navigator.language.startsWith('en') ? 'en' : 'pt';
      setLang(browserLang);
    }

    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const toggleLanguage = (selectedLang) => {
    setLang(selectedLang);
    localStorage.setItem('preferred-language', selectedLang);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const t = (key) => {
    return translations[lang]?.[key] || key;
  };

  return (
    <AppContext.Provider value={{ lang, toggleLanguage, theme, toggleTheme, t, mounted }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
