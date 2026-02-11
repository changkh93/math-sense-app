import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import PerformanceToggle from '../PerformanceToggle';
import soundManager from '../../utils/SoundManager';
import NotificationMenu from './NotificationMenu';
import './SpaceNavbar.css';

export default function SpaceNavbar({ currentView, onViewChange }) {
  const navigate = useNavigate();
  const { userData } = useAuth();

  const handleLogout = () => {
    soundManager.playClick();
    signOut(auth);
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
        <button 
          className={`space-nav-link ${currentView === 'planet' ? 'active' : ''}`}
          onClick={() => handleNavClick('planet', '/')}
        >
          🪐 NAV
        </button>
        <button 
          className={`space-nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleNavClick('dashboard', '/')}
        >
          📊 LOGS
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
          className={`space-nav-link agora-nav-btn ${window.location.pathname.startsWith('/agora') ? 'active' : ''}`}
          onClick={() => handleNavClick('agora', '/agora')}
        >
          🏛️ AGORA
        </button>
        <div className="nav-toggle-wrapper">
          <PerformanceToggle />
        </div>
      </div>
      
      <div className="nav-right">
        <NotificationMenu />
        <div className="crystal-counter font-tech">
          <div className="crystal-icon"></div>
          <span>{userData?.crystals || 0} (광석)</span>
        </div>
        <button 
          className="space-nav-link font-tech logout-btn"
          onClick={handleLogout}
        >
          로그아웃
        </button>
      </div>
    </nav>
  );
}
