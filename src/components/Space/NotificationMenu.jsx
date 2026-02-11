import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Bell } from 'lucide-react';
import './NotificationMenu.css';

export default function NotificationMenu() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc') // Requires composite index usually
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.isRead).length);
    });

    return () => unsubscribe();
  }, []);

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.isRead) {
      try {
        await updateDoc(doc(db, 'notifications', notification.id), { isRead: true });
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }

    // Deep Link Navigation
    if (notification.link) {
      navigate(notification.link);
    }
    setIsOpen(false);
  };

  return (
    <div className="notification-menu-container" ref={menuRef}>
      <button 
        className="notification-bell-btn" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell size={20} color="white" />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown glass">
          <div className="notification-header">
            <h4>알림 센터</h4>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read-btn"
                onClick={() => {
                  notifications.forEach(n => {
                    if (!n.isRead) updateDoc(doc(db, 'notifications', n.id), { isRead: true });
                  });
                }}
              >
                모두 읽음
              </button>
            )}
          </div>
          
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-notifications">새로운 알림이 없습니다.</div>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id} 
                  className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notif-icon">
                    {notif.type === 'reply' ? '💬' : '📢'}
                  </div>
                  <div className="notif-content">
                    <p className="notif-message">{notif.message}</p>
                    <span className="notif-time">
                      {notif.createdAt?.toDate().toLocaleString()}
                    </span>
                  </div>
                  {!notif.isRead && <div className="unread-dot"></div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
