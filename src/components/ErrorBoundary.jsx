import React from 'react';

// A deployment can replace Vite's hashed lazy-load chunks while a student still
// has the previous app shell open. Firebase then returns the SPA HTML fallback
// for the missing chunk, which the browser reports as a failed module import.
const isStaleChunkError = (error) => {
  const message = String(error?.message || error || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [^ ]+ failed/i.test(message);
};

const staleChunkKey = (error) => {
  const url = String(error?.message || error || '').match(/https?:\/\/\S+\.js\b/i)?.[0];
  return `msense:stale-chunk-reload:${url || window.location.pathname}`;
};

// 같은 오류로 즉시 무한 새로고침하지 않되, 개발 중 Vite가 다시 의존성을
// 최적화하거나 이후 배포가 발생했을 때는 같은 lazy 모듈도 다시 복구할 수 있어야 한다.
const STALE_CHUNK_RELOAD_COOLDOWN_MS = 15_000;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[CRITICAL] App Crash caught by ErrorBoundary:", error, errorInfo);

    // Reload once per cooldown window. A permanent session flag prevented a
    // later Vite "Outdated Optimize Dep" for the same lazy module from healing.
    if (isStaleChunkError(error)) {
      const key = staleChunkKey(error);
      const lastReloadAt = Number(sessionStorage.getItem(key) || 0);
      if (!Number.isFinite(lastReloadAt) || Date.now() - lastReloadAt > STALE_CHUNK_RELOAD_COOLDOWN_MS) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-bg" style={{ 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div className="glass-card hud-border" style={{ padding: '2.5rem', maxWidth: '500px' }}>
            <h1 className="font-title" style={{ color: '#ff4d4d', fontSize: '2rem', marginBottom: '1rem' }}>
              🚀 통신 두절 (ERROR)
            </h1>
            <p className="font-tech" style={{ marginBottom: '2rem', lineHeight: '1.6', opacity: 0.8 }}>
              시스템에 예기치 못한 오류가 발생하여 탐사가 중단되었습니다.<br/>
              (데이터 로딩 중 문제가 발생했을 수 있습니다)
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={() => window.location.reload()}
                className="hud-btn primary glass"
                style={{
                  padding: '0.8rem 1.5rem',
                  background: 'rgba(0, 243, 255, 0.2)',
                  border: '1px solid var(--neon-blue)',
                  color: 'white',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                시스템 재시작 (RELOAD)
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="hud-btn secondary glass"
                style={{
                  padding: '0.8rem 1.5rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                홈으로 이동
              </button>
            </div>
            {import.meta.env.DEV && (
              <pre style={{ 
                marginTop: '2rem', 
                padding: '1rem', 
                background: 'rgba(0,0,0,0.5)', 
                fontSize: '0.7rem', 
                textAlign: 'left',
                overflow: 'auto',
                maxHeight: '150px'
              }}>
                {this.state.error?.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
