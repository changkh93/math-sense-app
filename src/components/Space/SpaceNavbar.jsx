import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Bell, ExternalLink, MessageCircle, Video } from 'lucide-react';
import { ACCOUNT_DELETION_CALL_TIMEOUT_MS, auth, db, functions } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import soundManager from '../../utils/SoundManager';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import NotificationMenu from './NotificationMenu';
import DirectMemoMenu from './DirectMemoMenu';
import CometBadge from './CometBadge';
import CrewMothership from './CrewMothership';
import CrewGuestTrialModal from './CrewGuestTrialModal';
import { getEffectiveStreak } from '../../utils/streakUtils';
import { getCrewMothershipLevel } from '../../utils/crewMothershipCatalog';
import { resolveProfileImageUrl } from '../../utils/profileImageUtils';
import './SpaceNavbar.css';

const LIVE_SUPPORT_LINKS = [
  {
    label: '화상강의실',
    subtitle: '매일 들어오는 메타센스 화상 수업 공간',
    href: 'https://meet.google.com/bii-rnyp-jbe',
    Icon: Video
  },
  {
    label: 'Q&A방',
    subtitle: '선생님과 일대일로 소통하고 질문하는 공간',
    href: 'https://meet.google.com/qzg-psru-qnc',
    Icon: MessageCircle
  }
];

function useCompactNavbar() {
  const [compact, setCompact] = React.useState(() => (
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  ));

  React.useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return compact;
}

export default function SpaceNavbar({ currentView, onViewChange }) {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = React.useState(false);
  const [isLiveMenuOpen, setIsLiveMenuOpen] = React.useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);
  const [isGuestSignupPromptOpen, setIsGuestSignupPromptOpen] = React.useState(false);
  const [isBrandImageFailed, setIsBrandImageFailed] = React.useState(false);
  const [isProfileImageFailed, setIsProfileImageFailed] = React.useState(false);
  const [crewNavData, setCrewNavData] = React.useState(null);
  const isCompactNavbar = useCompactNavbar();

  React.useEffect(() => {
    setIsProfileImageFailed(false);
  }, [user?.photoURL, userData?.photoURL, userData?.profileImageUrl, userData?.avatarUrl]);

  React.useEffect(() => {
    if (!isLiveMenuOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsLiveMenuOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLiveMenuOpen]);

  React.useEffect(() => {
    if (!isCompactNavbar) {
      setIsMobileMoreOpen(false);
      return undefined;
    }
    if (!isMobileMoreOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsMobileMoreOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCompactNavbar, isMobileMoreOpen]);

  const isGuest = userData?.isGuest === true;

  React.useEffect(() => {
    const crewId = String(userData?.crewId || '').trim();
    setCrewNavData(null);
    if (!crewId) return undefined;
    return onSnapshot(doc(db, 'crews', crewId), (snapshot) => {
      setCrewNavData(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    }, (error) => {
      console.warn('Crew mothership nav sync failed:', error);
    });
  }, [userData?.crewId]);

  const navCrew = crewNavData || (userData?.crewId ? {
    id: userData.crewId,
    name: userData.crewName || '스터디 크루',
    color: userData.crewColor || '#36d9ff',
    memberCount: Number(userData.crewMemberCount || 1),
    leaderId: userData.crewRole === 'leader' ? user?.uid : '',
  } : null);
  const navMothershipLevel = navCrew ? getCrewMothershipLevel(navCrew) : null;

  const openGuestSignupPrompt = () => {
    soundManager.playClick();
    setIsMobileMoreOpen(false);
    setIsProfileMenuOpen(false);
    setIsLiveMenuOpen(false);
    setIsGuestSignupPromptOpen(true);
  };

  const handleLogout = async () => {
    soundManager.playClick();
    if (isGuest && userData?.crewId) {
      try {
        const leaveGuestSession = httpsCallable(functions, 'leaveCrewGuestSession');
        await leaveGuestSession({ crewId: userData.crewId });
      } catch (error) {
        console.warn('Failed to close guest presence before logout:', error);
      }
      window.sessionStorage.removeItem('crewGuestSession');
      window.sessionStorage.removeItem('metasense_current_view');
    }
    try {
      await signOut(auth);
    } finally {
      navigate('/');
    }
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
      const deleteAccount = httpsCallable(functions, 'deleteCurrentUserAccount', {
        timeout: ACCOUNT_DELETION_CALL_TIMEOUT_MS
      });
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
    if (isGuest && view !== 'planet' && view !== 'crew' && view !== 'battle') {
      openGuestSignupPrompt();
      return;
    }
    soundManager.playClick();
    setIsMobileMoreOpen(false);
    setIsProfileMenuOpen(false);
    setIsLiveMenuOpen(false);
    const isHome = window.location.pathname === '/';
    
    if (path === '/agora') {
      navigate('/agora');
    } else if (!isHome) {
      // Keep the requested root view in both the URL and route state. SpaceHome
      // can then select it on its very first render instead of flashing NAV.
      navigate(`/?view=${encodeURIComponent(view)}`, { state: { view } });
    } else {
      // Already on home page, just change view
      if (onViewChange) onViewChange(view);
    }
  };

  const handlePublicProfileClick = () => {
    if (isGuest) {
      openGuestSignupPrompt();
      return;
    }
    if (!user?.uid) return;
    soundManager.playClick();
    setIsMobileMoreOpen(false);
    setIsProfileMenuOpen(false);
    setIsLiveMenuOpen(false);
    navigate(`/profile/${user.uid}`);
  };

  const handleBrandClick = () => {
    if (isGuest) {
      handleNavClick('planet', '/');
      return;
    }
    soundManager.playClick();
    setIsMobileMoreOpen(false);
    setIsProfileMenuOpen(false);
    setIsLiveMenuOpen(true);
  };

  const handleLiveLinkClick = () => {
    soundManager.playClick();
    setIsLiveMenuOpen(false);
  };

  const mobilePrimaryNav = [
    { view: 'planet', label: '학습', icon: '🪐' },
    { view: 'battle', label: '배틀', icon: '⚔️' },
    { view: 'crew', label: navCrew ? '크루 모함' : '스터디크루', icon: '🛰️' },
    { view: 'agora', label: '아고라', icon: '🏛️', path: '/agora' }
  ];

  const mobileMoreNav = [
    { view: 'assignment_hub', label: '과제', icon: '🛰️' },
    { view: 'ranking', label: '랭킹', icon: '🏅' },
    { view: 'store', label: '스토어', icon: '🎨' },
    { view: 'mistake_notebook', label: '오답', icon: '🧠' },
    { view: 'dashboard', label: 'LOGS', icon: '📊' }
  ];

  const effectivePrimaryNav = mobilePrimaryNav;
  const effectiveMoreNav = mobileMoreNav;
  const getGuestNavState = (view) => {
    if (!isGuest) return '';
    return view === 'planet' || view === 'crew' || view === 'battle' ? 'guest-available' : 'guest-locked';
  };

  const mobileIsAgoraActive = window.location.pathname.startsWith('/agora');
  const isUserDataReady = Boolean(userData && !userData.dataLoadError && !userData.recoveryRequired);
  const effectiveStreak = isUserDataReady ? getEffectiveStreak(userData) : 0;
  const crystalCount = isUserDataReady ? (userData?.crystals || 0) : null;
  const profileDisplayName = userData?.publicDisplayName
    || userData?.studentName
    || userData?.name
    || userData?.displayName
    || user?.displayName
    || user?.email?.split('@')?.[0]
    || '탐사원';
  const profileInitial = Array.from(String(profileDisplayName).trim())[0] || '?';
  const profilePhotoUrl = resolveProfileImageUrl(userData, user?.photoURL);
  const shouldShowProfilePhoto = Boolean(profilePhotoUrl) && !isProfileImageFailed;

  const handleToggleMobileMore = () => {
    soundManager.playClick();
    setIsMobileMoreOpen(prev => !prev);
    setIsProfileMenuOpen(false);
  };

  const handleProfileMenuToggle = () => {
    if (isGuest) {
      openGuestSignupPrompt();
      return;
    }
    soundManager.playClick();
    setIsProfileMenuOpen((open) => !open);
    setIsMobileMoreOpen(false);
  };

  return (
    <>
    <nav className="space-nav hud-border">
      <div className="mobile-nav-top">
        <button
          type="button"
          className="mobile-brand-btn"
          onClick={handleBrandClick}
          aria-label={isGuest ? 'NAV로 이동' : '메타센스 실시간 수업 메뉴 열기'}
        >
          {!isBrandImageFailed ? (
            <img src="/m-logo.svg" alt="" onError={() => setIsBrandImageFailed(true)} />
          ) : (
            <span className="mobile-brand-fallback">M</span>
          )}
        </button>
        <div className="mobile-nav-actions">
          {isGuest ? (
            <>
              <button type="button" className="mobile-guest-locked-action" onClick={openGuestSignupPrompt} aria-label="쪽지, 회원가입 필요">
                <MessageCircle size={18} />
              </button>
              <button type="button" className="mobile-guest-locked-action" onClick={openGuestSignupPrompt} aria-label="알림, 회원가입 필요">
                <Bell size={18} />
              </button>
            </>
          ) : isCompactNavbar ? (
            <>
              <DirectMemoMenu />
              <NotificationMenu />
            </>
          ) : null}
          <button
            type="button"
            className={`mobile-streak-btn ${getGuestNavState('journey')} ${currentView === 'journey' ? 'active' : ''}`}
            onClick={() => handleNavClick('journey', '/')}
            aria-label={isUserDataReady ? `연속 학습 ${effectiveStreak}일` : '연속 학습 동기화 중'}
          >
            {isUserDataReady ? <CometBadge streak={effectiveStreak} compact showTooltip={false} /> : <span className="mobile-sync-dots">…</span>}
          </button>
          <button
            type="button"
            className={`mobile-crystal-btn ${getGuestNavState('ledger')} ${currentView === 'ledger' ? 'active' : ''}`}
            onClick={() => handleNavClick('ledger', '/')}
            aria-label={isUserDataReady ? `광석 ${crystalCount}개` : '광석 동기화 중'}
          >
            <span className="mobile-crystal-icon" />
            <strong>{isUserDataReady ? crystalCount : '…'}</strong>
          </button>
          <button
            type="button"
            className={`mobile-profile-btn ${getGuestNavState('profile')} ${isProfileMenuOpen ? 'active' : ''}`}
            onClick={handleProfileMenuToggle}
            aria-label={isGuest ? '프로필, 회원가입 필요' : '프로필 메뉴 열기'}
          >
            <span className="mobile-profile-initial" aria-hidden="true">{profileInitial}</span>
            {shouldShowProfilePhoto ? (
              <img
                src={profilePhotoUrl}
                alt=""
                onError={() => setIsProfileImageFailed(true)}
                onLoad={(event) => {
                  if (!event.currentTarget.naturalWidth) setIsProfileImageFailed(true);
                }}
              />
            ) : null}
          </button>
        </div>
      </div>

      <div className="space-nav-links desktop-nav-links font-title">
        <button
          type="button"
          className="desktop-brand-btn"
          onClick={handleBrandClick}
          aria-label={isGuest ? 'NAV로 이동' : '메타센스 실시간 수업 메뉴 열기'}
        >
          <img src="/m-logo.svg" alt="" />
        </button>
        <button
          className={`space-nav-link ${getGuestNavState('planet')} ${currentView === 'planet' ? 'active' : ''}`}
          onClick={() => handleNavClick('planet', '/')}
        >
          🪐 NAV
        </button>
        <button
          className={`space-nav-link ${getGuestNavState('battle')} ${currentView === 'battle' ? 'active' : ''}`}
          onClick={() => handleNavClick('battle', '/')}
        >
          ⚔️ BATTLE
        </button>
        <button
          className={`space-nav-link ${getGuestNavState('mistake_notebook')} ${currentView === 'mistake_notebook' ? 'active' : ''}`}
          onClick={() => handleNavClick('mistake_notebook', '/')}
        >
          🧠 NOTE
        </button>
        <button
          className={`space-nav-link ${getGuestNavState('ranking')} ${currentView === 'ranking' ? 'active' : ''}`}
          onClick={() => handleNavClick('ranking', '/')}
        >
          🏆 RANKING
        </button>
        <button
          className={`space-nav-link ${getGuestNavState('store')} ${currentView === 'store' ? 'active' : ''}`}
          onClick={() => handleNavClick('store', '/')}
        >
          🎨 STORE
        </button>
        <button
          className={`space-nav-link crew-nav-link ${getGuestNavState('crew')} ${currentView === 'crew' ? 'active' : ''}`}
          onClick={() => handleNavClick('crew', '/')}
          title={navCrew ? `${navCrew.name} · ${navMothershipLevel.name}` : '스터디 크루 찾기'}
        >
          {navCrew ? (
            <>
              <span className="crew-nav-visual" aria-hidden="true"><CrewMothership crew={navCrew} variant="nav" /></span>
              <span className="crew-nav-copy"><strong>{navCrew.name || 'CREW'}</strong><small>모함 Lv.{navMothershipLevel.level}</small></span>
            </>
          ) : <>🛰️ STUDY CREW</>}
        </button>
        <button
          className={`space-nav-link agora-nav-btn ${getGuestNavState('agora')} ${window.location.pathname.startsWith('/agora') ? 'active' : ''}`}
          onClick={() => handleNavClick('agora', '/agora')}
        >
          🏛️ STELLAR AGORA
        </button>
      </div>
      
      <div className="nav-right desktop-nav-right">
        {!isGuest && !isCompactNavbar && <DirectMemoMenu />}
        {!isGuest && !isCompactNavbar && <NotificationMenu />}
        {!isGuest && (
          <div
            onClick={() => handleNavClick('journey', '/')}
            style={{ cursor: 'pointer', display: 'flex' }}
            title="별자리 항해 기록 보기"
          >
            {isUserDataReady ? <CometBadge streak={effectiveStreak} /> : <span className="desktop-sync-dots">…</span>}
          </div>
        )}
        {!isGuest && (
          <div
            className={`crystal-counter font-tech ${currentView === 'ledger' ? 'ledger-open' : ''}`}
            onClick={() => handleNavClick('ledger', '/')}
            style={{ cursor: 'pointer' }}
            title="광석 입출금 내역 보기"
          >
            <div className="crystal-icon"></div>
            <span>{isUserDataReady ? `${crystalCount} (광석)` : '동기화 중'}</span>
          </div>
        )}

        {/* Profile Menu relative container */}
        <div className="profile-menu-anchor" style={{ position: 'relative' }}>
          <div 
            onClick={handleProfileMenuToggle}
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
            {shouldShowProfilePhoto ? (
              <img
                src={profilePhotoUrl}
                alt=""
                onError={() => setIsProfileImageFailed(true)}
                onLoad={(event) => {
                  if (!event.currentTarget.naturalWidth) setIsProfileImageFailed(true);
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--crystal-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
                {profileInitial}
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
                  <button
                    type="button"
                    className="profile-menu-name-link"
                    onClick={handlePublicProfileClick}
                    title="나의 탐험기지 보기"
                  >
                    {profileDisplayName}
                  </button>
                  님 👩‍🚀
                </div>

                <button
                  className="space-nav-link font-tech profile-menu-primary-action"
                  style={{ textAlign: 'left', padding: '0.8rem', width: '100%', borderRadius: '8px' }}
                  onClick={handlePublicProfileClick}
                >
                  🚀 나의 탐험기지 보기
                </button>
                
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
    </nav>

      {isGuestSignupPromptOpen && <CrewGuestTrialModal onClose={() => setIsGuestSignupPromptOpen(false)} />}

      <AnimatePresence>
        {isLiveMenuOpen && !isGuest && (
          <Motion.div
            className="live-menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setIsLiveMenuOpen(false)}
          >
            <Motion.div
              className="live-menu-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="live-menu-title"
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="live-menu-head">
                <div>
                  <span>METASENSE LIVE</span>
                  <strong id="live-menu-title">실시간 수업 링크</strong>
                </div>
                <button
                  type="button"
                  className="live-menu-close"
                  onClick={() => setIsLiveMenuOpen(false)}
                  aria-label="실시간 수업 메뉴 닫기"
                >
                  ×
                </button>
              </div>
              <div className="live-menu-links">
                {LIVE_SUPPORT_LINKS.map(({ label, subtitle, href, Icon }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleLiveLinkClick}
                    className="live-menu-link"
                  >
                    <span className="live-menu-link-icon" aria-hidden="true">
                      {React.createElement(Icon, { size: 20 })}
                    </span>
                    <span className="live-menu-link-copy">
                      <strong>{label}</strong>
                      <small>{subtitle}</small>
                    </span>
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      <div className="mobile-bottom-nav">
        {effectivePrimaryNav.map(item => (
          <button
            key={item.view}
            type="button"
            className={`mobile-bottom-tab ${getGuestNavState(item.view)} ${(item.view === 'agora' ? mobileIsAgoraActive : currentView === item.view) ? 'active' : ''}`}
            aria-label={isGuest && getGuestNavState(item.view) === 'guest-locked' ? `${item.label}, 회원가입 필요` : item.label}
            onClick={() => handleNavClick(item.view, item.path || '/')}
          >
            {item.view === 'crew' && navCrew
              ? <CrewMothership crew={navCrew} variant="nav" />
              : <span>{item.icon}</span>}
            <strong>{item.label}</strong>
          </button>
        ))}
        <button
          type="button"
          className={`mobile-bottom-tab ${isMobileMoreOpen || ['dashboard', 'ranking', 'store', 'mistake_notebook'].includes(currentView) ? 'active' : ''}`}
          onClick={handleToggleMobileMore}
        >
          <span>☰</span>
          <strong>더보기</strong>
        </button>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isMobileMoreOpen && (
            <Motion.div
              className="mobile-more-backdrop"
              data-overlay="mobile-more-menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, pointerEvents: 'auto' }}
              exit={{ opacity: 0, pointerEvents: 'none' }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsMobileMoreOpen(false)}
            >
              <Motion.div
                className="mobile-more-sheet"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 18, pointerEvents: 'none' }}
                transition={{ duration: 0.18 }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mobile-sheet-handle" />
                <div className="mobile-sheet-title">
                  <span>MISSION MENU</span>
                  <button type="button" onClick={() => setIsMobileMoreOpen(false)} aria-label="더보기 닫기">✕</button>
                </div>
                <div className="mobile-more-grid">
                  {effectiveMoreNav.map(item => (
                    <button
                      key={item.view}
                      type="button"
                      className={`${getGuestNavState(item.view)} ${currentView === item.view ? 'active' : ''}`}
                      aria-label={isGuest && getGuestNavState(item.view) === 'guest-locked' ? `${item.label}, 회원가입 필요` : item.label}
                      onClick={() => handleNavClick(item.view, '/')}
                    >
                      <span>{item.icon}</span>
                      <strong>{item.label}</strong>
                    </button>
                  ))}
                  <button type="button" onClick={() => handleNavClick('profile', '/')}>
                    <span>👤</span>
                    <strong>프로필 편집</strong>
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={isDeletingAccount || userData?.role === 'admin'}
                    onClick={() => {
                      setIsMobileMoreOpen(false);
                      handleDeleteAccount();
                    }}
                  >
                    <span>⚠️</span>
                    <strong>{isDeletingAccount ? '탈퇴 처리 중' : '계정탈퇴'}</strong>
                  </button>
                  <button
                    type="button"
                    className="logout"
                    onClick={() => {
                      setIsMobileMoreOpen(false);
                      handleLogout();
                    }}
                  >
                    <span>🚪</span>
                    <strong>로그아웃</strong>
                  </button>
                </div>
              </Motion.div>
            </Motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <AnimatePresence>
        {isProfileMenuOpen && (
          <Motion.div
            className="mobile-profile-sheet"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
          >
            <div className="mobile-sheet-handle" />
            <div className="mobile-profile-summary">
              <span>안녕하세요,</span>
              <button type="button" className="mobile-profile-name-link" onClick={handlePublicProfileClick}>
                {profileDisplayName}님
              </button>
            </div>
            <button type="button" className="mobile-profile-primary-action" onClick={handlePublicProfileClick}>나의 탐험기지 보기</button>
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
    </>
  );
}
