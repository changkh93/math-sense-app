import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { Phone, Lock, LogIn, Rocket } from 'lucide-react';

const phoneToEmail = (phone) => {
  const digits = phone.replace(/[^0-9]/g, '');
  return `${digits}@parent.mathsense.app`;
};

export default function ParentLogin() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/parent/dashboard');
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length < 10) {
      setError('유효한 전화번호를 입력해 주세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호를 확인해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const email = phoneToEmail(digits);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      
      // Additional check: is the document soft-deleted?
      const { getDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../../firebase');
      const snap = await getDoc(doc(db, 'parents', cred.user.uid));
      
      if (snap.exists() && snap.data().isDeleted) {
        await auth.signOut();
        setError('삭제(비활성화)된 계정입니다. 선생님에게 문의해 주세요.');
        setLoading(false);
        return;
      }

      navigate('/parent/dashboard');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('등록되지 않은 전화번호이거나 비밀번호가 틀렸습니다.');
      } else {
        setError('로그인에 실패했습니다. 다시 시도해 주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1b36 50%, #0d1117 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* Stars background */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            background: 'white',
            borderRadius: '50%',
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.7 + 0.3,
            animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite alternate`
          }} />
        ))}
      </div>

      <style>{`
        @keyframes twinkle {
          0% { opacity: 0.3; }
          100% { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .parent-input:focus {
          border-color: #a55eea !important;
          box-shadow: 0 0 0 3px rgba(165, 94, 234, 0.2) !important;
          outline: none;
        }
      `}</style>

      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '400px',
        background: 'rgba(26, 27, 46, 0.9)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(165, 94, 234, 0.2)',
        padding: '40px 32px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(165, 94, 234, 0.1)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ animation: 'float 3s ease-in-out infinite', marginBottom: '16px' }}>
            <Rocket size={48} color="#a55eea" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', color: 'white', fontWeight: 700 }}>수학감각</h1>
          <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>학부모 학습 현황 조회</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Phone */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>전화번호</label>
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input
                className="parent-input"
                type="tel"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'white',
                  fontSize: '1.05rem',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>비밀번호</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input
                className="parent-input"
                type="password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'white',
                  fontSize: '1.05rem',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(255, 50, 50, 0.1)',
              border: '1px solid rgba(255, 50, 50, 0.3)',
              borderRadius: '10px',
              padding: '12px',
              color: '#ff6b6b',
              fontSize: '0.9rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: loading ? 'rgba(165, 94, 234, 0.4)' : 'linear-gradient(135deg, #a55eea, #8854d0)',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: loading ? 'none' : '0 4px 15px rgba(165, 94, 234, 0.3)'
            }}
          >
            {loading ? '로그인 중...' : <><LogIn size={20} /> 로그인</>}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
          선생님으로부터 안내받은 전화번호와 비밀번호를 입력해 주세요.
        </p>
      </div>
    </div>
  );
}
