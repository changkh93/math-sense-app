import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, setDoc, increment } from 'firebase/firestore';
import { db, auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import '../styles/space-theme.css';

function InviteHandler() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState('loading'); // loading, unauth, invalid, success
  const [clusterInfo, setClusterInfo] = useState(null);

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

        // Unlock cluster access safely using dot notation
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          [`clusterAccess.${clusterDoc.id}`]: 'active'
        }, { merge: true });

        // Increment usage count
        await setDoc(doc(db, 'clusters', clusterDoc.id), {
          usageCount: increment(1)
        }, { merge: true });

        setStatus('success');
      } catch (err) {
        console.error("Invite processing error:", err);
        setStatus('invalid');
      }
    };

    processInvite();
  }, [user, authLoading, inviteCode]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login failed:", err);
      alert('로그인에 실패했습니다.');
    }
  };

  if (status === 'loading' || authLoading) {
    return (
      <div className="space-bg" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--crystal-cyan, cyan)' }}>
        <h2>워프 항로 계산 중...</h2>
      </div>
    );
  }

  if (status === 'unauth') {
    return (
      <div className="space-bg" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '10px' }}>새로운 군집의 접근 코드가 확인되었습니다.</h2>
        <p style={{ color: 'var(--panel-text, #ccc)', marginBottom: '30px' }}>좌표 진입을 위해 인증 절차를 완료해주세요.</p>
        <button className="space-btn" onClick={handleLogin} style={{ padding: '15px 30px', fontSize: '1.2rem' }}>
          신원 정보 확인 (Google 로그인)
        </button>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="space-bg" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#ff4444', textAlign: 'center' }}>
        <h2>유효하지 않거나 만료된 초대 코드입니다.</h2>
        <p style={{ color: 'var(--panel-text, #ccc)', marginBottom: '30px' }}>관리자에게 새로운 코드를 요청하세요.</p>
        <button className="space-btn" onClick={() => navigate('/')}>
          관제 센터로 복귀
        </button>
      </div>
    );
  }

  return (
    <div className="space-bg" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--crystal-cyan, cyan)', textAlign: 'center' }}>
      <h2 style={{ fontSize: '2.5rem', marginBottom: '20px', textShadow: '0 0 15px cyan' }}>
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
