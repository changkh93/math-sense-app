import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithPopup, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, googleProvider, functions } from '../firebase';
import ChildAccountCreator from '../components/Parent/ChildAccountCreator';

export default function Signup() {
  const navigate = useNavigate();
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [step, setStep] = useState('parent');
  const [loading, setLoading] = useState(false);

  const handleParentSignup = async (e) => {
    e.preventDefault();
    if (!termsAccepted) {
      alert('필수 약관에 동의해 주세요.');
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      alert('학부모 전화번호를 확인해 주세요.');
      return;
    }

    setLoading(true);
    let authenticatedForSignup = false;
    try {
      await signInWithPopup(auth, googleProvider);
      authenticatedForSignup = true;
      const registerParent = httpsCallable(functions, 'registerParentProfile');
      await registerParent({ parentName, phone: phoneDigits, termsAccepted });
      setStep('child');
    } catch (err) {
      console.error(err);
      const message = err?.code === 'functions/already-exists'
        ? '이미 등록된 학부모 전화번호입니다. 기존 계정으로 로그인해 주세요.'
        : err?.code === 'functions/failed-precondition'
          ? err.message
        : err?.message || '회원가입에 실패했습니다.';
      alert(message);
      if (authenticatedForSignup && auth.currentUser) {
        await signOut(auth);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 15px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.16)',
    background: 'rgba(255,255,255,0.06)',
    color: 'white',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #08111f, #171436 55%, #0b1020)', color: 'white', fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif', padding: '28px 20px' }}>
      <main style={{ maxWidth: 760, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 34 }}>
          <Link to="/" style={{ color: '#67e8f9', textDecoration: 'none', fontWeight: 900 }}>META SENSE</Link>
          <Link to="/terms" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: 700 }}>약관보기</Link>
        </header>

        <section style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(2.2rem, 6vw, 3.6rem)', letterSpacing: 0 }}>회원가입</h1>
          <p style={{ margin: '0 auto', maxWidth: 560, color: 'rgba(255,255,255,0.62)', lineHeight: 1.65 }}>
            학부모 이름과 전화번호를 입력한 뒤 Google 인증으로 가입하고, 이어서 자녀 학습자 계정을 만들어 줍니다.
          </p>
        </section>

        {step === 'parent' ? (
          <form onSubmit={handleParentSignup} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, padding: 26, display: 'grid', gap: 16, boxShadow: '0 24px 70px rgba(0,0,0,0.28)' }}>
            <div>
              <h2 style={{ margin: '0 0 8px' }}>학부모 계정 생성</h2>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.58)', lineHeight: 1.55 }}>앞으로 회원가입은 학부모 계정으로만 진행됩니다. 비밀번호 없이 Google 인증으로 로그인합니다.</p>
            </div>
            <input style={inputStyle} value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="학부모 이름" required />
            <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="학부모 전화번호" inputMode="tel" required />
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: 'rgba(255,255,255,0.84)', lineHeight: 1.5 }}>
              <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} style={{ marginTop: 4 }} />
              <span><Link to="/terms" style={{ color: '#67e8f9' }}>이용약관 및 개인정보 처리</Link>에 동의합니다. (필수)</span>
            </label>
            <button type="submit" disabled={loading} style={{ border: 'none', borderRadius: 13, padding: '15px 18px', background: loading ? 'rgba(0,212,255,0.35)' : 'linear-gradient(135deg, #00d4ff, #7c3aed)', color: 'white', fontWeight: 900, fontSize: '1.05rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '처리 중...' : 'Google 인증으로 학부모 회원가입'}
            </button>
          </form>
        ) : (
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)', borderRadius: 16, padding: 18, color: '#bbf7d0' }}>
              학부모 회원가입이 완료되었습니다. 이어서 자녀 계정을 만들 수 있습니다.
            </div>
            <ChildAccountCreator onCreated={() => navigate('/parent/dashboard')} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/parent/dashboard')} style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'white', borderRadius: 12, padding: '12px 18px', cursor: 'pointer', fontWeight: 800 }}>
                학부모 대시보드로 이동
              </button>
              <button onClick={() => navigate('/')} style={{ border: 'none', background: '#00d4ff', color: '#05111f', borderRadius: 12, padding: '12px 18px', cursor: 'pointer', fontWeight: 900 }}>
                메인으로 이동
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
