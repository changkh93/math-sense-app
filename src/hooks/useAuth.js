import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData({
              crystals: 0,
              totalQuizzes: 0,
              totalScore: 0,
              spaceshipLevel: 1,
              helpCount: 0,
              ...data
            });
          } else {
            const initialData = { 
              crystals: 0, 
              totalQuizzes: 0, 
              totalScore: 0, 
              spaceshipLevel: 1,
              helpCount: 0,
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

        return () => unsubscribeDoc();
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return { user, userData, loading };
}
