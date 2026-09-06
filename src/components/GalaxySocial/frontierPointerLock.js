// Browser pointer capture is an input state, never a play-session lifecycle event.
// Focus changes, browser UI, Escape and delayed programmatic releases all arrive
// through the same event, so it cannot reliably establish an intent to quit.
export function subscribeFrontierPointerLock({ documentTarget, canvas, resetLook, releaseInput }) {
  const change = () => {
    resetLook()
    if (documentTarget.pointerLockElement !== canvas) releaseInput()
  }
  documentTarget.addEventListener('pointerlockchange', change)
  return () => documentTarget.removeEventListener('pointerlockchange', change)
}

export function releaseFrontierPointerLock(documentTarget) {
  if (documentTarget.pointerLockElement) documentTarget.exitPointerLock?.()
}
