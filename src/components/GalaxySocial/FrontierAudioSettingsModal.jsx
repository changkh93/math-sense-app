import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Volume2, VolumeX, Shield, Sparkles, X } from 'lucide-react'
import { FRONTIER_AUDIO_ASSETS_READY } from '../../audio/soundRegistry'
import { DEFAULT_AUDIO_PREFERENCES } from '../../audio/audioPreferences'
import soundManager from '../../utils/SoundManager'

export default function FrontierAudioSettingsModal({ open, onClose }) {
  const [prefs, setPrefs] = useState(() => soundManager.getPreferences())
  const dialogRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previousFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    const frameId = window.requestAnimationFrame(() => closeButtonRef.current?.focus())

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = Array.from(dialogRef.current?.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ) || [])
      if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frameId)
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus?.()
    }
  }, [open])

  if (!open) return null

  const handleToggleEnabled = () => {
    const updated = soundManager.updatePreferences({ enabled: !prefs.enabled })
    setPrefs(updated)
  }

  const handleToggleQuietMode = () => {
    const updated = soundManager.updatePreferences({ quietMode: !prefs.quietMode })
    setPrefs(updated)
  }

  const handleToggleReducedSpatial = () => {
    const updated = soundManager.updatePreferences({ reducedSpatial: !prefs.reducedSpatial })
    setPrefs(updated)
  }

  const handleSliderChange = (key, value) => {
    const numVal = parseFloat(value)
    if (!Number.isFinite(numVal)) return
    const updated = soundManager.updatePreferences({ [key]: numVal })
    setPrefs(updated)
  }

  const handleReset = () => {
    const updated = soundManager.updatePreferences({
      enabled: DEFAULT_AUDIO_PREFERENCES.enabled,
      ambience: DEFAULT_AUDIO_PREFERENCES.ambience,
      action: DEFAULT_AUDIO_PREFERENCES.action,
      ui: DEFAULT_AUDIO_PREFERENCES.ui,
      quietMode: DEFAULT_AUDIO_PREFERENCES.quietMode,
      reducedSpatial: DEFAULT_AUDIO_PREFERENCES.reducedSpatial,
    })
    setPrefs(updated)
  }

  const handleTestVolume = () => {
    const updated = soundManager.updatePreferences({
      enabled: true,
      ambience: 1,
      action: 1,
      ui: 1,
      quietMode: false,
    })
    setPrefs(updated)
  }

  return (
    <div
      className="frontier-audio-settings-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="frontier-audio-settings-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="frontier-audio-settings-title"
        tabIndex={-1}
      >
        <header className="frontier-audio-settings-header">
          <div className="title-group">
            <Sparkles size={18} className="icon-sparkle" aria-hidden="true" />
            <h3 id="frontier-audio-settings-title">오디오 및 소리 설정</h3>
          </div>
          <button ref={closeButtonRef} type="button" className="btn-close" onClick={onClose} aria-label="설정 닫기">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="frontier-audio-settings-body">
          {!FRONTIER_AUDIO_ASSETS_READY && (
            <div className="frontier-audio-asset-notice" role="status">
              <strong>현재 전용 음원은 비활성 상태입니다.</strong>
              <span>환경음·물소리·발걸음은 아직 들리지 않으며, 충돌·수집·완료음은 기존 대체음으로 재생됩니다.</span>
            </div>
          )}

          {/* 전체 마스터 사운드 토글 */}
          <div className="setting-row toggle-row">
            <div className="label-group">
              <strong>전체 소리 출력</strong>
              <span>모든 효과음, 배경음악과 행성 환경음을 켭니다.</span>
            </div>
            <button
              type="button"
              className={`toggle-btn ${prefs.enabled ? 'active' : ''}`}
              onClick={handleToggleEnabled}
              role="switch"
              aria-checked={prefs.enabled}
              aria-label="전체 소리 출력"
            >
              {prefs.enabled ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
              <span>{prefs.enabled ? '켜짐' : '음소거'}</span>
            </button>
          </div>

          {/* 조용한 모드 (Quiet Mode) */}
          <div className="setting-row toggle-row highlight-row">
            <div className="label-group">
              <div className="title-with-badge">
                <strong>조용한 모드 (Quiet Mode)</strong>
                <span className="badge">권장</span>
              </div>
              <span>환경음은 유지하고 발소리·충돌·알림·보상음을 더 크게 낮춥니다.</span>
            </div>
            <button
              type="button"
              className={`toggle-btn ${prefs.quietMode ? 'active' : ''}`}
              onClick={handleToggleQuietMode}
              role="switch"
              aria-checked={prefs.quietMode}
              aria-label="조용한 모드"
            >
              <Shield size={16} aria-hidden="true" />
              <span>{prefs.quietMode ? '적용 중' : '해제됨'}</span>
            </button>
          </div>

          {/* 3D 공간음 단순화 (Reduced Spatial) */}
          <div className="setting-row toggle-row">
            <div className="label-group">
              <strong>공간음 단순화 (Reduced Spatial)</strong>
              <span>3D 방향·거리 처리를 끄고 단순한 위치감으로 재생합니다.</span>
            </div>
            <button
              type="button"
              className={`toggle-btn ${prefs.reducedSpatial ? 'active' : ''}`}
              onClick={handleToggleReducedSpatial}
              role="switch"
              aria-checked={prefs.reducedSpatial}
              aria-label="공간음 단순화"
            >
              <span>{prefs.reducedSpatial ? '단순화' : '기본 3D'}</span>
            </button>
          </div>

          {/* 음량 슬라이더 제어 */}
          <div className="sliders-section">
            <div className="slider-group">
              <div className="slider-header">
                <label htmlFor="slider-ambience">배경음악 및 행성 환경음</label>
                <span>{Math.round(prefs.ambience * 100)}%</span>
              </div>
              <input
                id="slider-ambience"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={prefs.ambience}
                aria-valuetext={`${Math.round(prefs.ambience * 100)}%`}
                onChange={(e) => handleSliderChange('ambience', e.target.value)}
              />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <label htmlFor="slider-action">발소리 및 동작 효과음</label>
                <span>{Math.round(prefs.action * 100)}%</span>
              </div>
              <input
                id="slider-action"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={prefs.action}
                aria-valuetext={`${Math.round(prefs.action * 100)}%`}
                onChange={(e) => handleSliderChange('action', e.target.value)}
              />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <label htmlFor="slider-ui">인터페이스 피드백음</label>
                <span>{Math.round(prefs.ui * 100)}%</span>
              </div>
              <input
                id="slider-ui"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={prefs.ui}
                aria-valuetext={`${Math.round(prefs.ui * 100)}%`}
                onChange={(e) => handleSliderChange('ui', e.target.value)}
              />
            </div>
          </div>

          <div className="frontier-audio-preset-actions">
            <button type="button" className="frontier-audio-test-volume-btn" onClick={handleTestVolume}>
              <Volume2 size={15} aria-hidden="true" />
              테스트 음량 100%
            </button>
            <button type="button" className="frontier-audio-reset-btn" onClick={handleReset}>
              <RotateCcw size={15} aria-hidden="true" />
              기본값으로 되돌리기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
