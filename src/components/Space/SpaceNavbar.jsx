import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
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

  const handleLogout = async () => {
    soundManager.playClick();
    await signOut(auth);
    navigate('/');
  };

  const handleNavClick = (view, path) => {
    soundManager.playClick();
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

  return (
    <nav className="space-nav hud-border">
      <div className="space-nav-links font-title">
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
      
      <div className="nav-right">
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
        <div style={{ position: 'relative' }}>
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
  );
}
