import { useState } from 'react'
import { Volume2, VolumeX, Shield, Sparkles, X } from 'lucide-react'
import soundManager from '../../utils/SoundManager'

export default function FrontierAudioSettingsModal({ open, onClose }) {
  const [prefs, setPrefs] = useState(() => soundManager.getPreferences())

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
    const updated = soundManager.updatePreferences({ [key]: numVal })
    setPrefs(updated)
  }

  return (
    <div className="frontier-audio-settings-overlay" onClick={onClose} role="presentation">
      <div className="frontier-audio-settings-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="오디오 및 환경음 설정">
        <header className="frontier-audio-settings-header">
          <div className="title-group">
            <Sparkles size={18} className="icon-sparkle" />
            <h3>오디오 및 소리 설정</h3>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="설정 닫기">
            <X size={18} />
          </button>
        </header>

        <div className="frontier-audio-settings-body">
          {/* 전체 마스터 사운드 토글 */}
          <div className="setting-row toggle-row">
            <div className="label-group">
              <strong>전체 소리 출력</strong>
              <span>모든 효과음과 배경 환경음을 켭니다.</span>
            </div>
            <button
              type="button"
              className={`toggle-btn ${prefs.enabled ? 'active' : ''}`}
              onClick={handleToggleEnabled}
              aria-label="전체 소리 출력 토글"
            >
              {prefs.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
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
              <span>갑작스러운 큰 소리를 방지하고 전체 음량을 50% 부드럽게 감쇄합니다.</span>
            </div>
            <button
              type="button"
              className={`toggle-btn ${prefs.quietMode ? 'active' : ''}`}
              onClick={handleToggleQuietMode}
              aria-label="조용한 모드 토글"
            >
              <Shield size={16} />
              <span>{prefs.quietMode ? '적용 중' : '해제됨'}</span>
            </button>
          </div>

          {/* 3D 공간음 단순화 (Reduced Spatial) */}
          <div className="setting-row toggle-row">
            <div className="label-group">
              <strong>공간음 단순화 (Reduced Spatial)</strong>
              <span>3D 위치에 따른 볼륨 변화를 완화하여 편안한 청취를 지원합니다.</span>
            </div>
            <button
              type="button"
              className={`toggle-btn ${prefs.reducedSpatial ? 'active' : ''}`}
              onClick={handleToggleReducedSpatial}
              aria-label="공간음 단순화 토글"
            >
              <span>{prefs.reducedSpatial ? '단순화' : '기본 3D'}</span>
            </button>
          </div>

          {/* 음량 슬라이더 제어 */}
          <div className="sliders-section">
            <div className="slider-group">
              <div className="slider-header">
                <label htmlFor="slider-ambience">행성 백그라운드 환경음</label>
                <span>{Math.round(prefs.ambience * 100)}%</span>
              </div>
              <input
                id="slider-ambience"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={prefs.ambience}
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
                onChange={(e) => handleSliderChange('ui', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
