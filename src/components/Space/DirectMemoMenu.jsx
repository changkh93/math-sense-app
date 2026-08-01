import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, limit as limitDocs, orderBy, query, startAfter, Timestamp, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Archive, Check, Clock3, PenLine, Reply, Send, Trash2, UserRound, X } from 'lucide-react';
import { db, functions } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { useDirectMemoRealtime } from '../../contexts/directMemoRealtime';
import soundManager from '../../utils/SoundManager';
import './DirectMemoMenu.css';

const MEMO_MAX_LENGTH = 2000;
const MEMO_PAGE_SIZE = 20;
const MEMO_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const RECIPIENT_CACHE_TTL_MS = 10 * 60 * 1000;
let recipientDirectoryCache = { loadedAt: 0, rows: [] };

const mapMemoDocs = (snap, memoSide = '') => snap.docs.map((docSnap) => ({
  id: docSnap.id,
  ...docSnap.data(),
  ...(memoSide ? { memoSide } : {}),
}));

const mergeMemoRows = (current, incoming) => {
  const rows = new Map(current.map((memo) => [memo.id, memo]));
  incoming.forEach((memo) => rows.set(memo.id, memo));
  return Array.from(rows.values());
};

function buildMemoListQuery(uid, tab, cursor = null, archiveSide = '') {
  const ref = collection(db, 'directMemos');
  const pageLimit = limitDocs(MEMO_PAGE_SIZE);
  const cursorClause = cursor ? [startAfter(cursor)] : [];

  if (tab === 'inbox') {
    return query(
      ref,
      where('recipientId', '==', uid),
      where('status', '==', 'delivered'),
      where('recipientArchivedAt', '==', null),
      where('recipientDeletedAt', '==', null),
      where('sentAt', '>=', Timestamp.fromMillis(Date.now() - MEMO_RETENTION_MS)),
      orderBy('sentAt', 'desc'),
      ...cursorClause,
      pageLimit
    );
  }

  if (tab === 'sent') {
    return query(
      ref,
      where('senderId', '==', uid),
      where('senderArchivedAt', '==', null),
      where('senderDeletedAt', '==', null),
      where('createdAt', '>=', Timestamp.fromMillis(Date.now() - MEMO_RETENTION_MS)),
      orderBy('createdAt', 'desc'),
      ...cursorClause,
      pageLimit
    );
  }

  const isInbox = archiveSide === 'inbox';
  const ownerField = isInbox ? 'recipientId' : 'senderId';
  const archivedField = isInbox ? 'recipientArchivedAt' : 'senderArchivedAt';
  const deletedField = isInbox ? 'recipientDeletedAt' : 'senderDeletedAt';
  return query(
    ref,
    where(ownerField, '==', uid),
    where(deletedField, '==', null),
    where(archivedField, '>', Timestamp.fromMillis(0)),
    orderBy(archivedField, 'desc'),
    ...cursorClause,
    pageLimit
  );
}

// 운영자(선생님) 계정은 이메일로 식별한다. 표시명이 아니라 이메일이 화이트리스트 기준이다.
const OPERATOR_EMAIL = 'paul@dulcine.net';
// 편지함에서 선생님께 편지를 쓸 수 있도록, users 목록 조회(limit 200)에서
// 운영자가 잘려나가더라도 반드시 수신자 디렉토리에 포함되도록 보장한다.
const ensureOperatorRecipient = async (rows) => {
  if (rows.some((row) => row.email === OPERATOR_EMAIL)) return rows;
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('email', '==', OPERATOR_EMAIL), limitDocs(1)));
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      recipientDirectoryCache = {
        loadedAt: recipientDirectoryCache.loadedAt,
        rows: [...recipientDirectoryCache.rows, { uid: docSnap.id, ...docSnap.data() }],
      };
      return [...rows, { uid: docSnap.id, ...docSnap.data() }];
    }
  } catch (err) {
    console.error('Failed to ensure operator recipient:', err);
  }
  return rows;
};

function getProfileName(profile = {}, fallback = '탐사원') {
  return profile.publicDisplayName || profile.studentName || profile.name || profile.displayName || fallback;
}

function getProfileHint(profile = {}) {
  return profile.publicTitle || profile.crewName || profile.email || profile.publicSignature || '';
}

function getMemoTime(value) {
  const date = value?.toDate?.();
  if (!date) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getErrorMessage(err) {
  if (err?.code === 'permission-denied') {
    return '편지함 권한이 아직 열리지 않았습니다. Firestore rules 배포가 필요합니다.';
  }
  if (err?.code === 'functions/internal' || err?.message?.includes('internal')) {
    return '편지 발송 서버가 아직 준비되지 않았습니다. Cloud Functions 배포가 필요합니다.';
  }
  if (err?.message) return err.message;
  return '편지를 처리하지 못했습니다.';
}

function MemoCard({ memo, mode, archived, expanded, onOpen, onArchive, onReply, onDelete, onOpenProfile }) {
  const isSent = mode === 'sent';
  const peerName = isSent ? memo.recipientName : memo.senderName;
  const peerId = isSent ? memo.recipientId : memo.senderId;
  const time = archived ? getMemoTime(memo.archiveTime) : getMemoTime(isSent ? memo.createdAt : memo.sentAt);
  const statusLabel = archived ? '보관됨' : (memo.status === 'scheduled' ? `예약 ${getMemoTime(memo.deliverAt)}` : (isSent ? (memo.isRead ? '읽음' : '배달됨') : (memo.isRead ? '읽음' : '새 편지')));

  const handleKeyOpen = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onOpen();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`direct-memo-card ${!archived && !isSent && !memo.isRead ? 'unread' : ''}`}
      onClick={onOpen}
      onKeyDown={handleKeyOpen}
    >
      <div className="direct-memo-card-top">
        <div className="direct-memo-peer">
          <span className="direct-memo-avatar"><UserRound size={15} /></span>
          {peerId ? (
            <button
              type="button"
              className="direct-memo-peer-link"
              onClick={(event) => {
                event.stopPropagation();
                onOpenProfile(peerId);
              }}
              aria-label={`${peerName || '탐사원'}님의 프로필 보기`}
            >
              {peerName || '탐사원'}
            </button>
          ) : (
            <span>{peerName || '탐사원'}</span>
          )}
        </div>
        <span className={`direct-memo-state ${memo.status === 'scheduled' ? 'scheduled' : ''}`}>
          {memo.status === 'scheduled' ? <Clock3 size={13} /> : <Check size={13} />}
          {statusLabel}
        </span>
      </div>
      <div className="direct-memo-preview">{expanded ? memo.body : (memo.bodyPreview || memo.body)}</div>
      <div className="direct-memo-card-bottom">
        <span>{time}</span>
        <span className="direct-memo-card-actions">
          {!archived && !isSent && (
            <button
              type="button"
              className="direct-memo-reply"
              onClick={(event) => {
                event.stopPropagation();
                onReply();
              }}
            >
              <Reply size={13} /> 답장
            </button>
          )}
          {!archived && (
            <button
              type="button"
              className="direct-memo-archive"
              onClick={(event) => {
                event.stopPropagation();
                onArchive();
              }}
            >
              <Archive size={13} /> 보관
            </button>
          )}
          <button
            type="button"
            className="direct-memo-delete"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 size={13} /> 삭제
          </button>
        </span>
      </div>
    </div>
  );
}

export default function DirectMemoMenu() {
  const { user } = useAuth();
  const { unreadMemos, unreadCount } = useDirectMemoRealtime();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox');
  const [recipients, setRecipients] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [archivedInbox, setArchivedInbox] = useState([]);
  const [archivedSent, setArchivedSent] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listCursors, setListCursors] = useState({ inbox: null, sent: null, archiveInbox: null, archiveSent: null });
  const [listHasMore, setListHasMore] = useState({ inbox: false, sent: false, archive: false });
  const [recipientId, setRecipientId] = useState('');
  const [draft, setDraft] = useState('');
  const [action, setAction] = useState('');
  const [message, setMessage] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientFocused, setRecipientFocused] = useState(false);
  const menuRef = useRef(null);
  const dropdownRef = useRef(null);
  const recipientInputRef = useRef(null);
  const protectedUntilRef = useRef(0);

  const protectMemoInteraction = () => {
    protectedUntilRef.current = Date.now() + 350;
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (Date.now() < protectedUntilRef.current) return;
      const clickedMenu = menuRef.current?.contains(event.target);
      const clickedDropdown = dropdownRef.current?.contains(event.target);
      if (!clickedMenu && !clickedDropdown) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user?.uid || !isOpen) {
      if (!user?.uid) setRecipients([]);
      return undefined;
    }

    let cancelled = false;
    const keyword = recipientSearch.trim();

    if (!keyword) {
      // 검색어가 없을 때는 선생님(운영자) 1명만 최소 조회하여 기본 추천으로 노출 (읽기 비용 최소화)
      ensureOperatorRecipient([]).then((rows) => {
        if (!cancelled) {
          const defaultList = rows.filter((profile) => profile.uid !== user.uid);
          setRecipients((prev) => {
            const selected = prev.find((p) => p.uid === recipientId);
            if (selected && !defaultList.some((p) => p.uid === selected.uid)) {
              return [selected, ...defaultList];
            }
            return defaultList;
          });
        }
      });
      return () => { cancelled = true; };
    }

    const timer = setTimeout(async () => {
      try {
        const term = keyword;
        const termLower = keyword.toLowerCase();
        const usersRef = collection(db, 'users');

        const [snap1, snap2, snap3, snap4] = await Promise.all([
          getDocs(query(usersRef, where('publicDisplayName', '>=', term), where('publicDisplayName', '<=', term + '\uf8ff'), limitDocs(10))),
          getDocs(query(usersRef, where('studentName', '>=', term), where('studentName', '<=', term + '\uf8ff'), limitDocs(10))),
          getDocs(query(usersRef, where('name', '>=', term), where('name', '<=', term + '\uf8ff'), limitDocs(10))),
          getDocs(query(usersRef, where('email', '>=', termLower), where('email', '<=', termLower + '\uf8ff'), limitDocs(10))),
        ]);

        if (cancelled) return;

        const resultMap = new Map();
        [snap1, snap2, snap3, snap4].forEach((snap) => {
          snap.docs.forEach((docSnap) => {
            if (docSnap.id !== user.uid) {
              const data = docSnap.data();
              if (data.role !== 'parent' && (data.role !== 'admin' || data.email === OPERATOR_EMAIL)) {
                resultMap.set(docSnap.id, { uid: docSnap.id, ...data });
              }
            }
          });
        });

        const list = Array.from(resultMap.values()).sort((a, b) => getProfileName(a).localeCompare(getProfileName(b), 'ko'));
        setRecipients((prev) => {
          const selected = prev.find((p) => p.uid === recipientId);
          if (selected && !list.some((p) => p.uid === selected.uid)) {
            return [selected, ...list];
          }
          return list;
        });
      } catch (err) {
        console.error('Failed to search recipients dynamically:', err);
        if (!cancelled) setRecipients([]);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, recipientId, recipientSearch, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !isOpen || activeTab === 'compose') return undefined;
    let cancelled = false;
    setListLoading(true);

    const loadInitialPage = async () => {
      try {
        if (activeTab === 'archive') {
          const [inboxSnap, sentSnap] = await Promise.all([
            getDocs(buildMemoListQuery(user.uid, 'archive', null, 'inbox')),
            getDocs(buildMemoListQuery(user.uid, 'archive', null, 'sent')),
          ]);
          if (cancelled) return;
          setArchivedInbox(mapMemoDocs(inboxSnap, 'inbox'));
          setArchivedSent(mapMemoDocs(sentSnap, 'sent'));
          setListCursors((prev) => ({
            ...prev,
            archiveInbox: inboxSnap.docs.at(-1) || null,
            archiveSent: sentSnap.docs.at(-1) || null,
          }));
          setListHasMore((prev) => ({ ...prev, archive: inboxSnap.size === MEMO_PAGE_SIZE || sentSnap.size === MEMO_PAGE_SIZE }));
          return;
        }

        const snap = await getDocs(buildMemoListQuery(user.uid, activeTab));
        if (cancelled) return;
        const rows = mapMemoDocs(snap);
        if (activeTab === 'inbox') setInbox(rows);
        if (activeTab === 'sent') setSent(rows);
        setListCursors((prev) => ({ ...prev, [activeTab]: snap.docs.at(-1) || null }));
        setListHasMore((prev) => ({ ...prev, [activeTab]: snap.size === MEMO_PAGE_SIZE }));
      } catch (err) {
        console.error('Failed to load direct memo list:', err);
        if (!cancelled) setMessage(getErrorMessage(err));
      } finally {
        if (!cancelled) setListLoading(false);
      }
    };

    loadInitialPage();
    return () => { cancelled = true; };
  }, [activeTab, isOpen, user?.uid]);

  const visibleInbox = useMemo(() => {
    const merged = new Map(inbox.map((memo) => [memo.id, memo]));
    unreadMemos.forEach((memo) => merged.set(memo.id, memo));
    return Array.from(merged.values()).filter((memo) => {
      if (memo.recipientArchivedAt || memo.recipientDeletedAt) return false;
      const timeMs = memo.sentAt?.toMillis?.() || memo.createdAt?.toMillis?.() || Date.now();
      return timeMs > Date.now() - MEMO_RETENTION_MS;
    }).sort((a, b) => (b.sentAt?.toMillis?.() || 0) - (a.sentAt?.toMillis?.() || 0));
  }, [inbox, unreadMemos]);

  const visibleSent = useMemo(() => {
    return sent.filter((memo) => {
      if (memo.senderArchivedAt || memo.senderDeletedAt) return false;
      const timeMs = memo.createdAt?.toMillis?.() || memo.sentAt?.toMillis?.() || Date.now();
      return timeMs > Date.now() - MEMO_RETENTION_MS;
    });
  }, [sent]);
  const archivedMemos = useMemo(() => {
    const inboxRows = archivedInbox
      .map((memo) => ({ ...memo, memoSide: 'inbox', archiveTime: memo.recipientArchivedAt }));
    const sentRows = archivedSent
      .map((memo) => ({ ...memo, memoSide: 'sent', archiveTime: memo.senderArchivedAt }));
    return [...inboxRows, ...sentRows].sort((a, b) => {
      const aTime = a.archiveTime?.toMillis?.() || 0;
      const bTime = b.archiveTime?.toMillis?.() || 0;
      return bTime - aTime;
    });
  }, [archivedInbox, archivedSent]);
  const filteredRecipients = useMemo(() => {
    const keyword = recipientSearch.trim().toLowerCase();
    // 검색어가 없을 때는 선생님(운영자)을 기본 추천으로 먼저 보여준다.
    // 학생이 가장 많이 찾는 수신자이므로, 검색을 강제하지 않고 바로 선택할 수 있게 한다.
    if (!keyword) {
      const operator = recipients.find((r) => r.email === OPERATOR_EMAIL);
      return operator ? [operator] : [];
    }
    return recipients.filter((recipient) => {
      const haystack = [
        recipient.publicDisplayName || '',
        recipient.studentName || '',
        recipient.name || '',
        recipient.displayName || '',
        getProfileName(recipient, ''),
        recipient.crewName || '',
        recipient.publicTitle || '',
        recipient.publicSignature || '',
        recipient.email || '',
      ].join(' ').toLowerCase();
      return haystack.includes(keyword);
    }).slice(0, 10);
  }, [recipients, recipientSearch]);
  const selectedRecipient = recipients.find((recipient) => recipient.uid === recipientId);

  useEffect(() => {
    if (recipientId && !recipients.some((recipient) => recipient.uid === recipientId)) {
      setRecipientId('');
    }
  }, [recipients, recipientId]);

  const handleRecipientSearchChange = (event) => {
    const value = event.target.value;
    setRecipientSearch(value);
    setRecipientFocused(true);
    if (selectedRecipient) {
      setRecipientId('');
    }
  };

  const handleSelectRecipient = (recipient) => {
    setRecipientId(recipient.uid);
    setRecipientSearch('');
    setRecipientFocused(false);
  };

  const handleClearRecipient = () => {
    setRecipientId('');
    setRecipientSearch('');
    setRecipientFocused(false);
    window.requestAnimationFrame(() => recipientInputRef.current?.focus());
  };

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !recipientId || action === 'sending') return;
    setAction('sending');
    setMessage('');
    soundManager.playClick();
    try {
      const fn = httpsCallable(functions, 'sendDirectMemo');
      const res = await fn({ recipientId, body });
      setDraft('');
      setRecipientId('');
      setRecipientSearch('');
      setActiveTab('sent');
      const data = res?.data || {};
      setMessage(data.status === 'scheduled'
        ? `${data.recipientName || '상대방'}님에게 보낼 편지를 예약했습니다.`
        : `${data.recipientName || '상대방'}님에게 편지를 보냈습니다.`);
    } catch (err) {
      console.error('Failed to send direct memo:', err);
      setMessage(getErrorMessage(err));
    } finally {
      setAction('');
    }
  };

  const handleOpenMemo = async (memo) => {
    setExpandedId((prev) => (prev === memo.id ? '' : memo.id));
    if (memo.recipientId !== user?.uid || memo.isRead || memo.status !== 'delivered') return;
    try {
      const fn = httpsCallable(functions, 'markDirectMemoRead');
      await fn({ memoId: memo.id });
      setInbox((prev) => mergeMemoRows(prev, [{ ...memo, isRead: true }]));
    } catch (err) {
      console.error('Failed to mark direct memo read:', err);
    }
  };

  const handleLoadMore = async () => {
    if (!user?.uid || listLoading || !listHasMore[activeTab]) return;
    setListLoading(true);
    try {
      if (activeTab === 'archive') {
        const [inboxSnap, sentSnap] = await Promise.all([
          getDocs(buildMemoListQuery(user.uid, 'archive', listCursors.archiveInbox, 'inbox')),
          getDocs(buildMemoListQuery(user.uid, 'archive', listCursors.archiveSent, 'sent')),
        ]);
        setArchivedInbox((prev) => mergeMemoRows(prev, mapMemoDocs(inboxSnap, 'inbox')));
        setArchivedSent((prev) => mergeMemoRows(prev, mapMemoDocs(sentSnap, 'sent')));
        setListCursors((prev) => ({
          ...prev,
          archiveInbox: inboxSnap.docs.at(-1) || prev.archiveInbox,
          archiveSent: sentSnap.docs.at(-1) || prev.archiveSent,
        }));
        setListHasMore((prev) => ({ ...prev, archive: inboxSnap.size === MEMO_PAGE_SIZE || sentSnap.size === MEMO_PAGE_SIZE }));
        return;
      }

      const snap = await getDocs(buildMemoListQuery(user.uid, activeTab, listCursors[activeTab]));
      const rows = mapMemoDocs(snap);
      if (activeTab === 'inbox') setInbox((prev) => mergeMemoRows(prev, rows));
      if (activeTab === 'sent') setSent((prev) => mergeMemoRows(prev, rows));
      setListCursors((prev) => ({ ...prev, [activeTab]: snap.docs.at(-1) || prev[activeTab] }));
      setListHasMore((prev) => ({ ...prev, [activeTab]: snap.size === MEMO_PAGE_SIZE }));
    } catch (err) {
      console.error('Failed to load more direct memos:', err);
      setMessage(getErrorMessage(err));
    } finally {
      setListLoading(false);
    }
  };

  const handleOpenProfile = (uid) => {
    if (!uid) return;
    soundManager.playClick();
    setIsOpen(false);
    navigate(`/profile/${uid}`);
  };

  const startComposeForUid = useCallback(async (targetUid) => {
    if (!targetUid || targetUid === user?.uid) return;
    setIsOpen(true);
    setActiveTab('compose');

    let recipient = recipients.find((item) => item.uid === targetUid);

    if (!recipient) {
      try {
        const docSnap = await getDoc(doc(db, 'users', targetUid));
        if (docSnap.exists()) {
          recipient = { uid: docSnap.id, ...docSnap.data() };
          setRecipients((prev) => {
            if (prev.some((item) => item.uid === targetUid)) return prev;
            return [recipient, ...prev];
          });
        }
      } catch (err) {
        console.error('Failed to fetch recipient for memo:', err);
      }
    }

    if (recipient) {
      setRecipientId(recipient.uid);
      setRecipientSearch(getProfileName(recipient));
      setRecipientFocused(false);
      setMessage('');
      window.requestAnimationFrame(() => {
        if (recipientInputRef.current) recipientInputRef.current.focus();
      });
    }
  }, [recipients, user?.uid]);

  useEffect(() => {
    const handleRequest = (event) => {
      const { uid } = event.detail || {};
      if (!uid) return;
      if (!user?.uid) {
        setMessage('편지함을 열려면 먼저 로그인해 주세요.');
        setIsOpen(true);
        return;
      }
      soundManager.playClick();
      startComposeForUid(uid);
    };
    window.addEventListener('directmemo:compose', handleRequest);
    return () => window.removeEventListener('directmemo:compose', handleRequest);
  }, [startComposeForUid, user?.uid]);

  const handleReplyMemo = (memo) => {
    setActiveTab('compose');
    setRecipientId(memo.senderId);
    setRecipientSearch(memo.senderName || '탐사원');
    window.requestAnimationFrame(() => {
      if (recipientInputRef.current) recipientInputRef.current.focus();
    });
  };

  const handleArchiveMemo = async (memo) => {
    setAction(`archive:${memo.id}`);
    try {
      const fn = httpsCallable(functions, 'archiveDirectMemo');
      await fn({ memoId: memo.id });
      const isInbox = memo.recipientId === user?.uid;
      const archivedAt = Timestamp.now();
      if (isInbox) {
        setInbox((prev) => prev.filter((item) => item.id !== memo.id));
        setArchivedInbox((prev) => mergeMemoRows(prev, [{ ...memo, recipientArchivedAt: archivedAt, memoSide: 'inbox' }]));
      } else {
        setSent((prev) => prev.filter((item) => item.id !== memo.id));
        setArchivedSent((prev) => mergeMemoRows(prev, [{ ...memo, senderArchivedAt: archivedAt, memoSide: 'sent' }]));
      }
      setMessage('편지를 보관함으로 옮겼습니다.');
    } catch (err) {
      console.error('Failed to archive direct memo:', err);
      setMessage(getErrorMessage(err));
    } finally {
      setAction('');
    }
  };

  const handleDeleteMemo = async (memo) => {
    let msg = '이 편지를 내 목록에서 삭제할까요? 삭제한 편지는 다시 볼 수 없습니다.';
    const isSent = memo.senderId === user?.uid;
    
    if (isSent) {
      if (!memo.isRead) {
        msg = '상대방이 아직 편지를 읽지 않았습니다. 이 편지를 삭제하면 발송이 취소되어 상대방의 편지함에서도 함께 삭제됩니다. 삭제하시겠습니까?';
      } else {
        msg = '이 편지를 내 목록에서 삭제할까요? (상대방은 이미 읽었으므로 상대방의 편지함에는 그대로 남습니다.) 삭제한 편지는 다시 볼 수 없습니다.';
      }
    }

    const ok = window.confirm(msg);
    if (!ok) return;
    setAction(`delete:${memo.id}`);
    try {
      const fn = httpsCallable(functions, 'deleteDirectMemo');
      await fn({ memoId: memo.id });
      setInbox((prev) => prev.filter((item) => item.id !== memo.id));
      setSent((prev) => prev.filter((item) => item.id !== memo.id));
      setArchivedInbox((prev) => prev.filter((item) => item.id !== memo.id));
      setArchivedSent((prev) => prev.filter((item) => item.id !== memo.id));
      if (expandedId === memo.id) setExpandedId('');
      setMessage('편지를 삭제했습니다.');
    } catch (err) {
      console.error('Failed to delete direct memo:', err);
      setMessage(getErrorMessage(err));
    } finally {
      setAction('');
    }
  };

  const listMemos = activeTab === 'inbox'
    ? visibleInbox
    : activeTab === 'sent'
      ? visibleSent
      : archivedMemos;

  const getEmptyMessage = () => {
    if (activeTab === 'inbox') return '받은 편지가 없습니다.';
    if (activeTab === 'sent') return '보낸 편지가 없습니다.';
    return '보관한 편지가 없습니다.';
  };

  return (
    <div className="direct-memo-container" ref={menuRef}>
      <button
        type="button"
        className="direct-memo-button"
        onClick={(event) => {
          if (Date.now() < protectedUntilRef.current) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          soundManager.playClick();
          setIsOpen((prev) => !prev);
        }}
        aria-label="편지함"
      >
        <svg
          className="direct-memo-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
        {unreadCount > 0 && <span className="direct-memo-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="direct-memo-dropdown direct-memo-dropdown--portal glass"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="direct-memo-header">
            <div>
              <div className="direct-memo-kicker">LETTER BOX</div>
              <h4>1:1 편지함</h4>
            </div>
            <button type="button" className="direct-memo-compose" onClick={() => setActiveTab('compose')}>
              <PenLine size={15} /> 쓰기
            </button>
          </div>

          <div className="direct-memo-tabs">
            <button type="button" className={activeTab === 'inbox' ? 'active' : ''} onClick={() => setActiveTab('inbox')}>받은 편지</button>
            <button type="button" className={activeTab === 'sent' ? 'active' : ''} onClick={() => setActiveTab('sent')}>보낸 편지</button>
            <button type="button" className={activeTab === 'archive' ? 'active' : ''} onClick={() => setActiveTab('archive')}>보관함</button>
          </div>

          {activeTab !== 'compose' && (
            <div className="direct-memo-retention-notice">
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', padding: '0 12px 10px 12px', textAlign: 'center' }}>
                중요한 편지는 꼭 보관함에 이동하여 보관해주세요.<br/>보관되지 않은 편지는 30일 후 자동 삭제됩니다.
              </span>
            </div>
          )}

          {message && <div className={`direct-memo-message ${message.includes('못했') || message.includes('오류') ? 'error' : ''}`}>{message}</div>}

          {activeTab === 'compose' ? (
            <div
              className="direct-memo-compose-panel"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="direct-memo-field">
                <span className="direct-memo-field-label">받는 사람</span>
                <div
                  className="direct-memo-recipient-combobox"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setRecipientFocused(false);
                    }
                  }}
                >
                  {selectedRecipient ? (
                    <div className="direct-memo-selected-recipient">
                      <span className="direct-memo-selected-avatar"><UserRound size={16} /></span>
                      <span className="direct-memo-selected-copy">
                        <strong>{getProfileName(selectedRecipient)}</strong>
                        {getProfileHint(selectedRecipient) && <small>{getProfileHint(selectedRecipient)}</small>}
                      </span>
                      <button
                        type="button"
                        className="direct-memo-selected-clear"
                        onClick={handleClearRecipient}
                        disabled={action === 'sending'}
                        aria-label="받는 사람 삭제"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={recipientInputRef}
                        type="search"
                        value={recipientSearch}
                        onChange={handleRecipientSearchChange}
                        onFocus={() => setRecipientFocused(true)}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter' || !filteredRecipients.length) return;
                          event.preventDefault();
                          handleSelectRecipient(filteredRecipients[0]);
                        }}
                        placeholder="프로필명으로 msense 사용자 검색"
                        disabled={action === 'sending'}
                      />
                      {recipientFocused && filteredRecipients.length > 0 && (
                        <div className="direct-memo-suggestions">
                          {filteredRecipients.map((recipient) => {
                            const hint = getProfileHint(recipient);
                            return (
                              <button
                                type="button"
                                key={recipient.uid}
                                className="direct-memo-suggestion"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  protectMemoInteraction();
                                }}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleSelectRecipient(recipient);
                                }}
                              >
                                <span className="direct-memo-suggestion-name">{getProfileName(recipient)}</span>
                                {hint && <span className="direct-memo-suggestion-hint">{hint}</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {recipientFocused && recipientSearch.trim() && filteredRecipients.length === 0 && (
                        <div className="direct-memo-suggestions">
                          <div className="direct-memo-suggestion-empty">일치하는 사용자가 없습니다.</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value.slice(0, MEMO_MAX_LENGTH))}
                placeholder={recipients.length ? '이메일이 없던 시절처럼, 편지를 남겨보세요.' : '편지를 보낼 사용자를 불러오는 중입니다.'}
                maxLength={MEMO_MAX_LENGTH}
                disabled={!recipients.length || action === 'sending'}
              />
              <div className="direct-memo-compose-footer">
                <span>{draft.length}/{MEMO_MAX_LENGTH}</span>
                <button type="button" className="direct-memo-send" onClick={handleSend} disabled={!draft.trim() || !recipientId || action === 'sending'}>
                  <Send size={15} /> {action === 'sending' ? '보내는 중...' : '보내기'}
                </button>
              </div>
              <p className="direct-memo-rule">스터디 약속과 질문을 자유롭게 주고받을 수 있습니다. 서로에게 필요한 말만 짧고 안전하게 남겨주세요.</p>
            </div>
          ) : (
            <div className="direct-memo-list">
              {listLoading && listMemos.length === 0 ? (
                <div className="direct-memo-empty">편지를 불러오는 중입니다.</div>
              ) : listMemos.length === 0 ? (
                <div className="direct-memo-empty">{getEmptyMessage()}</div>
              ) : (
                <>
                  {listMemos.map((memo) => (
                    <MemoCard
                      key={memo.id}
                      memo={memo}
                      mode={activeTab === 'archive' ? memo.memoSide : activeTab}
                      archived={activeTab === 'archive'}
                      expanded={expandedId === memo.id}
                      onOpen={() => handleOpenMemo(memo)}
                      onArchive={() => handleArchiveMemo(memo)}
                      onReply={() => handleReplyMemo(memo)}
                      onDelete={() => handleDeleteMemo(memo)}
                      onOpenProfile={handleOpenProfile}
                    />
                  ))}
                  {listHasMore[activeTab] && (
                    <button
                      type="button"
                      className="direct-memo-compose"
                      onClick={handleLoadMore}
                      disabled={listLoading}
                      style={{ alignSelf: 'center', margin: '0.35rem auto 0.75rem' }}
                    >
                      {listLoading ? '불러오는 중...' : '편지 더 보기'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
