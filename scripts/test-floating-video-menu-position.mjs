import assert from 'node:assert/strict'
import {
  clampFloatingControlCenter,
  normalizeFloatingControlPosition,
  parseFloatingControlPosition,
} from '../src/utils/floatingControlPosition.js'

const centered = clampFloatingControlCenter({
  x: 500,
  y: 400,
  containerWidth: 1000,
  containerHeight: 800,
  controlWidth: 240,
  controlHeight: 60,
})
assert.deepEqual(centered, { x: 500, y: 400 })

const topLeft = clampFloatingControlCenter({
  x: -100,
  y: -100,
  containerWidth: 1000,
  containerHeight: 800,
  controlWidth: 240,
  controlHeight: 60,
  padding: 8,
})
assert.deepEqual(topLeft, { x: 128, y: 38 })

const bottomRight = clampFloatingControlCenter({
  x: 1200,
  y: 900,
  containerWidth: 1000,
  containerHeight: 800,
  controlWidth: 240,
  controlHeight: 60,
  padding: 8,
})
assert.deepEqual(bottomRight, { x: 872, y: 762 })

assert.deepEqual(normalizeFloatingControlPosition({
  x: 250,
  y: 600,
  containerWidth: 1000,
  containerHeight: 800,
}), { x: 0.25, y: 0.75 })

assert.deepEqual(parseFloatingControlPosition('{"x":1.2,"y":-0.4}'), { x: 1, y: 0 })
assert.equal(parseFloatingControlPosition('not-json'), null)
assert.equal(parseFloatingControlPosition('{"x":"","y":0.4}'), null)

console.log('Floating video menu position tests passed')
