import { Howl, Howler } from 'howler'

/**
 * SoundManager - 사운드 효과 및 BGM 관리
 * 싱글톤 패턴으로 전역에서 사용
 */
class SoundManager {
  constructor() {
    this.sounds = {}
    this.soundVolumes = {}
    this.bgm = null
    this.isMuted = false
    this.sfxVolume = 0.2 // 학습 영상 소리를 방해하지 않으면서 피드백이 분명히 들리는 수준
    
    // 사운드 초기화
    this.initSounds()
  }

  initSounds() {
    // 효과음 정의
    const soundDefs = {
      correct: {
        src: ['/sounds/correct.wav', '/sounds/correct.mp3'],
        volume: this.sfxVolume,
      },
      wrong: {
        // 기존 wrong.mp3는 0.19초/-19.5dB로, 공통 효과음 볼륨(15%) 적용 시
        // 사실상 들리지 않는다. 충분히 인지 가능한 오류 버저음을 우선 사용한다.
        src: ['/metasense-promo/remote-sfx/error-buzz.wav', '/sounds/wrong.mp3'],
        volume: this.sfxVolume,
      },
      click: {
        src: ['/sounds/click.wav', '/sounds/click.mp3'],
        volume: this.sfxVolume * 0.5,
      },
      levelUp: {
        src: ['/sounds/levelup.wav', '/sounds/levelup.mp3'],
        volume: this.sfxVolume,
      },
      crystal: {
        src: ['/sounds/crystal.mp3', '/sounds/crystal.wav'],
        volume: this.sfxVolume * 0.4, // 0.7에서 하향
      },
      whoosh: {
        src: ['/sounds/whoosh.wav', '/sounds/whoosh.mp3'],
        volume: this.sfxVolume * 0.3, // 0.4에서 하향
      },
      warp: {
        src: ['/sounds/space_warp.wav'],
        volume: this.sfxVolume * 0.5, // 0.9에서 하향
      },
    }

    // Howl 인스턴스 생성
    Object.entries(soundDefs).forEach(([key, config]) => {
      this.soundVolumes[key] = config.volume
      this.sounds[key] = new Howl({
        ...config,
        onloaderror: (id, error) => {
          console.warn(`Sound load error for ${key}:`, error)
        }
      })
    })
  }

  // 효과음 재생
  play(soundName, volumeMultiplier = 1) {
    if (this.isMuted) return
    
    const sound = this.sounds[soundName]
    if (sound) {
      const soundId = sound.play()
      const baseVolume = this.soundVolumes[soundName] ?? this.sfxVolume
      sound.volume(Math.min(1, baseVolume * volumeMultiplier), soundId)
    }
  }

  // 정답 효과음
  playCorrect(volumeMultiplier = 1) {
    this.play('correct', volumeMultiplier)
  }

  // 오답 효과음
  playWrong(volumeMultiplier = 1) {
    this.play('wrong', volumeMultiplier)
  }

  // 클릭 효과음
  playClick() {
    this.play('click')
  }

  // 광석 획득 효과음
  playCrystal() {
    this.play('crystal')
  }

  // 레벨업 효과음
  playLevelUp() {
    this.play('levelUp')
  }

  // 행성/미션 진입 워프 효과음
  playWarp() {
    this.play('warp')
  }



  // 음소거 토글
  toggleMute() {
    this.isMuted = !this.isMuted
    Howler.mute(this.isMuted)
    return this.isMuted
  }

  // 전체 볼륨 설정
  setVolume(volume) {
    Howler.volume(volume)
  }

}

// 싱글톤 인스턴스
const soundManager = new SoundManager()

export default soundManager
