import React from 'react'
import { createPortal } from 'react-dom'
import { motion as Motion } from 'framer-motion'
import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { Gift, Search, Send, UserRound, X } from 'lucide-react'
import { db, functions } from '../../firebase'
import soundManager from '../../utils/SoundManager'
import { recordCrystalTransaction } from '../../utils/crystalLedger'
import {
  buildStreakWriteAudit,
  CRYO_CORE_PURCHASE_COOLDOWN_DAYS,
  PHOTON_SHIELD_CHARGES_PER_PURCHASE,
  RADAR_DURATION_DAYS,
  getRadarTimeRemainingMs,
  getStreakFreezePurchaseCooldownRemainingMs,
  isRadarActive,
} from '../../utils/streakUtils'
import { BASE_THEMES, buildAnswerProfileSnapshot, getBaseTheme, normalizeOwnedBaseThemes, normalizeOwnedFrames, SOCIAL_STORE_ITEMS } from '../../utils/socialUtils'
import {
  BADGE_UPGRADE_COST,
  buildCollectionBadges,
  isBadgeUpgradeOwned,
} from '../../utils/badgeUtils'
import ShipHangar from './ShipHangar'
import {
  getShipAchievementStats,
  getShipItemFamily,
  getShipItemUnlock,
  normalizeOwnedShipItems,
  normalizeShipLoadout,
  ownsShipFamily,
} from '../../utils/shipCatalog'

const DAY_MS = 24 * 60 * 60 * 1000
const RADAR_DURATION_MS = RADAR_DURATION_DAYS * DAY_MS

function getProfileName(profile = {}, fallback = '탐사원') {
  return profile.publicDisplayName || profile.studentName || profile.name || profile.displayName || fallback
}

function getProfileHint(profile = {}) {
  return profile.publicTitle || profile.crewName || profile.email || ''
}

export default function SpaceStore({ userData, user, shouldScrollToBottom, history }) {
  const [purchasing, setPurchasing] = React.useState(false)
  const [purchaseMessage, setPurchaseMessage] = React.useState(null)
  const [recipients, setRecipients] = React.useState([])
  const [giftItem, setGiftItem] = React.useState(null)
  const [giftMode, setGiftMode] = React.useState('purchase')
  const [giftRecipientSearch, setGiftRecipientSearch] = React.useState('')
  const [giftRecipientId, setGiftRecipientId] = React.useState('')
  const [giftBusy, setGiftBusy] = React.useState(false)
  const [giftMessage, setGiftMessage] = React.useState(null)
  const [badgeUpgradeTarget, setBadgeUpgradeTarget] = React.useState(null)

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
    if (!user?.uid || !giftItem) {
      setRecipients([])
      return undefined
    }
    let cancelled = false
    getDocs(collection(db, 'users')).then((snapshot) => {
      if (cancelled) return
      const list = snapshot.docs
        .map(docSnap => ({ uid: docSnap.id, ...docSnap.data() }))
        .filter(profile => profile.uid !== user.uid && profile.role !== 'parent' && profile.role !== 'admin')
        .sort((a, b) => getProfileName(a).localeCompare(getProfileName(b), 'ko'))
      setRecipients(list)
      setGiftRecipientId(prev => (prev && list.some(item => item.uid === prev) ? prev : ''))
    }).catch((error) => {
      console.error('Store gift recipients error:', error)
      if (!cancelled) setRecipients([])
    })
    return () => { cancelled = true }
  }, [giftItem, user?.uid])

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
      chargesPerPurchase: PHOTON_SHIELD_CHARGES_PER_PURCHASE,
      desc: '퀴즈를 풀다 틀려도 피같은 광석(-2)이 깎이지 않게 지켜줍니다! 한 번 구매하면 10회 방어할 수 있어요.',
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
  const baseItems = SOCIAL_STORE_ITEMS.filter(item => item.type === 'base')
  const baseThemeStoreCards = BASE_THEMES.map(theme => ({
    theme,
    item: baseItems.find(item => item.themeId === theme.id) || null,
  }))
  const hallItems = SOCIAL_STORE_ITEMS.filter(item => item.type === 'hall')
  const crewItems = SOCIAL_STORE_ITEMS.filter(item => item.type === 'crew')
  const ownedFrames = normalizeOwnedFrames(userData)
  const ownedBaseThemes = normalizeOwnedBaseThemes(userData)

  const isSocialItemOwned = (item) => {
    if (item.id === 'signature_unlock') return !!userData?.profileSignatureUnlocked
    if (item.id === 'frame_nebula') return ownedFrames.includes('nebula')
    if (item.id === 'frame_solar') return ownedFrames.includes('solar')
    if (item.type === 'base') return ownedBaseThemes.includes(item.themeId)
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
    return 0
  }

  const canGiftOwned = (item) => getOwnedGiftUnitCount(item) > 0

  const getGiftUnitLabel = (item) => {
    if (item.id === 'photon_shield') return `${PHOTON_SHIELD_CHARGES_PER_PURCHASE}회 방어`
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
              : item.type === 'base'
                ? 'base_theme_purchase'
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

        if (item.type === 'base' && item.themeId) {
          const ownedBaseThemes = normalizeOwnedBaseThemes(freshUserData)

          if (ownedBaseThemes.includes(item.themeId)) {
            throw new Error('ALREADY_OWNED')
          }

          transaction.set(userRef, {
            crystals: freshCrystals - item.cost,
            ownedBaseThemes: [...ownedBaseThemes, item.themeId],
            selectedBaseTheme: item.themeId,
          }, { merge: true })

          recordPurchaseTransaction()
          return { purchasedCount: ownedBaseThemes.length + 1 }
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
          text: `${item.name} 구매 완료! (남은 방어 횟수: ${txResult.purchasedCount}회)`
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
      } else if (item.type === 'base') {
        setPurchaseMessage({
          type: 'success',
          text: `${item.name} 해금 완료! 공개 탐험기지 배경으로 장착되었습니다.`
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

  const handleShipItemAction = async (item) => {
    if (purchasing || !user?.uid || !item?.id || !item?.slot) return
    setPurchasing(true)
    const userRef = doc(db, 'users', user.uid)
    const nowMs = Date.now()

    try {
      const result = await runTransaction(db, async (transaction) => {
        const freshSnap = await transaction.get(userRef)
        if (!freshSnap.exists()) throw new Error('User document not found')

        const freshUserData = freshSnap.data()
        const family = getShipItemFamily(item)
        const freshOwned = normalizeOwnedShipItems(freshUserData)
        const isOwned = freshOwned.includes(item.id)
        const currentLoadout = normalizeShipLoadout(freshUserData, family)
        const nextLoadout = { ...currentLoadout, [item.slot]: item.id }
        const nextShipLoadouts = { ...(freshUserData?.shipLoadouts || {}), [family]: nextLoadout }
        const familyWrite = {
          activeShipFamily: family,
          shipLoadouts: nextShipLoadouts,
          ...(family === 'scout' ? { shipCustomization: nextLoadout } : {}),
        }

        if (currentLoadout[item.slot] === item.id) {
          return { mode: 'already_equipped' }
        }

        if (isOwned) {
          transaction.set(userRef, familyWrite, { merge: true })
          return { mode: 'equipped' }
        }

        const unlock = getShipItemUnlock(item, getShipAchievementStats({ ...freshUserData, learningSummary: userData?.learningSummary }, history), freshUserData)
        if (!unlock.unlocked) throw new Error('SHIP_ACHIEVEMENT_LOCKED')

        const freshCrystals = Number(freshUserData?.crystals || 0)
        if (freshCrystals < item.cost) throw new Error('INSUFFICIENT_CRYSTALS')

        transaction.set(userRef, {
          crystals: freshCrystals - item.cost,
          ownedShipItems: [...freshOwned, item.id],
          ...familyWrite,
        }, { merge: true })

        recordCrystalTransaction(user.uid, {
          amount: -item.cost,
          type: 'ship_part_purchase',
          description: `${item.name} 탐사선 부품 구매`,
          metadata: { itemId: item.id, slot: item.slot, family },
        }, transaction, `ship_part_${item.id}_${nowMs}`)

        return { mode: 'purchased' }
      })

      soundManager.playCrystal()
      setPurchaseMessage({
        type: 'success',
        text: result.mode === 'purchased'
          ? `${item.name} 구매 완료! 나의 탐사선에 바로 장착했습니다.`
          : result.mode === 'equipped'
            ? `${item.name} 장착 완료! 모든 탐사 화면에 반영됩니다.`
            : `${item.name}은 이미 장착 중입니다.`,
      })

      try {
        const freshUserSnap = await getDoc(userRef)
        const freshUserData = freshUserSnap.exists() ? freshUserSnap.data() : userData
        const answersSnap = await getDocs(query(collection(db, 'answers'), where('userId', '==', user.uid)))
        if (!answersSnap.empty) {
          const batch = writeBatch(db)
          const snapshot = buildAnswerProfileSnapshot(
            freshUserData,
            freshUserData?.publicDisplayName || freshUserData?.studentName || user.displayName || '탐험가',
          )
          answersSnap.docs.forEach((answerDoc) => batch.update(answerDoc.ref, { publicProfileSnapshot: snapshot }))
          await batch.commit()
        }
      } catch (syncErr) {
        console.warn('탐사선 장착 후 답변 스냅샷 동기화 실패:', syncErr)
      }
      setTimeout(() => setPurchaseMessage(null), 3200)
    } catch (err) {
      console.error('Ship item action failed:', err)
      const message = err.message === 'INSUFFICIENT_CRYSTALS'
        ? `광석이 부족합니다. (필요: ${item.cost}개)`
        : err.message === 'SHIP_ACHIEVEMENT_LOCKED'
          ? '이 부품의 학습 성취 조건을 먼저 달성해주세요.'
          : '탐사선 부품 작업에 실패했습니다. 다시 시도해주세요.'
      setPurchaseMessage({ type: 'error', text: message })
      setTimeout(() => setPurchaseMessage(null), 3200)
    } finally {
      setPurchasing(false)
    }
  }

  const handleShipFamilyAction = async (family) => {
    if (purchasing || !user?.uid || !['scout', 'pathfinder'].includes(family)) return
    setPurchasing(true)
    const userRef = doc(db, 'users', user.uid)
    try {
      await runTransaction(db, async (transaction) => {
        const freshSnap = await transaction.get(userRef)
        if (!freshSnap.exists()) throw new Error('User document not found')
        const freshUserData = freshSnap.data()
        if (!ownsShipFamily(freshUserData, family)) throw new Error('SHIP_FAMILY_LOCKED')
        transaction.set(userRef, { activeShipFamily: family }, { merge: true })
      })
      try {
        const freshUserSnap = await getDoc(userRef)
        const freshUserData = freshUserSnap.exists() ? freshUserSnap.data() : userData
        const answersSnap = await getDocs(query(collection(db, 'answers'), where('userId', '==', user.uid)))
        if (!answersSnap.empty) {
          const batch = writeBatch(db)
          const snapshot = buildAnswerProfileSnapshot(freshUserData, freshUserData?.publicDisplayName || freshUserData?.studentName || user.displayName || '탐험가')
          answersSnap.docs.forEach((answerDoc) => batch.update(answerDoc.ref, { publicProfileSnapshot: snapshot }))
          await batch.commit()
        }
      } catch (syncErr) {
        console.warn('함급 전환 후 답변 스냅샷 동기화 실패:', syncErr)
      }
      soundManager.playWarp()
      setPurchaseMessage({ type: 'success', text: `${family === 'pathfinder' ? '심우주 개척함' : '정찰선'} 출격 준비 완료! 모든 탐사 화면에 반영됩니다.` })
      setTimeout(() => setPurchaseMessage(null), 3200)
    } catch (err) {
      console.error('Ship family action failed:', err)
      setPurchaseMessage({ type: 'error', text: '함급 전환에 실패했습니다. 다시 시도해주세요.' })
      setTimeout(() => setPurchaseMessage(null), 3200)
    } finally {
      setPurchasing(false)
    }
  }

  // 배지 외형 업그레이드 구매. 성취 자체는 무료 자동 획득이고, 디자인만 100광석에 영구 해금한다.
  const handleBadgeUpgradePurchase = async (badge) => {
    if (purchasing || !user?.uid || !badge?.id) return
    setPurchasing(true)
    const userRef = doc(db, 'users', user.uid)
    const nowMs = Date.now()
    try {
      await runTransaction(db, async (transaction) => {
        const freshSnap = await transaction.get(userRef)
        if (!freshSnap.exists()) throw new Error('User document not found')
        const freshUserData = freshSnap.data()
        const freshCrystals = freshUserData?.crystals || 0
        if (isBadgeUpgradeOwned(freshUserData, badge.id)) throw new Error('ALREADY_OWNED')
        if (freshCrystals < BADGE_UPGRADE_COST) throw new Error('INSUFFICIENT_CRYSTALS')

        const prevUpgrades = freshUserData?.badgeUpgrades || {}
        transaction.set(userRef, {
          crystals: freshCrystals - BADGE_UPGRADE_COST,
          featuredPremiumBadgeId: freshUserData?.featuredPremiumBadgeId || badge.id,
          badgeUpgrades: {
            ...prevUpgrades,
            [badge.id]: {
              ownedSkins: ['premium'],
              selectedSkin: 'premium',
              purchasedAtMs: nowMs,
            },
          },
        }, { merge: true })

        recordCrystalTransaction(user.uid, {
          amount: -BADGE_UPGRADE_COST,
          type: 'badge_upgrade_purchase',
          description: `${badge.title} 배지 업그레이드`,
          metadata: { badgeId: badge.id, skin: 'premium' },
        }, transaction, `badge_upgrade_${badge.id}_${nowMs}`)
      })

      soundManager.playCrystal()
      setPurchaseMessage({ type: 'success', text: `${badge.title} 배지가 프리미엄 디자인으로 업그레이드되었습니다!` })
      setBadgeUpgradeTarget(null)
      setTimeout(() => setPurchaseMessage(null), 3000)
    } catch (err) {
      console.error('Badge upgrade failed:', err)
      const message =
        err.message === 'INSUFFICIENT_CRYSTALS'
          ? `광석이 부족합니다. (필요: ${BADGE_UPGRADE_COST}개)`
          : err.message === 'ALREADY_OWNED'
            ? '이미 업그레이드한 배지입니다.'
            : '업그레이드에 실패했습니다. 다시 시도해주세요.'
      setPurchaseMessage({ type: 'error', text: message })
      setTimeout(() => setPurchaseMessage(null), 3000)
    } finally {
      setPurchasing(false)
    }
  }

  const handleFeaturedPremiumBadge = async (badge) => {
    if (purchasing || !user?.uid || !badge?.id) return
    setPurchasing(true)
    const userRef = doc(db, 'users', user.uid)
    try {
      await runTransaction(db, async (transaction) => {
        const freshSnap = await transaction.get(userRef)
        if (!freshSnap.exists()) throw new Error('User document not found')
        const freshUserData = freshSnap.data()
        if (!isBadgeUpgradeOwned(freshUserData, badge.id)) throw new Error('NOT_OWNED')
        transaction.set(userRef, {
          featuredPremiumBadgeId: badge.id,
        }, { merge: true })
      })

      soundManager.playClick()
      setPurchaseMessage({ type: 'success', text: '대표 프리미엄 배지를 변경했습니다.' })
      setTimeout(() => setPurchaseMessage(null), 2400)
    } catch (err) {
      console.error('Featured premium badge update failed:', err)
      const message = err.message === 'NOT_OWNED'
        ? '보유한 프리미엄 배지만 대표로 설정할 수 있습니다.'
        : '대표 배지 설정에 실패했습니다. 다시 시도해주세요.'
      setPurchaseMessage({ type: 'error', text: message })
      setTimeout(() => setPurchaseMessage(null), 3000)
    } finally {
      setPurchasing(false)
    }
  }

  const handleEquipBaseTheme = async (themeId) => {
    if (purchasing || !user?.uid || !themeId) return
    const currentThemeId = userData?.selectedBaseTheme || 'orbital'
    if (currentThemeId === themeId) return

    setPurchasing(true)
    const userRef = doc(db, 'users', user.uid)

    try {
      await runTransaction(db, async (transaction) => {
        const freshSnap = await transaction.get(userRef)
        if (!freshSnap.exists()) throw new Error('User document not found')

        const freshUserData = freshSnap.data()
        const freshOwnedThemes = normalizeOwnedBaseThemes(freshUserData)

        if (!freshOwnedThemes.includes(themeId)) {
          throw new Error('BASE_THEME_NOT_OWNED')
        }

        transaction.set(userRef, {
          selectedBaseTheme: themeId,
        }, { merge: true })
      })

      soundManager.playClick()
      setPurchaseMessage({
        type: 'success',
        text: `${getBaseTheme(themeId).name} 배경을 공개 탐험기지에 장착했습니다.`,
      })
      setTimeout(() => setPurchaseMessage(null), 3000)
    } catch (err) {
      console.error('Equip base theme failed:', err)
      setPurchaseMessage({
        type: 'error',
        text: err.message === 'BASE_THEME_NOT_OWNED'
          ? '아직 해금하지 않은 탐험기지 배경입니다.'
          : '배경 장착에 실패했습니다. 다시 시도해주세요.',
      })
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
        flex: '0 0 auto',
        whiteSpace: 'nowrap',
        fontSize: '0.85rem',
        padding: '0.7rem 0.9rem',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.35rem',
        background: 'rgba(0, 243, 255, 0.05)',
        border: '1px solid rgba(0, 243, 255, 0.3)',
        color: 'var(--text-bright)',
        cursor: giftBusy ? 'not-allowed' : 'pointer',
        opacity: giftBusy ? 0.7 : 1,
      }}
      onClick={() => openGiftModal(item)}
    >
      <Gift size={15} style={{ color: 'var(--crystal-cyan)' }} />
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
            transform: 'none',
            transition: 'none',
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
              flex: '0 0 auto',
              width: 38,
              height: 38,
              minWidth: 38,
              borderRadius: 10,
              border: '1px solid rgba(0, 243, 255, 0.6)',
              background: 'rgba(0, 243, 255, 0.22)',
              color: '#ffffff',
              fontSize: '1.25rem',
              fontWeight: 800,
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: giftBusy ? 'not-allowed' : 'pointer',
            }}
          >
            ✕
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
        <h2 style={{ fontSize: '2.5rem', color: 'var(--text-bright)', marginBottom: '0.5rem' }}>🚀 탐사선 격납고 & 커스텀 상점</h2>
        <p style={{ color: 'var(--text-muted)' }}>나만의 탐사선을 조립하고, 광석으로 우주 전역에 남을 개성을 해금하세요.</p>
        
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

      <ShipHangar
        userData={userData}
        history={history}
        busy={purchasing}
        onAction={handleShipItemAction}
        onFamilyAction={handleShipFamilyAction}
      />

      {/* 🏅 탐사 배지 쇼케이스 */}
      <BadgeShowcaseSection
        userData={userData}
        history={history}
        purchasing={purchasing}
        badgeUpgradeTarget={badgeUpgradeTarget}
        setBadgeUpgradeTarget={setBadgeUpgradeTarget}
        onPurchaseUpgrade={handleBadgeUpgradePurchase}
        onSetFeaturedBadge={handleFeaturedPremiumBadge}
      />

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
            <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.5rem' }}>
            <button 
              className="space-nav-link" 
              disabled={purchasing || item.isOwned || (userData?.crystals || 0) < item.cost}
              style={{ 
                flex: 1, 
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
                  {item.id === 'photon_shield' && <span style={{ opacity: 0.7, marginLeft: '0.5rem' }}>(10회 방어)</span>}
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
                    : `남은 방어 횟수: ${item.currentOwned}회`
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
                  ※ 퀴즈 중 오답 시 자동으로 소모됩니다. (1회 구매 시 {item.chargesPerPurchase}회 방어 추가)
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                  ※ 구매 후 {item.durationDays}일 동안만 활성화됩니다.
                </span>
              )}
            </p>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.5rem' }}>
            <button 
              className="space-nav-link" 
              disabled={purchasing || (item.id === 'cryo_core' && cryoCooldownRemainingMs > 0) || (item.id === 'radar' && radarActive) || (userData?.crystals || 0) < item.cost}
              style={{ 
                flex: 1, 
                fontSize: '0.9rem', 
                padding: '0.8rem',
                fontWeight: 700,
                background: ((item.id === 'cryo_core' && cryoCooldownRemainingMs > 0) || (item.id === 'radar' && radarActive)) 
                  ? 'rgba(107, 114, 128, 0.2)' 
                  : (userData?.crystals || 0) < item.cost 
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(0, 243, 255, 0.15)',
                border: ((item.id === 'cryo_core' && cryoCooldownRemainingMs > 0) || (item.id === 'radar' && radarActive))
                  ? '1px solid rgba(107, 114, 128, 0.3)'
                  : '1px solid rgba(0, 243, 255, 0.4)',
                color: ((item.id === 'cryo_core' && cryoCooldownRemainingMs > 0) || (item.id === 'radar' && radarActive)) ? '#6B7280' : 'var(--crystal-cyan)',
                cursor: (((item.id === 'cryo_core' && cryoCooldownRemainingMs > 0) || (item.id === 'radar' && radarActive)) || purchasing) ? 'not-allowed' : 'pointer',
                opacity: purchasing ? 0.7 : 1
              }}
              onClick={() => handlePurchase(item)}
            >
              {((item.id === 'cryo_core' && cryoCooldownRemainingMs > 0) || (item.id === 'radar' && radarActive)) 
                ? (item.id === 'cryo_core' && cryoCooldownRemainingMs > 0
                  ? '구매 대기 중'
                  : '활성 중')
                : (userData?.crystals || 0) < item.cost 
                  ? `광석 부족 (${item.cost - (userData?.crystals || 0)}개 더 필요)` 
                  : purchasing 
                    ? '구매 중...' 
                    : `구매하기 (${item.cost} 광석)`}
            </button>
            {renderGiftButton(item)}
            </div>
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
            <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.5rem' }}>
            <button
              className="space-nav-link"
              disabled={purchasing || isOwned || (userData?.crystals || 0) < item.cost}
              style={{ 
                flex: 1, 
                fontSize: '0.85rem', 
                padding: '0.7rem',
                fontWeight: 700,
                background: isOwned 
                  ? 'rgba(107, 114, 128, 0.2)' 
                  : (userData?.crystals || 0) < item.cost 
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(0, 243, 255, 0.15)',
                border: isOwned
                  ? '1px solid rgba(107, 114, 128, 0.3)'
                  : '1px solid rgba(0, 243, 255, 0.4)',
                color: isOwned ? '#6B7280' : 'var(--crystal-cyan)',
                cursor: (isOwned || purchasing) ? 'not-allowed' : 'pointer',
                opacity: purchasing ? 0.7 : 1
              }}
              onClick={() => handlePurchase(item)}
            >
              {isOwned ? '이미 보유 중' : '구매하기'}
            </button>
            {renderGiftButton(item)}
            </div>
          </div>
            )
          })()
        ))}
      </div>

      <h3 style={{ color: 'var(--text-bright)', marginBottom: '1.5rem' }}>🛖 나의 탐험기지 배경</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '4rem'
      }}>
        {baseThemeStoreCards.map(({ theme, item }) => {
          const isOwned = ownedBaseThemes.includes(theme.id)
          const isSelected = (userData?.selectedBaseTheme || 'orbital') === theme.id
          const cost = item?.cost || 0
          const canAfford = (userData?.crystals || 0) >= cost

          return (
            <div key={theme.id} className="glass-card" style={{
              padding: '1.5rem',
              border: isSelected ? `1px solid ${theme.accent}` : '1px solid rgba(255,255,255,0.12)',
              background: theme.pageBackground,
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(2, 6, 23, 0.42)',
                pointerEvents: 'none'
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '2.5rem' }}>{theme.icon}</div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-bright)' }}>{theme.name}</div>
                    <div style={{ fontSize: '0.8rem', color: theme.accent }}>
                      {cost > 0 ? `💰 ${cost} 광석` : '기본 제공'}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.72)', marginBottom: '1rem', lineHeight: 1.6 }}>
                  {item?.description || theme.description}
                </p>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.62)', marginBottom: '1rem' }}>
                  {isSelected ? '현재 공개 탐험기지에 장착 중' : isOwned ? '해금됨 · 여기서 바로 장착 가능' : theme.description}
                </div>
                <button
                  className="space-nav-link"
                  disabled={purchasing || isSelected || (!isOwned && !canAfford)}
                  style={{
                    width: '100%',
                    fontSize: '0.85rem',
                    padding: '0.7rem',
                    fontWeight: 800,
                    background: isSelected
                      ? 'rgba(107, 114, 128, 0.2)'
                      : (!isOwned && !canAfford)
                        ? 'rgba(239, 68, 68, 0.1)'
                        : `${theme.accent}24`,
                    border: isSelected
                      ? '1px solid rgba(107, 114, 128, 0.3)'
                      : `1px solid ${theme.accent}66`,
                    color: isSelected ? '#9ca3af' : theme.accent,
                    cursor: (isSelected || purchasing || (!isOwned && !canAfford)) ? 'not-allowed' : 'pointer',
                    opacity: purchasing ? 0.7 : 1
                  }}
                  onClick={() => {
                    if (isOwned) {
                      handleEquipBaseTheme(theme.id)
                    } else if (item) {
                      handlePurchase(item)
                    }
                  }}
                >
                  {isSelected
                    ? '장착 중'
                    : isOwned
                      ? '장착하기'
                      : !canAfford
                        ? `광석 부족 (${cost - (userData?.crystals || 0)}개 더 필요)`
                        : '구매하고 장착하기'}
                </button>
              </div>
            </div>
          )
        })}
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
            <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.5rem' }}>
            <button
              className="space-nav-link"
              disabled={purchasing || (userData?.crystals || 0) < item.cost}
              style={{ 
                flex: 1, 
                fontSize: '0.85rem', 
                padding: '0.7rem',
                fontWeight: 700,
                background: (userData?.crystals || 0) < item.cost 
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'rgba(0, 243, 255, 0.15)',
                border: (userData?.crystals || 0) < item.cost
                  ? '1px solid rgba(239, 68, 68, 0.4)'
                  : '1px solid rgba(0, 243, 255, 0.4)',
                color: (userData?.crystals || 0) < item.cost ? '#ff6b6b' : 'var(--crystal-cyan)',
                cursor: purchasing ? 'not-allowed' : 'pointer',
                opacity: purchasing ? 0.7 : 1
              }}
              onClick={() => handlePurchase(item)}
            >
              {(userData?.crystals || 0) < item.cost
                ? `광석 부족 (${item.cost - (userData?.crystals || 0)}개 더 필요)`
                : purchasing
                  ? '구매 중...'
                  : '구매하기'}
            </button>
            {renderGiftButton(item)}
            </div>
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
              보유 창설권: {userData?.crewCreationPasses || 0}개
            </div>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.5rem' }}>
            <button
              className="space-nav-link"
              disabled={purchasing || (userData?.crystals || 0) < item.cost}
              style={{ 
                flex: 1, 
                fontSize: '0.85rem', 
                padding: '0.7rem',
                fontWeight: 700,
                background: (userData?.crystals || 0) < item.cost 
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'rgba(0, 243, 255, 0.15)',
                border: (userData?.crystals || 0) < item.cost
                  ? '1px solid rgba(239, 68, 68, 0.4)'
                  : '1px solid rgba(0, 243, 255, 0.4)',
                color: (userData?.crystals || 0) < item.cost ? '#ff6b6b' : 'var(--crystal-cyan)',
                cursor: purchasing ? 'not-allowed' : 'pointer',
                opacity: purchasing ? 0.7 : 1
              }}
              onClick={() => handlePurchase(item)}
            >
              {(userData?.crystals || 0) < item.cost
                ? `광석 부족 (${item.cost - (userData?.crystals || 0)}개 더 필요)`
                : purchasing
                  ? '구매 중...'
                  : '구매하기'}
            </button>
            {renderGiftButton(item)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 탐사 배지 쇼케이스 섹션. 프리미엄은 소장품, 기본 배지는 성취 기록으로 분리한다.
function BadgeShowcaseSection({ userData, history, purchasing, badgeUpgradeTarget, setBadgeUpgradeTarget, onPurchaseUpgrade, onSetFeaturedBadge }) {
  const allBadges = React.useMemo(
    () => buildCollectionBadges(userData, history),
    [userData, history]
  )

  const earnedCount = allBadges.filter(b => b.unlocked).length
  const ownedPremiumBadges = allBadges.filter((badge) => (
    badge.unlocked && !!badge.premiumImage && isBadgeUpgradeOwned(userData, badge.id)
  ))
  const earnedBasicBadges = allBadges.filter((badge) => (
    badge.unlocked && !(!!badge.premiumImage && isBadgeUpgradeOwned(userData, badge.id))
  ))
  const challengeBadges = allBadges.filter((badge) => !badge.unlocked)
  const selectedFeaturedBadge = ownedPremiumBadges.find((badge) => badge.id === userData?.featuredPremiumBadgeId)
  const featuredBadge = selectedFeaturedBadge || ownedPremiumBadges[0] || null
  const crystals = userData?.crystals || 0

  const premiumStage = (badge, options = {}) => {
    const isOwned = !!options.owned
    const isFeatured = !!options.featured
    return (
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: options.large ? 24 : 18,
          minHeight: options.large ? 460 : 340,
          display: 'grid',
          placeItems: 'center',
          padding: options.large ? '1rem' : '0.7rem',
          background:
            'radial-gradient(circle at 50% 18%, rgba(255, 215, 0, 0.22), rgba(5, 8, 26, 0.96) 58%), linear-gradient(135deg, rgba(0, 243, 255, 0.08), rgba(255, 215, 0, 0.08))',
          border: isFeatured
            ? '1px solid rgba(255, 215, 0, 0.9)'
            : '1px solid rgba(255, 215, 0, 0.48)',
          boxShadow: isFeatured
            ? '0 0 0 1px rgba(255, 215, 0, 0.24), 0 0 34px rgba(255, 215, 0, 0.34), 0 0 88px rgba(0, 243, 255, 0.16)'
            : '0 18px 46px rgba(0,0,0,0.34), 0 0 24px rgba(255, 215, 0, 0.18)',
          opacity: isOwned ? 1 : 0.9,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-45%',
            left: '-20%',
            width: '42%',
            height: '190%',
            transform: 'rotate(20deg)',
            background: 'linear-gradient(120deg, transparent, rgba(255,255,255,0.2), transparent)',
            pointerEvents: 'none',
          }}
        />
        <img
          src={badge.premiumImage}
          alt={badge.title}
          loading="lazy"
          decoding="async"
          style={{
            width: options.large ? 'min(100%, 340px)' : 'min(100%, 235px)',
            height: options.large ? 430 : 315,
            objectFit: 'contain',
            filter: 'drop-shadow(0 24px 34px rgba(0,0,0,0.46))',
            position: 'relative',
            zIndex: 1,
          }}
        />
      </div>
    )
  }

  const actionButtonStyle = (variant = 'gold') => ({
    width: '100%',
    minHeight: 42,
    padding: '0.62rem 0.8rem',
    borderRadius: 12,
    border: variant === 'ghost' ? '1px solid rgba(255, 215, 0, 0.36)' : 'none',
    background: variant === 'ghost'
      ? 'rgba(255, 215, 0, 0.08)'
      : 'linear-gradient(135deg, var(--star-gold), #ffb347)',
    color: variant === 'ghost' ? 'var(--star-gold)' : '#14131f',
    fontWeight: 900,
    cursor: purchasing ? 'not-allowed' : 'pointer',
    opacity: purchasing ? 0.7 : 1,
  })

  return (
    <>
      <h3 style={{ color: 'var(--text-bright)', marginBottom: '0.5rem', marginTop: '3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>🏅 탐사 배지 쇼케이스</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--star-gold)', fontWeight: 400, background: 'rgba(255, 215, 0, 0.12)', padding: '2px 8px', borderRadius: '8px' }}>{earnedCount}/{allBadges.length} 획득</span>
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
        성취한 배지를 프리미엄 디자인으로 각성시켜 보세요. 각성한 배지는 영구 소장되며, 대표 배지로 프로필에 표시됩니다.
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 1.6rem', lineHeight: 1.6 }}>
        대표 배지는 공개 프로필 상단과 획득 배지 영역에서 가장 먼저 보입니다.
      </p>

      {ownedPremiumBadges.length > 0 && (
        <section style={{ marginBottom: '2.4rem' }}>
          <h4 style={{ color: 'var(--text-bright)', margin: '0 0 1rem', fontSize: '1.05rem' }}>
            ✨ 프리미엄 컬렉션
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '1rem',
          }}>
            {ownedPremiumBadges.map((badge) => {
              const isFeatured = (featuredBadge?.id || userData?.featuredPremiumBadgeId) === badge.id
              return (
                <div key={badge.id} style={{ display: 'grid', gap: '0.75rem' }}>
                  {premiumStage(badge, { owned: true, featured: isFeatured })}
                  <button
                    type="button"
                    disabled={purchasing || isFeatured}
                    onClick={() => onSetFeaturedBadge(badge)}
                    style={{
                      ...actionButtonStyle(isFeatured ? 'ghost' : 'gold'),
                      opacity: isFeatured ? 0.78 : (purchasing ? 0.7 : 1),
                      cursor: isFeatured || purchasing ? 'default' : 'pointer',
                    }}
                  >
                    {isFeatured ? '대표 배지로 표시 중' : '대표 배지 설정'}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {earnedBasicBadges.length > 0 && (
        <section style={{ marginBottom: '2.4rem' }}>
          <h4 style={{ color: 'var(--text-bright)', margin: '0 0 1rem', fontSize: '1.05rem' }}>
            💎 획득한 배지
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}>
            {earnedBasicBadges.map((badge) => {
              const canAwaken = !!badge.premiumImage
              const insufficient = crystals < BADGE_UPGRADE_COST
              return (
                <div
                  key={badge.id}
                  className="glass-card"
                  style={{
                    padding: '1.15rem',
                    minHeight: 250,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(255, 215, 0, 0.24)',
                    background: 'linear-gradient(180deg, rgba(255, 215, 0, 0.08), rgba(255,255,255,0.035))',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '0.8rem' }}>{badge.icon}</div>
                    <div style={{ color: 'var(--star-gold)', fontWeight: 900, marginBottom: '0.4rem' }}>{badge.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.55, minHeight: '2.6em' }}>{badge.desc}</div>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'grid', gap: '0.4rem' }}>
                    {canAwaken ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setBadgeUpgradeTarget(badge)}
                          disabled={purchasing || insufficient}
                          style={{
                            ...actionButtonStyle(),
                            background: insufficient ? 'rgba(239, 68, 68, 0.15)' : actionButtonStyle().background,
                            color: insufficient ? '#ff6b6b' : actionButtonStyle().color,
                            cursor: insufficient || purchasing ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {insufficient ? `광석 ${BADGE_UPGRADE_COST - crystals}개 부족` : '💎 프리미엄 각성'}
                        </button>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textAlign: 'center' }}>
                          각성 후 영구 소장
                        </span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--planet-green)', fontSize: '0.74rem', textAlign: 'center' }}>
                        ✅ 획득 완료
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {challengeBadges.length > 0 && (
        <StoreChallengeAccordionSection challengeBadges={challengeBadges} />
      )}

      {/* 업그레이드 확인 모달 */}
      {badgeUpgradeTarget && createPortal(
        <div onClick={() => setBadgeUpgradeTarget(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <Motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card"
            style={{ maxWidth: '420px', width: '100%', padding: '2rem', textAlign: 'center' }}
          >
            <div style={{
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 1.35rem',
              minHeight: 300,
              borderRadius: 18,
              background: 'radial-gradient(circle at 50% 18%, rgba(255, 215, 0, 0.16), rgba(15, 23, 42, 0.18) 64%)',
            }}>
              {badgeUpgradeTarget.premiumImage && (
                <img src={badgeUpgradeTarget.premiumImage} alt={badgeUpgradeTarget.title} style={{ width: 'min(100%, 260px)', height: 326, objectFit: 'contain', filter: 'drop-shadow(0 22px 30px rgba(0,0,0,0.42))' }} />
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {BADGE_UPGRADE_COST}광석으로 프리미엄 디자인을 각성합니다. 각성 후 영구 소장됩니다.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setBadgeUpgradeTarget(null)} style={{
                flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)',
                background: 'transparent', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer'
              }}>
                취소
              </button>
              <button
                onClick={() => onPurchaseUpgrade(badgeUpgradeTarget)}
                disabled={purchasing || (userData?.crystals || 0) < BADGE_UPGRADE_COST}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, var(--star-gold), #ffb347)',
                  color: '#1a1a2e',
                  fontWeight: 800,
                  cursor: purchasing || (userData?.crystals || 0) < BADGE_UPGRADE_COST ? 'not-allowed' : 'pointer',
                  opacity: purchasing || (userData?.crystals || 0) < BADGE_UPGRADE_COST ? 0.65 : 1,
                }}
              >
                💎 프리미엄 각성
              </button>
            </div>
          </Motion.div>
        </div>,
        document.body
      )}
    </>
  )
}

function StoreChallengeAccordionSection({ challengeBadges = [] }) {
  // Agora and General section initial state: OPEN (true)
  // Course section initial state: CLOSED (false)
  const [openSections, setOpenSections] = React.useState({
    'agora': true,
    'crew': true,
    'cluster_elementary': false,
    'middle-math': false,
    'python': false,
    'western-classic': false,
    'general': true,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sections = [
    { key: 'agora', title: '💬 스텔라 아고라 배지' },
    { key: 'crew', title: '🚢 스터디 크루 활동 배지' },
    { key: 'cluster_elementary', title: '🏫 초등수학 성역 배지' },
    { key: 'middle-math', title: '📐 중등수학 성역 배지' },
    { key: 'python', title: '🐍 파이썬 코딩 성역 배지' },
    { key: 'western-classic', title: '🏛️ 서양 고전 성역 배지' },
    { key: 'general', title: '🏅 일반 & 활동 성취 배지' }
  ];

  return (
    <section style={{ marginBottom: '4rem' }}>
      <h4 style={{ color: 'var(--text-bright)', margin: '0 0 1rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
        <span>🎖 도전할 배지 목록</span>
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sections.map(({ key, title }) => {
          const regionBadges = challengeBadges.filter(b => {
            if (key === 'agora') return b.category === 'agora';
            if (key === 'crew') return b.category === 'crew';
            if (key === 'general') return !b.clusterId && b.category !== 'region_master' && b.category !== 'agora' && b.category !== 'crew';
            return b.clusterId === key;
          });
          if (regionBadges.length === 0) return null;
          const isOpen = openSections[key] ?? false;

          return (
            <div key={key} className="glass-card" style={{ padding: 0, borderRadius: 12, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => toggleSection(key)}
                style={{
                  width: '100%',
                  padding: '0.95rem 1.2rem',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: 'none',
                  color: 'var(--text-bright)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  textAlign: 'left',
                  outline: 'none',
                }}
              >
                <span>{title}</span>
                <span style={{ fontSize: '0.85rem', color: isOpen ? 'var(--crystal-cyan)' : 'var(--text-muted)', fontWeight: 700 }}>
                  {isOpen ? '열림 ▲' : '닫힘 ▼'}
                </span>
              </button>

              {isOpen && (
                <div style={{ padding: '1rem', background: 'rgba(5, 10, 25, 0.4)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {regionBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="glass-card"
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        opacity: 0.8,
                        minHeight: 220,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      <div style={{ width: '100%' }}>
                        <div style={{ fontSize: '2.75rem', lineHeight: 1, marginBottom: '0.75rem' }}>{badge.icon}</div>
                        <div style={{ fontWeight: 900, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                          {badge.title}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', lineHeight: 1.5, marginTop: '0.45rem', minHeight: '2.5em' }}>
                          {badge.desc}
                        </div>
                      </div>

                      {badge.requirements && badge.requirements.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', marginTop: '0.6rem' }}>
                          {badge.requirements.map((req, idx) => (
                            <div key={idx} style={{
                              fontSize: '0.72rem',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: req.completed ? 'rgba(80, 200, 120, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                              color: req.completed ? 'var(--planet-green)' : 'var(--text-muted)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span>{req.completed ? '✓ ' : ''}{req.label}</span>
                              <span style={{ fontWeight: 700, color: req.completed ? 'var(--planet-green)' : 'var(--crystal-cyan)' }}>
                                {req.prefix || ''}{req.current} / {req.prefix || ''}{req.target}{req.prefix ? '' : (req.unit || '')}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ marginTop: '0.9rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          🔒 조건 미달성
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
