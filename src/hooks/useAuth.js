import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, collection, getDocs } from 'firebase/firestore';
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
              clusterAccess: { cluster_elementary: 'active' },
              ...data
            });
          } else {
            // [안전 장치] 만약 유저 메인 문서만 삭제되었고 거래 내역(하위 컬렉션)이 남아있는 경우를 대비해 잔고를 복원합니다.
            const recoverCrystals = async () => {
              try {
                const txsSnap = await getDocs(collection(db, 'users', firebaseUser.uid, 'crystal_transactions'));
                if (!txsSnap.empty) {
                  console.warn("⚠️ 유저 문서가 없지만 거래 내역이 발견되었습니다. 광석 잔고를 자동 복원합니다.");
                  let sum = 0;
                  txsSnap.forEach(d => { sum += (d.data().amount || 0) });
                  return sum;
                }
              } catch (err) {
                console.error("광석 자동 복원 실패:", err);
              }
              return 0;
            };

            recoverCrystals().then((recoveredCrystals) => {
              const initialData = { 
                crystals: recoveredCrystals, 
                totalQuizzes: 0, 
                totalScore: 0, 
                spaceshipLevel: 1,
                helpCount: 0,
                currentStreak: 0,
                longestStreak: 0,
                lastStreakDate: "",
                streakFreezeCount: 0,
                streakMilestones: [],
                clusterAccess: { cluster_elementary: 'active' },
                email: firebaseUser.email, 
                name: firebaseUser.displayName,
                createdAt: new Date().toISOString()
              };
              setDoc(userDocRef, initialData, { merge: true });
              setUserData(initialData);
            });
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
      if (cleanupTimeout) {
        clearTimeout(cleanupTimeout);
      }
      if (unsubscribeSnapshot) {
        // When unmounting, delay to avoid React 18 strict mode assertion issues.
        // But if auth state changes, we cancel immediately (handled inside the onAuthStateChanged).
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
