import { Howl, Howler } from 'howler'

/**
 * SoundManager - 사운드 효과 및 BGM 관리
 * 싱글톤 패턴으로 전역에서 사용
 */
class SoundManager {
  constructor() {
    this.sounds = {}
    this.bgm = null
    this.isMuted = false
    this.sfxVolume = 0.15 // 0.6에서 대폭 하향하여 학습 영상 소리를 방해하지 않도록 조정
    
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
        src: ['/sounds/wrong.mp3', '/sounds/wrong.wav'],
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
      this.sounds[key] = new Howl({
        ...config,
        onloaderror: (id, error) => {
          console.warn(`Sound load error for ${key}:`, error)
        }
      })
    })
  }

  // 효과음 재생
  play(soundName) {
    if (this.isMuted) return
    
    const sound = this.sounds[soundName]
    if (sound) {
      sound.play()
    }
  }

  // 정답 효과음
  playCorrect() {
    this.play('correct')
  }

  // 오답 효과음
  playWrong() {
    this.play('wrong')
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
