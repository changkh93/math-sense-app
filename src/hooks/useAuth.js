import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

const buildDefaultUserData = (firebaseUser, extra = {}) => ({
  crystals: 0,
  totalQuizzes: 0,
  totalScore: 0,
  averageScore: 0,
  perfectCount: 0,
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
  createdAt: new Date().toISOString(),
  ...extra
});

const isDeletedAccountData = (data = {}) => (
  data?.isDeleted === true ||
  data?.accountStatus === 'deleted' ||
  Boolean(data?.deletedAt)
);

const setSignupRequiredNotice = (firebaseUser, reason = 'missing-membership') => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem('metasenseLoginNotice', JSON.stringify({
    type: 'signupRequired',
    reason,
    email: firebaseUser?.email || '',
    ts: Date.now()
  }));
};

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
            if (isDeletedAccountData(data)) {
              console.warn('삭제된 회원 계정의 앱 접근을 차단했습니다.', {
                uid: firebaseUser.uid,
                email: firebaseUser.email
              });
              setSignupRequiredNotice(firebaseUser, 'deleted-membership');
              setUserData(null);
              setLoading(false);
              signOut(auth);
              return;
            }

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
            setLoading(false);
          } else {
            if (window.sessionStorage.getItem('accountDeletionInProgress') === firebaseUser.uid) {
              setUserData(null);
              setLoading(false);
              return;
            }

            // Main user documents are the source of truth. If subcollections still
            // exist, client-side reconstruction can overwrite balances/streaks with
            // partial evidence, so it must stop and wait for an admin/server repair.
            const inspectRecoverableEvidence = async () => {
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

                const hasRecoverableEvidence = !txsSnap.empty || !histSnap.empty || !questionSnap.empty || !answerSnap.empty;
                return {
                  hasRecoverableEvidence,
                  recoverySourceCounts: {
                    transactions: txsSnap.size,
                    history: histSnap.size,
                    questions: questionSnap.size,
                    answers: answerSnap.size
                  }
                };
              } catch (err) {
                console.error("계정 복구 증거 확인 실패:", err);
                return {
                  hasRecoverableEvidence: true,
                  recoveryFailed: true
                };
              }
            };

            inspectRecoverableEvidence().then(async (inspection) => {
              try {
                if (inspection.hasRecoverableEvidence) {
                  const blockedData = buildDefaultUserData(firebaseUser, {
                    recoveryRequired: true,
                    recoveryFailed: !!inspection.recoveryFailed,
                    recoverySourceCounts: inspection.recoverySourceCounts || null,
                    adjustmentReason: inspection.recoveryFailed ? '자동 복구 차단: 증거 확인 실패' : '자동 복구 차단: 관리자 검토 필요'
                  });
                  console.error('유저 문서가 없지만 하위 데이터가 남아 있어 클라이언트 자동 복구를 차단했습니다.', {
                    uid: firebaseUser.uid,
                    recoverySourceCounts: blockedData.recoverySourceCounts
                  });
                  setUserData(blockedData);
                  return;
                }

                const parentSnap = await getDoc(doc(db, 'parents', firebaseUser.uid));
                const parentData = parentSnap.exists() ? parentSnap.data() : null;
                if (parentSnap.exists() && !isDeletedAccountData(parentData)) {
                  setUserData({
                    role: 'parent',
                    ...parentData
                  });
                  return;
                }

                console.warn('가입되지 않은 Firebase Auth 계정의 앱 접근을 차단했습니다.', {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email
                });
                setSignupRequiredNotice(firebaseUser, 'missing-membership');
                setUserData(null);
                await signOut(auth);
              } catch (err) {
                console.error('회원 상태 확인 중 오류가 발생해 로그아웃합니다.', err);
                setSignupRequiredNotice(firebaseUser, 'membership-check-failed');
                setUserData(null);
                await signOut(auth);
              } finally {
                setLoading(false);
              }
            });
            return;
          }
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
