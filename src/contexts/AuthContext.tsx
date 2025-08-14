import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebase';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
  subscription: {
    plan: 'free' | 'pro' | 'enterprise';
    apiKeyQuota: number;
    usage: number;
  };
  // Add token to User interface
  accessToken?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  getJwt: () => string | null; // ADDED
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ADDED: Helper to store/retrieve JWT from localStorage
  const setToken = (t: string | null) => {
    if (t) localStorage.setItem("kazadi_jwt", t);
    else localStorage.removeItem("kazadi_jwt");
  };
  const getJwt = () => localStorage.getItem("kazadi_jwt"); // ADDED

  useEffect(() => {
    console.log("AuthProvider: useEffect, subscribing to onAuthStateChanged");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log("AuthProvider: onAuthStateChanged triggered", firebaseUser);
      if (firebaseUser) {
        console.log("AuthProvider: user is authenticated, fetching user doc");
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          console.log("AuthProvider: user doc found", userDoc.data());
          // Update user state with accessToken
          setUser({ id: userDoc.id, ...userDoc.data(), accessToken: firebaseUser.accessToken } as User);
        } else {
          console.log("AuthProvider: user doc not found");
          setUser(null);
        }
      } else {
        console.log("AuthProvider: user is not authenticated");
        setUser(null);
      }
      setLoading(false);
    });

    // ADDED: Restore user from localStorage if token exists
    const t = localStorage.getItem("kazadi_jwt");
    if (t) {
      // Reconstruct a minimal user if needed, or rely on onAuthStateChanged
      // For now, we rely on onAuthStateChanged to set the full user object
      // but we can set a minimal user here if onAuthStateChanged is slow
    }

    return () => {
      console.log("AuthProvider: useEffect cleanup, unsubscribing from onAuthStateChanged");
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    console.log("AuthProvider: login called with", email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user; // Get the firebaseUser here

    // Store JWT after successful login
    setToken(firebaseUser.accessToken); // Use firebaseUser.accessToken

    // Explicitly set user state after successful login
    if (firebaseUser) {
      console.log("AuthProvider: login successful, fetching user doc");
      const userDocRef = doc(firestore, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        console.log("AuthProvider: user doc found after login", userDoc.data());
        setUser({ id: userDoc.id, ...userDoc.data(), accessToken: firebaseUser.accessToken } as User);
      } else {
        console.log("AuthProvider: user doc not found after login");
        setUser(null); // Should not happen if user just logged in
      }
    } else {
      setUser(null);
    }
  };

  const register = async (email: string, password: string, name: string): Promise<void> => {
    console.log("AuthProvider: register called with", email, name);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    console.log("AuthProvider: user created in firebase auth", firebaseUser);
    const newUser: User = {
      id: firebaseUser.uid,
      email,
      name,
      role: 'user',
      createdAt: new Date().toISOString(),
      subscription: {
        plan: 'free',
        apiKeyQuota: 3,
        usage: 0,
      },
      accessToken: firebaseUser.accessToken // ADDED
    };
    console.log("AuthProvider: creating user doc in firestore", newUser);
    await setDoc(doc(firestore, 'users', firebaseUser.uid), newUser);
    console.log("AuthProvider: setting user state");
    setUser(newUser);
    setToken(firebaseUser.accessToken); // ADDED
  };

  const logout = () => {
    console.log("AuthProvider: logout called");
    signOut(auth);
    setToken(null); // ADDED
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    getJwt, // ADDED
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
