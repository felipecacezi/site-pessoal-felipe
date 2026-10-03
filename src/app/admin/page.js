'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { ref, onValue, update, remove, set } from 'firebase/database';
import { db } from '../services/firebase';
import { SYSTEM_TOOLS, SYSTEM_ROLES, getDefaultRolePermissions } from '../constants/permissions';

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading, logout, rolePermissions, availableRoles } = useAuth();
  const router = useRouter();

  // Tab State: 'users' | 'roles'
  const [activeTab, setActiveTab] = useState('users');

  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionFeedback, setActionFeedback] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  // Modal para editar permissões específicas de um usuário
  const [editingUserPermissions, setEditingUserPermissions] = useState(null);
  const [userToolsState, setUserToolsState] = useState({});
  const [userActionsState, setUserActionsState] = useState({});

  // Estado de configuração das Roles
  const [rolesConfig, setRolesConfig] = useState(getDefaultRolePermissions());
  const [savingRoles, setSavingRoles] = useState(false);

  // Modal para criar nova Role
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
  const [newRoleId, setNewRoleId] = useState('');
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [confirmDeleteRoleKey, setConfirmDeleteRoleKey] = useState(null);

  // Sincroniza estado de roles vindo do AuthContext / Firebase
  useEffect(() => {
    if (rolePermissions) {
      setRolesConfig(rolePermissions);
    }
  }, [rolePermissions]);

  // Proteção: apenas administradores
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (!isAdmin) {
        router.push('/restricted');
      }
    }
  }, [user, isAdmin, authLoading, router]);

  // Carregar lista de usuários
  useEffect(() => {
    if (!user || !isAdmin) return;

    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const list = Object.entries(data).map(([uid, uData]) => ({
            uid,
            ...uData,
            role: uData.role || 'basic',
            approved: uData.approved === true,
            allowedTools: uData.allowedTools || {},
            allowedActions: uData.allowedActions || {}
          }));
          list.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          setUsersList(list);
        } else {
          setUsersList([]);
        }
        setLoadingUsers(false);
      },
      (error) => {
        console.error('Erro ao carregar usuários:', error);
        setActionFeedback({ type: 'error', message: `Erro ao buscar dados: ${error.message}` });
        setLoadingUsers(false);
      }
    );

    return () => unsubscribe();
  }, [user, isAdmin]);

  // Alterar role do usuário
  const handleUpdateRole = async (targetUid, newRole) => {
    if (targetUid === user.uid && newRole !== 'admin') {
      const confirmSelf = confirm('Atenção: Você está alterando sua própria role de admin. Você perderá acesso a este painel. Deseja continuar?');
      if (!confirmSelf) return;
    }

    try {
      await update(ref(db, `users/${targetUid}`), {
        role: newRole
      });
      setActionFeedback({
        type: 'success',
        message: `Role alterada para ${newRole.toUpperCase()} com sucesso!`
      });
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      console.error('Erro ao atualizar role:', err);
      setActionFeedback({ type: 'error', message: `Falha ao atualizar role: ${err.message}` });
    }
  };

  // Alterar aprovação
  const handleToggleApproval = async (targetUid, currentStatus) => {
    try {
      await update(ref(db, `users/${targetUid}`), {
        approved: !currentStatus
      });
      setActionFeedback({
        type: 'success',
        message: `Status atualizado para: ${!currentStatus ? 'Aprovado' : 'Pendente'}`
      });
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      console.error('Erro ao alternar status de aprovação:', err);
      setActionFeedback({ type: 'error', message: `Falha ao alterar aprovação: ${err.message}` });
    }
  };

  // Excluir usuário
  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    try {
      await remove(ref(db, `users/${confirmDeleteUser.uid}`));
      setActionFeedback({
        type: 'success',
        message: `Usuário removido com sucesso!`
      });
      setConfirmDeleteUser(null);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      console.error('Erro ao deletar usuário:', err);
      setActionFeedback({ type: 'error', message: `Falha ao deletar: ${err.message}` });
    }
  };

  // Toggle rápido de acesso à ferramenta diretamente na tabela
  const handleToggleUserTool = async (uItem, toolId) => {
    if (uItem.role === 'admin') return;

    const currentRoleTools = rolesConfig[uItem.role]?.tools || {};
    const defaultForRole = currentRoleTools[toolId] ?? false;

    const hasExplicit = uItem.allowedTools && typeof uItem.allowedTools[toolId] === 'boolean';
    const currentActive = hasExplicit ? uItem.allowedTools[toolId] : defaultForRole;
    const nextVal = !currentActive;

    try {
      await update(ref(db, `users/${uItem.uid}/allowedTools`), {
        [toolId]: nextVal
      });
      setActionFeedback({
        type: 'success',
        message: `Acesso a "${toolId}" para ${uItem.displayName || uItem.email} foi ${nextVal ? 'LIBERADO' : 'BLOQUEADO'}.`
      });
      setTimeout(() => setActionFeedback(null), 2500);
    } catch (err) {
      setActionFeedback({ type: 'error', message: `Erro ao alterar ferramenta: ${err.message}` });
    }
  };

  // Abrir modal de edição detalhada de permissões de um usuário
  const openUserPermissionsModal = (uItem) => {
    setEditingUserPermissions(uItem);

    const initialTools = {};
    const initialActions = {};

    SYSTEM_TOOLS.forEach((tool) => {
      const roleToolVal = rolesConfig[uItem.role]?.tools?.[tool.id] ?? false;
      const userToolVal = uItem.allowedTools?.[tool.id];
      initialTools[tool.id] = typeof userToolVal === 'boolean' ? userToolVal : roleToolVal;

      tool.actions.forEach((act) => {
        const actionKey = `${tool.id}:${act.id}`;
        const roleActionVal = rolesConfig[uItem.role]?.actions?.[actionKey] ?? false;
        const userActionVal = uItem.allowedActions?.[actionKey];
        initialActions[actionKey] = typeof userActionVal === 'boolean' ? userActionVal : roleActionVal;
      });
    });

    setUserToolsState(initialTools);
    setUserActionsState(initialActions);
  };

  // Salvar permissões personalizadas do usuário
  const handleSaveUserPermissions = async () => {
    if (!editingUserPermissions) return;

    try {
      await update(ref(db, `users/${editingUserPermissions.uid}`), {
        allowedTools: userToolsState,
        allowedActions: userActionsState
      });
      setActionFeedback({
        type: 'success',
        message: `Permissões de ${editingUserPermissions.displayName || editingUserPermissions.email} salvas!`
      });
      setEditingUserPermissions(null);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      console.error('Erro ao salvar permissões do usuário:', err);
      setActionFeedback({ type: 'error', message: `Erro ao salvar: ${err.message}` });
    }
  };

  // Resetar permissões do usuário para o padrão da role
  const handleResetUserPermissionsToRole = async () => {
    if (!editingUserPermissions) return;

    try {
      await update(ref(db, `users/${editingUserPermissions.uid}`), {
        allowedTools: null,
        allowedActions: null
      });
      setActionFeedback({
        type: 'success',
        message: `Permissões resetadas para os padrões da role ${editingUserPermissions.role.toUpperCase()}!`
      });
      setEditingUserPermissions(null);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      console.error('Erro ao resetar permissões:', err);
      setActionFeedback({ type: 'error', message: `Erro ao resetar: ${err.message}` });
    }
  };

  // Modificar matriz de roles
  const handleToggleRoleTool = (roleId, toolId) => {
    if (roleId === 'admin') return;
    setRolesConfig((prev) => {
      const currentRole = prev[roleId] || { tools: {}, actions: {} };
      const currentVal = !!currentRole.tools?.[toolId];
      const nextVal = !currentVal;

      const updatedActions = { ...(currentRole.actions || {}) };
      if (!nextVal) {
        const toolObj = SYSTEM_TOOLS.find((t) => t.id === toolId);
        toolObj?.actions.forEach((act) => {
          updatedActions[`${toolId}:${act.id}`] = false;
        });
      }

      return {
        ...prev,
        [roleId]: {
          ...currentRole,
          tools: {
            ...(currentRole.tools || {}),
            [toolId]: nextVal
          },
          actions: updatedActions
        }
      };
    });
  };

  const handleToggleRoleAction = (roleId, toolId, actionId) => {
    if (roleId === 'admin') return;
    const actionKey = `${toolId}:${actionId}`;
    setRolesConfig((prev) => {
      const currentRole = prev[roleId] || { tools: {}, actions: {} };
      const currentVal = !!currentRole.actions?.[actionKey];
      const nextVal = !currentVal;

      const updatedTools = { ...(currentRole.tools || {}) };
      if (nextVal) {
        updatedTools[toolId] = true;
      }

      return {
        ...prev,
        [roleId]: {
          ...currentRole,
          tools: updatedTools,
          actions: {
            ...(currentRole.actions || {}),
            [actionKey]: nextVal
          }
        }
      };
    });
  };

  // Criar nova Role customizada
  const handleCreateNewRole = async (e) => {
    e.preventDefault();
    const cleanId = newRoleId
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    if (!cleanId) {
      alert('Identificador de Role inválido.');
      return;
    }

    if (rolesConfig[cleanId]) {
      alert(`A role "${cleanId}" já existe no sistema.`);
      return;
    }

    const newRoleData = {
      label: newRoleLabel.trim() || cleanId,
      description: newRoleDescription.trim() || 'Role personalizada criada pelo administrador.',
      isSystem: false,
      tools: {},
      actions: {}
    };

    // Inicializa com ferramentas falsas por padrão
    SYSTEM_TOOLS.forEach((tool) => {
      newRoleData.tools[tool.id] = false;
      tool.actions.forEach((act) => {
        newRoleData.actions[`${tool.id}:${act.id}`] = false;
      });
    });

    const updatedRoles = {
      ...rolesConfig,
      [cleanId]: newRoleData
    };

    setRolesConfig(updatedRoles);
    setIsCreateRoleModalOpen(false);
    setNewRoleId('');
    setNewRoleLabel('');
    setNewRoleDescription('');

    // Salva automaticamente no Firebase
    try {
      await set(ref(db, `system_config/roles_permissions/${cleanId}`), newRoleData);
      setActionFeedback({
        type: 'success',
        message: `Nova Role "${newRoleData.label}" criada com sucesso! Configure suas ferramentas e ações abaixo.`
      });
      setTimeout(() => setActionFeedback(null), 3500);
    } catch (err) {
      console.error('Erro ao salvar nova role:', err);
      setActionFeedback({ type: 'error', message: `Erro ao salvar nova role: ${err.message}` });
    }
  };

  // Excluir role
  const handleDeleteRole = async (roleKey) => {
    if (roleKey === 'admin') {
      alert('Não é permitido remover a role de Administrador Geral.');
      return;
    }

    // Verifica se algum usuário está usando esta role
    const usersWithRole = usersList.filter((u) => u.role === roleKey);
    if (usersWithRole.length > 0) {
      alert(`Não é possível excluir a role "${roleKey}" pois existem ${usersWithRole.length} usuário(s) vinculados a ela. Mude o papel deles primeiro.`);
      return;
    }

    try {
      await remove(ref(db, `system_config/roles_permissions/${roleKey}`));
      setRolesConfig((prev) => {
        const next = { ...prev };
        delete next[roleKey];
        return next;
      });
      setConfirmDeleteRoleKey(null);
      setActionFeedback({
        type: 'success',
        message: `Role "${roleKey}" excluída com sucesso!`
      });
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      console.error('Erro ao excluir role:', err);
      setActionFeedback({ type: 'error', message: `Erro ao excluir role: ${err.message}` });
    }
  };

  // Salvar a configuração de Roles no Firebase
  const handleSaveRolesConfig = async () => {
    setSavingRoles(true);
    try {
      await set(ref(db, 'system_config/roles_permissions'), rolesConfig);
      setActionFeedback({
        type: 'success',
        message: 'Matriz de permissões das Roles atualizada com sucesso para todo o sistema!'
      });
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      console.error('Erro ao salvar permissões das roles:', err);
      setActionFeedback({ type: 'error', message: `Erro ao salvar roles: ${err.message}` });
    } finally {
      setSavingRoles(false);
    }
  };

  // Filtros de usuários
  const filteredUsers = usersList.filter((u) => {
    const matchSearch =
      (u.displayName && u.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchRole = filterRole === 'all' ? true : u.role === filterRole;
    const matchStatus =
      filterStatus === 'all' ? true : filterStatus === 'approved' ? u.approved : !u.approved;

    return matchSearch && matchRole && matchStatus;
  });

  // Estatísticas
  const totalCount = usersList.length;
  const adminCount = usersList.filter((u) => u.role === 'admin').length;
  const musicLeadersCount = usersList.filter((u) => ['ministro', 'lider_louvor'].includes(u.role)).length;
  const basicCount = usersList.filter((u) => u.role === 'basic' || !u.role).length;
  const pendingCount = usersList.filter((u) => !u.approved).length;

  // Lista dinâmica de roles para exibição nos cards da aba de Roles
  const rolesToRender = Object.keys(rolesConfig).map((rId) => {
    const rData = rolesConfig[rId] || {};
    const defaultMeta = SYSTEM_ROLES.find((sr) => sr.id === rId);
    return {
      id: rId,
      label: rData.label || defaultMeta?.label || rId,
      description: rData.description || defaultMeta?.description || 'Role configurada no sistema',
      isSystem: !!defaultMeta?.isSystem
    };
  });

  if (authLoading || (user && !isAdmin && loadingUsers)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#121210]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background dark:bg-[#121210]">
      {/* Top Header */}
      <header className="bg-white dark:bg-inverse-surface border-b border-secondary/20 dark:border-secondary/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link
              href="/restricted"
              className="text-on-surface-variant hover:text-primary transition-colors p-1.5 -ml-1.5 rounded-lg border border-transparent hover:border-secondary/20"
              title="Voltar ao Painel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </Link>
            <span className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              Admin
            </span>
            <h1 className="text-lg font-bold text-primary dark:text-[#fcf9f4]">
              Painel de Administração e Permissões
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3">
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-9 h-9 rounded-full border border-secondary/20 shadow-sm"
              />
              <div className="text-right">
                <p className="text-xs font-bold text-primary dark:text-[#fcf9f4] leading-tight">
                  {user.displayName}
                </p>
                <p className="text-[10px] text-on-surface-variant font-mono">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="px-3.5 py-1.5 text-xs font-bold border border-secondary/30 rounded-lg text-primary dark:text-inverse-primary hover:bg-secondary/10 transition-colors cursor-pointer"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 md:px-12 py-8">
        
        {/* Feedback Message */}
        {actionFeedback && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm font-semibold flex items-center justify-between border ${
              actionFeedback.type === 'success'
                ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
            }`}
          >
            <span>{actionFeedback.message}</span>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-xs font-bold underline cursor-pointer ml-4"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-8 border-b border-secondary/20 dark:border-secondary/10 pb-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'users'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container dark:bg-inverse-surface text-on-surface-variant hover:text-primary hover:bg-secondary/10'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            <span>Usuários e Ferramentas</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">{usersList.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'roles'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container dark:bg-inverse-surface text-on-surface-variant hover:text-primary hover:bg-secondary/10'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            <span>Configuração de Roles ({rolesToRender.length})</span>
          </button>
        </div>

        {/* TAB 1: USUÁRIOS E FERRAMENTAS */}
        {activeTab === 'users' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Total</p>
                <p className="text-2xl font-extrabold text-primary dark:text-[#fcf9f4] mt-1">{totalCount}</p>
              </div>
              <div className="bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Admin</p>
                <p className="text-2xl font-extrabold text-red-600 dark:text-red-400 mt-1">{adminCount}</p>
              </div>
              <div className="bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Louvor/Ministro</p>
                <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">{musicLeadersCount}</p>
              </div>
              <div className="bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Básico</p>
                <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{basicCount}</p>
              </div>
              <div className="bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pendentes</p>
                <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</p>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-2xl p-4 sm:p-6 mb-8 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                <div className="relative flex-grow max-w-md">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-on-surface-variant">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.637Z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por nome ou e-mail..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-xl text-sm text-primary dark:text-[#fcf9f4] focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-on-surface-variant hover:text-primary cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase">Role:</label>
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-xl px-3 py-2 text-xs font-semibold text-primary dark:text-[#fcf9f4] focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="all">Todas as Roles</option>
                      {availableRoles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase">Status:</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-xl px-3 py-2 text-xs font-semibold text-primary dark:text-[#fcf9f4] focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="all">Todos os Status</option>
                      <option value="approved">Aprovados</option>
                      <option value="pending">Pendentes</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela de Usuários com Controles de Ferramentas */}
            <div className="bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-2xl shadow-sm overflow-hidden mb-12">
              <div className="p-5 border-b border-secondary/10 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <h2 className="font-bold text-primary dark:text-[#fcf9f4] text-base">
                    Gestão de Acesso por Usuário ({filteredUsers.length})
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Você pode ligar/desligar ferramentas diretamente nos botões abaixo ou clicar em <b>"Personalizar Ações"</b> para detalhes.
                  </p>
                </div>
              </div>

              {loadingUsers ? (
                <div className="py-16 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                  <p className="text-sm text-on-surface-variant">Carregando lista de usuários...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm font-semibold text-on-surface-variant">
                    Nenhum usuário encontrado com os filtros selecionados.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-bright/50 dark:bg-[#121210]/50 border-b border-secondary/10 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        <th className="py-3.5 px-6">Usuário</th>
                        <th className="py-3.5 px-6">Role Principal</th>
                        <th className="py-3.5 px-6">Ferramentas Liberadas</th>
                        <th className="py-3.5 px-6">Status</th>
                        <th className="py-3.5 px-6 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary/10 text-sm">
                      {filteredUsers.map((item) => {
                        const isCurrentUser = item.uid === user.uid;

                        return (
                          <tr key={item.uid} className="hover:bg-surface-bright/30 dark:hover:bg-[#121210]/30 transition-colors">
                            {/* Identidade */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.email || 'user')}`}
                                  alt={item.displayName || 'Avatar'}
                                  className="w-10 h-10 rounded-full border border-secondary/20 object-cover bg-surface-container flex-shrink-0"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-primary dark:text-[#fcf9f4]">
                                      {item.displayName || 'Sem nome'}
                                    </span>
                                    {isCurrentUser && (
                                      <span className="text-[10px] bg-primary text-on-primary font-bold px-1.5 py-0.5 rounded">
                                        Você
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-on-surface-variant block font-mono">
                                    {item.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Role (Dinâmico com as novas criadas) */}
                            <td className="py-4 px-6">
                              <select
                                value={item.role}
                                onChange={(e) => handleUpdateRole(item.uid, e.target.value)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg border focus:outline-none transition-colors cursor-pointer ${
                                  item.role === 'admin'
                                    ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 font-extrabold'
                                    : item.role === 'lider_louvor'
                                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400 font-bold'
                                    : item.role === 'ministro'
                                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-bold'
                                    : 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                                }`}
                              >
                                {availableRoles.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.label}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Ferramentas Liberadas */}
                            <td className="py-4 px-6">
                              {item.role === 'admin' ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-md">
                                  <span>★</span> Acesso Total (Admin)
                                </span>
                              ) : (
                                <div className="flex flex-wrap gap-1.5 max-w-xs">
                                  {SYSTEM_TOOLS.filter((t) => t.id !== 'admin').map((tool) => {
                                    const roleTools = rolesConfig[item.role]?.tools || {};
                                    const defaultVal = roleTools[tool.id] ?? false;
                                    const hasExplicit = item.allowedTools && typeof item.allowedTools[tool.id] === 'boolean';
                                    const isAllowed = hasExplicit ? item.allowedTools[tool.id] : defaultVal;

                                    return (
                                      <button
                                        key={tool.id}
                                        type="button"
                                        onClick={() => handleToggleUserTool(item, tool.id)}
                                        className={`px-2 py-1 rounded text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                          isAllowed
                                            ? 'bg-green-500/15 border-green-500/30 text-green-700 dark:text-green-300 hover:bg-green-500/25'
                                            : 'bg-surface-bright dark:bg-black/20 border-secondary/30 text-on-surface-variant/60 hover:bg-secondary/15 line-through opacity-70'
                                        }`}
                                        title={`Clique para ${isAllowed ? 'remover' : 'liberar'} acesso a ${tool.name}`}
                                      >
                                        <span>{isAllowed ? '✓' : '✕'}</span>
                                        <span>{tool.name.replace('Gerenciador de ', '').replace('Criador de ', '')}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-4 px-6">
                              <button
                                onClick={() => handleToggleApproval(item.uid, item.approved)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                                  item.approved
                                    ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/20'
                                    : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                                }`}
                                title={item.approved ? 'Revogar aprovação' : 'Aprovar conta'}
                              >
                                <span className={`w-2 h-2 rounded-full ${item.approved ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}></span>
                                <span>{item.approved ? 'Aprovado' : 'Pendente'}</span>
                              </button>
                            </td>

                            {/* Ações */}
                            <td className="py-4 px-6 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openUserPermissionsModal(item)}
                                  className="text-xs font-bold text-primary dark:text-[#fcf9f4] bg-secondary/15 hover:bg-secondary/25 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border border-secondary/20"
                                  title="Personalizar ações específicas"
                                >
                                  Personalizar Ações
                                </button>

                                {!isCurrentUser && (
                                  <button
                                    onClick={() => setConfirmDeleteUser(item)}
                                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-500/10 px-2 py-1.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                                    title="Remover usuário"
                                  >
                                    Excluir
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: CONFIGURAÇÃO DE ROLES E PRIVILÉGIOS */}
        {activeTab === 'roles' && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-inverse-surface border border-secondary/20 dark:border-secondary/10 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-primary dark:text-[#fcf9f4]">
                  Matriz de Privilégios por Role
                </h2>
                <p className="text-xs text-on-surface-variant mt-1 max-w-2xl">
                  Defina o que cada Role tem direito a fazer em cada ferramenta. Você pode também criar novas roles especializadas (ex: "operador_midia", "coordenador_gincanas") e definir privilégios específicos.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsCreateRoleModalOpen(true)}
                  className="px-4 py-2 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <span className="text-sm font-bold">+</span>
                  <span>Criar Nova Role</span>
                </button>
                <button
                  onClick={handleSaveRolesConfig}
                  disabled={savingRoles}
                  className="px-5 py-2 text-xs font-bold bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {savingRoles ? 'Salvando...' : 'Salvar Alterações Globais'}
                </button>
              </div>
            </div>

            {/* Grid de Roles */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {rolesToRender.map((roleObj) => {
                const isRoleAdmin = roleObj.id === 'admin';
                const roleData = rolesConfig[roleObj.id] || { tools: {}, actions: {} };

                return (
                  <div
                    key={roleObj.id}
                    className={`bg-white dark:bg-inverse-surface border rounded-2xl p-6 shadow-sm flex flex-col justify-between ${
                      isRoleAdmin
                        ? 'border-red-500/30 bg-red-500/[0.02]'
                        : !roleObj.isSystem
                        ? 'border-green-500/40 bg-green-500/[0.01]'
                        : 'border-secondary/20 dark:border-secondary/10'
                    }`}
                  >
                    <div>
                      {/* Header do Card de Role */}
                      <div className="flex justify-between items-start mb-4 pb-4 border-b border-secondary/10">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-primary dark:text-[#fcf9f4]">
                              {roleObj.label}
                            </h3>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-container dark:bg-[#121210] border border-secondary/20 text-on-surface-variant">
                              {roleObj.id}
                            </span>
                            {!roleObj.isSystem && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                                Personalizada
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant mt-1">
                            {roleObj.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {isRoleAdmin ? (
                            <span className="text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-500/15 border border-red-500/20 px-2 py-0.5 rounded-full">
                              Privilégio Total
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteRoleKey(roleObj.id)}
                              className="text-xs text-red-500 hover:text-red-700 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border border-transparent hover:border-red-500/20"
                              title="Excluir esta role"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                              <span className="text-[11px] font-bold">Excluir</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lista de Ferramentas e Ações */}
                      <div className="space-y-5">
                        {SYSTEM_TOOLS.map((tool) => {
                          if (isRoleAdmin) return null;
                          if (tool.id === 'admin' && !isRoleAdmin) return null;

                          const isToolActive = !!roleData.tools?.[tool.id];

                          return (
                            <div
                              key={tool.id}
                              className={`p-3.5 rounded-xl border transition-colors ${
                                isToolActive
                                  ? 'bg-surface-bright/40 dark:bg-[#121210]/40 border-secondary/30'
                                  : 'bg-transparent border-dashed border-secondary/20 opacity-60'
                              }`}
                            >
                              {/* Toggle da Ferramenta */}
                              <div className="flex items-center justify-between mb-2">
                                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isToolActive}
                                    onChange={() => handleToggleRoleTool(roleObj.id, tool.id)}
                                    className="w-4 h-4 text-primary rounded border-secondary/40 focus:ring-primary cursor-pointer"
                                  />
                                  <span className="font-bold text-sm text-primary dark:text-[#fcf9f4]">
                                    {tool.name}
                                  </span>
                                </label>
                                <span className="text-[11px] font-medium text-on-surface-variant">
                                  {isToolActive ? 'Módulo Liberado' : 'Módulo Bloqueado'}
                                </span>
                              </div>

                              {/* Ações da Ferramenta */}
                              {isToolActive && (
                                <div className="mt-3 pl-6 space-y-2 border-l-2 border-secondary/20">
                                  {tool.actions.map((act) => {
                                    const actionKey = `${tool.id}:${act.id}`;
                                    const isActionActive = !!roleData.actions?.[actionKey];

                                    return (
                                      <label
                                        key={act.id}
                                        className="flex items-center justify-between text-xs text-on-surface-variant hover:text-primary cursor-pointer select-none py-0.5"
                                      >
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={isActionActive}
                                            onChange={() => handleToggleRoleAction(roleObj.id, tool.id, act.id)}
                                            className="w-3.5 h-3.5 text-primary rounded border-secondary/40 focus:ring-primary cursor-pointer"
                                          />
                                          <span>{act.label}</span>
                                        </div>
                                        <span className="font-mono text-[10px] text-on-surface-variant/60">
                                          {act.id}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {isRoleAdmin && (
                          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-300">
                            A role de Administrador Geral possui bypass irrestrito de segurança e permissão imediata em todas as ferramentas, rotas e ações do sistema.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8 flex justify-between items-center text-xs text-on-surface-variant">
          <Link href="/restricted" className="hover:underline font-semibold text-secondary">
            &larr; Voltar para a Área Restrita
          </Link>
          <span>
            Painel Administrativo &bull; Google Antigravity RBAC
          </span>
        </div>
      </main>

      {/* MODAL: CRIAR NOVA ROLE */}
      {isCreateRoleModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-inverse-surface max-w-md w-full rounded-2xl p-6 shadow-2xl border border-secondary/20 dark:border-secondary/10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-primary dark:text-[#fcf9f4]">
                  Criar Nova Role
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Adicione um novo nível de privilégio e perfil de usuário ao sistema.
                </p>
              </div>
              <button
                onClick={() => setIsCreateRoleModalOpen(false)}
                className="text-on-surface-variant hover:text-primary text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary dark:text-[#fcf9f4] mb-1">
                  Identificador Único (Código interno) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: operador_som, recepcionista, midia..."
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-xl outline-none font-mono focus:ring-1 focus:ring-primary"
                />
                <span className="text-[10px] text-on-surface-variant/70 mt-0.5 block">
                  Apenas letras minúsculas e underline (ex: <code>apoio_louvor</code>)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary dark:text-[#fcf9f4] mb-1">
                  Nome de Exibição (Label) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Operador de Som & Mídia"
                  value={newRoleLabel}
                  onChange={(e) => setNewRoleLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-xl outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-primary dark:text-[#fcf9f4] mb-1">
                  Descrição do Papel
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Responsável por acompanhar repertório e áudios das equipes..."
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-surface-bright dark:bg-[#121210] border border-secondary/30 rounded-xl outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateRoleModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-secondary/30 text-primary dark:text-inverse-primary hover:bg-secondary/10 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-green-600 hover:bg-green-700 text-white transition-colors cursor-pointer shadow-sm"
                >
                  Criar Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DE ROLE */}
      {confirmDeleteRoleKey && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-inverse-surface max-w-sm w-full rounded-2xl p-6 shadow-2xl border border-secondary/20 dark:border-secondary/10">
            <h3 className="text-lg font-bold text-primary dark:text-[#fcf9f4] mb-2">
              Excluir Role?
            </h3>
            <p className="text-sm text-on-surface-variant dark:text-[#d1c4bb] mb-6">
              Tem certeza de que deseja remover a role <b>{confirmDeleteRoleKey}</b> do sistema?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteRoleKey(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-secondary/30 text-primary dark:text-inverse-primary hover:bg-secondary/10 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteRole(confirmDeleteRoleKey)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
              >
                Excluir Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PERSONALIZAR AÇÕES DO USUÁRIO */}
      {editingUserPermissions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-inverse-surface max-w-2xl w-full rounded-2xl p-6 shadow-2xl border border-secondary/20 dark:border-secondary/10 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start pb-4 border-b border-secondary/10">
              <div>
                <h3 className="text-lg font-bold text-primary dark:text-[#fcf9f4]">
                  Personalizar Ações do Usuário
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  <b>{editingUserPermissions.displayName || editingUserPermissions.email}</b> &bull; Role:{' '}
                  <span className="font-bold uppercase text-primary dark:text-inverse-primary">
                    {editingUserPermissions.role}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setEditingUserPermissions(null)}
                className="text-on-surface-variant hover:text-primary p-1.5 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-4 overflow-y-auto space-y-4 flex-grow">
              <p className="text-xs text-on-surface-variant bg-surface-bright dark:bg-black/20 p-3 rounded-xl border border-secondary/20">
                Qualquer marcação abaixo criará uma exceção individual direta para este usuário, sobrepondo o padrão da Role dele.
              </p>

              {SYSTEM_TOOLS.map((tool) => {
                const isToolActive = !!userToolsState[tool.id];

                return (
                  <div
                    key={tool.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      isToolActive
                        ? 'bg-surface-bright/50 dark:bg-[#121210]/50 border-secondary/30'
                        : 'bg-transparent border-dashed border-secondary/20 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-primary dark:text-[#fcf9f4]">
                        <input
                          type="checkbox"
                          checked={isToolActive}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setUserToolsState((prev) => ({ ...prev, [tool.id]: checked }));
                            if (!checked) {
                              const updated = { ...userActionsState };
                              tool.actions.forEach((act) => {
                                updated[`${tool.id}:${act.id}`] = false;
                              });
                              setUserActionsState(updated);
                            }
                          }}
                          className="w-4 h-4 text-primary rounded border-secondary/40 focus:ring-primary cursor-pointer"
                        />
                        <span>{tool.name}</span>
                      </label>
                      <span className="text-[11px] text-on-surface-variant">
                        {isToolActive ? 'Acesso Ativo' : 'Acesso Desativado'}
                      </span>
                    </div>

                    {isToolActive && (
                      <div className="pl-6 space-y-2 border-l-2 border-secondary/20">
                        {tool.actions.map((act) => {
                          const actionKey = `${tool.id}:${act.id}`;
                          const isActionActive = !!userActionsState[actionKey];

                          return (
                            <label
                              key={act.id}
                              className="flex items-center justify-between text-xs text-on-surface-variant hover:text-primary cursor-pointer py-0.5"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isActionActive}
                                  onChange={(e) =>
                                    setUserActionsState((prev) => ({
                                      ...prev,
                                      [actionKey]: e.target.checked
                                    }))
                                  }
                                  className="w-3.5 h-3.5 text-primary rounded border-secondary/40 focus:ring-primary cursor-pointer"
                                />
                                <span>{act.label}</span>
                              </div>
                              <span className="text-[10px] font-mono text-on-surface-variant/60">{act.id}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-secondary/10 flex justify-between items-center">
              <button
                onClick={handleResetUserPermissionsToRole}
                className="px-3.5 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-amber-500/20"
                title="Remove as exceções do usuário e volta a seguir 100% a role"
              >
                Redefinir para Padrão da Role
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingUserPermissions(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-secondary/30 text-primary dark:text-inverse-primary hover:bg-secondary/10 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveUserPermissions}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors cursor-pointer shadow-sm"
                >
                  Salvar Permissões
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DE USUÁRIO */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-inverse-surface max-w-sm w-full rounded-2xl p-6 shadow-2xl border border-secondary/20 dark:border-secondary/10">
            <h3 className="text-lg font-bold text-primary dark:text-[#fcf9f4] mb-2">
              Remover Usuário?
            </h3>
            <p className="text-sm text-on-surface-variant dark:text-[#d1c4bb] mb-6">
              Tem certeza de que deseja remover o cadastro de <b>{confirmDeleteUser.displayName || confirmDeleteUser.email}</b> do banco de dados?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteUser(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-secondary/30 text-primary dark:text-inverse-primary hover:bg-secondary/10 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
