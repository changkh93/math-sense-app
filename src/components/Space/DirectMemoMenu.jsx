import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, limit as limitDocs, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Archive, Check, Clock3, PenLine, Reply, Send, Trash2, UserRound, X } from 'lucide-react';
import { db, functions } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import soundManager from '../../utils/SoundManager';
import './DirectMemoMenu.css';

const MEMO_MAX_LENGTH = 2000;

function getProfileName(profile = {}, fallback = '탐사원') {
  return profile.publicDisplayName || profile.studentName || profile.name || profile.displayName || fallback;
}

function getProfileHint(profile = {}) {
  return profile.publicTitle || profile.crewName || profile.publicSignature || '';
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

function MemoCard({ memo, mode, archived, expanded, onOpen, onArchive, onReply, onDelete }) {
  const isSent = mode === 'sent';
  const peerName = isSent ? memo.recipientName : memo.senderName;
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
          <span>{peerName || '탐사원'}</span>
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
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox');
  const [recipients, setRecipients] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [recipientId, setRecipientId] = useState('');
  const [draft, setDraft] = useState('');
  const [action, setAction] = useState('');
  const [message, setMessage] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientFocused, setRecipientFocused] = useState(false);
  const menuRef = useRef(null);
  const recipientInputRef = useRef(null);
  const protectedUntilRef = useRef(0);

  const protectMemoInteraction = () => {
    protectedUntilRef.current = Date.now() + 350;
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (Date.now() < protectedUntilRef.current) return;
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setRecipients([]);
      return undefined;
    }

    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list = snap.docs
        .map((docSnap) => ({ uid: docSnap.id, ...docSnap.data() }))
        .filter((profile) => profile.uid !== user.uid && profile.role !== 'parent' && (profile.role !== 'admin' || profile.email === 'paul@dulcine.net'))
        .sort((a, b) => getProfileName(a).localeCompare(getProfileName(b), 'ko'));
      setRecipients(list);
      setRecipientId((prev) => (prev && list.some((item) => item.uid === prev) ? prev : ''));
    }, (err) => {
      console.error('Failed to load direct memo recipients:', err);
      setRecipients([]);
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const inboxQuery = query(
      collection(db, 'directMemos'),
      where('recipientId', '==', user.uid),
      where('status', '==', 'delivered'),
      orderBy('sentAt', 'desc'),
      limitDocs(40)
    );
    const unsub = onSnapshot(inboxQuery, (snap) => {
      setInbox(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    }, (err) => {
      console.error('Failed to load direct memo inbox:', err);
      setMessage(getErrorMessage(err));
      setInbox([]);
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const sentQuery = query(
      collection(db, 'directMemos'),
      where('senderId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limitDocs(40)
    );
    const unsub = onSnapshot(sentQuery, (snap) => {
      setSent(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    }, (err) => {
      console.error('Failed to load sent direct memos:', err);
      setMessage(getErrorMessage(err));
      setSent([]);
    });
    return () => unsub();
  }, [user?.uid]);

  const visibleInbox = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return inbox.filter((memo) => {
      if (memo.recipientArchivedAt || memo.recipientDeletedAt) return false;
      const timeMs = memo.sentAt?.toMillis?.() || memo.createdAt?.toMillis?.() || Date.now();
      return timeMs > thirtyDaysAgo;
    });
  }, [inbox]);

  const visibleSent = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return sent.filter((memo) => {
      if (memo.senderArchivedAt || memo.senderDeletedAt) return false;
      const timeMs = memo.createdAt?.toMillis?.() || memo.sentAt?.toMillis?.() || Date.now();
      return timeMs > thirtyDaysAgo;
    });
  }, [sent]);
  const archivedMemos = useMemo(() => {
    const archivedInbox = inbox
      .filter((memo) => memo.recipientArchivedAt && !memo.recipientDeletedAt)
      .map((memo) => ({ ...memo, memoSide: 'inbox', archiveTime: memo.recipientArchivedAt }));
    const archivedSent = sent
      .filter((memo) => memo.senderArchivedAt && !memo.senderDeletedAt)
      .map((memo) => ({ ...memo, memoSide: 'sent', archiveTime: memo.senderArchivedAt }));
    return [...archivedInbox, ...archivedSent].sort((a, b) => {
      const aTime = a.archiveTime?.toMillis?.() || 0;
      const bTime = b.archiveTime?.toMillis?.() || 0;
      return bTime - aTime;
    });
  }, [inbox, sent]);
  const unreadCount = useMemo(() => visibleInbox.filter((memo) => !memo.isRead).length, [visibleInbox]);
  const filteredRecipients = useMemo(() => {
    const keyword = recipientSearch.trim().toLowerCase();
    if (!keyword) return [];
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
      setMessage(`${data.recipientName || '상대방'}님에게 편지를 보냈습니다.`);
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
    } catch (err) {
      console.error('Failed to mark direct memo read:', err);
    }
  };

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
      await updateMemoLocally(memo, 'archive');
      setMessage('편지를 보관함으로 옮겼습니다.');
    } catch (err) {
      console.error('Failed to archive direct memo:', err);
      setMessage(getErrorMessage(err));
    } finally {
      setAction('');
    }
  };

  const updateMemoLocally = async (memo, type) => {
    const side = memo.senderId === user?.uid ? 'sender' : memo.recipientId === user?.uid ? 'recipient' : '';
    if (!side) throw new Error('내 편지만 처리할 수 있습니다.');
    const updates = { updatedAt: serverTimestamp() };
    if (type === 'archive') {
      updates[`${side}ArchivedAt`] = serverTimestamp();
    }
    if (type === 'restore') {
      updates[`${side}ArchivedAt`] = null;
    }
    if (type === 'delete') {
      updates[`${side}DeletedAt`] = serverTimestamp();
      updates[`${side}ArchivedAt`] = null;
      if (side === 'sender' && !memo.isRead) {
        updates['recipientDeletedAt'] = serverTimestamp();
      }
    }
    await updateDoc(doc(db, 'directMemos', memo.id), updates);
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
      await updateMemoLocally(memo, 'delete');
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

      {isOpen && (
        <div
          className="direct-memo-dropdown glass"
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
                      {recipientFocused && recipientSearch.trim() && (
                        <div className="direct-memo-suggestions">
                          {filteredRecipients.length ? (
                            filteredRecipients.map((recipient) => {
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
                            })
                          ) : (
                            <div className="direct-memo-suggestion-empty">일치하는 사용자가 없습니다.</div>
                          )}
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
              {listMemos.length === 0 ? (
                <div className="direct-memo-empty">{getEmptyMessage()}</div>
              ) : (
                listMemos.map((memo) => (
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
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
