import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase'
import soundManager from '../../utils/SoundManager'
import { recordCrystalTransaction } from '../../utils/crystalLedger'
import {
  buildStreakWriteAudit,
  CRYO_CORE_PURCHASE_COOLDOWN_DAYS,
  PHOTON_SHIELD_CHARGES_PER_PURCHASE,
  PHOTON_SHIELD_MAX_CHARGES,
  RADAR_DURATION_DAYS,
  getRadarTimeRemainingMs,
  getStreakFreezePurchaseCooldownRemainingMs,
  isRadarActive,
} from '../../utils/streakUtils'
import { buildAnswerProfileSnapshot, normalizeOwnedFrames, SOCIAL_STORE_ITEMS } from '../../utils/socialUtils'

const DAY_MS = 24 * 60 * 60 * 1000
const RADAR_DURATION_MS = RADAR_DURATION_DAYS * DAY_MS

export default function SpaceStore({ userData, user }) {
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseMessage, setPurchaseMessage] = useState(null)

  const cryoCooldownRemainingMs = getStreakFreezePurchaseCooldownRemainingMs(userData)
  const cryoCooldownRemainingDays = cryoCooldownRemainingMs > 0 ? Math.ceil(cryoCooldownRemainingMs / DAY_MS) : 0
  const radarActive = isRadarActive(userData)
  const radarRemainingMs = getRadarTimeRemainingMs(userData)
  const radarRemainingDays = Number.isFinite(radarRemainingMs) && radarRemainingMs > 0
    ? Math.ceil(radarRemainingMs / DAY_MS)
    : 0

  const protections = [
    { 
      id: 'cryo_core', 
      name: '크라이오 코어', 
      icon: '🧊', 
      cost: 100, 
      purchaseCooldownDays: CRYO_CORE_PURCHASE_COOLDOWN_DAYS,
      desc: '결석해도 연속 학습(스트릭) 불꽃이 꺼지지 않게 지켜주는 마법의 아이템! 하루 빼먹었다고 너무 아쉬워하지 마세요.',
      currentOwned: userData?.streakFreezeCount || 0
    },
    { 
      id: 'photon_shield', 
      name: '광자 실드', 
      icon: '🛡️', 
      cost: 20, 
      maxOwn: PHOTON_SHIELD_MAX_CHARGES, // Max charges
      chargesPerPurchase: PHOTON_SHIELD_CHARGES_PER_PURCHASE,
      desc: '퀴즈를 풀다 틀려도 피같은 광석(-2)이 깎이지 않게 지켜줍니다! 한 번 구매하면 든든하게 10번이나 막아줘요.',
      currentOwned: userData?.shieldCharges || 0
    },
  ]

  const unownedEquipments = [
    { 
      id: 'radar', 
      name: '첨단 마이닝 스캐너', 
      icon: '📡', 
      cost: 100, 
      durationDays: RADAR_DURATION_DAYS,
      desc: '우주 전역의 고밀도 광석 지대를 감지하는 첨단 장비입니다. 약 20%의 확률로 보너스 지대(💎)를 발견하여 +5 광석을 추가 획득하며, 구매 후 7일 동안만 활성화됩니다.',
      isOwned: radarActive
    }
  ]

  const profileItems = SOCIAL_STORE_ITEMS.filter(item => item.type === 'profile')
  const hallItems = SOCIAL_STORE_ITEMS.filter(item => item.type === 'hall')
  const crewItems = SOCIAL_STORE_ITEMS.filter(item => item.type === 'crew')
  const ownedFrames = normalizeOwnedFrames(userData)

  const isSocialItemOwned = (item) => {
    if (item.id === 'signature_unlock') return !!userData?.profileSignatureUnlocked
    if (item.id === 'frame_nebula') return ownedFrames.includes('nebula')
    if (item.id === 'frame_solar') return ownedFrames.includes('solar')
    return false
  }

  const handlePurchase = async (item) => {
    if (purchasing || !user) return

    setPurchasing(true)
    const userRef = doc(db, 'users', user.uid)
    const nowMs = Date.now()

    try {
      const txResult = await runTransaction(db, async (transaction) => {
        const freshSnap = await transaction.get(userRef)
        if (!freshSnap.exists()) throw new Error('User document not found')

        const freshUserData = freshSnap.data()
        const freshCrystals = freshUserData?.crystals || 0

        if (freshCrystals < item.cost) {
          throw new Error('INSUFFICIENT_CRYSTALS')
        }

        if (item.id === 'cryo_core') {
          const freshFreezeCount = freshUserData?.streakFreezeCount || 0
          const cooldownRemainingMs = getStreakFreezePurchaseCooldownRemainingMs(freshUserData, nowMs)

          if (cooldownRemainingMs > 0) {
            throw new Error('CRYO_CORE_COOLDOWN')
          }

          transaction.set(userRef, {
            crystals: freshCrystals - item.cost,
            streakFreezeCount: freshFreezeCount + 1,
            streakFreezeLastPurchasedAtMs: nowMs,
            streakFreezeLastPurchasedAt: serverTimestamp(),
            streakWriteAudit: buildStreakWriteAudit({
              source: 'space_store_purchase_cryo_core',
              writerUid: user.uid,
              prevState: freshUserData,
              nextState: {
                currentStreak: freshUserData?.currentStreak || 0,
                lastStreakDate: freshUserData?.lastStreakDate || '',
                streakFreezeCount: freshFreezeCount + 1,
              },
              writtenAt: serverTimestamp(),
              note: item.id,
            }),
          }, { merge: true })

          return { purchasedCount: freshFreezeCount + 1 }
        }

        if (item.id === 'photon_shield') {
          const currentCharges = freshUserData?.shieldCharges || 0
          const nextCharges = currentCharges + PHOTON_SHIELD_CHARGES_PER_PURCHASE

          if (nextCharges > PHOTON_SHIELD_MAX_CHARGES) {
            throw new Error('PHOTON_SHIELD_MAX_REACHED')
          }

          transaction.set(userRef, {
            crystals: freshCrystals - item.cost,
            shieldCharges: nextCharges,
          }, { merge: true })

          return { purchasedCount: nextCharges }
        }

        if (item.id === 'radar') {
          if (isRadarActive(freshUserData, nowMs)) {
            throw new Error('RADAR_ALREADY_ACTIVE')
          }

          transaction.set(userRef, {
            crystals: freshCrystals - item.cost,
            hasRadar: true,
            radarActivatedAtMs: nowMs,
            radarExpiresAtMs: nowMs + RADAR_DURATION_MS,
          }, { merge: true })

          return { purchasedCount: 1 }
        }

        if (item.id === 'signature_unlock') {
          if (freshUserData?.profileSignatureUnlocked) {
            throw new Error('ALREADY_OWNED')
          }

          transaction.set(userRef, {
            crystals: freshCrystals - item.cost,
            profileSignatureUnlocked: true,
          }, { merge: true })

          return { purchasedCount: 1 }
        }

        if (item.id === 'frame_nebula' || item.id === 'frame_solar') {
          const ownedFrames = normalizeOwnedFrames(freshUserData)
          const targetFrame = item.id === 'frame_nebula' ? 'nebula' : 'solar'

          if (ownedFrames.includes(targetFrame)) {
            throw new Error('ALREADY_OWNED')
          }

          transaction.set(userRef, {
            crystals: freshCrystals - item.cost,
            ownedProfileFrames: [...ownedFrames, targetFrame],
            selectedProfileFrame: targetFrame,
          }, { merge: true })

          return { purchasedCount: ownedFrames.length + 1 }
        }

        if (item.id === 'hall_showcase_credit') {
          const currentCredits = freshUserData?.hallShowcaseCredits || 0
          transaction.set(userRef, {
            crystals: freshCrystals - item.cost,
            hallShowcaseCredits: currentCredits + 1,
          }, { merge: true })

          return { purchasedCount: currentCredits + 1 }
        }

        if (item.id === 'crew_creation_pass') {
          const currentPasses = freshUserData?.crewCreationPasses || 0
          transaction.set(userRef, {
            crystals: freshCrystals - item.cost,
            crewCreationPasses: currentPasses + 1,
          }, { merge: true })

          return { purchasedCount: currentPasses + 1 }
        }

        if (item.id === 'crew_emblem_credit') {
          const currentCredits = freshUserData?.crewEmblemCredits || 0
          transaction.set(userRef, {
            crystals: freshCrystals - item.cost,
            crewEmblemCredits: currentCredits + 1,
          }, { merge: true })

          return { purchasedCount: currentCredits + 1 }
        }

        throw new Error('UNSUPPORTED_ITEM')
      })

      soundManager.playCrystal()

      if (item.id === 'cryo_core') {
        setPurchaseMessage({
          type: 'success',
          text: `${item.name} 구매 완료! (현재 보유: ${txResult.purchasedCount}개, 다음 구매는 ${CRYO_CORE_PURCHASE_COOLDOWN_DAYS}일 후)`
        })
      } else if (item.id === 'photon_shield') {
        setPurchaseMessage({
          type: 'success',
          text: `${item.name} 구매 완료! (현재 잔여: ${txResult.purchasedCount}/${item.maxOwn}회)`
        })
      } else if (item.id === 'radar') {
        setPurchaseMessage({
          type: 'success',
          text: `${item.name} 활성화 완료! ${RADAR_DURATION_DAYS}일 동안 유지됩니다.`
        })
      } else if (item.id === 'signature_unlock') {
        setPurchaseMessage({
          type: 'success',
          text: '한 줄 시그니처 기능이 해금되었습니다.'
        })
      } else if (item.id === 'frame_nebula' || item.id === 'frame_solar') {
        setPurchaseMessage({
          type: 'success',
          text: `${item.name} 해금 완료! 프로필 명함에서 선택할 수 있습니다.`
        })
      } else if (item.id === 'hall_showcase_credit') {
        setPurchaseMessage({
          type: 'success',
          text: `명예의 전당 쇼케이스 ${txResult.purchasedCount}회권 보유 중입니다.`
        })
      } else if (item.id === 'crew_creation_pass') {
        setPurchaseMessage({
          type: 'success',
          text: `스터디 크루 창설권 ${txResult.purchasedCount}개 보유 중입니다.`
        })
      } else if (item.id === 'crew_emblem_credit') {
        setPurchaseMessage({
          type: 'success',
          text: `크루 엠블럼 변경권 ${txResult.purchasedCount}개 보유 중입니다.`
        })
      }

      setTimeout(() => setPurchaseMessage(null), 3000)

      if (item.id === 'frame_nebula' || item.id === 'frame_solar') {
        try {
          const freshUserSnap = await getDoc(userRef)
          const freshUserData = freshUserSnap.exists() ? freshUserSnap.data() : userData
          const answersSnap = await getDocs(query(collection(db, 'answers'), where('userId', '==', user.uid)))

          if (!answersSnap.empty) {
            const batch = writeBatch(db)
            const snapshot = buildAnswerProfileSnapshot(freshUserData, freshUserData?.publicDisplayName || freshUserData?.studentName || user.displayName || '탐험가')
            answersSnap.docs.forEach((answerDoc) => {
              batch.update(answerDoc.ref, { publicProfileSnapshot: snapshot })
            })
            await batch.commit()
          }
        } catch (syncErr) {
          console.warn('프레임 구매 후 답변 스냅샷 동기화 실패:', syncErr)
        }
      }

      recordCrystalTransaction(user.uid, {
        amount: -item.cost,
        type: item.type === 'profile'
          ? 'agora_profile_purchase'
          : item.type === 'hall'
            ? 'hall_purchase'
            : item.type === 'crew'
              ? 'crew_purchase'
              : 'store_purchase',
        description: `${item.name} 구매`,
        metadata: { itemId: item.id }
      })
    } catch (err) {
      console.error('Purchase failed:', err)
      const message =
        err.message === 'INSUFFICIENT_CRYSTALS'
          ? `광석이 부족합니다. (필요: ${item.cost}개)`
          : err.message === 'CRYO_CORE_COOLDOWN'
              ? `크라이오 코어는 ${CRYO_CORE_PURCHASE_COOLDOWN_DAYS}일에 1개만 구매할 수 있습니다.`
              : err.message === 'PHOTON_SHIELD_MAX_REACHED'
                ? `${item.name}는 최대 ${item.maxOwn}회까지 충전할 수 있습니다.`
                : err.message === 'ALREADY_OWNED'
                  ? `${item.name}는 이미 해금했습니다.`
                : err.message === 'RADAR_ALREADY_ACTIVE'
                  ? `${item.name}는 이미 활성화 중입니다. 만료 후 다시 구매할 수 있습니다.`
                  : '구매에 실패했습니다. 다시 시도해주세요.'
      setPurchaseMessage({ type: 'error', text: message })
      setTimeout(() => setPurchaseMessage(null), 3000)
    } finally {
      setPurchasing(false)
    }
  }

  return (
    <div className="fade-in">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--text-bright)', marginBottom: '0.5rem' }}>🎨 소셜 커스텀 상점</h2>
        <p style={{ color: 'var(--text-muted)' }}>광석을 써서 질문의 판을 열고, 답변자 프로필과 스터디 크루를 드러내세요.</p>
        
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

      {/* ⏳ 기간제 탐사 장비 */}
      <h3 style={{ color: 'var(--text-bright)', marginBottom: '1.5rem', marginTop: '3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>⏳ 기간제 탐사 장비</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--planet-green)', fontWeight: 400, background: 'rgba(74, 222, 128, 0.15)', padding: '2px 8px', borderRadius: '8px' }}>7일 유지</span>
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
              onClick={() => handlePurchase(item)}
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
                  {item.id === 'photon_shield' && <span style={{ opacity: 0.7, marginLeft: '0.5rem' }}>(10회분 충전)</span>}
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
                    ? `현재 보유: ${item.currentOwned}개 / 월 1회 구매`
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
                  ※ 연속 학습이 끊길 위기일 때 자동으로 사용됩니다. (결석 1일당 1개 소모, 현재 보유 {item.currentOwned}개, {item.purchaseCooldownDays}일에 1개만 구매 가능)
                </span>
              ) : item.id === 'photon_shield' ? (
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                  ※ 퀴즈 중 오답 시 자동으로 소모됩니다. (1회 구매 시 {item.chargesPerPurchase}회 충전, 최대 {item.maxOwn}회까지 누적 충전 가능)
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                  ※ 구매 후 {item.durationDays}일 동안만 활성화됩니다.
                </span>
              )}
            </p>
            <button 
              className="space-nav-link" 
              disabled={purchasing || (item.id === 'cryo_core' && cryoCooldownRemainingMs > 0) || (item.id === 'photon_shield' && (item.currentOwned + PHOTON_SHIELD_CHARGES_PER_PURCHASE) > item.maxOwn) || (item.id === 'radar' && radarActive) || (userData?.crystals || 0) < item.cost}
              style={{ 
                width: '100%', 
                fontSize: '0.9rem', 
                padding: '0.8rem',
                fontWeight: 700,
                background: ((item.id === 'cryo_core' && cryoCooldownRemainingMs > 0) || (item.id === 'photon_shield' && (item.currentOwned + PHOTON_SHIELD_CHARGES_PER_PURCHASE) > item.maxOwn) || (item.id === 'radar' && radarActive)) 
                  ? 'rgba(107, 114, 128, 0.2)' 
                  : (userData?.crystals || 0) < item.cost 
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(0, 243, 255, 0.15)',
                border: ((item.id === 'cryo_core' && cryoCooldownRemainingMs > 0) || (item.id === 'photon_shield' && (item.currentOwned + PHOTON_SHIELD_CHARGES_PER_PURCHASE) > item.maxOwn) || (item.id === 'radar' && radarActive))
                  ? '1px solid rgba(107, 114, 128, 0.3)'
                  : '1px solid rgba(0, 243, 255, 0.4)',
                color: ((item.id === 'cryo_core' && cryoCooldownRemainingMs > 0) || (item.id === 'photon_shield' && (item.currentOwned + PHOTON_SHIELD_CHARGES_PER_PURCHASE) > item.maxOwn) || (item.id === 'radar' && radarActive)) ? '#6B7280' : 'var(--crystal-cyan)',
                cursor: (((item.id === 'cryo_core' && cryoCooldownRemainingMs > 0) || (item.id === 'photon_shield' && (item.currentOwned + PHOTON_SHIELD_CHARGES_PER_PURCHASE) > item.maxOwn) || (item.id === 'radar' && radarActive)) || purchasing) ? 'not-allowed' : 'pointer',
                opacity: purchasing ? 0.7 : 1
              }}
              onClick={() => handlePurchase(item)}
            >
              {((item.id === 'cryo_core' && cryoCooldownRemainingMs > 0) || (item.id === 'photon_shield' && (item.currentOwned + PHOTON_SHIELD_CHARGES_PER_PURCHASE) > item.maxOwn) || (item.id === 'radar' && radarActive)) 
                ? (item.id === 'cryo_core' && cryoCooldownRemainingMs > 0
                  ? '구매 대기 중'
                  : item.id === 'radar' && radarActive
                    ? '활성 중'
                    : '최대 한도 초과')
                : (userData?.crystals || 0) < item.cost 
                  ? `광석 부족 (${item.cost - (userData?.crystals || 0)}개 더 필요)` 
                  : purchasing 
                    ? '구매 중...' 
                    : `구매하기 (${item.cost} 광석)`}
            </button>
            {item.id === 'cryo_core' && cryoCooldownRemainingMs > 0 && (
              <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                다음 구매 가능: 약 {cryoCooldownRemainingDays}일 후
              </div>
            )}
            {item.id === 'radar' && radarActive && (
              <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {radarRemainingDays > 0 ? `활성 중, 약 ${radarRemainingDays}일 남음` : '활성 중'}
              </div>
            )}
          </div>
        ))}
      </div>

      <h3 style={{ color: 'var(--text-bright)', marginBottom: '1.5rem' }}>🪪 공개 프로필 명함</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '4rem'
      }}>
        {profileItems.map(item => (
          (() => {
            const isOwned = isSocialItemOwned(item)
            return (
          <div key={item.id} className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2.5rem' }}>{item.icon}</div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-bright)' }}>{item.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--crystal-cyan)' }}>💰 {item.cost} 광석</div>
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>{item.description}</p>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', marginBottom: '1rem' }}>
              {item.id === 'signature_unlock'
                ? isOwned
                  ? '이미 해금됨'
                  : '답변 카드 하단에 한 줄 소개를 노출'
                : item.id === 'frame_nebula'
                  ? isOwned
                    ? '이미 해금됨'
                    : '은은한 프레임 강조'
                  : isOwned
                    ? '이미 해금됨'
                    : '랭킹과 답변 카드에서 강한 존재감'}
            </div>
            <button
              className="space-nav-link"
              disabled={purchasing || isOwned || (userData?.crystals || 0) < item.cost}
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.7rem' }}
              onClick={() => handlePurchase(item)}
            >
              {isOwned ? '이미 보유 중' : '구매하기'}
            </button>
          </div>
            )
          })()
        ))}
      </div>

      <h3 style={{ color: 'var(--text-bright)', marginBottom: '1.5rem' }}>🏆 주간 명예의 전당</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '4rem'
      }}>
        {hallItems.map(item => (
          <div key={item.id} className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2.5rem' }}>{item.icon}</div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-bright)' }}>{item.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--crystal-cyan)' }}>💰 {item.cost} 광석</div>
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>{item.description}</p>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', marginBottom: '1rem' }}>
              현재 쇼케이스 보유: {userData?.hallShowcaseCredits || 0}회
            </div>
            <button
              className="space-nav-link"
              disabled={purchasing || (userData?.crystals || 0) < item.cost}
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.7rem' }}
              onClick={() => handlePurchase(item)}
            >
              구매하기
            </button>
          </div>
        ))}
      </div>

      <h3 style={{ color: 'var(--text-bright)', marginBottom: '1.5rem' }}>🛰️ 스터디 크루 운영</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem'
      }}>
        {crewItems.map(item => (
          <div key={item.id} className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2.5rem' }}>{item.icon}</div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-bright)' }}>{item.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--crystal-cyan)' }}>💰 {item.cost} 광석</div>
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>{item.description}</p>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', marginBottom: '1rem' }}>
              {item.id === 'crew_creation_pass'
                ? `보유 창설권: ${userData?.crewCreationPasses || 0}개`
                : `보유 엠블럼 변경권: ${userData?.crewEmblemCredits || 0}개`}
            </div>
            <button
              className="space-nav-link"
              disabled={purchasing || (userData?.crystals || 0) < item.cost}
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.7rem' }}
              onClick={() => handlePurchase(item)}
            >
              구매하기
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
