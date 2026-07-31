import assert from 'node:assert/strict'
import {
  ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET,
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
  getAstraBuilderDoorwayColumns,
  getAstraBuilderTopFaceTarget,
  getAstraBuilderWalkSurfaceOffset,
  getAstraBuilderWalkBlockingCells,
  getAstraBuilderWorldPosition,
  isAstraBuilderWalkBlockingCell,
} from '../src/components/GalaxySocial/builder/astraBuilderModel.js'
import {
  decodeAstraBuilderGridBase64,
  encodeAstraBuilderGridBase64,
} from '../src/components/GalaxySocial/builder/astraBuilderCodec.js'
import { planAstraBuilderServerHydration } from '../src/components/GalaxySocial/builder/astraBuilderSync.js'
import {
  canAstraBuilderCharacterOccupy,
  createAstraBuilderCollisionBodies,
  doesAstraBuilderPlacementOverlapCharacter,
  getAstraBuilderCharacterDimensions,
  getAstraBuilderStairProgress,
  getAstraBuilderSupportOffsetAtCell,
  getAstraBuilderWalkSurfaceHeight,
} from '../src/components/GalaxySocial/builder/astraBuilderPhysics.js'
import {
  isAstraBuilderBuildPointer,
  isAstraBuilderPlacementClick,
  isAstraBuilderViewDrag,
  isAstraBuilderViewPointer,
} from '../src/components/GalaxySocial/builder/astraBuilderInput.js'

assert.equal(getAstraBuilderCellCount(), 12 * 12 * 10)

const cells = createEmptyAstraBuilderGrid()
assert.equal(cells.length, 1440)
assert.equal(countAstraBuilderBlocks(cells), 0)
assert.equal(
  getAstraBuilderWalkSurfaceOffset(
    ASTRA_BUILDER_POC_PLOT.center[0],
    ASTRA_BUILDER_POC_PLOT.center[1],
    cells,
  ),
  ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET,
)
assert.equal(getAstraBuilderWalkSurfaceOffset(100, 100, cells), null)

const foundationCell = {
  x: Math.floor(ASTRA_BUILDER_POC_PLOT.width / 2),
  y: 0,
  z: Math.floor(ASTRA_BUILDER_POC_PLOT.depth / 2),
}
cells[getAstraBuilderCellIndex(foundationCell)] = 2
assert.equal(
  getAstraBuilderWalkSurfaceOffset(
    ASTRA_BUILDER_POC_PLOT.center[0],
    ASTRA_BUILDER_POC_PLOT.center[1],
    cells,
  ),
  ASTRA_BUILDER_POC_PLOT.cellSize * .24,
)
cells[getAstraBuilderCellIndex(foundationCell)] = 0

const target = { x: 3, y: 4, z: 5 }
const targetIndex = getAstraBuilderCellIndex(target)
assert.deepEqual(getAstraBuilderCellFromIndex(targetIndex), target)
assert.equal(getAstraBuilderCellIndex({ x: -1, y: 0, z: 0 }), -1)
assert.equal(getAstraBuilderCellIndex({ x: 0, y: ASTRA_BUILDER_POC_PLOT.height, z: 0 }), -1)
assert.equal(isAstraBuilderWalkBlockingCell(1, { x: 0, y: 0, z: 0 }), true)
assert.equal(isAstraBuilderWalkBlockingCell(2, { x: 0, y: 0, z: 0 }), false)
assert.equal(isAstraBuilderWalkBlockingCell(5, { x: 0, y: 0, z: 0 }), false)
assert.equal(isAstraBuilderWalkBlockingCell(7, { x: 0, y: 0, z: 0 }), false)
assert.equal(isAstraBuilderWalkBlockingCell(1, { x: 0, y: 2, z: 0 }), false)
assert.deepEqual(
  getAstraBuilderDoorwayColumns({ x: 2, y: 0, z: 2 }, 0),
  [{ x: 2, y: 0, z: 2 }, { x: 3, y: 0, z: 2 }],
)
assert.deepEqual(
  getAstraBuilderDoorwayColumns({ x: 2, y: 0, z: 2 }, 1),
  [{ x: 2, y: 0, z: 2 }, { x: 2, y: 0, z: 1 }],
)
assert.deepEqual(
  getAstraBuilderTopFaceTarget(
    { x: 2, y: 0, z: 2, type: 7 },
    { x: 0, y: 1, z: 0 },
  ),
  { x: 2, y: 3, z: 2 },
)

const doorwayGrid = createEmptyAstraBuilderGrid()
doorwayGrid[getAstraBuilderCellIndex({ x: 2, y: 0, z: 2 })] = 7
doorwayGrid[getAstraBuilderCellIndex({ x: 2, y: 1, z: 2 })] = 1
doorwayGrid[getAstraBuilderCellIndex({ x: 3, y: 0, z: 2 })] = 1
doorwayGrid[getAstraBuilderCellIndex({ x: 1, y: 0, z: 2 })] = 1
assert.deepEqual(
  getAstraBuilderWalkBlockingCells(doorwayGrid).map(({ x, y, z }) => ({ x, y, z })),
  [{ x: 1, y: 0, z: 2 }],
)
const doorwayInstances = getAstraBuilderInstances(doorwayGrid)
assert.deepEqual(
  doorwayInstances.get(1).map(({ x, y, z }) => ({ x, y, z })),
  [{ x: 1, y: 0, z: 2 }],
)
assert.deepEqual(
  getAstraBuilderTopFaceTarget(target, { x: 0, y: 1, z: 0 }),
  { x: 3, y: 5, z: 5 },
)
assert.deepEqual(
  getAstraBuilderTopFaceTarget(target, { x: 1, y: 0, z: 0 }),
  { x: 4, y: 4, z: 5 },
)
assert.deepEqual(
  getAstraBuilderTopFaceTarget({ ...target, rotation: 1 }, { x: 1, y: 0, z: 0 }),
  { x: 3, y: 4, z: 4 },
)
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

const woodenDoor = applyAstraBuilderEdit(removed.cells, {
  tool: 'place',
  cell: { x: 1, y: 0, z: 1 },
  blockType: 7,
  rotation: 3,
})
assert.deepEqual(decodeAstraBuilderCell(
  woodenDoor.cells[getAstraBuilderCellIndex({ x: 1, y: 0, z: 1 })],
), {
  blockType: 7,
  rotation: 3,
  occupied: true,
})
assert.equal(applyAstraBuilderEdit(removed.cells, {
  tool: 'place',
  cell: { x: 1, y: 1, z: 1 },
  blockType: 7,
  rotation: 0,
}), null)
assert.equal(applyAstraBuilderEdit(removed.cells, {
  tool: 'place',
  cell: { x: ASTRA_BUILDER_POC_PLOT.width - 1, y: 0, z: 1 },
  blockType: 7,
  rotation: 0,
}), null)
assert.equal(applyAstraBuilderEdit(woodenDoor.cells, {
  tool: 'place',
  cell: { x: 1, y: 1, z: 1 },
  blockType: 1,
  rotation: 0,
}), null)
assert.ok(applyAstraBuilderEdit(woodenDoor.cells, {
  tool: 'place',
  cell: { x: 1, y: 0, z: 2 },
  blockType: 2,
  rotation: 0,
}))

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

const defaultDimensions = getAstraBuilderCharacterDimensions(.28)
const largeDimensions = getAstraBuilderCharacterDimensions(.7)
assert.equal(defaultDimensions.radius, .14)
assert.ok(largeDimensions.radius > defaultDimensions.radius)
assert.ok(largeDimensions.height > defaultDimensions.height)

const stairCell = { x: 5, y: 0, z: 5 }
const stairWorld = getAstraBuilderWorldPosition(stairCell)
const stairWorldX = ASTRA_BUILDER_POC_PLOT.center[0] + stairWorld[0]
const stairWorldZ = ASTRA_BUILDER_POC_PLOT.center[1] + stairWorld[2]
const halfCell = ASTRA_BUILDER_POC_PLOT.cellSize * .49
assert.ok(getAstraBuilderStairProgress(stairWorldX, stairWorldZ + halfCell, stairCell, 0) < .02)
assert.ok(getAstraBuilderStairProgress(stairWorldX, stairWorldZ - halfCell, stairCell, 0) > .98)
assert.ok(getAstraBuilderStairProgress(stairWorldX - halfCell, stairWorldZ, stairCell, 1) < .02)
assert.ok(getAstraBuilderStairProgress(stairWorldX + halfCell, stairWorldZ, stairCell, 1) > .98)
assert.ok(getAstraBuilderStairProgress(stairWorldX, stairWorldZ - halfCell, stairCell, 2) < .02)
assert.ok(getAstraBuilderStairProgress(stairWorldX, stairWorldZ + halfCell, stairCell, 2) > .98)
assert.ok(getAstraBuilderStairProgress(stairWorldX + halfCell, stairWorldZ, stairCell, 3) < .02)
assert.ok(getAstraBuilderStairProgress(stairWorldX - halfCell, stairWorldZ, stairCell, 3) > .98)

const multilevelGrid = createEmptyAstraBuilderGrid()
multilevelGrid[getAstraBuilderCellIndex({ x: 5, y: 1, z: 5 })] = 2
const plotBaseY = 4
const upperFloorHeight = plotBaseY + getAstraBuilderSupportOffsetAtCell(
  stairWorldX,
  stairWorldZ,
  { x: 5, y: 1, z: 5 },
  2,
)
assert.equal(
  getAstraBuilderWalkSurfaceHeight({
    x: stairWorldX,
    z: stairWorldZ,
    currentFootY: upperFloorHeight,
    cells: multilevelGrid,
    plotBaseY,
    terrainY: 0,
  }),
  upperFloorHeight,
)
assert.equal(
  getAstraBuilderWalkSurfaceHeight({
    x: stairWorldX,
    z: stairWorldZ,
    currentFootY: plotBaseY,
    cells: multilevelGrid,
    plotBaseY,
    terrainY: 0,
  }),
  plotBaseY + ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET,
)

const collisionGrid = createEmptyAstraBuilderGrid()
collisionGrid[getAstraBuilderCellIndex({ x: 5, y: 0, z: 5 })] = 1
const collisionBodies = createAstraBuilderCollisionBodies(collisionGrid, plotBaseY)
assert.equal(collisionBodies.length, 1)
assert.equal(canAstraBuilderCharacterOccupy(collisionBodies, {
  x: stairWorldX,
  z: stairWorldZ,
  footY: plotBaseY,
  scale: .28,
}), false)
assert.equal(canAstraBuilderCharacterOccupy(collisionBodies, {
  x: stairWorldX,
  z: stairWorldZ,
  footY: plotBaseY + ASTRA_BUILDER_POC_PLOT.cellSize,
  scale: .28,
}), true)
assert.equal(doesAstraBuilderPlacementOverlapCharacter({
  cell: { x: 5, y: 0, z: 5 },
  blockType: 1,
  playerPosition: { x: stairWorldX, y: plotBaseY, z: stairWorldZ },
  plotBaseY,
}), true)

const stairCollisionGrid = createEmptyAstraBuilderGrid()
stairCollisionGrid[getAstraBuilderCellIndex(stairCell)] = 5
const stairBodies = createAstraBuilderCollisionBodies(stairCollisionGrid, plotBaseY)
assert.equal(canAstraBuilderCharacterOccupy(stairBodies, {
  x: stairWorldX,
  z: stairWorldZ + halfCell,
  footY: plotBaseY,
  scale: .28,
}), true)
assert.equal(canAstraBuilderCharacterOccupy(stairBodies, {
  x: stairWorldX,
  z: stairWorldZ - halfCell,
  footY: plotBaseY,
  scale: .28,
}), false)

const ceilingGrid = createEmptyAstraBuilderGrid()
ceilingGrid[getAstraBuilderCellIndex({ x: 5, y: 2, z: 5 })] = 2
const ceilingBodies = createAstraBuilderCollisionBodies(ceilingGrid, plotBaseY)
assert.equal(canAstraBuilderCharacterOccupy(ceilingBodies, {
  x: stairWorldX,
  z: stairWorldZ,
  footY: plotBaseY + ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET,
  scale: .14,
}), true)
assert.equal(canAstraBuilderCharacterOccupy(ceilingBodies, {
  x: stairWorldX,
  z: stairWorldZ,
  footY: plotBaseY + ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET,
  scale: .28,
}), false)

// 플레이-빌드는 같은 좌클릭에서 짧은 클릭과 드래그를 이동 거리로 구분한다.
assert.equal(isAstraBuilderBuildPointer({ button: 0 }), true)
assert.equal(isAstraBuilderBuildPointer({ button: 1 }), false)
assert.equal(isAstraBuilderBuildPointer({ button: 2 }), false)
assert.equal(isAstraBuilderViewPointer({ button: 0 }), true)
assert.equal(isAstraBuilderViewPointer({ button: 1 }), true)
assert.equal(isAstraBuilderViewPointer({ button: 2 }), true)
assert.equal(isAstraBuilderViewDrag(0), false)
assert.equal(isAstraBuilderViewDrag(1), true)
assert.equal(isAstraBuilderViewDrag(2), true)
assert.equal(isAstraBuilderViewDrag(4), true)
assert.equal(isAstraBuilderPlacementClick({ button: 0, delta: 0 }), true)
assert.equal(isAstraBuilderPlacementClick({ button: 0, delta: 5 }), true)
assert.equal(isAstraBuilderPlacementClick({ button: 0, delta: 5.1 }), false)
assert.equal(isAstraBuilderPlacementClick({ button: 2, delta: 0 }), false)

console.log('Astra Builder model tests passed')
