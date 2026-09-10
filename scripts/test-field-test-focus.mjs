import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { createSustainedBlurGuard } from '../src/utils/quizFocusGuard.js'
import { createQuizFocusDiagnostics, isQuizFullscreenAvailable, requestQuizFullscreen } from '../src/utils/fieldTestFocus.js'

// Exercise the actual component callbacks/listeners with deterministic browser
// events. Firebase is replaced only at the persistence boundary; no live writes.
const source = readFileSync(new URL('../src/components/Space/SpaceQuizView.jsx', import.meta.url), 'utf8')
const section = (from, to) => {
  const start = source.indexOf(from)
  const end = source.indexOf(to, start)
  assert.ok(start >= 0 && end > start)
  return source.slice(start, end)
}
const callbacks = section('  const recordFocusDiagnostic = ', '\n  useEffect(() => {\n    if (!isResultMode')
  + section('  const resumeFieldTestFocus = ', '\n  const exitTerminatedFieldTest')

{
  const entrySource = readFileSync(new URL('../src/components/Space/DarkMatterView.jsx', import.meta.url), 'utf8')
  const start = entrySource.indexOf('  const handleStartGroup = ')
  const end = entrySource.indexOf('\n  return (', start)
  assert.ok(start >= 0 && end > start)
  const questions = [{ id: 'entry-q1' }]
  let received
  vm.runInNewContext(entrySource.slice(start, end) + '\nhandleStartGroup({ questions });', {
    questions,
    onStartQuiz: value => { received = value },
    document: { documentElement: { requestFullscreen() { throw new Error('unwanted fullscreen') } } },
  })
  assert.equal(received, questions, 'Dark Matter entry must open the selected questions without fullscreen')
}

const setup = ({ darkMatter = true, fullscreen = false, supported = true, enabled = true } = {}) => {
  let time = 10000, nextTimer = 0, cleanup
  const timers = new Map(), classes = new Set(), writes = [], saves = [], diagnostics = []
  const state = { locked: false, count: 0, reason: '', resuming: false, exited: false, saveOk: true, requests: 0 }
  const events = () => {
    const listeners = new Map()
    return {
      addEventListener: (name, fn) => listeners.set(name, fn),
      removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name) },
      fire: (name, event = {}) => listeners.get(name)?.(event),
      listeners,
    }
  }
  const clock = {
    now: () => time,
    setTimer: (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, due: time + delay }); return id },
    clearTimer: id => timers.delete(id),
    advance: ms => {
      time += ms
      for (const [id, timer] of [...timers]) if (timer.due <= time && timers.delete(id)) timer.fn()
    },
  }
  const document = {
    ...events(), hidden: false, hasFocus: () => false, fullscreenEnabled: enabled,
    fullscreenElement: fullscreen ? {} : null,
    documentElement: {},
    body: { classList: { contains: x => classes.has(x), add: x => classes.add(x), remove: x => classes.delete(x) } },
  }
  if (supported) document.documentElement.requestFullscreen = () => {
    state.requests += 1
    document.fullscreenElement = {}
    document.fire('fullscreenchange')
    return Promise.resolve()
  }
  document.exitFullscreen = async () => { document.fullscreenElement = null }
  const window = { ...events(), setTimeout: clock.setTimer, clearTimeout: clock.clearTimer }
  const context = {
    document, window, navigator: { onLine: true, userAgent: 'synthetic tablet', maxTouchPoints: 5 },
    Date: { now: clock.now }, console,
    useCallback: fn => fn, useEffect: fn => { cleanup = fn() },
    isDarkMatter: darkMatter, isLoadingSession: false, isResultMode: false, currentQuestions: [{}],
    isIntegrityTerminated: false, isSavingExit: false, user: { uid: 'synthetic' }, quizData: { unitId: darkMatter ? 'dark_matter_zone' : 'assessment' },
    FIELD_TEST_MAX_FOCUS_VIOLATIONS: 3,
    integrityTerminatedRef: { current: false }, integritySaveSucceededRef: { current: false },
    focusLockedRef: { current: false }, focusViolationCountRef: { current: 0 },
    focusResumePendingRef: { current: false }, focusProtectionGenerationRef: { current: 0 },
    intentionalFullscreenExitRef: { current: false }, focusProtectionArmedRef: { current: false }, focusTransitionGraceUntilRef: { current: 0 },
    latestFocusContextRef: { current: { sessionId: 'synthetic-session', questionId: 'q1', graded: false } },
    focusDiagnosticsRef: { current: createQuizFocusDiagnostics(clock) },
    isQuizFullscreenAvailable,
    createSustainedBlurGuard: opts => createSustainedBlurGuard({ ...opts, now: clock.now }),
    requestQuizFullscreen: doc => requestQuizFullscreen(doc, clock),
    isCaptureShortcut: e => e.key === 'PrintScreen',
    setIsFocusLocked: v => { state.locked = v }, setFocusLockReason: v => { state.reason = v },
    setFocusViolationCount: v => { state.count = v }, setIsResumingFocus: v => { state.resuming = v },
    setIsIntegrityTerminated: v => { state.terminated = v }, setIsSavingExit: v => { state.savingExit = v },
    persistCurrentQuizSession: async data => { saves.push(data); return state.saveOk },
    onExit: () => { state.exited = true }, db: {}, doc: (...args) => args.slice(1), serverTimestamp: () => 'server-time',
    setDoc: async (ref, data, opts) => { writes.push({ ref, data, opts }); if (data.quizFocusDiagnostics) diagnostics.push(data.quizFocusDiagnostics) },
  }
  vm.createContext(context)
  vm.runInContext(callbacks + '\nglobalThis.actions = { resumeFieldTestFocus, handleFocusLockedExit, recordFocusDiagnostic };', context)
  clock.advance(5000)
  return { ...clock, document, window, state, classes, writes, saves, diagnostics, context, actions: context.actions, cleanup: () => cleanup?.(), timers }
}

{
  const t = setup()
  for (let i = 0; i < 5; i++) { t.window.fire('blur'); t.advance(5000) }
  assert.equal(t.state.count, 0)
  assert.equal(t.state.locked, false, 'visible sustained blur must not block answer input')
  assert.ok(t.diagnostics.some(d => d.events.some(e => e.event === 'window_blur_visible')))
  assert.equal(t.state.requests, 0, 'Dark Matter must not force fullscreen on entry')
  t.document.fire('fullscreenchange')
  assert.equal(t.state.count, 0)
  t.cleanup()
  assert.equal(t.timers.size, 0)
  assert.equal(t.window.listeners.size, 0)
}
{
  const t = setup()
  t.document.hidden = true; t.document.fire('visibilitychange')
  assert.equal(t.state.count, 1)
  for (let i = 0; i < 4; i++) {
    t.advance(6000); t.window.fire('blur'); t.document.fire('visibilitychange'); t.document.fire('fullscreenchange'); t.window.fire('beforeprint')
  }
  assert.equal(t.state.count, 1, 'all events in one locked episode count only once, even >4 seconds apart')
  await t.actions.resumeFieldTestFocus()
  assert.equal(t.state.locked, true, 'cannot resume while hidden')
  t.document.hidden = false
  await t.actions.resumeFieldTestFocus()
  assert.equal(t.state.locked, false, 'visible touch resumes even with hasFocus=false')
  assert.equal(t.classes.has('field-test-window-blurred'), false)
  assert.equal(t.state.requests, 0)
  for (let episode = 2; episode <= 3; episode++) {
    t.advance(3000); t.document.hidden = true; t.document.fire('visibilitychange')
    assert.equal(t.state.count, episode)
    t.document.hidden = false
    await t.actions.resumeFieldTestFocus()
  }
  assert.equal(t.state.terminated, true, 'three separate confirmed departures still terminate')
  assert.equal(t.saves[0].quizSessionGuardAudit.event, 'field_test_integrity_terminated')
  const audit = t.writes.find(w => w.data.quizSessionGuardAudit)
  assert.deepEqual([...audit.opts.mergeFields], ['quizSessionGuardAudit'], 'replace old audit map fields')
  t.cleanup()
}
{
  const t = setup({ darkMatter: false, fullscreen: true })
  t.document.fullscreenElement = null; t.document.fire('fullscreenchange')
  assert.equal(t.state.count, 1, 'assessment still protects fullscreen exits')
  await t.actions.resumeFieldTestFocus()
  assert.equal(t.state.requests, 1)
  assert.equal(t.state.locked, false)
  t.cleanup()
}
for (const config of [{ supported: false }, { enabled: false }]) {
  const t = setup({ darkMatter: false, ...config })
  assert.equal(t.state.locked, false, 'unavailable fullscreen API must not trap the student')
  t.document.hidden = true; t.document.fire('visibilitychange'); t.document.hidden = false
  await t.actions.resumeFieldTestFocus()
  assert.equal(t.state.locked, false)
  assert.equal(t.state.requests, 0)
  t.cleanup()
}
{
  const t = setup({ darkMatter: false })
  assert.equal(t.state.locked, true, 'supported assessments request fullscreen without counting entry as departure')
  assert.equal(t.state.count, 0)
  t.document.documentElement.requestFullscreen = () => Promise.reject(new Error('denied'))
  await t.actions.resumeFieldTestFocus()
  assert.equal(t.state.locked, true)
  assert.equal(t.state.resuming, false)
  assert.match(t.state.reason, /다시 누르거나/)
  t.state.saveOk = false
  await t.actions.handleFocusLockedExit()
  assert.equal(t.state.exited, false, 'failed save must not discard the locked session')
  t.state.saveOk = true
  await t.actions.handleFocusLockedExit()
  assert.equal(t.state.exited, true)
  t.cleanup()
}
{
  const t = setup({ darkMatter: false })
  let finish
  t.document.documentElement.requestFullscreen = () => { t.state.requests++; return new Promise(resolve => { finish = resolve }) }
  const pending = t.actions.resumeFieldTestFocus()
  await t.actions.resumeFieldTestFocus()
  assert.equal(t.state.requests, 1, 'repeated resume taps must not duplicate pending fullscreen requests')
  t.advance(4000); await pending
  assert.equal(t.state.resuming, false)
  assert.equal(t.state.locked, true)
  finish(); await Promise.resolve()
  assert.equal(t.state.locked, true, 'late API resolution must not silently release the lock')
  assert.equal(t.timers.size, 0)
  t.cleanup()
}
{
  const t = setup({ darkMatter: false })
  let finish
  t.document.documentElement.requestFullscreen = () => new Promise(resolve => { finish = resolve })
  const pending = t.actions.resumeFieldTestFocus()
  t.cleanup(); t.document.fullscreenElement = {}; finish(); await pending
  assert.equal(t.state.locked, true, 'unmounted/stale recovery must not mutate quiz state')
  assert.equal(t.timers.size, 0)
}
{
  const t = setup()
  t.classes.add('is-capturing'); t.document.hidden = true
  t.document.fire('visibilitychange'); t.window.fire('beforeprint'); t.window.fire('blur'); t.advance(5000)
  assert.equal(t.state.count, 0, 'internal question capture remains exempt')
  t.classes.delete('is-capturing'); t.document.hidden = false
  t.window.fire('keydown', { key: 'PrintScreen', preventDefault() {} })
  assert.equal(t.state.count, 1)
  t.cleanup()
}
{
  let time = 0
  const log = createQuizFocusDiagnostics({ now: () => time })
  for (let i = 0; i < 40; i++) log.record('option_pointerdown', { disabled: false, index: i })
  assert.equal(log.snapshot().length, 24)
  assert.equal(log.snapshot()[0].index, 16)
  assert.equal(log.shouldPersist(), true)
  assert.equal(log.shouldPersist(), false)
  time = 15000; assert.equal(log.shouldPersist(), true)
  const snapshot = log.snapshot(); snapshot[0].event = 'changed'
  assert.equal(log.snapshot()[0].event, 'option_pointerdown')
}
console.log('Field Test focus regression passed: visible blur, episode dedupe, touch recovery, assessment protection, unsupported/rejected/hung fullscreen, safe exit, stale completion, capture exemption and bounded diagnostics.')
