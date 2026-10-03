'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { ref, set, push, remove, onValue } from 'firebase/database';
import { db } from '../services/firebase';

export default function GerenciadorEquipes() {
  const { user, isApproved, loading: authLoading, hasToolAccess, can } = useAuth();
  const router = useRouter();

  // Route protection
  useEffect(() => {
    if (!authLoading) {
      if (!user || !isApproved) {
        router.push('/login');
      } else if (!hasToolAccess('gerenciador_equipes')) {
        router.push('/restricted');
      }
    }
  }, [user, isApproved, authLoading, router, hasToolAccess]);

  // State Management
  const [equipes, setEquipes] = useState([]);
  const [membrosGlobal, setMembrosGlobal] = useState({});
  const [escalas, setEscalas] = useState([]);
  
  const [loadingEquipes, setLoadingEquipes] = useState(true);
  const [loadingMembros, setLoadingMembros] = useState(true);
  const [loadingEscalas, setLoadingEscalas] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dashboard Tab State: 'equipes' | 'escalas'
  const [activeTab, setActiveTab] = useState('equipes');

  // View state inside 'escalas' tab: 'list' | 'calendar' | 'timeline'
  const [escalasViewMode, setEscalasViewMode] = useState('list');
  // Calendar current month (date object)
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [calendarSelectedTeamId, setCalendarSelectedTeamId] = useState('');
  const [timelineSelectedTeamId, setTimelineSelectedTeamId] = useState('');

  // Navigation View State: 'list' | 'team-form' | 'members-manager' | 'escala-form' | 'escala-lote-form'
  const [currentView, setCurrentView] = useState('list');
  const [activeTeamId, setActiveTeamId] = useState(null);

  // Form State: Team
  const [editingId, setEditingId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formLeader, setFormLeader] = useState('');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formFunctions, setFormFunctions] = useState([]);
  const [currentFunctionInput, setCurrentFunctionInput] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State: Member
  const [memberAddMode, setMemberAddMode] = useState('select-existing');
  const [selectedExistingMemberId, setSelectedExistingMemberId] = useState('');
  const [memberFormName, setMemberFormName] = useState('');
  const [memberFormWhatsapp, setMemberFormWhatsapp] = useState('');
  const [memberFormEmail, setMemberFormEmail] = useState('');
  const [memberFormFunctions, setMemberFormFunctions] = useState([]);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [memberFormError, setMemberFormError] = useState('');

  // Form State: Single Schedule (Escala)
  const [editingEscalaId, setEditingEscalaId] = useState(null);
  const [escalaDate, setEscalaDate] = useState('');
  const [escalaShift, setEscalaShift] = useState('Manhã');
  const [escalaTeamId, setEscalaTeamId] = useState('');
  const [escalaMembersScale, setEscalaMembersScale] = useState({}); // map: memberId -> { isScheduled, function: string (ONLY ONE) }
  const [escalaError, setEscalaError] = useState('');

  // Form State: Batch Schedule Generation (Escalas em Lote)
  const [loteStartDate, setLoteStartDate] = useState('');
  const [loteEndDate, setLoteEndDate] = useState('');
  const [loteTeamId, setLoteTeamId] = useState('');
  const [loteWeekdays, setLoteWeekdays] = useState([0]);
  const [loteSundayShifts, setLoteSundayShifts] = useState(['Manhã', 'Noite']);
  const [loteUnavailability, setLoteUnavailability] = useState({});
  const [loteMinRest, setLoteMinRest] = useState('1'); // Min services of rest between schedules
  const [loteError, setLoteError] = useState('');
  const [loteSuccessMessage, setLoteSuccessMessage] = useState('');
  const [isLoteProcessing, setIsLoteProcessing] = useState(false);
  const [loteFunctionQty, setLoteFunctionQty] = useState({});
  const [loteWarnings, setLoteWarnings] = useState([]);

  // Form State: Batch Delete Schedules (Apagar Escalas em Lote)
  const [isDeleteLoteOpen, setIsDeleteLoteOpen] = useState(false);
  const [deleteLoteStartDate, setDeleteLoteStartDate] = useState('');
  const [deleteLoteEndDate, setDeleteLoteEndDate] = useState('');
  const [deleteLoteTeamId, setDeleteLoteTeamId] = useState(''); // empty for all
  const [deleteLoteError, setDeleteLoteError] = useState('');

  // Form State: PDF Printing (Exportar em PDF)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTeamId, setPrintTeamId] = useState('');
  const [printStartDate, setPrintStartDate] = useState('');
  const [printEndDate, setPrintEndDate] = useState('');

  // Confirmation Modals
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteMemberConfirmId, setDeleteMemberConfirmId] = useState(null);
  const [deleteEscalaConfirmId, setDeleteEscalaConfirmId] = useState(null);
  const [conflictModalMessage, setConflictModalMessage] = useState('');

  // Fetch teams from Realtime Database
  useEffect(() => {
    if (!user || !isApproved) return;

    const equipesRef = ref(db, 'equipes');
    const unsubscribe = onValue(equipesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setEquipes(list);
      } else {
        setEquipes([]);
      }
      setLoadingEquipes(false);
    }, (error) => {
      console.error("Erro ao carregar equipes:", error);
      setLoadingEquipes(false);
    });

    return () => unsubscribe();
  }, [user, isApproved]);

  // Fetch centralized members
  useEffect(() => {
    if (!user || !isApproved) return;

    const membrosRef = ref(db, 'membros');
    const unsubscribe = onValue(membrosRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMembrosGlobal(data);
      } else {
        setMembrosGlobal({});
      }
      setLoadingMembros(false);
    }, (error) => {
      console.error("Erro ao carregar membros globais:", error);
      setLoadingMembros(false);
    });

    return () => unsubscribe();
  }, [user, isApproved]);

  // Initialize loteFunctionQty when loteTeamId changes
  useEffect(() => {
    if (loteTeamId) {
      const selectedTeam = equipes.find(eq => eq.id === loteTeamId);
      const initialQty = {};
      if (selectedTeam && selectedTeam.functions) {
        selectedTeam.functions.forEach(f => {
          initialQty[f] = 1; // Default requirement to 1 slot per function
        });
      }
      setLoteFunctionQty(initialQty);
    } else {
      setLoteFunctionQty({});
    }
  }, [loteTeamId, equipes]);

  // Fetch service schedules (escalas)
  useEffect(() => {
    if (!user || !isApproved) return;

    const escalasRef = ref(db, 'escalas');
    const unsubscribe = onValue(escalasRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        list.sort((a, b) => b.date.localeCompare(a.date));
        setEscalas(list);
      } else {
        setEscalas([]);
      }
      setLoadingEscalas(false);
    }, (error) => {
      console.error("Erro ao carregar escalas:", error);
      setLoadingEscalas(false);
    });

    return () => unsubscribe();
  }, [user, isApproved]);

  // Auto-detect Sunday
  const isSelectedDateSunday = () => {
    if (!escalaDate) return false;
    const dateObj = new Date(escalaDate + 'T12:00:00');
    return dateObj.getDay() === 0;
  };

  // Helper to format WhatsApp number input
  const formatPhoneNumber = (value) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    
    if (phoneNumberLength < 3) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
    }
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
  };

  const handleWhatsappChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    if (formatted.length <= 15) {
      setFormWhatsapp(formatted);
    }
  };

  const handleMemberWhatsappChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    if (formatted.length <= 15) {
      setMemberFormWhatsapp(formatted);
    }
  };

  // Team Functions Handlers
  const handleAddFunction = () => {
    const trimmed = currentFunctionInput.trim();
    if (!trimmed) return;
    
    if (!formFunctions.some(f => f.toLowerCase() === trimmed.toLowerCase())) {
      setFormFunctions([...formFunctions, trimmed]);
    }
    setCurrentFunctionInput('');
  };

  const handleRemoveFunction = (indexToRemove) => {
    setFormFunctions(formFunctions.filter((_, idx) => idx !== indexToRemove));
  };

  const handleFunctionKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddFunction();
    }
  };

  // Team Submit Handler
  const handleSubmitTeam = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Por favor, digite o nome da equipe.');
      return;
    }
    if (!formLeader.trim()) {
      setFormError('Por favor, digite o nome do líder.');
      return;
    }
    
    const cleanPhone = formWhatsapp.replace(/[^\d]/g, '');
    if (cleanPhone.length < 10) {
      setFormError('Por favor, digite um número de WhatsApp válido com DDD.');
      return;
    }

    setIsSubmitting(true);

    try {
      const teamData = {
        name: formName.trim(),
        leaderName: formLeader.trim(),
        whatsapp: formWhatsapp.trim(),
        functions: formFunctions,
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        const existingTeam = equipes.find(eq => eq.id === editingId);
        await set(ref(db, `equipes/${editingId}`), {
          ...teamData,
          createdAt: existingTeam?.createdAt || new Date().toISOString(),
          members: existingTeam?.members || {}
        });
      } else {
        const newTeamRef = push(ref(db, 'equipes'));
        await set(newTeamRef, {
          ...teamData,
          createdAt: new Date().toISOString(),
          members: {}
        });
      }

      closeTeamForm();
    } catch (err) {
      console.error("Erro ao salvar equipe:", err);
      setFormError('Ocorreu um erro ao salvar os dados. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateTeamForm = () => {
    setEditingId(null);
    setFormName('');
    setFormLeader('');
    setFormWhatsapp('');
    setFormFunctions([]);
    setCurrentFunctionInput('');
    setFormError('');
    setCurrentView('team-form');
  };

  const openEditTeamForm = (team) => {
    setEditingId(team.id);
    setFormName(team.name);
    setFormLeader(team.leaderName);
    setFormWhatsapp(team.whatsapp);
    setFormFunctions(team.functions || []);
    setCurrentFunctionInput('');
    setFormError('');
    setCurrentView('team-form');
  };

  const closeTeamForm = () => {
    setCurrentView('list');
    setEditingId(null);
    setFormName('');
    setFormLeader('');
    setFormWhatsapp('');
    setFormFunctions([]);
    setCurrentFunctionInput('');
    setFormError('');
  };

  const handleDeleteTeam = async (id) => {
    try {
      await remove(ref(db, `equipes/${id}`));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Erro ao excluir equipe:", err);
      alert('Não foi possível excluir a equipe. Tente novamente.');
    }
  };

  // MEMBERS MANAGEMENT HANDLERS
  const activeTeam = equipes.find(eq => eq.id === activeTeamId);

  const openMembersManager = (teamId) => {
    setActiveTeamId(teamId);
    setMemberAddMode('select-existing');
    setSelectedExistingMemberId('');
    setMemberFormName('');
    setMemberFormWhatsapp('');
    setMemberFormEmail('');
    setMemberFormFunctions([]);
    setEditingMemberId(null);
    setMemberFormError('');
    setCurrentView('members-manager');
  };

  const closeMembersManager = () => {
    setCurrentView('list');
    setActiveTeamId(null);
    setSelectedExistingMemberId('');
    setMemberFormName('');
    setMemberFormWhatsapp('');
    setMemberFormEmail('');
    setMemberFormFunctions([]);
    setEditingMemberId(null);
    setMemberFormError('');
  };

  const toggleMemberFormFunctionSelection = (funcName) => {
    if (memberFormFunctions.includes(funcName)) {
      setMemberFormFunctions(memberFormFunctions.filter(f => f !== funcName));
    } else {
      setMemberFormFunctions([...memberFormFunctions, funcName]);
    }
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    setMemberFormError('');

    let targetMemberId = selectedExistingMemberId;

    if (memberAddMode === 'create-new') {
      if (!memberFormName.trim()) {
        setMemberFormError('Por favor, digite o nome do membro.');
        return;
      }

      if (memberFormWhatsapp.trim()) {
        const cleanPhone = memberFormWhatsapp.replace(/[^\d]/g, '');
        if (cleanPhone.length < 10) {
          setMemberFormError('Por favor, digite um número de WhatsApp válido para o membro.');
          return;
        }
      }

      if (memberFormEmail.trim() && !memberFormEmail.includes('@')) {
        setMemberFormError('Por favor, digite um endereço de e-mail válido.');
        return;
      }
    } else {
      if (!editingMemberId && !selectedExistingMemberId) {
        setMemberFormError('Por favor, selecione um membro da lista.');
        return;
      }
      if (editingMemberId) {
        targetMemberId = editingMemberId;
      }
    }

    try {
      if (memberAddMode === 'create-new') {
        const newMemberRef = push(ref(db, 'membros'));
        targetMemberId = newMemberRef.key;
        
        await set(newMemberRef, {
          name: memberFormName.trim(),
          whatsapp: memberFormWhatsapp.trim(),
          email: memberFormEmail.trim(),
          createdAt: new Date().toISOString()
        });
      }

      await set(ref(db, `equipes/${activeTeamId}/members/${targetMemberId}`), {
        functions: memberFormFunctions,
        updatedAt: new Date().toISOString()
      });

      setMemberFormName('');
      setMemberFormWhatsapp('');
      setMemberFormEmail('');
      setMemberFormFunctions([]);
      setSelectedExistingMemberId('');
      setEditingMemberId(null);
      setMemberAddMode('select-existing');
    } catch (err) {
      console.error("Erro ao salvar associação do membro:", err);
      setMemberFormError('Erro ao associar membro. Tente novamente.');
    }
  };

  const startEditMemberFunctions = (memberId, currentFunctions) => {
    setEditingMemberId(memberId);
    setMemberFormFunctions(currentFunctions || []);
    setMemberFormError('');
    setMemberAddMode('select-existing');
  };

  const cancelEditMemberFunctions = () => {
    setEditingMemberId(null);
    setMemberFormFunctions([]);
    setSelectedExistingMemberId('');
    setMemberFormError('');
  };

  const handleRemoveMemberFromTeam = async (memberId) => {
    try {
      await remove(ref(db, `equipes/${activeTeamId}/members/${memberId}`));
      setDeleteMemberConfirmId(null);
    } catch (err) {
      console.error("Erro ao remover membro da equipe:", err);
      alert('Não foi possível remover o membro.');
    }
  };

  const getActiveTeamMembersList = () => {
    if (!activeTeam || !activeTeam.members) return [];
    return Object.keys(activeTeam.members).map(memberId => {
      const globalDetails = membrosGlobal[memberId] || { name: 'Membro Desconhecido', whatsapp: '', email: '' };
      return {
        id: memberId,
        name: globalDetails.name,
        whatsapp: globalDetails.whatsapp,
        email: globalDetails.email,
        functions: activeTeam.members[memberId].functions || []
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  };

  const getAvailableMembersToSelect = () => {
    const activeMemberIds = activeTeam && activeTeam.members ? Object.keys(activeTeam.members) : [];
    return Object.keys(membrosGlobal)
      .filter(id => !activeMemberIds.includes(id))
      .map(id => ({
        id,
        ...membrosGlobal[id]
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // SINGLE SCHEDULE (ESCALA) HANDLERS
  const handleTeamChangeForEscala = (teamId) => {
    setEscalaTeamId(teamId);
    const selectedTeam = equipes.find(eq => eq.id === teamId);
    const initialScale = {};
    if (selectedTeam && selectedTeam.members) {
      Object.keys(selectedTeam.members).forEach(memberId => {
        // Pre-select the first function by default (only one function allowed per member per service)
        const memberFuncs = selectedTeam.members[memberId].functions || [];
        initialScale[memberId] = {
          isScheduled: false,
          function: memberFuncs.length > 0 ? memberFuncs[0] : ''
        };
      });
    }
    setEscalaMembersScale(initialScale);
  };

  const toggleMemberScheduled = (memberId) => {
    setEscalaMembersScale(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        isScheduled: !prev[memberId]?.isScheduled
      }
    }));
  };

  const setFunctionForScaledMember = (memberId, funcName) => {
    setEscalaMembersScale(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        function: funcName
      }
    }));
  };

  const openCreateEscalaForm = () => {
    setEditingEscalaId(null);
    setEscalaDate('');
    setEscalaShift('Manhã');
    setEscalaTeamId('');
    setEscalaMembersScale({});
    setEscalaError('');
    setCurrentView('escala-form');
  };

  const openEditEscalaForm = (escala) => {
    setEditingEscalaId(escala.id);
    setEscalaDate(escala.date);
    setEscalaShift(escala.shift || 'Manhã');
    setEscalaTeamId(escala.teamId);
    
    const selectedTeam = equipes.find(eq => eq.id === escala.teamId);
    const scale = {};
    
    if (selectedTeam && selectedTeam.members) {
      Object.keys(selectedTeam.members).forEach(memberId => {
        const wasScheduled = escala.members && !!escala.members[memberId];
        let chosenFunction = '';
        if (wasScheduled) {
          // Retrieve the saved function (handle array or single string safely)
          const savedFuncs = escala.members[memberId].functions || [];
          chosenFunction = savedFuncs.length > 0 ? savedFuncs[0] : '';
        } else {
          const teamMemberFuncs = selectedTeam.members[memberId].functions || [];
          chosenFunction = teamMemberFuncs.length > 0 ? teamMemberFuncs[0] : '';
        }

        scale[memberId] = {
          isScheduled: wasScheduled,
          function: chosenFunction
        };
      });
    }
    
    setEscalaMembersScale(scale);
    setEscalaError('');
    setCurrentView('escala-form');
  };

  const closeEscalaForm = () => {
    setCurrentView('list');
    setEditingEscalaId(null);
    setEscalaDate('');
    setEscalaShift('Manhã');
    setEscalaTeamId('');
    setEscalaMembersScale({});
    setEscalaError('');
  };

  const handleSubmitEscala = async (e) => {
    e.preventDefault();
    setEscalaError('');

    if (!escalaDate) {
      setEscalaError('Por favor, selecione a data do serviço.');
      return;
    }
    if (!escalaTeamId) {
      setEscalaError('Por favor, escolha uma equipe.');
      return;
    }

    const scaledMembers = {};
    let hasAtLeastOneMember = false;

    for (const memberId of Object.keys(escalaMembersScale)) {
      const data = escalaMembersScale[memberId];
      if (data.isScheduled) {
        if (!data.function) {
          const memberName = membrosGlobal[memberId]?.name || 'Membro';
          setEscalaError(`Por favor, selecione a função para o integrante "${memberName}".`);
          return;
        }
        scaledMembers[memberId] = {
          functions: [data.function] // Store as single item array to keep schema compatibility
        };
        hasAtLeastOneMember = true;
      }
    }

    if (!hasAtLeastOneMember) {
      setEscalaError('Por favor, selecione pelo menos 1 integrante para esta escala.');
      return;
    }

    const selectedTeam = equipes.find(eq => eq.id === escalaTeamId);
    const isSunday = isSelectedDateSunday();
    const currentShift = isSunday ? escalaShift : '';

    // Validation: Prevent scheduling the same person on the same day/shift in another team
    for (const memberId of Object.keys(scaledMembers)) {
      const conflictEscala = escalas.find(esc => {
        if (editingEscalaId && esc.id === editingEscalaId) return false;
        
        const sameDate = esc.date === escalaDate;
        if (!sameDate) return false;
        
        const shiftConflict = isSunday ? esc.shift === currentShift : true;
        if (!shiftConflict) return false;
        
        return esc.members && !!esc.members[memberId];
      });

      if (conflictEscala) {
        const memberName = membrosGlobal[memberId]?.name || 'Membro';
        const formattedDate = formatBrazilianDate(escalaDate, isSunday, currentShift);
        setConflictModalMessage(`O integrante "${memberName}" já está escalado na equipe "${conflictEscala.teamName}" no dia ${formattedDate}.`);
        return;
      }
    }

    try {
      const escalaData = {
        date: escalaDate,
        isSunday,
        shift: isSunday ? escalaShift : '',
        teamId: escalaTeamId,
        teamName: selectedTeam?.name || 'Equipe',
        members: scaledMembers,
        updatedAt: new Date().toISOString()
      };

      if (editingEscalaId) {
        const existing = escalas.find(esc => esc.id === editingEscalaId);
        await set(ref(db, `escalas/${editingEscalaId}`), {
          ...escalaData,
          createdAt: existing?.createdAt || new Date().toISOString()
        });
      } else {
        const newRef = push(ref(db, 'escalas'));
        await set(newRef, {
          ...escalaData,
          createdAt: new Date().toISOString()
        });
      }

      closeEscalaForm();
    } catch (err) {
      console.error("Erro ao salvar escala:", err);
      setEscalaError('Erro ao salvar escala. Tente novamente.');
    }
  };

  const handleDeleteEscala = async (id) => {
    try {
      await remove(ref(db, `escalas/${id}`));
      setDeleteEscalaConfirmId(null);
    } catch (err) {
      console.error("Erro ao excluir escala:", err);
      alert('Não foi possível excluir a escala.');
    }
  };

  // BATCH SCHEDULE GENERATION (ESCALAS EM LOTE)
  const openLoteEscalaForm = () => {
    setLoteStartDate('');
    setLoteEndDate('');
    setLoteTeamId('');
    setLoteWeekdays([0]);
    setLoteSundayShifts(['Manhã', 'Noite']);
    setLoteUnavailability({});
    setLoteMinRest('1');
    setLoteError('');
    setLoteSuccessMessage('');
    setCurrentView('escala-lote-form');
  };

  const closeLoteEscalaForm = () => {
    setCurrentView('list');
    setLoteStartDate('');
    setLoteEndDate('');
    setLoteTeamId('');
    setLoteWeekdays([0]);
    setLoteSundayShifts(['Manhã', 'Noite']);
    setLoteUnavailability({});
    setLoteMinRest('1');
    setLoteError('');
  };

  const getLoteCalculatedServiceDates = () => {
    if (!loteStartDate || !loteEndDate) return [];
    
    const dates = [];
    const start = new Date(loteStartDate + 'T12:00:00');
    const end = new Date(loteEndDate + 'T12:00:00');
    
    let current = new Date(start);
    let count = 0;
    
    while (current <= end && count < 90) {
      count++;
      const dayOfWeek = current.getDay();
      
      if (loteWeekdays.includes(dayOfWeek)) {
        const dateStr = current.toISOString().split('T')[0];
        
        if (dayOfWeek === 0) {
          if (loteSundayShifts.includes('Manhã')) {
            dates.push({ date: dateStr, isSunday: true, shift: 'Manhã' });
          }
          if (loteSundayShifts.includes('Noite')) {
            dates.push({ date: dateStr, isSunday: true, shift: 'Noite' });
          }
        } else {
          dates.push({ date: dateStr, isSunday: false, shift: '' });
        }
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const toggleLoteWeekday = (day) => {
    if (loteWeekdays.includes(day)) {
      setLoteWeekdays(loteWeekdays.filter(d => d !== day));
    } else {
      setLoteWeekdays([...loteWeekdays, day]);
    }
  };

  const toggleLoteSundayShift = (shift) => {
    if (loteSundayShifts.includes(shift)) {
      setLoteSundayShifts(loteSundayShifts.filter(s => s !== shift));
    } else {
      setLoteSundayShifts([...loteSundayShifts, shift]);
    }
  };

  const toggleMemberLoteUnavailability = (memberId, dateKey) => {
    setLoteUnavailability(prev => {
      const currentMemberUnavail = prev[memberId] || [];
      const updated = currentMemberUnavail.includes(dateKey)
        ? currentMemberUnavail.filter(k => k !== dateKey)
        : [...currentMemberUnavail, dateKey];
      return {
        ...prev,
        [memberId]: updated
      };
    });
  };

  const handleGenerateLoteEscalas = async (e) => {
    e.preventDefault();
    setLoteError('');
    setLoteSuccessMessage('');
    setLoteWarnings([]);

    if (!loteStartDate || !loteEndDate) {
      setLoteError('Selecione o período inicial e final.');
      return;
    }

    if (new Date(loteStartDate) > new Date(loteEndDate)) {
      setLoteError('A data inicial não pode ser posterior à data final.');
      return;
    }

    if (!loteTeamId) {
      setLoteError('Por favor, selecione uma equipe.');
      return;
    }

    if (loteWeekdays.length === 0) {
      setLoteError('Selecione pelo menos um dia da semana.');
      return;
    }

    const calculatedDates = getLoteCalculatedServiceDates();
    if (calculatedDates.length === 0) {
      setLoteError('Nenhum dia de culto encontrado nesse período.');
      return;
    }

    const selectedTeam = equipes.find(eq => eq.id === loteTeamId);
    if (!selectedTeam || !selectedTeam.members) {
      setLoteError('A equipe selecionada não possui integrantes.');
      return;
    }

    const teamFunctionsList = selectedTeam.functions || [];
    if (teamFunctionsList.length === 0) {
      setLoteError('Cadastre funções na equipe antes de gerar a escala em lote.');
      return;
    }

    const minRestLimit = parseInt(loteMinRest, 10) || 0;

    setIsLoteProcessing(true);

    try {
      let createdCount = 0;
      const unfilledList = [];
      
      // Tracking object for generated allocations: memberId -> list of service index values
      const memberScheduledIndices = {};
      Object.keys(selectedTeam.members).forEach(mid => {
        memberScheduledIndices[mid] = [];
      });

      // Loop through each service to perform draft (sorteio)
      for (let serviceIdx = 0; serviceIdx < calculatedDates.length; serviceIdx++) {
        const service = calculatedDates[serviceIdx];
        const dateKey = `${service.date}|${service.shift}`;
        
        const scaledMembersForThisService = {};
        const alreadyScheduledInThisService = new Set();

        // Draft (sorteio) for each function needed in the team, repeating based on required slot quantity
        for (const funcName of teamFunctionsList) {
          const qtyNeeded = parseInt(loteFunctionQty[funcName], 10);
          if (isNaN(qtyNeeded) || qtyNeeded <= 0) continue;

          let filledCount = 0;
          for (let q = 0; q < qtyNeeded; q++) {
            // 1. Gather all candidates in the team who can perform this function
            const eligibleCandidates = Object.keys(selectedTeam.members).filter(memberId => {
              // Must have this function in their profile
              const hasFunc = selectedTeam.members[memberId].functions?.includes(funcName);
              if (!hasFunc) return false;

              // Cannot be scheduled twice in the same service
              if (alreadyScheduledInThisService.has(memberId)) return false;

              // Must not be marked as unavailable
              const isUnavail = loteUnavailability[memberId]?.includes(dateKey);
              if (isUnavail) return false;

              // Must satisfy minimum rest requirement between services
              const lastScheduledIndex = memberScheduledIndices[memberId].length > 0
                ? memberScheduledIndices[memberId][memberScheduledIndices[memberId].length - 1]
                : -999;
              
              if (serviceIdx - lastScheduledIndex <= minRestLimit) return false;

              // Must not conflict with other teams on this date/shift
              const hasOtherTeamConflict = escalas.some(esc => {
                // Ignore this team's own older scales for this day since we are overwriting
                if (esc.teamId === loteTeamId) return false;

                const sameDate = esc.date === service.date;
                if (!sameDate) return false;
                
                const sameShift = service.isSunday ? esc.shift === service.shift : true;
                return sameShift && esc.members && !!esc.members[memberId];
              });

              return !hasOtherTeamConflict;
            });

            if (eligibleCandidates.length > 0) {
              // Sort eligible candidates by their current schedule count to prioritize under-scheduled members (rotatividade)
              eligibleCandidates.sort((a, b) => 
                memberScheduledIndices[a].length - memberScheduledIndices[b].length
              );

              // Filter candidates who have the absolute lowest schedule count so we can randomize among them
              const minSchedulesCount = memberScheduledIndices[eligibleCandidates[0]].length;
              const candidatesWithMinSchedules = eligibleCandidates.filter(mid => 
                memberScheduledIndices[mid].length === minSchedulesCount
              );

              // Random draw/draft (sorteio) from the prioritized subset
              const drawnMemberId = candidatesWithMinSchedules[Math.floor(Math.random() * candidatesWithMinSchedules.length)];

              // Assign function
              scaledMembersForThisService[drawnMemberId] = {
                functions: [funcName]
              };

              alreadyScheduledInThisService.add(drawnMemberId);
              memberScheduledIndices[drawnMemberId].push(serviceIdx);
              filledCount++;
            }
          }

          if (filledCount < qtyNeeded) {
            const missing = qtyNeeded - filledCount;
            const formatted = formatBrazilianDate(service.date, service.isSunday, service.shift);
            unfilledList.push(`${formatted}: Faltou preencher ${missing} vaga(s) de "${funcName}"`);
          }
        }

        // Save service scale if at least one member was successfully drafted
        if (Object.keys(scaledMembersForThisService).length > 0) {
          const escalaData = {
            date: service.date,
            isSunday: service.isSunday,
            shift: service.shift,
            teamId: loteTeamId,
            teamName: selectedTeam.name,
            members: scaledMembersForThisService,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          const existingEscala = escalas.find(esc => 
            esc.teamId === loteTeamId && 
            esc.date === service.date && 
            esc.shift === service.shift
          );

          if (existingEscala) {
            await set(ref(db, `escalas/${existingEscala.id}`), {
              ...escalaData,
              createdAt: existingEscala.createdAt
            });
          } else {
            const newRef = push(ref(db, 'escalas'));
            await set(newRef, escalaData);
          }
          createdCount++;
        }
      }

      setIsLoteProcessing(false);

      if (unfilledList.length > 0) {
        setLoteWarnings(unfilledList);
      } else {
        setLoteSuccessMessage(`Sucesso! ${createdCount} escalas geradas e sorteadas no período.`);
        // Delay closing to let them see success
        setTimeout(() => {
          setCurrentView('list');
          setActiveTab('escalas');
        }, 2500);
      }

    } catch (err) {
      console.error("Erro ao gerar escalas em lote:", err);
      setLoteError('Erro ao salvar as escalas em lote. Tente novamente.');
      setIsLoteProcessing(false);
    }
  };

  // BATCH DELETE SCHEDULES (Apagar Escalas em Lote)
  const handleBatchDeleteEscalas = async (e) => {
    e.preventDefault();
    setDeleteLoteError('');

    if (!deleteLoteStartDate || !deleteLoteEndDate) {
      setDeleteLoteError('Selecione o período inicial e final.');
      return;
    }

    if (new Date(deleteLoteStartDate) > new Date(deleteLoteEndDate)) {
      setDeleteLoteError('A data inicial não pode ser posterior à data final.');
      return;
    }

    // Filter scales that match deletion criteria
    const targets = escalas.filter(esc => {
      const inRange = esc.date >= deleteLoteStartDate && esc.date <= deleteLoteEndDate;
      if (!inRange) return false;
      if (deleteLoteTeamId && esc.teamId !== deleteLoteTeamId) return false;
      return true;
    });

    if (targets.length === 0) {
      setDeleteLoteError('Nenhuma escala encontrada com os filtros selecionados.');
      return;
    }

    const confirm = window.confirm(`Atenção! Você está prestes a excluir ${targets.length} escala(s). Deseja continuar?`);
    if (!confirm) return;

    try {
      for (const target of targets) {
        await remove(ref(db, `escalas/${target.id}`));
      }
      setIsDeleteLoteOpen(false);
      setDeleteLoteStartDate('');
      setDeleteLoteEndDate('');
      setDeleteLoteTeamId('');
      alert(`${targets.length} escala(s) excluída(s) com sucesso!`);
    } catch (err) {
      console.error("Erro ao excluir lote:", err);
      setDeleteLoteError('Erro ao excluir as escalas. Tente novamente.');
    }
  };

  // HELPER: CALENDAR LAYOUT GENERATOR
  const getCalendarMonthGrid = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Days in previous month to fill the first week prefix
    const startOffset = firstDay.getDay(); // 0 = Sun, 1 = Mon...
    
    const grid = [];
    
    // Prefix days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthLastDay - i);
      grid.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // Days in current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const currDate = new Date(year, month, day);
      grid.push({ date: currDate, isCurrentMonth: true });
    }
    
    // Suffix days from next month to complete the grid to a multiple of 7
    const remaining = 42 - grid.length;
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(year, month + 1, day);
      grid.push({ date: nextDate, isCurrentMonth: false });
    }
    
    return grid;
  };

  const getEscalasForDate = (dateObj) => {
    const key = dateObj.toISOString().split('T')[0];
    return escalas.filter(esc => esc.date === key);
  };

  const changeCalendarMonth = (offset) => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  // HELPER: TIMELINE DATA GENERATOR
  const getTimelineDatesList = () => {
    // Generate dates for the next 15 days or current loaded escalas dates
    if (escalas.length === 0) return [];
    
    // Extract unique dates from loaded scales, take the 12 most recent/upcoming
    const uniqueDates = Array.from(new Set(escalas.map(e => `${e.date}|${e.shift}`)));
    uniqueDates.sort();
    return uniqueDates.slice(0, 12).map(key => {
      const [date, shift] = key.split('|');
      return { date, shift, isSunday: new Date(date + 'T12:00:00').getDay() === 0 };
    });
  };

  const formatBrazilianDate = (dateString, isSunday, shift) => {
    if (!dateString) return '';
    const dateObj = new Date(dateString + 'T12:00:00');
    const weekdays = [
      'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
      'Quinta-feira', 'Sexta-feira', 'Sábado'
    ];
    const weekday = weekdays[dateObj.getDay()];
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    let text = `${weekday}, ${day}/${month}`;
    if (isSunday && shift) {
      text += ` (${shift})`;
    }
    return text;
  };

  const getPdfDateFormat = (dateStr, isSunday, shift) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr + 'T12:00:00');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    
    if (isSunday) {
      return `${day}/${month} ${shift === 'Manhã' ? 'DM' : 'DN'}`;
    }
    
    const weekdaysMap = ['DOM', 'S', 'T', 'Q', 'QI', 'SX', 'SAB'];
    const weekdayLetter = weekdaysMap[dateObj.getDay()];
    return `${day}/${month} ${weekdayLetter}`;
  };

  const getBrazilianDate = (dateString, isSunday, shift) => {
    return formatBrazilianDate(dateString, isSunday, shift);
  };

  const isDataLoading = loadingEquipes || loadingMembros || loadingEscalas;

  const getWhatsappLink = (phoneString) => {
    if (!phoneString) return '#';
    const cleanNumber = phoneString.replace(/[^\d]/g, '');
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
    return `https://wa.me/${finalNumber}`;
  };

  const filteredEquipes = equipes.filter(team => {
    const term = searchTerm.toLowerCase();
    const matchesNameOrLeader = 
      team.name.toLowerCase().includes(term) ||
      team.leaderName.toLowerCase().includes(term);
    const matchesFunction = team.functions && team.functions.some(f => 
      f.toLowerCase().includes(term)
    );
    const matchesMemberInfo = team.members && Object.keys(team.members).some(memberId => {
      const globalMember = membrosGlobal[memberId];
      if (!globalMember) return false;
      return (
        globalMember.name.toLowerCase().includes(term) ||
        (globalMember.email && globalMember.email.toLowerCase().includes(term))
      );
    });
    return matchesNameOrLeader || matchesFunction || matchesMemberInfo;
  });

  const filteredEscalas = escalas.filter(escala => {
    const term = searchTerm.toLowerCase();
    const formattedDate = formatBrazilianDate(escala.date, escala.isSunday, escala.shift).toLowerCase();
    
    const matchesDateOrTeam = 
      formattedDate.includes(term) ||
      escala.teamName.toLowerCase().includes(term);
    
    const matchesMember = escala.members && Object.keys(escala.members).some(memberId => {
      const globalMember = membrosGlobal[memberId];
      return globalMember && globalMember.name.toLowerCase().includes(term);
    });

    return matchesDateOrTeam || matchesMember;
  });

  if (authLoading || !user || !isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#121210]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-[#121210] pb-16">
      <div className="print:hidden">
      {/* Header */}
      <header className="bg-white dark:bg-inverse-surface border-b border-secondary/20 dark:border-secondary/10 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (currentView === 'list') {
                  router.push('/restricted');
                } else if (currentView === 'team-form') {
                  closeTeamForm();
                } else if (currentView === 'members-manager') {
                  closeMembersManager();
                } else if (currentView === 'escala-form') {
                  closeEscalaForm();
                } else if (currentView === 'escala-lote-form') {
                  closeLoteEscalaForm();
                }
              }}
              className="p-2 -ml-2 rounded-full hover:bg-secondary/10 text-primary dark:text-[#fcf9f4] transition-colors cursor-pointer"
              aria-label="Voltar"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div>
              <span className="text-xs font-bold text-secondary uppercase tracking-wide block">Ministério</span>
              <h1 className="text-xl font-extrabold text-primary dark:text-[#fcf9f4]">
                {currentView === 'members-manager' 
                  ? 'Membros da Equipe' 
                  : currentView === 'escala-form'
                    ? 'Configurar Escala'
                    : currentView === 'escala-lote-form'
                      ? 'Escalas em Lote'
                      : 'Equipes da Igreja'}
              </h1>
            </div>
          </div>
          
          <img
            src={user.photoURL}
            alt={user.displayName}
            className="w-10 h-10 rounded-full border-2 border-primary/20 shadow-sm"
          />
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* VIEW 1: TEAM FORM */}
        {currentView === 'team-form' && (
          <div className="bg-white dark:bg-inverse-surface rounded-2xl p-6 border border-secondary/20 shadow-md max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-primary dark:text-[#fcf9f4]">
                {editingId ? 'Editar Equipe' : 'Cadastrar Nova Equipe'}
              </h2>
              <button onClick={closeTeamForm} className="p-2 hover:bg-secondary/10 rounded-full cursor-pointer">✕</button>
            </div>

            {formError && (
              <div className="bg-error-container text-on-error-container p-4 rounded-xl mb-4 text-sm font-semibold border border-error/20">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitTeam} className="space-y-6">
              <div>
                <label className="block text-base font-bold text-primary dark:text-[#fcf9f4] mb-2">Nome da Equipe</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Equipe de Louvor..."
                  className="w-full text-lg p-4 rounded-xl border border-outline/35 bg-surface-container-lowest focus:border-primary outline-none transition-all dark:bg-[#1f1e1a] dark:text-[#fcf9f4]"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-base font-bold text-primary dark:text-[#fcf9f4] mb-2">Líder da Equipe</label>
                <input
                  type="text"
                  value={formLeader}
                  onChange={(e) => setFormLeader(e.target.value)}
                  placeholder="Ex: João..."
                  className="w-full text-lg p-4 rounded-xl border border-outline/35 bg-surface-container-lowest focus:border-primary outline-none transition-all dark:bg-[#1f1e1a] dark:text-[#fcf9f4]"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-base font-bold text-primary dark:text-[#fcf9f4] mb-2">WhatsApp do Líder</label>
                <input
                  type="tel"
                  value={formWhatsapp}
                  onChange={handleWhatsappChange}
                  placeholder="(99) 99999-9999"
                  className="w-full text-lg p-4 rounded-xl border border-outline/35 bg-surface-container-lowest focus:border-primary outline-none transition-all dark:bg-[#1f1e1a] dark:text-[#fcf9f4]"
                  disabled={isSubmitting}
                />
              </div>

              <div className="border-t border-secondary/15 pt-4">
                <label className="block text-base font-bold text-primary dark:text-[#fcf9f4] mb-1">Funções da Equipe</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={currentFunctionInput}
                    onChange={(e) => setCurrentFunctionInput(e.target.value)}
                    onKeyDown={handleFunctionKeyPress}
                    placeholder="Ex: Guitarrista..."
                    className="flex-grow text-base p-3.5 rounded-xl border border-outline/35 bg-surface-container-lowest focus:border-primary outline-none transition-all dark:bg-[#1f1e1a] dark:text-[#fcf9f4]"
                  />
                  <button type="button" onClick={handleAddFunction} className="bg-primary hover:bg-primary/95 text-white font-bold px-5 rounded-xl">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formFunctions.map((f, i) => (
                    <span key={i} className="bg-surface-container text-primary border border-outline/10 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                      {f} <button type="button" onClick={() => handleRemoveFunction(i)} className="text-xs ml-1">✕</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button type="submit" className="w-full bg-[#25D366] text-white font-bold text-lg py-4 rounded-xl cursor-pointer">Salvar Equipe</button>
                <button type="button" onClick={closeTeamForm} className="w-full bg-secondary-container text-on-secondary-container font-bold text-lg py-4 rounded-xl cursor-pointer">Cancelar</button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW 2: MEMBERS MANAGER */}
        {currentView === 'members-manager' && activeTeam && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-white dark:bg-inverse-surface rounded-2xl p-5 border border-secondary/20 shadow-sm flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-secondary uppercase block">Gerenciando Membros da Equipe</span>
                <h2 className="text-2xl font-black text-primary dark:text-[#fcf9f4]">{activeTeam.name}</h2>
              </div>
              <button onClick={closeMembersManager} className="bg-secondary-container text-on-secondary-container text-sm font-bold py-2 px-4 rounded-xl cursor-pointer">Voltar</button>
            </div>

            <div className="bg-white dark:bg-inverse-surface rounded-2xl p-6 border border-secondary/20 shadow-md space-y-5">
              {!editingMemberId && (
                <div className="flex bg-surface-container-low dark:bg-[#1f1e1a] rounded-xl p-1 gap-1 border border-secondary/15">
                  <button type="button" onClick={() => setMemberAddMode('select-existing')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold cursor-pointer ${memberAddMode === 'select-existing' ? 'bg-primary text-white' : 'text-primary dark:text-inverse-primary'}`}>Membro da Igreja</button>
                  <button type="button" onClick={() => setMemberAddMode('create-new')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold cursor-pointer ${memberAddMode === 'create-new' ? 'bg-primary text-white' : 'text-primary dark:text-inverse-primary'}`}>+ Novo Cadastro</button>
                </div>
              )}

              <h3 className="text-lg font-bold text-primary dark:text-[#fcf9f4]">
                {editingMemberId ? 'Editar Funções na Equipe' : memberAddMode === 'select-existing' ? 'Vincular Membro da Igreja' : 'Cadastrar Novo Membro'}
              </h3>

              {memberFormError && <div className="bg-error-container text-on-error-container p-3.5 rounded-xl text-sm font-bold">{memberFormError}</div>}

              <form onSubmit={handleSaveMember} className="space-y-5">
                {memberAddMode === 'select-existing' && !editingMemberId && (
                  <div>
                    <label className="block text-sm font-bold text-primary dark:text-[#fcf9f4] mb-2">Membro</label>
                    <select value={selectedExistingMemberId} onChange={(e) => setSelectedExistingMemberId(e.target.value)} className="w-full p-4 rounded-xl border border-outline/35 bg-surface-container-lowest focus:border-primary outline-none dark:bg-[#1f1e1a] dark:text-[#fcf9f4] cursor-pointer">
                      <option value="">-- Escolha --</option>
                      {getAvailableMembersToSelect().map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                )}

                {memberAddMode === 'create-new' && (
                  <div className="space-y-4">
                    <input type="text" placeholder="Nome" value={memberFormName} onChange={e => setMemberFormName(e.target.value)} className="w-full p-3.5 border rounded-xl dark:bg-[#1f1e1a] dark:text-[#fcf9f4]" />
                    <input type="tel" placeholder="WhatsApp" value={memberFormWhatsapp} onChange={handleMemberWhatsappChange} className="w-full p-3.5 border rounded-xl dark:bg-[#1f1e1a] dark:text-[#fcf9f4]" />
                    <input type="email" placeholder="E-mail" value={memberFormEmail} onChange={e => setMemberFormEmail(e.target.value)} className="w-full p-3.5 border rounded-xl dark:bg-[#1f1e1a] dark:text-[#fcf9f4]" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-primary dark:text-[#fcf9f4] mb-2">Funções na Equipe</label>
                  <div className="flex flex-wrap gap-2.5 p-3.5 bg-surface-container-low dark:bg-inverse-surface/30 rounded-xl">
                    {activeTeam.functions?.map((f, i) => {
                      const sel = memberFormFunctions.includes(f);
                      return (
                        <button type="button" key={i} onClick={() => toggleMemberFormFunctionSelection(f)} className={`px-4 py-2 rounded-xl text-sm font-bold border cursor-pointer ${sel ? 'bg-primary border-primary text-white' : 'bg-white dark:bg-[#1f1e1a] border-outline/25 text-primary dark:text-[#fcf9f4]'}`}>{f}</button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 bg-[#25D366] text-white font-bold py-3.5 rounded-xl cursor-pointer">Salvar</button>
                  {(editingMemberId || memberAddMode === 'create-new') && <button type="button" onClick={() => { editingMemberId ? cancelEditMemberFunctions() : setMemberAddMode('select-existing'); }} className="bg-secondary-container text-on-secondary-container font-bold px-5 rounded-xl cursor-pointer text-sm">Cancelar</button>}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-primary dark:text-[#fcf9f4] px-1">Integrantes da Equipe</h3>
              {getActiveTeamMembersList().map(member => (
                <div key={member.id} className="bg-white dark:bg-inverse-surface border rounded-2xl p-4 flex justify-between items-center gap-4">
                  <div>
                    <h4 className="font-bold text-lg text-primary dark:text-[#fcf9f4]">{member.name}</h4>
                    <p className="text-xs text-on-surface-variant dark:text-[#d1c4bb]">{member.whatsapp || member.email ? `${member.whatsapp} | ${member.email}` : 'Sem contato'}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">{member.functions.map((f, idx) => <span key={idx} className="bg-primary/10 text-primary dark:text-inverse-primary text-xs font-bold px-2 py-0.5 rounded-md">{f}</span>)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEditMemberFunctions(member.id, member.functions)} className="p-2 border rounded-xl hover:bg-secondary/5 cursor-pointer">Editar</button>
                    <button onClick={() => setDeleteMemberConfirmId(member.id)} className="p-2 border rounded-xl bg-[#ffdad6] text-[#ba1a1a] hover:bg-[#ffcdc7] cursor-pointer">Remover</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: SINGLE SCHEDULE FORM */}
        {currentView === 'escala-form' && (
          <div className="bg-white dark:bg-inverse-surface rounded-2xl p-6 border border-secondary/20 shadow-md max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary dark:text-[#fcf9f4]">{editingEscalaId ? 'Editar Escala' : 'Criar Escala'}</h2>
              <button onClick={closeEscalaForm} className="p-2 hover:bg-secondary/10 rounded-full cursor-pointer">✕</button>
            </div>

            {escalaError && <div className="bg-error-container text-on-error-container p-4 rounded-xl text-sm font-bold border border-error/25">{escalaError}</div>}

            <form onSubmit={handleSubmitEscala} className="space-y-6">
              <div>
                <label className="block text-base font-bold text-primary dark:text-[#fcf9f4] mb-2">Dia do Serviço</label>
                <input type="date" value={escalaDate} onChange={e => setEscalaDate(e.target.value)} className="w-full p-4 rounded-xl border border-outline/35 dark:bg-[#1f1e1a] dark:text-[#fcf9f4] cursor-pointer" />
              </div>

              {isSelectedDateSunday() && (
                <div>
                  <label className="block text-base font-bold text-primary dark:text-[#fcf9f4] mb-2">Culto de Domingo</label>
                  <div className="flex bg-surface-container-low dark:bg-[#1f1e1a] rounded-xl p-1 gap-1">
                    <button type="button" onClick={() => setEscalaShift('Manhã')} className={`flex-1 py-3.5 rounded-lg font-bold cursor-pointer ${escalaShift === 'Manhã' ? 'bg-primary text-white' : 'text-primary dark:text-[#fcf9f4]'}`}>Culto da Manhã</button>
                    <button type="button" onClick={() => setEscalaShift('Noite')} className={`flex-1 py-3.5 rounded-lg font-bold cursor-pointer ${escalaShift === 'Noite' ? 'bg-primary text-white' : 'text-primary dark:text-[#fcf9f4]'}`}>Culto da Noite</button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-base font-bold text-primary dark:text-[#fcf9f4] mb-2">Equipe</label>
                <select value={escalaTeamId} onChange={e => handleTeamChangeForEscala(e.target.value)} disabled={!!editingEscalaId} className="w-full p-4 rounded-xl border dark:bg-[#1f1e1a] dark:text-[#fcf9f4] cursor-pointer">
                  <option value="">-- Escolha --</option>
                  {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                </select>
              </div>

              {escalaTeamId && (
                <div className="border-t pt-4 space-y-4">
                  <label className="block text-base font-bold text-primary dark:text-[#fcf9f4]">Selecione os Integrantes & Escolha a Função Única</label>
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                    {Object.keys(escalaMembersScale).map(memberId => {
                      const globalDetails = membrosGlobal[memberId];
                      if (!globalDetails) return null;
                      const scaleData = escalaMembersScale[memberId];
                      const isScheduled = scaleData.isScheduled;
                      const activeTeamObj = equipes.find(eq => eq.id === escalaTeamId);
                      const teamMemberFunctions = activeTeamObj?.members?.[memberId]?.functions || [];

                      return (
                        <div key={memberId} className={`p-4 rounded-2xl border transition-all ${isScheduled ? 'bg-primary/5 border-primary/45' : 'bg-white dark:bg-[#1f1e1a] border-secondary/15'}`}>
                          <label className="flex items-center gap-3 font-bold text-base text-primary dark:text-[#fcf9f4] cursor-pointer">
                            <input type="checkbox" checked={isScheduled} onChange={() => toggleMemberScheduled(memberId)} className="w-5.5 h-5.5 accent-primary rounded cursor-pointer" />
                            <span>{globalDetails.name}</span>
                          </label>

                          {isScheduled && (
                            <div className="mt-3 pt-3 border-t border-dashed border-secondary/20">
                              <p className="text-xs font-bold text-on-surface-variant dark:text-[#d1c4bb] uppercase mb-2">Função no dia (Selecione apenas uma):</p>
                              {teamMemberFunctions.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {teamMemberFunctions.map((func, idx) => {
                                    const isSelectedFunc = scaleData.function === func;
                                    return (
                                      <button key={idx} type="button" onClick={() => setFunctionForScaledMember(memberId, func)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${isSelectedFunc ? 'bg-primary border-primary text-white' : 'bg-white dark:bg-[#2c2b27] text-primary dark:text-[#fcf9f4]'}`}>{func}</button>
                                    );
                                  })}
                                </div>
                              ) : <p className="text-xs italic">Sem funções vinculadas na equipe.</p>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 space-y-3">
                <button type="submit" className="w-full bg-[#25D366] text-white font-extrabold text-lg py-4 rounded-xl cursor-pointer">Salvar Escala</button>
                <button type="button" onClick={closeEscalaForm} className="w-full bg-secondary-container text-on-secondary-container font-bold text-lg py-4 rounded-xl cursor-pointer">Cancelar</button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW 4: BATCH SCHEDULE FORM (Escalas em Lote) */}
        {currentView === 'escala-lote-form' && (
          <div className="bg-white dark:bg-inverse-surface rounded-2xl p-6 border border-secondary/20 shadow-md max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-primary dark:text-[#fcf9f4]">Gerar Várias Escalas (Em Lote)</h2>
              <button onClick={closeLoteEscalaForm} className="p-2 hover:bg-secondary/10 rounded-full cursor-pointer">✕</button>
            </div>

            {loteError && <div className="bg-error-container text-on-error-container p-4 rounded-xl text-sm font-bold border border-error/20">{loteError}</div>}
            {loteSuccessMessage && <div className="bg-[#E8F8EF] text-[#0f5b33] p-4 rounded-xl text-sm font-bold border">{loteSuccessMessage}</div>}

            {loteWarnings.length > 0 ? (
              <div className="space-y-6">
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">⚠️</span>
                    <div>
                      <h3 className="text-lg font-black text-amber-800 dark:text-amber-300">Escalas Geradas com Alertas</h3>
                      <p className="text-xs text-amber-700 dark:text-amber-400">Alguns cultos não puderam ser totalmente preenchidos devido a conflitos ou restrições de rotatividade.</p>
                    </div>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-sm font-semibold text-amber-800 dark:text-amber-300">
                    {loteWarnings.map((warning, idx) => (
                      <div key={idx} className="p-3 bg-white dark:bg-[#1a1a17] border border-amber-200/50 dark:border-amber-900/10 rounded-xl flex items-start gap-2">
                        <span>•</span>
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setLoteWarnings([]);
                    setCurrentView('list');
                    setActiveTab('escalas');
                  }}
                  className="w-full bg-primary hover:bg-primary/95 text-white font-extrabold text-lg py-4 rounded-xl cursor-pointer"
                >
                  Entendido, Voltar para Escalas
                </button>
              </div>
            ) : (
              <form onSubmit={handleGenerateLoteEscalas} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-primary dark:text-[#fcf9f4] mb-2">Data Inicial</label>
                    <input type="date" value={loteStartDate} onChange={e => setLoteStartDate(e.target.value)} className="w-full p-3.5 border rounded-xl dark:bg-[#1f1e1a] cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-primary dark:text-[#fcf9f4] mb-2">Data Final</label>
                    <input type="date" value={loteEndDate} onChange={e => setLoteEndDate(e.target.value)} className="w-full p-3.5 border rounded-xl dark:bg-[#1f1e1a] cursor-pointer" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-primary dark:text-[#fcf9f4] mb-2">Selecione a Equipe</label>
                  <select value={loteTeamId} onChange={e => setLoteTeamId(e.target.value)} className="w-full p-4 border rounded-xl dark:bg-[#1f1e1a] cursor-pointer">
                    <option value="">-- Escolha --</option>
                    {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                  </select>
                </div>

                {loteTeamId && (
                  <div className="border-t border-dashed border-secondary/20 pt-4 space-y-4">
                    <div>
                      <label className="block text-base font-bold text-primary dark:text-[#fcf9f4]">
                        Tamanho da Equipe / Necessidade por Culto
                      </label>
                      <p className="text-xs text-on-surface-variant dark:text-[#d1c4bb] mt-0.5">
                        Defina quantas pessoas são necessárias para cada função em cada culto. (Coloque 0 se a função não for necessária neste serviço).
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(() => {
                        const selectedTeamObj = equipes.find(eq => eq.id === loteTeamId);
                        const funcs = selectedTeamObj?.functions || [];
                        if (funcs.length === 0) return <p className="text-xs text-on-surface-variant italic">Nenhuma função cadastrada nesta equipe.</p>;
                        
                        return funcs.map((funcName) => (
                          <div key={funcName} className="flex items-center justify-between p-3.5 bg-surface-container-low dark:bg-inverse-surface/30 rounded-xl border border-secondary/10">
                            <span className="font-bold text-sm text-primary dark:text-[#fcf9f4]">{funcName}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const curr = loteFunctionQty[funcName] || 0;
                                  if (curr > 0) {
                                    setLoteFunctionQty(prev => ({ ...prev, [funcName]: curr - 1 }));
                                  }
                                }}
                                className="w-8 h-8 rounded-lg bg-surface-container hover:bg-secondary/15 flex items-center justify-center font-bold text-primary dark:text-[#fcf9f4] cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-extrabold text-base text-primary dark:text-[#fcf9f4]">
                                {loteFunctionQty[funcName] || 0}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const curr = loteFunctionQty[funcName] || 0;
                                  if (curr < 10) {
                                    setLoteFunctionQty(prev => ({ ...prev, [funcName]: curr + 1 }));
                                  }
                                }}
                                className="w-8 h-8 rounded-lg bg-surface-container hover:bg-secondary/15 flex items-center justify-center font-bold text-primary dark:text-[#fcf9f4] cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* ROTATIVIDADE / BALANCING PARAMETERS */}
                <div className="border-t border-dashed border-secondary/20 pt-4">
                  <div>
                    <label className="block text-sm font-bold text-primary dark:text-[#fcf9f4] mb-2">Mínimo de Cultos de Folga</label>
                    <input type="number" min="0" max="6" value={loteMinRest} onChange={e => setLoteMinRest(e.target.value)} className="w-full p-3.5 border rounded-xl dark:bg-[#1f1e1a]" />
                    <span className="text-2xs opacity-75">Define quantos cultos de intervalo o mesmo integrante deve ter antes de ser escalado novamente (ex: se for 1, o integrante escalado no Domingo de manhã não serve no Domingo à noite).</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-primary dark:text-[#fcf9f4] mb-2">Dias da Semana</label>
                  <div className="flex flex-wrap gap-2 p-3 bg-surface-container-low dark:bg-inverse-surface/30 rounded-xl border border-secondary/10">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((name, day) => {
                      const isChecked = loteWeekdays.includes(day);
                      return (
                        <button key={day} type="button" onClick={() => toggleLoteWeekday(day)} className={`flex-grow py-2.5 rounded-lg text-sm font-bold border cursor-pointer ${isChecked ? 'bg-primary border-primary text-white' : 'bg-white dark:bg-[#1f1e1a] text-primary dark:text-[#fcf9f4]'}`}>{name}</button>
                      );
                    })}
                  </div>
                </div>

                {loteWeekdays.includes(0) && (
                  <div>
                    <label className="block text-sm font-bold text-primary dark:text-[#fcf9f4] mb-2">Cultos de Domingo</label>
                    <div className="flex bg-surface-container-low dark:bg-[#1f1e1a] rounded-xl p-1 gap-1">
                      <button type="button" onClick={() => toggleLoteSundayShift('Manhã')} className={`flex-1 py-3 rounded-lg font-bold transition-all cursor-pointer ${loteSundayShifts.includes('Manhã') ? 'bg-primary text-white' : 'text-primary dark:text-[#fcf9f4]'}`}>Manhã</button>
                      <button type="button" onClick={() => toggleLoteSundayShift('Noite')} className={`flex-1 py-3 rounded-lg font-bold transition-all cursor-pointer ${loteSundayShifts.includes('Noite') ? 'bg-primary text-white' : 'text-primary dark:text-[#fcf9f4]'}`}>Noite</button>
                    </div>
                  </div>
                )}

                {/* Unavailabilities */}
                {loteStartDate && loteEndDate && loteTeamId && getLoteCalculatedServiceDates().length > 0 && (
                  <div className="border-t pt-4 space-y-4">
                    <div>
                      <label className="block text-base font-bold text-primary dark:text-[#fcf9f4]">Indisponibilidade dos Integrantes</label>
                      <p className="text-xs text-on-surface-variant mt-0.5">Marque os dias em que cada integrante **NÃO poderá servir**. Eles serão pulados da escala nestas datas.</p>
                    </div>
                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                      {(() => {
                        const calculatedDates = getLoteCalculatedServiceDates();
                        const selectedTeamObj = equipes.find(eq => eq.id === loteTeamId);
                        const membersList = selectedTeamObj && selectedTeamObj.members 
                          ? Object.keys(selectedTeamObj.members).map(mid => ({ id: mid, name: membrosGlobal[mid]?.name || 'Membro' }))
                          : [];
                        membersList.sort((a, b) => a.name.localeCompare(b.name));

                        return membersList.map(member => (
                          <div key={member.id} className="p-4 bg-surface-container-low dark:bg-inverse-surface/30 border rounded-2xl space-y-3">
                            <span className="font-extrabold text-base text-primary dark:text-[#fcf9f4] block">{member.name}</span>
                            <div className="flex flex-col gap-1.5">
                              {calculatedDates.map(service => {
                                const dateKey = `${service.date}|${service.shift}`;
                                const isMarkedUnavailable = loteUnavailability[member.id]?.includes(dateKey);
                                const formatted = formatBrazilianDate(service.date, service.isSunday, service.shift);
                                return (
                                  <label key={dateKey} className={`flex items-center gap-3 p-2.5 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${isMarkedUnavailable ? 'bg-error-container border-error/30 text-on-error-container' : 'bg-white dark:bg-[#1f1e1a] border-secondary/15 text-primary dark:text-[#fcf9f4]'}`}>
                                    <input type="checkbox" checked={isMarkedUnavailable || false} onChange={() => toggleMemberLoteUnavailability(member.id, dateKey)} className="w-5 h-5 accent-[#ba1a1a] rounded cursor-pointer" />
                                    <span>{isMarkedUnavailable ? 'Indisponível: ' : ''}{formatted}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                <div className="pt-4 space-y-3">
                  <button type="submit" className="w-full bg-[#25D366] text-white font-extrabold text-lg py-4 rounded-xl cursor-pointer">Confirmar e Sortear Escalas</button>
                  <button type="button" onClick={closeLoteEscalaForm} className="w-full bg-secondary-container text-on-secondary-container font-bold text-lg py-4 rounded-xl cursor-pointer">Cancelar</button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* VIEW 5: MAIN DASHBOARD LISTS */}
        {currentView === 'list' && (
          <div className="space-y-6">
            
            {/* Tabs Selector */}
            <div className="flex bg-surface-container-low dark:bg-[#1a1a17] rounded-2xl p-1 gap-1 border border-secondary/15">
              <button type="button" onClick={() => { setActiveTab('equipes'); setSearchTerm(''); }} className={`flex-1 text-center py-3.5 rounded-xl font-bold text-base cursor-pointer ${activeTab === 'equipes' ? 'bg-primary text-white shadow-sm' : 'text-primary dark:text-[#fcf9f4]'}`}>Equipes</button>
              <button type="button" onClick={() => { setActiveTab('escalas'); setSearchTerm(''); }} className={`flex-1 text-center py-3.5 rounded-xl font-bold text-base cursor-pointer ${activeTab === 'escalas' ? 'bg-primary text-white shadow-sm' : 'text-primary dark:text-[#fcf9f4]'}`}>Escalas de Serviço</button>
            </div>

            {/* TAB: EQUIPES */}
            {activeTab === 'equipes' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-4">
                  {can('gerenciador_equipes', 'manage_teams') && (
                    <button onClick={openCreateTeamForm} className="w-full bg-primary text-white font-extrabold text-xl py-4.5 px-6 rounded-2xl shadow-md cursor-pointer active:scale-[0.99]">+ Cadastrar Nova Equipe</button>
                  )}
                  <div className="bg-surface-container-low dark:bg-inverse-surface/40 border border-secondary/20 dark:border-secondary/10 rounded-xl p-4 flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="font-semibold text-on-surface-variant dark:text-[#d1c4bb]">Total de equipes cadastradas:</span>
                      <span className="text-xs text-on-surface-variant/75 mt-0.5">Membros globais: <strong>{Object.keys(membrosGlobal).length}</strong></span>
                    </div>
                    <span className="font-extrabold text-lg text-primary dark:text-inverse-primary bg-primary/10 dark:bg-primary-container/20 px-3.5 py-1 rounded-full">{equipes.length}</span>
                  </div>
                </div>

                <div className="relative">
                  <input type="text" placeholder="Buscar equipe, líder, membro ou função..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-4 pr-12 py-4 text-lg rounded-xl border bg-white dark:bg-[#1f1e1a] dark:text-[#fcf9f4] outline-none shadow-sm" />
                  {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-sm font-bold text-primary dark:text-[#fcf9f4]">Limpar</button>}
                </div>

                <div className="space-y-4">
                  {isDataLoading ? (
                    <div className="py-12 text-center text-on-surface-variant">Carregando dados...</div>
                  ) : filteredEquipes.length > 0 ? (
                    filteredEquipes.map((team) => {
                      const membersCount = team.members ? Object.keys(team.members).length : 0;
                      return (
                        <div key={team.id} className="bg-white dark:bg-inverse-surface border rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                          <div className="flex justify-between items-start gap-2">
                            <div className="space-y-1 w-full">
                              <div className="flex justify-between items-center">
                                <h3 className="text-xl font-extrabold text-primary dark:text-[#fcf9f4]">{team.name}</h3>
                                {can('gerenciador_equipes', 'manage_members') ? (
                                  <button onClick={() => openMembersManager(team.id)} className="text-xs font-extrabold bg-primary/10 text-primary dark:text-inverse-primary px-3 py-1.5 rounded-xl cursor-pointer">Membros ({membersCount})</button>
                                ) : (
                                  <span className="text-xs font-bold bg-secondary/10 text-on-surface-variant px-3 py-1.5 rounded-xl">Membros ({membersCount})</span>
                                )}
                              </div>
                              <p className="text-base text-on-surface-variant dark:text-[#d1c4bb]">Líder: <strong className="font-semibold text-primary">{team.leaderName}</strong></p>
                              {team.functions && team.functions.length > 0 && (
                                <div className="mt-2 pt-2 border-t flex flex-wrap gap-1">
                                  {team.functions.map((f, idx) => <span key={idx} className="bg-secondary/10 text-primary text-2xs font-bold px-2 py-0.5 rounded">{f}</span>)}
                                </div>
                              )}
                              {team.members && Object.keys(team.members).length > 0 && (
                                <p className="text-xs text-on-surface-variant mt-2">Integrantes: {Object.keys(team.members).map(mid => membrosGlobal[mid]?.name).filter(Boolean).join(', ')}</p>
                              )}
                            </div>
                          </div>
                          <a href={getWhatsappLink(team.whatsapp)} target="_blank" rel="noopener noreferrer" className="w-full bg-[#E8F8EF] dark:bg-[#143d26] text-[#0f5b33] dark:text-[#88f5b8] font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border text-sm">Conversar com Líder</a>
                          {(can('gerenciador_equipes', 'manage_teams') || can('gerenciador_equipes', 'delete')) && (
                            <div className="flex gap-3 pt-1">
                              {can('gerenciador_equipes', 'manage_teams') && (
                                <button onClick={() => openEditTeamForm(team)} className="flex-1 bg-surface-container hover:bg-surface-variant text-primary font-bold py-3 rounded-xl border text-sm cursor-pointer">Editar</button>
                              )}
                              {can('gerenciador_equipes', 'delete') && (
                                <button onClick={() => setDeleteConfirmId(team.id)} className="flex-1 bg-[#ffdad6] text-[#ba1a1a] font-bold py-3 rounded-xl border text-sm cursor-pointer">Excluir</button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : <div className="py-12 text-center">Nenhuma equipe encontrada.</div>}
                </div>
              </div>
            )}

            {/* TAB: ESCALAS */}
            {activeTab === 'escalas' && (
              <div className="space-y-6">
                
                {/* Scale Top Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {can('gerenciador_equipes', 'manage_escalas') && (
                    <>
                      <button onClick={openCreateEscalaForm} className="bg-primary text-white font-extrabold text-base py-3.5 px-4 rounded-xl shadow-sm cursor-pointer text-center">Configurar Escala</button>
                      <button onClick={openLoteEscalaForm} className="bg-secondary text-white font-extrabold text-base py-3.5 px-4 rounded-xl shadow-sm cursor-pointer text-center">Gerar em Lote</button>
                    </>
                  )}
                  {can('gerenciador_equipes', 'delete') && (
                    <button onClick={() => { setIsDeleteLoteOpen(true); setDeleteLoteError(''); }} className="bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a]/20 font-extrabold text-base py-3.5 px-4 rounded-xl cursor-pointer text-center">Apagar em Lote</button>
                  )}
                  <button onClick={() => { setIsPrintModalOpen(true); setPrintTeamId(''); setPrintStartDate(''); setPrintEndDate(''); }} className="bg-white dark:bg-inverse-surface text-primary border border-primary/30 dark:text-[#fcf9f4] font-extrabold text-base py-3.5 px-4 rounded-xl cursor-pointer text-center">Exportar PDF</button>
                </div>

                {/* View Switcher (List / Calendar / Timeline) */}
                <div className="flex bg-surface-container-high dark:bg-[#1f1e1a] rounded-xl p-1 gap-1 border">
                  {['list', 'calendar', 'timeline'].map((mode) => {
                    const labels = { list: 'Lista', calendar: 'Calendário', timeline: 'Linha do Tempo' };
                    return (
                      <button key={mode} type="button" onClick={() => setEscalasViewMode(mode)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${escalasViewMode === mode ? 'bg-primary text-white shadow-sm' : 'text-primary dark:text-[#fcf9f4]'}`}>
                        {labels[mode]}
                      </button>
                    );
                  })}
                </div>

                <div className="relative">
                  <input type="text" placeholder="Buscar escala por data, equipe ou integrante..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-4 pr-12 py-3.5 text-base rounded-xl border bg-white dark:bg-[#1f1e1a] dark:text-[#fcf9f4] outline-none shadow-sm" />
                </div>

                {/* VISUALIZATION 1: LIST VIEW */}
                {escalasViewMode === 'list' && (
                  <div className="space-y-4">
                    {filteredEscalas.map(escala => (
                      <div key={escala.id} className="bg-white dark:bg-inverse-surface border rounded-2xl p-5 shadow-sm space-y-4">
                        <div>
                          <span className="bg-primary/10 text-primary dark:text-inverse-primary text-xs font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider">{escala.teamName}</span>
                          <h3 className="text-xl font-black text-primary dark:text-[#fcf9f4] mt-2">{getBrazilianDate(escala.date, escala.isSunday, escala.shift)}</h3>
                        </div>
                        <div className="border-t border-dashed pt-3 space-y-2">
                          {escala.members && Object.keys(escala.members).map(memberId => {
                            const name = membrosGlobal[memberId]?.name || 'Membro';
                            const functions = escala.members[memberId].functions || [];
                            return (
                              <div key={memberId} className="flex justify-between items-center text-sm">
                                <span className="font-bold text-primary dark:text-[#fcf9f4]">{name}</span>
                                <span className="text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-md font-semibold">{functions.join(', ')}</span>
                              </div>
                            );
                          })}
                        </div>
                        <button onClick={() => handleShareEscalaOnWhatsApp(escala)} className="w-full bg-[#E8F8EF] dark:bg-[#143d26] text-[#0f5b33] dark:text-[#88f5b8] font-bold py-3.5 rounded-xl border text-sm">Enviar no WhatsApp</button>
                        <div className="flex gap-3 pt-1">
                          <button onClick={() => openEditEscalaForm(escala)} className="flex-grow bg-surface-container hover:bg-surface-variant text-primary font-bold py-2 rounded-lg border text-xs cursor-pointer">Editar</button>
                          <button onClick={() => setDeleteEscalaConfirmId(escala.id)} className="flex-grow bg-[#ffdad6] text-[#ba1a1a] font-bold py-2 rounded-lg border text-xs cursor-pointer">Excluir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* VISUALIZATION 2: CALENDAR VIEW */}
                {escalasViewMode === 'calendar' && (
                  <div className="bg-white dark:bg-inverse-surface border rounded-2xl p-4 shadow-sm space-y-4">
                    {/* Calendar Month Header */}
                    <div className="flex justify-between items-center pb-2">
                      <button onClick={() => changeCalendarMonth(-1)} className="p-2 border rounded-xl hover:bg-secondary/5 text-lg font-bold cursor-pointer">←</button>
                      <h3 className="text-lg font-black text-primary dark:text-[#fcf9f4] capitalize">
                        {currentCalendarDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                      </h3>
                      <button onClick={() => changeCalendarMonth(1)} className="p-2 border rounded-xl hover:bg-secondary/5 text-lg font-bold cursor-pointer">→</button>
                    </div>

                    {/* Team Selector for Calendar */}
                    <div className="bg-surface-container-low dark:bg-inverse-surface/30 p-3 rounded-xl border border-secondary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                      <label className="font-bold text-primary dark:text-[#fcf9f4]">
                        Selecione a equipe para ver integrantes:
                      </label>
                      <select
                        value={calendarSelectedTeamId}
                        onChange={(e) => setCalendarSelectedTeamId(e.target.value)}
                        className="bg-white dark:bg-[#1f1e1a] text-primary dark:text-[#fcf9f4] border border-outline/35 rounded-lg px-3 py-2 outline-none cursor-pointer text-sm font-semibold max-w-xs"
                      >
                        <option value="">-- Ver todas as equipes --</option>
                        {equipes.map(eq => (
                          <option key={eq.id} value={eq.id}>{eq.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Weekday Titles */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-extrabold text-on-surface-variant/80 uppercase">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => <div key={day} className="py-1">{day}</div>)}
                    </div>

                    {/* Month Days Grid */}
                    <div className="grid grid-cols-7 gap-1 border-t pt-1">
                      {getCalendarMonthGrid().map((cell, idx) => {
                        const dayEscalas = getEscalasForDate(cell.date);
                        const isToday = new Date().toDateString() === cell.date.toDateString();

                        return (
                          <div 
                            key={idx} 
                            className={`min-h-[100px] p-1.5 border rounded-lg flex flex-col justify-between transition-all ${
                              cell.isCurrentMonth 
                                ? 'bg-background dark:bg-[#1f1e1a]' 
                                : 'bg-surface-container-low/40 opacity-40'
                            } ${isToday ? 'ring-2 ring-primary' : 'border-outline/10'}`}
                          >
                            <span className={`text-xs font-bold ${isToday ? 'text-primary font-black' : 'text-on-surface-variant'}`}>
                              {cell.date.getDate()}
                            </span>
                            
                            {/* Escalas details on the grid */}
                            <div className="space-y-1 overflow-hidden mt-1 flex-grow flex flex-col justify-end">
                              {dayEscalas.map(esc => {
                                const isTeamMatch = !calendarSelectedTeamId || esc.teamId === calendarSelectedTeamId;
                                if (!isTeamMatch) return null;

                                return (
                                  <button
                                    key={esc.id}
                                    onClick={() => openEditEscalaForm(esc)}
                                    className="w-full text-left text-3xs bg-primary/10 text-primary dark:bg-primary-container/20 dark:text-inverse-primary font-bold p-1 rounded cursor-pointer block hover:scale-[1.02] space-y-0.5"
                                    title={`${esc.teamName} - Clique para editar`}
                                  >
                                    {!calendarSelectedTeamId ? (
                                      <span className="block truncate font-extrabold">{esc.teamName} {esc.shift ? `(${esc.shift[0]})` : ''}</span>
                                    ) : (
                                      <div className="space-y-0.5">
                                        <span className="block font-black border-b border-primary/20 pb-0.5 truncate uppercase text-[8px]">{esc.shift || 'Serviço'}</span>
                                        {esc.members && Object.keys(esc.members).map(memberId => {
                                          const name = membrosGlobal[memberId]?.name || 'Membro';
                                          const firstWord = name.split(' ')[0];
                                          const funcs = esc.members[memberId].functions || [];
                                          const firstFunc = funcs.length > 0 ? funcs[0] : '';
                                          return (
                                            <span key={memberId} className="block truncate font-semibold text-[8.5px] leading-tight">
                                              • {firstWord} {firstFunc ? `(${firstFunc})` : ''}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* VISUALIZATION 3: TIMELINE (GRID MATCHING THE OFFICIAL PDF STRUCTURE) */}
                {escalasViewMode === 'timeline' && (
                  <div className="bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-2xl p-5 shadow-sm space-y-4">
                    {/* Team Selector for Timeline */}
                    <div className="bg-surface-container-low dark:bg-inverse-surface/30 p-3 rounded-xl border border-secondary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                      <label className="font-bold text-primary dark:text-[#fcf9f4]">
                        Selecione a equipe para ver a grade no formato oficial:
                      </label>
                      <select
                        value={timelineSelectedTeamId}
                        onChange={(e) => setTimelineSelectedTeamId(e.target.value)}
                        className="bg-white dark:bg-[#1f1e1a] text-primary dark:text-[#fcf9f4] border border-outline/35 rounded-lg px-3 py-2 outline-none cursor-pointer text-sm font-semibold max-w-xs"
                      >
                        <option value="">-- Selecione uma Equipe --</option>
                        {equipes.map(eq => (
                          <option key={eq.id} value={eq.id}>{eq.name}</option>
                        ))}
                      </select>
                    </div>

                    {!timelineSelectedTeamId ? (
                      <div className="py-8 text-center italic text-on-surface-variant">Por favor, selecione uma equipe acima para ver a grade.</div>
                    ) : (
                      (() => {
                        const selectedTeamObj = equipes.find(eq => eq.id === timelineSelectedTeamId);
                        if (!selectedTeamObj) return null;

                        const teamFunctions = selectedTeamObj.functions || [];
                        const teamEscalas = escalas
                          .filter(esc => esc.teamId === timelineSelectedTeamId)
                          .sort((a, b) => a.date.localeCompare(b.date));

                        if (teamEscalas.length === 0) {
                          return <div className="py-8 text-center italic text-on-surface-variant">Nenhuma escala ativa cadastrada para esta equipe.</div>;
                        }

                        return (
                          <div className="overflow-x-auto">
                            <table className="w-full text-center border-collapse border border-outline/20 text-xs">
                              <thead>
                                <tr className="bg-surface-container dark:bg-[#1f1e1a] font-bold border-b border-outline/30">
                                  <th className="p-3 border-r border-outline/20 sticky left-0 z-10 bg-white dark:bg-[#1f1e1a] font-extrabold text-[11px] w-[95px] text-left">Data</th>
                                  {teamFunctions.map(func => (
                                    <th key={func} className="p-3 border-r border-outline/20 font-extrabold text-[11px] min-w-[100px] truncate">{func}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {teamEscalas.map(esc => {
                                  const formattedDate = formatBrazilianDate(esc.date, esc.isSunday, esc.shift);
                                  return (
                                    <tr key={esc.id} onClick={() => openEditEscalaForm(esc)} className="border-b border-outline/15 hover:bg-secondary/5 transition-colors cursor-pointer font-semibold">
                                      <td className="p-3 border-r border-outline/20 sticky left-0 z-10 bg-white dark:bg-[#1f1e1a] font-extrabold text-left whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{formattedDate}</td>
                                      {teamFunctions.map(func => {
                                        const matchedMemberId = Object.keys(esc.members || {}).find(mid => 
                                          esc.members[mid].functions?.includes(func)
                                        );
                                        const name = matchedMemberId ? membrosGlobal[matchedMemberId]?.name : '';
                                        const displayName = name ? name.split(' ').slice(0, 2).join(' ') : '-';
                                        
                                        return (
                                          <td key={func} className="p-3 border-r border-outline/20 text-[11px]">
                                            <span className={name ? 'text-primary dark:text-inverse-primary font-bold' : 'text-on-surface-variant/40 italic'}>
                                              {displayName}
                                            </span>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </main>

      {/* Batch Delete Scales Modal */}
      {isDeleteLoteOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-inverse-surface rounded-2xl p-6 max-w-md w-full border border-secondary/20 shadow-xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-primary dark:text-[#fcf9f4]">Apagar Escalas em Lote</h3>
              <button onClick={() => setIsDeleteLoteOpen(false)} className="p-1.5 hover:bg-secondary/5 rounded-full cursor-pointer">✕</button>
            </div>

            {deleteLoteError && <div className="bg-error-container text-on-error-container p-3 rounded-lg text-xs font-bold">{deleteLoteError}</div>}

            <form onSubmit={handleBatchDeleteEscalas} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-primary dark:text-[#fcf9f4] mb-1">Data Inicial</label>
                  <input type="date" value={deleteLoteStartDate} onChange={e => setDeleteLoteStartDate(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-[#1f1e1a] cursor-pointer" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-primary dark:text-[#fcf9f4] mb-1">Data Final</label>
                  <input type="date" value={deleteLoteEndDate} onChange={e => setDeleteLoteEndDate(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-[#1f1e1a] cursor-pointer" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-primary dark:text-[#fcf9f4] mb-1">Filtro por Equipe (Opcional)</label>
                <select value={deleteLoteTeamId} onChange={e => setDeleteLoteTeamId(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-[#1f1e1a] cursor-pointer">
                  <option value="">-- Todas as Equipes --</option>
                  {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                </select>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button type="submit" className="w-full bg-[#ba1a1a] hover:bg-[#a61717] text-white font-bold text-lg py-4 rounded-xl cursor-pointer">Confirmar Exclusão</button>
                <button type="button" onClick={() => setIsDeleteLoteOpen(false)} className="w-full bg-secondary-container text-on-secondary-container font-bold text-lg py-4 rounded-xl cursor-pointer">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Team Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-inverse-surface rounded-2xl p-6 max-w-md w-full border shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-primary dark:text-[#fcf9f4]">Confirmar Exclusão da Equipe?</h3>
              <p className="text-base text-on-surface-variant">Tem certeza que deseja excluir esta equipe?</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleDeleteTeam(deleteConfirmId)} className="w-full bg-[#ba1a1a] text-white font-bold text-lg py-4 rounded-xl cursor-pointer">Sim, Excluir</button>
              <button onClick={() => setDeleteConfirmId(null)} className="w-full bg-secondary-container text-on-secondary-container font-bold text-lg py-4 rounded-xl cursor-pointer">Não, Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation */}
      {deleteMemberConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-inverse-surface rounded-2xl p-6 max-w-md w-full border shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-primary dark:text-[#fcf9f4]">Remover da Equipe?</h3>
              <p className="text-base text-on-surface-variant">Deseja remover este integrante desta equipe?</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleRemoveMemberFromTeam(deleteMemberConfirmId)} className="w-full bg-[#ba1a1a] text-white font-bold text-lg py-4 rounded-xl cursor-pointer">Sim, Remover</button>
              <button onClick={() => setDeleteMemberConfirmId(null)} className="w-full bg-secondary-container text-on-secondary-container font-bold text-lg py-4 rounded-xl cursor-pointer">Não, Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Escala Confirmation */}
      {deleteEscalaConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-inverse-surface rounded-2xl p-6 max-w-md w-full border shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-primary dark:text-[#fcf9f4]">Excluir Escala?</h3>
              <p className="text-base text-on-surface-variant">Tem certeza que deseja excluir esta escala?</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleDeleteEscala(deleteEscalaConfirmId)} className="w-full bg-[#ba1a1a] text-white font-bold text-lg py-4 rounded-xl cursor-pointer">Sim, Excluir</button>
              <button onClick={() => setDeleteEscalaConfirmId(null)} className="w-full bg-secondary-container text-on-secondary-container font-bold text-lg py-4 rounded-xl cursor-pointer">Não, Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Conflict Warning Modal */}
      {conflictModalMessage && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-inverse-surface rounded-2xl p-6 max-w-md w-full border shadow-xl space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-[#ffdad6] text-[#ba1a1a] rounded-full flex items-center justify-center mx-auto">✕</div>
              <h3 className="text-xl font-bold text-primary dark:text-[#fcf9f4]">Conflito de Escala</h3>
              <p className="text-base text-on-surface-variant leading-relaxed">{conflictModalMessage}</p>
            </div>
            <div className="pt-2">
              <button onClick={() => setConflictModalMessage('')} className="w-full bg-primary text-white font-bold text-lg py-4 rounded-xl cursor-pointer">Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch generation processing modal */}
      {isLoteProcessing && (
        <div className="fixed inset-0 bg-black/75 z-55 flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-inverse-surface rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-secondary/20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <h3 className="text-xl font-bold text-primary dark:text-[#fcf9f4]">Gerando Escalas...</h3>
            <p className="text-sm text-on-surface-variant dark:text-[#d1c4bb] leading-relaxed">Aguarde. Sorteando funções, rotacionando e verificando conflitos nas escalas.</p>
          </div>
        </div>
      )}
      {/* PDF Export Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-inverse-surface rounded-2xl p-6 max-w-md w-full border border-secondary/20 shadow-xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-primary dark:text-[#fcf9f4]">Exportar Escala em PDF</h3>
              <button onClick={() => setIsPrintModalOpen(false)} className="p-1.5 hover:bg-secondary/5 rounded-full cursor-pointer">✕</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); window.print(); }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-primary dark:text-[#fcf9f4] mb-1">Selecione a Equipe</label>
                <select value={printTeamId} onChange={e => setPrintTeamId(e.target.value)} required className="w-full p-3 border rounded-xl dark:bg-[#1f1e1a] cursor-pointer">
                  <option value="">-- Escolha a Equipe --</option>
                  {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-primary dark:text-[#fcf9f4] mb-1">Data Inicial</label>
                  <input type="date" value={printStartDate} onChange={e => setPrintStartDate(e.target.value)} required className="w-full p-3 border rounded-xl dark:bg-[#1f1e1a] cursor-pointer" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-primary dark:text-[#fcf9f4] mb-1">Data Final</label>
                  <input type="date" value={printEndDate} onChange={e => setPrintEndDate(e.target.value)} required className="w-full p-3 border rounded-xl dark:bg-[#1f1e1a] cursor-pointer" />
                </div>
              </div>

              <div className="bg-surface-container-low dark:bg-inverse-surface/30 p-3 rounded-xl text-2xs text-on-surface-variant leading-relaxed">
                ℹ️ Esta ação abrirá a janela de impressão do seu navegador. Para salvar como arquivo PDF, selecione a opção <strong>"Salvar como PDF"</strong> no destino da impressora.
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <button type="submit" className="w-full bg-[#25D366] text-white font-bold text-lg py-4 rounded-xl cursor-pointer">Gerar PDF para Impressão</button>
                <button type="button" onClick={() => setIsPrintModalOpen(false)} className="w-full bg-secondary-container text-on-secondary-container font-bold text-lg py-4 rounded-xl cursor-pointer">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>

      {/* Printable PDF Section (only visible during print) */}
      <div id="print-section" className="hidden print:block bg-white text-black p-6 font-sans">
        {(() => {
          if (!printTeamId || !printStartDate || !printEndDate) return null;
          
          const selectedTeam = equipes.find(eq => eq.id === printTeamId);
          if (!selectedTeam) return null;
          
          const teamFunctions = selectedTeam.functions || [];
          
          const filtered = escalas.filter(esc => 
            esc.teamId === printTeamId &&
            esc.date >= printStartDate &&
            esc.date <= printEndDate
          ).sort((a, b) => a.date.localeCompare(b.date));

          if (filtered.length === 0) {
            return <p className="text-center p-8 font-bold">Nenhuma escala cadastrada neste período.</p>;
          }

          // Group scales by Month
          const monthsMap = {};
          filtered.forEach(esc => {
            const dateObj = new Date(esc.date + 'T12:00:00');
            // Get local month name
            const monthName = dateObj.toLocaleString('pt-BR', { month: 'long' });
            if (!monthsMap[monthName]) {
              monthsMap[monthName] = [];
            }
            monthsMap[monthName].push(esc);
          });

          return Object.keys(monthsMap).map(monthName => {
            const monthScales = monthsMap[monthName];
            return (
              <div key={monthName} className="mb-10 page-break-after-always">
                <h2 className="text-center font-bold text-base text-[#ba1a1a] uppercase border-b-2 border-[#ba1a1a] pb-1.5 mb-4 tracking-wider">
                  ESCALA {monthName}
                </h2>
                
                <table className="w-full text-center border-collapse border border-black text-[9px]">
                  <thead>
                    <tr className="bg-gray-150 font-bold border-b border-black">
                      <th className="p-1.5 border-r border-black font-extrabold text-[9px] w-[65px]">Data</th>
                      {teamFunctions.map(func => (
                        <th key={func} className="p-1.5 border-r border-black font-extrabold text-[9px]">{func}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthScales.map(esc => {
                      const formattedDate = getPdfDateFormat(esc.date, esc.isSunday, esc.shift);
                      return (
                        <tr key={esc.id} className="border-b border-black font-semibold">
                          <td className="p-1.5 border-r border-black font-extrabold whitespace-nowrap">{formattedDate}</td>
                          {teamFunctions.map(func => {
                            const matchedMemberId = Object.keys(esc.members || {}).find(mid => 
                              esc.members[mid].functions?.includes(func)
                            );
                            const name = matchedMemberId ? membrosGlobal[matchedMemberId]?.name : '';
                            const displayName = name ? name.split(' ').slice(0, 2).join(' ') : '-';
                            return (
                              <td key={func} className="p-1.5 border-r border-black text-[9px]">
                                {displayName}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          });
        })()}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-section, #print-section * {
            visibility: visible !important;
          }
          #print-section {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          @page {
            size: landscape;
            margin: 8mm;
          }
        }
      ` }} />

    </div>
  );
}
