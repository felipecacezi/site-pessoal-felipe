import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAYxo5EUU-ay0MsH-K7Rxpfk-rxuSgEwzk",
  authDomain: "sitepessoal-auth.firebaseapp.com",
  projectId: "sitepessoal-auth",
  storageBucket: "sitepessoal-auth.firebasestorage.app",
  messagingSenderId: "205375653267",
  appId: "1:205375653267:web:0c7027b95c3c75789c1466",
  measurementId: "G-JQH6NVZ574"
};

// Prevent duplicate initialization during hot reloads
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };
