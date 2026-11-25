import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';

interface ClientAuthContextValue {
  clientUser: User | null;
  authReady: boolean;
  savedPhone: string;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (fullName: string, email: string, password: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  savePhone: (phone: string) => Promise<void>;
  signOutClient: () => Promise<void>;
}

const ClientAuthContext = createContext<ClientAuthContextValue | undefined>(undefined);

async function syncVerifiedProfileToFirestore(user: User): Promise<string> {
  if (!user.emailVerified) return '';
  const userPath = `users/${user.uid}`;
  const privatePath = `users/${user.uid}/private/info`;
  const displayName = (user.displayName || user.email?.split('@')[0] || 'Traveller').slice(0, 120);

  try {
    const profileRef = doc(db, 'users', user.uid);
    const snap = await getDoc(profileRef);
    if (!snap.exists()) {
      await setDoc(profileRef, {
        uid: user.uid,
        displayName,
        role: 'customer',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(
        profileRef,
        {
          uid: user.uid,
          displayName,
          role: 'customer',
          createdAt: snap.data().createdAt,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }

  let existingPhone = '';
  try {
    const privateRef = doc(db, 'users', user.uid, 'private', 'info');
    const privSnap = await getDoc(privateRef);
    existingPhone = privSnap.exists() ? String(privSnap.data().phone || '') : '';
    await setDoc(privateRef, {
      uid: user.uid,
      email: (user.email || '').slice(0, 200),
      phone: existingPhone,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, privatePath);
  }

  return existingPhone;
}

export function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  const [clientUser, setClientUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [savedPhone, setSavedPhone] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setClientUser(user);
      if (user && user.emailVerified) {
        try {
          const phone = await syncVerifiedProfileToFirestore(user);
          setSavedPhone(phone);
        } catch {
          // Error already logged cleanly by handleFirestoreError
        }
      } else {
        setSavedPhone('');
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    if (cred.user.emailVerified) {
      try {
        const phone = await syncVerifiedProfileToFirestore(cred.user);
        setSavedPhone(phone);
      } catch {
        // Logged by handleFirestoreError
      }
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    if (cred.user.emailVerified) {
      try {
        const phone = await syncVerifiedProfileToFirestore(cred.user);
        setSavedPhone(phone);
      } catch {
        // Logged by handleFirestoreError
      }
    }
  }, []);

  const signUpWithEmail = useCallback(async (fullName: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: fullName.trim() });
    await sendEmailVerification(cred.user);
    setClientUser({ ...cred.user });
  }, []);

  const resendVerification = useCallback(async () => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
    }
  }, []);

  const savePhone = useCallback(async (phone: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not signed in');
    if (!user.emailVerified) {
      setSavedPhone(phone);
      return;
    }
    const privatePath = `users/${user.uid}/private/info`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'private', 'info'), {
        uid: user.uid,
        email: (user.email || '').slice(0, 200),
        phone: phone.trim().slice(0, 24),
        updatedAt: serverTimestamp(),
      });
      setSavedPhone(phone.trim());
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, privatePath);
    }
  }, []);

  const signOutClient = useCallback(async () => {
    await signOut(auth);
    setSavedPhone('');
  }, []);

  return (
    <ClientAuthContext.Provider
      value={{
        clientUser,
        authReady,
        savedPhone,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resendVerification,
        savePhone,
        signOutClient,
      }}
    >
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth() {
  const ctx = useContext(ClientAuthContext);
  if (!ctx) throw new Error('useClientAuth must be used inside ClientAuthProvider');
  return ctx;
}
