import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, functions } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import soundManager from '../../utils/SoundManager';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import NotificationMenu from './NotificationMenu';
import DirectMemoMenu from './DirectMemoMenu';
import CometBadge from './CometBadge';
import { getEffectiveStreak } from '../../utils/streakUtils';
import './SpaceNavbar.css';

export default function SpaceNavbar({ currentView, onViewChange }) {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = React.useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);

  const handleLogout = async () => {
    soundManager.playClick();
    await signOut(auth);
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (!user?.uid || isDeletingAccount) return;
    soundManager.playClick();

    if (userData?.role === 'admin') {
      alert('관리자 계정은 프로필 메뉴에서 탈퇴할 수 없습니다.');
      return;
    }

    let parentData = null;
    try {
      const parentSnap = await getDoc(doc(db, 'parents', user.uid));
      parentData = parentSnap.exists() && !parentSnap.data()?.isDeleted ? parentSnap.data() : null;
    } catch (error) {
      console.warn('parent account check failed before deletion:', error);
    }

    const rawEmail = String(user?.email || '').trim();
    const syntheticParentMatch = rawEmail.match(/^(\d+)@parent\.mathsense\.app$/);
    const syntheticStudentMatch = rawEmail.match(/^([^@]+)@student\.mathsense\.app$/);
    const emailLocalPart = rawEmail.includes('@') ? rawEmail.split('@')[0] : rawEmail;
    const confirmTarget = parentData?.phone || syntheticParentMatch?.[1] || syntheticStudentMatch?.[1] || emailLocalPart || '탈퇴';
    const isLikelyParentAccount = Boolean(parentData) || Boolean(syntheticParentMatch) || userData?.role === 'parent';
    const firstConfirm = window.confirm(
      '계정을 완전히 탈퇴합니다.\n\n' +
      (isLikelyParentAccount
        ? '부모 계정과 연결된 자녀 계정도 함께 삭제됩니다.\n\n'
        : '') +
      '삭제 범위: 로그인 계정, 학습 기록, 광석/거래 내역, 과제, 출석, 질문/답변, 쪽지, 스터디 크루 연결, 업로드 파일.\n\n' +
      '이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?'
    );
    if (!firstConfirm) return;

    const confirmText = window.prompt(
      `최종 확인을 위해 아래 문구를 입력하세요.\n\n${confirmTarget}`
    );
    if (confirmText !== confirmTarget) {
      alert('확인 문구가 일치하지 않아 탈퇴를 취소했습니다.');
      return;
    }

    setIsDeletingAccount(true);
    setIsProfileMenuOpen(false);
    window.sessionStorage.setItem('accountDeletionInProgress', user.uid);

    try {
      const deleteAccount = httpsCallable(functions, 'deleteCurrentUserAccount');
      await deleteAccount({ confirmText });
      try {
        await signOut(auth);
      } catch (signOutErr) {
        console.warn('signOut after account deletion failed:', signOutErr);
      }
      window.sessionStorage.removeItem('accountDeletionInProgress');
      navigate('/', { replace: true });
      alert('탈퇴 처리가 완료되었습니다.');
    } catch (err) {
      console.error('deleteCurrentUserAccount failed:', err);
      window.sessionStorage.removeItem('accountDeletionInProgress');
      alert(err?.message || '탈퇴 처리 중 오류가 발생했습니다.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleNavClick = (view, path) => {
    soundManager.playClick();
    setIsMobileMoreOpen(false);
    setIsProfileMenuOpen(false);
    const isHome = window.location.pathname === '/';
    
    if (path === '/agora') {
      navigate('/agora');
    } else if (!isHome) {
      // Navigate to home and tell it which view to show
      navigate('/', { state: { view } });
    } else {
      // Already on home page, just change view
      if (onViewChange) onViewChange(view);
    }
  };

  const viewTitle = ({
    planet: '학습 지도',
    dashboard: '성장 기록',
    mistake_notebook: '오답노트',
    assignment_hub: '과제',
    journey: '항해 기록',
    ledger: '광석 내역',
    collection: '도감',
    ranking: '랭킹',
    store: '스토어',
    crew: '스터디 크루',
    agora: '스텔라 아고라',
    profile: '프로필'
  })[currentView] || (window.location.pathname.startsWith('/agora') ? '스텔라 아고라' : 'Meta Sense');

  const mobilePrimaryNav = [
    { view: 'planet', label: '학습', icon: '🪐' },
    { view: 'mistake_notebook', label: '오답', icon: '🧠' },
    { view: 'assignment_hub', label: '과제', icon: '🛰️' },
    { view: 'journey', label: '기록', icon: '☄️' }
  ];

  const mobileMoreNav = [
    { view: 'dashboard', label: '성장 기록', icon: '📊' },
    { view: 'collection', label: '도감', icon: '🏆' },
    { view: 'ranking', label: '랭킹', icon: '🏅' },
    { view: 'store', label: '스토어', icon: '🎨' },
    { view: 'crew', label: '스터디 크루', icon: '🛰️' },
    { view: 'ledger', label: '광석 내역', icon: '💎' }
  ];

  const mobileIsAgoraActive = window.location.pathname.startsWith('/agora');

  return (
    <nav className="space-nav hud-border">
      <div className="mobile-nav-top">
        <button
          type="button"
          className="mobile-brand-btn"
          onClick={() => handleNavClick('planet', '/')}
          aria-label="학습 지도로 이동"
        >
          <img src="/m-logo.svg" alt="" />
        </button>
        <div className="mobile-current-view">
          <span className="mobile-current-kicker">META SENSE</span>
          <strong>{viewTitle}</strong>
        </div>
        <div className="mobile-nav-actions">
          <DirectMemoMenu />
          <NotificationMenu />
          <button
            type="button"
            className={`mobile-profile-btn ${isProfileMenuOpen ? 'active' : ''}`}
            onClick={() => { soundManager.playClick(); setIsProfileMenuOpen(!isProfileMenuOpen); setIsMobileMoreOpen(false); }}
            aria-label="프로필 메뉴 열기"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" />
            ) : (
              <span>{(userData?.studentName || user?.displayName)?.[0] || '?'}</span>
            )}
          </button>
        </div>
      </div>

      <div className="space-nav-links desktop-nav-links font-title">
        <div style={{ display: 'flex', alignItems: 'center', marginRight: '1rem', cursor: 'pointer' }} onClick={() => handleNavClick('planet', '/')}>
          <img src="/m-logo.svg" alt="Meta Sense Logo" style={{ width: '30px', filter: 'drop-shadow(0 0 8px rgba(0, 243, 255, 0.6))' }} />
        </div>
        <button 
          className={`space-nav-link ${currentView === 'planet' ? 'active' : ''}`}
          onClick={() => handleNavClick('planet', '/')}
        >
          🪐 NAV
        </button>
        <button 
          className={`space-nav-link ${currentView === 'collection' ? 'active' : ''}`}
          onClick={() => handleNavClick('collection', '/')}
        >
          🏆 DATABASE
        </button>
        <button
          className={`space-nav-link ${currentView === 'mistake_notebook' ? 'active' : ''}`}
          onClick={() => handleNavClick('mistake_notebook', '/')}
        >
          🧠 NOTE
        </button>
        <button 
          className={`space-nav-link ${currentView === 'ranking' ? 'active' : ''}`}
          onClick={() => handleNavClick('ranking', '/')}
        >
          🏆 RANKING
        </button>
        <button 
          className={`space-nav-link ${currentView === 'store' ? 'active' : ''}`}
          onClick={() => handleNavClick('store', '/')}
        >
          🎨 STORE
        </button>
        <button 
          className={`space-nav-link ${currentView === 'crew' ? 'active' : ''}`}
          onClick={() => handleNavClick('crew', '/')}
        >
          🛰️ STUDY CREW
        </button>
        <button 
          className={`space-nav-link agora-nav-btn ${window.location.pathname.startsWith('/agora') ? 'active' : ''}`}
          onClick={() => handleNavClick('agora', '/agora')}
        >
          🏛️ STELLAR AGORA
        </button>
      </div>
      
      <div className="nav-right desktop-nav-right">
        <DirectMemoMenu />
        <NotificationMenu />
        <div 
          onClick={() => handleNavClick('journey', '/')}
          style={{ cursor: 'pointer', display: 'flex' }}
          title="별자리 항해 기록 보기"
        >
          <CometBadge streak={getEffectiveStreak(userData)} />
        </div>
        <div 
          className={`crystal-counter font-tech ${currentView === 'ledger' ? 'ledger-open' : ''}`}
          onClick={() => handleNavClick('ledger', '/')}
          style={{ cursor: 'pointer' }}
          title="광석 입출금 내역 보기"
        >
          <div className="crystal-icon"></div>
          <span>{userData?.crystals || 0} (광석)</span>
        </div>

        {/* Profile Menu relative container */}
        <div className="profile-menu-anchor" style={{ position: 'relative' }}>
          <div 
            onClick={() => { soundManager.playClick(); setIsProfileMenuOpen(!isProfileMenuOpen); }}
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              overflow: 'hidden', 
              cursor: 'pointer',
              border: '2px solid var(--crystal-cyan)',
              boxShadow: isProfileMenuOpen ? '0 0 15px var(--crystal-cyan)' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--crystal-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
                {(userData?.studentName || user?.displayName)?.[0] || '?'}
              </div>
            )}
          </div>

          <AnimatePresence>
            {isProfileMenuOpen && (
              <Motion.div
                className="profile-menu-panel"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute',
                  top: '55px',
                  right: '0',
                  background: 'rgba(10, 15, 30, 0.95)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(0, 243, 255, 0.3)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
                  padding: '1rem',
                  minWidth: '220px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div className="font-tech" style={{ color: 'var(--text-bright)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>안녕하세요,</span><br/>
                  <strong style={{ color: 'var(--crystal-cyan)', fontSize: '1.1rem' }}>{userData?.studentName || user?.displayName || '탐사원'}</strong>님 👩‍🚀
                </div>
                
                <button 
                  className="space-nav-link font-tech"
                  style={{ textAlign: 'left', padding: '0.8rem', width: '100%', borderRadius: '8px' }}
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    handleNavClick('profile', '/');
                  }}
                >
                  📝 프로필 수정
                </button>

                <button
                  className="space-nav-link font-tech"
                  style={{ textAlign: 'left', padding: '0.8rem', width: '100%', borderRadius: '8px' }}
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    handleNavClick('dashboard', '/');
                  }}
                >
                  📊 LOGS
                </button>

                <button
                  className="space-nav-link font-tech"
                  disabled={isDeletingAccount || userData?.role === 'admin'}
                  style={{
                    textAlign: 'left',
                    padding: '0.8rem',
                    width: '100%',
                    borderRadius: '8px',
                    color: '#ff8a84',
                    opacity: isDeletingAccount || userData?.role === 'admin' ? 0.55 : 1,
                    cursor: isDeletingAccount || userData?.role === 'admin' ? 'not-allowed' : 'pointer'
                  }}
                  onClick={handleDeleteAccount}
                >
                  {isDeletingAccount ? '탈퇴 처리 중...' : '계정 탈퇴'}
                </button>
                
                <button 
                  className="space-nav-link font-tech"
                  style={{ textAlign: 'left', padding: '0.8rem', width: '100%', borderRadius: '8px', color: 'var(--planet-orange)' }}
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    handleLogout();
                  }}
                >
                  출구 (로그아웃)
                </button>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mobile-bottom-nav">
        {mobilePrimaryNav.map(item => (
          <button
            key={item.view}
            type="button"
            className={`mobile-bottom-tab ${currentView === item.view ? 'active' : ''}`}
            onClick={() => handleNavClick(item.view, '/')}
          >
            <span>{item.icon}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
        <button
          type="button"
          className={`mobile-bottom-tab ${isMobileMoreOpen || mobileIsAgoraActive || ['dashboard', 'collection', 'ranking', 'store', 'crew', 'ledger'].includes(currentView) ? 'active' : ''}`}
          onClick={() => { soundManager.playClick(); setIsMobileMoreOpen(prev => !prev); setIsProfileMenuOpen(false); }}
        >
          <span>☰</span>
          <strong>더보기</strong>
        </button>
      </div>

      <AnimatePresence>
        {isMobileMoreOpen && (
          <Motion.div
            className="mobile-more-sheet"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.18 }}
          >
            <div className="mobile-sheet-handle" />
            <div className="mobile-more-grid">
              {mobileMoreNav.map(item => (
                <button
                  key={item.view}
                  type="button"
                  className={currentView === item.view ? 'active' : ''}
                  onClick={() => handleNavClick(item.view, '/')}
                >
                  <span>{item.icon}</span>
                  <strong>{item.label}</strong>
                </button>
              ))}
              <button
                type="button"
                className={mobileIsAgoraActive ? 'active' : ''}
                onClick={() => handleNavClick('agora', '/agora')}
              >
                <span>🏛️</span>
                <strong>스텔라 아고라</strong>
              </button>
              <button type="button" onClick={() => handleNavClick('profile', '/')}>
                <span>👤</span>
                <strong>프로필</strong>
              </button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProfileMenuOpen && (
          <Motion.div
            className="mobile-profile-sheet"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.18 }}
          >
            <div className="mobile-sheet-handle" />
            <div className="mobile-profile-summary">
              <span>안녕하세요,</span>
              <strong>{userData?.studentName || user?.displayName || '탐사원'}님</strong>
            </div>
            <button type="button" onClick={() => handleNavClick('profile', '/')}>프로필 수정</button>
            <button type="button" onClick={() => handleNavClick('dashboard', '/')}>성장 기록</button>
            <button
              type="button"
              className="danger"
              disabled={isDeletingAccount || userData?.role === 'admin'}
              onClick={handleDeleteAccount}
            >
              {isDeletingAccount ? '탈퇴 처리 중...' : '계정 탈퇴'}
            </button>
            <button
              type="button"
              className="logout"
              onClick={() => {
                setIsProfileMenuOpen(false);
                handleLogout();
              }}
            >
              로그아웃
            </button>
          </Motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
