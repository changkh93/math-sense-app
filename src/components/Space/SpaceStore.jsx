import React from 'react'
import { createPortal } from 'react-dom'
import { motion as Motion } from 'framer-motion'
import { collection, doc, getDoc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { Gift, Search, Send, UserRound, X } from 'lucide-react'
import { db, functions } from '../../firebase'
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

function getProfileName(profile = {}, fallback = '탐사원') {
  return profile.publicDisplayName || profile.studentName || profile.name || profile.displayName || fallback
}

function getProfileHint(profile = {}) {
  return profile.publicTitle || profile.crewName || profile.email || ''
}

export default function SpaceStore({ userData, user, shouldScrollToBottom }) {
  const [purchasing, setPurchasing] = React.useState(false)
  const [purchaseMessage, setPurchaseMessage] = React.useState(null)
  const [recipients, setRecipients] = React.useState([])
  const [giftItem, setGiftItem] = React.useState(null)
  const [giftMode, setGiftMode] = React.useState('purchase')
  const [giftRecipientSearch, setGiftRecipientSearch] = React.useState('')
  const [giftRecipientId, setGiftRecipientId] = React.useState('')
  const [giftBusy, setGiftBusy] = React.useState(false)
  const [giftMessage, setGiftMessage] = React.useState(null)

  React.useEffect(() => {
    if (shouldScrollToBottom) {
      setTimeout(() => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [shouldScrollToBottom]);

  React.useEffect(() => {
    if (!user?.uid) {
      setRecipients([])
      return undefined
    }

    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs
        .map(docSnap => ({ uid: docSnap.id, ...docSnap.data() }))
        .filter(profile => profile.uid !== user.uid && profile.role !== 'parent' && profile.role !== 'admin')
        .sort((a, b) => getProfileName(a).localeCompare(getProfileName(b), 'ko'))
      setRecipients(list)
      setGiftRecipientId(prev => (prev && list.some(item => item.uid === prev) ? prev : ''))
    }, (error) => {
      console.error('Store gift recipients error:', error)
      setRecipients([])
    })

    return () => unsubscribe()
  }, [user?.uid])

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

  const selectedGiftRecipient = React.useMemo(
    () => recipients.find(recipient => recipient.uid === giftRecipientId) || null,
    [recipients, giftRecipientId]
  )

  const filteredGiftRecipients = React.useMemo(() => {
    const term = giftRecipientSearch.trim().toLowerCase()
    if (!term || selectedGiftRecipient) return []
    return recipients
      .filter(recipient => {
        const haystack = [
          getProfileName(recipient),
          getProfileHint(recipient),
          recipient.email,
          recipient.loginId,
        ].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(term)
      })
      .slice(0, 8)
  }, [giftRecipientSearch, recipients, selectedGiftRecipient])

  const getOwnedGiftUnitCount = (item) => {
    if (item.id === 'cryo_core') return userData?.streakFreezeCount || 0
    if (item.id === 'photon_shield') return Math.floor((userData?.shieldCharges || 0) / PHOTON_SHIELD_CHARGES_PER_PURCHASE)
    if (item.id === 'hall_showcase_credit') return userData?.hallShowcaseCredits || 0
    if (item.id === 'crew_creation_pass') return userData?.crewCreationPasses || 0
    if (item.id === 'crew_join_pass') return userData?.crewJoinPasses || 0
    return 0
  }

  const canGiftOwned = (item) => getOwnedGiftUnitCount(item) > 0

  const getGiftUnitLabel = (item) => {
    if (item.id === 'photon_shield') return `${PHOTON_SHIELD_CHARGES_PER_PURCHASE}회분`
    if (item.id === 'radar') return `${RADAR_DURATION_DAYS}일 활성권`
    return '1개'
  }

  const getRecipientGiftBlockReason = (item, recipient) => {
    if (!item || !recipient) return ''
    const recipientFrames = normalizeOwnedFrames(recipient)

    if (item.id === 'radar' && isRadarActive(recipient)) {
      return `${getProfileName(recipient)}님은 이미 ${item.name}를 활성화 중입니다.`
    }
    if (item.id === 'signature_unlock' && recipient.profileSignatureUnlocked) {
      return `${getProfileName(recipient)}님은 이미 ${item.name}을 보유 중입니다.`
    }
    if (item.id === 'frame_nebula' && recipientFrames.includes('nebula')) {
      return `${getProfileName(recipient)}님은 이미 ${item.name}을 보유 중입니다.`
    }
    if (item.id === 'frame_solar' && recipientFrames.includes('solar')) {
      return `${getProfileName(recipient)}님은 이미 ${item.name}을 보유 중입니다.`
    }
    if (
      item.id === 'photon_shield' &&
      (recipient.shieldCharges || 0) + PHOTON_SHIELD_CHARGES_PER_PURCHASE > PHOTON_SHIELD_MAX_CHARGES
    ) {
      return `${getProfileName(recipient)}님은 광자 실드 최대 ${PHOTON_SHIELD_MAX_CHARGES}회를 초과합니다.`
    }

    return ''
  }

  const getGiftSubmitBlockReason = () => {
    if (!giftItem) return '선물할 아이템을 선택해주세요.'
    if (!selectedGiftRecipient) return '받는 친구를 선택해주세요.'
    if (giftMode === 'owned' && !canGiftOwned(giftItem)) {
      return `${giftItem.name} 보유분이 부족합니다.`
    }
    if (giftMode === 'purchase' && (userData?.crystals || 0) < giftItem.cost) {
      return `광석이 부족합니다. (${giftItem.cost - (userData?.crystals || 0)}개 더 필요)`
    }
    return getRecipientGiftBlockReason(giftItem, selectedGiftRecipient)
  }

  const openGiftModal = (item) => {
    const ownedAvailable = canGiftOwned(item)
    setGiftItem(item)
    setGiftMode(ownedAvailable ? 'owned' : 'purchase')
    setGiftRecipientSearch('')
    setGiftRecipientId('')
    setGiftMessage(null)
  }

  const closeGiftModal = () => {
    if (giftBusy) return
    setGiftItem(null)
    setGiftRecipientSearch('')
    setGiftRecipientId('')
    setGiftMessage(null)
  }

  const handleGiftStoreItem = async (event) => {
    event.preventDefault()
    const blockReason = getGiftSubmitBlockReason()
    if (giftBusy || blockReason) {
      if (blockReason) setGiftMessage({ type: 'error', text: blockReason })
      return
    }

    setGiftBusy(true)
    setGiftMessage(null)

    try {
      const giftStoreItem = httpsCallable(functions, 'giftStoreItem')
      const result = await giftStoreItem({
        itemId: giftItem.id,
        recipientId: selectedGiftRecipient.uid,
        mode: giftMode,
      })
      const recipientName = result.data?.recipientName || getProfileName(selectedGiftRecipient)
      soundManager.playCrystal()
      setPurchaseMessage({
        type: 'success',
        text: `${recipientName}님에게 ${giftItem.name} 선물 완료!`,
      })
      setGiftItem(null)
      setGiftRecipientSearch('')
      setGiftRecipientId('')
      setTimeout(() => setPurchaseMessage(null), 3000)
    } catch (err) {
      console.error('Store gift failed:', err)
      setGiftMessage({
        type: 'error',
        text: err.message || '선물 처리에 실패했습니다. 다시 시도해주세요.',
      })
    } finally {
      setGiftBusy(false)
    }
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
        const recordPurchaseTransaction = () => {
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
          }, transaction, `store_purchase_${item.id}_${nowMs}`)
        }

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

          recordPurchaseTransaction()
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

          recordPurchaseTransaction()
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

          recordPurchaseTransaction()
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

          recordPurchaseTransaction()
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

          recordPurchaseTransaction()
          return { purchasedCount: ownedFrames.length + 1 }
        }

        if (item.id === 'hall_showcase_credit') {
          const currentCredits = freshUserData?.hallShowcaseCredits || 0
          transaction.set(userRef, {
            crystals: freshCrystals - item.cost,
            hallShowcaseCredits: currentCredits + 1,
          }, { merge: true })

          recordPurchaseTransaction()
          return { purchasedCount: currentCredits + 1 }
        }

        if (item.id === 'crew_creation_pass') {
          const currentPasses = freshUserData?.crewCreationPasses || 0
          transaction.set(userRef, {
            crystals: freshCrystals - item.cost,
            crewCreationPasses: currentPasses + 1,
          }, { merge: true })

          recordPurchaseTransaction()
          return { purchasedCount: currentPasses + 1 }
        }

        if (item.id === 'crew_join_pass') {
          const currentPasses = freshUserData?.crewJoinPasses || 0
          transaction.set(userRef, {
            crystals: freshCrystals - item.cost,
            crewJoinPasses: currentPasses + 1,
          }, { merge: true })

          recordPurchaseTransaction()
          return { purchasedCount: currentPasses + 1 }
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
      } else if (item.id === 'crew_join_pass') {
        setPurchaseMessage({
          type: 'success',
          text: `스터디 크루 참여권 ${txResult.purchasedCount}개 보유 중입니다.`
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

  const renderGiftButton = (item) => (
    <button
      type="button"
      className="space-nav-link"
      disabled={giftBusy}
      style={{
        width: '100%',
        marginTop: '0.65rem',
        fontSize: '0.85rem',
        padding: '0.7rem',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        background: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.38)',
        color: '#fbbf24',
        cursor: giftBusy ? 'not-allowed' : 'pointer',
        opacity: giftBusy ? 0.7 : 1,
      }}
      onClick={() => openGiftModal(item)}
    >
      <Gift size={15} />
      선물하기
    </button>
  )

  const giftSubmitBlockReason = getGiftSubmitBlockReason()
  const ownedGiftAvailable = giftItem ? canGiftOwned(giftItem) : false
  const giftModal = giftItem ? createPortal(
    <div
      role="presentation"
      onClick={closeGiftModal}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(2, 6, 23, 0.72)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <Motion.form
        onSubmit={handleGiftStoreItem}
        className="glass-card"
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(620px, 100%)',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          padding: '1.5rem',
          border: '1px solid rgba(245, 158, 11, 0.42)',
          background: 'rgba(15, 23, 42, 0.96)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.42)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#fbbf24', fontWeight: 800, marginBottom: '0.4rem' }}>
              <Gift size={20} />
              상점 아이템 선물
            </div>
            <h3 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '1.35rem' }}>
              {giftItem.icon} {giftItem.name}
            </h3>
            <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
              보유분이 있으면 내 재고에서 보내고, 없으면 광석으로 구매해서 바로 친구에게 전달합니다.
            </p>
          </div>
          <button
            type="button"
            aria-label="선물 창 닫기"
            onClick={closeGiftModal}
            disabled={giftBusy}
            style={{
              width: 36,
              height: 36,
              minWidth: 36,
              borderRadius: 10,
              border: '1px solid rgba(148, 163, 184, 0.28)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: giftBusy ? 'not-allowed' : 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-bright)', fontWeight: 700, marginBottom: '0.5rem' }}>
              받는 친구
            </label>
            {selectedGiftRecipient ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: 12,
                border: '1px solid rgba(0, 243, 255, 0.28)',
                background: 'rgba(0, 243, 255, 0.08)',
              }}>
                <span style={{ color: 'var(--crystal-cyan)', display: 'inline-flex' }}><UserRound size={18} /></span>
                <div style={{ flex: 1 }}>
                  <strong style={{ color: 'var(--text-bright)' }}>{getProfileName(selectedGiftRecipient)}</strong>
                  {getProfileHint(selectedGiftRecipient) && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2 }}>
                      {getProfileHint(selectedGiftRecipient)}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setGiftRecipientId('')
                    setGiftRecipientSearch('')
                    setGiftMessage(null)
                  }}
                  disabled={giftBusy}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: giftBusy ? 'not-allowed' : 'pointer',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '0.75rem',
                  borderRadius: 12,
                  border: '1px solid rgba(148, 163, 184, 0.24)',
                  background: 'rgba(255,255,255,0.04)',
                }}>
                  <Search size={17} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="search"
                    value={giftRecipientSearch}
                    onChange={(event) => {
                      setGiftRecipientSearch(event.target.value)
                      setGiftMessage(null)
                    }}
                    placeholder="친구 이름, 칭호, 이메일 검색"
                    disabled={giftBusy}
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      color: 'var(--text-bright)',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
                {filteredGiftRecipients.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 0.4rem)',
                    left: 0,
                    right: 0,
                    zIndex: 5,
                    borderRadius: 12,
                    border: '1px solid rgba(0, 243, 255, 0.22)',
                    background: 'rgba(15, 23, 42, 0.98)',
                    boxShadow: '0 16px 42px rgba(0,0,0,0.36)',
                    overflow: 'hidden',
                  }}>
                    {filteredGiftRecipients.map(recipient => (
                      <button
                        key={recipient.uid}
                        type="button"
                        onClick={() => {
                          setGiftRecipientId(recipient.uid)
                          setGiftRecipientSearch('')
                          setGiftMessage(null)
                        }}
                        style={{
                          width: '100%',
                          border: 'none',
                          borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
                          background: 'transparent',
                          color: 'var(--text-bright)',
                          padding: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <UserRound size={16} style={{ color: 'var(--crystal-cyan)' }} />
                        <span>
                          <strong>{getProfileName(recipient)}</strong>
                          {getProfileHint(recipient) && (
                            <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: 2 }}>
                              {getProfileHint(recipient)}
                            </small>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-bright)', fontWeight: 700, marginBottom: '0.5rem' }}>
              선물 방식
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={!ownedGiftAvailable || giftBusy}
                onClick={() => {
                  setGiftMode('owned')
                  setGiftMessage(null)
                }}
                style={{
                  padding: '0.85rem',
                  borderRadius: 12,
                  border: giftMode === 'owned' ? '1px solid #fbbf24' : '1px solid rgba(148, 163, 184, 0.22)',
                  background: giftMode === 'owned' ? 'rgba(245, 158, 11, 0.16)' : 'rgba(255,255,255,0.04)',
                  color: ownedGiftAvailable ? 'var(--text-bright)' : 'rgba(148, 163, 184, 0.62)',
                  cursor: ownedGiftAvailable && !giftBusy ? 'pointer' : 'not-allowed',
                  textAlign: 'left',
                }}
              >
                <strong>보유분 선물</strong>
                <span style={{ display: 'block', marginTop: 4, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  보유 가능 수량: {getOwnedGiftUnitCount(giftItem)} · {getGiftUnitLabel(giftItem)}
                </span>
              </button>
              <button
                type="button"
                disabled={giftBusy}
                onClick={() => {
                  setGiftMode('purchase')
                  setGiftMessage(null)
                }}
                style={{
                  padding: '0.85rem',
                  borderRadius: 12,
                  border: giftMode === 'purchase' ? '1px solid var(--crystal-cyan)' : '1px solid rgba(148, 163, 184, 0.22)',
                  background: giftMode === 'purchase' ? 'rgba(0, 243, 255, 0.12)' : 'rgba(255,255,255,0.04)',
                  color: 'var(--text-bright)',
                  cursor: giftBusy ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                }}
              >
                <strong>구매해서 선물</strong>
                <span style={{ display: 'block', marginTop: 4, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  비용: {giftItem.cost}광석 · 내 보유 {userData?.crystals || 0}
                </span>
              </button>
            </div>
          </div>

          {giftSubmitBlockReason && selectedGiftRecipient && (
            <div style={{
              padding: '0.75rem 0.9rem',
              borderRadius: 12,
              border: '1px solid rgba(248, 113, 113, 0.32)',
              background: 'rgba(248, 113, 113, 0.1)',
              color: '#fca5a5',
              fontSize: '0.85rem',
            }}>
              {giftSubmitBlockReason}
            </div>
          )}

          {giftMessage && (
            <div style={{
              padding: '0.75rem 0.9rem',
              borderRadius: 12,
              border: `1px solid ${giftMessage.type === 'success' ? 'rgba(74, 222, 128, 0.32)' : 'rgba(248, 113, 113, 0.32)'}`,
              background: giftMessage.type === 'success' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
              color: giftMessage.type === 'success' ? 'var(--planet-green)' : '#fca5a5',
              fontSize: '0.85rem',
            }}>
              {giftMessage.text}
            </div>
          )}

          <button
            type="submit"
            className="space-nav-link"
            disabled={giftBusy || !!giftSubmitBlockReason}
            style={{
              width: '100%',
              padding: '0.85rem',
              fontSize: '0.95rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              background: giftBusy || giftSubmitBlockReason ? 'rgba(107, 114, 128, 0.18)' : 'rgba(245, 158, 11, 0.18)',
              border: giftBusy || giftSubmitBlockReason ? '1px solid rgba(107, 114, 128, 0.32)' : '1px solid rgba(245, 158, 11, 0.48)',
              color: giftBusy || giftSubmitBlockReason ? 'rgba(148, 163, 184, 0.86)' : '#fbbf24',
              cursor: giftBusy || giftSubmitBlockReason ? 'not-allowed' : 'pointer',
            }}
          >
            <Send size={16} />
            {giftBusy ? '선물 보내는 중...' : giftMode === 'owned' ? '보유분 선물 보내기' : `구매해서 선물하기 (${giftItem.cost}광석)`}
          </button>
        </div>
      </Motion.form>
    </div>,
    document.body
  ) : null

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
        <Motion.div
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
        </Motion.div>
      )}

      {giftModal}

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
            {renderGiftButton(item)}
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
            {renderGiftButton(item)}
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
            {renderGiftButton(item)}
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
            {renderGiftButton(item)}
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
                : `보유 참여권: ${userData?.crewJoinPasses || 0}개`}
            </div>
            <button
              className="space-nav-link"
              disabled={purchasing || (userData?.crystals || 0) < item.cost}
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.7rem' }}
              onClick={() => handlePurchase(item)}
            >
              구매하기
            </button>
            {renderGiftButton(item)}
          </div>
        ))}
      </div>
    </div>
  )
}
