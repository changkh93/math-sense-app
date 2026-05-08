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
              questionCount: 0,
              // Streak defaults
              currentStreak: 0,
              longestStreak: 0,
              lastStreakDate: "",
              streakFreezeCount: 0,
              streakFreezeLastPurchasedAtMs: 0,
              streakMilestones: [],
              shieldCharges: 0,
              hasRadar: false,
              radarExpiresAtMs: 0,
              publicProfileEnabled: true,
              publicDisplayName: '',
              publicTitle: '',
              publicSignature: '',
              profileSignatureUnlocked: false,
              ownedProfileFrames: ['starter'],
              selectedProfileFrame: 'starter',
              hallShowcaseCredits: 0,
              hallSpotlightUntilMs: 0,
              crewCreationPasses: 0,
              crewJoinPasses: 0,
              crewId: '',
              crewName: '',
              crewRole: '',
              crewColor: '#00f3ff',
              crewStatus: '',
              crewGroupName: '',
              crewInviteCode: '',
              crewActiveStudyRoomId: '',
              crewActiveStudyRoomStatus: '',
              crewSnapshot: null,
              clusterAccess: { cluster_elementary: 'active' },
              ...data
            });
          } else {
            if (window.sessionStorage.getItem('accountDeletionInProgress') === firebaseUser.uid) {
              setUserData(null);
              setLoading(false);
              return;
            }

            // [안전 장치] 만약 유저 메인 문서만 삭제되었고 하위 데이터가 남아있는 경우를 대비해 스탯 복원을 시도합니다.
            const recoverUserData = async () => {
              try {
                let sumCrystals = 0;
                let totalQ = 0, totalS = 0, perfectC = 0;

                // 1. 거래 내역(crystals) 복원
                const txsSnap = await getDocs(collection(db, 'users', firebaseUser.uid, 'crystal_transactions'));
                if (!txsSnap.empty) {
                  console.warn("⚠️ 유저 문서가 없으나 거래 내역 발견. 광석을 복원합니다.");
                  txsSnap.forEach(d => { sumCrystals += (d.data().amount || 0) });
                }

                // 2. 퀴즈 기록(history) 복원
                const histSnap = await getDocs(collection(db, 'users', firebaseUser.uid, 'history'));
                if (!histSnap.empty) {
                  console.warn("⚠️ 유저 문서가 없으나 학습 기록 발견. 통계를 복원합니다.");
                  histSnap.forEach(d => {
                    const data = d.data();
                    totalQ++;
                    totalS += (data.score || 0);
                    if (data.score === 100) perfectC++;
                  });
                  
                  // 만약 거래 내역 테이블이 생기기 전의 계정이라면 대략적으로 보상 추산
                  if (txsSnap.empty) {
                     sumCrystals = totalQ * 38; // 평균 보상치 (100점=40, 그외 등등)
                  }
                }

                return {
                  crystals: sumCrystals,
                  totalQuizzes: totalQ,
                  totalScore: totalS,
                  averageScore: totalQ > 0 ? Math.round((totalS / totalQ) * 10) / 10 : 0,
                  perfectCount: perfectC,
                  _restored: true
                };
              } catch (err) {
                console.error("데이터 자동 복원 실패:", err);
                return { crystals: 0, totalQuizzes: 0, totalScore: 0, averageScore: 0, perfectCount: 0 };
              }
            };

            recoverUserData().then((recovered) => {
              const initialData = { 
                crystals: recovered.crystals, 
                totalQuizzes: recovered.totalQuizzes, 
                totalScore: recovered.totalScore, 
                averageScore: recovered.averageScore,
                perfectCount: recovered.perfectCount,
                spaceshipLevel: 1,
                helpCount: 0,
                questionCount: 0,
                currentStreak: 0,
                longestStreak: 0,
                lastStreakDate: "",
                streakFreezeCount: 0,
                streakFreezeLastPurchasedAtMs: 0,
                streakMilestones: [],
                shieldCharges: 0,
                hasRadar: false,
                radarExpiresAtMs: 0,
                publicProfileEnabled: true,
                publicDisplayName: '',
                publicTitle: '',
                publicSignature: '',
                profileSignatureUnlocked: false,
                ownedProfileFrames: ['starter'],
                selectedProfileFrame: 'starter',
                hallShowcaseCredits: 0,
                hallSpotlightUntilMs: 0,
                crewCreationPasses: 0,
                crewJoinPasses: 0,
                crewId: '',
                crewName: '',
                crewRole: '',
                crewColor: '#00f3ff',
                crewStatus: '',
                crewGroupName: '',
                crewInviteCode: '',
                crewActiveStudyRoomId: '',
                crewActiveStudyRoomStatus: '',
                crewSnapshot: null,
                clusterAccess: { cluster_elementary: 'active' },
                email: firebaseUser.email, 
                name: firebaseUser.displayName,
                createdAt: new Date().toISOString()
              };
              if (recovered._restored) {
                initialData.adjustmentReason = "자동 복구 완료";
              }
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
