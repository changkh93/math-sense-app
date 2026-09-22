export default function AuthBootstrapScreen() {
  return (
    <div
      className="space-bg space-hud"
      role="status"
      aria-live="polite"
      aria-label="로그인 상태 확인 중"
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--crystal-cyan)',
      }}
    >
      <div
        className="font-tech"
        style={{
          display: 'grid',
          justifyItems: 'center',
          gap: '0.75rem',
          fontSize: 'clamp(1rem, 2.5vw, 1.35rem)',
          fontWeight: 700,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '2rem' }}>🚀</span>
        <span>로그인 상태를 확인하고 있습니다...</span>
      </div>
    </div>
  )
}
