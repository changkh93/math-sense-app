import { useCallback } from 'react'

/**
 * ParticleEffect - 파티클 버스트 효과
 * 정답 시 별/광석 파티클이 터지는 효과
 */
export function createParticleBurst(x, y, type = 'star') {
  const colors = {
    star: ['#ffd700', '#ffec8b', '#fff8dc'],
    ore: ['#50C878', '#FFD700', '#00FA9A'], // Emerald, Gold, Medium Spring Green
    wrong: ['#FF8C00', '#9932CC', '#4B0082'], // Dark Orange, Dark Orchid, Indigo
  }

  const particleColors = colors[type] || colors.star
  const count = type === 'wrong' ? 8 : 15

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div')
    particle.className = 'particle-burst'
    
    const angle = (Math.PI * 2 * i) / count
    const velocity = 100 + Math.random() * 100
    const size = 4 + Math.random() * 8
    const color = particleColors[Math.floor(Math.random() * particleColors.length)]
    
    particle.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${type === 'ore' ? '2px' : '50%'};
      pointer-events: none;
      z-index: 10000;
      box-shadow: 0 0 ${size}px ${color};
    `
    
    if (type === 'ore') {
      particle.style.transform = 'rotate(45deg)'
    }
    
    document.body.appendChild(particle)
    
    // 애니메이션
    const startTime = performance.now()
    const duration = 800 + Math.random() * 400
    
    function animate(time) {
      const elapsed = time - startTime
      const progress = elapsed / duration
      
      if (progress >= 1) {
        particle.remove()
        return
      }
      
      const dx = Math.cos(angle) * velocity * progress
      const dy = Math.sin(angle) * velocity * progress + (progress * progress * 200) // 중력
      const scale = 1 - progress
      const opacity = 1 - progress
      
      particle.style.transform = `translate(${dx}px, ${dy}px) scale(${scale}) ${type === 'ore' ? 'rotate(45deg)' : ''}`
      particle.style.opacity = opacity
      
      requestAnimationFrame(animate)
    }
    
    requestAnimationFrame(animate)
  }
}

/**
 * 화면 흔들림 효과 (오답 시)
 */
export function shakeScreen(duration = 500) {
  const container = document.querySelector('.space-bg') || document.body
  container.style.animation = `wrong-shake ${duration}ms ease`
  setTimeout(() => {
    container.style.animation = ''
  }, duration)
}

/**
 * React Hook for particles
 */
export function useParticles() {
  const triggerCorrect = useCallback((event) => {
    const rect = event.target.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    createParticleBurst(x, y, 'star')
    createParticleBurst(x, y, 'ore')
  }, [])

  const triggerWrong = useCallback((event) => {
    const rect = event.target.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    createParticleBurst(x, y, 'wrong')
    shakeScreen()
  }, [])

  return { triggerCorrect, triggerWrong }
}

export default { createParticleBurst, shakeScreen, useParticles }
