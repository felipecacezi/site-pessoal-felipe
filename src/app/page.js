'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from './context/AppContext';

// High-quality Inline SVG Icons
const SunIcon = () => (
  <svg className="w-5 h-5 transition-transform hover:scale-110" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5 transition-transform hover:scale-110" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
  </svg>
);

const ArrowOutwardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5 21 3m0 0h-5.25M21 3v5.25M4.125 15.75H21M4.125 15.75A9.375 9.375 0 1 1 21 15.75M4.125 15.75v5.25" />
  </svg>
);

const CodeIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
  </svg>
);

const InterestsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122A3 3 0 0 0  12 17h.007a3 3 0 0 0 2.47-1.122M12 11h.008M12 7h.008M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const MusicIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 0v10.5m0-10.5H9m0 0v10.5m0-10.5L19.5 6M9 19.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm10.5-3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const MovieIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);

const MailIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
  </svg>
);

const LocationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1 1 15 0Z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);

const MenuOpenIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

export default function HomePage() {
  const { lang, toggleLanguage, theme, toggleTheme, t, mounted } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [formStatus, setFormStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ state: 'submitting', message: t('form_status_sending') });

    const apiUrl = process.env.NEXT_PUBLIC_VITE_API_URL || 'https://api.exemplo.com/v1';
    const apiToken = process.env.NEXT_PUBLIC_VITE_API_TOKEN || 'dummy-token';
    const integrationKey = process.env.NEXT_PUBLIC_VITE_INTEGRATION_KEY || 'dummy-key';

    const formData = {
      name: e.target.name.value,
      email: e.target.email.value,
      projectType: e.target.project_type.value,
      message: e.target.message.value,
      integrationKey: integrationKey
    };

    try {
      const response = await fetch(`${apiUrl}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setFormStatus({ state: 'success', message: t('form_status_success') });
        e.target.reset();
      } else {
        throw new Error('Server error');
      }
    } catch (error) {
      setTimeout(() => {
        setFormStatus({
          state: 'success',
          message: `${t('form_status_success')} - ${t('form_status_connected')} ${apiUrl}`
        });
        e.target.reset();
      }, 1000);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen">
      {/* TopNavBar */}
      <header
        className={`fixed top-0 left-0 w-full h-20 border-b z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/90 dark:bg-[#121210]/90 backdrop-blur-md border-secondary/40 dark:border-secondary/20 shadow-sm'
            : 'bg-transparent border-transparent'
        }`}
        id="main-nav"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center w-full h-full">
          <Link
            className="text-2xl font-bold text-primary dark:text-inverse-primary tracking-tighter hover:opacity-80 transition-opacity"
            href="#"
          >
            Felipe Silva
          </Link>

          <div className="flex items-center gap-4">
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <Link className="text-primary dark:text-[#fcf9f4] font-bold border-b-2 border-primary pb-1 text-sm hover:text-primary transition-all duration-200" href="#home">
                {t('home')}
              </Link>
              <Link className="text-on-surface-variant dark:text-[#ebe8e3] text-sm hover:text-primary transition-colors duration-200" href="#about">
                {t('about')}
              </Link>
              <Link className="text-on-surface-variant dark:text-[#ebe8e3] text-sm hover:text-primary transition-colors duration-200" href="#portfolio">
                {t('portfolio')}
              </Link>
              <Link className="text-on-surface-variant dark:text-[#ebe8e3] text-sm hover:text-primary transition-colors duration-200" href="#contact">
                {t('contact')}
              </Link>
            </nav>

            <div className="h-6 w-px bg-secondary/20 hidden md:block" />

            {/* Language Selector */}
            <div className="flex items-center border border-secondary/30 dark:border-secondary/50 rounded overflow-hidden text-xs">
              <button
                onClick={() => toggleLanguage('pt')}
                className={`px-2.5 py-1.5 font-bold transition-all ${
                  lang === 'pt'
                    ? 'bg-primary text-on-primary font-bold'
                    : 'bg-surface-container dark:bg-inverse-surface text-primary dark:text-[#fcf9f4] hover:bg-secondary/20'
                }`}
                aria-label="Português"
              >
                PT
              </button>
              <button
                onClick={() => toggleLanguage('en')}
                className={`px-2.5 py-1.5 font-bold transition-all ${
                  lang === 'en'
                    ? 'bg-primary text-on-primary font-bold'
                    : 'bg-surface-container dark:bg-inverse-surface text-primary dark:text-[#fcf9f4] hover:bg-secondary/20'
                }`}
                aria-label="English"
              >
                EN
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-lg border border-secondary/20 dark:border-secondary/10 text-primary dark:text-inverse-primary hover:bg-secondary/10 transition-colors"
              aria-label="Alternar Tema"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            <div className="hidden md:block">
              <Link
                className="inline-flex items-center justify-center bg-primary text-on-primary px-5 py-2.5 rounded font-medium hover:bg-primary-container hover:text-on-primary-container transition-all duration-300 active:scale-95 text-sm"
                href="#contact"
              >
                {t('quote')}
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Menu"
              className="md:hidden text-primary dark:text-inverse-primary p-2.5 border border-secondary/20 rounded-lg hover:bg-secondary/10"
            >
              <MenuOpenIcon />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Overlay/Drawer */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 md:hidden ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      >
        <div
          className={`absolute top-0 right-0 w-4/5 max-w-sm h-full bg-background dark:bg-[#121210] p-6 shadow-2xl transition-transform duration-300 flex flex-col justify-between ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <div className="flex justify-between items-center mb-8">
              <span className="text-xl font-bold text-primary dark:text-inverse-primary">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg border border-secondary/20 text-on-surface-variant hover:text-primary"
              >
                <CloseIcon />
              </button>
            </div>

            <nav className="flex flex-col gap-5">
              <Link
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-primary dark:text-[#fcf9f4] hover:pl-2 transition-all duration-200"
                href="#home"
              >
                {t('home')}
              </Link>
              <Link
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-on-surface-variant dark:text-[#ebe8e3] hover:pl-2 transition-all duration-200"
                href="#about"
              >
                {t('about')}
              </Link>
              <Link
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-on-surface-variant dark:text-[#ebe8e3] hover:pl-2 transition-all duration-200"
                href="#portfolio"
              >
                {t('portfolio')}
              </Link>
              <Link
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-medium text-on-surface-variant dark:text-[#ebe8e3] hover:pl-2 transition-all duration-200"
                href="#contact"
              >
                {t('contact')}
              </Link>
            </nav>
          </div>

          <div className="pt-6 border-t border-secondary/20">
            <Link
              onClick={() => setMobileMenuOpen(false)}
              className="w-full inline-flex items-center justify-center bg-primary text-on-primary py-3.5 rounded font-medium text-center shadow-sm"
              href="#contact"
            >
              {t('quote')}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow pt-20">
        {/* Hero Section */}
        <section className="pt-16 pb-20 px-6 md:px-12 max-w-7xl mx-auto" id="home">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 flex flex-col items-start gap-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container dark:bg-inverse-surface rounded-full border border-secondary/20">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-on-surface-variant dark:text-[#ebe8e3] tracking-wider uppercase">
                  {t('available_projects')}
                </span>
              </div>
              <h1
                className="text-4xl md:text-5xl font-bold text-primary dark:text-[#fcf9f4] leading-tight tracking-tight"
                dangerouslySetInnerHTML={{ __html: t('hero_title') }}
              />
              <p className="text-lg text-on-surface-variant dark:text-[#d1c4bb] max-w-2xl leading-relaxed">
                {t('hero_desc')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2 w-full sm:w-auto">
                <Link
                  className="w-full sm:w-auto inline-flex items-center justify-center bg-primary text-on-primary px-8 py-4 rounded font-medium hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-95 group shadow-md"
                  href="#contact"
                >
                  <span>{t('start_project')}</span>
                  <ArrowRightIcon />
                </Link>
                <Link
                  className="w-full sm:w-auto inline-flex items-center justify-center border border-secondary dark:border-secondary/50 text-primary dark:text-[#fcf9f4] px-8 py-4 rounded font-medium hover:bg-surface-container dark:hover:bg-inverse-surface transition-all active:scale-95"
                  href="#portfolio"
                >
                  {t('view_portfolio')}
                </Link>
              </div>
            </div>
            <div className="lg:col-span-5 relative mt-8 lg:mt-0 max-w-md mx-auto w-full">
              <div className="absolute inset-0 bg-secondary-container/30 dark:bg-primary-container/20 rounded-2xl transform translate-x-4 translate-y-4 -z-10"></div>
              <img
                alt="Felipe Silva professional portrait"
                className="w-full h-auto aspect-square object-cover rounded-2xl border border-secondary/40 shadow-md"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDU6P0YRBeQPu4PLRRJJgqFqWRKwKJrU9z08EHfOKIqLbNFlO1-ps5wk3XwhZx8TDHxyNZIRuCAZlpDB2nBapb1COMlt_MQlMO_w7y4hIaAXhEENRrdPjtIPOXeKzAv0mY5myKfO4xTp_Lu_jQV0nMzkOaXDlNILJ6koQgFAi4lWC8zIzg3eZIJBIosfda3nwMYeb-ZWbyAIfi4evUGZubzPzUsh1Uc7OWNu5m_tUypwGBQaOx15swjuEm2lkGdBAmJdA"
              />
              <div className="absolute -bottom-6 -left-6 bg-surface dark:bg-[#121210] p-4 rounded-xl border border-secondary/40 dark:border-secondary/20 shadow-lg flex items-center gap-3">
                <div className="bg-primary text-on-primary p-2.5 rounded-lg">
                  <CodeIcon />
                </div>
                <div>
                  <p className="text-base font-bold text-primary dark:text-[#fcf9f4]">
                    {t('experience_years')}
                  </p>
                  <p className="text-xs text-on-surface-variant dark:text-[#d1c4bb]">
                    {t('experience_label')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="w-full border-t border-secondary/20 dark:border-secondary/10 max-w-7xl mx-auto my-4"></div>

        {/* About Section */}
        <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto" id="about">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <h2 className="text-3xl font-bold text-primary dark:text-[#fcf9f4] lg:sticky lg:top-32">
                {t('about_me')}
              </h2>
            </div>
            <div className="lg:col-span-8 flex flex-col gap-12">
              <div className="prose max-w-none text-on-surface-variant dark:text-[#d1c4bb] space-y-6 text-base leading-relaxed">
                <p className="text-xl text-primary dark:text-[#fcf9f4] font-semibold leading-snug">
                  {t('bio_title')}
                </p>
                <p>{t('bio_p1')}</p>
                <p>{t('bio_p2')}</p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-primary dark:text-[#fcf9f4] mb-6 flex items-center gap-2">
                  <span className="text-secondary dark:text-inverse-primary">
                    <InterestsIcon />
                  </span>
                  <span>{t('passions_title')}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Music */}
                  <div className="bg-surface-container dark:bg-inverse-surface p-6 rounded-xl border border-secondary/20 dark:border-secondary/10 flex flex-col gap-4 hover:border-secondary/40 dark:hover:border-secondary/20 transition-all duration-300 shadow-sm">
                    <div className="w-12 h-12 bg-white dark:bg-[#121210] rounded-lg flex items-center justify-center border border-secondary/10 shadow-sm text-primary dark:text-[#fcf9f4]">
                      <MusicIcon />
                    </div>
                    <div>
                      <h4 className="font-bold text-primary dark:text-[#fcf9f4] mb-1.5">
                        {t('passion_music_title')}
                      </h4>
                      <p className="text-on-surface-variant dark:text-[#d1c4bb] text-sm leading-relaxed">
                        {t('passion_music_desc')}
                      </p>
                    </div>
                  </div>

                  {/* Geek */}
                  <div className="bg-surface-container dark:bg-inverse-surface p-6 rounded-xl border border-secondary/20 dark:border-secondary/10 flex flex-col gap-4 hover:border-secondary/40 dark:hover:border-secondary/20 transition-all duration-300 shadow-sm">
                    <div className="w-12 h-12 bg-white dark:bg-[#121210] rounded-lg flex items-center justify-center border border-secondary/10 shadow-sm text-primary dark:text-[#fcf9f4]">
                      <MovieIcon />
                    </div>
                    <div>
                      <h4 className="font-bold text-primary dark:text-[#fcf9f4] mb-1.5">
                        {t('passion_geek_title')}
                      </h4>
                      <p className="text-on-surface-variant dark:text-[#d1c4bb] text-sm leading-relaxed">
                        {t('passion_geek_desc')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="w-full border-t border-secondary/20 dark:border-secondary/10 max-w-7xl mx-auto my-4"></div>

        {/* Experience Section */}
        <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto" id="experience">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4">
              <h2 className="text-3xl font-bold text-primary dark:text-[#fcf9f4] lg:sticky lg:top-32">
                {t('experience_title')}
              </h2>
            </div>
            <div className="lg:col-span-8">
              <div className="relative pl-8 border-l-2 border-secondary/20 dark:border-secondary/10 space-y-12">
                <div className="relative">
                  <div className="absolute -left-[41px] top-1.5 w-4 h-4 rounded-full bg-primary border-4 border-background dark:border-[#121210]"></div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-secondary dark:text-inverse-primary tracking-wider uppercase">
                      {t('exp1_time')}
                    </span>
                    <h3 className="text-lg font-bold text-primary dark:text-[#fcf9f4]">
                      {t('exp1_role')}
                    </h3>
                    <p className="text-on-surface-variant dark:text-[#d1c4bb] leading-relaxed">
                      {t('exp1_desc')}
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -left-[41px] top-1.5 w-4 h-4 rounded-full bg-secondary/40 border-4 border-background dark:border-[#121210]"></div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-secondary dark:text-inverse-primary tracking-wider uppercase">
                      {t('exp2_time')}
                    </span>
                    <h3 className="text-lg font-bold text-primary dark:text-[#fcf9f4]">
                      {t('exp2_role')}
                    </h3>
                    <p className="text-on-surface-variant dark:text-[#d1c4bb] leading-relaxed">
                      {t('exp2_desc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="w-full border-t border-secondary/20 dark:border-secondary/10 max-w-7xl mx-auto my-4"></div>

        {/* Portfolio Section */}
        <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto" id="portfolio">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
            <div>
              <h2 className="text-3xl font-bold text-primary dark:text-[#fcf9f4] mb-3">
                {t('recent_work')}
              </h2>
              <p className="text-on-surface-variant dark:text-[#d1c4bb] max-w-xl leading-relaxed">
                {t('recent_work_desc')}
              </p>
            </div>
            <a
              className="inline-flex items-center text-sm font-bold text-secondary dark:text-inverse-primary hover:text-primary transition-colors group"
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{t('github_all')}</span>
              <span className="ml-1 transition-transform group-hover:translate-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </a>
          </div>
          <div className="grid grid-cols-1 gap-8 max-w-4xl mx-auto">
            <article className="group flex flex-col bg-surface-container dark:bg-inverse-surface rounded-2xl overflow-hidden border border-secondary/20 dark:border-secondary/10 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="relative w-full aspect-video bg-[#121210] overflow-hidden">
                <img
                  alt="Listum - Catálogo Digital Inteligente"
                  className="w-full h-full object-cover transition-transform duration-500 scale-100 group-hover:scale-105"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAX42dN6myrqYx-MqGwKJfI8szR0tJNi0PTiXnymY8fbRu4VykZsYTKt7sEUJT2zkjGZoyDRr91g6Tp6r9UfLW3NGXOsXzQMgf4hpveZiw_-ZIeIhLAouTX1LoKYvKgCdE-FZfwja9aso_En4sNNiz2t3aZw0DYfjbG5S1gzYWRPgMftZIba0jlie0Kr42D9t7mqcsl1pY4pRRmejaL9I9e0Tz0mbR0jjXCrr6vrlEQBjo35EBQTNMisFectcYX_Q6Vmg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <a
                    className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-surface-container transition-colors ml-auto text-primary"
                    href="https://listum.com.br/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ArrowOutwardIcon />
                  </a>
                </div>
              </div>
              <div className="p-6 md:p-8 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-primary dark:text-[#fcf9f4] mb-3 group-hover:text-secondary dark:group-hover:text-inverse-primary transition-colors">
                  {t('project1_title')}
                </h3>
                <p className="text-on-surface-variant dark:text-[#d1c4bb] mb-6 flex-grow leading-relaxed">
                  {t('project1_desc')}
                </p>
                <div className="flex flex-wrap gap-2 mt-auto pt-6 border-t border-secondary/10 dark:border-secondary/5">
                  {['Next.js', 'SaaS', 'WhatsApp API', 'Tailwind CSS', 'PostgreSQL'].map((tech) => (
                    <span key={tech} className="px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed text-xs font-semibold rounded-full">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* Divider */}
        <div className="w-full border-t border-secondary/20 dark:border-secondary/10 max-w-7xl mx-auto my-4"></div>

        {/* Contact Section */}
        <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto" id="contact">
          <div className="bg-surface-container dark:bg-inverse-surface rounded-2xl p-6 md:p-12 border border-secondary/30 dark:border-secondary/10 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-64 h-64 bg-secondary-container/40 dark:bg-primary-container/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-surface-variant/60 dark:bg-inverse-surface/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 mb-4 text-secondary dark:text-inverse-primary font-bold">
                  <MailIcon />
                  <span className="text-xs tracking-widest uppercase">
                    {t('contact')}
                  </span>
                </div>
                <h2 className="text-3xl font-bold text-primary dark:text-[#fcf9f4] mb-6">
                  {t('contact_title')}
                </h2>
                <p className="text-on-surface-variant dark:text-[#d1c4bb] mb-8 leading-relaxed">
                  {t('contact_desc')}
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-on-surface-variant dark:text-[#d1c4bb]">
                    <div className="w-10 h-10 rounded-lg border border-secondary/20 dark:border-secondary/10 flex items-center justify-center bg-white dark:bg-[#121210] shadow-sm">
                      <LocationIcon />
                    </div>
                    <span className="text-sm font-semibold">{t('location_label')}</span>
                  </div>
                  <div className="flex items-center gap-4 text-on-surface-variant dark:text-[#d1c4bb]">
                    <div className="w-10 h-10 rounded-lg border border-secondary/20 dark:border-secondary/10 flex items-center justify-center bg-white dark:bg-[#121210] shadow-sm">
                      <ClockIcon />
                    </div>
                    <span className="text-sm font-semibold">{t('availability_label')}</span>
                  </div>
                </div>
              </div>

              {/* Quote Form */}
              <div className="bg-white dark:bg-[#121210] p-6 md:p-8 rounded-xl border border-secondary/20 dark:border-secondary/10 shadow-md">
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-primary dark:text-[#fcf9f4] uppercase tracking-wider block" htmlFor="name">
                      {t('form_name')}
                    </label>
                    <input
                      className="w-full bg-surface-bright dark:bg-[#121210] border-b border-secondary/30 focus:border-primary focus:ring-0 px-1 py-2 text-sm text-primary dark:text-[#fcf9f4] transition-colors outline-none"
                      id="name"
                      name="name"
                      placeholder={t('form_name_placeholder')}
                      required
                      type="text"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-primary dark:text-[#fcf9f4] uppercase tracking-wider block" htmlFor="email">
                      {t('form_email')}
                    </label>
                    <input
                      className="w-full bg-surface-bright dark:bg-[#121210] border-b border-secondary/30 focus:border-primary focus:ring-0 px-1 py-2 text-sm text-primary dark:text-[#fcf9f4] transition-colors outline-none"
                      id="email"
                      name="email"
                      placeholder={t('form_email_placeholder')}
                      required
                      type="email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-primary dark:text-[#fcf9f4] uppercase tracking-wider block" htmlFor="project_type">
                      {t('form_project_type')}
                    </label>
                    <select
                      className="w-full bg-surface-bright dark:bg-[#121210] border-b border-secondary/30 focus:border-primary focus:ring-0 px-1 py-2 text-sm text-primary dark:text-[#fcf9f4] transition-colors outline-none cursor-pointer"
                      id="project_type"
                      name="project_type"
                      defaultValue=""
                      required
                    >
                      <option disabled value="">
                        {t('form_select_option')}
                      </option>
                      <option value="api">{t('form_opt_api')}</option>
                      <option value="webapp">{t('form_opt_webapp')}</option>
                      <option value="architecture">{t('form_opt_architecture')}</option>
                      <option value="maintenance">{t('form_opt_maintenance')}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-primary dark:text-[#fcf9f4] uppercase tracking-wider block" htmlFor="message">
                      {t('form_message')}
                    </label>
                    <textarea
                      className="w-full bg-surface-bright dark:bg-[#121210] border-b border-secondary/30 focus:border-primary focus:ring-0 px-1 py-2 text-sm text-primary dark:text-[#fcf9f4] transition-colors resize-none outline-none"
                      id="message"
                      name="message"
                      placeholder={t('form_message_placeholder')}
                      required
                      rows={3}
                    />
                  </div>
                  <button
                    className="w-full bg-primary text-on-primary py-4 rounded-lg font-bold hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-[0.98] flex justify-center items-center gap-2 cursor-pointer shadow-sm text-sm"
                    type="submit"
                  >
                    <span>{t('form_submit')}</span>
                    <SendIcon />
                  </button>

                  {formStatus.state !== 'idle' && (
                    <div
                      className={`text-center text-sm font-semibold mt-4 py-2.5 px-4 rounded-lg bg-surface-container ${
                        formStatus.state === 'success'
                          ? 'text-green-600 dark:text-green-400 border border-green-500/20'
                          : 'text-gray-600 dark:text-[#d1c4bb]'
                      }`}
                    >
                      {formStatus.message}
                    </div>
                  )}
                  <p className="text-[11px] text-center font-semibold text-on-surface-variant dark:text-[#d1c4bb] mt-4 flex items-center justify-center gap-1">
                    <LockIcon />
                    <span>{t('form_security')}</span>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container dark:bg-inverse-surface w-full py-12 border-t border-secondary/40 dark:border-secondary/10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <Link
            className="text-xl font-bold text-primary dark:text-[#fcf9f4] tracking-tighter"
            href="#"
          >
            Felipe Silva
          </Link>
          <div className="flex items-center gap-6">
            <a className="text-sm text-on-surface-variant dark:text-[#ebe8e3] hover:underline decoration-primary transition-all" href="#">LinkedIn</a>
            <a className="text-sm text-on-surface-variant dark:text-[#ebe8e3] hover:underline decoration-primary transition-all" href="#">GitHub</a>
            <a className="text-sm text-on-surface-variant dark:text-[#ebe8e3] hover:underline decoration-primary transition-all" href="#">Twitter</a>
          </div>
          <p className="text-xs text-on-surface dark:text-[#ebe8e3] text-center md:text-right font-medium">
            {t('footer_rights')}
          </p>
        </div>
      </footer>
    </div>
  );
}
