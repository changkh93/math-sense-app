import React, { useState, useEffect, useRef, useCallback, useImperativeHandle } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import SpaceQuizView from './SpaceQuizView'
import WorkbookPlayer from './WorkbookPlayer'
import CodeTracePlayer from './CodeTracePlayer'
import QuestionModal from '../QuestionModal'
import soundManager from '../../utils/SoundManager'
import { InlineMath } from 'react-katex'
import 'katex/dist/katex.min.css'
import MissionMarkdownViewer from './MissionMarkdownViewer'
import UnitLeaderboard from './UnitLeaderboard'
import TimeAttackOverlay from './TimeAttackOverlay'
import { db, getFunctionUrl } from '../../firebase'
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp, increment } from 'firebase/firestore'
import { useAuth } from '../../hooks/useAuth'
import { useCodeExercises } from '../../hooks/useContent'
import { calculateGrowthUpdates } from '../../utils/rankingUtils'
import { isRadarActive } from '../../utils/streakUtils'

// Mock Data for demonstration - In production this would come from Firestore
// (Mock data removed — use only real Firestore data)

// ─── PDF URL Transformer (Google Drive support) ───
const getEmbeddablePdfUrl = (url) => {
  if (!url) return null;
  // Handle Google Drive /view links
  const driveViewMatch = url.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/);
  if (driveViewMatch && driveViewMatch[1]) {
    return `https://drive.google.com/file/d/${driveViewMatch[1]}/preview`;
  }
  return url;
};

// ─── Silent Crystal Toast ───
const SilentCrystalToast = ({ amount, visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.8 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.8rem 1.2rem',
          background: 'rgba(0, 243, 255, 0.15)',
          border: '1px solid rgba(0, 243, 255, 0.3)',
          borderRadius: '12px',
          backdropFilter: 'blur(10px)',
          zIndex: 9999,
          pointerEvents: 'none'
        }}
      >
        <motion.div
          animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.3, 1] }}
          transition={{ duration: 0.6 }}
          style={{ fontSize: '1.5rem' }}
        >
          {amount > 0 ? '💎' : '✅'}
        </motion.div>
        <span className="font-title" style={{ 
          color: 'var(--crystal-cyan)', 
          fontSize: '1.2rem',
          textShadow: '0 0 10px rgba(0, 243, 255, 0.5)'
        }}>
          {amount > 0 ? `+${amount}` : '시청 위치 저장됨'}
        </span>
      </motion.div>
    )}
  </AnimatePresence>
)

const LONG_VIDEO_SECONDS = 40 * 60
const STANDARD_VIDEO_COMPLETION_THRESHOLD = 0.95
const LONG_VIDEO_COMPLETION_THRESHOLD = 0.85
const VIDEO_PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2]
const QA_ROOM_URL = 'https://meet.google.com/qzg-psru-qnc'

const getVideoCompletionThreshold = (duration = 0) => (
  duration > LONG_VIDEO_SECONDS
    ? LONG_VIDEO_COMPLETION_THRESHOLD
    : STANDARD_VIDEO_COMPLETION_THRESHOLD
)

const getVideoCompletionTargetPercent = (duration = 0) => (
  Math.round(getVideoCompletionThreshold(duration) * 100)
)

const getTodayKSTDate = () => {
  const now = new Date()
  const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000))
  return kst.toISOString().slice(0, 10)
}

const getNextTimeAttackDelay = (isFirst = false) => {
  const minSeconds = 120
  const maxSeconds = isFirst ? 180 : 300
  return minSeconds + Math.floor(Math.random() * (maxSeconds - minSeconds + 1))
}

const getYouTubeVideoId = (value = '') => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw
  const patterns = [
    /(?:youtube[.]com[/]watch[?]v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube[.]com[/]embed[/])([a-zA-Z0-9_-]{11})/,
    /(?:youtube[.]com[/]shorts[/])([a-zA-Z0-9_-]{11})/,
    /(?:youtu[.]be[/])([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = raw.match(pattern)
    if (match?.[1]) return match[1]
  }
  return raw
}

const getNormalizedVideoRange = (start = 0, end = 0) => {
  const normalizedStart = Math.max(0, Math.floor(Number(start) || 0))
  const normalizedEnd = Math.max(0, Math.floor(Number(end) || 0))

  return {
    start: normalizedStart,
    end: normalizedEnd > normalizedStart ? normalizedEnd : undefined,
  }
}

const buildYouTubeEmbedUrl = ({ videoId, start = 0, end, autoPlay = true }) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const range = getNormalizedVideoRange(start, end)
  const params = new URLSearchParams({
    start: String(range.start),
    autoplay: autoPlay ? '1' : '0',
    controls: '1',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1',
  })
  if (origin) params.set('origin', origin)
  if (range.end) params.set('end', String(range.end))
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

// ─── YouTube Player Component ───
// Memoized to prevent re-rendering when parent state (like saveStatus or stampCount) changes
const YoutubePlayer = React.memo(React.forwardRef(({ videoId, start, end, onComplete, onTimeUpdate, onPlaybackStateChange, onTrackingStatus, onError, initialPlaybackRate = 1, isOverlay = false, autoPlay = true }, ref) => {
  const normalizedVideoId = getYouTubeVideoId(videoId)
  const playerRef = useRef(null)
  const wrapperRef = useRef(null)
  const [hasError, setHasError] = useState(false)
  const [apiTimedOut, setApiTimedOut] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const timeUpdateInterval = useRef(null)
  const playerTargetId = useRef(`yt-player-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)
  const { start: normalizedStart, end: normalizedEnd } = getNormalizedVideoRange(start, end)
  const initialPlaybackRateRef = useRef(initialPlaybackRate)

  useEffect(() => {
    initialPlaybackRateRef.current = initialPlaybackRate
  }, [initialPlaybackRate])

  useImperativeHandle(ref, () => ({
    pauseVideo: () => {
      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo()
        // Proactive sync right after pause
        setCurrentTime(playerRef.current.getCurrentTime())
        if (playerRef.current.getDuration) {
          setDuration(playerRef.current.getDuration())
        }
      }
    },
    getCurrentTime: () => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        return playerRef.current.getCurrentTime()
      }
      return currentTime
    },
    setPlaybackRate: (rate) => {
      if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
        playerRef.current.setPlaybackRate(rate)
      }
    },
    getPlaybackRate: () => {
      if (playerRef.current && typeof playerRef.current.getPlaybackRate === 'function') {
        return playerRef.current.getPlaybackRate()
      }
      return 1
    }
  }))

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        try {
          playerRef.current.pauseVideo()
        } catch (e) {
          console.error("Failed to pause video on visibility change", e)
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const tabIdRef = useRef(Math.random().toString(36).substring(2, 9))
  const channelRef = useRef(null)

  useEffect(() => {
    if (window.BroadcastChannel) {
      const channel = new BroadcastChannel('math_sense_video_sync')
      channelRef.current = channel

      channel.onmessage = (event) => {
        if (event.data.type === 'START_PLAYING' && event.data.tabId !== tabIdRef.current) {
          if (playerRef.current && typeof playerRef.current.getPlayerState === 'function') {
            const state = playerRef.current.getPlayerState()
            if (state === window.YT?.PlayerState?.PLAYING) {
              playerRef.current.pauseVideo()
              console.warn("Paused video because another tab started streaming.")
            }
          }
        }
      }
    }
    return () => {
      if (channelRef.current) channelRef.current.close()
    }
  }, [])

  // Use a ref for onTimeUpdate to prevent stale closures in the player's intervals
  const onTimeUpdateRef = useRef(onTimeUpdate)
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate
  }, [onTimeUpdate])

  const onTrackingStatusRef = useRef(onTrackingStatus)
  useEffect(() => {
    onTrackingStatusRef.current = onTrackingStatus
  }, [onTrackingStatus])

  useEffect(() => {
    setHasError(false)
    setApiTimedOut(false)
    if (!normalizedVideoId) {
      setHasError(true)
      return undefined
    }

    const apiTimeout = setTimeout(() => {
      if (!playerRef.current) {
        console.warn('YouTube iframe API did not initialize in time. Falling back to plain iframe.', { videoId: normalizedVideoId })
        onTrackingStatusRef.current?.({
          event: 'api_timeout',
          apiReady: false,
          apiTimedOut: true,
          fallbackIframe: true,
          videoId: normalizedVideoId
        })
        setApiTimedOut(true)
      }
    }, 7000)

    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    }

    const initPlayer = () => {
      if (!wrapperRef.current) return;
      
      // Create a target div for YouTube to replace (keeps React's DOM clean)
      const targetDiv = document.createElement('div')
      targetDiv.id = playerTargetId.current
      targetDiv.style.width = '100%'
      targetDiv.style.height = '100%'
      wrapperRef.current.innerHTML = ''
      wrapperRef.current.appendChild(targetDiv)
      
      const player = new window.YT.Player(playerTargetId.current, {
        height: '100%',
        width: '100%',
        videoId: normalizedVideoId,
        playerVars: {
          start: normalizedStart,
          ...(normalizedEnd ? { end: normalizedEnd } : {}),
          autoplay: autoPlay ? 1 : 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin
        },
        events: {
          'onReady': () => {
            clearTimeout(apiTimeout)
            if (typeof player.setPlaybackRate === 'function') {
              player.setPlaybackRate(initialPlaybackRateRef.current)
            }
            onTrackingStatusRef.current?.({
              event: 'api_ready',
              apiReady: true,
              apiTimedOut: false,
              fallbackIframe: false,
              videoId: normalizedVideoId
            })
            // Start continuous time tracking as soon as player is ready
            if (timeUpdateInterval.current) clearInterval(timeUpdateInterval.current)
            timeUpdateInterval.current = setInterval(() => {
              if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                const curr = playerRef.current.getCurrentTime()
                const dur = playerRef.current.getDuration ? playerRef.current.getDuration() : 0
                const rate = playerRef.current.getPlaybackRate ? playerRef.current.getPlaybackRate() : 1
                
                setCurrentTime(curr)
                setDuration(dur)
                
                // Use the ref here to avoid getting stuck with initial/null context
                if (onTimeUpdateRef.current) {
                  onTimeUpdateRef.current({ currentTime: curr, duration: dur, playbackRate: rate })
                }
              }
            }, 200) 
          },
          'onStateChange': (event) => {
            onTrackingStatusRef.current?.({
              event: 'player_state',
              playerState: event.data,
              videoId: normalizedVideoId
            })
            if (onPlaybackStateChange) {
              onPlaybackStateChange(event.data)
            }
            if (event.data === window.YT.PlayerState.PLAYING) {
              if (channelRef.current) {
                channelRef.current.postMessage({ type: 'START_PLAYING', tabId: tabIdRef.current })
              }
            }
            if (event.data === window.YT.PlayerState.ENDED) {
              if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                const curr = playerRef.current.getCurrentTime()
                const dur = playerRef.current.getDuration ? playerRef.current.getDuration() : 0
                const rate = playerRef.current.getPlaybackRate ? playerRef.current.getPlaybackRate() : 1
                if (onTimeUpdateRef.current) onTimeUpdateRef.current({ currentTime: curr, duration: dur, playbackRate: rate })
              }
              if (onComplete) onComplete()
            }
          },
          'onError': (event) => {
            console.error("YouTube Player Error:", event.data)
            onTrackingStatusRef.current?.({
              event: 'player_error',
              playerError: event.data,
              videoId: normalizedVideoId
            })
            setHasError(true)
            if (onError) onError(event.data)
          }
        }
      })
      playerRef.current = player
    }

    if (window.YT && window.YT.Player) {
      initPlayer()
    } else {
      const checkYT = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkYT)
          initPlayer()
        }
      }, 100)
      return () => {
        clearTimeout(apiTimeout)
        clearInterval(checkYT)
        if (timeUpdateInterval.current) clearInterval(timeUpdateInterval.current)
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          try { playerRef.current.destroy() } catch (e) {}
          playerRef.current = null
        }
        if (wrapperRef.current) wrapperRef.current.innerHTML = ''
      }
    }

    return () => {
      clearTimeout(apiTimeout)
      if (timeUpdateInterval.current) clearInterval(timeUpdateInterval.current)
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try { playerRef.current.destroy() } catch (e) { /* ignore */ }
        playerRef.current = null
      }
      if (wrapperRef.current) {
        wrapperRef.current.innerHTML = ''
      }
    }
  }, [normalizedVideoId, normalizedStart, normalizedEnd, autoPlay])

  if (apiTimedOut && normalizedVideoId) {
    return (
      <iframe
        src={buildYouTubeEmbedUrl({ videoId: normalizedVideoId, start, end, autoPlay })}
        title="YouTube video player"
        style={{ width: '100%', height: '100%', border: 0, borderRadius: '15px', background: '#000' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    )
  }

  if (hasError) {
    const directWatchUrl = `https://www.youtube.com/watch?v=${normalizedVideoId}${start ? `&t=${start}` : ''}`
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 10, 25, 0.95)', color: '#fff', borderRadius: '15px', padding: '2rem', textAlign: 'center', border: '1px solid var(--alert-red)', boxSizing: 'border-box' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚠️</div>
        <h3 className="font-title" style={{ margin: 0, color: 'var(--alert-red)', fontSize: '1.4rem' }}>영상 전송 오류 (교신 장애)</h3>
        
        <div style={{ maxWidth: '480px', margin: '1rem 0', padding: '1rem', background: 'rgba(255, 77, 77, 0.08)', border: '1px solid rgba(255, 77, 77, 0.2)', borderRadius: '8px', fontSize: '0.9rem', lineHeight: '1.6', color: '#e2e8f0', textAlign: 'left' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#ffb3b3' }}>
            💡 구글 자녀 계정(Family Link) 및 제한 모드 안내
          </p>
          <p style={{ margin: 0 }}>
            구글 자녀 계정, 학교 계정, 또는 브라우저의 YouTube 제한 모드가 켜져 있는 경우, 보안 정책으로 인해 타사 사이트의 임베드 재생이 제한될 수 있습니다.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%', maxWidth: '320px', marginTop: '0.5rem' }}>
          <a
            href={directWatchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hud-btn primary glass"
            style={{
              padding: '0.8rem 1.5rem',
              background: 'rgba(0, 243, 255, 0.2)',
              border: '2px solid var(--crystal-cyan)',
              color: 'var(--text-bright)',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '1rem',
              display: 'inline-block',
              cursor: 'pointer'
            }}
          >
            📺 YouTube에서 직접 보기
          </a>
        </div>
        
        <p className="font-tech" style={{ marginTop: '1.2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          ※ YouTube에서 영상을 보신 후, 플레이어 하단의 <b>[수동 완료 처리]</b>를 누르시면 다음 단계로 진행하실 수 있습니다.
        </p>
      </div>
    )
  }

  // Helper to format time
  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  // Determine which thumbnail to show based on progress (YouTube usually has 1, 2, 3 as segment snapshots)
  const getThumbType = () => {
    if (!duration) return 'hqdefault'
    const progress = currentTime / duration
    if (progress < 0.3) return 'hq1'
    if (progress < 0.7) return 'hq2'
    return 'hq3'
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '15px', overflow: 'hidden' }}>
      <div ref={wrapperRef} className="yt-iframe-wrapper" style={{ width: '100%', height: '100%' }} />
      <div 
        className="yt-placeholder" 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          backgroundImage: `url(https://img.youtube.com/vi/${normalizedVideoId}/${getThumbType()}.jpg)`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          zIndex: 10,
          display: 'none', // Managed by body.is-capturing in CSS
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }} 
      >
        <div 
          className="capture-hide"
          style={{ 
            background: 'rgba(0,0,0,0.8)', 
            color: 'var(--crystal-cyan)', 
            padding: '1.5rem 2.5rem', 
            borderRadius: '15px', 
            border: '1px solid var(--neon-blue)',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 700 }}>
            우주 전송 데이터 캡처 중
          </div>
          <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-tech)', letterSpacing: '2px' }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    </div>
  )
}))

// ─── Reward Potential Modal (moved from SpaceHome) ───
function RewardPotentialModal({ unit, onCancel, onConfirm, isMobile }) {
  const isPerfect = unit.bestScore === 100

  return (
    <motion.div 
      className="modal-overlay space-hud"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ 
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 4000,
        background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0.5rem' : '1rem'
      }}
    >
      <motion.div 
        className="glass-card hud-border"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        style={{ 
          padding: isMobile ? '1.5rem 1.2rem' : '2.5rem', 
          maxWidth: '450px', 
          width: '95%', 
          maxHeight: '90vh',
          overflowY: 'auto',
          textAlign: 'center', 
          background: 'rgba(5, 10, 25, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '0.8rem' : '1.2rem'
        }}
      >
        <div style={{ fontSize: isMobile ? '2.2rem' : '3rem', marginBottom: '0.2rem' }}>{isPerfect ? '🛰️' : '💎'}</div>
        <h2 className="font-title" style={{ color: 'var(--text-bright)', fontSize: isMobile ? '1.2rem' : '1.5rem', margin: 0, lineHeight: '1.3' }}>
          {unit.title}
        </h2>
        
        <div className="glass-card" style={{ padding: isMobile ? '0.8rem' : '1.2rem', background: 'rgba(255,255,255,0.05)', margin: 0 }}>
          <p className="font-tech" style={{ color: 'var(--text-muted)', marginBottom: '0.2rem', fontSize: '0.8rem' }}>현재 최고 기록</p>
          <div style={{ fontSize: isMobile ? '1.6rem' : '2rem', fontWeight: 900, color: isPerfect ? 'var(--star-gold)' : 'var(--crystal-cyan)' }}>
            {unit.bestScore !== undefined ? `${unit.bestScore}점` : '기록 없음'}
          </div>
        </div>

        {/* Action Buttons: Positioned directly under "현재 최고 기록" as requested */}
        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.2rem' }}>
          <button 
            className="hud-btn secondary glass"
            style={{ flex: 1, padding: isMobile ? '0.8rem' : '1rem', borderRadius: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: isMobile ? '0.9rem' : '1rem' }}
            onClick={onCancel}
          >
            취소 (BACK)
          </button>
          <button 
            className="hud-btn primary glass"
            style={{ flex: 1.5, padding: isMobile ? '0.8rem' : '1rem', borderRadius: '10px', cursor: 'pointer', background: 'rgba(0, 243, 255, 0.2)', border: '1px solid var(--neon-blue)', color: 'white', fontWeight: 700, fontSize: isMobile ? '0.9rem' : '1rem' }}
            onClick={onConfirm}
          >
            탐사 시작 (START)
          </button>
        </div>

        {/* Explanation Text: Positioned at the bottom */}
        <div style={{ textAlign: 'left', padding: '0 0.2rem', fontSize: isMobile ? '0.85rem' : '0.9rem' }}>
          {isPerfect ? (
            <div style={{ padding: '0.8rem', borderLeft: '3px solid #ff4d4d', background: 'rgba(255, 77, 77, 0.1)' }}>
              <p style={{ color: '#ffb3b3', margin: 0, lineHeight: '1.4' }}>
                ⚠️ **이미 100점을 획득한 단원입니다.**<br/>
                학습을 위한 반복 탐사는 가능하지만, 추가적인 메타 광석 보상은 지급되지 않습니다.
              </p>
            </div>
          ) : unit.bestScore > 0 ? (
            <div style={{ padding: '0.8rem', borderLeft: '3px solid var(--star-gold)', background: 'rgba(255, 215, 0, 0.1)' }}>
              <p style={{ color: '#ffeaa7', margin: 0, lineHeight: '1.4' }}>
                💡 **성적 경신 보상 시스템 가동 중**<br/>
                현재 최고 점수인 **{unit.bestScore}점**을 초과하여 기록을 경신할 경우, 그 차이만큼의 메타 광석을 비례하여 획득할 수 있습니다.
              </p>
            </div>
          ) : (
            <div style={{ padding: '0.8rem', borderLeft: '3px solid var(--planet-green)', background: 'rgba(0, 255, 136, 0.1)' }}>
              <p style={{ color: '#b2fcca', margin: 0, lineHeight: '1.4' }}>
                ✨ **첫 탐사 보상 대기 중**<br/>
                이 단원의 첫 번째 탐사입니다. 획득한 모든 메타 광석과 만점 보너스(10개)를 온전히 획득할 수 있습니다!
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}


// ══════════════════════════════════════════════════════
// ═══ MAIN COMPONENT ═════════════════════════════════
// ══════════════════════════════════════════════════════
export default function MissionHub({ 
  unitId, 
  onComplete, 
  onBack, 
  activeUnit, // passed from SpaceHome
  userData,
  unitQuizzes, // passed from SpaceHome (may be null while loading)
  loadingQuizzes,
  errorQuizzes,
  refetchQuizzes,
  bestScores = {}, // passed from SpaceHome
  initialMode = 'briefing', // pre-computed by SpaceHome: 'briefing', 'text', 'video', 'quiz-modal'
  onNonQuizActivityComplete,
  clusterId // added to handle cluster-specific UI
}) {
  const { user } = useAuth()
  const userId = user?.uid
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [videoError, setVideoError] = useState(false)
  const {
    data: codeExercises = [],
    isLoading: loadingCodeExercises
  } = useCodeExercises(unitId)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Keep a ref to userData to avoid stale closures in useCallback/useEffect
  const userDataRef = useRef(userData)
  useEffect(() => { userDataRef.current = userData }, [userData])
  const [currentMode, internalSetCurrentMode] = useState(() => {
    const savedMode = sessionStorage.getItem(`metasense_hub_mode_${unitId}`);
    return savedMode || (initialMode === 'quiz-modal' ? 'briefing' : initialMode);
  });

  // Persistence for mode
  const updateCurrentMode = (mode) => {
    internalSetCurrentMode(mode);
    if (mode) sessionStorage.setItem(`metasense_hub_mode_${unitId}`, mode);
    else sessionStorage.removeItem(`metasense_hub_mode_${unitId}`);
  };

  const [missionData, setMissionData] = useState(null)
  const [showOverlay, setShowOverlay] = useState(false) 
  const [overlayContent, setOverlayContent] = useState('text')
  const [overlayReference, setOverlayReference] = useState(null)
  const [selectedTx, setSelectedTx] = useState(null)
  
  // Persist selected transmission ID
  useEffect(() => {
    if (selectedTx) {
      sessionStorage.setItem(`metasense_hub_tx_${unitId}`, selectedTx.id || 'default');
    } else {
      sessionStorage.removeItem(`metasense_hub_tx_${unitId}`);
    }
  }, [selectedTx, unitId])

  // ─── Question Modal State ───
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [questionContext, setQuestionContext] = useState(null)
  
  // Video Progress Refs
  const videoPrevTxIdRef = useRef(null)
  const videoPlayerRef = useRef(null)
  const autoSaveIntervalRef = useRef(null)
  const lastVideoTimeRef = useRef(null)
  const lastPollTimeRef = useRef(Date.now())
  const videoCompletedRef = useRef(false)
  const videoCompletionBonusGivenRef = useRef(false)
  const stampedSetRef = useRef(new Set())
  const newStampCountRef = useRef(0)
  const totalTimeSpentRef = useRef(0)
  const dailyTimeSpentRef = useRef(0)
  const dailyTimeSpentDateRef = useRef(getTodayKSTDate())
  const lastSyncedTimeSpentRef = useRef(0)
  const totalRewardedCrystalsRef = useRef(0)
  const idTokenRef = useRef(null)
  const isVideoProcessingRef = useRef(false)
  const lastActivityTimeRef = useRef(Date.now())
  const loadedTxIdRef = useRef(null) // Track which video was last loaded to prevent overwrite loops
  const lastInitializedTxIdRef = useRef(null)
  const videoTrackingStatusRef = useRef({
    apiReady: false,
    apiTimedOut: false,
    fallbackIframe: false,
    playerState: null,
    playerError: null,
    lastTimeUpdateAt: null,
    lastForwardPlaybackAt: null,
    inferredPlayback: false
  })
  const inferredPlaybackLoggedRef = useRef(false)
  const trackingStallLoggedRef = useRef(false)
  
  // ─── Time Attack State ───
  const [showTimeAttack, setShowTimeAttack] = useState(false);
  const showTimeAttackRef = useRef(false);
  const [timeAttackCombo, setTimeAttackCombo] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const isVideoPlayingRef = useRef(false);
  const nextAttackTimeRef = useRef(null);
  const activeVideoSecondsRef = useRef(0);
  const sessionStartTimeRef = useRef(Date.now());
  const completionCrystalTriggeredRef = useRef(false);
  const timeAttackComboRef = useRef(0);
  const timeAttackCrystalsSessionRef = useRef(0);
  const timeAttackOpportunityRef = useRef(null);
  const [completionBonusTimeLeft, setCompletionBonusTimeLeft] = useState(null);
  const completionTimerStartedRef = useRef(false);
  const [videoTrackingWarning, setVideoTrackingWarning] = useState("");
  const [videoTrackingUnavailable, setVideoTrackingUnavailable] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(() => {
    const savedRate = Number(localStorage.getItem(`metasense_video_rate_${unitId}`))
    return VIDEO_PLAYBACK_RATES.includes(savedRate) ? savedRate : 1
  });
  
  useEffect(() => {
    if (completionBonusTimeLeft === null || completionBonusTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setCompletionBonusTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [completionBonusTimeLeft]);

  // Re-consolidate remaining scattered refs
  const timerRef = useRef(null)
  const videoDurationRef = useRef(0)
  const toastTimeoutRef = useRef(null)
  const rewardLockRef = useRef(false)

  // ─── Theater Mode HUD Timer ───
  const [isUiVisible, setIsUiVisible] = useState(true);
  const idleTimerRef = useRef(null);

  const handlePlaybackRateChange = useCallback((rate) => {
    setPlaybackRate(rate)
    localStorage.setItem(`metasense_video_rate_${unitId}`, String(rate))
    videoPlayerRef.current?.setPlaybackRate?.(rate)
  }, [unitId])

  useEffect(() => {
    if (currentMode !== 'video') return
    videoPlayerRef.current?.setPlaybackRate?.(playbackRate)
  }, [currentMode, selectedTx, playbackRate])

  useEffect(() => {
    if (currentMode !== 'video') return;
    
    const handleUserActivity = () => {
      setIsUiVisible(true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setIsUiVisible(false);
      }, 3500);
    };

    handleUserActivity();

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    
    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [currentMode]);

  const handleOpenQuestionModal = (contextType) => {
    // If opening from video, pause the player
    if (contextType === 'video' && videoPlayerRef.current) {
      videoPlayerRef.current.pauseVideo()
    }

    setQuestionContext({
      type: contextType, // 'datalog' or 'video'
      unitId: unitId,
      unitTitle: activeUnit?.title,
      transmissionTitle: selectedTx?.title,
      videoId: contextType === 'video' ? selectedTx?.videoId : null,
      startTime: contextType === 'video' ? Math.floor(lastVideoTimeRef.current || 0) : null,
      pdfUrl: contextType === 'datalog' ? missionData?.learningContents?.pdfUrl : null,
      captureRootSelector: '#mission-hub-capture-area'
    })
    setIsQuestionModalOpen(true)
  }

  const handleOpenQaRoom = () => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.pauseVideo()
    }
    const qaWindow = window.open(QA_ROOM_URL, '_blank', 'noopener,noreferrer')
    if (qaWindow) qaWindow.opener = null
  }

  // ─── Field Test modal state ───
  // Only show the field test modal if we are actually in quiz-modal mode
  const [showFieldTestModal, setShowFieldTestModal] = useState(initialMode === 'quiz-modal' && currentMode === 'quiz-modal')

  // ─── Data Log reward state ───
  const [timeRemaining, setTimeRemaining] = useState(60)
  const [logTimerActive, setLogTimerActive] = useState(false)
  const [logRewardClaimed, setLogRewardClaimed] = useState(false)
  const storageKey = `datalog_timer_${userId || 'anon'}_${unitId}`

  // ─── Transmission reward state (Bitset/Checklist) ───
  const [stampCount, setStampCount] = useState(0) // For UI display
  const [creditedWatchSeconds, setCreditedWatchSeconds] = useState(0)
  const [videoCompleted, setVideoCompleted] = useState(false)
  useEffect(() => { videoCompletedRef.current = videoCompleted }, [videoCompleted])

  const [isAtEnd, internalSetIsAtEnd] = useState(false)
  const setIsAtEnd = useCallback((val) => internalSetIsAtEnd(val), [])
  
  const [videoCompletionBonusGiven, setVideoCompletionBonusGiven] = useState(false)
  useEffect(() => { videoCompletionBonusGivenRef.current = videoCompletionBonusGiven }, [videoCompletionBonusGiven])

  const [totalRewardedCrystals, setTotalRewardedCrystals] = useState(0) // For UI reactivity
  useEffect(() => {
    if (user) {
      user.getIdToken().then(t => idTokenRef.current = t)
      const interval = setInterval(() => user.getIdToken().then(t => idTokenRef.current = t), 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [user])

  const [saveStatus, setSaveStatus] = useState(null)
  // Video synchronization states
  const [initialStartPosition, setInitialStartPosition] = useState(null)
  const [resumePosStr, setResumePosStr] = useState("")
  
  // ─── Silent Toast ───
  const [toastVisible, setToastVisible] = useState(false)
  const [toastAmount, setToastAmount] = useState(0)
  const [rewardLimitNotice, setRewardLimitNotice] = useState("")
  const rewardLimitNoticeTimeoutRef = useRef(null)

  // ─── Learning Progress (Firestore) ───
  const [learningProgress, setLearningProgress] = useState(null)
  const [loadingProgress, setLoadingProgress] = useState(true)
  const initialProgressRef = useRef(null) // Immutable snapshot from initial getDoc (not affected by auto-save)
  
  // Load learning progress from Firestore with real-time sync
  useEffect(() => {
    if (!userId || !unitId) {
      setLoadingProgress(false)
      return
    }

    const progressRef = doc(db, 'users', userId, 'learning_progress', unitId)
    
    // Switch to onSnapshot for real-time reactivity (fixes stale state issues)
    const unsubscribe = onSnapshot(progressRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setLearningProgress(data)
        
        // Only set initial snapshot once for restoration effect
        if (!initialProgressRef.current) {
          initialProgressRef.current = data
        }

        // Restore global completion states (Data Log)
        if (data.logRead) setLogRewardClaimed(true)
      }
      setLoadingProgress(false)
    }, (err) => {
      console.warn("Failed to sync learning progress", err)
      setLoadingProgress(false)
    })

    return () => unsubscribe()
  }, [userId, unitId])

  // --- Per-Transmission State Restoration ---
  // Ensure that videoCompleted state is local to the currently selected transmission
  // This must only restore once per video session (not on every snapshot)
  useEffect(() => {
    if (!selectedTx) {
      setVideoCompleted(false)
      setVideoCompletionBonusGiven(false)
      setTotalRewardedCrystals(0)
      stampedSetRef.current = new Set()
      setStampCount(0) // Reset UI
      newStampCountRef.current = 0
      totalTimeSpentRef.current = 0
      dailyTimeSpentRef.current = 0
      dailyTimeSpentDateRef.current = getTodayKSTDate()
      lastSyncedTimeSpentRef.current = 0
      setCreditedWatchSeconds(0)
      totalRewardedCrystalsRef.current = 0
      videoCompletedRef.current = false
      videoCompletionBonusGivenRef.current = false
      loadedTxIdRef.current = null

      // Reset Time Attack
      setShowTimeAttack(false);
      showTimeAttackRef.current = false;
      setTimeAttackCombo(0);
      timeAttackComboRef.current = 0;
      timeAttackCrystalsSessionRef.current = 0;
      nextAttackTimeRef.current = null;
      activeVideoSecondsRef.current = 0;
      return
    }

    const txId = selectedTx.id || 'default'
    
    // Safety: If we already loaded this video's data into the local session master (stampedSetRef),
    // do NOT let subsequent auto-save snapshots from learningProgress overwrite it.
    if (loadedTxIdRef.current === txId) return

    const txProgress = learningProgress?.videoProgress?.[txId]
    
    if (txProgress) {
      const isComp = txProgress.completed || txProgress.completionBonusGiven
      setVideoCompleted(isComp)
      setVideoCompletionBonusGiven(isComp)
      
      videoCompletedRef.current = isComp
      videoCompletionBonusGivenRef.current = isComp
      
      // Restore stamps and reward stats for the specific video
      if (txProgress.stampedSeconds) {
        stampedSetRef.current = new Set(txProgress.stampedSeconds)
        setStampCount(txProgress.stampedSeconds.length)
      }
      
      if (txProgress.totalRewardedCrystals) {
        setTotalRewardedCrystals(txProgress.totalRewardedCrystals)
        totalRewardedCrystalsRef.current = txProgress.totalRewardedCrystals
      }

      totalTimeSpentRef.current = txProgress.totalTimeSpent || 0
      lastSyncedTimeSpentRef.current = totalTimeSpentRef.current
      setCreditedWatchSeconds(Math.floor(totalTimeSpentRef.current))
      const todayKST = getTodayKSTDate()
      dailyTimeSpentDateRef.current = todayKST
      dailyTimeSpentRef.current = txProgress.todayTimeSpentDate === todayKST ? (txProgress.todayTimeSpent || 0) : 0
      
      // Mark as loaded ONLY if we have data or if it's explicitly done (prevents retrying empty data)
      loadedTxIdRef.current = txId
    } else if (loadingProgress === false) {
      // New transmission entry (only if we've finished the initial fetch)
      setVideoCompleted(false)
      setVideoCompletionBonusGiven(false)
      setTotalRewardedCrystals(0)
      stampedSetRef.current = new Set()
      setStampCount(0)
      newStampCountRef.current = 0
      totalTimeSpentRef.current = 0
      dailyTimeSpentRef.current = 0
      dailyTimeSpentDateRef.current = getTodayKSTDate()
      lastSyncedTimeSpentRef.current = 0
      setCreditedWatchSeconds(0)
      totalRewardedCrystalsRef.current = 0
      videoCompletedRef.current = false
      videoCompletionBonusGivenRef.current = false
      loadedTxIdRef.current = txId

      // Reset Time Attack
      setShowTimeAttack(false);
      showTimeAttackRef.current = false;
      setTimeAttackCombo(0);
      timeAttackComboRef.current = 0;
      timeAttackCrystalsSessionRef.current = 0;
      nextAttackTimeRef.current = null;
      activeVideoSecondsRef.current = 0;
    }
  }, [selectedTx, learningProgress, loadingProgress])

  // Load mission data
  useEffect(() => {
    const defaultTxList = activeUnit?.transmissions?.length > 0 
      ? activeUnit.transmissions 
      : (activeUnit?.videoConfig?.videoId ? [{
          id: 'legacy_tx',
          title: 'Main Transmission',
          videoId: activeUnit.videoConfig.videoId,
          start: activeUnit.videoConfig.start,
          end: activeUnit.videoConfig.end
        }] : [])

    setMissionData({
      title: activeUnit?.title || "Unknown Mission",
      videoConfig: activeUnit?.videoConfig || null,
      transmissions: defaultTxList,
      learningContents: activeUnit?.learningContents || null
    })

    // Restore selectedTx from sessionStorage if available
    const savedTxId = sessionStorage.getItem(`metasense_hub_tx_${unitId}`);
    if (savedTxId && defaultTxList.length > 0) {
      const foundTx = defaultTxList.find(tx => (tx.id || 'default') === savedTxId);
      if (foundTx) {
        setSelectedTx(foundTx);
        updateCurrentMode('video'); // Also restore mode to video if a transmission was selected
        
        // Stamp restoration is handled by the dedicated restoration effect (Part 1)
        // which runs after getDoc completes. Don't reset stamps here since
        // learningProgress is still null on mount (getDoc is async).
      } else {
        setSelectedTx(null);
        sessionStorage.removeItem(`metasense_hub_tx_${unitId}`);
      }
    } else {
      setSelectedTx(null);
    }
  }, [unitId, activeUnit])

  // Reset video-related states when video changes to ensure clean re-initialization
  useEffect(() => {
    setInitialStartPosition(null)
    if (videoPrevTxIdRef.current) videoPrevTxIdRef.current = null
    setIsAtEnd(false)
    setSaveStatus(null)
    setIsVideoPlaying(false)
    isVideoPlayingRef.current = false
    setVideoError(false)
    setVideoTrackingWarning("")
    setVideoTrackingUnavailable(false)
    videoTrackingStatusRef.current = {
      apiReady: false,
      apiTimedOut: false,
      fallbackIframe: false,
      playerState: null,
      playerError: null,
      lastTimeUpdateAt: null,
      lastForwardPlaybackAt: null,
      inferredPlayback: false
    }
    inferredPlaybackLoggedRef.current = false
    trackingStallLoggedRef.current = false
  }, [selectedTx?.id])

  // ─── Video Progress: Part 1 - Initial Restoration (Runs ONCE per video) ───
  useEffect(() => {
    if (loadingProgress || !userId || !selectedTx) return
    
    const txId = selectedTx.id || 'default'
    // ONLY run if the video has changed or the very first time progress is loaded
    if (videoPrevTxIdRef.current === txId) return
    videoPrevTxIdRef.current = txId

    const localCacheKey = `video_progress_${userId}_${unitId}_${txId}`

    // ── Gather data from BOTH sources ──
    const serverData = learningProgress?.videoProgress?.[txId] || null
    const localStampsRaw = localStorage.getItem(localCacheKey + '_stamps')
    const localStamps = localStampsRaw ? JSON.parse(localStampsRaw) : []
    const localPosRaw = localStorage.getItem(localCacheKey + '_pos')
    const localPos = localPosRaw ? parseFloat(localPosRaw) : 0
    const localUpdateTs = parseInt(localStorage.getItem(localCacheKey + '_updatedAt') || '0', 10)

    const hasServerData = serverData && (serverData.stampedSeconds?.length > 0 || serverData.lastPosition > 0)
    const hasLocalData = localStamps.length > 0 || localPos > 0

    if (hasServerData || hasLocalData) {
      // ── Merge stamps from both sources ──
      const serverStamps = serverData?.stampedSeconds || []
      stampedSetRef.current = new Set([...serverStamps, ...localStamps])
      
      const combinedStampCount = stampedSetRef.current.size
      const rewardedCount = serverData?.rewardedStampCount || 0
      newStampCountRef.current = Math.max(0, combinedStampCount - rewardedCount)
      setStampCount(combinedStampCount)
      
      // ── Determine position by timestamp (most recently saved wins) ──
      const serverPos = serverData?.lastPosition || 0
      const serverUpdateTs = serverData?.updatedAt?.toMillis 
        ? serverData.updatedAt.toMillis() 
        : (serverData?.updatedAt?.seconds ? serverData.updatedAt.seconds * 1000 : 0)
      
      let latestPos
      if (hasServerData && hasLocalData) {
        // Both exist: pick whichever was saved more recently
        latestPos = (localUpdateTs > serverUpdateTs) ? localPos : serverPos
      } else if (hasLocalData) {
        // Only localStorage (server hasn't received the save yet)
        latestPos = localPos
      } else {
        // Only server data
        latestPos = serverPos
      }
      
      totalTimeSpentRef.current = serverData?.totalTimeSpent || 0
      lastSyncedTimeSpentRef.current = totalTimeSpentRef.current
      setCreditedWatchSeconds(Math.floor(totalTimeSpentRef.current))
      const todayKST = getTodayKSTDate()
      dailyTimeSpentDateRef.current = todayKST
      dailyTimeSpentRef.current = serverData?.todayTimeSpentDate === todayKST ? (serverData?.todayTimeSpent || 0) : 0
      totalRewardedCrystalsRef.current = serverData?.totalRewardedCrystals || 0
      setTotalRewardedCrystals(totalRewardedCrystalsRef.current)
      
      setVideoCompleted(serverData?.completed || false)
      videoCompletedRef.current = serverData?.completed || false
      setVideoCompletionBonusGiven(serverData?.completionBonusGiven || false)
      videoCompletionBonusGivenRef.current = serverData?.completionBonusGiven || false
      
      setIsAtEnd(false)
      lastVideoTimeRef.current = latestPos > 0 ? latestPos : -1
      setInitialStartPosition(latestPos > 0 ? latestPos : (selectedTx.start || 0))
      
      if (latestPos > 0) {
         setResumePosStr(`이전 지점(${Math.floor(latestPos / 60)}분 ${Math.floor(latestPos % 60)}초)에서 이어보기 되었습니다.`)
         setTimeout(() => setResumePosStr(""), 4000)
      }
    } else {
      // No data from either source — truly a fresh start
      stampedSetRef.current = new Set()
      setStampCount(0)
      newStampCountRef.current = 0
      totalTimeSpentRef.current = 0
      dailyTimeSpentRef.current = 0
      dailyTimeSpentDateRef.current = getTodayKSTDate()
      lastSyncedTimeSpentRef.current = 0
      setCreditedWatchSeconds(0)
      totalRewardedCrystalsRef.current = 0
      setTotalRewardedCrystals(0)
      setVideoCompleted(false)
      videoCompletedRef.current = false
      setVideoCompletionBonusGiven(false)
      videoCompletionBonusGivenRef.current = false
      setInitialStartPosition(selectedTx.start || 0)
      lastVideoTimeRef.current = -1
      setIsAtEnd(false)

      // Reset Time Attack (only when tx changes)
      if (lastInitializedTxIdRef.current !== selectedTx.id) {
        lastInitializedTxIdRef.current = selectedTx.id;
        setShowTimeAttack(false);
        showTimeAttackRef.current = false;
        setTimeAttackCombo(0);
        timeAttackComboRef.current = 0;
        timeAttackCrystalsSessionRef.current = 0;
        nextAttackTimeRef.current = null;
        activeVideoSecondsRef.current = 0;
        sessionStartTimeRef.current = Date.now();
        setCompletionBonusTimeLeft(null);
        completionTimerStartedRef.current = false;
      }
    }
  }, [userId, selectedTx, loadingProgress, learningProgress, unitId])

  const getTrackingDiagnostics = useCallback(() => {
    const status = videoTrackingStatusRef.current || {}
    return {
      apiReady: !!status.apiReady,
      apiTimedOut: !!status.apiTimedOut,
      fallbackIframe: !!status.fallbackIframe,
      playerState: status.playerState ?? null,
      playerError: status.playerError ?? null,
      lastTimeUpdateAt: status.lastTimeUpdateAt || null,
      lastForwardPlaybackAt: status.lastForwardPlaybackAt || null,
      inferredPlayback: !!status.inferredPlayback,
      trackingUnavailable: !!videoTrackingUnavailable,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
    }
  }, [videoTrackingUnavailable])

  // ─── Video Progress: Part 2 - Auto-save Interval & Unload-save (Stable loop) ───
  useEffect(() => {
    if (loadingProgress || !userId || !selectedTx) return
    const txId = selectedTx.id || 'default'

    if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current)
    autoSaveIntervalRef.current = setInterval(async () => {
      try {
        const pos = Math.floor(lastVideoTimeRef.current || 0)
        if (pos > 0 || stampedSetRef.current.size > 0) {
          const stamps = Array.from(stampedSetRef.current)
          
          // Offline-first caching (10초 주기 일괄 저장으로 성능 최적화)
          const localCacheKey = `video_progress_${userId}_${unitId}_${txId}`
          localStorage.setItem(localCacheKey + '_stamps', JSON.stringify(stamps))
          localStorage.setItem(localCacheKey + '_pos', pos.toString())
          localStorage.setItem(localCacheKey + '_updatedAt', Date.now().toString())

          const progressRef = doc(db, 'users', userId, 'learning_progress', unitId)
          
          const updateData = {
            [`videoProgress.${txId}.lastPosition`]: pos,
            [`videoProgress.${txId}.totalTimeSpent`]: totalTimeSpentRef.current,
            [`videoProgress.${txId}.todayTimeSpent`]: dailyTimeSpentRef.current,
            [`videoProgress.${txId}.todayTimeSpentDate`]: dailyTimeSpentDateRef.current,
            [`videoProgress.${txId}.updatedAt`]: serverTimestamp(),
            [`videoProgress.${txId}.stampedSeconds`]: stamps,
            [`videoProgress.${txId}.transmissionTitle`]: selectedTx?.title || 'Main Video',
            [`videoProgress.${txId}.trackingDiagnostics`]: getTrackingDiagnostics(),
            updatedAt: serverTimestamp()
          }
          
          setSaveStatus('saving')
          await setDoc(progressRef, updateData, { merge: true })
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus(null), 2000)

          // Local state sync (careful: this might trigger parent re-renders, but since the player is memoized it won't flicker)
          setLearningProgress(prev => ({
            ...prev,
            videoProgress: {
              ...(prev?.videoProgress || {}),
              [txId]: {
                ...(prev?.videoProgress?.[txId] || {}),
                lastPosition: pos,
                totalTimeSpent: totalTimeSpentRef.current,
                todayTimeSpent: dailyTimeSpentRef.current,
                todayTimeSpentDate: dailyTimeSpentDateRef.current,
                stampedSeconds: stamps,
                trackingDiagnostics: getTrackingDiagnostics()
              }
            }
          }))
        }
      } catch (err) {
        console.warn("Auto-save failed:", err)
      }
    }, 10000)

    const handleUnloadSave = () => {
      const finalPos = Math.floor(lastVideoTimeRef.current || 0)
      if ((finalPos <= 0 && stampedSetRef.current.size === 0) || !idTokenRef.current) return
      
      const stamps = Array.from(stampedSetRef.current)

      // Unload 시점의 로컬 캐시 갱신
      const localCacheKey = `video_progress_${userId}_${unitId}_${txId}`
      localStorage.setItem(localCacheKey + '_stamps', JSON.stringify(stamps))
      localStorage.setItem(localCacheKey + '_pos', finalPos.toString())
      localStorage.setItem(localCacheKey + '_updatedAt', Date.now().toString())

      const payload = JSON.stringify({
        idToken: idTokenRef.current,
        userId,
        unitId,
        txId,
        progressData: {
          lastPosition: finalPos,
          totalTimeSpent: totalTimeSpentRef.current,
          todayTimeSpent: dailyTimeSpentRef.current,
          todayTimeSpentDate: dailyTimeSpentDateRef.current,
          stampedSeconds: Array.from(stampedSetRef.current),
          completed: videoCompletedRef.current,
          completionBonusGiven: videoCompletionBonusGivenRef.current,
          trackingDiagnostics: getTrackingDiagnostics()
        }
      })
      
      if (navigator.sendBeacon) {
        navigator.sendBeacon(getFunctionUrl('syncVideoProgress'), payload)
      }
    }

    window.addEventListener('beforeunload', handleUnloadSave)
    window.addEventListener('popstate', handleUnloadSave)

    return () => {
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current)
      window.removeEventListener('beforeunload', handleUnloadSave)
      window.removeEventListener('popstate', handleUnloadSave)
    }
  }, [userId, selectedTx, loadingProgress, unitId, getTrackingDiagnostics])

  // ─── Silent Toast helper ───
  const showSilentToast = useCallback((amount) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToastAmount(amount)
    setToastVisible(true)
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false)
    }, 2500)
  }, [])

  const showRewardLimitNotice = useCallback((message) => {
    if (rewardLimitNoticeTimeoutRef.current) clearTimeout(rewardLimitNoticeTimeoutRef.current)
    setRewardLimitNotice(message)
    rewardLimitNoticeTimeoutRef.current = setTimeout(() => {
      setRewardLimitNotice("")
    }, 3500)
  }, [])

  const videoAlreadySavedRef = useRef(false) // Flag to prevent double-save via returnFromContent

  const logActivity = useCallback(async (actionStr, metadata = null) => {
    if (!userId) return;
    try {
        const logId = `${Date.now()}_${Math.random().toString(36).substring(2,7)}`
        const logRef = doc(db, 'users', userId, 'activityLogs', logId)
        await setDoc(logRef, {
           action: actionStr,
           unitId: unitId || 'unknown_unit',
           unitTitle: activeUnit?.title || '',
           clusterId: clusterId || '',
           ...(metadata ? { metadata } : {}),
           timestamp: serverTimestamp()
        })
    } catch (err) {
        console.warn("Failed to log activity", err)
    }
  }, [activeUnit?.title, clusterId, unitId, userId])

  const handleVideoTrackingStatus = useCallback((event = {}) => {
    const next = {
      ...videoTrackingStatusRef.current,
      ...event,
      lastStatusAt: Date.now()
    }
    videoTrackingStatusRef.current = next

    if (event.event === 'api_timeout') {
      setVideoTrackingUnavailable(true)
      setVideoTrackingWarning('영상은 재생될 수 있지만 학습 추적이 불안정합니다. 시청 후 수동 완료 처리로 저장해 주세요.')
      logActivity('video_tracking_api_timeout', {
        transmissionId: selectedTx?.id || 'default',
        transmissionTitle: selectedTx?.title || '',
        videoId: event.videoId || selectedTx?.videoId || '',
        ...getTrackingDiagnostics()
      })
    } else if (event.event === 'api_ready') {
      setVideoTrackingUnavailable(false)
      setVideoTrackingWarning("")
      logActivity('video_tracking_api_ready', {
        transmissionId: selectedTx?.id || 'default',
        transmissionTitle: selectedTx?.title || '',
        videoId: event.videoId || selectedTx?.videoId || '',
        ...getTrackingDiagnostics()
      })
    } else if (event.event === 'player_error') {
      setVideoTrackingUnavailable(true)
      setVideoTrackingWarning('영상 추적 오류가 감지되었습니다. 외부 시청을 완료했다면 수동 완료 처리로 저장해 주세요.')
      logActivity('video_tracking_player_error', {
        transmissionId: selectedTx?.id || 'default',
        transmissionTitle: selectedTx?.title || '',
        videoId: event.videoId || selectedTx?.videoId || '',
        errorCode: event.playerError ?? null,
        ...getTrackingDiagnostics()
      })
    }
  }, [getTrackingDiagnostics, logActivity, selectedTx])

  const getVideoLearningMetadata = useCallback((txId, position, stamps) => {
    const sessionWatchSeconds = Math.max(0, totalTimeSpentRef.current - lastSyncedTimeSpentRef.current)
    return {
      activityCategory: 'video',
      transmissionId: txId,
      transmissionTitle: selectedTx?.title || "Main Video",
      stampedSeconds: stamps,
      videoTime: Math.floor(sessionWatchSeconds),
      sessionWatchSeconds,
      totalTimeSpent: totalTimeSpentRef.current,
      todayTimeSpent: dailyTimeSpentRef.current,
      todayTimeSpentDate: dailyTimeSpentDateRef.current,
      coverageSeconds: stamps.length,
      currentPosition: position,
      trackingDiagnostics: getTrackingDiagnostics()
    }
  }, [getTrackingDiagnostics, selectedTx])

  const markVideoLearningSynced = useCallback(() => {
    lastSyncedTimeSpentRef.current = totalTimeSpentRef.current
  }, [])

  // Helper: when exiting content, go back to SpaceHome if single-content unit
  const returnFromContent = useCallback(async () => {
    // 1. Final Sync: Ensure the latest progress is sent before unmounting
    //    Skip if handleSaveVideoPosition already persisted (prevents double-write race)
    if (onNonQuizActivityComplete && selectedTx && !videoAlreadySavedRef.current) {
      const txId = selectedTx?.id || 'default';
      const currentTime = videoPlayerRef.current?.getCurrentTime() || 0;
      const stamps = Array.from(stampedSetRef.current);
      
      // Check if we hit a milestone JUST before exiting
      if (newStampCountRef.current >= 180 && !rewardLockRef.current) {
        const minutes = Math.floor(stampedSetRef.current.size / 60);
        const rewardOutcome = await onNonQuizActivityComplete(`영상 교신 수신 (${minutes}분 누적)`, 10, {
          ...getVideoLearningMetadata(txId, currentTime, stamps)
        });
        if (rewardOutcome?.actualReward > 0) {
          showSilentToast(rewardOutcome.actualReward);
        } else if (rewardOutcome?.rewardBlockedReason === 'daily_cap') {
          showRewardLimitNotice('광석 지급은 리밋에 걸렸지만, 집중도 기록에는 반영됩니다.')
        }
        markVideoLearningSynced()
      } else {
        // Just sync progress without reward
        await onNonQuizActivityComplete('영상 학습 기록 동기화', 0, {
          ...getVideoLearningMetadata(txId, currentTime, stamps)
        });
        markVideoLearningSynced()
      }
    }

    videoAlreadySavedRef.current = false // Reset flag for next entry
    
    // Check if we should return to the selection list or the briefing based on current metadata
    const txList = missionData?.transmissions || []
    
    // If we were in a sub-content (selectedTx was set), return to selection list if there are multiple.
    // If only one, return to briefing.
    if (selectedTx) {
        setSelectedTx(null)
        setIsVideoPlaying(false)
        isVideoPlayingRef.current = false
        if (txList.length <= 1) {
            updateCurrentMode('briefing')
        }
        return // Stay in selection list if txList.length > 1
    }

    setShowFieldTestModal(false) // Reset quiz modal
    setVideoCompleted(false)
    setVideoCompletionBonusGiven(false)

    // Final Exit from the Unit
    if (initialMode !== 'briefing') {
      // Single-content unit — go directly back to SpaceHome
      onBack()
    } else {
      // Return to Mission Control (Briefing)
      updateCurrentMode('briefing')
    }
  }, [initialMode, onBack, selectedTx, missionData, onNonQuizActivityComplete, showSilentToast, showRewardLimitNotice, getVideoLearningMetadata, markVideoLearningSynced])

  // ─── Data Log Timer Logic ───
  useEffect(() => {
    if (currentMode !== 'text') return
    if (logRewardClaimed) return

    // Restore from sessionStorage
    // `savedTimer` is not defined in the original code, assuming it's meant to be retrieved from sessionStorage
    const savedTimer = localStorage.getItem(storageKey);
    if (savedTimer) {
      const saved = JSON.parse(savedTimer)
      if (saved.remaining > 0) {
        setTimeRemaining(Math.max(0, saved.remaining))
      }
    }

    setLogTimerActive(true)
    return () => setLogTimerActive(false)
  }, [currentMode, logRewardClaimed, storageKey])

  useEffect(() => {
    if (!logTimerActive || timeRemaining <= 0) return

    const tick = () => {
      setTimeRemaining(prev => {
        const next = Math.max(0, prev - 1)
        // Save to sessionStorage every 5 seconds
        if (next % 5 === 0) {
          localStorage.setItem(storageKey, JSON.stringify({
            remaining: next,
            timestamp: Date.now()
          }))
        }
        return next
      })
    }

    timerRef.current = setInterval(tick, 1000)

    // Page Visibility API - pause timer when tab is hidden and save video progress
    const handleVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) clearInterval(timerRef.current)
        
        // Proactively save video position if in video mode
        if (currentMode === 'video' && selectedTx && userId) {
           const pos = Math.floor(lastVideoTimeRef.current || 0)
           if (pos > 0) {
             const txId = selectedTx.id || 'default'
             const progressRef = doc(db, 'users', userId, 'learning_progress', unitId)
             setDoc(progressRef, {
               [`videoProgress.${txId}.lastPosition`]: pos,
               [`videoProgress.${txId}.totalTimeSpent`]: totalTimeSpentRef.current,
               [`videoProgress.${txId}.todayTimeSpent`]: dailyTimeSpentRef.current,
               [`videoProgress.${txId}.todayTimeSpentDate`]: dailyTimeSpentDateRef.current,
               [`videoProgress.${txId}.updatedAt`]: serverTimestamp(),
               [`videoProgress.${txId}.stampedSeconds`]: Array.from(stampedSetRef.current),
               [`videoProgress.${txId}.trackingDiagnostics`]: getTrackingDiagnostics()
             }, { merge: true }).catch(err => console.warn("Background save failed:", err))
           }
        }
      } else {
        // Resume reading timer if applicable
        if (currentMode === 'text' && logTimerActive && timeRemaining > 0) {
          timerRef.current = setInterval(tick, 1000)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [logTimerActive, timeRemaining, storageKey, currentMode, selectedTx, userId, unitId, getTrackingDiagnostics])

  // ─── Data Log: Claim reward ───
  const handleClaimLogReward = async () => {
    if (logRewardClaimed || timeRemaining > 0 || !userId) return

    try {
      if (onNonQuizActivityComplete) {
        await onNonQuizActivityComplete('데이터 로그 학습', 30)
      }
      setLogRewardClaimed(true)
      localStorage.removeItem(storageKey)
      showSilentToast(30)
      logActivity('data_log_reward_claimed')
    } catch (err) {
      console.error("Failed to claim log reward:", err)
    }
  }

  // ─── Transmission: Bitset stamp tracking ───
  const handleVideoTimeUpdate = useCallback(({ currentTime, duration, playbackRate = 1 }) => {
    if (!selectedTx || !userId) return

    const now = Date.now()
    videoTrackingStatusRef.current = {
      ...videoTrackingStatusRef.current,
      lastTimeUpdateAt: now
    }

    const lastPollTime = lastPollTimeRef.current || now
    lastPollTimeRef.current = now

    const realGapMs = now - lastPollTime

    const previousVideoTime = Number.isFinite(lastVideoTimeRef.current) ? lastVideoTimeRef.current : -1
    const hasPreviousVideoTime = previousVideoTime >= 0
    const currentSecond = Math.floor(currentTime)
    const lastSecond = hasPreviousVideoTime ? Math.floor(previousVideoTime) : currentSecond
    lastVideoTimeRef.current = currentTime
    if (duration > 0) videoDurationRef.current = duration

    const realGapSeconds = Math.max(realGapMs, 0) / 1000
    const expectedVideoElapsed = realGapSeconds * playbackRate
    const videoDelta = hasPreviousVideoTime ? currentTime - previousVideoTime : 0
    const isForwardPlayback = videoDelta > 0
    const isScrubbing = hasPreviousVideoTime && Math.abs(expectedVideoElapsed - videoDelta) > 2
    const pageVisible = typeof document === 'undefined' || document.visibilityState === 'visible'
    const inferredPlayback = pageVisible && isForwardPlayback && !isScrubbing && videoDelta <= Math.max(3, expectedVideoElapsed + 1)
    const effectivePlaying = isVideoPlayingRef.current || inferredPlayback
    const activePlaybackDelta = pageVisible && effectivePlaying && isForwardPlayback
      ? (isScrubbing ? Math.min(expectedVideoElapsed, 1) : videoDelta)
      : 0

    if (inferredPlayback && !isVideoPlayingRef.current) {
      videoTrackingStatusRef.current = {
        ...videoTrackingStatusRef.current,
        inferredPlayback: true,
        lastForwardPlaybackAt: now
      }
      if (!inferredPlaybackLoggedRef.current) {
        inferredPlaybackLoggedRef.current = true
        logActivity('video_tracking_inferred_playback', {
          transmissionId: selectedTx?.id || 'default',
          transmissionTitle: selectedTx?.title || '',
          videoId: selectedTx?.videoId || '',
          currentTime: Math.floor(currentTime),
          previousVideoTime: Math.floor(previousVideoTime),
          ...getTrackingDiagnostics()
        })
      }
    } else if (activePlaybackDelta > 0) {
      videoTrackingStatusRef.current = {
        ...videoTrackingStatusRef.current,
        lastForwardPlaybackAt: now
      }
    }

    // Count actually played video seconds, even when the student rewatches an
    // already-covered section. Large seek jumps are excluded from this total.
    if (activePlaybackDelta > 0) {
      const todayKST = getTodayKSTDate()
      if (dailyTimeSpentDateRef.current !== todayKST) {
        dailyTimeSpentDateRef.current = todayKST
        dailyTimeSpentRef.current = 0
      }

      totalTimeSpentRef.current += activePlaybackDelta
      dailyTimeSpentRef.current += activePlaybackDelta
      activeVideoSecondsRef.current += activePlaybackDelta

      const flooredTotal = Math.floor(totalTimeSpentRef.current)
      setCreditedWatchSeconds(prev => (prev !== flooredTotal ? flooredTotal : prev))
    }

    // Time Attack Logic: schedule by active playback time, not by YouTube timeline position.
    // This keeps the random focus check fair when a student rewinds or repeats a section.
    if (duration > 0 && !videoCompletedRef.current) {
      const sessionElapsedMs = now - sessionStartTimeRef.current;
      
      if (nextAttackTimeRef.current === null) {
         nextAttackTimeRef.current = activeVideoSecondsRef.current + getNextTimeAttackDelay(true);
      } else if (activeVideoSecondsRef.current >= nextAttackTimeRef.current && !showTimeAttackRef.current && sessionElapsedMs > 15000) {
         timeAttackOpportunityRef.current = {
           id: `ta_${Date.now()}_${Math.floor(currentTime)}`,
           videoTime: Math.floor(currentTime)
         };
         showTimeAttackRef.current = true;
         setShowTimeAttack(true);
      }
    }

    // Calculate gap between polls
    const gap = currentSecond - lastSecond

    let newStampsAdded = false

    if (gap > 0 && !isScrubbing) {
      // Normal playback (including speed playback AND background throttled polls). 
      // Safely stamp ALL seconds in range (removed 60s limit to support background throttling)
      for (let s = lastSecond + 1; s <= lastSecond + gap; s++) {
        if (!stampedSetRef.current.has(s)) {
          stampedSetRef.current.add(s)
          newStampCountRef.current++
          newStampsAdded = true
        }
      }
    } else {
      // Skip detected (isScrubbing) OR backwards seek (gap <= 0) OR first poll
      // Only stamp the current second
      if (!stampedSetRef.current.has(currentSecond)) {
        stampedSetRef.current.add(currentSecond)
        newStampCountRef.current++
        newStampsAdded = true
      }
    }

    if (newStampsAdded) {
      setStampCount(stampedSetRef.current.size)
    }

    // Check completion: dynamic threshold based on duration
    if (duration > 0) {
      const totalSeconds = Math.floor(duration)
      const coverage = stampedSetRef.current.size / totalSeconds
      
      // Dynamic Threshold:
      // - Long Videos (>40m): 85% (Allows for ~6min break skip)
      // - Standard: 95% (Safe margin for minor skips/buffering)
      const threshold = getVideoCompletionThreshold(duration);

      if (coverage >= threshold) {
        setVideoCompleted(true)
        if (!completionTimerStartedRef.current && !learningProgress?.videoProgress?.[selectedTx.id]?.completed) {
           completionTimerStartedRef.current = true;
           setCompletionBonusTimeLeft(60);
        }
      }
    }

    /* 
    // Auto-reward: every 180 NEW stamps = 10 crystals (with cap)
    // DISABLED as per user request: only click-based rewards should exist
    if (newStampCountRef.current >= 180) {
      if (rewardLockRef.current) return 
      
      const maxIntervalRewards = duration > 0 ? Math.floor(duration / 180) * 10 : Infinity
      if (totalRewardedCrystalsRef.current >= maxIntervalRewards) {
        newStampCountRef.current = 0 
        return
      }

      const reward = 10
      newStampCountRef.current -= 180
      
      rewardLockRef.current = true
      totalRewardedCrystalsRef.current += reward
      setTotalRewardedCrystals(totalRewardedCrystalsRef.current)
      
      const txId = selectedTx.id || 'default'

      const awardReward = async () => {
        try {
          rewardLockRef.current = true
          
          if (onNonQuizActivityComplete) {
            const currentTime = videoPlayerRef.current?.getCurrentTime() || 0;
            const minutes = Math.floor(stampedSetRef.current.size / 60);
            await onNonQuizActivityComplete(`영상 교신 수신 (${minutes}분 누적)`, 10, {
              transmissionId: txId,
              transmissionTitle: selectedTx?.title || "Main Video",
              stampedSeconds: Array.from(stampedSetRef.current),
              videoTime: currentTime
            })
          }
          
          showSilentToast(10)
        } catch (err) {
          console.error("Failed to award transmission reward:", err)
        } finally {
          rewardLockRef.current = false
        }
      }
      awardReward()
    }
    */
  }, [selectedTx, userId, unitId, activeUnit?.title, learningProgress?.videoProgress, onNonQuizActivityComplete, showSilentToast, userDataRef, logActivity, getTrackingDiagnostics])

  useEffect(() => {
    if (currentMode !== 'video' || !selectedTx) return undefined

    const interval = setInterval(() => {
      if (videoTrackingUnavailable || trackingStallLoggedRef.current) return

      const status = videoTrackingStatusRef.current || {}
      const hasStartedPosition = Math.floor(lastVideoTimeRef.current || 0) > 0
      const hasMeaningfulProgress = stampCount > 3 || creditedWatchSeconds > 3
      const sessionAgeMs = Date.now() - sessionStartTimeRef.current

      if (status.apiReady && hasStartedPosition && !hasMeaningfulProgress && sessionAgeMs > 15000) {
        trackingStallLoggedRef.current = true
        setVideoTrackingWarning('영상 재생 추적이 멈춘 것 같습니다. 저장 전 진행률이 오르는지 확인해 주세요.')
        logActivity('video_tracking_stalled', {
          transmissionId: selectedTx?.id || 'default',
          transmissionTitle: selectedTx?.title || '',
          videoId: selectedTx?.videoId || '',
          lastPosition: Math.floor(lastVideoTimeRef.current || 0),
          stampCount,
          creditedWatchSeconds,
          ...getTrackingDiagnostics()
        })
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [currentMode, selectedTx, videoTrackingUnavailable, stampCount, creditedWatchSeconds, logActivity, getTrackingDiagnostics])

  // ─── Time Attack Handlers ───
  const handleTimeAttackHit = useCallback(async () => {
    setShowTimeAttack(false);
    showTimeAttackRef.current = false;
    const opportunity = timeAttackOpportunityRef.current;
    timeAttackOpportunityRef.current = null;
    
    // Update next time synchronously BEFORE any await to prevent race conditions with video timer
    const rawTime = videoPlayerRef.current?.getCurrentTime() || 0;
    const currentTime = Math.max(rawTime, lastVideoTimeRef.current || 0);
    nextAttackTimeRef.current = activeVideoSecondsRef.current + getNextTimeAttackDelay(false);
    
    let reward = 10;
    if (timeAttackComboRef.current >= 2) reward = 20; // Fever mode
    else if (timeAttackComboRef.current >= 1) reward = 15;
    
    if (timeAttackCrystalsSessionRef.current + reward > 100) {
      reward = Math.max(0, 100 - timeAttackCrystalsSessionRef.current);
    }

    timeAttackComboRef.current += 1;
    setTimeAttackCombo(timeAttackComboRef.current);

    if (reward > 0) {
      timeAttackCrystalsSessionRef.current += reward;
      totalRewardedCrystalsRef.current += reward;
      setTotalRewardedCrystals(totalRewardedCrystalsRef.current);
      
      try {
        if (onNonQuizActivityComplete && selectedTx) {
          const txId = selectedTx.id || 'default';
          await onNonQuizActivityComplete(`영상 광석 획득 (${timeAttackComboRef.current}연속)`, reward, {
            activityCategory: 'video',
            transmissionId: txId,
            transmissionTitle: selectedTx?.title || "Main Video",
            videoTime: currentTime,
            attentionSource: 'time_attack',
            attentionResult: 'hit',
            attentionOpportunityId: opportunity?.id || `ta_${Date.now()}_${Math.floor(currentTime)}`,
            attentionWindowSeconds: 30
          });
        }
        showSilentToast(reward);
      } catch (err) {
        console.error("Failed to award time attack:", err);
      }
    }
  }, [onNonQuizActivityComplete, selectedTx, showSilentToast]);

  const handleTimeAttackMiss = useCallback(async () => {
    setShowTimeAttack(false);
    showTimeAttackRef.current = false;
    timeAttackComboRef.current = 0;
    setTimeAttackCombo(0);
    const opportunity = timeAttackOpportunityRef.current;
    timeAttackOpportunityRef.current = null;
    
    // Update next time synchronously BEFORE any await to prevent race conditions with video timer
    const rawTime = videoPlayerRef.current?.getCurrentTime() || 0;
    const currentTime = Math.max(rawTime, lastVideoTimeRef.current || 0);
    nextAttackTimeRef.current = activeVideoSecondsRef.current + getNextTimeAttackDelay(false);
    
    try {
      if (onNonQuizActivityComplete && selectedTx && opportunity?.id) {
        await onNonQuizActivityComplete('영상 광석 놓침', 0, {
          activityCategory: 'video',
          transmissionId: selectedTx.id || 'default',
          transmissionTitle: selectedTx?.title || "Main Video",
          videoTime: currentTime,
          attentionSource: 'time_attack',
          attentionResult: 'miss',
          attentionOpportunityId: opportunity.id,
          attentionWindowSeconds: 30
        });
      }
    } catch (err) {
      console.error("Failed to record time attack miss:", err);
    }
  }, [onNonQuizActivityComplete, selectedTx]);

  /* 
  // ─── Transmission: Completion bonus ───
  // DISABLED as per user request: completion reward should also be a crystal click
  useEffect(() => {
    if (!videoCompleted || videoCompletionBonusGiven || !userId || !selectedTx) return
    if (rewardLockRef.current) return 

    const txId = selectedTx.id || 'default'
    const savedProgress = learningProgress?.videoProgress?.[txId]
    if (savedProgress?.completionBonusGiven) {
      setVideoCompletionBonusGiven(true)
      return 
    }

    const awardCompletion = async () => {
      try {
        rewardLockRef.current = true
        setVideoCompletionBonusGiven(true)
        videoCompletionBonusGivenRef.current = true

        if (onNonQuizActivityComplete) {
          const currentTime = videoPlayerRef.current?.getCurrentTime() || 0;
          await onNonQuizActivityComplete('영상 교신 완료', 20, {
            transmissionId: selectedTx?.id || 'default',
            transmissionTitle: selectedTx?.title || "Main Video",
            videoTime: currentTime
          })
        }

        showSilentToast(20)
      } catch (err) {
        console.error("Failed to award completion bonus:", err)
        setVideoCompletionBonusGiven(false)
      } finally {
        rewardLockRef.current = false
      }
    }
    awardCompletion()
  }, [videoCompleted, videoCompletionBonusGiven, userId, selectedTx, learningProgress?.videoProgress, unitId, activeUnit?.title, onNonQuizActivityComplete, showSilentToast, userDataRef])
  */

  // ─── Transmission: Save position ("오늘은 여기까지") ───
  const handleSaveVideoPosition = async () => {
    if (!userId || !selectedTx) {
      setSelectedTx(null)
      returnFromContent()
      return
    }
    const txId = selectedTx.id || 'default'

    try {
      // Get the ACTUAL current position directly from the YouTube player API
      // (lastVideoTimeRef may be stale by up to 200ms from the polling interval)
      let savedPosition = Math.floor(lastVideoTimeRef.current || 0)
      if (videoPlayerRef.current && typeof videoPlayerRef.current.getCurrentTime === 'function') {
        const livePos = videoPlayerRef.current.getCurrentTime()
        if (livePos > 0) savedPosition = Math.floor(livePos)
      }
      const stamps = Array.from(stampedSetRef.current)
      
      let isManualComplete = false
      // Remove 20% hurdle. If they reached the end or encountered an error but didn't complete, allow manual completion without bonus
      if ((isAtEnd || videoError || videoTrackingUnavailable) && !videoCompleted) {
         isManualComplete = true
      }
      
      const progressRef = doc(db, 'users', userId, 'learning_progress', unitId)
      const updateData = {
        videoProgress: {
          [txId]: {
            lastPosition: savedPosition,
            stampedSeconds: stamps,
            rewardedStampCount: stamps.length - newStampCountRef.current,
            totalRewardedCrystals: totalRewardedCrystalsRef.current,
            totalTimeSpent: totalTimeSpentRef.current,
            todayTimeSpent: dailyTimeSpentRef.current,
            todayTimeSpentDate: dailyTimeSpentDateRef.current,
            transmissionTitle: selectedTx?.title || 'Main Video',
            trackingDiagnostics: getTrackingDiagnostics(),
            updatedAt: serverTimestamp()
          }
        },
        updatedAt: serverTimestamp()
      }
      
      // Finalize progress exactly once: completion bonus, eligible interval reward, or sync-only save
      let exitRewardOutcome = null
      if (videoCompleted || isManualComplete) {
        updateData.videoProgress[txId].completed = true
        updateData.videoProgress[txId].completionBonusGiven = true
        videoCompletedRef.current = true
        videoCompletionBonusGivenRef.current = true
        
        const wasAlreadyCompleted = learningProgress?.videoProgress?.[txId]?.completed
        let rewardAmount = 0
        if (videoCompleted && !wasAlreadyCompleted && completionBonusTimeLeft !== null && completionBonusTimeLeft > 0) {
          rewardAmount = 20
        }
        
        if (rewardAmount > 0) {
          totalRewardedCrystalsRef.current += rewardAmount
          updateData.videoProgress[txId].totalRewardedCrystals = totalRewardedCrystalsRef.current
          setTotalRewardedCrystals(totalRewardedCrystalsRef.current)
        }
        
        if (onNonQuizActivityComplete) {
          const completionAttentionMeta = videoCompleted && !wasAlreadyCompleted
            ? {
                attentionSource: 'completion_bonus',
                attentionResult: rewardAmount > 0 ? 'hit' : 'miss',
                attentionOpportunityId: `completion_${txId}`,
                attentionWindowSeconds: 60
              }
            : {}
          exitRewardOutcome = await onNonQuizActivityComplete(
            '영상 교신 완료',
            rewardAmount,
            {
              ...getVideoLearningMetadata(txId, savedPosition, stamps),
              ...completionAttentionMeta
            }
          )
        }
      } else if (onNonQuizActivityComplete) {
        if (newStampCountRef.current >= 180 && !rewardLockRef.current) {
          const minutes = Math.floor(stampedSetRef.current.size / 60)
          exitRewardOutcome = await onNonQuizActivityComplete(`영상 교신 수신 (${minutes}분 누적)`, 10, {
            ...getVideoLearningMetadata(txId, savedPosition, stamps)
          })
        } else {
          exitRewardOutcome = await onNonQuizActivityComplete('영상 학습 기록 동기화', 0, {
            ...getVideoLearningMetadata(txId, savedPosition, stamps)
          })
        }
      }
      markVideoLearningSynced()
      
      if (exitRewardOutcome?.actualReward > 0) {
        showSilentToast(exitRewardOutcome.actualReward)
      } else if (exitRewardOutcome?.rewardBlockedReason === 'daily_cap') {
        showRewardLimitNotice('광석 지급은 리밋에 걸렸지만, 집중도 기록에는 반영됩니다.')
      }
      
      await setDoc(progressRef, updateData, { merge: true })
      
      // localStorage도 최신 위치로 갱신 — 오프라인 복구 백업
      const localCacheKey = `video_progress_${userId}_${unitId}_${txId}`
      localStorage.setItem(localCacheKey + '_pos', savedPosition.toString())
      localStorage.setItem(localCacheKey + '_stamps', JSON.stringify(stamps))
      localStorage.setItem(localCacheKey + '_updatedAt', Date.now().toString())

      // Update local state
      setLearningProgress(prev => {
        const updatedVideoProgress = {
            ...(prev?.videoProgress?.[txId] || {}),
            lastPosition: savedPosition,
            totalTimeSpent: totalTimeSpentRef.current,
            todayTimeSpent: dailyTimeSpentRef.current,
            todayTimeSpentDate: dailyTimeSpentDateRef.current,
            stampedSeconds: stamps,
            trackingDiagnostics: getTrackingDiagnostics()
        };
        if (videoCompleted || isManualComplete) {
            updatedVideoProgress.completed = true;
            updatedVideoProgress.completionBonusGiven = true;
        }
        return {
          ...prev,
          videoProgress: {
            ...(prev?.videoProgress || {}),
            [txId]: updatedVideoProgress
          }
        };
      })

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 2000)
    } catch (err) {
      console.error("Failed to save video position:", err)
    }

    if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current)
    videoAlreadySavedRef.current = true // Prevent returnFromContent from double-writing
    setTimeout(() => {
      setSelectedTx(null)
      returnFromContent()
    }, 1200)
  }


  const handleModeChange = (mode) => {
    soundManager.playClick()
    if (mode === 'quiz') {
      // Show RewardPotentialModal before entering quiz
      setShowFieldTestModal(true)
      return
    }
    updateCurrentMode(mode)
    if (mode === 'text' || mode === 'video') {
       logActivity(`view_${mode}`)
    }
  }

  // ─── Computed: completion status for dashboard cards ───
  const logCompleted = logRewardClaimed || learningProgress?.logRead || false
  
  const txListCalc = activeUnit?.transmissions?.length > 0 
      ? activeUnit.transmissions 
      : (activeUnit?.videoConfig?.videoId ? [{ id: 'legacy_tx' }] : [])
  const txTotalCount = txListCalc.length
  const txCompletedCount = txListCalc.filter(tx => {
    const txId = tx.id || 'default'
    const prog = learningProgress?.videoProgress?.[txId]
    return prog?.completed || prog?.completionBonusGiven
  }).length
  const txAllCompleted = txTotalCount > 0 && txCompletedCount === txTotalCount
  const txAnyCompleted = txCompletedCount > 0
  
  const quizCompleted = bestScores[unitId] !== undefined
  const workbookCompleted = bestScores[`${unitId}_workbook`] !== undefined
  const codeTraceCompleted = !!learningProgress?.codeTrace?.completed

  // --- Render Functions ---

  const renderDashboard = () => {
    const hasDataLog = !!(missionData?.learningContents?.text?.trim() || missionData?.learningContents?.pdfUrl?.trim())
    const hasTransmission = !!(missionData?.transmissions?.length > 0 && missionData.transmissions.some(tx => tx.videoId))
    const hasQuiz = !!(unitQuizzes && unitQuizzes.length > 0)
    const hasWorkbook = !!(activeUnit?.workbookPages && activeUnit.workbookPages.length > 0)
    const hasCodeTrace = !!(codeExercises && codeExercises.length > 0)
    const availableCount = [hasDataLog, hasTransmission, hasQuiz, hasWorkbook, hasCodeTrace].filter(Boolean).length

    return (
    <div className="mission-dashboard fade-in" style={{ width: '100%', height: '100%', overflowY: 'auto', paddingBottom: isMobile ? '5.5rem' : '3rem' }}>
      <div style={{ maxWidth: '1200px', width: isMobile ? '100%' : '95%', margin: '0 auto', padding: isMobile ? '0.75rem' : '1.5rem 0 0', boxSizing: 'border-box', position: 'relative' }}>
        {/* Redundant back link removed to fix overlap with global back button */}


        <h2 className="font-title" style={{ 
          textAlign: 'center', 
          fontSize: isMobile ? '1.45rem' : '2rem', 
          lineHeight: 1.25,
          marginBottom: isMobile ? '1rem' : '2rem',
          textShadow: '0 0 10px var(--crystal-cyan)'
        }}>
          MISSION CONTROL: {activeUnit?.title || "비밀 작전 구역"}
        </h2>

      <UnitLeaderboard 
        user={user} 
        unitId={unitId} 
        unitTitle={activeUnit?.title} 
      />

      {availableCount === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
          <h3 className="font-title" style={{ color: 'var(--text-muted)' }}>등록된 콘텐츠가 없습니다.</h3>
          <p className="font-tech" style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>이 단원에는 아직 학습 자료가 등록되지 않았습니다.</p>
        </div>
      ) : (
      <div className="mission-grid" style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : `repeat(${Math.min(availableCount, 4)}, minmax(240px, 1fr))`,
        gap: isMobile ? '0.85rem' : '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {(() => {
          // Define all possible cards
          const cards = [
            {
              id: 'text',
              shouldRender: hasDataLog,
              render: () => (
                <motion.div 
                  key="text"
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="glass-card hud-border"
                  onClick={() => handleModeChange('text')}
                  style={{ 
                    cursor: 'pointer', padding: isMobile ? '1rem' : '2rem', display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: 'center', textAlign: isMobile ? 'left' : 'center', gap: isMobile ? '0.85rem' : 0,
                    background: logCompleted ? 'rgba(0, 243, 255, 0.08)' : undefined,
                    borderColor: logCompleted ? 'var(--crystal-cyan)' : undefined,
                    position: 'relative'
                  }}
                >
                  {logCompleted && (
                    <div style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', fontSize: '1.2rem' }}>✅</div>
                  )}
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                  <h3 className="font-title" style={{ color: 'var(--crystal-cyan)', marginBottom: '1rem' }}>DATA LOG</h3>
                  <p className="font-tech" style={{ color: 'var(--text-muted)' }}>
                    핵심 개념과 공식을<br/>확인합니다.
                  </p>
                  {logCompleted && (
                    <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.8rem', marginTop: '0.5rem' }}>탐사 완료</span>
                  )}
                </motion.div>
              )
            },
            {
              id: 'video',
              shouldRender: hasTransmission,
              render: () => (
                <motion.div 
                  key="video"
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="glass-card hud-border"
                  onClick={() => handleModeChange('video')}
                  style={{ 
                    cursor: 'pointer', padding: isMobile ? '1rem' : '2rem', display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: 'center', textAlign: isMobile ? 'left' : 'center', gap: isMobile ? '0.85rem' : 0,
                    background: txAllCompleted ? 'rgba(0, 255, 136, 0.08)' : (txAnyCompleted ? 'rgba(255, 255, 255, 0.05)' : undefined),
                    borderColor: txAllCompleted ? 'var(--planet-green)' : (txAnyCompleted ? 'var(--crystal-cyan)' : undefined),
                    position: 'relative'
                  }}
                >
                  {txAllCompleted && (
                    <div style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', fontSize: '1.2rem' }}>✅</div>
                  )}
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📡</div>
                  <h3 className="font-title" style={{ color: 'var(--planet-green)', marginBottom: '1rem' }}>TRANSMISSION</h3>
                  <p className="font-tech" style={{ color: 'var(--text-muted)' }}>
                    본부의 영상 브리핑을<br/>수신합니다.
                  </p>
                  {txAllCompleted ? (
                    <span className="font-tech" style={{ color: 'var(--planet-green)', fontSize: '0.8rem', marginTop: '0.5rem' }}>수신 완료</span>
                  ) : txAnyCompleted ? (
                    <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.8rem', marginTop: '0.5rem' }}>진행 중 ({txCompletedCount} / {txTotalCount})</span>
                  ) : null}
                </motion.div>
              )
            },
            {
              id: 'workbook',
              shouldRender: hasWorkbook,
              render: () => (
                <motion.div 
                  key="workbook"
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="glass-card hud-border"
                  onClick={() => handleModeChange('workbook')}
                  style={{ 
                    cursor: 'pointer', padding: isMobile ? '1rem' : '2rem', display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: 'center', textAlign: isMobile ? 'left' : 'center', gap: isMobile ? '0.85rem' : 0, 
                    border: workbookCompleted ? '1px solid var(--neon-blue)' : '1px solid var(--neon-blue)',
                    background: workbookCompleted ? 'rgba(0, 243, 255, 0.08)' : undefined,
                    position: 'relative'
                  }}
                >
                  {workbookCompleted && (
                    <div style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', fontSize: '1.2rem' }}>✅</div>
                  )}
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                  <h3 className="font-title" style={{ color: 'var(--neon-blue)', marginBottom: '1rem' }}>WORKBOOK</h3>
                  <p className="font-tech" style={{ color: 'var(--text-muted)' }}>
                    상호작용 캔버스로<br/>실력을 검증합니다.
                  </p>
                  {workbookCompleted && (
                    <span className="font-tech" style={{ color: 'var(--neon-blue)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                      BEST: {bestScores[`${unitId}_workbook`]}점
                    </span>
                  )}
                </motion.div>
              )
            },
            {
              id: 'code',
              shouldRender: hasCodeTrace,
              render: () => (
                <motion.div
                  key="code"
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="glass-card hud-border"
                  onClick={() => handleModeChange('code')}
                  style={{
                    cursor: 'pointer', padding: isMobile ? '1rem' : '2rem', display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: 'center', textAlign: isMobile ? 'left' : 'center', gap: isMobile ? '0.85rem' : 0,
                    border: codeTraceCompleted ? '1px solid var(--crystal-cyan)' : '1px solid var(--crystal-cyan)',
                    background: codeTraceCompleted ? 'rgba(0, 243, 255, 0.08)' : undefined,
                    position: 'relative'
                  }}
                >
                  {codeTraceCompleted && (
                    <div style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', fontSize: '1.2rem' }}>✅</div>
                  )}
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⌨️</div>
                  <h3 className="font-title" style={{ color: 'var(--crystal-cyan)', marginBottom: '1rem' }}>CODE TRACE</h3>
                  <p className="font-tech" style={{ color: 'var(--text-muted)' }}>
                    정답 코드를 따라 쓰며<br/>문법 패턴을 익힙니다.
                  </p>
                  {codeTraceCompleted ? (
                    <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.8rem', marginTop: '0.5rem' }}>훈련 완료</span>
                  ) : learningProgress?.codeTrace?.completedExerciseCount > 0 ? (
                    <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                      진행 중 ({learningProgress.codeTrace.completedExerciseCount} / {codeExercises.length})
                    </span>
                  ) : null}
                </motion.div>
              )
            },
            {
              id: 'quiz',
              shouldRender: hasQuiz,
              render: () => (
                <motion.div 
                  key="quiz"
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="glass-card hud-border"
                  onClick={() => handleModeChange('quiz')}
                  style={{ 
                    cursor: 'pointer', padding: isMobile ? '1rem' : '2rem', display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: 'center', textAlign: isMobile ? 'left' : 'center', gap: isMobile ? '0.85rem' : 0, 
                    border: quizCompleted ? '1px solid var(--star-gold)' : '1px solid var(--star-gold)',
                    background: quizCompleted ? 'rgba(255, 215, 0, 0.08)' : undefined,
                    position: 'relative'
                  }}
                >
                  {quizCompleted && (
                    <div style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', fontSize: '1.2rem' }}>✅</div>
                  )}
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
                  <h3 className="font-title" style={{ color: 'var(--star-gold)', marginBottom: '1rem' }}>FIELD TEST</h3>
                  <p className="font-tech" style={{ color: 'var(--text-muted)' }}>
                    실전 퀴즈 탐사를<br/>시작합니다.
                  </p>
                  {quizCompleted && (
                    <span className="font-tech" style={{ color: 'var(--star-gold)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                      BEST: {bestScores[unitId]}점
                    </span>
                  )}
                </motion.div>
              )
            }
          ];

          // Determine sorting order based on cluster
          let sortedCards = cards;
          if (clusterId === 'python') {
            // Python: Transmission -> Data Log -> Code Trace -> Workbook -> Field Test
            const pythonOrder = ['video', 'text', 'code', 'workbook', 'quiz'];
            sortedCards = cards.sort((a, b) => pythonOrder.indexOf(a.id) - pythonOrder.indexOf(b.id));
          }

          return sortedCards.map(card => card.shouldRender ? card.render() : null);
        })()}
      </div>
      )}

      <button 
        onClick={onBack}
        className="hud-btn secondary glass"
        style={{ 
          marginTop: isMobile ? '1.5rem' : '4rem', 
          padding: '1rem 3rem',
          display: 'block',
          margin: isMobile ? '1.5rem auto 0' : '4rem auto 0'
        }}
      >
        ← RETURN TO MISSION SELECT
      </button>
      </div>
    </div>
  )
  }
  const renderTextView = () => (
    <div className="mission-content-view fade-in" style={{ maxWidth: '1200px', width: isMobile ? '100%' : '95%', margin: '0 auto', padding: isMobile ? '0.75rem 0.75rem 5.5rem' : '1.5rem', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div className="glass-card" style={{ padding: isMobile ? '1rem' : '2.5rem 3rem', background: 'rgba(5, 10, 25, 0.9)', minHeight: 'fit-content' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: isMobile ? '1rem' : '2rem' }}>
          <h2 className="font-title" style={{ fontSize: isMobile ? '1.25rem' : '1.8rem', lineHeight: 1.3, color: 'var(--crystal-cyan)', margin: 0 }}>DATA LOG: {activeUnit?.title}</h2>
          <button onClick={returnFromContent} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>
        
        {/* PDF Viewer */}
        {missionData?.learningContents?.pdfUrl && (
          <div style={{ width: '100%', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.8rem' }}>
              <a 
                href={missionData.learningContents.pdfUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hud-btn secondary glass"
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span>↗️</span> 새 창에서 열기
              </a>
            </div>
            <div style={{ width: '100%', height: isMobile ? '55vh' : '75vh', border: '1px solid var(--neon-blue)', borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 0 20px rgba(0, 243, 255, 0.1)' }}>
              <iframe 
                src={getEmbeddablePdfUrl(missionData.learningContents.pdfUrl)}
                width="100%" 
                height="100%"
                style={{ border: 'none' }}
                title="PDF Document"
                allow="autoplay"
              />
            </div>
          </div>
        )}

        {/* Markdown Content (shown below PDF if both exist, or alone if no PDF) */}
        {missionData?.learningContents?.text?.trim() && (
          <div style={{ marginTop: missionData?.learningContents?.pdfUrl ? '2rem' : 0 }}>
            {missionData?.learningContents?.pdfUrl && (
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                marginBottom: '1rem', paddingBottom: '0.8rem',
                borderBottom: '1px solid rgba(0, 243, 255, 0.2)'
              }}>
                <span style={{ fontSize: '1.2rem' }}>📋</span>
                <h3 className="font-title" style={{ color: 'var(--crystal-cyan)', fontSize: '1.2rem', margin: 0 }}>추가 자료</h3>
              </div>
            )}
            <div className="markdown-body font-tech" style={{ color: 'var(--text-bright)', lineHeight: '1.8' }}>
              <MissionMarkdownViewer text={missionData?.learningContents?.text} imageMode="reading" />
            </div>
          </div>
        )}

        {/* ─── Data Log Reward & Bottom Actions ─── */}
        <div style={{ 
          marginTop: '3rem', 
          textAlign: 'center', 
          borderTop: '1px solid rgba(255,255,255,0.1)', 
          paddingTop: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem'
        }}>
          {/* Reward Section */}
          <div style={{ width: '100%' }}>
            {logRewardClaimed ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--crystal-cyan)' }}>
                <span style={{ fontSize: '1.5rem' }}>✅</span>
                <span className="font-tech" style={{ fontSize: '1.1rem' }}>데이터 분석 완료 (보상 수령됨)</span>
              </div>
            ) : timeRemaining > 0 ? (
              <button
                disabled
                className="hud-btn glass"
                style={{
                  padding: '1rem 3rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'var(--text-muted)',
                  borderRadius: '10px',
                  cursor: 'not-allowed',
                  fontSize: '1rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <span className="font-tech">데이터 분석 중... ({timeRemaining}s)</span>
                {/* Progress bar */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: '3px',
                  width: `${((60 - timeRemaining) / 60) * 100}%`,
                  background: 'var(--crystal-cyan)',
                  transition: 'width 1s linear'
                }} />
              </button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 243, 255, 0.4)' }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClaimLogReward}
                className="hud-btn primary glass"
                style={{
                  padding: '1rem 3rem',
                  background: 'rgba(0, 243, 255, 0.2)',
                  border: '2px solid var(--crystal-cyan)',
                  color: 'var(--text-bright)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 700
                }}
              >
                💎 학습 완료 · 보상 받기 (+30 광석)
              </motion.button>
            )}
          </div>

          {/* Bottom Close Button (requested by user for better UX on long docs) */}
          <button
            onClick={returnFromContent}
            className="hud-btn secondary glass"
            style={{
              padding: '0.8rem 2.5rem',
              fontSize: '1rem',
              color: 'var(--text-muted)',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>←</span> 본부로 돌아가기 (CLOSE)
          </button>
        </div>
      </div>
    </div>
  )

  const renderVideoView = () => {
    const txList = missionData?.transmissions || []
    
    if (txList.length === 0) {
       return (
         <div className="mission-content-view fade-in" style={{ width: '100%', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <h3 className="font-title" style={{ color: 'var(--alert-red)' }}>NO TRANSMISSION FOUND</h3>
                <p className="font-tech" style={{ color: 'var(--text-muted)' }}>등록된 영상 데이터 칩이 없습니다.</p>
                <button onClick={returnFromContent} className="hud-btn secondary glass" style={{ marginTop: '2rem' }}>RETURN TO ORBIT</button>
            </div>
         </div>
       )
    }

    if (!selectedTx && txList.length === 1) {
       // Use effect-safe approach instead of setState during render
       Promise.resolve().then(() => setSelectedTx(txList[0]))
       return null
    }

    if (selectedTx) {
      // Get saved position for resume
      const txId = selectedTx.id || 'default'
      const knownVideoDuration = videoDurationRef.current > 0 ? videoDurationRef.current : 0
      const completionTargetPercent = getVideoCompletionTargetPercent(knownVideoDuration)
      const completionRate = knownVideoDuration > 0
        ? Math.min(100, Math.floor((stampCount / knownVideoDuration) * 100))
        : 0
      const creditedSeconds = Math.floor(creditedWatchSeconds)

      return (
          <div className="theater-wrapper">
             <div className="theater-aspect-box">
               {initialStartPosition !== null ? (
                 <YoutubePlayer 
                    ref={videoPlayerRef}
                    key={`${selectedTx.videoId}_${initialStartPosition}`}
                    videoId={selectedTx.videoId}
                    start={initialStartPosition}
                    end={selectedTx.end}
                    initialPlaybackRate={playbackRate}
                    onTimeUpdate={handleVideoTimeUpdate}
                    onComplete={() => setIsAtEnd(true)}
                    onTrackingStatus={handleVideoTrackingStatus}
                    onPlaybackStateChange={(state) => {
                      const playing = state === window.YT?.PlayerState?.PLAYING
                      isVideoPlayingRef.current = playing
                      setIsVideoPlaying(playing)
                    }}
                    onError={(err) => {
                      setVideoError(true)
                    }}
                 />
               ) : (
                 <div className="font-tech" style={{ color: 'var(--text-muted)' }}>
                   🚀 데이터 동기화 중...
                 </div>
               )}
             </div>

             {/* Top HUD Overlay */}
             <div className="theater-hud top-hud" style={{ opacity: isUiVisible ? 1 : 0 }}>
               <div>
                  {/* Global Back Button Integrated into Top HUD */}
                  <button 
                    className="space-nav-link font-tech"
                    onClick={() => {
                      soundManager.playClick()
                      handleSaveVideoPosition()
                    }}
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: 'none',
                      color: 'white',
                      padding: '0.5rem 1rem 1rem 0',
                      marginBottom: '0.5rem',
                      border: 'none',
                      boxShadow: 'none'
                    }}
                  >
                    ← RETURN TO MISSION SELECT
                  </button>
                  <h3 className="font-title" style={{ margin: 0, color: '#fff', fontSize: isMobile ? '1rem' : '1.4rem', lineHeight: 1.3, textShadow: '0 2px 5px rgba(0,0,0,0.8)' }}>
                     <span style={{ color: 'var(--planet-green)' }}>📡 {selectedTx.title}</span>
                  </h3>
               </div>
               <div style={{ display: 'flex', gap: isMobile ? '0.55rem' : '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                 <AnimatePresence>
                   {saveStatus && (
                     <motion.div 
                       initial={{ opacity: 0, scale: 0.8 }}
                       animate={{ opacity: 1, scale: 1 }}
                       exit={{ opacity: 0 }}
                       style={{ color: saveStatus === 'saved' ? 'var(--planet-green)' : 'var(--crystal-cyan)', fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                       title="데이터 안전하게 동기화 중"
                     >
                       {saveStatus === 'saved' ? '✔' : '☁️'}
                     </motion.div>
                   )}
                 </AnimatePresence>
                 {(creditedSeconds > 0 || stampCount > 0) && (
                   <span className="font-tech" style={{ color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? '0.76rem' : '0.9rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                     인정 학습: {Math.floor(creditedSeconds / 60)}분 {creditedSeconds % 60}초 · 완료율 {completionRate}% / 기준 {completionTargetPercent}%
                   </span>
                 )}
                 <div
                   className="glass"
                   style={{
                     display: 'flex',
                     alignItems: 'center',
                     gap: '0.25rem',
                     padding: '0.28rem',
                     border: '1px solid rgba(255,255,255,0.14)',
                     borderRadius: '10px',
                     background: 'rgba(0,0,0,0.42)',
                     boxShadow: '0 4px 18px rgba(0,0,0,0.28)'
                   }}
                   aria-label="영상 재생 속도"
                 >
                   {VIDEO_PLAYBACK_RATES.map((rate) => (
                     <button
                       key={rate}
                       type="button"
                       onClick={() => handlePlaybackRateChange(rate)}
                       className="font-tech"
                       title={`${rate}배속으로 재생`}
                       aria-pressed={playbackRate === rate}
                       style={{
                         minWidth: isMobile ? '2.4rem' : '2.75rem',
                         height: isMobile ? '2rem' : '2.15rem',
                         border: playbackRate === rate ? '1px solid var(--crystal-cyan)' : '1px solid transparent',
                         borderRadius: '7px',
                         background: playbackRate === rate ? 'rgba(0, 243, 255, 0.22)' : 'transparent',
                         color: playbackRate === rate ? '#fff' : 'rgba(255,255,255,0.72)',
                         cursor: 'pointer',
                         fontSize: isMobile ? '0.72rem' : '0.78rem',
                         fontWeight: playbackRate === rate ? 800 : 600
                       }}
                     >
                       {rate}x
                     </button>
                   ))}
                 </div>
                 <button 
                   onClick={returnFromContent} 
                   className="hud-btn glass"
                   style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.9rem' }}
                 >
                   ← BACK
                 </button>
               </div>
             </div>

             {/* Bottom HUD Overlay */}
             <div
               className="theater-hud bottom-hud"
               style={{ opacity: (isUiVisible || videoCompleted || isAtEnd || videoTrackingWarning) ? 1 : 0, flexDirection: 'column' }}
             >
               {videoTrackingWarning && (
                 <div
                   className="font-tech"
                   style={{
                     width: '100%',
                     maxWidth: '720px',
                     margin: '0 auto 0.65rem',
                     padding: '0.65rem 0.85rem',
                     border: '1px solid rgba(255, 184, 0, 0.45)',
                     borderRadius: '8px',
                     background: 'rgba(255, 184, 0, 0.14)',
                     color: '#ffe6a3',
                     fontSize: isMobile ? '0.78rem' : '0.86rem',
                     lineHeight: 1.45,
                     textAlign: 'center',
                     boxShadow: '0 4px 15px rgba(0,0,0,0.35)'
                   }}
                 >
                   {videoTrackingWarning}
                 </div>
               )}
               <div style={{ display: 'flex', gap: isMobile ? '0.65rem' : '1rem', justifyContent: 'center', width: '100%', flexDirection: isMobile ? 'column' : 'row' }}>
                 <button 
                   onClick={handleSaveVideoPosition}
                   className="hud-btn secondary glass"
                   style={{ 
                     padding: isMobile ? '0.85rem 1rem' : '0.8rem 2.5rem', 
                     fontSize: isMobile ? '0.9rem' : '1rem',
                     borderColor: videoCompleted ? 'var(--planet-green)' : ((isAtEnd || videoError || videoTrackingUnavailable) ? 'var(--alert-red)' : undefined),
                     background: videoCompleted ? 'rgba(0, 255, 136, 0.2)' : ((isAtEnd || videoError || videoTrackingUnavailable) ? 'rgba(255, 77, 77, 0.2)' : 'rgba(0,0,0,0.5)'),
                     color: (isAtEnd || videoError || videoTrackingUnavailable) && !videoCompleted ? '#ffb3b3' : 'white',
                     boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                   }}
                 >
                   {videoCompleted ? (
                     learningProgress?.videoProgress?.[txId]?.completed ? (
                       <>✅ 탐사 완료 (돌아가기)</>
                     ) : (
                        completionBonusTimeLeft > 0 ? (
                          <>✨ 데이터 수신 완료! (총 {totalRewardedCrystals + 20}광석 획득) ⏳ {completionBonusTimeLeft}초 · 돌아가기</>
                        ) : (
                          <>☑️ 수신 지연! (완료 보너스 소멸) · 돌아가기</>
                        )
                     )
                   ) : (isAtEnd || videoError || videoTrackingUnavailable) ? (
                       <>☑️ 수동 완료 처리 (외부 시청 완료)</>
                   ) : (
                     <>📋 오늘은 여기까지</>
                   )}
                 </button>

                 <button
                   onClick={() => handleOpenQuestionModal('video')}
                   className="hud-btn primary glass capture-hide"
                   style={{
                     padding: isMobile ? '0.85rem 1rem' : '0.8rem 2rem',
                     fontSize: isMobile ? '0.9rem' : '1rem',
                     borderRadius: '10px',
                     background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.3), rgba(34, 211, 238, 0.3))',
                     borderColor: 'var(--crystal-cyan)',
                     color: 'white',
                     boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                   }}
                 >
                   🙋 선생님께 질문하기
                 </button>

                 <button
                   onClick={handleOpenQaRoom}
                   className="hud-btn primary glass capture-hide"
                   style={{
                     padding: isMobile ? '0.85rem 1rem' : '0.8rem 1.6rem',
                     fontSize: isMobile ? '0.9rem' : '1rem',
                     borderRadius: '10px',
                     background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.32), rgba(59, 130, 246, 0.32))',
                     borderColor: '#60a5fa',
                     color: 'white',
                     boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                   }}
                 >
                   🎥 Q&amp;A방
                 </button>
               </div>
               
               <AnimatePresence>
                 {rewardLimitNotice && (
                   <motion.p
                     initial={{ opacity: 0, y: 8 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -4 }}
                     className="font-tech"
                     style={{
                       margin: '0.75rem 0 0',
                       color: '#ffd166',
                       fontSize: '0.85rem',
                       textAlign: 'center',
                       textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                     }}
                   >
                     {rewardLimitNotice}
                   </motion.p>
                 )}
               </AnimatePresence>
               
               {!videoCompleted && (
                 <p className="font-tech" style={{ color: 'rgba(255,255,255,0.7)', margin: '0.75rem 0 0', fontSize: '0.82rem', textAlign: 'center', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                   되감기 재시청도 인정 학습 시간에 포함됩니다. 완료율은 실제로 재생된 고유 구간만 증가하며, 앞으로 넘긴 구간은 인정되지 않습니다.
                 </p>
               )}
               
               {isAtEnd && !videoCompleted && (
                 <motion.p initial={{opacity:0}} animate={{opacity:1}} className="font-tech" style={{ color: '#ffb3b3', margin: 0, fontSize: '0.85rem', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                   통신 장애! 영상의 {completionTargetPercent}% 이상을 탐사해야 보너스 수신이 가능합니다.
                 </motion.p>
               )}
             </div>

             {/* Time Attack Overlay */}
             {showTimeAttack && (
               <TimeAttackOverlay 
                 onHit={handleTimeAttackHit} 
                 onMiss={handleTimeAttackMiss} 
                 currentCombo={timeAttackCombo} 
                 userName={userData?.studentName || user?.displayName}
                 isVideoPaused={!isVideoPlaying}
               />
              )}
          </div>
      )
    }

    // Render list
    return (
      <div className="mission-content-view fade-in" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '1rem 0.75rem 5.5rem' : '2rem 0 0', boxSizing: 'border-box' }}>
         <h2 className="font-title" style={{ textAlign: 'center', color: 'var(--planet-green)', marginBottom: isMobile ? '1rem' : '2rem', fontSize: isMobile ? '1.6rem' : '2rem', lineHeight: 1.2 }}>TRANSMISSION DATA CHIPS</h2>
         <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: isMobile ? '0.85rem' : '1.5rem' }}>
             {txList.map((tx, idx) => {
                 const txId = tx.id || 'default'
                 const txProgress = learningProgress?.videoProgress?.[txId]
                 const isTxCompleted = txProgress?.completed || txProgress?.completionBonusGiven
                 
                 // Offline-First UI: Use local storage cache for resume display if more up-to-date
                 const localCacheKey = `video_progress_${userId}_${unitId}_${txId}`
                 const localPosRaw = localStorage.getItem(localCacheKey + '_pos')
                 const localPos = localPosRaw ? parseFloat(localPosRaw) : 0
                 // Timestamp-based position selection (consistent with restoration effect)
                 const serverUpdateTs = txProgress?.updatedAt?.toMillis 
                   ? txProgress.updatedAt.toMillis() 
                   : (txProgress?.updatedAt?.seconds ? txProgress.updatedAt.seconds * 1000 : 0)
                 const localUpdateTs = parseInt(localStorage.getItem(localCacheKey + '_updatedAt') || '0', 10)
                 const displayPos = (localUpdateTs > serverUpdateTs) ? localPos : (txProgress?.lastPosition || 0)

                 return (
                   <motion.div 
                      key={tx.id}
                      whileHover={isMobile ? undefined : { scale: 1.02, y: -5, borderColor: 'var(--planet-green)' }}
                      onClick={() => setSelectedTx(tx)}
                      className="glass-card"
                      style={{ 
                        cursor: 'pointer', padding: isMobile ? '1rem' : '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', 
                        border: isTxCompleted ? '1px solid var(--planet-green)' : '1px solid rgba(255,255,255,0.1)', 
                        background: isTxCompleted ? 'rgba(0, 255, 136, 0.06)' : 'rgba(10, 20, 40, 0.6)',
                        position: 'relative'
                      }}
                   >
                       {isTxCompleted && (
                         <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', fontSize: '1rem' }}>✅</div>
                       )}
                       <div style={{ fontSize: '2.5rem' }}>📼</div>
                       <div>
                           <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-tech)', marginBottom: '0.2rem' }}>DATA CHIP #{idx + 1}</div>
                           <div style={{ color: 'var(--text-bright)', fontWeight: 'bold', fontSize: isMobile ? '1rem' : '1.1rem', lineHeight: 1.35 }}>{tx.title || `영상 ${idx + 1}`}</div>
                           {displayPos > 0 && !isTxCompleted && (
                             <div style={{ color: 'var(--crystal-cyan)', fontSize: '0.75rem', fontFamily: 'var(--font-tech)', marginTop: '0.3rem' }}>
                               ▶ {Math.floor(displayPos / 60)}:{String(Math.floor(displayPos % 60)).padStart(2, '0')}부터 이어보기
                             </div>
                           )}
                       </div>
                   </motion.div>
                 )
             })}
         </div>
         <div style={{ textAlign: 'center', marginTop: isMobile ? '1.5rem' : '3rem' }}>
             <button 
               onClick={() => updateCurrentMode('briefing')} 
               className="hud-btn secondary glass" 
               style={{ padding: '1rem 3rem' }}
             >
               ← RETURN TO MISSION CONTROL
             </button>
         </div>
      </div>
    )
  }

  // --- Overlay Logic ---
  const handleRequestSupport = (reference) => {
    setShowOverlay(true)
    if (reference?.transmissionId) {
      setOverlayContent('video')
      setOverlayReference(reference)
    } else {
      setOverlayContent('text')
    }
    logActivity('overlay_view_' + (reference?.transmissionId ? 'video' : 'text'))
  }

// If in workbook mode, we render the WorkbookPlayer directly
  if (loadingProgress) {
    return (
      <div className="space-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--crystal-cyan)' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} style={{ fontSize: '3rem' }}>🛰️</motion.div>
          <div className="font-tech" style={{ marginTop: '1rem' }}>데이터 수신 중 (LOADING DATA)...</div>
        </div>
      </div>
    )
  }

  // If in workbook mode, we render the WorkbookPlayer directly
  if (currentMode === 'workbook') {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000, background: '#050a19' }}>
        <WorkbookPlayer 
          pages={activeUnit?.workbookPages || []} 
          unitId={unitId}
          unitTitle={activeUnit?.title}
          onComplete={onComplete}
          onClose={returnFromContent}
        />
      </div>
    )
  }

  if (currentMode === 'code') {
    if (loadingCodeExercises) {
      return (
        <div className="space-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--crystal-cyan)' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} style={{ fontSize: '3rem' }}>⌨️</motion.div>
            <div className="font-tech" style={{ marginTop: '1rem' }}>코드 훈련 데이터 수신 중...</div>
          </div>
        </div>
      )
    }

    return (
      <CodeTracePlayer
        exercises={codeExercises}
        unitId={unitId}
        unitTitle={activeUnit?.title}
        activeUnit={activeUnit}
        clusterId={clusterId}
        learningProgress={learningProgress}
        onClose={returnFromContent}
      />
    )
  }

  // If in quiz mode, we render SpaceQuizView BUT we wrap it to handle the overlay
  if (currentMode === 'quiz') {
    // Show loading state if quizzes not ready
    if (loadingQuizzes) {
      return (
        <div className="space-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--crystal-cyan)' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} style={{ fontSize: '3rem' }}>🛰️</motion.div>
            <div className="font-tech" style={{ marginTop: '1rem' }}>데이터 수신 중 (LOADING QUIZ)...</div>
          </div>
        </div>
      )
    }

    if (errorQuizzes) {
      return (
        <div className="space-bg" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <div className="font-title" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ff4d4d' }}>통신 오류</div>
            <p className="font-tech" style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>퀴즈 데이터를 불러오지 못했습니다.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => refetchQuizzes?.()} className="hud-btn primary glass" style={{ flex: 1, padding: '0.8rem', background: 'rgba(0,243,255,0.2)', border: '1px solid var(--neon-blue)', color: 'white', borderRadius: '10px', cursor: 'pointer' }}>다시 시도</button>
              <button onClick={returnFromContent} className="hud-btn secondary glass" style={{ flex: 1, padding: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '10px', cursor: 'pointer' }}>나가기</button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <>
        <SpaceQuizView
          region={null}
          quizData={{
            unitId: unitId,
            chapterId: activeUnit?.chapterId,
            title: activeUnit?.title,
            questions: unitQuizzes || [] 
          }}
          hasShield={userData?.shieldCharges || 0}
          hasRadar={isRadarActive(userData)}
          isRadarBonus={false}
          onComplete={onComplete}
          onExit={returnFromContent}
          onRequestSupport={handleRequestSupport}
          {...activeUnit}
        />
        
        {/* Support Overlay */}
        <AnimatePresence>
          {showOverlay && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: '100%',
                maxWidth: '600px',
                height: '100vh',
                background: 'rgba(5, 10, 25, 0.95)',
                backdropFilter: 'blur(20px)',
                zIndex: 10000,
                borderLeft: '2px solid var(--neon-blue)',
                padding: '2rem',
                boxShadow: '-10px 0 30px rgba(0,0,0,0.8)'
              }}
            >
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 className="font-title" style={{ fontSize: '1.5rem', color: 'var(--crystal-cyan)' }}>DATA LINK</h3>
                  <button onClick={() => setShowOverlay(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
               </div>

               <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button 
                    onClick={() => { setOverlayContent('text'); logActivity('overlay_view_text'); }}
                    style={{ 
                        flex: 1, padding: '0.8rem', 
                        background: overlayContent === 'text' ? 'var(--neon-blue)' : 'rgba(255,255,255,0.1)',
                        color: overlayContent === 'text' ? 'black' : 'white',
                        border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer'
                    }}
                  >
                    DATA LOG
                  </button>
                  <button 
                    onClick={() => { setOverlayContent('video'); logActivity('overlay_view_video'); }}
                    style={{ 
                        flex: 1, padding: '0.8rem', 
                        background: overlayContent === 'video' ? 'var(--planet-green)' : 'rgba(255,255,255,0.1)',
                        color: overlayContent === 'video' ? 'black' : 'white',
                        border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer'
                    }}
                  >
                    VIDEO FEED
                  </button>
               </div>

               <div style={{ height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                  {overlayContent === 'text' ? (
                      <div style={{ width: '100%' }}>
                          {/* PDF Viewer */}
                          {missionData?.learningContents?.pdfUrl && (
                            <div style={{ width: '100%', marginBottom: '1.5rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                                <a 
                                  href={missionData.learningContents.pdfUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hud-btn secondary glass"
                                  style={{ fontSize: '0.7rem', padding: '0.4rem 0.8rem', textDecoration: 'none' }}
                                >
                                  ↗️ 새 창에서 열기
                                </a>
                              </div>
                              <div style={{ width: '100%', height: '65vh', border: '1px solid var(--neon-blue)', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                                <iframe 
                                  src={getEmbeddablePdfUrl(missionData.learningContents.pdfUrl)}
                                  width="100%" 
                                  height="100%"
                                  style={{ border: 'none' }}
                                  title="PDF Document Overlay"
                                />
                              </div>
                            </div>
                          )}

                          {/* Markdown Content */}
                          {missionData?.learningContents?.text?.trim() && (
                            <div style={{ marginTop: missionData?.learningContents?.pdfUrl ? '2rem' : 0 }}>
                              {missionData?.learningContents?.pdfUrl && (
                                <div style={{ 
                                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                                  marginBottom: '1rem', paddingBottom: '0.8rem',
                                  borderBottom: '1px solid rgba(0, 243, 255, 0.2)'
                                }}>
                                  <span style={{ fontSize: '1.2rem' }}>📋</span>
                                  <h3 className="font-title" style={{ color: 'var(--crystal-cyan)', fontSize: '1.2rem', margin: 0 }}>추가 자료</h3>
                                </div>
                              )}
                              <div className="markdown-body font-tech" style={{ color: 'var(--text-bright)', lineHeight: '1.8' }}>
                                <MissionMarkdownViewer text={missionData?.learningContents?.text} imageMode="reading" />
                              </div>
                            </div>
                          )}

                          {!missionData?.learningContents?.pdfUrl && !missionData?.learningContents?.text?.trim() && (
                            <div className="font-tech" style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
                              표시할 데이터가 없습니다.
                            </div>
                          )}
                      </div>
                  ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ width: '100%', aspectRatio: '16/9' }}>
                              {(() => {
                                   const txList = missionData?.transmissions || [];
                                  if (txList.length === 0) {
                                      return (
                                          <div style={{ width: '100%', height: '100%', background: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'gray' }}>
                                              No video available
                                          </div>
                                      );
                                  }
                                  
                                  // Case 1: Specific mapping info exists
                                  if (overlayReference?.transmissionId) {
                                      const targetTx = txList.find(t => t.id === overlayReference.transmissionId);
                                      if (targetTx) {
                                          return (
                                              <YoutubePlayer 
                                                  videoId={targetTx.videoId}
                                                  start={overlayReference.timestamp || targetTx.start}
                                                  end={targetTx.end}
                                                  isOverlay={true}
                                              />
                                          );
                                      }
                                  }

                                  // Case 2: No specific mapping - Show all videos in a list
                                  return (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                          {txList.map((tx, idx) => (
                                              <div key={tx.id || idx}>
                                                  <div style={{ color: 'var(--planet-green)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                                      #{idx + 1} {tx.title || `영상 ${idx + 1}`}
                                                  </div>
                                                  <div style={{ width: '100%', aspectRatio: '16/9' }}>
                                                      <YoutubePlayer 
                                                        ref={videoPlayerRef}
                                                          videoId={tx.videoId}
                                                          start={tx.start}
                                                          end={tx.end}
                                                          isOverlay={true}
                                                          autoPlay={false}
                                                      />
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  );
                              })()}
                          </div>
                      </div>
                  )}
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )
  }

  return (
    <div className="mission-hub-container space-bg" id="mission-hub-capture-area" style={{ 
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000,
      display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }}>
        {/* Global Back Button (Top-Left) */}
        {currentMode !== 'video' && (
          <button 
            className="space-nav-link font-tech"
            onClick={() => {
              soundManager.playClick()
              onBack()
            }}
            style={{ 
              position: 'absolute', 
              top: isMobile ? '0.85rem' : '2rem', 
              left: isMobile ? '0.75rem' : '2rem', 
              zIndex: 3000,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ← RETURN TO MISSION SELECT
          </button>
        )}

        <AnimatePresence mode='wait'>
           {currentMode === 'briefing' && (
              <motion.div key="briefing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, minHeight: 0, paddingTop: isMobile ? '3.2rem' : '80px', overflowY: 'auto' }}>
                 {renderDashboard()}
              </motion.div>
           )}
           {currentMode === 'text' && (
              <motion.div key="text" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} style={{ flex: 1, minHeight: 0, paddingTop: isMobile ? '3.2rem' : '80px', overflowY: 'auto' }}>
                 {renderTextView()}
              </motion.div>
           )}
           {currentMode === 'video' && (
              <motion.div key="video" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ flex: 1, minHeight: 0, paddingTop: isMobile ? '0' : '80px', overflowY: 'auto' }}>
                 {renderVideoView()}
              </motion.div>
           )}
        </AnimatePresence>

       {/* Silent Crystal Toast */}
       <SilentCrystalToast amount={toastAmount} visible={toastVisible} />

       {/* Field Test Reward Potential Modal */}
       <AnimatePresence>
         {showFieldTestModal && (
           <RewardPotentialModal isMobile={isMobile}
             unit={{
               title: activeUnit?.title,
               bestScore: bestScores[unitId]
             }}
             onCancel={() => {
               const hasDataLog = !!(missionData?.learningContents?.text?.trim() || missionData?.learningContents?.pdfUrl?.trim())
               const hasTransmission = !!(missionData?.transmissions?.length > 0 && missionData.transmissions.some(tx => tx.videoId))
               if (!hasDataLog && !hasTransmission) {
                 // Quiz-only unit — cancel goes back to SpaceHome
                 onBack()
               } else {
                 setShowFieldTestModal(false)
               }
             }}
             onConfirm={() => {
               setShowFieldTestModal(false)
               updateCurrentMode('quiz')
               soundManager.playWarp()
             }}
           />
         )}
       </AnimatePresence>

       {/* Conditionally render Global FAB for text mode */}
       {(currentMode === 'text') && (
          <div
            className="capture-hide"
            style={{
              position: 'fixed',
              bottom: isMobile ? '1rem' : '2rem',
              right: isMobile ? '1rem' : '2rem',
              left: isMobile ? '1rem' : 'auto',
              zIndex: 3000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              gap: '0.65rem'
            }}
          >
            <button
              onClick={() => handleOpenQuestionModal('datalog')}
              className="hud-btn primary glass"
              style={{
                justifyContent: 'center',
                padding: isMobile ? '0.9rem 1rem' : '1rem 1.5rem',
                borderRadius: '50px',
                background: 'linear-gradient(135deg, rgba(0, 243, 255, 0.9), rgba(34, 211, 238, 0.9))',
                color: '#000',
                fontWeight: 800,
                fontSize: '1rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              🙋 선생님 질문
            </button>

            <button
              onClick={handleOpenQaRoom}
              className="hud-btn primary glass"
              style={{
                justifyContent: 'center',
                padding: isMobile ? '0.85rem 1rem' : '0.9rem 1.4rem',
                borderRadius: '50px',
                background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.92), rgba(59, 130, 246, 0.92))',
                color: '#fff',
                fontWeight: 800,
                fontSize: '1rem',
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              🎥 Q&amp;A방
            </button>
          </div>
       )}

       {/* Question Modal */}
       <QuestionModal
         isOpen={isQuestionModalOpen}
         onClose={() => setIsQuestionModalOpen(false)}
         contextData={questionContext}
       />
    </div>
  )
}
