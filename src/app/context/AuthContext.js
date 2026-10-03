'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { ref, set, onValue } from 'firebase/database';
import { getDefaultRolePermissions, SYSTEM_TOOLS, SYSTEM_ROLES } from '../constants/permissions';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [rolePermissions, setRolePermissions] = useState(getDefaultRolePermissions());
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const isAdmin = role === 'admin';

  // Listener global de configurações de roles
  useEffect(() => {
    const rolesConfigRef = ref(db, 'system_config/roles_permissions');
    const unsubscribeRoles = onValue(rolesConfigRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Assegura que as roles do sistema existam mesmo que mescladas com criadas
        const defaults = getDefaultRolePermissions();
        setRolePermissions({ ...defaults, ...data });
      } else {
        setRolePermissions(getDefaultRolePermissions());
      }
    });

    return () => unsubscribeRoles();
  }, []);

  // Listener de Auth e User Profile
  useEffect(() => {
    let unsubscribeDatabase = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      unsubscribeDatabase();
      setAuthError(null);

      if (currentUser) {
        setUser(currentUser);
        
        const userRef = ref(db, `users/${currentUser.uid}`);
        
        unsubscribeDatabase = onValue(userRef, async (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setUserProfile(data);
            setIsApproved(data.approved === true);
            setRole(data.role || 'basic');
          } else {
            const userRole = 'basic';
            const userData = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || currentUser.email.split('@')[0],
              email: currentUser.email,
              photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.email)}`,
              approved: false,
              role: userRole,
              createdAt: new Date().toISOString()
            };
            try {
              await set(userRef, userData);
              setUserProfile(userData);
              setIsApproved(false);
              setRole(userRole);
            } catch (err) {
              console.error("Failed to write user doc:", err);
              setAuthError(`Erro de Escrita no Banco: ${err.message}`);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Realtime Database error:", error);
          setAuthError(`Erro de Leitura: ${error.message}`);
          setLoading(false);
        });

      } else {
        setUser(null);
        setUserProfile(null);
        setRole(null);
        setIsApproved(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDatabase();
    };
  }, []);

  // Lista dinâmica de todas as roles conhecidas (padrão + criadas pelo usuário)
  const availableRoles = React.useMemo(() => {
    const rolesMap = new Map();
    // 1. Roles padrão
    SYSTEM_ROLES.forEach(r => rolesMap.set(r.id, { ...r }));
    
    // 2. Roles cadastradas no Firebase
    if (rolePermissions) {
      Object.entries(rolePermissions).forEach(([rId, rData]) => {
        if (!rolesMap.has(rId)) {
          rolesMap.set(rId, {
            id: rId,
            label: rData.label || rId,
            description: rData.description || 'Role personalizada',
            isSystem: false
          });
        } else {
          // Atualiza rótulo se customizado
          const existing = rolesMap.get(rId);
          rolesMap.set(rId, {
            ...existing,
            label: rData.label || existing.label,
            description: rData.description || existing.description
          });
        }
      });
    }

    return Array.from(rolesMap.values());
  }, [rolePermissions]);

  // Checa se o usuário tem acesso à ferramenta
  const hasToolAccess = (toolId) => {
    if (!user || !isApproved) return false;
    if (isAdmin) return true;

    // 1. Prioridade: Exceção individual explicitamente configurada no perfil do usuário
    if (userProfile?.allowedTools && typeof userProfile.allowedTools[toolId] === 'boolean') {
      return userProfile.allowedTools[toolId];
    }

    // 2. Regra da Role
    const currentRole = role || 'basic';
    const currentRoleConfig = rolePermissions[currentRole];
    if (currentRoleConfig?.tools && typeof currentRoleConfig.tools[toolId] === 'boolean') {
      return currentRoleConfig.tools[toolId];
    }

    // 3. Fallback dos padrões
    const defaults = getDefaultRolePermissions();
    return defaults[currentRole]?.tools?.[toolId] ?? false;
  };

  // Checa se o usuário tem privilégio para executar uma ação em uma ferramenta
  const can = (toolId, actionId) => {
    if (!user || !isApproved) return false;
    if (isAdmin) return true;

    if (!hasToolAccess(toolId)) return false;

    const actionKey = `${toolId}:${actionId}`;

    // 1. Prioridade: Exceção individual de ação no perfil do usuário
    if (userProfile?.allowedActions && typeof userProfile.allowedActions[actionKey] === 'boolean') {
      return userProfile.allowedActions[actionKey];
    }

    // 2. Regra da Role
    const currentRole = role || 'basic';
    const currentRoleConfig = rolePermissions[currentRole];
    if (currentRoleConfig?.actions && typeof currentRoleConfig.actions[actionKey] === 'boolean') {
      return currentRoleConfig.actions[actionKey];
    }

    // 3. Fallback dos padrões
    const defaults = getDefaultRolePermissions();
    return defaults[currentRole]?.actions?.[actionKey] ?? false;
  };

  const canManageSetlist = can('criador_setlist', 'manage_setlist');

  const loginWithEmail = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Login failed:", error);
      let friendlyMessage = error.message;
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        friendlyMessage = 'E-mail ou senha incorretos.';
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'Formato de e-mail inválido.';
      }
      setAuthError(friendlyMessage);
      setLoading(false);
      throw error;
    }
  };

  const registerWithEmail = async (name, email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(userCredential.user, {
        displayName: name,
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
      });

      const userRef = ref(db, `users/${userCredential.user.uid}`);
      const userData = {
        uid: userCredential.user.uid,
        displayName: name,
        email: email,
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        approved: false,
        role: 'basic',
        createdAt: new Date().toISOString()
      };
      await set(userRef, userData);
      setUserProfile(userData);
      setIsApproved(false);
      setRole('basic');
      setLoading(false);
    } catch (error) {
      console.error("Registration failed:", error);
      let friendlyMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        friendlyMessage = 'Este e-mail já está em uso por outra conta.';
      } else if (error.code === 'auth/weak-password') {
        friendlyMessage = 'A senha escolhida é muito fraca (mínimo de 6 caracteres).';
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'Formato de e-mail inválido.';
      }
      setAuthError(friendlyMessage);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile,
      role, 
      isAdmin, 
      isApproved, 
      rolePermissions,
      availableRoles,
      hasToolAccess,
      can,
      canManageSetlist, 
      loginWithEmail, 
      registerWithEmail, 
      logout, 
      loading, 
      authError 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
