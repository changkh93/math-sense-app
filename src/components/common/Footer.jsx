import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer style={{
      background: 'rgba(5, 5, 16, 0.95)',
      color: '#64748b',
      padding: '3rem 2rem',
      borderTop: '1px solid rgba(0, 243, 255, 0.1)',
      fontFamily: '"Rajdhani", sans-serif',
      position: 'relative',
      zIndex: 10
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          marginBottom: '0.5rem'
        }}>
          <strong style={{ 
            color: '#ffffff', 
            fontSize: '1.2rem', 
            letterSpacing: '2px',
            background: 'linear-gradient(135deg, #00f3ff 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>MSense</strong>
          <Link to="/privacy" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>개인정보처리방침</Link>
          <span style={{ color: '#1e293b' }}>|</span>
          <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>이용약관</span>
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0.8rem 1.5rem',
          fontSize: '0.85rem',
          lineHeight: '1.5'
        }}>
          <span>사업자등록번호: 891-91-00078</span>
          <span style={{ color: '#1e293b' }}>|</span>
          <span>대표자: 장기홍</span>
          <span style={{ color: '#1e293b' }}>|</span>
          <span>주소: 인천시 중구 송산로 9</span>
          <span style={{ color: '#1e293b' }}>|</span>
          <span>전화: 010-6285-4382</span>
          <span style={{ color: '#1e293b' }}>|</span>
          <span>이메일: <a href="mailto:paul@dulcine.net" style={{ color: '#64748b', textDecoration: 'none' }}>paul@dulcine.net</a></span>
        </div>

        <p style={{
          fontSize: '0.75rem',
          color: '#334155',
          marginTop: '1rem',
          letterSpacing: '1px'
        }}>
          © 2026 MSense. All missions accomplished.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
