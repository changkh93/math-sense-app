import React from 'react'
import { motion } from 'framer-motion'
import soundManager from '../../utils/SoundManager'

export default function SpaceStore({ userData }) {
  const skins = [
    { id: 'rainbow_engine', name: '무지개 엔진 불꽃', icon: '🌈', cost: 1000, desc: '엔진 추진력을 무지개 빛으로 변경합니다.' },
    { id: 'stealth_hull', name: '투명 선체', icon: '👻', cost: 2000, desc: '우주선을 반투명하게 만듭니다.' },
  ]

  const themes = [
    { id: 'lava_planet', name: '용암 행성 테마', icon: '🌋', cost: 500, desc: '퀴즈 배경을 뜨거운 용암 행성으로 변경합니다.' },
    { id: 'ice_planet', name: '얼음 행성 테마', icon: '❄️', cost: 500, desc: '퀴즈 배경을 차가운 얼음 행성으로 변경합니다.' },
  ]

  return (
    <div className="fade-in">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--text-bright)', marginBottom: '0.5rem' }}>🎨 커스텀 상점</h2>
        <p style={{ color: 'var(--text-muted)' }}>수집한 광석을 사용하여 우주선과 탐사 환경을 꾸며보세요.</p>
        
        <div style={{
          marginTop: '1.5rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1.5rem',
          background: 'rgba(0, 212, 255, 0.1)',
          borderRadius: '20px',
          border: '1px solid var(--crystal-cyan)'
        }}>
          <div className="crystal-icon" style={{ width: '18px', height: '18px' }}></div>
          <span style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>보유 광석: {userData?.crystals || 0}</span>
        </div>
      </div>

      {/* 우주선 스킨 */}
      <h3 style={{ color: 'var(--text-bright)', marginBottom: '1.5rem' }}>🚀 우주선 커스터마이징</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '4rem'
      }}>
        {skins.map(skin => (
          <div key={skin.id} className="glass-card" style={{ padding: '1.5rem', opacity: 0.8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2.5rem' }}>{skin.icon}</div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-bright)' }}>{skin.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--crystal-cyan)' }}>💰 {skin.cost} 광석</div>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{skin.desc}</p>
            <button 
              className="space-nav-link" 
              style={{ width: '100%', fontSize: '0.8rem', padding: '0.6rem' }}
              onClick={() => {
                soundManager.playClick()
                alert('곧 업데이트될 예정입니다! (Comming Soon)')
              }}
            >
              구매하기
            </button>
          </div>
        ))}
      </div>

      {/* 행성 테마 */}
      <h3 style={{ color: 'var(--text-bright)', marginBottom: '1.5rem' }}>🌍 행성 환경 설정</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem'
      }}>
        {themes.map(theme => (
          <div key={theme.id} className="glass-card" style={{ padding: '1.5rem', opacity: 0.8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2.5rem' }}>{theme.icon}</div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-bright)' }}>{theme.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--crystal-cyan)' }}>💰 {theme.cost} 광석</div>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{theme.desc}</p>
            <button 
              className="space-nav-link" 
              style={{ width: '100%', fontSize: '0.8rem', padding: '0.6rem' }}
              onClick={() => {
                soundManager.playClick()
                alert('곧 업데이트될 예정입니다! (Comming Soon)')
              }}
            >
              구매하기
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
