import assert from 'node:assert/strict'

import { getVideoResumeRecovery } from '../src/utils/videoPlaybackUtils.js'

assert.deepEqual(
  getVideoResumeRecovery({ resumePosition: 2790, duration: 2790 }),
  { restartPosition: 0, playbackEnd: 2790, shouldRestart: true }
)

assert.equal(
  getVideoResumeRecovery({ resumePosition: 2787, duration: 2790 }).shouldRestart,
  true
)

assert.equal(
  getVideoResumeRecovery({ resumePosition: 2786, duration: 2790 }).shouldRestart,
  false
)

assert.deepEqual(
  getVideoResumeRecovery({ resumePosition: 600, duration: 2790, contentStart: 120, contentEnd: 600 }),
  { restartPosition: 120, playbackEnd: 600, shouldRestart: true }
)

assert.equal(
  getVideoResumeRecovery({ resumePosition: 2790, duration: 0 }).shouldRestart,
  false
)

console.log('videoPlaybackUtils tests passed')
