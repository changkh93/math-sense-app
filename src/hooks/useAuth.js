import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, onIdTokenChanged, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  areAccessClaimsCurrent,
  getAccessSyncRevision,
  isAccessClaimSyncReady
} from '../utils/accessClaimSync';

const AUTH_BOOTSTRAP_TIMEOUT_MS = 8000;
const USER_DOCUMENT_TIMEOUT_MS = 10000;

const buildDefaultUserData = (firebaseUser, extra = {}) => ({
  crystals: 0,
  lifetimeLearningCrystalsEarned: 0,
  galaxyShipHullTier: 1,
  gameAbilitySnapshot: null,
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
  ownedBaseThemes: ['orbital'],
  selectedBaseTheme: 'orbital',
  hallShowcaseCredits: 0,
  hallSpotlightUntilMs: 0,
  crewCreationPasses: 0,
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
  const [accessClaims, setAccessClaims] = useState(null);
  const [loading, setLoading] = useState(true);
  const accessRefreshAttemptRef = useRef(null);

  useEffect(() => {
    let unsubscribeSnapshot = null;
    let cleanupTimeout = null;
    let authBootstrapTimeout = null;
    let userDocumentTimeout = null;

    const clearAuthBootstrapTimeout = () => {
      if (!authBootstrapTimeout) return;
      clearTimeout(authBootstrapTimeout);
      authBootstrapTimeout = null;
    };

    const clearUserDocumentTimeout = () => {
      if (!userDocumentTimeout) return;
      clearTimeout(userDocumentTimeout);
      userDocumentTimeout = null;
    };

    // Firebase Auth normally resolves from local persistence almost instantly.
    // IndexedDB/browser-extension failures can prevent the first callback forever,
    // so never let the public landing page depend on an unbounded SDK wait.
    authBootstrapTimeout = setTimeout(() => {
      console.warn('useAuth: Auth bootstrap timed out; showing the public landing page.');
      setUser(null);
      setUserData(null);
      setLoading(false);
    }, AUTH_BOOTSTRAP_TIMEOUT_MS);

    // Claims ride on Firebase's cached ID token, so reading course access here
    // adds no Firestore read. This listener only refreshes the compact access
    // state and does not resubscribe to the user document on hourly token renewals.
    const unsubscribeToken = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setAccessClaims(null);
        return;
      }
      try {
        const token = await firebaseUser.getIdTokenResult();
        const courses = Array.isArray(token.claims?.courses)
          ? token.claims.courses.filter((id) => typeof id === 'string')
          : [];
        const regions = Array.isArray(token.claims?.regions)
          ? token.claims.regions.filter((id) => typeof id === 'string')
          : [];
        setAccessClaims({
          version: Number(token.claims?.accessVersion || 0),
          courses,
          regions
        });
      } catch (error) {
        console.warn('useAuth: Failed to read access claims:', error);
        setAccessClaims(null);
      }
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      clearAuthBootstrapTimeout();
      clearUserDocumentTimeout();

      if (cleanupTimeout) {
        clearTimeout(cleanupTimeout);
        cleanupTimeout = null;
      }
      
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      accessRefreshAttemptRef.current = null;

      if (firebaseUser?.isAnonymous) {
        // Anonymous Firebase Auth = crew guest. The guest entry screen
        // (CrewGuestInvite) stores the invited crew id + alias in sessionStorage
        // so the member app can route them straight into that crew's waiting
        // room. Guests never receive a users/{uid} document and are confined to
        // the NAV and STUDY CREW views by SpaceNavbar/SpaceHome.
        let guestCrew = null;
        try {
          const raw = window.sessionStorage.getItem('crewGuestSession');
          if (raw) guestCrew = JSON.parse(raw);
        } catch { guestCrew = null; }
        if (!guestCrew?.crewId) {
          // No active guest session: treat as logged out so the login screen shows.
          setUser(null);
          setUserData(null);
          setLoading(false);
          return;
        }
        setUser(firebaseUser);
        setUserData({
          role: 'guest',
          isGuest: true,
          referralToken: guestCrew.referralToken || '',
          referralTracked: guestCrew.referralTracked === true,
          uid: firebaseUser.uid,
          crewId: guestCrew.crewId,
          crewName: guestCrew.crewName || '스터디 크루',
          crewColor: guestCrew.crewColor || '#00d4ff',
          crewSnapshot: {
            id: guestCrew.crewId,
            name: guestCrew.crewName || '스터디 크루',
            color: guestCrew.crewColor || '#00d4ff',
          },
          studentName: guestCrew.guestAlias || '게스트',
          publicDisplayName: guestCrew.guestAlias || '게스트',
        });
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const applyUserDocumentData = (data) => {
          clearUserDocumentTimeout();
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
            lifetimeLearningCrystalsEarned: 0,
            galaxyShipHullTier: 1,
            gameAbilitySnapshot: null,
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
            ownedBaseThemes: ['orbital'],
            selectedBaseTheme: 'orbital',
            hallShowcaseCredits: 0,
            hallSpotlightUntilMs: 0,
            crewCreationPasses: 0,
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
        };

        // A listener may remain pending while the browser is offline or its
        // persistence layer is locked. Fail visibly and recoverably instead of
        // keeping the entire application behind an infinite loading screen.
        userDocumentTimeout = setTimeout(() => {
          console.warn('useAuth: User document bootstrap timed out.', { uid: firebaseUser.uid });
          setUserData(buildDefaultUserData(firebaseUser, {
            dataLoadError: true,
            dataLoadTimedOut: true,
            adjustmentReason: '사용자 데이터 동기화 시간 초과'
          }));
          setLoading(false);
        }, USER_DOCUMENT_TIMEOUT_MS);

        unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            applyUserDocumentData(docSnap.data());
          } else {
            if (window.sessionStorage.getItem('accountDeletionInProgress') === firebaseUser.uid) {
              clearUserDocumentTimeout();
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
                clearUserDocumentTimeout();
                setLoading(false);
              }
            });
            return;
          }
        }, (err) => {
          console.error("useAuth: User doc snapshot error:", err);
          getDoc(userDocRef)
            .then((fallbackSnap) => {
              if (fallbackSnap.exists()) {
                applyUserDocumentData(fallbackSnap.data());
                return;
              }

              setUserData(buildDefaultUserData(firebaseUser, {
                dataLoadError: true,
                adjustmentReason: '사용자 데이터 동기화 실패: 회원 문서를 확인할 수 없음'
              }));
            })
            .catch((fallbackErr) => {
              console.error("useAuth: User doc fallback read failed:", fallbackErr);
              setUserData(buildDefaultUserData(firebaseUser, {
                dataLoadError: true,
                adjustmentReason: fallbackErr?.message || '사용자 데이터 동기화 실패'
              }));
            })
            .finally(() => {
              clearUserDocumentTimeout();
              setLoading(false);
            });
        });
      } else {
        clearUserDocumentTimeout();
        setUserData(null);
        setLoading(false);
      }
    }, (err) => {
      clearAuthBootstrapTimeout();
      clearUserDocumentTimeout();
      console.error('useAuth: Auth state bootstrap failed:', err);
      setUser(null);
      setUserData(null);
      setLoading(false);
    });

    return () => {
      clearAuthBootstrapTimeout();
      clearUserDocumentTimeout();
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
      unsubscribeToken();
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!user || !userData || !accessClaims || accessClaims.version < 1) return;
    if (areAccessClaimsCurrent(userData, accessClaims)) {
      accessRefreshAttemptRef.current = null;
      return;
    }

    // accessClaimsSyncedAt is written only after the Admin SDK has finished
    // updating custom claims. Waiting for that revision avoids refreshing in
    // the short window between the access-document write and claim sync.
    if (!isAccessClaimSyncReady(userData)) return;
    const syncRevision = getAccessSyncRevision(userData);
    const attemptKey = `${user.uid}:${syncRevision}`;
    if (accessRefreshAttemptRef.current === attemptKey) return;
    accessRefreshAttemptRef.current = attemptKey;

    user.getIdToken(true).catch((error) => {
      console.warn('useAuth: Failed to refresh token after claim sync:', error);
    });
  }, [accessClaims, user, userData]);

  return { user, userData, accessClaims, loading };
}
