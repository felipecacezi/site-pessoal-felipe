'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ref, onValue, set, remove, update } from 'firebase/database';
import { db } from '../services/firebase';

const INSTRUMENT_PRESETS = [
  { name: 'Click / Metrônomo', icon: '⏱️', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  { name: 'Guia / Guide', icon: '🎙️', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { name: 'Bateria / Drums', icon: '🥁', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  { name: 'Baixo / Bass', icon: '🎸', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { name: 'Guitarra / E. Guitar', icon: '⚡', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  { name: 'Violão / Acoustic', icon: '🪕', color: 'bg-yellow-600/10 text-yellow-600 border-yellow-600/20' },
  { name: 'Teclado / Keys', icon: '🎹', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { name: 'Sintetizador / Pad', icon: '🌊', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  { name: 'Voz Principal / Lead Vox', icon: '🎤', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { name: 'Backing Vocal / BVs', icon: '👥', color: 'bg-pink-500/10 text-pink-500 border-pink-500/20' },
  { name: 'Cordas / Strings', icon: '🎻', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  { name: 'Metais / Brass', icon: '🎺', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  { name: 'Outros / Loop', icon: '🎛️', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' }
];

const AVAILABLE_ICONS = [
  '⏱️', '🎙️', '🥁', '🎸', '⚡', '🪕', '🎹', '🌊', '🎤', '👥', '🎻', '🎺', '🎛️', '🔔', '📻', '🎧', '🎷', '🪘', '💿'
];

function detectInstrument(fileName) {
  const name = fileName.toLowerCase();
  if (name.includes('click') || name.includes('metronomo')) return 'Click / Metrônomo';
  if (name.includes('guia') || name.includes('guide') || name.includes('voice cue')) return 'Guia / Guide';
  if (name.includes('drum') || name.includes('bat') || name.includes('bateria') || name.includes('snare') || name.includes('kick')) return 'Bateria / Drums';
  if (name.includes('bass') || name.includes('baixo')) return 'Baixo / Bass';
  if (name.includes('violao') || name.includes('acoustic') || name.includes('ac gtr')) return 'Violão / Acoustic';
  if (name.includes('guitar') || name.includes('guit') || name.includes('gtr') || name.includes('lead')) return 'Guitarra / E. Guitar';
  if (name.includes('key') || name.includes('piano') || name.includes('teclado') || name.includes('organ')) return 'Teclado / Keys';
  if (name.includes('pad') || name.includes('synth') || name.includes('atmosphere')) return 'Sintetizador / Pad';
  if (name.includes('vox lead') || name.includes('lead vox') || name.includes('voz princ') || name.includes('lead')) return 'Voz Principal / Lead Vox';
  if (name.includes('back') || name.includes('bv') || name.includes('vocal') || name.includes('choir') || name.includes('coro')) return 'Backing Vocal / BVs';
  if (name.includes('string') || name.includes('cordas') || name.includes('violin')) return 'Cordas / Strings';
  if (name.includes('brass') || name.includes('metais') || name.includes('tromp')) return 'Metais / Brass';
  return 'Outros / Loop';
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Generate waveform peaks array from AudioBuffer for visual rendering
function extractWaveformPeaks(buffer, samplePoints = 140) {
  if (!buffer) return [];
  const channelData = buffer.getChannelData(0);
  const step = Math.floor(channelData.length / samplePoints) || 1;
  const peaks = [];

  for (let i = 0; i < samplePoints; i++) {
    const start = i * step;
    const end = Math.min(start + step, channelData.length);
    let max = 0;
    for (let j = start; j < end; j++) {
      const val = Math.abs(channelData[j]);
      if (val > max) max = val;
    }
    peaks.push(Math.max(0.08, Math.min(1, max)));
  }
  return peaks;
}

export default function MultitrackModal({ song, isOpen, onClose, isAdmin }) {
  const [tracks, setTracks] = useState([]);
  const [activeTab, setActiveTab] = useState('player'); // 'player' | 'upload'
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [masterVolume, setMasterVolume] = useState(1);
  const [timelineZoom, setTimelineZoom] = useState(1);

  // Waveform peaks in-memory cache: trackId -> number[]
  const [waveforms, setWaveforms] = useState({});

  // Modal to edit track details (Nome, Tipo, Ícone) - Restricted to Admin
  const [editingTrack, setEditingTrack] = useState(null);
  const [editFormName, setEditFormName] = useState('');
  const [editFormInstrument, setEditFormInstrument] = useState('');
  const [editFormIcon, setEditFormIcon] = useState('');

  // Drag to reorder track state
  const [draggedTrackId, setDraggedTrackId] = useState(null);

  // Preloading & In-memory Buffers state
  const [loadingAudioState, setLoadingAudioState] = useState({
    isLoading: false,
    loadedCount: 0,
    totalCount: 0,
    progressPercent: 0,
    statusText: '',
  });

  // Upload states
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Web Audio refs
  const audioCtxRef = useRef(null);
  const audioBuffersRef = useRef({}); // trackId -> AudioBuffer
  const activeSourcesRef = useRef({}); // trackId -> AudioBufferSourceNode
  const trackNodesRef = useRef({}); // trackId -> { gainNode, pannerNode }
  const playbackStartTimeRef = useRef(0);
  const playbackStartOffsetRef = useRef(0);
  const animationFrameRef = useRef(null);
  const isSeekingRef = useRef(false);

  // Local storage key for current user mix settings (Volume, Pan, Mute, Solo)
  const localMixStorageKey = song?.id ? `multitrack_mix_${song.id}` : null;

  // Stop all audio and shut down Web Audio immediately
  const handleFullStopAudio = () => {
    Object.values(activeSourcesRef.current).forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    });
    activeSourcesRef.current = {};

    Object.values(trackNodesRef.current).forEach(({ gainNode, pannerNode }) => {
      try {
        if (pannerNode) pannerNode.disconnect();
        if (gainNode) gainNode.disconnect();
      } catch {}
    });
    trackNodesRef.current = {};

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        audioCtxRef.current.close();
      } catch {}
    }
    audioCtxRef.current = null;

    setIsPlaying(false);
  };

  const handleCloseModal = () => {
    handleFullStopAudio();
    audioBuffersRef.current = {};
    setCurrentTime(0);
    setDuration(0);
    onClose();
  };

  // Helper to load user-specific local mix from localStorage
  const getLocalMixSettings = () => {
    if (!localMixStorageKey || typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(localMixStorageKey);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  };

  // Helper to save user-specific local mix into localStorage
  const saveLocalMixSettings = (updatedTracks) => {
    if (!localMixStorageKey || typeof window === 'undefined') return;
    try {
      const mixData = {};
      updatedTracks.forEach((t) => {
        mixData[t.id] = {
          volume: t.volume,
          pan: t.pan,
          muted: t.muted,
          solo: t.solo,
        };
      });
      localStorage.setItem(localMixStorageKey, JSON.stringify(mixData));
    } catch (e) {
      console.warn('Erro ao salvar mix no localStorage:', e);
    }
  };

  // Load tracks list from Firebase Realtime Database and merge with LocalStorage personal mix
  useEffect(() => {
    if (!song?.id || !isOpen) return;

    const tracksRef = ref(db, `multitracks/${song.id}`);
    const unsubscribe = onValue(tracksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const localMix = getLocalMixSettings();

        const list = Object.entries(data).map(([trackId, trackData]) => {
          const userPersonalTrackMix = localMix[trackId] || {};
          return {
            id: trackId,
            ...trackData,
            volume: userPersonalTrackMix.volume ?? 0.85,
            pan: userPersonalTrackMix.pan ?? 0,
            muted: userPersonalTrackMix.muted ?? false,
            solo: userPersonalTrackMix.solo ?? false,
            customIcon: trackData.customIcon || null,
            order: trackData.order ?? 999,
          };
        });
        list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        setTracks(list);
      } else {
        setTracks([]);
      }
    });

    return () => unsubscribe();
  }, [song?.id, isOpen]);

  const getOrCreateAudioContext = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    return audioCtxRef.current;
  };

  // Preload and decode all audio files into RAM AudioBuffers
  const loadAllTracksIntoMemory = async (tracksToLoad) => {
    const ctx = getOrCreateAudioContext();
    if (!ctx || tracksToLoad.length === 0) return;

    const pendingTracks = tracksToLoad.filter((t) => !audioBuffersRef.current[t.id]);
    if (pendingTracks.length === 0) {
      let maxDur = 0;
      tracksToLoad.forEach((t) => {
        if (audioBuffersRef.current[t.id]) {
          maxDur = Math.max(maxDur, audioBuffersRef.current[t.id].duration);
        }
      });
      setDuration(Math.max(10, maxDur));
      return;
    }

    setLoadingAudioState({
      isLoading: true,
      loadedCount: 0,
      totalCount: pendingTracks.length,
      progressPercent: 0,
      statusText: 'Carregando faixas em memória...',
    });

    let loaded = 0;
    const newWaveforms = { ...waveforms };

    await Promise.all(
      pendingTracks.map(async (track) => {
        try {
          const res = await fetch(track.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuffer = await res.arrayBuffer();
          const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
          audioBuffersRef.current[track.id] = decodedBuffer;
          newWaveforms[track.id] = extractWaveformPeaks(decodedBuffer, 140);
        } catch (err) {
          console.error(`Erro ao carregar áudio [${track.name}]:`, err);
        } finally {
          loaded += 1;
          setLoadingAudioState({
            isLoading: true,
            loadedCount: loaded,
            totalCount: pendingTracks.length,
            progressPercent: Math.round((loaded / pendingTracks.length) * 100),
            statusText: `Carregando em memória (${loaded}/${pendingTracks.length})...`,
          });
        }
      })
    );

    setWaveforms(newWaveforms);

    let maxDuration = 0;
    tracksToLoad.forEach((t) => {
      if (audioBuffersRef.current[t.id]) {
        maxDuration = Math.max(maxDuration, audioBuffersRef.current[t.id].duration);
      }
    });
    setDuration(Math.max(10, maxDuration));

    setLoadingAudioState({
      isLoading: false,
      loadedCount: pendingTracks.length,
      totalCount: pendingTracks.length,
      progressPercent: 100,
      statusText: 'Pronto para tocar!',
    });
  };

  useEffect(() => {
    if (isOpen && tracks.length > 0) {
      loadAllTracksIntoMemory(tracks);
    }
  }, [tracks.length, isOpen]);

  // Setup routing graph
  useEffect(() => {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    tracks.forEach((track) => {
      if (!trackNodesRef.current[track.id]) {
        const gainNode = ctx.createGain();
        const pannerNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

        if (pannerNode) {
          pannerNode.connect(gainNode);
        }
        gainNode.connect(ctx.destination);

        gainNode.gain.value = track.volume * masterVolume;
        if (pannerNode) pannerNode.pan.value = track.pan;

        trackNodesRef.current[track.id] = { gainNode, pannerNode };
      }
    });

    Object.keys(trackNodesRef.current).forEach((existingId) => {
      if (!tracks.find((t) => t.id === existingId)) {
        delete trackNodesRef.current[existingId];
        delete audioBuffersRef.current[existingId];
      }
    });
  }, [tracks]);

  // Gains and Panners
  useEffect(() => {
    const hasAnySolo = tracks.some((t) => t.solo);

    tracks.forEach((track) => {
      const nodeObj = trackNodesRef.current[track.id];
      if (nodeObj && nodeObj.gainNode) {
        let effectiveVol = 0;
        if (hasAnySolo) {
          effectiveVol = track.solo && !track.muted ? track.volume * masterVolume : 0;
        } else {
          effectiveVol = track.muted ? 0 : track.volume * masterVolume;
        }
        nodeObj.gainNode.gain.setValueAtTime(effectiveVol, audioCtxRef.current?.currentTime || 0);

        if (nodeObj.pannerNode) {
          nodeObj.pannerNode.pan.setValueAtTime(track.pan, audioCtxRef.current?.currentTime || 0);
        }
      }
    });
  }, [tracks, masterVolume]);

  useEffect(() => {
    if (!isOpen) {
      handleFullStopAudio();
    }
    return () => {
      handleFullStopAudio();
    };
  }, [isOpen]);

  const stopAllActiveSources = () => {
    Object.values(activeSourcesRef.current).forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    });
    activeSourcesRef.current = {};
  };

  // Play synchronized from exact offset
  const startSynchronizedPlayback = (offsetSeconds) => {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    stopAllActiveSources();

    const baseStartTime = ctx.currentTime + 0.05;
    playbackStartTimeRef.current = baseStartTime;
    playbackStartOffsetRef.current = offsetSeconds;

    tracks.forEach((track) => {
      const buffer = audioBuffersRef.current[track.id];
      const nodes = trackNodesRef.current[track.id];
      if (!buffer || !nodes) return;

      if (offsetSeconds >= buffer.duration) return;

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      if (nodes.pannerNode) {
        source.connect(nodes.pannerNode);
      } else {
        source.connect(nodes.gainNode);
      }

      const remainingDuration = buffer.duration - offsetSeconds;
      if (remainingDuration > 0) {
        source.start(baseStartTime, offsetSeconds, remainingDuration);
      }

      activeSourcesRef.current[track.id] = source;
    });

    setIsPlaying(true);
  };

  const handlePlay = async () => {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const allLoaded = tracks.every((t) => audioBuffersRef.current[t.id]);
    if (!allLoaded) {
      await loadAllTracksIntoMemory(tracks);
    }

    startSynchronizedPlayback(currentTime);
  };

  const handlePause = () => {
    stopAllActiveSources();
    setIsPlaying(false);
  };

  const handleSeek = (newTime) => {
    isSeekingRef.current = true;
    setCurrentTime(newTime);
    if (isPlaying) {
      startSynchronizedPlayback(newTime);
    } else {
      playbackStartOffsetRef.current = newTime;
    }
    isSeekingRef.current = false;
  };

  useEffect(() => {
    if (isPlaying) {
      const updateLoop = () => {
        if (!isSeekingRef.current && audioCtxRef.current) {
          const elapsed = audioCtxRef.current.currentTime - playbackStartTimeRef.current;
          const currentPos = playbackStartOffsetRef.current + Math.max(0, elapsed);

          if (duration > 0 && currentPos >= duration) {
            handlePause();
            setCurrentTime(0);
            return;
          }
          setCurrentTime(currentPos);
        }
        animationFrameRef.current = requestAnimationFrame(updateLoop);
      };
      animationFrameRef.current = requestAnimationFrame(updateLoop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, duration]);

  // Open Edit Details Modal (Admin only)
  const handleOpenEditModal = (track) => {
    if (!isAdmin) return;
    setEditingTrack(track);
    setEditFormName(track.name);
    setEditFormInstrument(track.instrument);
    setEditFormIcon(track.customIcon || INSTRUMENT_PRESETS.find(p => p.name === track.instrument)?.icon || '🎵');
  };

  const handleSaveTrackDetails = async () => {
    if (!editingTrack || !isAdmin) return;
    const updatedName = editFormName.trim() || editingTrack.name;
    const updatedInstrument = editFormInstrument;
    const updatedIcon = editFormIcon;

    setTracks((prev) =>
      prev.map((t) =>
        t.id === editingTrack.id
          ? {
              ...t,
              name: updatedName,
              instrument: updatedInstrument,
              customIcon: updatedIcon,
            }
          : t
      )
    );

    try {
      await update(ref(db, `multitracks/${song.id}/${editingTrack.id}`), {
        name: updatedName,
        instrument: updatedInstrument,
        customIcon: updatedIcon,
      });
    } catch (err) {
      console.error('Erro ao salvar edição da faixa:', err);
    }

    setEditingTrack(null);
  };

  // Reorder tracks logic (Admin only)
  const handleDragStart = (trackId) => {
    if (!isAdmin) return;
    setDraggedTrackId(trackId);
  };

  const handleDragOverRow = (e) => {
    if (!isAdmin) return;
    e.preventDefault();
  };

  const handleDropOnRow = async (targetTrackId) => {
    if (!isAdmin || !draggedTrackId || draggedTrackId === targetTrackId) return;

    const reordered = [...tracks];
    const dragIdx = reordered.findIndex((t) => t.id === draggedTrackId);
    const dropIdx = reordered.findIndex((t) => t.id === targetTrackId);

    if (dragIdx === -1 || dropIdx === -1) return;

    const [movedItem] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, movedItem);

    const updates = {};
    const updatedTracks = reordered.map((item, index) => {
      updates[`multitracks/${song.id}/${item.id}/order`] = index;
      return { ...item, order: index };
    });

    setTracks(updatedTracks);
    setDraggedTrackId(null);

    try {
      await update(ref(db), updates);
    } catch (err) {
      console.error('Erro ao salvar reordenação:', err);
    }
  };

  // User-specific controls: volume, pan, mute, solo (Saved in LocalStorage only)
  const handleVolumeChange = (trackId, newVol) => {
    setTracks((prev) => {
      const updated = prev.map((t) => (t.id === trackId ? { ...t, volume: parseFloat(newVol) } : t));
      saveLocalMixSettings(updated);
      return updated;
    });
  };

  const handlePanChange = (trackId, newPan) => {
    setTracks((prev) => {
      const updated = prev.map((t) => (t.id === trackId ? { ...t, pan: parseFloat(newPan) } : t));
      saveLocalMixSettings(updated);
      return updated;
    });
  };

  const handleToggleMute = (trackId) => {
    setTracks((prev) => {
      const updated = prev.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t));
      saveLocalMixSettings(updated);
      return updated;
    });
  };

  const handleToggleSolo = (trackId) => {
    setTracks((prev) => {
      const updated = prev.map((t) => (t.id === trackId ? { ...t, solo: !t.solo } : t));
      saveLocalMixSettings(updated);
      return updated;
    });
  };

  // Upload handler for multiple instrument stems to MinIO (Admin only)
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin || !uploadFiles || uploadFiles.length === 0) return;

    setUploadProgress({ current: 0, total: uploadFiles.length, status: 'Iniciando upload...' });
    setUploadError('');

    try {
      const startingOrder = tracks.length;

      for (let i = 0; i < uploadFiles.length; i++) {
        const item = uploadFiles[i];
        
        // Ensure strictly .mp3 extension
        if (!item.file.name.toLowerCase().endsWith('.mp3')) {
          throw new Error(`O arquivo ${item.file.name} não é um arquivo .mp3 válido.`);
        }

        setUploadProgress({
          current: i + 1,
          total: uploadFiles.length,
          status: `Enviando: ${item.file.name}...`
        });

        const formData = new FormData();
        formData.append('songId', song.id);
        formData.append('instrument', item.instrument);
        formData.append('file', item.file);

        const response = await fetch('/api/multitracks/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Falha no envio de ${item.file.name}`);
        }

        const resData = await response.json();
        if (resData.track) {
          const defaultIcon = INSTRUMENT_PRESETS.find(p => p.name === item.instrument)?.icon || '🎵';
          const trackDataWithOrder = {
            ...resData.track,
            order: startingOrder + i,
            customIcon: defaultIcon,
          };
          const trackRef = ref(db, `multitracks/${song.id}/${resData.track.id}`);
          await set(trackRef, trackDataWithOrder);
        }
      }

      setUploadProgress(null);
      setUploadFiles([]);
      setActiveTab('player');
    } catch (err) {
      console.error('Upload multitrack error:', err);
      setUploadError(err.message);
      setUploadProgress(null);
    }
  };

  const handleDeleteTrack = async (track) => {
    if (!isAdmin) return;
    const confirmDel = confirm(`Excluir a faixa "${track.name}" (${track.instrument}) do MinIO?`);
    if (!confirmDel) return;

    try {
      if (isPlaying) handlePause();
      delete audioBuffersRef.current[track.id];

      await fetch(`/api/multitracks/upload?key=${encodeURIComponent(track.key)}`, {
        method: 'DELETE',
      });
      await remove(ref(db, `multitracks/${song.id}/${track.id}`));
    } catch (err) {
      console.error('Erro ao deletar faixa:', err);
      alert('Erro ao excluir faixa: ' + err.message);
    }
  };

  // Add files to upload queue - Strictly filtering .mp3 only
  const addFilesToUploadQueue = (filesList) => {
    const rawFiles = Array.from(filesList);
    const validMp3Files = rawFiles.filter((f) => f.name.toLowerCase().endsWith('.mp3'));

    if (validMp3Files.length === 0) {
      setUploadError('Atenção: Apenas arquivos com extensão .mp3 são permitidos para upload de multitracks.');
      return;
    }

    if (validMp3Files.length < rawFiles.length) {
      setUploadError('Alguns arquivos foram ignorados porque não possuem a extensão .mp3.');
    } else {
      setUploadError('');
    }

    const prepared = validMp3Files.map((file) => ({
      file,
      instrument: detectInstrument(file.name),
    }));
    setUploadFiles((prev) => [...prev, ...prepared]);
  };

  const handleDropFiles = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToUploadQueue(e.dataTransfer.files);
    }
  };

  const handleDragOverFiles = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeaveFiles = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  if (!isOpen || !song) return null;

  const totalTimelineDuration = Math.max(10, duration);
  const playheadPercent = totalTimelineDuration > 0 ? Math.min(100, Math.max(0, (currentTime / totalTimelineDuration) * 100)) : 0;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="px-5 py-2.5 border-b border-secondary/20 flex items-center justify-between bg-surface-container dark:bg-[#181816] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary dark:text-inverse-primary text-base">
              🎛️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary dark:text-inverse-primary tracking-wider">
                  Multitrack Player
                </span>
                <span className="text-xs text-on-surface-variant font-medium">
                  {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
                </span>
                <span className="text-[10px] text-on-surface-variant/70 italic hidden sm:inline">
                  &bull; Seus volumes/pan/mute são salvos no seu navegador
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-primary dark:text-[#fcf9f4] truncate">
                {song.song} <span className="font-normal text-on-surface-variant">&bull; {song.artist}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom selector */}
            {activeTab === 'player' && tracks.length > 0 && (
              <div className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-surface dark:bg-[#121210] border border-secondary/20 rounded-lg text-xs font-semibold mr-1">
                <span className="text-[10px] text-on-surface-variant uppercase font-bold">Zoom:</span>
                <button
                  onClick={() => setTimelineZoom((prev) => Math.max(0.6, prev - 0.2))}
                  className="px-1.5 py-0.5 bg-surface-container hover:bg-secondary/20 rounded font-bold cursor-pointer"
                  title="Diminuir zoom"
                >
                  -
                </button>
                <span className="font-mono text-[11px] w-9 text-center">{Math.round(timelineZoom * 100)}%</span>
                <button
                  onClick={() => setTimelineZoom((prev) => Math.min(2.5, prev + 0.2))}
                  className="px-1.5 py-0.5 bg-surface-container hover:bg-secondary/20 rounded font-bold cursor-pointer"
                  title="Aumentar zoom"
                >
                  +
                </button>
              </div>
            )}

            {/* Tabs */}
            <div className="flex bg-surface dark:bg-[#121210] border border-secondary/20 rounded-lg p-0.5 text-xs font-bold">
              <button
                onClick={() => setActiveTab('player')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'player'
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                Mixer
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  Upload Stems (.mp3) +
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="p-1.5 text-on-surface-variant hover:text-red-500 border border-secondary/20 hover:border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors ml-1 cursor-pointer"
              title="Fechar Studio (Interrompe Áudio)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab 1: Waveform Player & Mixer */}
        {activeTab === 'player' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            
            {/* Global Transport Control Bar */}
            <div className="px-5 py-2 bg-surface dark:bg-[#151513] border-b border-secondary/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={isPlaying ? handlePause : handlePlay}
                  disabled={tracks.length === 0 || loadingAudioState.isLoading}
                  className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shadow hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  title={isPlaying ? 'Pausar' : 'Reproduzir Sincronizado'}
                >
                  {loadingAudioState.isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : isPlaying ? (
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <div>
                  <div className="text-xs font-bold text-primary dark:text-[#fcf9f4] font-mono leading-tight">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                  <span className="text-[10px] text-on-surface-variant font-semibold">
                    {loadingAudioState.isLoading
                      ? 'Carregando faixas em RAM...'
                      : isPlaying
                      ? '● Reproduzindo Sincronizado'
                      : 'Pausado'}
                  </span>
                </div>
              </div>

              {/* Master Seek Progress Bar */}
              <div className="flex-1 w-full max-w-xl px-2">
                <input
                  type="range"
                  min="0"
                  max={totalTimelineDuration}
                  step="0.05"
                  value={currentTime}
                  disabled={tracks.length === 0 || loadingAudioState.isLoading}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-secondary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Master Volume */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase">Master:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                  className="w-20 h-1.5 bg-secondary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                  title={`Volume Geral: ${Math.round(masterVolume * 100)}%`}
                />
                <span className="text-[11px] font-mono text-on-surface-variant w-8 text-right">
                  {Math.round(masterVolume * 100)}%
                </span>
              </div>
            </div>

            {/* In-Memory Loading Bar */}
            {loadingAudioState.isLoading && (
              <div className="bg-primary/10 border-b border-primary/20 px-5 py-1 flex items-center justify-between text-xs font-semibold text-primary dark:text-inverse-primary shrink-0 animate-pulse">
                <span>{loadingAudioState.statusText}</span>
                <span>{loadingAudioState.progressPercent}%</span>
              </div>
            )}

            {/* Track List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {tracks.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center text-2xl mb-3">
                    🎵
                  </div>
                  <h3 className="text-base font-bold text-primary dark:text-[#fcf9f4]">
                    Nenhuma multitrack cadastrada
                  </h3>
                  <p className="text-xs text-on-surface-variant max-w-sm mt-1 mb-4">
                    {isAdmin
                      ? 'Envie as faixas separadas (.mp3) para habilitar o mixer.'
                      : 'Nenhuma multitrack foi adicionada a esta música pelo administrador ainda.'}
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl shadow hover:bg-primary-container transition-all cursor-pointer"
                    >
                      Enviar Multitracks (.mp3)
                    </button>
                  )}
                </div>
              ) : (
                tracks.map((track) => {
                  const preset = INSTRUMENT_PRESETS.find((p) => p.name === track.instrument) || {
                    icon: '🎵',
                    color: 'bg-primary/10 text-primary border-primary/20',
                  };
                  const trackIcon = track.customIcon || preset.icon;
                  const trackPeaks = waveforms[track.id] || [];

                  return (
                    <div
                      key={track.id}
                      draggable={isAdmin}
                      onDragStart={() => handleDragStart(track.id)}
                      onDragOver={handleDragOverRow}
                      onDrop={() => handleDropOnRow(track.id)}
                      className={`flex items-stretch rounded-lg border transition-all text-xs overflow-hidden ${
                        draggedTrackId === track.id
                          ? 'opacity-40 border-primary border-dashed'
                          : track.solo
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : track.muted
                          ? 'bg-surface-container/30 dark:bg-[#161614]/30 border-secondary/10 opacity-55'
                          : 'bg-white dark:bg-[#181816] border-secondary/15 hover:border-secondary/30 shadow-xs'
                      }`}
                    >
                      {/* Left Inspector / Mixer Strip */}
                      <div className="w-56 sm:w-64 p-2 bg-surface-container-low dark:bg-[#141412] border-r border-secondary/20 flex flex-col justify-between shrink-0 gap-1.5">
                        
                        {/* Top: Icon, Name, Admin Edit Button */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* Reorder Handle (Admin only) */}
                          {isAdmin && (
                            <div
                              className="cursor-grab active:cursor-grabbing text-on-surface-variant/40 hover:text-primary shrink-0 p-0.5"
                              title="Arraste para reordenar"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                              </svg>
                            </div>
                          )}

                          {/* Instrument Icon Badge */}
                          <span
                            onClick={() => isAdmin && handleOpenEditModal(track)}
                            className={`w-6 h-6 rounded flex items-center justify-center border text-xs shrink-0 ${preset.color} ${isAdmin ? 'cursor-pointer hover:scale-105' : ''}`}
                            title={isAdmin ? "Editar instrumento e ícone" : track.instrument}
                          >
                            {trackIcon}
                          </span>

                          {/* Track Name */}
                          <div className="truncate flex-1 min-w-0">
                            <h4
                              onClick={() => isAdmin && handleOpenEditModal(track)}
                              className={`font-bold text-xs text-primary dark:text-[#fcf9f4] truncate leading-tight ${isAdmin ? 'cursor-pointer hover:underline' : ''}`}
                              title={track.name}
                            >
                              {track.name}
                            </h4>
                            <span className="text-[10px] text-on-surface-variant truncate block">
                              {track.instrument}
                            </span>
                          </div>

                          {/* Admin Edit Details Button */}
                          {isAdmin && (
                            <button
                              onClick={() => handleOpenEditModal(track)}
                              className="text-on-surface-variant hover:text-primary p-1 rounded hover:bg-secondary/10 transition-colors shrink-0"
                              title="Editar Nome, Tipo e Ícone"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                          )}

                          {/* Delete track (Admin only) */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteTrack(track)}
                              className="text-on-surface-variant hover:text-red-500 p-1 rounded hover:bg-red-500/10 transition-colors shrink-0"
                              title="Excluir faixa"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Bottom: User Personal Controls (Mute, Solo, Pan, Volume) */}
                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-secondary/10">
                          {/* M / S */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleToggleMute(track.id)}
                              className={`w-5 h-5 rounded font-black text-[9px] border transition-all cursor-pointer flex items-center justify-center ${
                                track.muted
                                  ? 'bg-red-600 text-white border-red-700 shadow-xs'
                                  : 'bg-surface-container text-on-surface-variant hover:text-red-500 border-secondary/20'
                              }`}
                              title={track.muted ? 'Desmutar (Seu Mixer)' : 'Mutar (Seu Mixer)'}
                            >
                              M
                            </button>
                            <button
                              onClick={() => handleToggleSolo(track.id)}
                              className={`w-5 h-5 rounded font-black text-[9px] border transition-all cursor-pointer flex items-center justify-center ${
                                track.solo
                                  ? 'bg-amber-500 text-black border-amber-600 shadow-xs'
                                  : 'bg-surface-container text-on-surface-variant hover:text-amber-500 border-secondary/20'
                              }`}
                              title={track.solo ? 'Desativar Solo (Seu Mixer)' : 'Solar (Seu Mixer)'}
                            >
                              S
                            </button>
                          </div>

                          {/* PAN (Personal) */}
                          <div className="flex items-center gap-1 shrink-0" title={`Seu Pan: ${track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.abs(Math.round(track.pan * 100))}%` : `R${Math.round(track.pan * 100)}%`}`}>
                            <span className="text-[9px] font-bold text-secondary">L</span>
                            <input
                              type="range"
                              min="-1"
                              max="1"
                              step="0.05"
                              value={track.pan}
                              onChange={(e) => handlePanChange(track.id, e.target.value)}
                              className="w-10 h-1 bg-secondary/20 rounded appearance-none cursor-pointer accent-primary"
                            />
                            <span className="text-[9px] font-bold text-secondary">R</span>
                          </div>

                          {/* Volume (Personal) */}
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={track.volume}
                              onChange={(e) => handleVolumeChange(track.id, e.target.value)}
                              className="w-12 h-1 bg-secondary/20 rounded appearance-none cursor-pointer accent-primary"
                              title={`Seu Volume: ${Math.round(track.volume * 100)}%`}
                            />
                            <span className="text-[9px] font-mono text-on-surface-variant w-5 text-right">
                              {Math.round(track.volume * 100)}
                            </span>
                          </div>
                        </div>

                      </div>

                      {/* Right Waveform Display Lane */}
                      <div
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                          handleSeek(ratio * totalTimelineDuration);
                        }}
                        className="relative flex-1 h-14 bg-surface-container/20 dark:bg-[#10100e] overflow-hidden cursor-pointer select-none"
                        title="Clique para navegar na música"
                      >
                        {/* Playhead Vertical Line */}
                        <div
                          className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                          style={{ left: `${playheadPercent}%` }}
                        ></div>

                        {/* Full Track Waveform Container */}
                        <div
                          className={`absolute inset-1 rounded-md border shadow-xs z-10 flex items-center overflow-hidden transition-colors ${
                            track.solo
                              ? 'bg-amber-500/20 border-amber-500/60'
                              : track.muted
                              ? 'bg-secondary/10 border-secondary/20 opacity-60'
                              : 'bg-primary/20 dark:bg-primary/30 border-primary/50'
                          }`}
                        >
                          <div
                            className="flex items-center gap-[1px] w-full h-full px-3 justify-between overflow-hidden pointer-events-none"
                            style={{ transform: `scaleX(${timelineZoom})`, transformOrigin: 'left' }}
                          >
                            {trackPeaks.length > 0 ? (
                              trackPeaks.map((peak, idx) => (
                                <div
                                  key={idx}
                                  className={`w-[2px] rounded-full transition-all shrink-0 ${
                                    track.solo
                                      ? 'bg-amber-400'
                                      : track.muted
                                      ? 'bg-secondary/40'
                                      : 'bg-primary'
                                  }`}
                                  style={{ height: `${Math.round(peak * 100)}%` }}
                                ></div>
                              ))
                            ) : (
                              <div className="text-[10px] text-on-surface-variant/40 italic">
                                Carregando onda...
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Upload Multitrack Stems (Admin only & strictly .mp3) */}
        {activeTab === 'upload' && isAdmin && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div
              onDrop={handleDropFiles}
              onDragOver={handleDragOverFiles}
              onDragLeave={handleDragLeaveFiles}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                isDragOver
                  ? 'border-primary bg-primary/10 scale-[1.01]'
                  : 'border-secondary/30 bg-surface-container/20 hover:border-primary'
              }`}
            >
              <input
                type="file"
                multiple
                accept=".mp3,audio/mpeg"
                id="stem-files"
                onChange={(e) => addFilesToUploadQueue(e.target.files)}
                className="hidden"
              />
              <label htmlFor="stem-files" className="cursor-pointer flex flex-col items-center">
                <span className="text-4xl mb-3">📁</span>
                <span className="text-base font-bold text-primary dark:text-[#fcf9f4]">
                  {isDragOver ? 'Solte os arquivos .mp3 aqui agora!' : 'Arraste e solte seus arquivos .mp3 aqui'}
                </span>
                <span className="text-xs text-on-surface-variant mt-1 font-semibold">
                  ou clique para selecionar &bull; Formato aceito: <span className="text-primary font-bold">.mp3</span>
                </span>
              </label>
            </div>

            {uploadError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
                {uploadError}
              </div>
            )}

            {uploadFiles.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-primary dark:text-[#fcf9f4]">
                    Faixas .mp3 Prontas para Upload ({uploadFiles.length})
                  </h3>
                  <button
                    onClick={() => setUploadFiles([])}
                    className="text-xs text-red-500 hover:underline cursor-pointer"
                  >
                    Limpar lista
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {uploadFiles.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#181816] border border-secondary/20 text-xs gap-3"
                    >
                      <div className="truncate flex-1">
                        <span className="font-bold text-primary dark:text-[#fcf9f4] block truncate">
                          {item.file.name}
                        </span>
                        <span className="text-[10px] text-on-surface-variant">
                          {(item.file.size / (1024 * 1024)).toFixed(2)} MB &bull; MP3
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={item.instrument}
                          onChange={(e) => {
                            const val = e.target.value;
                            setUploadFiles((prev) =>
                              prev.map((f, i) => (i === index ? { ...f, instrument: val } : f))
                            );
                          }}
                          className="bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary dark:text-[#fcf9f4] focus:outline-none cursor-pointer"
                        >
                          {INSTRUMENT_PRESETS.map((preset) => (
                            <option key={preset.name} value={preset.name}>
                              {preset.icon} {preset.name}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => setUploadFiles((prev) => prev.filter((_, i) => i !== index))}
                          className="text-on-surface-variant hover:text-red-500 p-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {uploadProgress && (
                  <div className="space-y-2 py-2">
                    <div className="flex justify-between text-xs font-bold text-primary dark:text-[#fcf9f4]">
                      <span>{uploadProgress.status}</span>
                      <span>{uploadProgress.current} / {uploadProgress.total}</span>
                    </div>
                    <div className="w-full h-2 bg-secondary/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleUploadSubmit}
                  disabled={uploadProgress !== null}
                  className="w-full py-3.5 bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploadProgress ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Enviando para o MinIO...</span>
                    </>
                  ) : (
                    <span>Salvar Faixas .mp3 no Bucket MinIO</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Edit Track Modal (Admin only: Nome, Tipo, Ícone) */}
      {editingTrack && isAdmin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#181816] max-w-md w-full rounded-2xl p-6 shadow-2xl border border-secondary/20 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-secondary/15 pb-3">
              <h3 className="font-bold text-base text-primary dark:text-[#fcf9f4]">
                Editar Detalhes da Faixa (Admin)
              </h3>
              <button
                onClick={() => setEditingTrack(null)}
                className="text-on-surface-variant hover:text-primary cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block">
                Nome da Faixa
              </label>
              <input
                type="text"
                value={editFormName}
                onChange={(e) => setEditFormName(e.target.value)}
                placeholder="Ex: Bateria Principal"
                className="w-full px-3 py-2 bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-xl text-sm text-primary dark:text-[#fcf9f4] outline-none focus:border-primary"
              />
            </div>

            {/* Instrumento / Categoria */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block">
                Tipo de Instrumento
              </label>
              <select
                value={editFormInstrument}
                onChange={(e) => {
                  setEditFormInstrument(e.target.value);
                  const p = INSTRUMENT_PRESETS.find(pr => pr.name === e.target.value);
                  if (p) setEditFormIcon(p.icon);
                }}
                className="w-full px-3 py-2 bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-xl text-sm text-primary dark:text-[#fcf9f4] outline-none focus:border-primary cursor-pointer"
              >
                {INSTRUMENT_PRESETS.map((preset) => (
                  <option key={preset.name} value={preset.name}>
                    {preset.icon} {preset.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Ícone Personalizado */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block">
                Escolher Ícone
              </label>
              <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 p-2 bg-surface-container/20 border border-secondary/20 rounded-xl max-h-32 overflow-y-auto">
                {AVAILABLE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setEditFormIcon(icon)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all cursor-pointer border ${
                      editFormIcon === icon
                        ? 'bg-primary/20 border-primary scale-110 shadow-sm'
                        : 'hover:bg-secondary/20 border-transparent'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 justify-end pt-2 border-t border-secondary/15">
              <button
                type="button"
                onClick={() => setEditingTrack(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-secondary/30 hover:bg-secondary/10 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTrackDetails}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-on-primary hover:bg-primary-container cursor-pointer shadow-sm"
              >
                Salvar no Banco
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
