import assert from 'node:assert/strict'
import {
  ASTRA_BUILDER_POC_PLOT,
  applyAstraBuilderEdit,
  applyAstraBuilderPatch,
  countAstraBuilderBlocks,
  createEmptyAstraBuilderGrid,
  decodeAstraBuilderCell,
  getAstraBuilderCellCount,
  getAstraBuilderCellFromIndex,
  getAstraBuilderCellIndex,
  getAstraBuilderInstances,
  getAstraBuilderTopFaceTarget,
} from '../src/components/GalaxySocial/builder/astraBuilderModel.js'
import {
  decodeAstraBuilderGridBase64,
  encodeAstraBuilderGridBase64,
} from '../src/components/GalaxySocial/builder/astraBuilderCodec.js'
import { planAstraBuilderServerHydration } from '../src/components/GalaxySocial/builder/astraBuilderSync.js'

assert.equal(getAstraBuilderCellCount(), 12 * 12 * 10)

const cells = createEmptyAstraBuilderGrid()
assert.equal(cells.length, 1440)
assert.equal(countAstraBuilderBlocks(cells), 0)

const target = { x: 3, y: 4, z: 5 }
const targetIndex = getAstraBuilderCellIndex(target)
assert.deepEqual(getAstraBuilderCellFromIndex(targetIndex), target)
assert.equal(getAstraBuilderCellIndex({ x: -1, y: 0, z: 0 }), -1)
assert.equal(getAstraBuilderCellIndex({ x: 0, y: ASTRA_BUILDER_POC_PLOT.height, z: 0 }), -1)
assert.deepEqual(
  getAstraBuilderTopFaceTarget(target, { x: 0, y: 1, z: 0 }),
  { x: 3, y: 5, z: 5 },
)
assert.equal(getAstraBuilderTopFaceTarget(target, { x: 1, y: 0, z: 0 }), null)
assert.equal(
  getAstraBuilderTopFaceTarget(
    { x: 3, y: ASTRA_BUILDER_POC_PLOT.height - 1, z: 5 },
    { x: 0, y: 1, z: 0 },
  ),
  null,
)

const placed = applyAstraBuilderEdit(cells, {
  tool: 'place',
  cell: target,
  blockType: 3,
  rotation: 1,
})
assert.ok(placed)
assert.deepEqual(decodeAstraBuilderCell(placed.cells[targetIndex]), {
  blockType: 3,
  rotation: 1,
  occupied: true,
})
assert.equal(countAstraBuilderBlocks(placed.cells), 1)
assert.equal(applyAstraBuilderEdit(placed.cells, {
  tool: 'place',
  cell: target,
  blockType: 2,
  rotation: 0,
}), null)

const rotated = applyAstraBuilderEdit(placed.cells, {
  tool: 'rotate',
  cell: target,
})
assert.equal(decodeAstraBuilderCell(rotated.cells[targetIndex]).rotation, 2)

const undone = applyAstraBuilderPatch(rotated.cells, rotated.patch, 'undo')
assert.equal(undone[targetIndex], placed.cells[targetIndex])
const redone = applyAstraBuilderPatch(undone, rotated.patch, 'redo')
assert.equal(redone[targetIndex], rotated.cells[targetIndex])

const instances = getAstraBuilderInstances(redone)
assert.equal(instances.get(3).length, 1)
assert.deepEqual(
  { x: instances.get(3)[0].x, y: instances.get(3)[0].y, z: instances.get(3)[0].z },
  target,
)

const removed = applyAstraBuilderEdit(redone, {
  tool: 'delete',
  cell: target,
})
assert.equal(countAstraBuilderBlocks(removed.cells), 0)

const encodedGrid = encodeAstraBuilderGridBase64(redone)
const decodedGrid = decodeAstraBuilderGridBase64(encodedGrid, redone.length)
assert.deepEqual([...decodedGrid], [...redone])
assert.equal(decodeAstraBuilderGridBase64('not base64', redone.length), null)
assert.equal(decodeAstraBuilderGridBase64(encodedGrid, redone.length - 1), null)

assert.equal(planAstraBuilderServerHydration({
  localRevision: 3,
  localSyncedRevision: 3,
  localBlockCount: 0,
  localServerRevision: 2,
  localServerDirty: false,
  remoteRevision: 3,
}), 'server')
assert.equal(planAstraBuilderServerHydration({
  localRevision: 3,
  localSyncedRevision: 2,
  localBlockCount: 2,
  localServerRevision: 3,
  localServerDirty: true,
  remoteRevision: 3,
}), 'local')
assert.equal(planAstraBuilderServerHydration({
  localRevision: 3,
  localSyncedRevision: 2,
  localBlockCount: 2,
  localServerRevision: 2,
  localServerDirty: true,
  remoteRevision: 3,
}), 'conflict')
assert.equal(planAstraBuilderServerHydration({
  localRevision: 0,
  localSyncedRevision: 0,
  localBlockCount: 2,
  localServerRevision: null,
  localServerDirty: false,
  remoteRevision: 1,
}), 'conflict')
assert.equal(planAstraBuilderServerHydration({
  localRevision: 0,
  localSyncedRevision: 0,
  localBlockCount: 2,
  localServerRevision: null,
  localServerDirty: false,
  remoteRevision: 0,
}), 'local')
assert.equal(planAstraBuilderServerHydration({
  localRevision: 4,
  localSyncedRevision: 4,
  localBlockCount: 2,
  localServerRevision: 7,
  localServerDirty: false,
  remoteRevision: 7,
}), 'server')

console.log('Astra Builder model tests passed')
