import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import {
  createEmptyAstraBuilderGrid,
  encodeAstraBuilderCell,
  getAstraBuilderInstances,
  getAstraBuilderTopologyKey,
} from '../src/components/GalaxySocial/builder/astraBuilderModel.js'
import {
  decodeAstraBuilderGridBase64,
  encodeAstraBuilderGridBase64,
} from '../src/components/GalaxySocial/builder/astraBuilderCodec.js'
import { createAstraBuilderCollisionBodies } from '../src/components/GalaxySocial/builder/astraBuilderPhysics.js'

const TARGETS = [500, 1000, 2500]
const MAIN_RECIPES = [1, 3, 9, 16, 20, 21, 22, 24, 28, 29, 30, 31, 32]

function createFixture(pieceCount) {
  const cells = createEmptyAstraBuilderGrid()
  let remaining = pieceCount
  for (let index = 0; index < cells.length && remaining > 0; index += 1) {
    const recipeId = MAIN_RECIPES[index % MAIN_RECIPES.length]
    const withUnderlay = remaining >= 2
    cells[index] = encodeAstraBuilderCell(recipeId, index % 4, withUnderlay, index % 3 === 0 ? 14 : 2)
    remaining -= withUnderlay ? 2 : 1
  }
  assert.equal(remaining, 0, `fixture capacity is too small for ${pieceCount} pieces`)
  return cells
}

function measure(operation, rounds = 12) {
  const values = []
  for (let round = 0; round < rounds; round += 1) {
    const started = performance.now()
    operation()
    values.push(performance.now() - started)
  }
  values.sort((a, b) => a - b)
  return values[Math.floor(values.length / 2)]
}

const results = TARGETS.map((pieces) => {
  const cells = createFixture(pieces)
  const encoded = encodeAstraBuilderGridBase64(cells)
  const timings = {
    topologyMs: measure(() => getAstraBuilderTopologyKey(cells)),
    instancesMs: measure(() => getAstraBuilderInstances(cells)),
    collisionMs: measure(() => createAstraBuilderCollisionBodies(cells, 0)),
    codecMs: measure(() => decodeAstraBuilderGridBase64(encoded)),
  }
  Object.entries(timings).forEach(([name, milliseconds]) => {
    assert.ok(milliseconds < 120, `${pieces} pieces ${name} exceeded 120ms: ${milliseconds.toFixed(2)}ms`)
  })
  return { pieces, encodedBytes: Buffer.byteLength(encoded), ...timings }
})

console.table(results.map((result) => ({
  ...result,
  topologyMs: result.topologyMs.toFixed(2),
  instancesMs: result.instancesMs.toFixed(2),
  collisionMs: result.collisionMs.toFixed(2),
  codecMs: result.codecMs.toFixed(2),
})))
console.log('Astra Builder 500/1000/2500-piece CPU performance checks passed')
