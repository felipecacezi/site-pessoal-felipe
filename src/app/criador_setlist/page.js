'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { ref, set, get, onValue } from 'firebase/database';
import { db } from '../services/firebase';
import { sortRawDriveFiles } from '../../utils/audio-sorter';

const API_KEY = process.env.NEXT_PUBLIC_VITE_API_KEY || 'AIzaSyD-WBcFFDuF3gtvonCn4KHAOgHYf9p1qsk'; 
const FOLDER_ID = '1rs-JyMfdMpdwPNCrHEzF85W3pDGcye99'; 
const DOCS_FOLDER_ID = '1-c8JlX8Agow-0ZPTo9nTjQnJG8BPRfXA'; 
const PAGE_SIZE = 10;

const alphabet = ['Todos', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

// SVG Icons
const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.637Z" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z" />
  </svg>
);

const DescriptionIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

const MusicOffIcon = () => (
  <svg className="w-10 h-10 mx-auto text-secondary/60 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 0v10.5m0-10.5H9m0 0v10.5m0-10.5L19.5 6M9 19.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm10.5-3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

export default function SetlistPage() {
  const { lang, toggleLanguage, theme, toggleTheme, t, mounted } = useApp();
  const { user, isApproved, loading: authLoading } = useAuth();
  const router = useRouter();

  // Repertoire list retrieved from Realtime Database
  const [allDbSongs, setAllDbSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  
  // Navigation, Search & Filters
  const [currentFilter, setCurrentFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [setlistDate, setSetlistDate] = useState('');
  const [sundayShift, setSundayShift] = useState('Manhã');
  const [modalSearch, setModalSearch] = useState('');
  const [selectedSongsSet, setSelectedSongsSet] = useState(new Set());

  // String normalization for letter matching
  const strictNormalize = (str) => {
    if (!str) return '';
    return str
      .replace(/\.(mp3|docx?|txt|gdoc|pdf)$/i, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  };

  const formatSeconds = (totalSeconds) => {
    if (!totalSeconds || isNaN(totalSeconds) || totalSeconds === Infinity) return null;
    const secs = Math.floor(totalSeconds);
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Route protection
  useEffect(() => {
    if (!authLoading && (!user || !isApproved)) {
      router.push('/login');
    }
  }, [user, isApproved, authLoading, router]);

  // Realtime Database subscription to load list
  useEffect(() => {
    if (!user || !isApproved) return;

    const musicasRef = ref(db, 'musicas');
    const unsubscribe = onValue(musicasRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.values(data);
        // Sort alphabetically by artist or song title
        list.sort((a, b) => {
          const nameA = a.artist !== 'Desconhecido' ? a.artist : a.song;
          const nameB = b.artist !== 'Desconhecido' ? b.artist : b.song;
          return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
        });
        setAllDbSongs(list);
      } else {
        setAllDbSongs([]);
      }
    });

    // Run silent background sync only if last sync was > 10 minutes ago
    const lastSync = localStorage.getItem('last-drive-sync');
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    if (!lastSync || now - Number(lastSync) > tenMinutes) {
      const timer = setTimeout(() => {
        syncGoogleDriveToDb(true); // Silent background sync
      }, 3000);
      return () => {
        unsubscribe();
        clearTimeout(timer);
      };
    }

    return () => unsubscribe();
  }, [user, isApproved]);

  // Audio minutage extraction fallback
  const triggerDurationFallbackAndSave = async (fileId, songData) => {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`);
      if (res.ok) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const audio = new Audio();
        audio.src = objectUrl;
        audio.onloadedmetadata = async () => {
          const formatted = formatSeconds(audio.duration);
          if (formatted) {
            await set(ref(db, `musicas/${fileId}`), {
              ...songData,
              duration: formatted
            });
          }
          URL.revokeObjectURL(objectUrl);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(objectUrl);
        };
      }
    } catch (err) {
      console.warn(`Erro na fila de minutagem para ${fileId}`, err);
    }
  };

  // Sync Google Drive files to Firebase Realtime Database
  const syncGoogleDriveToDb = async (isSilent = false) => {
    if (syncing) return;
    if (!isSilent) setLoading(true);
    setSyncing(true);
    try {
      // 1. Fetch Docs map (letras)
      const qDocs = encodeURIComponent(`'${DOCS_FOLDER_ID}' in parents and trashed = false`);
      const docsResponse = await fetch(`https://www.googleapis.com/drive/v3/files?pageSize=1000&q=${qDocs}&fields=files(id,name)&key=${API_KEY}`);
      const docsMapLocal = new Map();
      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        if (docsData.files) {
          docsData.files.forEach(doc => {
            docsMapLocal.set(strictNormalize(doc.name), doc.id);
          });
        }
      }

      // 2. Fetch Audios from Google Drive (up to 1000)
      const qAudios = encodeURIComponent(`'${FOLDER_ID}' in parents and trashed = false`);
      const audiosResponse = await fetch(`https://www.googleapis.com/drive/v3/files?pageSize=1000&q=${qAudios}&fields=files(id,name,videoMediaMetadata)&key=${API_KEY}`);
      if (!audiosResponse.ok) throw new Error("Google Drive API request failed");
      const audiosData = await audiosResponse.json();
      if (!audiosData.files) return;

      // 3. Fetch current DB entries
      const dbSnap = await get(ref(db, 'musicas'));
      const dbMusicas = dbSnap.exists() ? dbSnap.val() : {};

      // 4. Process each file
      for (const file of audiosData.files) {
        const cleanName = file.name.replace(/\.mp3$/i, '').trim();
        let artist = 'Desconhecido';
        let song = cleanName;

        if (cleanName.includes(' - ')) {
          const parts = cleanName.split(' - ');
          artist = parts[0].trim();
          song = parts.slice(1).join(' - ').trim();
        }

        const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(artist)}&backgroundColor=e2e8f0&textColor=475569`;
        
        // Find doc url (cruzamento com a letra)
        const strictAudioName = strictNormalize(cleanName);
        let matchedDocId = docsMapLocal.get(strictAudioName);
        if (!matchedDocId && song) {
          matchedDocId = docsMapLocal.get(strictNormalize(song));
        }
        const docUrl = matchedDocId ? `https://drive.google.com/file/d/${matchedDocId}/view` : null;

        // Resolve duration
        let durationStr = null;
        const durationMs = file.videoMediaMetadata?.durationMillis;
        if (durationMs) {
          durationStr = formatSeconds(Number(durationMs) / 1000);
        } else if (dbMusicas[file.id]?.duration && dbMusicas[file.id].duration !== 'carregando...') {
          durationStr = dbMusicas[file.id].duration;
        }

        const songRef = ref(db, `musicas/${file.id}`);
        const existingSong = dbMusicas[file.id];

        // Determine if data requires an update
        const needsUpdate = !existingSong || 
                            existingSong.artist !== artist || 
                            existingSong.song !== song || 
                            existingSong.docUrl !== docUrl || 
                            existingSong.duration !== (durationStr || 'carregando...');

        if (needsUpdate) {
          const newSongData = {
            id: file.id,
            artist,
            song,
            duration: durationStr || 'carregando...',
            avatar: avatarUrl,
            docUrl,
            updatedAt: new Date().toISOString()
          };
          await set(songRef, newSongData);

          // If duration is missing, extract and update it
          if (!durationStr) {
            triggerDurationFallbackAndSave(file.id, newSongData);
          }
        }
      }
      localStorage.setItem('last-drive-sync', String(Date.now()));
    } catch (err) {
      console.warn("Sync execution error:", err);
    } finally {
      setSyncing(false);
      if (!isSilent) setLoading(false);
    }
  };

  // Filter songs locally based on search query & letter filters
  const getFilteredSongs = () => {
    return allDbSongs.filter(item => {
      // 1. Apply A-Z Filter
      if (currentFilter !== 'Todos') {
        const firstChar = item.artist !== 'Desconhecido' ? item.artist[0] : item.song[0];
        if (firstChar.toLowerCase() !== currentFilter.toLowerCase()) {
          return false;
        }
      }
      // 2. Apply Search Query
      if (searchQuery.trim() !== '') {
        const searchStr = `${item.artist} ${item.song}`.toLowerCase();
        if (!searchStr.includes(searchQuery.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  };

  // Local Pagination Logic
  const filteredSongs = getFilteredSongs();
  const totalPages = Math.ceil(filteredSongs.length / PAGE_SIZE);
  const paginatedSongs = filteredSongs.slice(
    currentPageIndex * PAGE_SIZE,
    (currentPageIndex + 1) * PAGE_SIZE
  );

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const toggleSelectSong = (id) => {
    setSelectedSongsSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Reset page index on search/filter update
  useEffect(() => {
    setCurrentPageIndex(0);
  }, [currentFilter, searchQuery]);

  const isSundaySelected = () => {
    if (!setlistDate) return false;
    const dateObj = new Date(setlistDate + 'T00:00:00');
    return dateObj.getDay() === 0;
  };

  const getFormattedDate = () => {
    if (!setlistDate) return '';
    const parts = setlistDate.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getWhatsAppMessage = () => {
    const dateFormatted = getFormattedDate();
    let headerTitle = `*SETLIST - ${dateFormatted}*`;
    if (isSundaySelected()) {
      const shiftText = sundayShift === 'Manhã' ? (lang === 'pt' ? 'Manhã' : 'Morning') : (lang === 'pt' ? 'Noite' : 'Night');
      headerTitle = `*SETLIST - ${dateFormatted} (${lang === 'pt' ? 'Domingo' : 'Sunday'} - ${shiftText})*`;
    }

    let msg = `${headerTitle}\n\n`;
    // We match the selected set from the complete database list
    const selectedFiles = allDbSongs.filter(item => selectedSongsSet.has(item.id));
    selectedFiles.forEach((item) => {
      msg += `* ${item.artist} - ${item.song}\n       - Audio: https://drive.google.com/file/d/${item.id}/view\n`;
      if (item.docUrl) {
        msg += `       - ${lang === 'pt' ? 'Letra' : 'Lyrics'}: ${item.docUrl}\n`;
      }
    });

    return msg.trim();
  };

  const handleWhatsAppSend = () => {
    const finalMsg = getWhatsAppMessage();
    const encodedMessage = encodeURIComponent(finalMsg);
    window.open(`https://api.whatsapp.com/send?text=${encodedMessage}`, '_blank');
  };

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#121210]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isApproved) return null;

  return (
    <div className="max-w-7xl mx-auto min-h-screen py-6 sm:py-10 px-6 md:px-12">
      {/* Cabeçalho */}
      <header className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-secondary/20 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary dark:text-[#fcf9f4]">
            {t('setlist_title')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-on-surface-variant dark:text-[#d1c4bb]">
            {t('setlist_subtitle')}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full lg:w-auto">
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full">
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-secondary/30 dark:border-secondary/50 rounded overflow-hidden text-xs">
                <button
                  onClick={() => toggleLanguage('pt')}
                  className={`px-3 py-1.5 font-bold transition-all ${
                    lang === 'pt' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container dark:bg-inverse-surface text-primary dark:text-[#fcf9f4] hover:bg-secondary/15'
                  }`}
                >
                  PT
                </button>
                <button
                  onClick={() => toggleLanguage('en')}
                  className={`px-3 py-1.5 font-bold transition-all ${
                    lang === 'en' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container dark:bg-inverse-surface text-primary dark:text-[#fcf9f4] hover:bg-secondary/15'
                  }`}
                >
                  EN
                </button>
              </div>

              <button
                onClick={toggleTheme}
                className="p-2.5 border border-secondary/30 dark:border-secondary/50 rounded-lg text-primary dark:text-inverse-primary hover:bg-secondary/10 transition-colors"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </button>

              <button
                onClick={() => syncGoogleDriveToDb(false)}
                disabled={syncing}
                className="p-2.5 border border-secondary/30 dark:border-secondary/50 rounded-lg text-primary dark:text-inverse-primary hover:bg-secondary/10 transition-colors cursor-pointer"
                title="Sincronizar com Google Drive"
              >
                <svg className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>

              <Link
                href="/restricted"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold border border-secondary/30 dark:border-secondary/50 rounded-lg hover:bg-secondary/10 text-primary dark:text-inverse-primary"
              >
                Painel
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                setModalStep(1);
                setModalSearch('');
                setModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-on-primary font-semibold hover:bg-primary-container hover:text-on-primary-container rounded-lg transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              <PlusIcon />
              <span>{t('new_setlist')}</span>
            </button>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm shadow-sm transition-shadow text-primary dark:text-[#fcf9f4] outline-none"
              />
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                <SearchIcon />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Alphabet Filter Tabs */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto whitespace-nowrap py-2 border-b border-secondary/10">
        <span className="text-xs font-bold text-on-surface-variant dark:text-[#d1c4bb] uppercase tracking-wider mr-2 shrink-0">
          {t('filter_label')}
        </span>
        {alphabet.map((letter) => (
          <button
            key={letter}
            onClick={() => setCurrentFilter(letter)}
            className={`px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              currentFilter === letter ? 'tab-active border-primary' : 'tab-inactive border-secondary/20'
            }`}
          >
            {letter === 'Todos' ? t('filter_all_letters') : letter}
          </button>
        ))}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-error-container border-l-4 border-error p-4 rounded-xl mb-6 shadow-sm">
          <p className="text-on-error-container text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Main List */}
      {!loading && !error && paginatedSongs.length > 0 && (
        <div className="w-full">
          <div className="w-full bg-surface-container-lowest dark:bg-[#1c1c19]/30 border border-secondary/20 rounded-xl shadow-sm overflow-hidden">
            <div className="hidden md:flex items-center py-3.5 px-6 bg-surface-container dark:bg-[#121210] border-b border-secondary/20 text-xs font-bold text-primary dark:text-[#fcf9f4] uppercase tracking-wider gap-4">
              <div className="w-8 shrink-0 text-center">#</div>
              <div className="w-10 shrink-0">Img</div>
              <div className="w-1/3 shrink-0">{t('col_artist')}</div>
              <div className="flex-1 min-w-0">{t('col_song')}</div>
              <div className="w-24 shrink-0 text-center">{t('col_time')}</div>
              <div className="w-28 shrink-0 text-right">{t('col_actions')}</div>
            </div>

            <ul className="divide-y divide-secondary/10 flex flex-col">
              {paginatedSongs.map((item, idx) => {
                const songIndex = currentPageIndex * PAGE_SIZE + idx + 1;
                return (
                  <li key={item.id} className="flex flex-col md:flex-row md:items-center py-4 px-5 md:px-6 hover:bg-surface-container/20 dark:hover:bg-[#1c1c19]/50 transition-colors gap-3 md:gap-4">
                    <div className="hidden md:block w-8 shrink-0 text-center text-xs font-bold text-on-surface-variant/70">
                      {songIndex}
                    </div>
                    
                    <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                      <img
                        src={item.avatar}
                        alt={item.artist}
                        className="w-10 h-10 rounded-full border border-secondary/15 shadow-sm object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="md:hidden text-[10px] font-bold text-secondary/60 block mb-0.5">
                          #{songIndex}
                        </span>
                        <h4 className="font-bold text-sm sm:text-base text-primary dark:text-[#fcf9f4] truncate">
                          {item.artist}
                        </h4>
                        <p className="text-xs sm:text-sm text-on-surface-variant dark:text-[#d1c4bb] truncate">
                          {item.song}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-center w-full md:w-24 shrink-0 text-xs md:text-sm text-on-surface-variant dark:text-[#d1c4bb] mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-secondary/10">
                      <span className="md:hidden font-bold">{t('col_time')}:</span>
                      <span className="px-2.5 py-1 text-xs font-bold bg-secondary-container text-on-secondary-container dark:bg-primary-container/20 dark:text-inverse-primary rounded-full border border-secondary/15 shadow-sm">
                        {item.duration}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-2 md:mt-0">
                      {item.docUrl ? (
                        <a
                          href={item.docUrl}
                          target="_blank"
                          rel="noreferrer"
                          title={t('lyrics_title')}
                          className="p-2 border border-secondary/20 hover:bg-secondary/10 rounded-lg text-primary dark:text-[#fcf9f4] transition-colors"
                        >
                          <DescriptionIcon />
                        </a>
                      ) : (
                        <button
                          disabled
                          title={t('no_lyrics')}
                          className="p-2 border border-transparent opacity-20 text-on-surface-variant cursor-not-allowed"
                        >
                          <DescriptionIcon />
                        </button>
                      )}

                      <a
                        href={`https://drive.google.com/file/d/${item.id}/view`}
                        target="_blank"
                        rel="noreferrer"
                        title={t('play_drive')}
                        className="p-2 border border-secondary/20 hover:bg-secondary/10 rounded-lg text-primary dark:text-[#fcf9f4] transition-colors"
                      >
                        <PlayIcon />
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Pagination */}
          <footer className="mt-6 flex items-center justify-between bg-surface-container-lowest dark:bg-inverse-surface px-4 py-3 border border-secondary/20 rounded-xl shadow-sm text-sm">
            <button
              onClick={handlePrevPage}
              disabled={currentPageIndex === 0}
              className="px-4 py-2 border border-secondary/30 rounded-lg text-sm font-semibold text-primary dark:text-[#fcf9f4] bg-surface dark:bg-[#121210] hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              &larr; {t('btn_prev')}
            </button>
            <span className="font-semibold text-primary dark:text-[#fcf9f4] text-xs sm:text-sm">
              Página {currentPageIndex + 1} de {totalPages || 1}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPageIndex >= totalPages - 1}
              className="px-4 py-2 border border-secondary/30 rounded-lg text-sm font-semibold text-primary dark:text-[#fcf9f4] bg-surface dark:bg-[#121210] hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {t('btn_next')} &rarr;
            </button>
          </footer>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredSongs.length === 0 && (
        <div className="py-16 text-center text-on-surface-variant bg-surface-container-lowest dark:bg-inverse-surface border border-secondary/20 rounded-xl shadow-sm mt-4">
          <MusicOffIcon />
          <p className="text-lg font-bold text-primary dark:text-[#fcf9f4]">{t('empty_title')}</p>
          <p className="text-sm mt-1">{t('empty_desc')}</p>
        </div>
      )}

      {/* Playlist Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-surface-bright dark:bg-inverse-surface rounded-xl border border-secondary/30 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300">
            
            <div className="px-5 py-4 border-b border-secondary/20 flex items-center justify-between bg-surface-container dark:bg-[#121210]">
              <h3 className="text-base sm:text-lg font-bold text-primary dark:text-[#fcf9f4]">
                {t('modal_build')}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-on-surface-variant hover:text-primary p-2 border border-secondary/15 rounded-lg"
              >
                <CloseIcon />
              </button>
            </div>

            {/* STEP 1 */}
            {modalStep === 1 && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-secondary/20 bg-surface-container-low dark:bg-[#121210]/50 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="setlist-date" className="block font-semibold text-xs text-primary dark:text-[#fcf9f4] mb-1.5 uppercase tracking-wider">
                        {t('modal_date')}
                      </label>
                      <input
                        type="date"
                        id="setlist-date"
                        value={setlistDate}
                        onChange={(e) => setSetlistDate(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary text-primary dark:text-[#fcf9f4] outline-none"
                      />
                    </div>
                    {isSundaySelected() && (
                      <div>
                        <label htmlFor="sunday-shift" className="block font-semibold text-xs text-primary dark:text-[#fcf9f4] mb-1.5 uppercase tracking-wider">
                          {t('modal_period')}
                        </label>
                        <select
                          id="sunday-shift"
                          value={sundayShift}
                          onChange={(e) => setSundayShift(e.target.value)}
                          className="w-full px-3 py-2.5 bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary text-primary dark:text-[#fcf9f4] outline-none cursor-pointer"
                        >
                          <option value="Manhã">{t('period_morning')}</option>
                          <option value="Noite">{t('period_night')}</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder={t('filter_songs')}
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary text-primary dark:text-[#fcf9f4] outline-none"
                  />
                </div>

                <div className="flex-1 overflow-y-auto p-4 divide-y divide-secondary/10">
                  {allDbSongs
                    .filter(item => {
                      if (!modalSearch.trim()) return true;
                      const searchStr = `${item.artist} ${item.song}`.toLowerCase();
                      return searchStr.includes(modalSearch.toLowerCase());
                    })
                    .map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleSelectSong(item.id)}
                        className="flex items-center justify-between py-3.5 cursor-pointer hover:bg-surface-container-low dark:hover:bg-[#121210]/30 px-3 rounded-lg transition-colors"
                      >
                        <div>
                          <p className="text-sm font-bold text-primary dark:text-[#fcf9f4]">{item.artist}</p>
                          <p className="text-xs text-on-surface-variant dark:text-[#d1c4bb] mt-0.5">{item.song}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedSongsSet.has(item.id)}
                          onChange={() => {}}
                          className="rounded text-primary focus:ring-primary h-4.5 w-4.5 border-secondary/30 cursor-pointer"
                        />
                      </div>
                    ))}
                </div>

                <div className="px-5 py-4 border-t border-secondary/20 bg-surface-container-low dark:bg-[#121210]/50 flex items-center justify-between gap-3">
                  <span className="text-xs sm:text-sm font-bold text-primary dark:text-[#fcf9f4]">
                    {selectedSongsSet.size} {t('selected_count')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-primary dark:text-[#fcf9f4] hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={() => setModalStep(2)}
                      disabled={selectedSongsSet.size === 0 || !setlistDate}
                      className="px-5 py-2.5 text-xs sm:text-sm font-bold text-on-primary bg-primary hover:bg-primary-container rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {t('btn_review_setlist')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {modalStep === 2 && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 flex-1 flex flex-col overflow-hidden space-y-4">
                  <div className="p-4 bg-secondary-container dark:bg-primary-container/20 border border-secondary/30 rounded-xl text-xs sm:text-sm text-on-secondary-container dark:text-[#fcf9f4] leading-relaxed">
                    <p><strong>Data:</strong> <span>{getFormattedDate()}</span></p>
                    {isSundaySelected() && (
                      <p className="mt-1"><strong>Período:</strong> <span>{sundayShift}</span></p>
                    )}
                  </div>

                  <label className="block text-xs font-bold text-primary dark:text-[#fcf9f4] uppercase tracking-wider">
                    {t('modal_review')}
                  </label>
                  <div className="flex-1 overflow-y-auto p-4 bg-surface-container dark:bg-[#121210] border border-secondary/20 rounded-xl font-mono text-xs whitespace-pre-wrap text-primary dark:text-[#fcf9f4] leading-relaxed select-all">
                    {getWhatsAppMessage()}
                  </div>
                </div>

                <div className="px-5 py-4 border-t border-secondary/20 bg-surface-container-low dark:bg-[#121210]/50 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setModalStep(1)}
                    className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-primary dark:text-[#fcf9f4] hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
                  >
                    &larr; {t('back')}
                  </button>
                  <button
                    onClick={handleWhatsAppSend}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-green-700 hover:bg-green-800 rounded-lg transition-colors shadow-sm cursor-pointer"
                  >
                    <WhatsAppIcon />
                    <span>{t('btn_send_whatsapp')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
