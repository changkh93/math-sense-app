import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { releaseFrontierPointerLock, subscribeFrontierPointerLock } from '../src/components/GalaxySocial/frontierPointerLock.js'

class FakeDocument extends EventTarget {
  pointerLockElement = null
  visibilityState = 'visible'
  focused = true
  exitCalls = 0
  hasFocus() { return this.focused }
  exitPointerLock() { this.exitCalls++; this.pointerLockElement = null; this.dispatchEvent(new Event('pointerlockchange')) }
}
const doc = new FakeDocument()
const canvas = {}
const input = { x: 1, z: 1, vertical: -1, jumping: true }
let resets = 0
let releases = 0
const subscribe = () => subscribeFrontierPointerLock({
  documentTarget: doc, canvas,
  resetLook: () => { resets++ },
  releaseInput: () => { releases++; Object.assign(input, { x: 0, z: 0, vertical: 0, jumping: false }) },
})
let unsubscribe = subscribe()
// Capturing the mouse does not cancel movement. A release always clears held input.
doc.pointerLockElement = canvas
doc.dispatchEvent(new Event('pointerlockchange'))
assert.equal(releases, 0)
releaseFrontierPointerLock(doc)
assert.equal(doc.exitCalls, 1)
assert.equal(releases, 1)
assert.deepEqual(input, { x: 0, z: 0, vertical: 0, jumping: false })
releaseFrontierPointerLock(doc)
assert.equal(doc.exitCalls, 1)
// Unexplained release while focused/visible is the original premature-exit case.
// Also exercise tab hiding, focus loss, and reacquisition with delayed release.
for (const [visibility, focused] of [['visible', true], ['hidden', false], ['visible', false]]) {
  doc.visibilityState = visibility
  doc.focused = focused
  doc.pointerLockElement = canvas
  doc.dispatchEvent(new Event('pointerlockchange'))
  doc.pointerLockElement = null
  doc.dispatchEvent(new Event('pointerlockchange'))
}
assert.equal(releases, 4)
unsubscribe()
const before = resets
doc.dispatchEvent(new Event('pointerlockchange'))
assert.equal(resets, before)
unsubscribe = subscribe()
doc.dispatchEvent(new Event('pointerlockchange'))
assert.equal(releases, 5)
unsubscribe()
// Keep session lifecycle inaccessible from the movement/camera component.
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const world = read('../src/components/GalaxySocial/GalaxyWorld3D.jsx')
const shell = read('../src/components/GalaxySocial/MetaGalaxy.jsx')
assert.doesNotMatch(world, /onExplorationExitRequest|resetAfterPointerLockChange|intentionalPointerUnlock/)
const escapeHandler = shell.slice(shell.indexOf("if (event.key !== 'Escape'"), shell.indexOf("window.addEventListener('keydown', onKeyDown)"))
assert.doesNotMatch(escapeHandler, /requestReturn\(/)
assert.match(escapeHandler, /releaseFrontierPointerLock\(document\)/)
assert.match(shell, /onClick=\{requestReturn\}/)
console.log('Pointer-lock regression passed: focused/background releases, input reset, cleanup, rebind, Escape cannot end session; explicit return retained')
