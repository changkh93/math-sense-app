import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import soundManager from '../../utils/SoundManager'
import { recordCrystalTransaction } from '../../utils/crystalLedger'

export default function SpaceStore({ userData, user }) {
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseMessage, setPurchaseMessage] = useState(null)

  const protections = [
    { 
      id: 'cryo_core', 
      name: '크라이오 코어', 
      icon: '🧊', 
      cost: 100, 
      maxOwn: 3,
      desc: '하루 학습을 빠뜨려도 연속 항해 기록이 유지됩니다.',
      currentOwned: userData?.streakFreezeCount || 0
    },
  ]

  const skins = [
    { id: 'rainbow_engine', name: '무지개 엔진 불꽃', icon: '🌈', cost: 1000, desc: '엔진 추진력을 무지개 빛으로 변경합니다.' },
    { id: 'stealth_hull', name: '투명 선체', icon: '👻', cost: 2000, desc: '우주선을 반투명하게 만듭니다.' },
  ]

  const themes = [
    { id: 'lava_planet', name: '용암 행성 테마', icon: '🌋', cost: 500, desc: '퀴즈 배경을 뜨거운 용암 행성으로 변경합니다.' },
    { id: 'ice_planet', name: '얼음 행성 테마', icon: '❄️', cost: 500, desc: '퀴즈 배경을 차가운 얼음 행성으로 변경합니다.' },
  ]

  const handlePurchaseCryoCore = async () => {
    if (purchasing || !user) return
    
    const currentCrystals = userData?.crystals || 0
    const currentFreezeCount = userData?.streakFreezeCount || 0
    
    if (currentCrystals < 100) {
      setPurchaseMessage({ type: 'error', text: '광석이 부족합니다. (필요: 100개)' })
      setTimeout(() => setPurchaseMessage(null), 3000)
      return
    }
    if (currentFreezeCount >= 3) {
      setPurchaseMessage({ type: 'error', text: '크라이오 코어는 최대 3개까지 보유할 수 있습니다.' })
      setTimeout(() => setPurchaseMessage(null), 3000)
      return
    }

    setPurchasing(true)
    try {
      await setDoc(doc(db, 'users', user.uid), {
        crystals: currentCrystals - 100,
        streakFreezeCount: currentFreezeCount + 1,
      }, { merge: true })
      
      soundManager.playCrystal()
      setPurchaseMessage({ type: 'success', text: `크라이오 코어 구매 완료! (보유: ${currentFreezeCount + 1}/3)` })
      setTimeout(() => setPurchaseMessage(null), 3000)

      // Record crystal transaction for ledger
      recordCrystalTransaction(user.uid, {
        amount: -100,
        type: 'store_purchase',
        description: '크라이오 코어 구매',
        metadata: { itemId: 'cryo_core' }
      })
    } catch (err) {
      console.error('Purchase failed:', err)
      setPurchaseMessage({ type: 'error', text: '구매에 실패했습니다. 다시 시도해주세요.' })
      setTimeout(() => setPurchaseMessage(null), 3000)
    } finally {
      setPurchasing(false)
    }
  }

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

      {/* 구매 알림 메시지 */}
      {purchaseMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            textAlign: 'center',
            fontWeight: 700,
            background: purchaseMessage.type === 'success' 
              ? 'rgba(74, 222, 128, 0.15)' 
              : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${purchaseMessage.type === 'success' ? 'var(--planet-green)' : '#ef4444'}`,
            color: purchaseMessage.type === 'success' ? 'var(--planet-green)' : '#ff6b6b'
          }}
        >
          {purchaseMessage.text}
        </motion.div>
      )}

      {/* 🛡️ 항해 보호 장비 — 구매 가능! */}
      <h3 style={{ color: 'var(--text-bright)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>🛡️ 항해 보호 장비</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--planet-green)', fontWeight: 400, background: 'rgba(74, 222, 128, 0.15)', padding: '2px 8px', borderRadius: '8px' }}>구매 가능</span>
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '4rem'
      }}>
        {protections.map(item => (
          <div key={item.id} className="glass-card" style={{ 
            padding: '1.5rem',
            border: '1px solid rgba(0, 243, 255, 0.3)',
            background: 'rgba(0, 243, 255, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2.5rem' }}>{item.icon}</div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-bright)' }}>{item.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--crystal-cyan)' }}>💰 {item.cost} 광석 · 보유: {item.currentOwned}/{item.maxOwn}</div>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
              {item.desc}
              <br/>
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                ※ 연속 학습이 끊길 위기일 때 자동으로 사용됩니다. (결석 1일당 1개 소모, 최대 {item.maxOwn}개 보유)
              </span>
            </p>
            <button 
              className="space-nav-link" 
              disabled={purchasing || item.currentOwned >= item.maxOwn || (userData?.crystals || 0) < item.cost}
              style={{ 
                width: '100%', 
                fontSize: '0.9rem', 
                padding: '0.8rem',
                fontWeight: 700,
                background: item.currentOwned >= item.maxOwn 
                  ? 'rgba(107, 114, 128, 0.2)' 
                  : (userData?.crystals || 0) < item.cost 
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(0, 243, 255, 0.15)',
                border: item.currentOwned >= item.maxOwn
                  ? '1px solid rgba(107, 114, 128, 0.3)'
                  : '1px solid rgba(0, 243, 255, 0.4)',
                color: item.currentOwned >= item.maxOwn ? '#6B7280' : 'var(--crystal-cyan)',
                cursor: (item.currentOwned >= item.maxOwn || purchasing) ? 'not-allowed' : 'pointer',
                opacity: purchasing ? 0.7 : 1
              }}
              onClick={handlePurchaseCryoCore}
            >
              {item.currentOwned >= item.maxOwn 
                ? '최대 보유 중' 
                : (userData?.crystals || 0) < item.cost 
                  ? `광석 부족 (${item.cost - (userData?.crystals || 0)}개 더 필요)` 
                  : purchasing 
                    ? '구매 중...' 
                    : `구매하기 (${item.cost} 광석)`}
            </button>
          </div>
        ))}
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
                alert('곧 업데이트될 예정입니다! (Coming Soon)')
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
                alert('곧 업데이트될 예정입니다! (Coming Soon)')
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
