import assert from 'node:assert/strict'
import {
  ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET,
  ASTRA_BUILDER_POC_PLOT,
  ASTRA_BUILDER_WALL_PANEL_TYPE,
  applyAstraBuilderEdit,
  applyAstraBuilderPatch,
  countAstraBuilderBlocks,
  createEmptyAstraBuilderGrid,
  decodeAstraBuilderCell,
  doesAstraBuilderBlockOccupyLayer,
  getAstraBuilderCellCount,
  getAstraBuilderCellFromIndex,
  getAstraBuilderCellIndex,
  getAstraBuilderInstances,
  getAstraBuilderDoorwayColumns,
  getAstraBuilderLayerEditTarget,
  getAstraBuilderLayerInfo,
  getAstraBuilderPlacementIssue,
  getAstraBuilderTopFaceTarget,
  getAstraBuilderWalkSurfaceOffset,
  getAstraBuilderWalkBlockingCells,
  getAstraBuilderWorldPosition,
  isAstraBuilderWalkBlockingCell,
  isAstraBuilderSameStoryLayer,
  normalizeAstraBuilderPlacementCell,
} from '../src/components/GalaxySocial/builder/astraBuilderModel.js'
import {
  decodeAstraBuilderGridBase64,
  encodeAstraBuilderGridBase64,
} from '../src/components/GalaxySocial/builder/astraBuilderCodec.js'
import {
  getAstraBuilderRetryDelay,
  planAstraBuilderServerHydration,
} from '../src/components/GalaxySocial/builder/astraBuilderSync.js'
import {
  canAstraBuilderCharacterOccupy,
  createAstraBuilderCollisionBodies,
  doesAstraBuilderPlacementOverlapCharacter,
  getAstraBuilderCharacterDimensions,
  getAstraBuilderStairDirection,
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
assert.deepEqual(getAstraBuilderLayerInfo(0), {
  layer: 0, story: 1, course: 1, courseCount: 3, label: '1층',
})
assert.deepEqual(getAstraBuilderLayerInfo(5), {
  layer: 5, story: 2, course: 3, courseCount: 3, label: '2층',
})
assert.deepEqual(getAstraBuilderLayerInfo(9), {
  layer: 9, story: null, course: 1, courseCount: 1, label: '옥상',
})
assert.equal(isAstraBuilderSameStoryLayer(0, 2), true)
assert.equal(isAstraBuilderSameStoryLayer(2, 3), false)
assert.equal(doesAstraBuilderBlockOccupyLayer({ y: 0, type: 1 }, 1), false)
assert.equal(doesAstraBuilderBlockOccupyLayer({ y: 0, type: 8 }, 2), true)
assert.equal(doesAstraBuilderBlockOccupyLayer({ y: 0, type: 7 }, 2), true)

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
const targetWorld = getAstraBuilderWorldPosition(target)
const targetPoint = {
  x: ASTRA_BUILDER_POC_PLOT.center[0] + targetWorld[0],
  y: 0,
  z: ASTRA_BUILDER_POC_PLOT.center[1] + targetWorld[2],
}
assert.deepEqual(getAstraBuilderLayerEditTarget({
  point: targetPoint,
  activeLayer: 2,
  clickedCell: target,
  tool: 'place',
}), { x: 3, y: 2, z: 5 })
assert.deepEqual(getAstraBuilderLayerEditTarget({
  point: targetPoint,
  activeLayer: 2,
  clickedCell: target,
  tool: 'delete',
}), target)

const panelGrid = createEmptyAstraBuilderGrid()
const panelPointerCell = { x: 4, y: 2, z: 4 }
const panelAnchor = normalizeAstraBuilderPlacementCell(
  panelPointerCell,
  ASTRA_BUILDER_WALL_PANEL_TYPE,
)
assert.deepEqual(panelAnchor, { x: 4, y: 0, z: 4 })
const panelPlacement = applyAstraBuilderEdit(panelGrid, {
  tool: 'place',
  cell: panelAnchor,
  blockType: ASTRA_BUILDER_WALL_PANEL_TYPE,
  rotation: 0,
})
assert.ok(panelPlacement)
assert.equal(countAstraBuilderBlocks(panelPlacement.cells), 1)
assert.equal(
  decodeAstraBuilderCell(panelPlacement.cells[getAstraBuilderCellIndex(panelAnchor)]).blockType,
  ASTRA_BUILDER_WALL_PANEL_TYPE,
)
const panelBody = createAstraBuilderCollisionBodies(panelPlacement.cells, 4)
  .find((body) => body.blockType === ASTRA_BUILDER_WALL_PANEL_TYPE)
assert.ok(panelBody)
assert.ok(Math.abs(
  panelBody.maxY - panelBody.minY - ASTRA_BUILDER_POC_PLOT.cellSize * 3,
) < 0.0001)
assert.equal(getAstraBuilderPlacementIssue(panelPlacement.cells, {
  tool: 'place',
  cell: { x: 4, y: 1, z: 4 },
  blockType: 1,
  rotation: 0,
}), 'occupied')
assert.equal(normalizeAstraBuilderPlacementCell(
  { x: 4, y: 9, z: 4 },
  ASTRA_BUILDER_WALL_PANEL_TYPE,
), null)
assert.deepEqual(getAstraBuilderLayerEditTarget({
  point: targetPoint,
  activeLayer: 4,
  clickedCell: target,
  tool: 'delete',
}), target)
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

assert.equal(getAstraBuilderRetryDelay(0), 15_000)
assert.equal(getAstraBuilderRetryDelay(15_000), 30_000)
assert.equal(getAstraBuilderRetryDelay(30_000), 60_000)
assert.equal(getAstraBuilderRetryDelay(60_000), 120_000)
assert.equal(getAstraBuilderRetryDelay(120_000), 120_000)
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

const defaultDimensions = getAstraBuilderCharacterDimensions(.25)
const largeDimensions = getAstraBuilderCharacterDimensions(.7)
assert.equal(defaultDimensions.radius, .125)
assert.equal(defaultDimensions.height, .6375)
assert.ok(largeDimensions.radius > defaultDimensions.radius)
assert.ok(largeDimensions.height > defaultDimensions.height)

const stairCell = { x: 5, y: 0, z: 5 }
const stairWorld = getAstraBuilderWorldPosition(stairCell)
const stairWorldX = ASTRA_BUILDER_POC_PLOT.center[0] + stairWorld[0]
const stairWorldZ = ASTRA_BUILDER_POC_PLOT.center[1] + stairWorld[2]
const halfCell = ASTRA_BUILDER_POC_PLOT.cellSize * .49
assert.deepEqual(getAstraBuilderStairDirection(0), { x: 0, z: 1 })
assert.deepEqual(getAstraBuilderStairDirection(1), { x: 1, z: 0 })
assert.deepEqual(getAstraBuilderStairDirection(2), { x: 0, z: -1 })
assert.deepEqual(getAstraBuilderStairDirection(3), { x: -1, z: 0 })
assert.ok(getAstraBuilderStairProgress(stairWorldX, stairWorldZ - halfCell, stairCell, 0) < .02)
assert.ok(getAstraBuilderStairProgress(stairWorldX, stairWorldZ + halfCell, stairCell, 0) > .98)
assert.ok(getAstraBuilderStairProgress(stairWorldX - halfCell, stairWorldZ, stairCell, 1) < .02)
assert.ok(getAstraBuilderStairProgress(stairWorldX + halfCell, stairWorldZ, stairCell, 1) > .98)
assert.ok(getAstraBuilderStairProgress(stairWorldX, stairWorldZ + halfCell, stairCell, 2) < .02)
assert.ok(getAstraBuilderStairProgress(stairWorldX, stairWorldZ - halfCell, stairCell, 2) > .98)
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
  z: stairWorldZ - halfCell,
  footY: plotBaseY,
  scale: .28,
}), true)
assert.equal(canAstraBuilderCharacterOccupy(stairBodies, {
  x: stairWorldX,
  z: stairWorldZ + halfCell,
  footY: plotBaseY,
  scale: .28,
}), false)

// 실제 이동 컨트롤러처럼 다음 지지면을 먼저 구한 뒤 그 높이에서 몸 공간을
// 검사하면 짧은 보폭으로 계단을 끝까지 오를 수 있다.
let stairFootY = plotBaseY + ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET
const stairTraversalHeights = []
for (let step = 0; step <= 24; step += 1) {
  const progress = step / 24
  const z = stairWorldZ - halfCell + progress * halfCell * 2
  const nextStairFootY = getAstraBuilderWalkSurfaceHeight({
    x: stairWorldX,
    z,
    currentFootY: stairFootY,
    cells: stairCollisionGrid,
    plotBaseY,
    terrainY: 0,
  })
  assert.equal(canAstraBuilderCharacterOccupy(stairBodies, {
    x: stairWorldX,
    z,
    footY: nextStairFootY,
    scale: .28,
  }), true)
  stairFootY = nextStairFootY
  stairTraversalHeights.push(stairFootY)
}
assert.ok(stairTraversalHeights.every((height, index) => (
  index === 0 || height >= stairTraversalHeights[index - 1]
)))
assert.ok(stairFootY > plotBaseY + ASTRA_BUILDER_POC_PLOT.cellSize * .95)

// 세 칸 계단의 출구에서 2층 바닥으로 진입할 때, 발 중심이 바닥 셀에
// 완전히 들어가기 전에도 발바닥 영역이 겹치면 지지면을 이어받아야 한다.
const connectedUpperFloorGrid = createEmptyAstraBuilderGrid()
for (let stairIndex = 0; stairIndex < 3; stairIndex += 1) {
  connectedUpperFloorGrid[getAstraBuilderCellIndex({
    x: 5,
    y: stairIndex,
    z: 4 + stairIndex,
  })] = 5
}
connectedUpperFloorGrid[getAstraBuilderCellIndex({ x: 5, y: 3, z: 7 })] = 2
connectedUpperFloorGrid[getAstraBuilderCellIndex({ x: 5, y: 3, z: 8 })] = 2
const connectedBodies = createAstraBuilderCollisionBodies(connectedUpperFloorGrid, plotBaseY)
const connectedStart = getAstraBuilderWorldPosition({ x: 5, y: 0, z: 4 })
const connectedEnd = getAstraBuilderWorldPosition({ x: 5, y: 3, z: 8 })
const connectedX = ASTRA_BUILDER_POC_PLOT.center[0] + connectedStart[0]
const connectedStartZ = ASTRA_BUILDER_POC_PLOT.center[1]
  + connectedStart[2]
  - ASTRA_BUILDER_POC_PLOT.cellSize * .49
const connectedEndZ = ASTRA_BUILDER_POC_PLOT.center[1] + connectedEnd[2]
let connectedFootY = plotBaseY + ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET
for (let step = 0; step <= 120; step += 1) {
  const z = connectedStartZ + (connectedEndZ - connectedStartZ) * (step / 120)
  const nextFootY = getAstraBuilderWalkSurfaceHeight({
    x: connectedX,
    z,
    currentFootY: connectedFootY,
    cells: connectedUpperFloorGrid,
    plotBaseY,
    terrainY: 0,
  })
  assert.equal(canAstraBuilderCharacterOccupy(connectedBodies, {
    x: connectedX,
    z,
    footY: nextFootY,
    scale: .28,
  }), true)
  connectedFootY = nextFootY
}
const secondFloorHeight = plotBaseY
  + ASTRA_BUILDER_POC_PLOT.cellSize * 3.24
assert.ok(Math.abs(connectedFootY - secondFloorHeight) < .0001)

// 바닥 끝에서는 발바닥이 일부라도 걸쳐 있는 동안만 지지하고, 완전히
// 벗어나면 아래의 기본 부지 바닥을 반환해 낙하 전환이 가능해야 한다.
const lastFloorCenterZ = ASTRA_BUILDER_POC_PLOT.center[1] + connectedEnd[2]
const floorFarEdgeZ = lastFloorCenterZ + ASTRA_BUILDER_POC_PLOT.cellSize * .5
const supportedOverhangHeight = getAstraBuilderWalkSurfaceHeight({
  x: connectedX,
  z: floorFarEdgeZ + defaultDimensions.radius * .5,
  currentFootY: secondFloorHeight,
  cells: connectedUpperFloorGrid,
  plotBaseY,
  terrainY: 0,
})
assert.equal(supportedOverhangHeight, secondFloorHeight)
const unsupportedHeight = getAstraBuilderWalkSurfaceHeight({
  x: connectedX,
  z: floorFarEdgeZ + defaultDimensions.radius + .01,
  currentFootY: secondFloorHeight,
  cells: connectedUpperFloorGrid,
  plotBaseY,
  terrainY: 0,
})
assert.equal(unsupportedHeight, plotBaseY + ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET)

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

// 3셀 층고에서는 새 기본 크기가 자연스럽게 들어가지만, + 키로 키운
// 몸체가 2층 바닥을 관통하려는 순간에는 확대가 거부되어야 한다.
const secondStoryCeilingGrid = createEmptyAstraBuilderGrid()
secondStoryCeilingGrid[getAstraBuilderCellIndex({ x: 5, y: 3, z: 5 })] = 2
const secondStoryCeilingBodies = createAstraBuilderCollisionBodies(
  secondStoryCeilingGrid,
  plotBaseY,
)
assert.equal(canAstraBuilderCharacterOccupy(secondStoryCeilingBodies, {
  x: stairWorldX,
  z: stairWorldZ,
  footY: plotBaseY + ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET,
  scale: .25,
}), true)
assert.equal(canAstraBuilderCharacterOccupy(secondStoryCeilingBodies, {
  x: stairWorldX,
  z: stairWorldZ,
  footY: plotBaseY + ASTRA_BUILDER_PLATFORM_SURFACE_OFFSET,
  scale: .41,
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
