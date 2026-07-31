import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { Bell, Megaphone, X } from 'lucide-react';
import { db, auth } from '../../firebase';

// 학부모용 알림 훅. notifications 컬렉션을 recipientId(학부모 uid)로 실시간 구독.
// NotificationMenu(학생용)와 같은 컬렉션을 공유합니다.
function useParentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  const markRead = async (id) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  return { notifications, markRead };
}

// 접속 시 상단에 뜨는 공지 배너. 읽지 않은 가장 최근 parent_announcement를 표시.
export function ParentAnnouncementBanner() {
  const { notifications, markRead } = useParentNotifications();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState({});

  const bannerNotification = notifications.find(
    (n) => n.type === 'parent_announcement' && !n.isRead && !dismissed[n.id]
  );
  if (!bannerNotification) return null;

  const handleClick = async () => {
    if (bannerNotification.link) navigate(bannerNotification.link);
    await markRead(bannerNotification.id);
  };
  const handleDismiss = (e) => {
    e.stopPropagation();
    setDismissed((prev) => ({ ...prev, [bannerNotification.id]: true }));
  };

  return (
    <div
      onClick={handleClick}
      style={{
        margin: '0 0 16px',
        padding: '13px 14px',
        borderRadius: 12,
        cursor: 'pointer',
        background: 'linear-gradient(135deg, rgba(124,58,237,0.22), rgba(6,182,212,0.16))',
        border: '1px solid rgba(103,232,249,0.35)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <Megaphone size={18} color="#67e8f9" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {bannerNotification.title && (
          <div style={{ fontWeight: 800, color: '#e0f2fe', fontSize: 14, marginBottom: 3 }}>{bannerNotification.title}</div>
        )}
        <div style={{ color: 'rgba(224,242,254,0.85)', fontSize: 13, lineHeight: 1.5 }}>{bannerNotification.message}</div>
      </div>
      <button type="button" onClick={handleDismiss} aria-label="배너 닫기" style={{ background: 'transparent', border: 0, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
        <X size={16} />
      </button>
    </div>
  );
}

// 헤더용 알림 벨. 클릭하면 알림 목록 패널이 펼쳐집니다.
export default function ParentNotificationBell() {
  const { notifications, markRead } = useParentNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = async (notification) => {
    if (!notification.isRead) await markRead(notification.id);
    if (notification.link) navigate(notification.link);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="알림"
        style={{
          position: 'relative', background: 'none', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
        }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, background: '#f87171', color: '#fff',
            fontSize: 10, fontWeight: 800, minWidth: 16, height: 16, borderRadius: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 320, maxWidth: 'calc(100vw - 40px)',
          background: 'rgba(15,22,46,0.98)', border: '1px solid rgba(103,232,249,0.25)',
          borderRadius: 14, padding: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.4)', zIndex: 50,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong style={{ color: '#67e8f9', fontSize: 14 }}>알림</strong>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => notifications.forEach((n) => { if (!n.isRead) markRead(n.id); })}
                style={{ background: 'none', border: 0, color: '#a5f3fc', cursor: 'pointer', fontSize: 12 }}
              >
                모두 읽음
              </button>
            )}
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>새로운 알림이 없습니다.</div>
            ) : notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                style={{
                  padding: '10px', borderRadius: 10, marginBottom: 6, cursor: 'pointer',
                  background: notif.isRead ? 'transparent' : 'rgba(103,232,249,0.08)',
                  border: notif.isRead ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(103,232,249,0.2)',
                }}
              >
                {notif.title && <div style={{ fontWeight: 700, color: '#e0f2fe', fontSize: 13, marginBottom: 3 }}>{notif.title}</div>}
                <div style={{ color: 'rgba(224,242,254,0.8)', fontSize: 12.5, lineHeight: 1.5 }}>{notif.message}</div>
                {notif.createdAt?.toDate && (
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 5 }}>{notif.createdAt.toDate().toLocaleString()}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
