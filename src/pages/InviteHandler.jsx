import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, getDoc, doc, setDoc, increment } from 'firebase/firestore';
import { db, auth, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import StarField from '../components/Space/StarField';
import '../styles/space-theme.css';

const navItems = [
  ['무료체험', '/trial'],
  ['전화상담', '/consultation'],
  ['회원가입', '/signup']
];

const isActiveMemberData = (data = {}) => (
  data?.isDeleted !== true &&
  data?.accountStatus !== 'deleted' &&
  !data?.deletedAt
);

function InviteHandler() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState('loading'); // loading, unauth, invalid, wrongAccount, success
  const [clusterInfo, setClusterInfo] = useState(null);
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setStatus('unauth');
      return;
    }

    const processInvite = async () => {
      try {
        setStatus('loading');
        const q = query(collection(db, 'clusters'), where('inviteCode', '==', inviteCode));
        const snap = await getDocs(q);

        if (snap.empty) {
          setStatus('invalid');
          return;
        }

        const clusterDoc = snap.docs[0];
        const clusterData = clusterDoc.data();

        // Check expiration
        if (clusterData.expiresAt && new Date(clusterData.expiresAt.toDate()) < new Date()) {
          setStatus('invalid');
          return;
        }

        setClusterInfo(clusterData);

        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists() || !isActiveMemberData(userSnap.data())) {
          await signOut(auth);
          setStatus('wrongAccount');
          return;
        }

        // Unlock cluster access safely using updateDoc for nested fields
        try {
          // Use updateDoc for reliable nested field updates
          await setDoc(userDocRef, {
            clusterAccess: { [clusterDoc.id]: 'active' }
          }, { merge: true });
        } catch (err) {
          console.warn("User doc update failed, trying setDoc without merge fallback", err);
          await setDoc(userDocRef, { clusterAccess: { [clusterDoc.id]: 'active' } }, { merge: true });
        }

        // Increment usage count (optional - don't fail if this fails)
        try {
          await setDoc(doc(db, 'clusters', clusterDoc.id), {
            usageCount: increment(1)
          }, { merge: true });
        } catch (err) {
          console.warn("Usage count increment failed (permission?), continuing...", err);
        }

        setStatus('success');
      } catch (err) {
        console.error("Invite processing error:", err);
        setStatus('invalid');
      }
    };

    processInvite();
  }, [user, authLoading, inviteCode]);

  const handleGoogleLogin = async () => {
    setLoginError('');
    setLoginLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login failed:", err);
      setLoginError(err.code === 'auth/popup-blocked'
        ? '팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해 주세요.'
        : 'Google 로그인에 실패했습니다.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleCredentialLogin = async (e) => {
    e.preventDefault();
    const rawId = loginId.trim();
    const digits = rawId.replace(/[^0-9]/g, '');
    if (!rawId || loginPassword.length < 6) {
      setLoginError('아이디와 비밀번호를 확인해 주세요.');
      return;
    }

    setLoginError('');
    setLoginLoading(true);
    try {
      const normalizedId = rawId.toLowerCase();
      const email = normalizedId.includes('@')
        ? normalizedId
        : digits.length >= 10 && digits.length === rawId.replace(/\D/g, '').length
          ? `${digits}@parent.mathsense.app`
          : `${normalizedId}@student.mathsense.app`;
      await signInWithEmailAndPassword(auth, email, loginPassword);
    } catch (err) {
      console.error('Credential login failed:', err);
      setLoginError('아이디 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoginLoading(false);
    }
  };

  const renderInviteShell = (children) => (
    <div className="space-bg" style={{ minHeight: '100dvh', position: 'relative', overflow: 'hidden', color: 'white' }}>
      <StarField count={160} />
      <div className="nebula-bg" />
      <div
        style={{
          position: 'absolute',
          top: 18,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 140,
          width: 'min(1120px, calc(100% - 28px))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          pointerEvents: 'auto'
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          className="font-title"
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--crystal-cyan)',
            fontWeight: 900,
            cursor: 'pointer',
            textShadow: '0 0 12px rgba(0,212,255,0.6)'
          }}
        >
          META SENSE
        </button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {navItems.map(([label, path]) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className="font-tech"
              style={{
                border: '1px solid rgba(255,255,255,0.16)',
                background: path === '/trial' ? 'rgba(34,197,94,0.20)' : 'rgba(255,255,255,0.08)',
                color: 'white',
                borderRadius: 999,
                padding: '0.62rem 0.95rem',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '0.95rem',
                backdropFilter: 'blur(10px)'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <main style={{ position: 'relative', zIndex: 20, minHeight: '100dvh' }}>
        {children}
      </main>
    </div>
  );

  const renderLoginPanel = () => (
    <form
      onSubmit={handleCredentialLogin}
      className="hud-border"
      style={{
        width: 'min(100%, 420px)',
        display: 'grid',
        gap: 12,
        padding: '1rem',
        borderRadius: 16,
        background: 'rgba(5, 10, 25, 0.82)',
        backdropFilter: 'blur(14px)',
        boxShadow: '0 0 26px rgba(0, 212, 255, 0.16)'
      }}
    >
      <div className="font-title" style={{ color: 'var(--text-bright)', fontSize: '1rem', textAlign: 'left' }}>
        ACCESS CREDENTIALS
      </div>
      <input
        value={loginId}
        onChange={(e) => setLoginId(e.target.value)}
        placeholder="아이디 또는 전화번호"
        autoComplete="username"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: '1px solid rgba(0, 212, 255, 0.28)',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.08)',
          color: 'white',
          padding: '0.78rem 0.9rem',
          fontSize: '1rem',
          outline: 'none'
        }}
      />
      <input
        type="password"
        value={loginPassword}
        onChange={(e) => setLoginPassword(e.target.value)}
        placeholder="비밀번호"
        autoComplete="current-password"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: '1px solid rgba(0, 212, 255, 0.28)',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.08)',
          color: 'white',
          padding: '0.78rem 0.9rem',
          fontSize: '1rem',
          outline: 'none'
        }}
      />
      {loginError && (
        <div className="font-tech" style={{
          color: '#ff8a84',
          border: '1px solid rgba(255, 138, 132, 0.25)',
          background: 'rgba(255, 88, 82, 0.08)',
          borderRadius: 10,
          padding: '0.72rem 0.85rem',
          textAlign: 'left'
        }}>
          {loginError}
        </div>
      )}
      <button
        type="submit"
        disabled={loginLoading}
        className="font-tech"
        style={{
          border: 'none',
          borderRadius: 10,
          background: loginLoading ? 'rgba(0,212,255,0.35)' : 'var(--crystal-cyan)',
          color: '#04111f',
          padding: '0.82rem 1rem',
          fontWeight: 900,
          cursor: loginLoading ? 'not-allowed' : 'pointer',
          fontSize: '1rem'
        }}
      >
        {loginLoading ? '접속 중...' : '로그인'}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.38)', fontSize: '0.8rem' }}>
        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
        <span className="font-tech">OR</span>
        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
      </div>
      <button
        type="button"
        disabled={loginLoading}
        onClick={handleGoogleLogin}
        className="font-tech"
        style={{
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.08)',
          color: 'white',
          padding: '0.8rem 1rem',
          fontWeight: 800,
          cursor: loginLoading ? 'not-allowed' : 'pointer',
          fontSize: '0.98rem'
        }}
      >
        Google 계정 로그인
      </button>
    </form>
  );

  if (status === 'loading' || authLoading) {
    return renderInviteShell(
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', color: 'var(--crystal-cyan, cyan)' }}>
        <h2>워프 항로 계산 중...</h2>
      </div>
    );
  }

  if (status === 'unauth' || status === 'wrongAccount') {
    return renderInviteShell(
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        padding: '110px 20px 40px',
        textAlign: 'center'
      }}>
        <div>
          <h2 style={{ margin: '0 0 10px', fontSize: 'clamp(1.6rem, 4vw, 2.35rem)' }}>새로운 군집의 접근 코드가 확인되었습니다.</h2>
          <p style={{ color: 'var(--panel-text, #ccc)', margin: 0, lineHeight: 1.6 }}>
            {status === 'wrongAccount'
              ? '이 초대 링크는 수강생 계정으로 접속해야 합니다. 학생 아이디와 비밀번호로 다시 로그인해 주세요.'
              : '좌표 진입을 위해 수강생 계정으로 로그인해 주세요.'}
          </p>
        </div>
        <button
          type="button"
          className="glass-card font-title"
          style={{
            padding: '0.95rem 2.6rem',
            fontSize: '1.08rem',
            color: 'var(--text-bright)',
            border: '2px solid var(--crystal-cyan)',
            background: 'rgba(0, 212, 255, 0.15)',
            boxShadow: '0 0 15px rgba(0, 212, 255, 0.2)',
            whiteSpace: 'nowrap'
          }}
        >
          시스템 접속 (LOGIN)
        </button>
        {renderLoginPanel()}
      </div>
    );
  }

  if (status === 'invalid') {
    return renderInviteShell(
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', color: '#ff8a84', textAlign: 'center', padding: '110px 20px 40px' }}>
        <h2>유효하지 않거나 만료된 초대 코드입니다.</h2>
        <p style={{ color: 'var(--panel-text, #ccc)', marginBottom: '30px' }}>관리자에게 새로운 코드를 요청하세요.</p>
        <button className="space-btn" onClick={() => navigate('/')}>
          관제 센터로 복귀
        </button>
      </div>
    );
  }

  return renderInviteShell(
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', color: 'var(--crystal-cyan, cyan)', textAlign: 'center', padding: '110px 20px 40px' }}>
      <h2 style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', marginBottom: '20px', textShadow: '0 0 15px cyan' }}>
        [{clusterInfo?.name}] 군집 입장 권한 획득!
      </h2>
      <p style={{ color: 'var(--panel-text, #ccc)', fontSize: '1.2rem', marginBottom: '40px' }}>새로운 항로가 항법 장치에 추가되었습니다.</p>
      <button className="space-btn cosmic-btn" onClick={() => navigate('/')} style={{ fontSize: '1.2rem', padding: '15px 40px' }}>
        새로운 구역 탐사 시작
      </button>
    </div>
  );
}

export default InviteHandler;
