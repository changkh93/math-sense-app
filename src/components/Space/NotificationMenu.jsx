import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { AlertTriangle, Award, CalendarX, Gem, Mail, Megaphone, MessageCircle } from 'lucide-react';
import { getEvaluationPeriodLabel, getScholarshipCourseLabel } from '../../utils/scholarshipAwards';
import './NotificationMenu.css';

function NotificationIcon({ type }) {
  if (type === 'reply') return <MessageCircle size={17} />;
  if (type === 'assignment_share_comment') return <MessageCircle size={17} />;
  if (type === 'memo') return <Mail size={17} />;
  if (type === 'assignment_missing') return <CalendarX size={17} />;
  if (type === 'assignment_warning') return <AlertTriangle size={17} />;
  if (type === 'assignment_bonus') return <Gem size={17} />;
  if (type === 'scholarship_award') return <Award size={17} />;
  if (type === 'certificate_award') return <Award size={17} />;
  return <Megaphone size={17} />;
}

function getNotificationIconClass(type) {
  if (type === 'memo') return 'memo';
  if (type === 'assignment_share_comment') return 'reply';
  if (type === 'assignment_missing') return 'assignment-missing';
  if (type === 'assignment_warning') return 'assignment-warning';
  if (type === 'assignment_bonus') return 'assignment-bonus';
  if (type === 'scholarship_award') return 'scholarship-award';
  if (type === 'certificate_award') return 'certificate-award';
  return '';
}

function getScholarshipNotificationParts(notification = {}) {
  const metadata = notification.metadata || {};
  const awardIdMatch = String(metadata.awardId || notification.link || '').match(/_(\d{4})_(\d{1,2})_/);
  const year = Number(metadata.year || awardIdMatch?.[1]);
  const month = Number(metadata.month || awardIdMatch?.[2]);
  const courseClusterId = metadata.courseClusterId || '';

  return {
    year: Number.isFinite(year) && year > 0 ? year : null,
    month: Number.isFinite(month) && month > 0 ? month : null,
    courseLabel: getScholarshipCourseLabel(courseClusterId),
  };
}

function getNotificationMessage(notification = {}) {
  const message = String(notification.message || '');
  if (notification.type !== 'scholarship_award' || !/NaN/i.test(message)) return message;

  const { year, month, courseLabel } = getScholarshipNotificationParts(notification);
  if (year && month) {
    return `축하합니다! ${getEvaluationPeriodLabel(year, month)} ${courseLabel} 장학생으로 선정되어 다음 수강료 20% 감면 혜택이 적용됩니다.`;
  }

  return message.replace(/NaN년\s*NaN월\s*/gi, '');
}

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
    
    let unsubscribeSnapshot = null;
    let cleanupTimeout = null;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(n => n.type !== 'memo');
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.isRead).length);
    });

    return () => {
      if (cleanupTimeout) clearTimeout(cleanupTimeout);
      if (unsubscribeSnapshot) {
        if (!auth.currentUser) {
           unsubscribeSnapshot();
        } else {
           cleanupTimeout = setTimeout(() => {
             if (unsubscribeSnapshot) unsubscribeSnapshot();
           }, 100);
        }
      }
    };
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
      if (notification.link.match(/^\/agora\/[^/]+$/)) {
         // Convert /agora/ID to /agora?highlight=ID to show in list view
         const id = notification.link.split('/').pop();
         navigate(`/agora?highlight=${id}&filter=my`); // Assuming it's usually 'my' question
      } else {
         navigate(notification.link);
      }
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
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="white" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown glass">
          <div className="notification-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="var(--crystal-cyan)" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <h4>알림 센터</h4>
            </div>
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
                  <div className={`notif-icon ${getNotificationIconClass(notif.type)}`}>
                    <NotificationIcon type={notif.type} />
                  </div>
                  <div className="notif-content">
                    <p className="notif-message">{getNotificationMessage(notif)}</p>
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
