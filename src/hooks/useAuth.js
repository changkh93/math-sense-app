import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot = null;
    let cleanupTimeout = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      if (cleanupTimeout) {
        clearTimeout(cleanupTimeout);
        cleanupTimeout = null;
      }
      
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData({
              crystals: 0,
              totalQuizzes: 0,
              totalScore: 0,
              spaceshipLevel: 1,
              helpCount: 0,
              // Streak defaults
              currentStreak: 0,
              longestStreak: 0,
              lastStreakDate: "",
              streakFreezeCount: 0,
              streakMilestones: [],
              ...data
            });
          } else {
            const initialData = { 
              crystals: 0, 
              totalQuizzes: 0, 
              totalScore: 0, 
              spaceshipLevel: 1,
              helpCount: 0,
              // Streak defaults
              currentStreak: 0,
              longestStreak: 0,
              lastStreakDate: "",
              streakFreezeCount: 0,
              streakMilestones: [],
              email: firebaseUser.email, 
              name: firebaseUser.displayName,
              createdAt: new Date().toISOString()
            };
            setDoc(userDocRef, initialData);
            setUserData(initialData);
          }
          setLoading(false);
        }, (err) => {
          console.error("useAuth: User doc snapshot error:", err);
          setLoading(false);
        });
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      // Add a small delay to the snapshot unsubscribe to prevent Firestore
      // internal assertion errors (b815, ca9) caused by rapid subscribe/unsubscribe cycles
      // often triggered by React StrictMode during development.
      if (unsubscribeSnapshot) {
        cleanupTimeout = setTimeout(() => {
          if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
          }
        }, 100);
      }
      unsubscribeAuth();
    };
  }, []);

  return { user, userData, loading };
}
