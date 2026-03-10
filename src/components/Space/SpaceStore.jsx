import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { doc, setDoc, increment } from 'firebase/firestore'
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
      desc: '결석해도 연속 학습(스트릭) 불꽃이 꺼지지 않게 지켜주는 마법의 아이템! 하루 빼먹었다고 너무 아쉬워하지 마세요.',
      currentOwned: userData?.streakFreezeCount || 0
    },
    { 
      id: 'photon_shield', 
      name: '광자 실드', 
      icon: '🛡️', 
      cost: 200, 
      maxOwn: 20, // Max charges
      desc: '퀴즈를 풀다 틀려도 피같은 광석(-2)이 깎이지 않게 지켜줍니다! 한 번 구매하면 든든하게 10번이나 막아줘요.',
      currentOwned: userData?.shieldCharges || 0
    },
    { 
      id: 'memory_core', 
      name: '별빛 메모리 코어', 
      icon: '☄️', 
      cost: 200, 
      maxOwn: 50, // Max charges
      desc: '깨진 데이터를 복구하고 과거의 점수를 되찾을 수 있는 필수 장치입니다! 한 번 구매하면 10번의 복구 탐사가 가능합니다.',
      currentOwned: userData?.memoryCoreCharges || 0
    },
  ]

  const unownedEquipments = [
    { 
      id: 'radar', 
      name: '첨단 마이닝 스캐너', 
      icon: '📡', 
      cost: 100, 
      desc: '우주 전역의 고밀도 광석 지대를 감지하는 첨단 장비입니다. 약 20%의 확률로 보너스 지대(💎)를 발견하여 +5 광석을 추가 획득하며, 퀴즈 중 채굴 현황을 실시간으로 관측합니다.',
      isOwned: userData?.hasRadar || false
    },
    { 
      id: 'engine', 
      name: '중력 엔진', 
      icon: '⚙️', 
      cost: 500, 
      desc: '우주선의 추진력을 엄청나게 높여주는 초강력 엔진! 스페이스바를 꾹 누르면 슝~ 소리와 함께 초고속으로 이동하며, 배경음악도 깔끔하게 꺼집니다.',
      isOwned: userData?.hasEngine || false
    }
  ]

  const skins = [
    { id: 'rainbow_engine', name: '무지개 엔진 불꽃', icon: '🌈', cost: 1000, desc: '엔진 추진력을 무지개 빛으로 변경합니다.' },
    { id: 'stealth_hull', name: '투명 선체', icon: '👻', cost: 2000, desc: '우주선을 반투명하게 만듭니다.' },
  ]

  const themes = [
    { id: 'lava_planet', name: '용암 행성 테마', icon: '🌋', cost: 500, desc: '퀴즈 배경을 뜨거운 용암 행성으로 변경합니다.' },
    { id: 'ice_planet', name: '얼음 행성 테마', icon: '❄️', cost: 500, desc: '퀴즈 배경을 차가운 얼음 행성으로 변경합니다.' },
  ]

  const handlePurchaseCryoCore = async (item) => {
    if (purchasing || !user) return
    
    const currentCrystals = userData?.crystals || 0
    
    if (currentCrystals < item.cost) {
      setPurchaseMessage({ type: 'error', text: `광석이 부족합니다. (필요: ${item.cost}개)` })
      setTimeout(() => setPurchaseMessage(null), 3000)
      return
    }

    if (item.id === 'cryo_core') {
      const currentFreezeCount = userData?.streakFreezeCount || 0
      if (currentFreezeCount >= item.maxOwn) {
        setPurchaseMessage({ type: 'error', text: `크라이오 코어는 최대 ${item.maxOwn}개까지 보유할 수 있습니다.` })
        setTimeout(() => setPurchaseMessage(null), 3000)
        return
      }

      setPurchasing(true)
      try {
        await setDoc(doc(db, 'users', user.uid), {
          crystals: increment(-item.cost),
          streakFreezeCount: increment(1),
        }, { merge: true })
        
        soundManager.playCrystal()
        setPurchaseMessage({ type: 'success', text: `${item.name} 구매 완료! (보유: ${currentFreezeCount + 1}/${item.maxOwn})` })
        setTimeout(() => setPurchaseMessage(null), 3000)

        recordCrystalTransaction(user.uid, {
          amount: -item.cost,
          type: 'store_purchase',
          description: `${item.name} 구매`,
          metadata: { itemId: item.id }
        })
      } catch (err) {
        console.error('Purchase failed:', err)
        setPurchaseMessage({ type: 'error', text: '구매에 실패했습니다. 다시 시도해주세요.' })
        setTimeout(() => setPurchaseMessage(null), 3000)
      } finally {
        setPurchasing(false)
      }
    } else if (item.id === 'photon_shield' || item.id === 'memory_core') {
      const fieldName = item.id === 'photon_shield' ? 'shieldCharges' : 'memoryCoreCharges'
      const currentCharges = userData?.[fieldName] || 0
      
      if (currentCharges + 10 > item.maxOwn) {
        setPurchaseMessage({ type: 'error', text: `${item.name}는 최대 ${item.maxOwn}회까지 충전할 수 있습니다.` })
        setTimeout(() => setPurchaseMessage(null), 3000)
        return
      }

      setPurchasing(true)
      try {
        await setDoc(doc(db, 'users', user.uid), {
          crystals: increment(-item.cost),
          [fieldName]: increment(10),
        }, { merge: true })
        
        soundManager.playCrystal()
        setPurchaseMessage({ type: 'success', text: `${item.name} 구매 완료! (현재 잔여: ${currentCharges + 10}회)` })
        setTimeout(() => setPurchaseMessage(null), 3000)

        recordCrystalTransaction(user.uid, {
          amount: -item.cost,
          type: 'store_purchase',
          description: `${item.name} 구매`,
          metadata: { itemId: item.id }
        })
      } catch (err) {
        console.error('Purchase failed:', err)
        setPurchaseMessage({ type: 'error', text: '구매에 실패했습니다. 다시 시도해주세요.' })
        setTimeout(() => setPurchaseMessage(null), 3000)
      } finally {
        setPurchasing(false)
      }
    } else if (item.id === 'radar' || item.id === 'engine') {
      if (item.isOwned) {
        setPurchaseMessage({ type: 'error', text: `이미 보유 중인 장비입니다.` })
        setTimeout(() => setPurchaseMessage(null), 3000)
        return
      }

      setPurchasing(true)
      try {
        const fieldName = item.id === 'radar' ? 'hasRadar' : 'hasEngine'
        await setDoc(doc(db, 'users', user.uid), {
          crystals: increment(-item.cost),
          [fieldName]: true,
        }, { merge: true })
        
        soundManager.playLevelUp()
        setPurchaseMessage({ type: 'success', text: `${item.name} 장착 완료!` })
        setTimeout(() => setPurchaseMessage(null), 3000)

        recordCrystalTransaction(user.uid, {
          amount: -item.cost,
          type: 'store_purchase',
          description: `${item.name} 구매`,
          metadata: { itemId: item.id }
        })
      } catch (err) {
        console.error('Purchase failed:', err)
        setPurchaseMessage({ type: 'error', text: '구매에 실패했습니다. 다시 시도해주세요.' })
        setTimeout(() => setPurchaseMessage(null), 3000)
      } finally {
        setPurchasing(false)
      }
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

      {/* 🚢 영구 장비 (1회 구매) */}
      <h3 style={{ color: 'var(--text-bright)', marginBottom: '1.5rem', marginTop: '3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>🚢 영구 장비</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--planet-green)', fontWeight: 400, background: 'rgba(74, 222, 128, 0.15)', padding: '2px 8px', borderRadius: '8px' }}>1회 구매</span>
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '4rem'
      }}>
        {unownedEquipments.map(item => (
          <div key={item.id} className="glass-card" style={{ 
            padding: '1.5rem',
            border: item.isOwned ? '1px solid rgba(107, 114, 128, 0.3)' : '1px solid rgba(0, 243, 255, 0.3)',
            background: item.isOwned ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 243, 255, 0.05)',
            opacity: item.isOwned ? 0.6 : 1
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2.5rem' }}>{item.icon}</div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-bright)' }}>{item.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--crystal-cyan)' }}>
                  💰 {item.cost} 광석
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {item.desc}
            </p>
            <button 
              className="space-nav-link" 
              disabled={purchasing || item.isOwned || (userData?.crystals || 0) < item.cost}
              style={{ 
                width: '100%', 
                fontSize: '0.9rem', 
                padding: '0.8rem',
                fontWeight: 700,
                background: item.isOwned 
                  ? 'rgba(107, 114, 128, 0.2)' 
                  : (userData?.crystals || 0) < item.cost 
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(0, 243, 255, 0.15)',
                border: item.isOwned
                  ? '1px solid rgba(107, 114, 128, 0.3)'
                  : '1px solid rgba(0, 243, 255, 0.4)',
                color: item.isOwned ? '#6B7280' : 'var(--crystal-cyan)',
                cursor: (item.isOwned || purchasing) ? 'not-allowed' : 'pointer',
                opacity: purchasing ? 0.7 : 1
              }}
              onClick={() => handlePurchaseCryoCore(item)}
            >
              {item.isOwned 
                ? '장착 중 (보유 완료)' 
                : (userData?.crystals || 0) < item.cost 
                  ? `광석 부족 (${item.cost - (userData?.crystals || 0)}개 더 필요)` 
                  : purchasing 
                    ? '구매 중...' 
                    : `구매하기 (${item.cost} 광석)`}
            </button>
          </div>
        ))}
      </div>

      {/* 🛡️ 항해 보호 장비 — 구매 가능! */}
      <h3 style={{ color: 'var(--text-bright)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>🛡️ 소모성 보호 장비</span>
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
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '1.2rem' }}>{item.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--crystal-cyan)', marginTop: '0.2rem' }}>
                  <span style={{ fontWeight: 800 }}>💰 {item.cost} 광석</span>
                  {['photon_shield', 'memory_core'].includes(item.id) && <span style={{ opacity: 0.7, marginLeft: '0.5rem' }}>(10회분 충전)</span>}
                </div>
                <div style={{ 
                  marginTop: '0.5rem', 
                  fontSize: '0.8rem', 
                  color: item.currentOwned > 0 ? 'var(--planet-green)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.currentOwned > 0 ? 'var(--planet-green)' : 'var(--text-muted)' }} />
                  {item.id === 'cryo_core' 
                    ? `현재 보유: ${item.currentOwned}개 / 최대 ${item.maxOwn}개`
                    : `남은 횟수: ${item.currentOwned}회 / 최대 ${item.maxOwn}회`
                  }
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
              {item.desc}
              <br/>
              {item.id === 'cryo_core' ? (
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                  ※ 연속 학습이 끊길 위기일 때 자동으로 사용됩니다. (결석 1일당 1개 소모, 최대 {item.maxOwn}개 보유)
                </span>
              ) : item.id === 'photon_shield' ? (
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                  ※ 퀴즈 중 오답 시 자동으로 소모됩니다. (최대 {item.maxOwn}회 방어까지 누적 충전 가능)
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                  ※ 별빛 메모리 코어 진입 시 1개 소모됩니다. (최대 {item.maxOwn}회 탐사까지 누적 가능)
                </span>
              )}
            </p>
            <button 
              className="space-nav-link" 
              disabled={purchasing || (item.id === 'cryo_core' && item.currentOwned >= item.maxOwn) || (['photon_shield', 'memory_core'].includes(item.id) && (item.currentOwned + 10) > item.maxOwn) || (userData?.crystals || 0) < item.cost}
              style={{ 
                width: '100%', 
                fontSize: '0.9rem', 
                padding: '0.8rem',
                fontWeight: 700,
                background: ((item.id === 'cryo_core' && item.currentOwned >= item.maxOwn) || (['photon_shield', 'memory_core'].includes(item.id) && (item.currentOwned + 10) > item.maxOwn)) 
                  ? 'rgba(107, 114, 128, 0.2)' 
                  : (userData?.crystals || 0) < item.cost 
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(0, 243, 255, 0.15)',
                border: ((item.id === 'cryo_core' && item.currentOwned >= item.maxOwn) || (['photon_shield', 'memory_core'].includes(item.id) && (item.currentOwned + 10) > item.maxOwn))
                  ? '1px solid rgba(107, 114, 128, 0.3)'
                  : '1px solid rgba(0, 243, 255, 0.4)',
                color: ((item.id === 'cryo_core' && item.currentOwned >= item.maxOwn) || (['photon_shield', 'memory_core'].includes(item.id) && (item.currentOwned + 10) > item.maxOwn)) ? '#6B7280' : 'var(--crystal-cyan)',
                cursor: (((item.id === 'cryo_core' && item.currentOwned >= item.maxOwn) || (['photon_shield', 'memory_core'].includes(item.id) && (item.currentOwned + 10) > item.maxOwn)) || purchasing) ? 'not-allowed' : 'pointer',
                opacity: purchasing ? 0.7 : 1
              }}
              onClick={() => handlePurchaseCryoCore(item)}
            >
              {((item.id === 'cryo_core' && item.currentOwned >= item.maxOwn) || (['photon_shield', 'memory_core'].includes(item.id) && (item.currentOwned + 10) > item.maxOwn)) 
                ? '최대 한도 초과' 
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
