'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../services/firebase';
import { onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { ref, set, onValue } from 'firebase/database';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeDatabase = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      unsubscribeDatabase(); // Clear previous listener

      if (currentUser) {
        setUser(currentUser);
        
        // Listen to user document in Realtime Database under users/{uid}
        const userRef = ref(db, `users/${currentUser.uid}`);
        
        unsubscribeDatabase = onValue(userRef, async (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setIsApproved(data.approved === true);
          } else {
            // First time logging in, create entry in pending state
            const userData = {
              uid: currentUser.uid,
              displayName: currentUser.displayName,
              email: currentUser.email,
              photoURL: currentUser.photoURL,
              approved: false, // Pending by default
              createdAt: new Date().toISOString()
            };
            await set(userRef, userData);
            setIsApproved(false);
          }
          setLoading(false);
        }, (error) => {
          console.error("Realtime Database error:", error);
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

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isApproved, loginWithGoogle, logout, loading }}>
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
