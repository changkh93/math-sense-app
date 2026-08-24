import assert from 'node:assert/strict'
import {
  QUIZ_WINDOW_BLUR_CONFIRM_DELAY_MS,
  createSustainedBlurGuard,
} from '../src/utils/quizFocusGuard.js'

const createFakeClock = () => {
  let currentTime = 0
  let nextTimerId = 1
  const timers = new Map()

  const advance = (elapsedMs) => {
    currentTime += elapsedMs
    const dueTimers = [...timers.entries()]
      .filter(([, timer]) => timer.dueAt <= currentTime)
      .sort((a, b) => a[1].dueAt - b[1].dueAt)
    dueTimers.forEach(([timerId, timer]) => {
      if (!timers.delete(timerId)) return
      timer.callback()
    })
  }

  return {
    now: () => currentTime,
    setTimer: (callback, delayMs) => {
      const timerId = nextTimerId++
      timers.set(timerId, { callback, dueAt: currentTime + delayMs })
      return timerId
    },
    clearTimer: timerId => timers.delete(timerId),
    advance,
  }
}

{
  const clock = createFakeClock()
  let confirmationCount = 0
  const guard = createSustainedBlurGuard({
    canStart: () => true,
    shouldConfirm: () => true,
    onConfirmed: () => { confirmationCount += 1 },
    ...clock,
  })

  guard.start()
  clock.advance(QUIZ_WINDOW_BLUR_CONFIRM_DELAY_MS - 1)
  guard.cancel()
  clock.advance(1)

  assert.equal(confirmationCount, 0, '일시적인 blur는 위반으로 확정하지 않아야 합니다.')
  assert.equal(guard.isPending(), false, '포커스 복귀 후 대기 타이머가 남지 않아야 합니다.')
}

{
  const clock = createFakeClock()
  const confirmations = []
  const guard = createSustainedBlurGuard({
    canStart: () => true,
    shouldConfirm: () => true,
    onConfirmed: details => confirmations.push(details),
    ...clock,
  })

  guard.start()
  clock.advance(QUIZ_WINDOW_BLUR_CONFIRM_DELAY_MS)

  assert.equal(confirmations.length, 1, '지속된 blur는 한 번만 확정해야 합니다.')
  assert.equal(confirmations[0].durationMs, QUIZ_WINDOW_BLUR_CONFIRM_DELAY_MS)
}

{
  const clock = createFakeClock()
  let confirmationCount = 0
  let confirmable = true
  const guard = createSustainedBlurGuard({
    canStart: () => true,
    shouldConfirm: () => confirmable,
    onConfirmed: () => { confirmationCount += 1 },
    ...clock,
  })

  guard.start()
  confirmable = false
  clock.advance(QUIZ_WINDOW_BLUR_CONFIRM_DELAY_MS)

  assert.equal(confirmationCount, 0, '대기 중 내부 캡처나 전환 상태가 되면 확정을 취소해야 합니다.')
}

{
  const clock = createFakeClock()
  let confirmationCount = 0
  const guard = createSustainedBlurGuard({
    canStart: () => false,
    shouldConfirm: () => true,
    onConfirmed: () => { confirmationCount += 1 },
    ...clock,
  })

  assert.equal(guard.start(), false, '진입 유예 구간에서는 감지를 시작하지 않아야 합니다.')
  clock.advance(QUIZ_WINDOW_BLUR_CONFIRM_DELAY_MS)
  assert.equal(confirmationCount, 0)
}

{
  const clock = createFakeClock()
  let confirmationCount = 0
  const guard = createSustainedBlurGuard({
    canStart: () => true,
    shouldConfirm: () => true,
    onConfirmed: () => { confirmationCount += 1 },
    ...clock,
  })

  guard.start()
  clock.advance(1000)
  guard.start()
  clock.advance(800)
  assert.equal(confirmationCount, 0, '연속 blur는 이전 타이머를 남기지 않고 판정 시간을 다시 시작해야 합니다.')
  clock.advance(1000)
  assert.equal(confirmationCount, 1, '마지막 blur를 기준으로 한 번만 확정해야 합니다.')
}

console.log('quiz focus guard tests passed')
