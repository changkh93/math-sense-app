import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  ASTRA_BUILDER_BLOCKS,
  ASTRA_BUILDER_POC_PLOT,
  decodeAstraBuilderCell,
  getAstraBuilderCellFromIndex,
  getAstraBuilderCellFromWorldPoint,
  getAstraBuilderCellIndex,
  getAstraBuilderDoorwayColumnKeys,
  getAstraBuilderInstances,
  getAstraBuilderTopFaceTarget,
  getAstraBuilderWorldPosition,
} from './astraBuilderModel'

const PLATFORM_SIZE = ASTRA_BUILDER_POC_PLOT.width * ASTRA_BUILDER_POC_PLOT.cellSize
const BUILDER_CAMERA_OFFSET = new THREE.Vector3(4.8, 6.2, 5.4)

const STAIR_GEOMETRY = (() => {
  const cellSize = ASTRA_BUILDER_POC_PLOT.cellSize
  const half = cellSize * 0.5
  const shape = new THREE.Shape()
  shape.moveTo(-half, -half)
  shape.lineTo(half, -half)
  shape.lineTo(half, 0)
  shape.lineTo(0, 0)
  shape.lineTo(0, half)
  shape.lineTo(-half, half)
  shape.closePath()
  const geom = new THREE.ExtrudeGeometry(shape, { depth: cellSize, bevelEnabled: false })
  geom.center()
  geom.rotateY(Math.PI / 2)
  return geom
})()

function getBlockTransform(blockType, cell) {
  const position = getAstraBuilderWorldPosition(cell)
  // 벽(1)·유리(3)·조명(4)·계단(5)은 셀에 딱 맞춰 밀착(틈/단차 제거).
  // 바닥(2)은 납작하게, 기둥(6)은 가늘게 두어 각 재료 특성 유지.
  const scale = new THREE.Vector3(1, 1, 1)
  if (blockType === 2) {
    scale.y = 0.22
    position[1] -= ASTRA_BUILDER_POC_PLOT.cellSize * 0.37
  } else if (blockType === 6) {
    scale.x = 0.42
    scale.z = 0.42
  }
  return { position, scale }
}

function WoodDoorVisual({ color, preview = false }) {
  const cellSize = ASTRA_BUILDER_POC_PLOT.cellSize
  const doorWidth = cellSize * 2
  const doorHeight = cellSize * 2.55
  const frameThickness = cellSize * .12
  const frameDepth = cellSize * .28
  const baseY = -cellSize * .5
  const openingWidth = doorWidth - frameThickness * 2
  const leafWidth = openingWidth * .2
  const leafHeight = doorHeight - frameThickness * 1.8
  const DoorMaterial = ({ leaf = false }) => preview ? (
    <meshBasicMaterial color={color} transparent opacity={.42} wireframe depthWrite={false} />
  ) : (
    <meshStandardMaterial
      color={leaf ? '#87522f' : color}
      roughness={leaf ? .82 : .72}
      metalness={leaf ? .02 : .04}
    />
  )

  return (
    <group>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (doorWidth * .5 - frameThickness * .5), baseY + doorHeight * .5, 0]}
          castShadow={!preview}
          receiveShadow={!preview}
        >
          <boxGeometry args={[frameThickness, doorHeight, frameDepth]} />
          <DoorMaterial />
        </mesh>
      ))}
      <mesh
        position={[0, baseY + doorHeight - frameThickness * .5, 0]}
        castShadow={!preview}
        receiveShadow={!preview}
      >
        <boxGeometry args={[doorWidth, frameThickness, frameDepth]} />
        <DoorMaterial />
      </mesh>
      {[-1, 1].map((side) => (
        <group
          key={`leaf-${side}`}
          position={[
            side * (openingWidth * .5 - leafWidth * .5),
            baseY + frameThickness * .35,
            frameDepth * .18,
          ]}
        >
          <mesh
            position={[0, leafHeight * .5, 0]}
            castShadow={!preview}
          >
            <boxGeometry args={[leafWidth, leafHeight, cellSize * .065]} />
            <DoorMaterial leaf />
          </mesh>
          {!preview && (
            <mesh position={[side * -leafWidth * .28, leafHeight * .52, cellSize * .04]}>
              <sphereGeometry args={[cellSize * .035, 8, 6]} />
              <meshStandardMaterial color="#e7c46e" metalness={.7} roughness={.24} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

function BuilderWoodDoors({ block, instances, onBlockPointerDown, onBlockPointerMove }) {
  const cellSize = ASTRA_BUILDER_POC_PLOT.cellSize

  return instances.map((cell) => {
    const position = getAstraBuilderWorldPosition(cell)
    return (
      <group
        key={cell.index}
        position={position}
        rotation={[0, cell.rotation * Math.PI * 0.5, 0]}
        onPointerDown={(event) => onBlockPointerDown?.(event, cell)}
        onPointerMove={(event) => onBlockPointerMove?.(event, cell)}
      >
        <group position={[cellSize * .5, 0, 0]}>
          <WoodDoorVisual color={block.color} />
        </group>
      </group>
    )
  })
}

function BuilderBlockInstances({ block, instances, onBlockPointerDown, onBlockPointerMove }) {
  const meshRef = useRef()
  const transform = useMemo(() => new THREE.Object3D(), [])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    instances.forEach((cell, instanceId) => {
      const next = getBlockTransform(block.id, cell)
      transform.position.set(...next.position)
      transform.rotation.set(0, cell.rotation * Math.PI * 0.5, 0)
      transform.scale.copy(next.scale)
      transform.updateMatrix()
      mesh.setMatrixAt(instanceId, transform.matrix)
    })
    mesh.count = instances.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [block.id, instances, transform])

  const materialProps = block.id === 3
    ? { transparent: true, opacity: 0.58, roughness: 0.08, metalness: 0.3, depthWrite: false }
    : block.id === 4
      ? { emissive: block.color, emissiveIntensity: 1.6, toneMapped: false, roughness: 0.3 }
      : { roughness: 0.52, metalness: block.id === 6 ? 0.38 : 0.12 }

  return (
    <instancedMesh
      ref={meshRef}
      args={[block.id === 5 ? STAIR_GEOMETRY : null, null, ASTRA_BUILDER_POC_PLOT.maxBlocks]}
      castShadow
      receiveShadow
      frustumCulled={false}
      onPointerDown={(event) => {
        const cell = instances[event.instanceId]
        if (cell) onBlockPointerDown?.(event, cell)
      }}
      onPointerMove={(event) => {
        const cell = instances[event.instanceId]
        if (cell) onBlockPointerMove?.(event, cell)
      }}
    >
      {block.id !== 5 && (
        <boxGeometry args={[
          ASTRA_BUILDER_POC_PLOT.cellSize,
          ASTRA_BUILDER_POC_PLOT.cellSize,
          ASTRA_BUILDER_POC_PLOT.cellSize,
        ]} />
      )}
      <meshStandardMaterial color={block.color} {...materialProps} />
    </instancedMesh>
  )
}

const BOX_EDGE_PAIRS = (() => {
  // cellSize 정육면체(중심 원점)의 12개 모서리를 정점 인덱스 쌍으로 표현
  const c = [
    [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5],
    [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5],
  ]
  return [
    [0, 1], [1, 2], [2, 3], [3, 0], // 아랫면
    [4, 5], [5, 6], [6, 7], [7, 4], // 윗면
    [0, 4], [1, 5], [2, 6], [3, 7], // 세로 기둥
  ].map(([a, b]) => [c[a], c[b]])
})()

// 모든 occupied 셀의 블록 외곽선(어두운 얇은 선)을 하나의 geometry로 병합.
// 각 블록은 getBlockTransform(기둥 얇음/바닥 납작함 등)을 그대로 반영해 실제 형태의 테두리가 됨.
function buildBlockEdgesGeometry(cells) {
  const cellSize = ASTRA_BUILDER_POC_PLOT.cellSize
  const segments = []
  const object = new THREE.Object3D()
  const doorwayColumns = getAstraBuilderDoorwayColumnKeys(cells)
  for (let index = 0; index < cells.length; index += 1) {
    const decoded = decodeAstraBuilderCell(cells[index])
    if (!decoded.occupied || decoded.blockType === 7) continue
    const cell = getAstraBuilderCellFromIndex(index)
    if (!cell) continue
    if (
      decoded.blockType !== 2
      && cell.y <= 2
      && doorwayColumns.has(`${cell.x}:${cell.z}`)
    ) continue
    const { position, scale } = getBlockTransform(decoded.blockType, cell)
    object.position.set(position[0], position[1], position[2])
    object.rotation.set(0, (decoded.rotation || 0) * Math.PI * 0.5, 0)
    object.scale.set(scale.x * cellSize, scale.y * cellSize, scale.z * cellSize)
    object.updateMatrix()
    BOX_EDGE_PAIRS.forEach(([a, b]) => {
      const va = new THREE.Vector3(a[0], a[1], a[2]).applyMatrix4(object.matrix)
      const vb = new THREE.Vector3(b[0], b[1], b[2]).applyMatrix4(object.matrix)
      segments.push(va.x, va.y, va.z, vb.x, vb.y, vb.z)
    })
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3))
  return geometry
}

function AstraBuilderCamera({ active, inputMode, paused, baseY }) {
  const { camera } = useThree()
  const controlsRef = useRef()
  const previousCameraRef = useRef(null)
  const target = useMemo(() => new THREE.Vector3(
    ASTRA_BUILDER_POC_PLOT.center[0],
    baseY + 0.9,
    ASTRA_BUILDER_POC_PLOT.center[1],
  ), [baseY])

  useEffect(() => {
    if (!active) return undefined
    previousCameraRef.current = {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      zoom: camera.zoom,
    }
    camera.position.copy(target).add(BUILDER_CAMERA_OFFSET)
    camera.lookAt(target)
    camera.updateProjectionMatrix()
    return () => {
      const previous = previousCameraRef.current
      if (!previous) return
      camera.position.copy(previous.position)
      camera.quaternion.copy(previous.quaternion)
      camera.zoom = previous.zoom
      camera.updateProjectionMatrix()
    }
  }, [active, camera, target])

  useFrame(() => {
    if (!active || !controlsRef.current) return
    controlsRef.current.target.lerp(target, 0.18)
  })

  if (!active) return null
  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!paused && inputMode === 'camera'}
      target={target}
      enableDamping
      dampingFactor={0.1}
      enablePan
      enableKeys={false}
      minDistance={3.8}
      maxDistance={9.5}
      minPolarAngle={0.35}
      maxPolarAngle={Math.PI * 0.46}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  )
}

export default function AstraBuilderPlot({
  baseY,
  cells,
  blockCount,
  active,
  paused,
  inputMode,
  tool,
  activeLayer,
  selectedBlockType,
  selectedRotation,
  onLayerChange,
  onEdit,
}) {
  const [hoveredCell, setHoveredCell] = useState(null)
  const instancesByType = useMemo(() => getAstraBuilderInstances(cells), [cells])
  const edgesGeometry = useMemo(() => buildBlockEdgesGeometry(cells), [cells])
  const edgesVisible = active && inputMode === 'build'
  const isPlacingRef = useRef(false)
  const lastPlacedKeyRef = useRef(null)
  const hoverIndex = hoveredCell ? getAstraBuilderCellIndex(hoveredCell) : -1
  const hoveredValue = hoverIndex >= 0 ? cells[hoverIndex] : 0
  const hoverOccupied = decodeAstraBuilderCell(hoveredValue).occupied
  const hoverValid = Boolean(hoveredCell) && (
    tool === 'place'
      ? !hoverOccupied && blockCount < ASTRA_BUILDER_POC_PLOT.maxBlocks
      : hoverOccupied
  )
  const hoverPosition = hoveredCell ? getAstraBuilderWorldPosition(hoveredCell) : null
  const editPlaneY = activeLayer * ASTRA_BUILDER_POC_PLOT.cellSize + 0.012

  // 버튼을 놓치거나 씬 밖으로 나간 경우를 대비한 안전망: 포인터가 올라오면 연속 배치 종료.
  useEffect(() => {
    const stop = () => {
      isPlacingRef.current = false
      lastPlacedKeyRef.current = null
    }
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [])

  const cellKey = (cell) => cell ? `${cell.x}:${cell.y}:${cell.z}` : null

  // 하나의 셀에 대해 배치/삭제를 수행. 직전에 처리한 셀과 같으면 스킵(드래그 중 중복 방지).
  const placeAtCell = (cell, { raiseLayer = false } = {}) => {
    if (!active || paused || inputMode !== 'build') return
    if (!cell) return
    const key = cellKey(cell)
    if (key && lastPlacedKeyRef.current === key) return
    if (tool === 'place' && blockCount >= ASTRA_BUILDER_POC_PLOT.maxBlocks) return
    lastPlacedKeyRef.current = key
    if (raiseLayer) onLayerChange?.(cell.y)
    onEdit?.({
      tool,
      cell,
      blockType: selectedBlockType,
      rotation: selectedRotation,
    })
  }

  // 빈 땅(plane) 위에서의 다운/무브. 마우스를 누른 채 움직이면 그려가며 연속 배치.
  const handlePlanePointerDown = (event) => {
    if (!active || paused || inputMode !== 'build') return
    event.stopPropagation()
    isPlacingRef.current = true
    const cell = getAstraBuilderCellFromWorldPoint(event.point, activeLayer)
    placeAtCell(cell)
  }

  const handlePlanePointerMove = (event) => {
    if (!active || paused || inputMode !== 'build') return
    const cell = getAstraBuilderCellFromWorldPoint(event.point, activeLayer)
    setHoveredCell(cell)
    if (isPlacingRef.current && cell) {
      event.stopPropagation()
      placeAtCell(cell)
    }
  }

  const getBlockPointerTarget = (event, cell) => {
    if (tool === 'place') return getAstraBuilderTopFaceTarget(cell, event.face?.normal, ASTRA_BUILDER_POC_PLOT, selectedBlockType)
    return cell
  }

  const handleBlockPointerDown = (event, cell) => {
    if (!active || paused || inputMode !== 'build') return
    event.stopPropagation()
    const target = getBlockPointerTarget(event, cell)
    if (!target) return
    isPlacingRef.current = true
    setHoveredCell(target)
    placeAtCell(target, { raiseLayer: tool === 'place' })
  }

  const updateHoveredBlock = (event, cell) => {
    if (!active || paused || inputMode !== 'build') return
    const target = getBlockPointerTarget(event, cell)
    if (!target) return
    event.stopPropagation()
    setHoveredCell(target)
    if (isPlacingRef.current) placeAtCell(target, { raiseLayer: tool === 'place' })
  }

  return (
    <group position={[ASTRA_BUILDER_POC_PLOT.center[0], baseY, ASTRA_BUILDER_POC_PLOT.center[1]]}>
      <mesh position={[0, -0.07, 0]} receiveShadow>
        <boxGeometry args={[PLATFORM_SIZE + 0.16, 0.14, PLATFORM_SIZE + 0.16]} />
        <meshStandardMaterial color="#273f50" metalness={0.42} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PLATFORM_SIZE, PLATFORM_SIZE]} />
        <meshStandardMaterial color="#526d76" roughness={0.78} metalness={0.18} />
      </mesh>

      {ASTRA_BUILDER_BLOCKS.map((block) => block.id === 7 ? (
        <BuilderWoodDoors
          key={block.id}
          block={block}
          instances={instancesByType.get(block.id) || []}
          onBlockPointerDown={handleBlockPointerDown}
          onBlockPointerMove={updateHoveredBlock}
        />
      ) : (
        <BuilderBlockInstances
          key={block.id}
          block={block}
          instances={instancesByType.get(block.id) || []}
          onBlockPointerDown={handleBlockPointerDown}
          onBlockPointerMove={updateHoveredBlock}
        />
      ))}

      {/* 건축 모드에서만 블록 외곽선 표시. 카메라 모드에서는 숨겨 깔끔한 감상 화면 제공. */}
      {edgesVisible && (
        <lineSegments geometry={edgesGeometry} renderOrder={2}>
          <lineBasicMaterial color="#1c2b35" transparent opacity={0.55} depthWrite={false} />
        </lineSegments>
      )}

      {active && (
        <>
          <gridHelper
            args={[PLATFORM_SIZE, ASTRA_BUILDER_POC_PLOT.width, '#70ebc0', '#436b70']}
            position={[0, editPlaneY + 0.006, 0]}
          />
          <mesh
            position={[0, editPlaneY, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerDown={handlePlanePointerDown}
            onPointerMove={handlePlanePointerMove}
            onPointerOut={() => setHoveredCell(null)}
          >
            <planeGeometry args={[PLATFORM_SIZE, PLATFORM_SIZE]} />
            <meshBasicMaterial
              transparent
              opacity={0.025}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          {hoverPosition && (
            <group
              position={hoverPosition}
              rotation={[0, selectedRotation * Math.PI * 0.5, 0]}
            >
              {selectedBlockType === 5 ? (
                <mesh geometry={STAIR_GEOMETRY}>
                  <meshBasicMaterial
                    color={hoverValid ? '#6ff0b8' : '#ff7182'}
                    transparent
                    opacity={0.45}
                    wireframe
                    depthWrite={false}
                  />
                </mesh>
              ) : selectedBlockType === 7 ? (
                <group position={[ASTRA_BUILDER_POC_PLOT.cellSize * .5, 0, 0]}>
                  <WoodDoorVisual color={hoverValid ? '#6ff0b8' : '#ff7182'} preview />
                </group>
              ) : (
                <mesh>
                  <boxGeometry args={[
                    ASTRA_BUILDER_POC_PLOT.cellSize * 0.98,
                    ASTRA_BUILDER_POC_PLOT.cellSize * 0.98,
                    ASTRA_BUILDER_POC_PLOT.cellSize * 0.98,
                  ]} />
                  <meshBasicMaterial
                    color={hoverValid ? '#6ff0b8' : '#ff7182'}
                    transparent
                    opacity={0.34}
                    wireframe
                    depthWrite={false}
                  />
                </mesh>
              )}
              <mesh
                position={[0, ASTRA_BUILDER_POC_PLOT.cellSize * 0.54, ASTRA_BUILDER_POC_PLOT.cellSize * 0.28]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <coneGeometry args={[0.04, 0.1, 4]} />
                <meshBasicMaterial color={hoverValid ? '#6ff0b8' : '#ff7182'} />
              </mesh>
            </group>
          )}
        </>
      )}

      <AstraBuilderCamera
        active={active}
        inputMode={inputMode}
        paused={paused}
        baseY={baseY}
      />
    </group>
  )
}
