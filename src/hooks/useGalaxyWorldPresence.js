import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from 'firebase/database'
import { realtimeDb } from '../firebase'
import { GALAXY_POSITION_LIMIT, GALAXY_MIN_Y, GALAXY_MAX_Y } from '../utils/galaxyWorldBounds.js'
import { normalizeExplorationKit, normalizeMovementMode } from '../components/GalaxySocial/exploration/frontierExploration.js'

const POSITION_THROTTLE_MS = 120
const POSITION_EPSILON = 0.035
const YAW_EPSILON = 0.02
const HEIGHT_EPSILON = 0.025
const SCALE_EPSILON = 0.015
const HEARTBEAT_MS = 5_000
const STALE_CONNECTION_MS = 15_000
const STALE_SWEEP_MS = 1_000
const SPEECH_LIFETIME_MS = 8_000
const REMOTE_REFRESH_COALESCE_MS = 160

const safePathSegment = (value) => String(value || '')
  .trim()
  .split('')
  .map((character) => '.#$[]/'.includes(character) ? '_' : character)
  .join('')
  .slice(0, 180)

const cleanText = (value, maxLength) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength)

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const normalizeYaw = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.atan2(Math.sin(numeric), Math.cos(numeric))
}

const angularDistance = (first, second) => Math.abs(Math.atan2(
  Math.sin(first - second),
  Math.cos(first - second),
))

const normalizePosition = (position = {}) => {
  const x = Number(position.x)
  const y = Number(position.y)
  const z = Number(position.z)
  const yaw = Number(position.yaw)
  const scale = Number(position.scale)
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(yaw)) return null
  return {
    equipment: normalizeExplorationKit(position.equipment),
    movementMode: normalizeMovementMode(position.movementMode),
    x: Math.round(clamp(x, -GALAXY_POSITION_LIMIT, GALAXY_POSITION_LIMIT) * 1000) / 1000,
    y: Math.round(clamp(y, GALAXY_MIN_Y, GALAXY_MAX_Y) * 1000) / 1000,
    z: Math.round(clamp(z, -GALAXY_POSITION_LIMIT, GALAXY_POSITION_LIMIT) * 1000) / 1000,
    yaw: Math.round(normalizeYaw(yaw) * 1000) / 1000,
    scale: Math.round(clamp(Number.isFinite(scale) ? scale : .28, .14, .7) * 1000) / 1000,
  }
}

const hasSignificantPositionChange = (previous, next) => !previous
  || next.equipment !== previous.equipment
  || next.movementMode !== previous.movementMode
  || Math.hypot(next.x - previous.x, next.z - previous.z) >= POSITION_EPSILON
  || Math.abs(next.y - previous.y) >= HEIGHT_EPSILON
  || Math.abs(next.scale - previous.scale) >= SCALE_EPSILON
  || angularDistance(next.yaw, previous.yaw) >= YAW_EPSILON

const normalizeRemotePlayers = (value, ownSafeUid, nowMs) => Object.entries(value || {})
  .reduce((players, [playerKey, playerValue]) => {
    if (playerKey === ownSafeUid) return players
    const connections = Object.entries(playerValue?.connections || {})
      .map(([connectionId, connection]) => ({ connectionId, ...connection }))
      .filter((connection) => {
        if (!connection || typeof connection !== 'object') return false
        if (safePathSegment(connection.uid) !== playerKey) return false
        const updatedAtMs = Number(connection.updatedAtMs || 0)
        return updatedAtMs > 0
          && updatedAtMs <= nowMs + HEARTBEAT_MS
          && nowMs - updatedAtMs <= STALE_CONNECTION_MS
      })
      .sort((first, second) => Number(second.updatedAtMs || 0) - Number(first.updatedAtMs || 0))
    const connection = connections[0]
    if (!connection) return players

    const x = Number(connection.x)
    const y = Number(connection.y)
    const z = Number(connection.z)
    const yaw = Number(connection.yaw)
    if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(yaw)) return players
    const speech = connection.speech && typeof connection.speech === 'object'
      && safePathSegment(connection.speech.targetUid) === ownSafeUid
      && Number(connection.speech.expiresAtMs || 0) > nowMs
      ? {
          id: cleanText(connection.speech.id, 120),
          text: cleanText(connection.speech.text, 80),
          targetUid: cleanText(connection.speech.targetUid, 180),
          sentAtMs: Number(connection.speech.sentAtMs || 0),
          expiresAtMs: Number(connection.speech.expiresAtMs || 0),
        }
      : null

    players.push({
      uid: cleanText(connection.uid, 180),
      displayName: cleanText(connection.displayName || '탐사원', 40),
      connectionId: connection.connectionId,
      x: clamp(x, -GALAXY_POSITION_LIMIT, GALAXY_POSITION_LIMIT),
      y: Number.isFinite(y) ? clamp(y, GALAXY_MIN_Y, GALAXY_MAX_Y) : null,
      z: clamp(z, -GALAXY_POSITION_LIMIT, GALAXY_POSITION_LIMIT),
      yaw: normalizeYaw(yaw),
      scale: clamp(Number(connection.scale) || .28, .14, .7),
      equipment: normalizeExplorationKit(connection.equipment),
      movementMode: normalizeMovementMode(connection.movementMode),
      lastSeenMs: Number(connection.updatedAtMs),
      speech: speech?.text ? speech : null,
    })
    return players
  }, [])
  .sort((first, second) => second.lastSeenMs - first.lastSeenMs)

export function useGalaxyWorldPresence({
  enabled = false,
  roomOwnerUid = '',
  uid = '',
  displayName = '',
  sendSpeechRequest = null,
} = {}) {
  const [remotePlayers, setRemotePlayers] = useState([])
  const [ownSpeech, setOwnSpeech] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [presenceError, setPresenceError] = useState('')
  const connectionRef = useRef(null)
  const isConnectedRef = useRef(false)
  const rawPlayersRef = useRef({})
  const activeRemoteUidsRef = useRef(new Set())
  const latestPositionRef = useRef({ x: 0, y: 0, z: 5, yaw: 0, scale: .28 })
  const lastSentPositionRef = useRef(null)
  const pendingPositionRef = useRef(null)
  const positionTimerRef = useRef(null)
  const lastPositionSentAtRef = useRef(0)
  const latestDisplayNameRef = useRef('탐사원')
  const speechTimerRef = useRef(null)
  const latestSpeechIdRef = useRef('')
  const serverTimeOffsetRef = useRef(0)
  const remoteRefreshTimerRef = useRef(null)

  const safeRoomOwnerUid = useMemo(() => safePathSegment(roomOwnerUid), [roomOwnerUid])
  const safeUid = useMemo(() => safePathSegment(uid), [uid])
  const roomPlayersPath = useMemo(() => (
    safeRoomOwnerUid ? `galaxyWorldRooms/${safeRoomOwnerUid}/players` : ''
  ), [safeRoomOwnerUid])

  const getServerNowMs = useCallback(() => Date.now() + serverTimeOffsetRef.current, [])

  const refreshRemotePlayers = useCallback((nowMs = getServerNowMs()) => {
    const nextPlayers = normalizeRemotePlayers(rawPlayersRef.current, safeUid, nowMs)
    activeRemoteUidsRef.current = new Set(nextPlayers.map((player) => safePathSegment(player.uid)))
    setRemotePlayers(nextPlayers)
  }, [getServerNowMs, safeUid])

  const scheduleRemoteRefresh = useCallback(() => {
    if (remoteRefreshTimerRef.current) return
    remoteRefreshTimerRef.current = window.setTimeout(() => {
      remoteRefreshTimerRef.current = null
      refreshRemotePlayers()
    }, REMOTE_REFRESH_COALESCE_MS)
  }, [refreshRemotePlayers])

  const flushPendingPosition = useCallback(() => {
    window.clearTimeout(positionTimerRef.current)
    positionTimerRef.current = null
    const next = pendingPositionRef.current
    if (!next) return
    pendingPositionRef.current = null
    latestPositionRef.current = next
    lastSentPositionRef.current = next
    lastPositionSentAtRef.current = Date.now()
    if (!connectionRef.current || !isConnectedRef.current) return
    update(connectionRef.current, {
      ...next,
      updatedAtMs: serverTimestamp(),
    }).catch((error) => console.warn('Failed to update galaxy world position', error))
  }, [])

  const updatePosition = useCallback((position) => {
    const next = normalizePosition(position)
    if (!next) return false
    latestPositionRef.current = next
    const comparisonPosition = pendingPositionRef.current || lastSentPositionRef.current
    if (!hasSignificantPositionChange(comparisonPosition, next)) return false
    pendingPositionRef.current = next
    const waitMs = Math.max(0, POSITION_THROTTLE_MS - (Date.now() - lastPositionSentAtRef.current))
    if (waitMs === 0) flushPendingPosition()
    else if (!positionTimerRef.current) {
      positionTimerRef.current = window.setTimeout(flushPendingPosition, waitMs)
    }
    return true
  }, [flushPendingPosition])

  const sendSpeech = useCallback(async (targetUid, text) => {
    const safeTargetUid = safePathSegment(targetUid)
    const message = cleanText(text, 80)
    if (
      !enabled
      || !connectionRef.current
      || !isConnectedRef.current
      || !safeTargetUid
      || safeTargetUid === safeUid
      || !activeRemoteUidsRef.current.has(safeTargetUid)
      || !message
    ) return false

    const activeConnectionRef = connectionRef.current
    if (typeof sendSpeechRequest !== 'function' || !activeConnectionRef.key) return false
    let speech = null
    try {
      const result = await sendSpeechRequest({
        roomOwnerUid,
        targetUid: cleanText(targetUid, 180),
        connectionId: activeConnectionRef.key,
        text: message,
      })
      speech = result?.speech || null
      if (!speech?.id || !speech?.text || Number(speech.expiresAtMs || 0) <= 0) {
        throw new Error('서버에서 유효한 휘발 대화 응답을 받지 못했습니다.')
      }
    } catch (error) {
      console.warn('Failed to send galaxy world speech', error)
      setPresenceError(error?.message || '실시간 대화를 전송하지 못했습니다.')
      return false
    }
    if (connectionRef.current !== activeConnectionRef || !isConnectedRef.current) {
      remove(activeConnectionRef).catch(() => {})
      return false
    }

    latestSpeechIdRef.current = speech.id
    setOwnSpeech(speech)
    setPresenceError('')
    window.clearTimeout(speechTimerRef.current)
    const remainingMs = Number(speech.expiresAtMs) - getServerNowMs()
    const clearDelayMs = remainingMs > 0 && remainingMs <= 10_000 ? remainingMs : SPEECH_LIFETIME_MS
    speechTimerRef.current = window.setTimeout(() => {
      if (latestSpeechIdRef.current !== speech.id) return
      latestSpeechIdRef.current = ''
      setOwnSpeech(null)
      if (connectionRef.current && isConnectedRef.current) {
        update(connectionRef.current, { speech: null, updatedAtMs: serverTimestamp() })
          .catch((error) => console.warn('Failed to clear galaxy world speech', error))
      }
    }, clearDelayMs)
    return true
  }, [enabled, getServerNowMs, roomOwnerUid, safeUid, sendSpeechRequest])

  useEffect(() => {
    latestDisplayNameRef.current = cleanText(displayName || '탐사원', 40) || '탐사원'
    if (!connectionRef.current || !isConnectedRef.current) return
    update(connectionRef.current, {
      displayName: latestDisplayNameRef.current,
      updatedAtMs: serverTimestamp(),
    }).catch((error) => console.warn('Failed to update galaxy world display name', error))
  }, [displayName])

  useEffect(() => {
    const serverOffsetRef = ref(realtimeDb, '.info/serverTimeOffset')
    return onValue(serverOffsetRef, (snapshot) => {
      const offsetMs = Number(snapshot.val())
      serverTimeOffsetRef.current = Number.isFinite(offsetMs) ? offsetMs : 0
      scheduleRemoteRefresh()
    })
  }, [scheduleRemoteRefresh])

  useEffect(() => {
    let cancelled = false
    window.clearTimeout(positionTimerRef.current)
    window.clearTimeout(speechTimerRef.current)
    positionTimerRef.current = null
    speechTimerRef.current = null
    pendingPositionRef.current = null
    lastSentPositionRef.current = null
    lastPositionSentAtRef.current = 0
    latestSpeechIdRef.current = ''
    isConnectedRef.current = false
    queueMicrotask(() => {
      if (cancelled) return
      setOwnSpeech(null)
      setIsConnected(false)
    })
    if (!enabled || !roomPlayersPath || !safeUid) return () => { cancelled = true }

    const connectionsRef = ref(realtimeDb, `${roomPlayersPath}/${safeUid}/connections`)
    const currentConnectionRef = push(connectionsRef)
    const connectedRef = ref(realtimeDb, '.info/connected')
    const disconnectRegistration = onDisconnect(currentConnectionRef)
    connectionRef.current = currentConnectionRef

    const writeConnection = async () => {
      await disconnectRegistration.remove()
      if (cancelled || connectionRef.current !== currentConnectionRef) return
      await set(currentConnectionRef, {
        uid: cleanText(uid, 180),
        displayName: latestDisplayNameRef.current,
        ...latestPositionRef.current,
        speech: null,
        connectedAtMs: serverTimestamp(),
        updatedAtMs: serverTimestamp(),
      })
      if (cancelled || connectionRef.current !== currentConnectionRef) {
        remove(currentConnectionRef).catch(() => {})
        return
      }
      lastSentPositionRef.current = latestPositionRef.current
      lastPositionSentAtRef.current = Date.now()
      isConnectedRef.current = true
      setIsConnected(true)
      setPresenceError('')
    }

    const unsubscribeConnected = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() !== true) {
        isConnectedRef.current = false
        setIsConnected(false)
        return
      }
      writeConnection().catch((error) => {
        if (cancelled) return
        console.warn('Failed to establish galaxy world presence', error)
        isConnectedRef.current = false
        setIsConnected(false)
        setPresenceError('게임 월드 실시간 연결을 시작하지 못했습니다.')
      })
    })
    const heartbeat = window.setInterval(() => {
      if (!connectionRef.current || !isConnectedRef.current) return
      update(connectionRef.current, { updatedAtMs: serverTimestamp() })
        .catch((error) => console.warn('Failed to refresh galaxy world presence', error))
    }, HEARTBEAT_MS)

    return () => {
      cancelled = true
      unsubscribeConnected()
      window.clearInterval(heartbeat)
      window.clearTimeout(positionTimerRef.current)
      window.clearTimeout(speechTimerRef.current)
      positionTimerRef.current = null
      speechTimerRef.current = null
      latestSpeechIdRef.current = ''
      isConnectedRef.current = false
      if (connectionRef.current === currentConnectionRef) connectionRef.current = null
      disconnectRegistration.cancel().catch(() => {})
      remove(currentConnectionRef).catch(() => {})
    }
  }, [enabled, roomPlayersPath, safeUid, uid])

  useEffect(() => {
    let cancelled = false
    rawPlayersRef.current = {}
    activeRemoteUidsRef.current = new Set()
    window.clearTimeout(remoteRefreshTimerRef.current)
    remoteRefreshTimerRef.current = null
    queueMicrotask(() => {
      if (!cancelled) setRemotePlayers([])
    })
    if (!enabled || !roomPlayersPath || !safeUid) return () => { cancelled = true }
    const playersRef = ref(realtimeDb, roomPlayersPath)
    const handlePlayerUpdate = (snapshot) => {
      if (!snapshot.key) return
      rawPlayersRef.current[snapshot.key] = snapshot.val() || {}
      scheduleRemoteRefresh()
      setPresenceError('')
    }
    const handlePlayerRemove = (snapshot) => {
      if (!snapshot.key) return
      delete rawPlayersRef.current[snapshot.key]
      scheduleRemoteRefresh()
    }
    const handleReadError = (error) => {
      console.warn('Failed to subscribe galaxy world players', error)
      rawPlayersRef.current = {}
      activeRemoteUidsRef.current = new Set()
      setRemotePlayers([])
      setPresenceError('게임 월드의 온라인 친구를 불러오지 못했습니다.')
    }
    const unsubscribeAdded = onChildAdded(playersRef, handlePlayerUpdate, handleReadError)
    const unsubscribeChanged = onChildChanged(playersRef, handlePlayerUpdate, handleReadError)
    const unsubscribeRemoved = onChildRemoved(playersRef, handlePlayerRemove, handleReadError)
    const staleSweep = window.setInterval(() => refreshRemotePlayers(), STALE_SWEEP_MS)
    return () => {
      cancelled = true
      unsubscribeAdded()
      unsubscribeChanged()
      unsubscribeRemoved()
      window.clearInterval(staleSweep)
      window.clearTimeout(remoteRefreshTimerRef.current)
      remoteRefreshTimerRef.current = null
    }
  }, [enabled, refreshRemotePlayers, roomPlayersPath, safeUid, scheduleRemoteRefresh])

  useEffect(() => () => {
    window.clearTimeout(positionTimerRef.current)
    window.clearTimeout(speechTimerRef.current)
    window.clearTimeout(remoteRefreshTimerRef.current)
  }, [])

  return {
    remotePlayers,
    ownSpeech,
    isConnected,
    presenceError,
    updatePosition,
    sendSpeech,
  }
}
