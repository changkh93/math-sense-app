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
    this.bgmVolume = 0.1
    this.sfxVolume = 0.6
    
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
        volume: this.sfxVolume * 0.8,
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
        volume: this.sfxVolume * 0.7,
      },
      whoosh: {
        src: ['/sounds/whoosh.wav', '/sounds/whoosh.mp3'],
        volume: this.sfxVolume * 0.4,
      },
      warp: {
        src: ['/sounds/space_warp.wav'],
        volume: this.sfxVolume * 0.9,
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

  // 결정 획득 효과음
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


  // BGM 시작
  startBGM() {
    if (this.bgm) {
      this.bgm.play()
      return
    }

    this.bgm = new Howl({
      src: ['/sounds/space-bgm.mp3', '/sounds/space-bgm.wav'],
      volume: this.bgmVolume,
      loop: true,
      onloaderror: () => {
        console.warn('BGM not found')
      }
    })
    
    this.bgm.play()
  }

  // BGM 정지
  stopBGM() {
    if (this.bgm) {
      this.bgm.stop()
    }
  }

  // BGM 페이드 아웃
  fadeBGM(duration = 1000) {
    if (this.bgm) {
      this.bgm.fade(this.bgmVolume, 0, duration)
      setTimeout(() => this.bgm.stop(), duration)
    }
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

  // BGM 볼륨 설정
  setBGMVolume(volume) {
    this.bgmVolume = volume
    if (this.bgm) {
      this.bgm.volume(volume)
    }
  }
}

// 싱글톤 인스턴스
const soundManager = new SoundManager()

export default soundManager
