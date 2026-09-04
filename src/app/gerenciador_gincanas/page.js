'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { ref, set, onValue } from 'firebase/database';
import { db } from '../services/firebase';

// Predefined vibrant colors for teams
const TEAM_COLORS = [
  { name: 'Azul', hex: '#2563eb' },
  { name: 'Vermelho', hex: '#dc2626' },
  { name: 'Amarelo', hex: '#eab308' },
  { name: 'Verde', hex: '#16a34a' },
  { name: 'Roxo', hex: '#9333ea' },
  { name: 'Laranja', hex: '#ea580c' },
  { name: 'Rosa', hex: '#db2777' },
  { name: 'Ciano', hex: '#0891b2' },
  { name: 'Esmeralda', hex: '#059669' },
  { name: 'Indigo', hex: '#4f46e5' }
];

// Predefined mascots/emojis for teams
const TEAM_BADGES = ['🦁', '🦈', '🦅', '⚡', '🔥', '🐺', '🚀', '👑', '🎯', '🏆', '💎', '🐉', '🐯', '🐻', '⚔️', '🛡️'];

// Quick point values
const QUICK_POINTS = [10, 25, 50, 100, 200, 500];

// Common gincana activities for 1-tap reason filling
const COMMON_REASONS = [
  'Prova Cumprida',
  'Grito de Guerra',
  'Doação de Alimentos',
  'Caça ao Tesouro',
  'Torta na Cara',
  'Melhor Torcida',
  'Pontualidade',
  'Desafio Relâmpago',
  'Penalidade / Falta'
];

// Common Bible verses presets for teams
const VERSE_PRESETS = [
  { ref: 'Filipenses 4:13', text: 'Tudo posso naquele que me fortalece.' },
  { ref: 'Josué 1:9', text: 'Sê forte e corajoso; não temas, pois o Senhor teu Deus é contigo por onde quer que andares.' },
  { ref: '1 Coríntios 9:24', text: 'Não sabeis vós que os que correm no estádio, todos correm, mas um só leva o prêmio? Correi de tal maneira que o alcanceis.' },
  { ref: 'Isaías 40:31', text: 'Os que esperam no Senhor renovarão as suas forças; subirão com asas como águias.' },
  { ref: '2 Timóteo 4:7', text: 'Combati o bom combate, acabei a carreira, guardei a fé.' },
  { ref: 'Salmos 27:1', text: 'O Senhor é a minha luz e a minha salvação; de quem terei medo?' },
  { ref: 'Romanos 8:37', text: 'Em todas estas coisas somos mais do que vencedores, por aquele que nos amou.' }
];

// Helper: compress uploaded image into a lightweight data URL (max 256x256, ~20KB)
const compressImageFile = (file, maxWidth = 256, maxHeight = 256) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG at 0.82 quality
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressedDataUrl);
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Audio synthesizer for sound feedback
const playScoreSound = (isPositive = true) => {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isPositive) {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else {
      osc.frequency.setValueAtTime(360, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch {
    // Audio context may be restricted
  }
};

export default function GerenciadorGincanas() {
  const { theme, toggleTheme, mounted } = useApp();
  const { user, isApproved } = useAuth();
  const fileInputRef = useRef(null);

  // Primary data state
  const [gincanas, setGincanas] = useState({});
  const [activeGincanaId, setActiveGincanaId] = useState(null);
  const [activeTab, setActiveTab] = useState('placar'); // 'placar' | 'pontuar' | 'equipes' | 'historico' | 'gincanas'
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modal states: Gincana
  const [isGincanaModalOpen, setIsGincanaModalOpen] = useState(false);
  const [editingGincanaId, setEditingGincanaId] = useState(null);
  const [gincanaName, setGincanaName] = useState('');
  const [gincanaDesc, setGincanaDesc] = useState('');

  // Modal states: Team
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState(TEAM_COLORS[0].hex);
  const [teamBadge, setTeamBadge] = useState(TEAM_BADGES[0]);
  const [teamLogo, setTeamLogo] = useState(null);
  const [teamLeader, setTeamLeader] = useState('');
  const [teamVerseText, setTeamVerseText] = useState('');
  const [teamVerseRef, setTeamVerseRef] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [currentMemberInput, setCurrentMemberInput] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Team Details Modal (view full team profile with members and verse)
  const [viewingTeamDetails, setViewingTeamDetails] = useState(null);

  // Quick Scoring form states
  const [selectedTeamIdForScore, setSelectedTeamIdForScore] = useState('');
  const [scoreOperation, setScoreOperation] = useState('add'); // 'add' | 'subtract'
  const [scoreAmount, setScoreAmount] = useState(50);
  const [scoreReason, setScoreReason] = useState('');
  const [scoreSuccessToast, setScoreSuccessToast] = useState('');

  // Confirmation Modals
  const [confirmDeleteGincanaId, setConfirmDeleteGincanaId] = useState(null);
  const [confirmDeleteTeamId, setConfirmDeleteTeamId] = useState(null);
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState(null);
  const [confirmResetPoints, setConfirmResetPoints] = useState(false);

  // History filter
  const [historyTeamFilter, setHistoryTeamFilter] = useState('all');

  // WhatsApp share notification
  const [shareToast, setShareToast] = useState('');

  // Fullscreen scoreboard mode (for projectors/TVs)
  const [isProjectorMode, setIsProjectorMode] = useState(false);

  // Load data from LocalStorage initially
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('gincanas_local_data');
      const savedActiveId = localStorage.getItem('gincanas_active_id');
      const savedSound = localStorage.getItem('gincanas_sound_enabled');

      if (savedSound !== null) {
        setSoundEnabled(savedSound === 'true');
      }

      if (savedData) {
        const parsed = JSON.parse(savedData);
        setGincanas(parsed);
        if (savedActiveId && parsed[savedActiveId]) {
          setActiveGincanaId(savedActiveId);
        } else {
          const keys = Object.keys(parsed);
          if (keys.length > 0) {
            setActiveGincanaId(keys[0]);
          }
        }
      }
    } catch (e) {
      console.error('Erro ao ler dados do localStorage:', e);
    }
  }, []);

  // Sync with Firebase Realtime Database if authenticated
  useEffect(() => {
    if (!user || !isApproved) return;

    const gincanasRef = ref(db, 'gincanas');
    const unsubscribe = onValue(
      gincanasRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setGincanas(data);
          setActiveGincanaId((prev) => (prev && data[prev] ? prev : Object.keys(data)[0] || null));
          try {
            localStorage.setItem('gincanas_local_data', JSON.stringify(data));
          } catch {}
        }
      },
      (error) => {
        console.warn('Firebase Realtime Database erro/offline:', error);
      }
    );

    return () => unsubscribe();
  }, [user, isApproved]);

  // Helper to persist gincanas state (both local and Firebase)
  const persistGincanas = (updatedGincanas) => {
    setGincanas(updatedGincanas);
    try {
      localStorage.setItem('gincanas_local_data', JSON.stringify(updatedGincanas));
      if (activeGincanaId) {
        localStorage.setItem('gincanas_active_id', activeGincanaId);
      }
    } catch (e) {
      console.error('Erro ao salvar localmente:', e);
    }

    if (user && isApproved) {
      try {
        set(ref(db, 'gincanas'), updatedGincanas).catch((err) => {
          console.warn('Erro ao sincronizar com Firebase:', err);
        });
      } catch (err) {
        console.warn('Erro Firebase:', err);
      }
    }
  };

  // Switch active gincana
  const handleSelectGincana = (id) => {
    setActiveGincanaId(id);
    try {
      localStorage.setItem('gincanas_active_id', id);
    } catch {}
    setSelectedTeamIdForScore('');
  };

  // Current active gincana object
  const activeGincana = useMemo(() => {
    if (!activeGincanaId || !gincanas[activeGincanaId]) return null;
    return gincanas[activeGincanaId];
  }, [gincanas, activeGincanaId]);

  // Calculate teams leaderboard with score sums and rankings
  const rankedTeams = useMemo(() => {
    if (!activeGincana || !activeGincana.teams) return [];

    const teamsMap = activeGincana.teams;
    const logs = activeGincana.scoreLog ? Object.values(activeGincana.scoreLog) : [];

    const list = Object.keys(teamsMap).map((teamId) => {
      const team = teamsMap[teamId];
      const teamLogs = logs.filter((log) => log.teamId === teamId);
      const totalPoints = teamLogs.reduce((acc, log) => acc + (Number(log.points) || 0), 0);
      const totalEvents = teamLogs.length;

      return {
        ...team,
        members: Array.isArray(team.members) ? team.members : [],
        totalPoints,
        totalEvents
      };
    });

    list.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return a.name.localeCompare(b.name);
    });

    const leaderPoints = list.length > 0 ? list[0].totalPoints : 0;
    return list.map((item, index) => ({
      ...item,
      position: index + 1,
      diffToLeader: leaderPoints - item.totalPoints
    }));
  }, [activeGincana]);

  // Gincana CRUD Handlers
  const handleSaveGincana = (e) => {
    e.preventDefault();
    if (!gincanaName.trim()) return;

    const gincanaId = editingGincanaId || `gincana_${Date.now()}`;
    const now = new Date().toISOString();

    const existing = gincanas[gincanaId] || {};
    const updated = {
      ...gincanas,
      [gincanaId]: {
        ...existing,
        id: gincanaId,
        name: gincanaName.trim(),
        description: gincanaDesc.trim(),
        status: existing.status || 'em_andamento',
        createdAt: existing.createdAt || now,
        updatedAt: now,
        teams: existing.teams || {},
        scoreLog: existing.scoreLog || {}
      }
    };

    persistGincanas(updated);
    setActiveGincanaId(gincanaId);
    setIsGincanaModalOpen(false);
    setEditingGincanaId(null);
    setGincanaName('');
    setGincanaDesc('');
  };

  const handleOpenEditGincana = () => {
    if (!activeGincana) return;
    setEditingGincanaId(activeGincana.id);
    setGincanaName(activeGincana.name);
    setGincanaDesc(activeGincana.description || '');
    setIsGincanaModalOpen(true);
  };

  const handleDeleteGincana = (id) => {
    const updated = { ...gincanas };
    delete updated[id];
    persistGincanas(updated);

    const remainingKeys = Object.keys(updated);
    setActiveGincanaId(remainingKeys.length > 0 ? remainingKeys[0] : null);
    setConfirmDeleteGincanaId(null);
  };

  // Create demo gincana with sample teams, verses, logos and members
  const handleCreateDemoGincana = () => {
    const id = `gincana_demo_${Date.now()}`;
    const now = new Date();

    const teams = {
      team_1: {
        id: 'team_1',
        name: 'Tubarões Azuis',
        color: '#2563eb',
        badge: '🦈',
        logo: null,
        verseText: 'Tudo posso naquele que me fortalece.',
        verseRef: 'Filipenses 4:13',
        leader: 'Lucas',
        members: ['Lucas (Capitão)', 'Mariana', 'Carlos', 'Ana Paula', 'Rodrigo', 'Juliana'],
        createdAt: now.toISOString()
      },
      team_2: {
        id: 'team_2',
        name: 'Leões Vermelhos',
        color: '#dc2626',
        badge: '🦁',
        logo: null,
        verseText: 'Sê forte e corajoso; não temas, pois o Senhor teu Deus é contigo.',
        verseRef: 'Josué 1:9',
        leader: 'Mariana',
        members: ['Mariana (Capitã)', 'Pedro', 'Beatriz', 'Felipe', 'Camila'],
        createdAt: now.toISOString()
      },
      team_3: {
        id: 'team_3',
        name: 'Trovão Amarelo',
        color: '#eab308',
        badge: '⚡',
        logo: null,
        verseText: 'Os que esperam no Senhor renovarão as suas forças; subirão com asas como águias.',
        verseRef: 'Isaías 40:31',
        leader: 'Gabriel',
        members: ['Gabriel (Capitão)', 'Thiago', 'Aline', 'Matheus', 'Bruna'],
        createdAt: now.toISOString()
      },
      team_4: {
        id: 'team_4',
        name: 'Floresta Verde',
        color: '#16a34a',
        badge: '🐺',
        logo: null,
        verseText: 'Correi de tal maneira que alcanceis o prêmio.',
        verseRef: '1 Coríntios 9:24',
        leader: 'Beatriz',
        members: ['Beatriz (Capitã)', 'Rafael', 'Larissa', 'Enzo', 'Vitória'],
        createdAt: now.toISOString()
      }
    };

    const scoreLog = {
      log_1: { id: 'log_1', teamId: 'team_1', points: 100, reason: 'Grito de Guerra', timestamp: new Date(now.getTime() - 3600000).toISOString() },
      log_2: { id: 'log_2', teamId: 'team_2', points: 150, reason: 'Doação de Alimentos', timestamp: new Date(now.getTime() - 2800000).toISOString() },
      log_3: { id: 'log_3', teamId: 'team_3', points: 80, reason: 'Prova Cumprida', timestamp: new Date(now.getTime() - 2000000).toISOString() },
      log_4: { id: 'log_4', teamId: 'team_1', points: 50, reason: 'Caça ao Tesouro', timestamp: new Date(now.getTime() - 1200000).toISOString() },
      log_5: { id: 'log_5', teamId: 'team_4', points: 120, reason: 'Melhor Torcida', timestamp: new Date(now.getTime() - 600000).toISOString() },
      log_6: { id: 'log_6', teamId: 'team_2', points: -20, reason: 'Penalidade de Atraso', timestamp: new Date(now.getTime() - 300000).toISOString() }
    };

    const newGincana = {
      id,
      name: 'Gincana da Juventude 2026',
      description: 'Gincana esportiva e bíblica com provas de agilidade, conhecimentos e integração.',
      status: 'em_andamento',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      teams,
      scoreLog
    };

    const updated = { ...gincanas, [id]: newGincana };
    persistGincanas(updated);
    setActiveGincanaId(id);
    setActiveTab('placar');
  };

  // Logo file upload handler
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const compressed = await compressImageFile(file, 256, 256);
      setTeamLogo(compressed);
    } catch (err) {
      console.error('Erro ao processar imagem:', err);
      alert('Não foi possível carregar a imagem. Tente uma imagem em formato JPG ou PNG.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Member tags handlers
  const handleAddMember = () => {
    const trimmed = currentMemberInput.trim();
    if (!trimmed) return;

    if (!teamMembers.includes(trimmed)) {
      setTeamMembers([...teamMembers, trimmed]);
    }
    setCurrentMemberInput('');
  };

  const handleRemoveMember = (idxToRemove) => {
    setTeamMembers(teamMembers.filter((_, idx) => idx !== idxToRemove));
  };

  // Team CRUD Handlers
  const handleSaveTeam = (e) => {
    e.preventDefault();
    if (!activeGincanaId || !teamName.trim()) return;

    const teamId = editingTeamId || `team_${Date.now()}`;
    const now = new Date().toISOString();

    const existingTeam = activeGincana.teams?.[teamId] || {};
    const updatedTeam = {
      id: teamId,
      name: teamName.trim(),
      color: teamColor,
      badge: teamBadge,
      logo: teamLogo || null,
      leader: teamLeader.trim(),
      verseText: teamVerseText.trim(),
      verseRef: teamVerseRef.trim(),
      members: teamMembers,
      createdAt: existingTeam.createdAt || now,
      updatedAt: now
    };

    const updatedGincanas = {
      ...gincanas,
      [activeGincanaId]: {
        ...activeGincana,
        updatedAt: now,
        teams: {
          ...(activeGincana.teams || {}),
          [teamId]: updatedTeam
        }
      }
    };

    persistGincanas(updatedGincanas);
    setIsTeamModalOpen(false);
    setEditingTeamId(null);
    setTeamName('');
    setTeamLeader('');
    setTeamLogo(null);
    setTeamVerseText('');
    setTeamVerseRef('');
    setTeamMembers([]);
    setCurrentMemberInput('');
  };

  const handleOpenCreateTeam = () => {
    setEditingTeamId(null);
    setTeamName('');
    setTeamLeader('');
    setTeamLogo(null);
    setTeamVerseText('');
    setTeamVerseRef('');
    setTeamMembers([]);
    setCurrentMemberInput('');
    setTeamColor(TEAM_COLORS[rankedTeams.length % TEAM_COLORS.length].hex);
    setTeamBadge(TEAM_BADGES[rankedTeams.length % TEAM_BADGES.length]);
    setIsTeamModalOpen(true);
  };

  const handleOpenEditTeam = (team) => {
    setEditingTeamId(team.id);
    setTeamName(team.name);
    setTeamColor(team.color || TEAM_COLORS[0].hex);
    setTeamBadge(team.badge || TEAM_BADGES[0]);
    setTeamLogo(team.logo || null);
    setTeamLeader(team.leader || '');
    setTeamVerseText(team.verseText || '');
    setTeamVerseRef(team.verseRef || '');
    setTeamMembers(Array.isArray(team.members) ? [...team.members] : []);
    setCurrentMemberInput('');
    setIsTeamModalOpen(true);
  };

  const handleDeleteTeam = (teamId) => {
    if (!activeGincanaId) return;

    const remainingTeams = { ...(activeGincana.teams || {}) };
    delete remainingTeams[teamId];

    const updatedScoreLogs = { ...(activeGincana.scoreLog || {}) };
    Object.keys(updatedScoreLogs).forEach((logId) => {
      if (updatedScoreLogs[logId].teamId === teamId) {
        delete updatedScoreLogs[logId];
      }
    });

    const updatedGincanas = {
      ...gincanas,
      [activeGincanaId]: {
        ...activeGincana,
        updatedAt: new Date().toISOString(),
        teams: remainingTeams,
        scoreLog: updatedScoreLogs
      }
    };

    persistGincanas(updatedGincanas);
    setConfirmDeleteTeamId(null);
    if (selectedTeamIdForScore === teamId) {
      setSelectedTeamIdForScore('');
    }
  };

  // Score Addition & Subtraction Handler
  const handleScoreSubmit = (e) => {
    if (e) e.preventDefault();
    if (!activeGincanaId || !selectedTeamIdForScore) return;

    const parsedPoints = Number(scoreAmount);
    if (isNaN(parsedPoints) || parsedPoints <= 0) return;

    const delta = scoreOperation === 'add' ? parsedPoints : -parsedPoints;
    const logId = `log_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const targetTeam = activeGincana.teams?.[selectedTeamIdForScore];
    const teamLabel = targetTeam ? `${targetTeam.badge} ${targetTeam.name}` : 'Equipe';

    const newLog = {
      id: logId,
      teamId: selectedTeamIdForScore,
      points: delta,
      reason: scoreReason.trim() || (delta > 0 ? 'Pontos de Prova' : 'Penalidade'),
      timestamp
    };

    const updatedGincanas = {
      ...gincanas,
      [activeGincanaId]: {
        ...activeGincana,
        updatedAt: timestamp,
        scoreLog: {
          ...(activeGincana.scoreLog || {}),
          [logId]: newLog
        }
      }
    };

    persistGincanas(updatedGincanas);

    if (soundEnabled) {
      playScoreSound(delta > 0);
    }

    setScoreSuccessToast(
      `${delta > 0 ? '+' : ''}${delta} pts para ${teamLabel}!`
    );
    setTimeout(() => setScoreSuccessToast(''), 3000);

    setScoreReason('');
  };

  // Quick 1-tap score adjustment from Team Card
  const handleQuickAdjust = (teamId, delta, label = 'Ajuste rápido') => {
    if (!activeGincanaId || !teamId) return;

    const logId = `log_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const targetTeam = activeGincana.teams?.[teamId];
    const teamLabel = targetTeam ? `${targetTeam.badge} ${targetTeam.name}` : 'Equipe';

    const newLog = {
      id: logId,
      teamId,
      points: delta,
      reason: label,
      timestamp
    };

    const updatedGincanas = {
      ...gincanas,
      [activeGincanaId]: {
        ...activeGincana,
        updatedAt: timestamp,
        scoreLog: {
          ...(activeGincana.scoreLog || {}),
          [logId]: newLog
        }
      }
    };

    persistGincanas(updatedGincanas);

    if (soundEnabled) {
      playScoreSound(delta > 0);
    }

    setScoreSuccessToast(`${delta > 0 ? '+' : ''}${delta} pts para ${teamLabel}!`);
    setTimeout(() => setScoreSuccessToast(''), 2500);
  };

  // History Log Removal (Undo)
  const handleDeleteLog = (logId) => {
    if (!activeGincanaId) return;

    const updatedLogs = { ...(activeGincana.scoreLog || {}) };
    delete updatedLogs[logId];

    const updatedGincanas = {
      ...gincanas,
      [activeGincanaId]: {
        ...activeGincana,
        updatedAt: new Date().toISOString(),
        scoreLog: updatedLogs
      }
    };

    persistGincanas(updatedGincanas);
    setConfirmDeleteLogId(null);
  };

  // Reset all points for current gincana
  const handleResetAllScores = () => {
    if (!activeGincanaId) return;

    const updatedGincanas = {
      ...gincanas,
      [activeGincanaId]: {
        ...activeGincana,
        updatedAt: new Date().toISOString(),
        scoreLog: {}
      }
    };

    persistGincanas(updatedGincanas);
    setConfirmResetPoints(false);
  };

  // Toggle Gincana Status (Em Andamento / Concluída)
  const handleToggleStatus = () => {
    if (!activeGincanaId) return;
    const currentStatus = activeGincana.status || 'em_andamento';
    const nextStatus = currentStatus === 'em_andamento' ? 'concluida' : 'em_andamento';

    const updatedGincanas = {
      ...gincanas,
      [activeGincanaId]: {
        ...activeGincana,
        status: nextStatus,
        updatedAt: new Date().toISOString()
      }
    };

    persistGincanas(updatedGincanas);
  };

  // WhatsApp formatted share text
  const handleShareWhatsApp = () => {
    if (!activeGincana || rankedTeams.length === 0) return;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR');
    const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let message = `🏆 *PLACAR DA GINCANA: ${activeGincana.name.toUpperCase()}* 🏆\n`;
    message += `📅 Atualizado em ${formattedDate} às ${formattedTime}\n\n`;

    rankedTeams.forEach((team) => {
      let medal = '•';
      if (team.position === 1) medal = '🥇 1º';
      else if (team.position === 2) medal = '🥈 2º';
      else if (team.position === 3) medal = '🥉 3º';
      else medal = `🏅 ${team.position}º`;

      const verseSnippet = team.verseRef ? ` (${team.verseRef})` : '';
      message += `${medal} *${team.badge} ${team.name}*${verseSnippet}: ${team.totalPoints} pts\n`;
    });

    const totalPts = rankedTeams.reduce((sum, t) => sum + t.totalPoints, 0);
    message += `\n🎯 Total de pontos distribuídos: ${totalPts} pts`;
    message += `\n⚡ Gerenciado via *Gerenciador de Gincanas*`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(message);
      setShareToast('Placar copiado com sucesso! Cole no WhatsApp.');
      setTimeout(() => setShareToast(''), 3500);
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  // History list sorted newest first
  const historyLogs = useMemo(() => {
    if (!activeGincana || !activeGincana.scoreLog) return [];
    const logs = Object.values(activeGincana.scoreLog);

    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (historyTeamFilter === 'all') return logs;
    return logs.filter((log) => log.teamId === historyTeamFilter);
  }, [activeGincana, historyTeamFilter]);

  // Format relative timestamp
  const formatTimeAgo = (isoString) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSecs = Math.floor((now - date) / 1000);

      if (diffSecs < 60) return 'Agora mesmo';
      if (diffSecs < 3600) return `Há ${Math.floor(diffSecs / 60)} min`;
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Compute effective selected team for scoring
  const effectiveScoreTeamId = selectedTeamIdForScore || (rankedTeams.length > 0 ? rankedTeams[0].id : '');

  // Helper component to render team logo image or fallback badge
  const renderTeamAvatar = (team, sizeClass = 'w-12 h-12 text-2xl') => {
    if (team?.logo) {
      return (
        <div
          className={`${sizeClass} rounded-2xl overflow-hidden shrink-0 border-2 shadow-sm flex items-center justify-center bg-white dark:bg-[#121210]`}
          style={{ borderColor: team.color || '#2563eb' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
        </div>
      );
    }
    return (
      <span
        className={`${sizeClass} rounded-2xl flex items-center justify-center shrink-0 border shadow-xs`}
        style={{
          backgroundColor: `${team?.color || '#2563eb'}18`,
          borderColor: `${team?.color || '#2563eb'}40`
        }}
      >
        {team?.badge || '🚩'}
      </span>
    );
  };

  if (!mounted) return null;

  return (
    <div className={`min-h-screen flex flex-col bg-background dark:bg-[#121210] text-on-background dark:text-[#fcf9f4] selection:bg-amber-500/20 ${isProjectorMode ? 'p-6 md:p-12' : ''}`}>
      {/* Toast Notification */}
      {scoreSuccessToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-2 animate-bounce text-sm font-bold">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>{scoreSuccessToast}</span>
        </div>
      )}

      {shareToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary text-on-primary px-5 py-3 rounded-full shadow-xl flex items-center gap-2 text-sm font-bold">
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
          </svg>
          <span>{shareToast}</span>
        </div>
      )}

      {/* Main App Bar (Hidden in Fullscreen Projector Mode) */}
      {!isProjectorMode && (
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#121210]/90 backdrop-blur-md border-b border-secondary/20 dark:border-secondary/10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Left Brand and Back */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/restricted"
                className="p-2 -ml-2 rounded-xl text-on-surface-variant hover:text-primary hover:bg-secondary/10 transition-colors"
                title="Voltar ao Painel"
                aria-label="Voltar ao Painel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </Link>

              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <h1 className="text-base sm:text-lg font-bold leading-tight text-primary dark:text-[#fcf9f4] flex items-center gap-1.5">
                    <span>Gincana Manager</span>
                  </h1>
                  <p className="text-[10px] sm:text-xs text-on-surface-variant dark:text-[#d1c4bb]">
                    {activeGincana ? activeGincana.name : 'Nenhuma selecionada'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Quick Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Sound Toggle */}
              <button
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  try {
                    localStorage.setItem('gincanas_sound_enabled', String(next));
                  } catch {}
                }}
                className={`p-2 rounded-xl border transition-colors ${
                  soundEnabled
                    ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                    : 'border-secondary/20 text-on-surface-variant/50 hover:bg-secondary/10'
                }`}
                title={soundEnabled ? 'Sons ativados' : 'Sons desativados'}
                aria-label="Alternar som"
              >
                {soundEnabled ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.757 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-3.75L11.47 5.78a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53L6.75 13.5H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.757 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                )}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl border border-secondary/20 text-on-surface-variant hover:bg-secondary/10 transition-colors"
                title="Alternar tema"
                aria-label="Alternar tema"
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                  </svg>
                )}
              </button>

              {/* Gincanas Switcher Button */}
              <button
                onClick={() => setActiveTab('gincanas')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary/10 dark:bg-primary/20 text-primary dark:text-[#fcf9f4] border border-primary/30 rounded-xl hover:bg-primary/20 transition-all cursor-pointer"
              >
                <span>Gincanas</span>
                <span className="w-4 h-4 rounded-full bg-primary text-on-primary text-[10px] flex items-center justify-center font-bold">
                  {Object.keys(gincanas).length}
                </span>
              </button>
            </div>
          </div>

          {/* Secondary Action Subheader: Active Gincana summary & quick buttons */}
          {activeGincana && (
            <div className="bg-surface-container-low dark:bg-inverse-surface/40 border-t border-secondary/10 px-4 sm:px-6 py-2">
              <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 overflow-x-auto text-xs">
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                      activeGincana.status === 'concluida'
                        ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${activeGincana.status === 'concluida' ? 'bg-purple-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                    {activeGincana.status === 'concluida' ? 'Finalizada' : 'Em Andamento'}
                  </span>

                  <span className="text-on-surface-variant dark:text-[#d1c4bb] font-medium hidden sm:inline">
                    {rankedTeams.length} {rankedTeams.length === 1 ? 'equipe' : 'equipes'}
                  </span>

                  <span className="text-on-surface-variant/40 hidden sm:inline">•</span>

                  <span className="text-on-surface-variant dark:text-[#d1c4bb] font-bold">
                    {rankedTeams.reduce((sum, t) => sum + t.totalPoints, 0)} pts total
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Share button */}
                  <button
                    onClick={handleShareWhatsApp}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                    title="Compartilhar placar no WhatsApp"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                    </svg>
                    <span>Placar WhatsApp</span>
                  </button>

                  {/* Projector mode */}
                  <button
                    onClick={() => setIsProjectorMode(true)}
                    className="p-1.5 rounded-lg border border-secondary/20 text-on-surface-variant hover:bg-secondary/10 cursor-pointer"
                    title="Modo Projetor / TV (Tela cheia)"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </header>
      )}

      {/* Main Content Area */}
      <main className={`flex-grow max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 ${isProjectorMode ? 'max-w-7xl py-0' : 'pb-28 md:pb-12'}`}>
        {/* Fullscreen Projector Exit Bar */}
        {isProjectorMode && (
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-secondary/20">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🏆</span>
              <div>
                <h1 className="text-3xl font-black text-primary dark:text-[#fcf9f4]">
                  {activeGincana?.name}
                </h1>
                <p className="text-sm text-on-surface-variant">Placar ao vivo da gincana</p>
              </div>
            </div>
            <button
              onClick={() => setIsProjectorMode(false)}
              className="px-4 py-2 bg-primary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              Sair da Tela Cheia
            </button>
          </div>
        )}

        {/* State: No Gincanas Registered */}
        {Object.keys(gincanas).length === 0 ? (
          <div className="py-16 text-center max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-inner border border-amber-500/20">
              🏆
            </div>
            <h2 className="text-2xl font-bold text-primary dark:text-[#fcf9f4] mb-3">
              Bem-vindo ao Gerenciador de Gincanas!
            </h2>
            <p className="text-sm text-on-surface-variant dark:text-[#d1c4bb] mb-8 leading-relaxed">
              Crie torneios, gincanas escolares ou acampamentos. Cadastre equipes com logos, versículos e membros, lance pontos em tempo real e acompanhe o placar mobile-first.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setEditingGincanaId(null);
                  setGincanaName('');
                  setGincanaDesc('');
                  setIsGincanaModalOpen(true);
                }}
                className="w-full py-4 px-6 bg-primary text-on-primary rounded-2xl font-bold text-base shadow-md hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>Criar Minha Gincana</span>
              </button>

              <button
                onClick={handleCreateDemoGincana}
                className="w-full py-3.5 px-6 border-2 border-dashed border-primary/40 text-primary dark:text-[#fcf9f4] rounded-2xl font-semibold text-sm hover:bg-primary/5 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>⚡ Carregar Gincana Exemplo (4 Equipes com Membros)</span>
              </button>
            </div>
          </div>
        ) : !activeGincana ? (
          <div className="py-12 text-center">
            <p className="text-sm text-on-surface-variant mb-4">Selecione uma gincana para começar:</p>
            <button
              onClick={() => setActiveTab('gincanas')}
              className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold text-sm cursor-pointer"
            >
              Ver Lista de Gincanas
            </button>
          </div>
        ) : (
          <div>
            {/* Desktop Tabs Header */}
            {!isProjectorMode && (
              <div className="hidden md:flex items-center gap-2 mb-8 bg-surface-container-low dark:bg-inverse-surface/60 p-1.5 rounded-2xl border border-secondary/20 dark:border-secondary/10">
                <button
                  onClick={() => setActiveTab('placar')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'placar'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-primary hover:bg-secondary/10'
                  }`}
                >
                  <span>🏆 Placar Geral</span>
                </button>

                <button
                  onClick={() => setActiveTab('pontuar')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'pontuar'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-primary hover:bg-secondary/10'
                  }`}
                >
                  <span>⚡ Lançar Pontos</span>
                </button>

                <button
                  onClick={() => setActiveTab('equipes')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'equipes'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-primary hover:bg-secondary/10'
                  }`}
                >
                  <span>👥 Equipes ({rankedTeams.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('historico')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'historico'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-primary hover:bg-secondary/10'
                  }`}
                >
                  <span>📜 Histórico</span>
                </button>

                <button
                  onClick={() => setActiveTab('gincanas')}
                  className={`py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'gincanas'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-primary hover:bg-secondary/10'
                  }`}
                >
                  <span>⚙️ Config</span>
                </button>
              </div>
            )}

            {/* TAB 1: PLACAR GERAL (PODIUM + RANKING) */}
            {(activeTab === 'placar' || isProjectorMode) && (
              <div className="space-y-8">
                {rankedTeams.length === 0 ? (
                  <div className="bg-surface-container dark:bg-inverse-surface/40 border border-secondary/20 rounded-3xl p-8 text-center max-w-lg mx-auto">
                    <span className="text-4xl mb-4 block">🚩</span>
                    <h3 className="text-lg font-bold text-primary dark:text-[#fcf9f4] mb-2">
                      Nenhuma equipe cadastrada ainda
                    </h3>
                    <p className="text-xs text-on-surface-variant dark:text-[#d1c4bb] mb-6">
                      Cadastre equipes com seus logos, versículos e integrantes para iniciar o torneio.
                    </p>
                    <button
                      onClick={handleOpenCreateTeam}
                      className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-md hover:opacity-90 cursor-pointer"
                    >
                      + Cadastrar Primeira Equipe
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Visual Podium for Top 3 */}
                    {rankedTeams.length >= 2 && (
                      <div className="bg-gradient-to-b from-surface-container/50 to-surface-container-high/30 dark:from-inverse-surface/40 dark:to-inverse-surface/10 rounded-3xl p-4 sm:p-8 border border-secondary/20 dark:border-secondary/10 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xs font-bold uppercase tracking-widest text-primary dark:text-[#fcf9f4] flex items-center gap-1.5">
                            <span>🏆 Pódio da Liderança</span>
                          </h2>
                          <span className="text-[11px] text-on-surface-variant font-medium">
                            Tempo real
                          </span>
                        </div>

                        {/* Podium Columns */}
                        <div className="flex items-end justify-center gap-2 sm:gap-6 pt-6 pb-2">
                          {/* 2nd Place (Left) */}
                          {rankedTeams[1] && (
                            <div
                              onClick={() => setViewingTeamDetails(rankedTeams[1])}
                              className="flex flex-col items-center flex-1 max-w-[130px] sm:max-w-[160px] cursor-pointer hover:opacity-90 transition-opacity"
                              title="Clique para ver detalhes"
                            >
                              <div className="relative mb-2 flex flex-col items-center">
                                {renderTeamAvatar(rankedTeams[1], 'w-12 h-12 sm:w-14 sm:h-14 text-2xl')}
                                <span className="text-xs sm:text-sm font-black text-center truncate max-w-[110px] text-primary dark:text-[#fcf9f4] mt-1">
                                  {rankedTeams[1].name}
                                </span>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-300">
                                  {rankedTeams[1].totalPoints} pts
                                </span>
                              </div>
                              <div
                                className="w-full h-24 sm:h-32 rounded-t-2xl flex flex-col items-center justify-center text-white shadow-md border-t-4 border-slate-300 relative"
                                style={{ backgroundColor: rankedTeams[1].color || '#94a3b8' }}
                              >
                                <div className="absolute inset-0 bg-black/20 rounded-t-2xl"></div>
                                <span className="relative text-2xl sm:text-3xl font-black">2º</span>
                                <span className="relative text-[10px] sm:text-xs uppercase font-bold tracking-wider opacity-90">Prata</span>
                              </div>
                            </div>
                          )}

                          {/* 1st Place (Center - Elevated) */}
                          {rankedTeams[0] && (
                            <div
                              onClick={() => setViewingTeamDetails(rankedTeams[0])}
                              className="flex flex-col items-center flex-1 max-w-[150px] sm:max-w-[180px] -mt-6 cursor-pointer hover:opacity-90 transition-opacity"
                              title="Clique para ver detalhes"
                            >
                              <div className="relative mb-2 flex flex-col items-center">
                                <span className="absolute -top-6 text-xl animate-bounce">👑</span>
                                {renderTeamAvatar(rankedTeams[0], 'w-14 h-14 sm:w-16 sm:h-16 text-3xl')}
                                <span className="text-sm sm:text-base font-black text-center truncate max-w-[130px] text-amber-600 dark:text-amber-400 mt-1">
                                  {rankedTeams[0].name}
                                </span>
                                <span className="text-sm sm:text-base font-black text-primary dark:text-[#fcf9f4]">
                                  {rankedTeams[0].totalPoints} pts
                                </span>
                              </div>
                              <div
                                className="w-full h-32 sm:h-44 rounded-t-2xl flex flex-col items-center justify-center text-white shadow-xl border-t-4 border-amber-300 relative"
                                style={{ backgroundColor: rankedTeams[0].color || '#eab308' }}
                              >
                                <div className="absolute inset-0 bg-black/10 rounded-t-2xl"></div>
                                <span className="relative text-3xl sm:text-4xl font-black">1º</span>
                                <span className="relative text-xs uppercase font-black tracking-wider text-amber-200">Campeão</span>
                              </div>
                            </div>
                          )}

                          {/* 3rd Place (Right) */}
                          {rankedTeams[2] && (
                            <div
                              onClick={() => setViewingTeamDetails(rankedTeams[2])}
                              className="flex flex-col items-center flex-1 max-w-[130px] sm:max-w-[160px] cursor-pointer hover:opacity-90 transition-opacity"
                              title="Clique para ver detalhes"
                            >
                              <div className="relative mb-2 flex flex-col items-center">
                                {renderTeamAvatar(rankedTeams[2], 'w-12 h-12 sm:w-14 sm:h-14 text-2xl')}
                                <span className="text-xs sm:text-sm font-black text-center truncate max-w-[110px] text-primary dark:text-[#fcf9f4] mt-1">
                                  {rankedTeams[2].name}
                                </span>
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-500">
                                  {rankedTeams[2].totalPoints} pts
                                </span>
                              </div>
                              <div
                                className="w-full h-20 sm:h-24 rounded-t-2xl flex flex-col items-center justify-center text-white shadow-md border-t-4 border-amber-600 relative"
                                style={{ backgroundColor: rankedTeams[2].color || '#b45309' }}
                              >
                                <div className="absolute inset-0 bg-black/25 rounded-t-2xl"></div>
                                <span className="relative text-xl sm:text-2xl font-black">3º</span>
                                <span className="relative text-[10px] sm:text-xs uppercase font-bold tracking-wider opacity-90">Bronze</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Leaderboard Cards List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-bold text-primary dark:text-[#fcf9f4] uppercase tracking-wider">
                          Classificação Geral
                        </h3>
                        <span className="text-xs text-on-surface-variant font-medium">
                          {rankedTeams.length} equipes participantes
                        </span>
                      </div>

                      {rankedTeams.map((team) => {
                        const leaderPoints = rankedTeams[0]?.totalPoints || 1;
                        const percentage = leaderPoints > 0 ? Math.max(8, Math.round((team.totalPoints / leaderPoints) * 100)) : 0;
                        const membersCount = team.members?.length || 0;

                        return (
                          <div
                            key={team.id}
                            className="group bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col gap-3"
                          >
                            <div
                              className="absolute top-0 left-0 bottom-0 w-2.5"
                              style={{ backgroundColor: team.color }}
                            />

                            <div className="flex items-center justify-between gap-3 pl-2">
                              {/* Position & Team identity */}
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-sm sm:text-base shrink-0 ${
                                    team.position === 1
                                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                      : team.position === 2
                                      ? 'bg-slate-400/20 text-slate-600 dark:text-slate-300 border border-slate-400/30'
                                      : team.position === 3
                                      ? 'bg-amber-700/20 text-amber-700 dark:text-amber-500 border border-amber-700/30'
                                      : 'bg-surface-container text-on-surface-variant'
                                  }`}
                                >
                                  {team.position}º
                                </span>

                                {/* Team Avatar (Logo or Badge) */}
                                {renderTeamAvatar(team, 'w-11 h-11 sm:w-12 sm:h-12 text-2xl')}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4
                                      onClick={() => setViewingTeamDetails(team)}
                                      className="font-bold text-base sm:text-lg text-primary dark:text-[#fcf9f4] truncate hover:underline cursor-pointer"
                                    >
                                      {team.name}
                                    </h4>
                                  </div>

                                  {/* Verse Preview if exists */}
                                  {team.verseRef && (
                                    <p className="text-xs text-amber-700 dark:text-amber-400/90 italic truncate max-w-xs sm:max-w-md">
                                      &ldquo;{team.verseText || team.verseRef}&rdquo; — {team.verseRef}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-2 text-[11px] sm:text-xs text-on-surface-variant dark:text-[#d1c4bb]">
                                    {team.leader && <span>Líder: {team.leader}</span>}
                                    {team.leader && <span>•</span>}
                                    <span>👥 {membersCount} {membersCount === 1 ? 'membro' : 'membros'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Total Points */}
                              <div className="text-right shrink-0">
                                <span className="text-2xl sm:text-3xl font-black text-primary dark:text-[#fcf9f4] tracking-tight block">
                                  {team.totalPoints}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-on-surface-variant/80 tracking-wider">
                                  {team.position === 1
                                    ? 'Líder'
                                    : team.diffToLeader > 0
                                    ? `-${team.diffToLeader} pts do 1º`
                                    : 'Empatado'}
                                </span>
                              </div>
                            </div>

                            {/* Relative Progress Bar */}
                            <div className="pl-2">
                              <div className="w-full bg-surface-container dark:bg-inverse-surface/80 h-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${percentage}%`,
                                    backgroundColor: team.color || '#2563eb'
                                  }}
                                />
                              </div>
                            </div>

                            {/* Micro-actions on Card */}
                            {!isProjectorMode && (
                              <div className="pl-2 pt-1 border-t border-secondary/10 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleQuickAdjust(team.id, 10, 'Acréscimo rápido')}
                                    className="px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                                  >
                                    +10
                                  </button>
                                  <button
                                    onClick={() => handleQuickAdjust(team.id, 50, 'Prova cumprida')}
                                    className="px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                                  >
                                    +50
                                  </button>
                                  <button
                                    onClick={() => handleQuickAdjust(team.id, 100, 'Prova cumprida')}
                                    className="px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                                  >
                                    +100
                                  </button>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setViewingTeamDetails(team)}
                                    className="px-2 py-1 text-on-surface-variant font-semibold hover:text-primary transition-colors cursor-pointer"
                                  >
                                    Ver Perfil
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedTeamIdForScore(team.id);
                                      setActiveTab('pontuar');
                                    }}
                                    className="px-2.5 py-1 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 transition-all flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <span>Pontuar</span>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 2: PONTUAR (SOMADOR / SUBTRATOR MOBILE-FIRST) */}
            {activeTab === 'pontuar' && !isProjectorMode && (
              <div className="max-w-xl mx-auto space-y-6">
                <div className="bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-3xl p-5 sm:p-7 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-primary dark:text-[#fcf9f4]">
                        Lançamento de Pontos
                      </h2>
                      <p className="text-xs text-on-surface-variant dark:text-[#d1c4bb]">
                        Selecione a equipe, defina os pontos e confirme com 1 toque.
                      </p>
                    </div>
                    <span className="text-3xl">⚡</span>
                  </div>

                  <form onSubmit={handleScoreSubmit} className="space-y-6">
                    {/* 1. Escolha da Equipe */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-primary dark:text-[#fcf9f4] mb-3">
                        1. Selecione a Equipe
                      </label>
                      {rankedTeams.length === 0 ? (
                        <p className="text-xs text-red-500">Cadastre equipes primeiro na aba Equipes.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {rankedTeams.map((team) => {
                            const isSelected = effectiveScoreTeamId === team.id;
                            return (
                              <button
                                key={team.id}
                                type="button"
                                onClick={() => setSelectedTeamIdForScore(team.id)}
                                className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                                  isSelected
                                    ? 'ring-2 ring-primary border-primary bg-primary/10 shadow-sm'
                                    : 'border-secondary/20 hover:border-secondary/40 bg-surface-container-low dark:bg-inverse-surface/60'
                                }`}
                              >
                                {renderTeamAvatar(team, 'w-9 h-9 text-xl')}
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold truncate text-primary dark:text-[#fcf9f4]">
                                    {team.name}
                                  </p>
                                  <p className="text-[10px] text-on-surface-variant font-semibold">
                                    {team.totalPoints} pts
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 2. Operação: Adicionar (+) ou Subtrair (-) */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-primary dark:text-[#fcf9f4] mb-2">
                        2. Operação
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setScoreOperation('add')}
                          className={`py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            scoreOperation === 'add'
                              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30'
                              : 'bg-surface-container text-on-surface-variant hover:bg-secondary/10'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          <span>Somar (+)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setScoreOperation('subtract')}
                          className={`py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            scoreOperation === 'subtract'
                              ? 'bg-red-600 text-white shadow-md ring-2 ring-red-600/30'
                              : 'bg-surface-container text-on-surface-variant hover:bg-secondary/10'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                          </svg>
                          <span>Subtrair (-)</span>
                        </button>
                      </div>
                    </div>

                    {/* 3. Valores Rápidos (Chips) */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-primary dark:text-[#fcf9f4] mb-2">
                        3. Quantidade de Pontos
                      </label>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {QUICK_POINTS.map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setScoreAmount(val)}
                            className={`py-2 px-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                              scoreAmount === val
                                ? 'bg-primary text-on-primary shadow-sm scale-105'
                                : 'bg-surface-container dark:bg-inverse-surface/80 text-primary dark:text-[#fcf9f4] hover:bg-secondary/20'
                            }`}
                          >
                            {scoreOperation === 'add' ? `+${val}` : `-${val}`}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setScoreAmount((prev) => Math.max(5, prev - 10))}
                          className="w-12 h-12 rounded-xl bg-surface-container dark:bg-inverse-surface font-black text-lg text-primary dark:text-[#fcf9f4] hover:bg-secondary/20 flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          -10
                        </button>

                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="1"
                            max="99999"
                            value={scoreAmount}
                            onChange={(e) => setScoreAmount(Math.max(1, Number(e.target.value) || 0))}
                            className="w-full text-center text-2xl font-black py-2.5 bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => setScoreAmount((prev) => prev + 10)}
                          className="w-12 h-12 rounded-xl bg-surface-container dark:bg-inverse-surface font-black text-lg text-primary dark:text-[#fcf9f4] hover:bg-secondary/20 flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          +10
                        </button>
                      </div>
                    </div>

                    {/* 4. Motivo / Prova */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-primary dark:text-[#fcf9f4] mb-2">
                        4. Motivo / Nome da Prova (Opcional)
                      </label>

                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {COMMON_REASONS.map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => setScoreReason(reason)}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                              scoreReason === reason
                                ? 'bg-primary text-on-primary border-primary'
                                : 'bg-surface-container-low dark:bg-inverse-surface/40 border-secondary/20 text-on-surface-variant hover:border-secondary/40'
                            }`}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        placeholder="Ex: Prova da Torta na Cara, Grito de Guerra..."
                        value={scoreReason}
                        onChange={(e) => setScoreReason(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>

                    {/* Big Action Submit Button */}
                    <button
                      type="submit"
                      disabled={!effectiveScoreTeamId || scoreAmount <= 0}
                      className={`w-full py-4 rounded-2xl font-black text-base tracking-wide text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer ${
                        scoreOperation === 'add'
                          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                          : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                      } ${(!effectiveScoreTeamId || scoreAmount <= 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span>
                        {scoreOperation === 'add' ? 'Confirmar +' : 'Confirmar -'}
                        {scoreAmount} Pontos
                      </span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 3: EQUIPES (CADASTRO, LOGO, VERSÍCULO E MEMBROS) */}
            {activeTab === 'equipes' && !isProjectorMode && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-primary dark:text-[#fcf9f4]">
                      Equipes da Gincana
                    </h2>
                    <p className="text-xs text-on-surface-variant dark:text-[#d1c4bb]">
                      Cadastre logos, versículos e a lista completa de integrantes de cada equipe.
                    </p>
                  </div>

                  <button
                    onClick={handleOpenCreateTeam}
                    className="px-5 py-3 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-sm hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>Nova Equipe</span>
                  </button>
                </div>

                {rankedTeams.length === 0 ? (
                  <div className="p-8 text-center bg-white dark:bg-inverse-surface border border-dashed border-secondary/30 rounded-3xl">
                    <p className="text-sm text-on-surface-variant">Nenhuma equipe cadastrada ainda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rankedTeams.map((team) => {
                      const membersList = Array.isArray(team.members) ? team.members : [];

                      return (
                        <div
                          key={team.id}
                          className="bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4 relative overflow-hidden"
                        >
                          <div
                            className="absolute top-0 left-0 right-0 h-2"
                            style={{ backgroundColor: team.color }}
                          />

                          <div className="space-y-3">
                            {/* Header: Logo, Name, Score */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                {renderTeamAvatar(team, 'w-14 h-14 text-2xl')}
                                <div>
                                  <h3 className="text-lg font-bold text-primary dark:text-[#fcf9f4]">
                                    {team.name}
                                  </h3>
                                  {team.leader ? (
                                    <p className="text-xs text-on-surface-variant font-medium flex items-center gap-1">
                                      <span>👑 Líder:</span>
                                      <span className="font-bold text-primary dark:text-[#fcf9f4]">{team.leader}</span>
                                    </p>
                                  ) : (
                                    <p className="text-xs text-on-surface-variant/60 italic">Sem líder definido</p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-xl font-black text-primary dark:text-[#fcf9f4]">
                                  {team.totalPoints}
                                </span>
                                <span className="text-[10px] block uppercase font-bold text-on-surface-variant/70">
                                  Pontos
                                </span>
                              </div>
                            </div>

                            {/* Team Verse */}
                            {team.verseText ? (
                              <div className="p-3 rounded-xl bg-surface-container-low dark:bg-inverse-surface/60 border-l-4 border-amber-500 text-xs">
                                <p className="italic text-primary dark:text-[#fcf9f4] leading-relaxed">
                                  &ldquo;{team.verseText}&rdquo;
                                </p>
                                {team.verseRef && (
                                  <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mt-1 text-right">
                                    — {team.verseRef}
                                  </p>
                                )}
                              </div>
                            ) : null}

                            {/* Members Section */}
                            <div>
                              <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant mb-1.5">
                                <span>Integrantes ({membersList.length}):</span>
                                <button
                                  onClick={() => handleOpenEditTeam(team)}
                                  className="text-primary dark:text-[#fcf9f4] hover:underline font-semibold text-[11px]"
                                >
                                  + Adicionar Membro
                                </button>
                              </div>

                              {membersList.length === 0 ? (
                                <p className="text-xs text-on-surface-variant/60 italic">
                                  Nenhum integrante cadastrado nesta equipe.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {membersList.slice(0, 6).map((m, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 rounded-lg bg-surface-container dark:bg-inverse-surface/80 text-[11px] font-medium text-primary dark:text-[#fcf9f4]"
                                    >
                                      {m}
                                    </span>
                                  ))}
                                  {membersList.length > 6 && (
                                    <button
                                      onClick={() => setViewingTeamDetails(team)}
                                      className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary dark:text-[#fcf9f4] text-[11px] font-bold hover:bg-primary/20"
                                    >
                                      +{membersList.length - 6} outros
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions Footer */}
                          <div className="flex items-center justify-between pt-3 border-t border-secondary/10">
                            <button
                              onClick={() => setViewingTeamDetails(team)}
                              className="text-xs font-bold text-primary dark:text-[#fcf9f4] hover:underline"
                            >
                              Ver Perfil Completo
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenEditTeam(team)}
                                className="px-3 py-1.5 text-xs font-bold text-primary dark:text-[#fcf9f4] border border-secondary/30 rounded-lg hover:bg-secondary/10 transition-colors cursor-pointer"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => setConfirmDeleteTeamId(team.id)}
                                className="px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: HISTÓRICO DE PONTUAÇÕES (EXTRATO COM DESFAZER) */}
            {activeTab === 'historico' && !isProjectorMode && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-primary dark:text-[#fcf9f4]">
                      Extrato de Pontos
                    </h2>
                    <p className="text-xs text-on-surface-variant dark:text-[#d1c4bb]">
                      Histórico completo de pontuações. Se houver erro, você pode desfazer qualquer lançamento.
                    </p>
                  </div>

                  {/* Filter by Team */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-on-surface-variant shrink-0">Filtrar:</label>
                    <select
                      value={historyTeamFilter}
                      onChange={(e) => setHistoryTeamFilter(e.target.value)}
                      className="px-3 py-2 text-xs font-semibold bg-white dark:bg-inverse-surface border border-secondary/30 rounded-xl outline-none cursor-pointer"
                    >
                      <option value="all">Todas as Equipes</option>
                      {rankedTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.badge} {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {historyLogs.length === 0 ? (
                  <div className="p-12 text-center bg-white dark:bg-inverse-surface border border-dashed border-secondary/20 rounded-3xl">
                    <span className="text-3xl mb-2 block">📜</span>
                    <p className="text-sm font-semibold text-primary dark:text-[#fcf9f4]">
                      Nenhum lançamento registrado ainda
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Lance pontos na aba &quot;Lançar Pontos&quot; para ver o histórico aqui.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-2xl divide-y divide-secondary/10 shadow-sm overflow-hidden">
                    {historyLogs.map((log) => {
                      const team = activeGincana.teams?.[log.teamId];
                      const isPositive = (Number(log.points) || 0) >= 0;

                      return (
                        <div key={log.id} className="p-4 flex items-center justify-between gap-3 hover:bg-secondary/5 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center shrink-0 ${
                                isPositive
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                              }`}
                            >
                              {isPositive ? `+${log.points}` : log.points}
                            </span>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {team && renderTeamAvatar(team, 'w-5 h-5 text-xs')}
                                <span className="font-bold text-sm text-primary dark:text-[#fcf9f4] truncate">
                                  {team ? team.name : 'Equipe removida'}
                                </span>
                              </div>
                              <p className="text-xs text-on-surface-variant dark:text-[#d1c4bb] truncate">
                                {log.reason}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[11px] text-on-surface-variant/70 font-medium">
                              {formatTimeAgo(log.timestamp)}
                            </span>

                            <button
                              onClick={() => setConfirmDeleteLogId(log.id)}
                              className="p-1.5 text-on-surface-variant/60 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Desfazer lançamento"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: GINCANAS & CONFIGURAÇÕES */}
            {activeTab === 'gincanas' && !isProjectorMode && (
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-primary dark:text-[#fcf9f4]">
                      Minhas Gincanas
                    </h2>
                    <p className="text-xs text-on-surface-variant dark:text-[#d1c4bb]">
                      Alterne entre eventos ou crie uma nova gincana.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingGincanaId(null);
                      setGincanaName('');
                      setGincanaDesc('');
                      setIsGincanaModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs shadow-sm hover:opacity-90 flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>Nova Gincana</span>
                  </button>
                </div>

                {/* List of Gincanas */}
                <div className="space-y-3">
                  {Object.values(gincanas).map((g) => {
                    const isActive = g.id === activeGincanaId;
                    const teamsCount = g.teams ? Object.keys(g.teams).length : 0;
                    const logsCount = g.scoreLog ? Object.keys(g.scoreLog).length : 0;

                    return (
                      <div
                        key={g.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          isActive
                            ? 'bg-primary/5 border-primary ring-1 ring-primary/40'
                            : 'bg-white dark:bg-inverse-surface border-secondary/20 hover:border-secondary/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-base text-primary dark:text-[#fcf9f4]">
                                {g.name}
                              </h3>
                              {isActive && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-primary text-on-primary rounded-md uppercase">
                                  Ativa
                                </span>
                              )}
                            </div>
                            {g.description && (
                              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                                {g.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-3 text-xs text-on-surface-variant font-medium">
                              <span>👥 {teamsCount} equipes</span>
                              <span>•</span>
                              <span>⚡ {logsCount} lançamentos</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!isActive && (
                              <button
                                onClick={() => {
                                  handleSelectGincana(g.id);
                                  setActiveTab('placar');
                                }}
                                className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 cursor-pointer"
                              >
                                Selecionar
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDeleteGincanaId(g.id)}
                              className="p-1.5 text-on-surface-variant hover:text-red-600 rounded-lg hover:bg-red-500/10 cursor-pointer"
                              title="Excluir Gincana"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Gincana Control Actions for Active Gincana */}
                {activeGincana && (
                  <div className="bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-2xl p-5 space-y-4 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary dark:text-[#fcf9f4]">
                      Ações da Gincana Ativa: &quot;{activeGincana.name}&quot;
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        onClick={handleOpenEditGincana}
                        className="py-2.5 px-3 rounded-xl border border-secondary/30 text-xs font-bold hover:bg-secondary/10 text-primary dark:text-[#fcf9f4] cursor-pointer"
                      >
                        ✏️ Renomear Gincana
                      </button>

                      <button
                        onClick={handleToggleStatus}
                        className="py-2.5 px-3 rounded-xl border border-secondary/30 text-xs font-bold hover:bg-secondary/10 text-primary dark:text-[#fcf9f4] cursor-pointer"
                      >
                        {activeGincana.status === 'concluida' ? '🔄 Reabrir Gincana' : '🏁 Finalizar Gincana'}
                      </button>

                      <button
                        onClick={() => setConfirmResetPoints(true)}
                        className="py-2.5 px-3 rounded-xl border border-red-500/30 text-xs font-bold text-red-600 hover:bg-red-500/10 cursor-pointer"
                      >
                        ⚠️ Zerar Todos os Pontos
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (FIXED) */}
      {!isProjectorMode && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#121210]/95 backdrop-blur-lg border-t border-secondary/20 dark:border-secondary/10 px-2 py-1.5 shadow-2xl safe-area-bottom">
          <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
            <button
              onClick={() => setActiveTab('placar')}
              className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'placar'
                  ? 'text-primary dark:text-[#fcf9f4] font-bold bg-primary/10'
                  : 'text-on-surface-variant font-medium hover:bg-secondary/10'
              }`}
            >
              <span className="text-xl leading-none mb-1">🏆</span>
              <span className="text-[11px]">Placar</span>
            </button>

            <button
              onClick={() => setActiveTab('pontuar')}
              className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'pontuar'
                  ? 'text-primary dark:text-[#fcf9f4] font-bold bg-primary/10'
                  : 'text-on-surface-variant font-medium hover:bg-secondary/10'
              }`}
            >
              <span className="text-xl leading-none mb-1">⚡</span>
              <span className="text-[11px]">Pontuar</span>
            </button>

            <button
              onClick={() => setActiveTab('equipes')}
              className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'equipes'
                  ? 'text-primary dark:text-[#fcf9f4] font-bold bg-primary/10'
                  : 'text-on-surface-variant font-medium hover:bg-secondary/10'
              }`}
            >
              <span className="text-xl leading-none mb-1">👥</span>
              <span className="text-[11px]">Equipes</span>
            </button>

            <button
              onClick={() => setActiveTab('historico')}
              className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'historico'
                  ? 'text-primary dark:text-[#fcf9f4] font-bold bg-primary/10'
                  : 'text-on-surface-variant font-medium hover:bg-secondary/10'
              }`}
            >
              <span className="text-xl leading-none mb-1">📜</span>
              <span className="text-[11px]">Histórico</span>
            </button>
          </div>
        </nav>
      )}

      {/* MODAL: Criar / Editar Gincana */}
      {isGincanaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-primary dark:text-[#fcf9f4] mb-1">
              {editingGincanaId ? 'Editar Gincana' : 'Criar Nova Gincana'}
            </h3>
            <p className="text-xs text-on-surface-variant mb-5">
              Defina o nome e detalhes da competição.
            </p>

            <form onSubmit={handleSaveGincana} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary dark:text-[#fcf9f4] mb-1.5">
                  Nome da Gincana *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gincana de Férias 2026"
                  value={gincanaName}
                  onChange={(e) => setGincanaName(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary dark:text-[#fcf9f4] mb-1.5">
                  Descrição / Local (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Acampamento no sítio, provas recreativas..."
                  value={gincanaDesc}
                  onChange={(e) => setGincanaDesc(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-secondary/10">
                <button
                  type="button"
                  onClick={() => setIsGincanaModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-secondary/20 text-xs font-bold text-on-surface-variant hover:bg-secondary/10 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 shadow-sm cursor-pointer"
                >
                  Salvar Gincana
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Criar / Editar Equipe (Com Logo, Versículo e Membros) */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-primary dark:text-[#fcf9f4] mb-1">
              {editingTeamId ? 'Editar Equipe' : 'Cadastrar Nova Equipe'}
            </h3>
            <p className="text-xs text-on-surface-variant mb-6">
              Defina a identidade visual, versículo e os membros da equipe.
            </p>

            <form onSubmit={handleSaveTeam} className="space-y-5">
              {/* 1. Upload de Logo da Equipe + Mascote */}
              <div className="bg-surface-container-low dark:bg-inverse-surface/60 p-4 rounded-2xl border border-secondary/20 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-primary dark:text-[#fcf9f4]">
                  Logo / Brasão da Equipe
                </label>

                <div className="flex items-center gap-4">
                  {/* Logo Preview */}
                  <div
                    className="w-16 h-16 rounded-2xl border-2 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative bg-white dark:bg-[#121210]"
                    style={{ borderColor: teamColor }}
                  >
                    {teamLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={teamLogo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">{teamBadge}</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        className="px-3 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                        </svg>
                        <span>{isUploadingLogo ? 'Processando...' : 'Carregar Imagem'}</span>
                      </button>

                      {teamLogo && (
                        <button
                          type="button"
                          onClick={() => setTeamLogo(null)}
                          className="px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                        >
                          Remover Logo
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-on-surface-variant">
                      Foto da galeria ou câmera (otimizada automaticamente).
                    </p>
                  </div>
                </div>

                {/* Emoji / Mascot selector (if no logo or for secondary badge) */}
                <div>
                  <span className="block text-[11px] font-bold text-on-surface-variant mb-1.5">
                    Ou escolha um mascote/emoji alternativo:
                  </span>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-surface-container dark:bg-inverse-surface/80 rounded-xl max-h-24 overflow-y-auto">
                    {TEAM_BADGES.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setTeamBadge(emoji)}
                        className={`w-8 h-8 text-lg rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          teamBadge === emoji
                            ? 'bg-primary text-on-primary scale-110 shadow-xs'
                            : 'hover:bg-secondary/20'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Nome da Equipe */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary dark:text-[#fcf9f4] mb-1.5">
                  Nome da Equipe *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Equipe Azul, Tubarões da Fé..."
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              {/* 3. Cor da Equipe */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary dark:text-[#fcf9f4] mb-1.5">
                  Cor Oficial da Equipe
                </label>
                <div className="flex flex-wrap gap-2">
                  {TEAM_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setTeamColor(c.hex)}
                      className={`w-8 h-8 rounded-full transition-transform cursor-pointer relative ${
                        teamColor === c.hex ? 'scale-110 ring-2 ring-offset-2 ring-primary' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {teamColor === c.hex && (
                        <svg className="w-4 h-4 text-white mx-auto" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Versículo da Equipe */}
              <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                    📖 Versículo da Equipe
                  </label>
                  <span className="text-[10px] text-on-surface-variant font-medium">Inspiração</span>
                </div>

                {/* Preset chips */}
                <div>
                  <span className="block text-[11px] text-on-surface-variant mb-1.5">Sugestões rápidas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {VERSE_PRESETS.map((vp) => (
                      <button
                        key={vp.ref}
                        type="button"
                        onClick={() => {
                          setTeamVerseRef(vp.ref);
                          setTeamVerseText(vp.text);
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          teamVerseRef === vp.ref
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white dark:bg-inverse-surface border-secondary/20 text-on-surface-variant hover:border-amber-500'
                        }`}
                      >
                        {vp.ref}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Texto do versículo (Ex: Tudo posso naquele que me fortalece.)"
                    value={teamVerseText}
                    onChange={(e) => setTeamVerseText(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#121210] border border-secondary/30 rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none"
                  />
                  <input
                    type="text"
                    placeholder="Referência Bíblica (Ex: Filipenses 4:13)"
                    value={teamVerseRef}
                    onChange={(e) => setTeamVerseRef(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#121210] border border-secondary/30 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {/* 5. Líder / Capitão */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary dark:text-[#fcf9f4] mb-1.5">
                  Líder / Capitão da Equipe (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: João Silva"
                  value={teamLeader}
                  onChange={(e) => setTeamLeader(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              {/* 6. Membros / Integrantes da Equipe */}
              <div className="bg-surface-container-low dark:bg-inverse-surface/60 p-4 rounded-2xl border border-secondary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-primary dark:text-[#fcf9f4]">
                    Integrantes da Equipe ({teamMembers.length})
                  </label>
                  <span className="text-[10px] text-on-surface-variant font-medium">Lista de membros</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Digite o nome do integrante..."
                    value={currentMemberInput}
                    onChange={(e) => setCurrentMemberInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMember();
                      }
                    }}
                    className="flex-1 px-3.5 py-2 text-xs bg-white dark:bg-[#121210] border border-secondary/30 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="px-3.5 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl hover:opacity-90 cursor-pointer shrink-0"
                  >
                    + Adicionar
                  </button>
                </div>

                {teamMembers.length === 0 ? (
                  <p className="text-[11px] text-on-surface-variant/70 italic">
                    Nenhum integrante adicionado ainda. Digite o nome e clique em Adicionar.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                    {teamMembers.map((member, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#121210] border border-secondary/20 text-xs font-semibold text-primary dark:text-[#fcf9f4]"
                      >
                        <span>{member}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(idx)}
                          className="text-on-surface-variant/60 hover:text-red-600 ml-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-secondary/10">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-secondary/20 text-xs font-bold text-on-surface-variant hover:bg-secondary/10 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 shadow-sm cursor-pointer"
                >
                  Salvar Equipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Visualizar Perfil Completo da Equipe */}
      {viewingTeamDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-3xl p-6 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            {/* Top Color Banner */}
            <div
              className="absolute top-0 left-0 right-0 h-3 rounded-t-3xl"
              style={{ backgroundColor: viewingTeamDetails.color }}
            />

            <div className="flex items-start justify-between gap-3 pt-2 mb-4">
              <div className="flex items-center gap-3">
                {renderTeamAvatar(viewingTeamDetails, 'w-16 h-16 text-3xl')}
                <div>
                  <h3 className="text-xl font-black text-primary dark:text-[#fcf9f4]">
                    {viewingTeamDetails.name}
                  </h3>
                  <p className="text-xs text-on-surface-variant font-semibold">
                    {viewingTeamDetails.position ? `${viewingTeamDetails.position}º Lugar • ` : ''}
                    {viewingTeamDetails.totalPoints || 0} pontos
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewingTeamDetails(null)}
                className="p-1.5 text-on-surface-variant/60 hover:text-primary rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Verse */}
            {viewingTeamDetails.verseText && (
              <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border-l-4 border-amber-500 text-xs">
                <p className="italic text-primary dark:text-[#fcf9f4] leading-relaxed">
                  &ldquo;{viewingTeamDetails.verseText}&rdquo;
                </p>
                {viewingTeamDetails.verseRef && (
                  <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mt-1 text-right">
                    — {viewingTeamDetails.verseRef}
                  </p>
                )}
              </div>
            )}

            {/* Leader */}
            {viewingTeamDetails.leader && (
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold p-2.5 bg-surface-container rounded-xl">
                <span>👑</span>
                <span>Líder da Equipe:</span>
                <span className="font-bold text-primary dark:text-[#fcf9f4]">{viewingTeamDetails.leader}</span>
              </div>
            )}

            {/* Members List */}
            <div className="mb-6 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary dark:text-[#fcf9f4]">
                Integrantes Cadastrados ({viewingTeamDetails.members?.length || 0}):
              </h4>
              {!viewingTeamDetails.members || viewingTeamDetails.members.length === 0 ? (
                <p className="text-xs text-on-surface-variant italic">Nenhum membro cadastrado.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {viewingTeamDetails.members.map((m, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-surface-container dark:bg-inverse-surface text-xs font-medium text-primary dark:text-[#fcf9f4]"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-secondary/10">
              <button
                onClick={() => {
                  const target = viewingTeamDetails;
                  setViewingTeamDetails(null);
                  handleOpenEditTeam(target);
                }}
                className="px-4 py-2 text-xs font-bold border border-secondary/30 rounded-xl hover:bg-secondary/10 cursor-pointer"
              >
                Editar Equipe
              </button>
              <button
                onClick={() => {
                  setSelectedTeamIdForScore(viewingTeamDetails.id);
                  setViewingTeamDetails(null);
                  setActiveTab('pontuar');
                }}
                className="px-4 py-2 text-xs font-bold bg-primary text-on-primary rounded-xl hover:opacity-90 cursor-pointer"
              >
                Lançar Pontos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: Excluir Gincana */}
      {confirmDeleteGincanaId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-inverse-surface border border-secondary/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-primary dark:text-[#fcf9f4] mb-2">
              Excluir esta gincana?
            </h3>
            <p className="text-xs text-on-surface-variant mb-6">
              Todas as equipes e histórico de pontos desta gincana serão apagados permanentemente.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteGincanaId(null)}
                className="px-4 py-2 text-xs font-bold border border-secondary/20 rounded-xl hover:bg-secondary/10 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteGincana(confirmDeleteGincanaId)}
                className="px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: Excluir Equipe */}
      {confirmDeleteTeamId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-inverse-surface border border-secondary/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-primary dark:text-[#fcf9f4] mb-2">
              Excluir esta equipe?
            </h3>
            <p className="text-xs text-on-surface-variant mb-6">
              A equipe e os pontos somados por ela serão removidos da gincana.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteTeamId(null)}
                className="px-4 py-2 text-xs font-bold border border-secondary/20 rounded-xl hover:bg-secondary/10 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteTeam(confirmDeleteTeamId)}
                className="px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: Desfazer Lançamento de Pontos */}
      {confirmDeleteLogId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-inverse-surface border border-secondary/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-primary dark:text-[#fcf9f4] mb-2">
              Desfazer este lançamento?
            </h3>
            <p className="text-xs text-on-surface-variant mb-6">
              Os pontos deste registro serão removidos do total da equipe imediatamente.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteLogId(null)}
                className="px-4 py-2 text-xs font-bold border border-secondary/20 rounded-xl hover:bg-secondary/10 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteLog(confirmDeleteLogId)}
                className="px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 cursor-pointer"
              >
                Desfazer Pontos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL: Zerar Todos os Pontos */}
      {confirmResetPoints && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-inverse-surface border border-secondary/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-red-600 mb-2">
              Zerar todos os pontos?
            </h3>
            <p className="text-xs text-on-surface-variant mb-6">
              Todas as equipes voltarão a 0 pontos e todo o histórico de lançamentos será apagado. Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmResetPoints(false)}
                className="px-4 py-2 text-xs font-bold border border-secondary/20 rounded-xl hover:bg-secondary/10 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetAllScores}
                className="px-4 py-2 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 cursor-pointer"
              >
                Sim, Zerar Tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
