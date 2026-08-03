import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Mail, Sparkles, X } from 'lucide-react';
import { auth, db, functions } from '../firebase';
import { DirectMemoRealtimeContext, useDirectMemoRealtime } from './directMemoRealtime';

const REALTIME_UNREAD_LIMIT = 10;

function getMemoTime(value) {
  const date = value?.toDate?.();
  if (!date) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function DirectMemoRealtimeProvider({ children }) {
  const [uid, setUid] = useState('');
  const [unreadMemos, setUnreadMemos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    const nextUid = currentUser?.isAnonymous ? '' : (currentUser?.uid || '');
    setUid(nextUid);
    if (nextUid) setLoading(true);
    if (!currentUser || currentUser.isAnonymous) {
      setUnreadMemos([]);
      setLoading(false);
    }
  }), []);

  useEffect(() => {
    if (!uid) return undefined;
    const unreadQuery = query(
      collection(db, 'directMemos'),
      where('recipientId', '==', uid),
      where('status', '==', 'delivered'),
      where('isRead', '==', false),
      where('recipientArchivedAt', '==', null),
      where('recipientDeletedAt', '==', null),
      orderBy('sentAt', 'desc'),
      limit(REALTIME_UNREAD_LIMIT)
    );

    return onSnapshot(unreadQuery, (snap) => {
      setUnreadMemos(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      setLoading(false);
    }, (err) => {
      console.warn('[DirectMemoRealtime] subscribe failed:', err);
      setUnreadMemos([]);
      setLoading(false);
    });
  }, [uid]);

  const value = useMemo(() => ({
    uid,
    unreadMemos,
    unreadCount: unreadMemos.length,
    loading,
  }), [loading, uid, unreadMemos]);

  return (
    <DirectMemoRealtimeContext.Provider value={value}>
      {children}
    </DirectMemoRealtimeContext.Provider>
  );
}

export function DirectMemoArrivalAlert() {
  const { uid, unreadMemos } = useDirectMemoRealtime();
  const [dismissedIds, setDismissedIds] = useState({});
  const [activeMemo, setActiveMemo] = useState(null);
  const [activeOwnerUid, setActiveOwnerUid] = useState('');
  const [busyId, setBusyId] = useState('');
  const latestMemo = unreadMemos.find((memo) => !dismissedIds[memo.id]);

  const handleOpen = async (memo) => {
    setActiveMemo(memo);
    setActiveOwnerUid(uid);
    if (memo.isRead || busyId) return;
    setBusyId(memo.id);
    try {
      const markRead = httpsCallable(functions, 'markDirectMemoRead');
      await markRead({ memoId: memo.id });
    } catch (err) {
      console.warn('[DirectMemoArrivalAlert] mark read failed:', err);
    } finally {
      setBusyId('');
    }
  };

  return (
    <>
      {latestMemo && !activeMemo && (
        <div
          role="button"
          tabIndex={0}
          aria-live="polite"
          onClick={() => handleOpen(latestMemo)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') handleOpen(latestMemo);
          }}
          style={{
            position: 'fixed',
            top: 'max(0.8rem, env(safe-area-inset-top, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 12000,
            width: 'min(560px, calc(100vw - 1.5rem))',
            display: 'grid',
            gridTemplateColumns: '34px minmax(0, 1fr) auto 30px',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.62rem 0.52rem 0.62rem 0.78rem',
            borderRadius: 12,
            border: '1px solid rgba(0,243,255,0.42)',
            background: 'linear-gradient(135deg, rgba(7,13,30,0.96), rgba(10,18,38,0.93))',
            color: 'var(--text-bright)',
            boxShadow: '0 0 24px rgba(0,243,255,0.3), 0 18px 48px rgba(0,0,0,0.42)',
            backdropFilter: 'blur(12px)',
            cursor: 'pointer',
          }}
        >
          <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(0,243,255,0.12)', color: '#00f3ff' }}>
            <Mail size={18} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#00f3ff', fontWeight: 900, fontSize: '0.72rem', marginBottom: '0.12rem' }}>
              <Sparkles size={13} /> 새 편지
            </span>
            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.84rem', fontWeight: 800 }}>
              {busyId === latestMemo.id ? '확인 중...' : `${latestMemo.senderName || '탐사원'}님에게 새 편지가 왔어요.`}
            </span>
          </span>
          <span style={{ color: 'rgba(255,255,255,0.52)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
            {getMemoTime(latestMemo.sentAt || latestMemo.createdAt)}
          </span>
          <button
            type="button"
            aria-label="편지 알림 닫기"
            onClick={(event) => {
              event.stopPropagation();
              setDismissedIds((prev) => ({ ...prev, [latestMemo.id]: true }));
            }}
            style={{ border: 0, background: 'transparent', color: 'rgba(255,255,255,0.58)', cursor: 'pointer', padding: 5 }}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {activeMemo && activeOwnerUid === uid && uid && (
        <div
          role="presentation"
          onClick={() => { setActiveMemo(null); setActiveOwnerUid(''); }}
          style={{ position: 'fixed', inset: 0, zIndex: 12100, display: 'grid', placeItems: 'center', padding: '1rem', background: 'rgba(1,4,15,0.72)', backdropFilter: 'blur(8px)' }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="도착한 편지"
            onClick={(event) => event.stopPropagation()}
            style={{ width: 'min(560px, 100%)', maxHeight: 'min(70dvh, 620px)', overflowY: 'auto', padding: '1.25rem', borderRadius: 18, border: '1px solid rgba(0,243,255,0.35)', background: 'linear-gradient(145deg, #081126, #0d1630)', color: 'var(--text-bright)', boxShadow: '0 24px 70px rgba(0,0,0,0.55)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
              <strong style={{ color: '#00f3ff' }}>{activeMemo.senderName || '탐사원'}님의 편지</strong>
              <button type="button" onClick={() => { setActiveMemo(null); setActiveOwnerUid(''); }} aria-label="편지 닫기" style={{ border: 0, background: 'transparent', color: 'rgba(255,255,255,0.68)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.75, color: 'rgba(255,255,255,0.9)' }}>
              {activeMemo.body || activeMemo.bodyPreview || ''}
            </p>
          </section>
        </div>
      )}
    </>
  );
}
