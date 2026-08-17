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

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let unsubscribeDatabase = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      unsubscribeDatabase(); // Clear previous listener
      setAuthError(null);

      if (currentUser) {
        setUser(currentUser);
        
        // Listen to user document in Realtime Database under users/{uid}
        const userRef = ref(db, `users/${currentUser.uid}`);
        
        unsubscribeDatabase = onValue(userRef, async (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setIsApproved(data.approved === true);
          } else {
            // First time logging in or registering, ensure database record exists
            const userData = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || currentUser.email.split('@')[0],
              email: currentUser.email,
              photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.email)}`,
              approved: false, // Pending by default
              createdAt: new Date().toISOString()
            };
            try {
              await set(userRef, userData);
              setIsApproved(false);
            } catch (err) {
              console.error("Failed to write user doc:", err);
              setAuthError(`Erro de Escrita no Banco: ${err.message}`);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Realtime Database error:", error);
          setAuthError(`Erro de Leitura (Regras do Banco): ${error.message}`);
          setLoading(false);
        });

      } else {
        setUser(null);
        setIsApproved(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDatabase();
    };
  }, []);

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
      // 1. Create Auth credentials
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Update Auth display profile
      await updateProfile(userCredential.user, {
        displayName: name,
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
      });

      // 3. Write record to Database in pending approval state
      const userRef = ref(db, `users/${userCredential.user.uid}`);
      const userData = {
        uid: userCredential.user.uid,
        displayName: name,
        email: email,
        photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        approved: false,
        createdAt: new Date().toISOString()
      };
      await set(userRef, userData);
      setIsApproved(false);
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
    <AuthContext.Provider value={{ user, isApproved, loginWithEmail, registerWithEmail, logout, loading, authError }}>
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
