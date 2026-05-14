import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { extractLearningActivityDates, getTodayKST, recalculateStreakState } from '../utils/streakUtils';

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

            // [안전 장치] 만약 유저 메인 문서만 삭제되었고 하위 데이터가 남아있는 경우를 대비해
            // 하위 원장/학습/아고라 기록에서 가능한 집계값을 재구성합니다.
            const recoverUserData = async () => {
              try {
                const [
                  txsSnap,
                  histSnap,
                  questionSnap,
                  answerSnap
                ] = await Promise.all([
                  getDocs(collection(db, 'users', firebaseUser.uid, 'crystal_transactions')),
                  getDocs(collection(db, 'users', firebaseUser.uid, 'history')),
                  getDocs(query(collection(db, 'questions'), where('userId', '==', firebaseUser.uid))),
                  getDocs(query(collection(db, 'answers'), where('userId', '==', firebaseUser.uid)))
                ]);

                const transactions = txsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const history = histSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const answers = answerSnap.docs.map(d => d.data());

                let ledgerCrystals = 0;
                if (!txsSnap.empty) {
                  console.warn("⚠️ 유저 문서가 없으나 거래 내역 발견. 광석을 복원합니다.");
                  transactions.forEach(d => { ledgerCrystals += (d.amount || 0) });
                }

                let totalQ = 0, totalS = 0, perfectC = 0, historyCrystals = 0;
                if (!histSnap.empty) {
                  console.warn("⚠️ 유저 문서가 없으나 학습 기록 발견. 통계를 복원합니다.");
                  history.forEach(data => {
                    totalQ++;
                    totalS += (data.score || 0);
                    historyCrystals += (data.crystalsEarned || 0);
                    if (data.score === 100) perfectC++;
                  });
                }

                const activeDates = Array.from(extractLearningActivityDates(history, transactions)).sort();
                const coreEvidenceDates = transactions
                  .filter(t => t.type === 'store_purchase' && t.metadata?.itemId === 'cryo_core' && t.timestamp)
                  .map(t => getTodayKST(t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp)))
                  .filter(Boolean);
                const streakState = recalculateStreakState(activeDates, coreEvidenceDates, getTodayKST());
                const hasRecoverableEvidence = !txsSnap.empty || !histSnap.empty || !questionSnap.empty || !answerSnap.empty;
                const crystals = !txsSnap.empty ? ledgerCrystals : historyCrystals;

                return {
                  crystals,
                  totalQuizzes: totalQ,
                  totalScore: totalS,
                  averageScore: totalQ > 0 ? Math.round((totalS / totalQ) * 10) / 10 : 0,
                  perfectCount: perfectC,
                  questionCount: questionSnap.size,
                  helpCount: answers.filter(a => a.isAccepted).length,
                  currentStreak: streakState.correctStreak,
                  longestStreak: streakState.correctStreak,
                  lastStreakDate: streakState.correctLastDate,
                  streakFreezeCount: streakState.coresRemaining,
                  _restored: hasRecoverableEvidence,
                  recoveryNeedsReview: !txsSnap.empty && historyCrystals > ledgerCrystals + 100,
                  recoverySourceCounts: {
                    transactions: txsSnap.size,
                    history: histSnap.size,
                    questions: questionSnap.size,
                    answers: answerSnap.size,
                    activeDates: activeDates.length
                  }
                };
              } catch (err) {
                console.error("데이터 자동 복원 실패:", err);
                return {
                  crystals: 0,
                  totalQuizzes: 0,
                  totalScore: 0,
                  averageScore: 0,
                  perfectCount: 0,
                  questionCount: 0,
                  helpCount: 0,
                  currentStreak: 0,
                  longestStreak: 0,
                  lastStreakDate: "",
                  streakFreezeCount: 0,
                  _restored: false,
                  recoveryFailed: true
                };
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
                helpCount: recovered.helpCount,
                questionCount: recovered.questionCount,
                currentStreak: recovered.currentStreak,
                longestStreak: recovered.longestStreak,
                lastStreakDate: recovered.lastStreakDate,
                streakFreezeCount: recovered.streakFreezeCount,
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
              if (recovered._restored || recovered.recoveryFailed) {
                initialData.adjustmentReason = recovered.recoveryFailed ? "자동 복구 실패" : "자동 복구 완료";
                initialData.recoveryNeedsReview = !!recovered.recoveryNeedsReview;
                initialData.recoverySourceCounts = recovered.recoverySourceCounts || null;
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
