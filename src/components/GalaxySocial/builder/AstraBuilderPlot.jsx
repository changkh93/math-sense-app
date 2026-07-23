import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  ASTRA_BUILDER_BLOCKS,
  ASTRA_BUILDER_POC_PLOT,
  decodeAstraBuilderCell,
  getAstraBuilderCellFromWorldPoint,
  getAstraBuilderCellIndex,
  getAstraBuilderInstances,
  getAstraBuilderTopFaceTarget,
  getAstraBuilderWorldPosition,
} from './astraBuilderModel'

const PLATFORM_SIZE = ASTRA_BUILDER_POC_PLOT.width * ASTRA_BUILDER_POC_PLOT.cellSize
const BUILDER_CAMERA_OFFSET = new THREE.Vector3(4.8, 6.2, 5.4)
const BUILDER_TAP_TOLERANCE_PX = 9

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
  const geom = new THREE.ExtrudeGeometry(shape, { depth: cellSize * 0.96, bevelEnabled: false })
  geom.center()
  geom.rotateY(Math.PI / 2)
  return geom
})()

function getBlockTransform(blockType, cell) {
  const position = getAstraBuilderWorldPosition(cell)
  const scale = new THREE.Vector3(0.96, 0.96, 0.96)
  if (blockType === 2) {
    scale.y = 0.22
    position[1] -= ASTRA_BUILDER_POC_PLOT.cellSize * 0.37
  } else if (blockType === 6) {
    scale.x = 0.42
    scale.z = 0.42
  }
  return { position, scale }
}

function BuilderBlockInstances({ block, instances, onBlockPointerMove, onBlockClick }) {
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
      onPointerMove={(event) => {
        const cell = instances[event.instanceId]
        if (cell) onBlockPointerMove?.(event, cell)
      }}
      onClick={(event) => {
        const cell = instances[event.instanceId]
        if (cell) onBlockClick?.(event, cell)
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

  const updateHoveredCell = (event) => {
    if (!active || paused || inputMode !== 'build') return
    const cell = getAstraBuilderCellFromWorldPoint(event.point, activeLayer)
    setHoveredCell(cell)
  }

  const applyHoveredCell = (event) => {
    if (!active || paused || inputMode !== 'build' || event.delta > BUILDER_TAP_TOLERANCE_PX) return
    event.stopPropagation()
    const cell = getAstraBuilderCellFromWorldPoint(event.point, activeLayer)
    if (!cell || (tool === 'place' && blockCount >= ASTRA_BUILDER_POC_PLOT.maxBlocks)) return
    onEdit?.({
      tool,
      cell,
      blockType: selectedBlockType,
      rotation: selectedRotation,
    })
  }

  const getBlockPointerTarget = (event, cell) => {
    if (tool === 'place') return getAstraBuilderTopFaceTarget(cell, event.face?.normal, ASTRA_BUILDER_POC_PLOT, selectedBlockType)
    return cell
  }

  const updateHoveredBlock = (event, cell) => {
    if (!active || paused || inputMode !== 'build') return
    const target = getBlockPointerTarget(event, cell)
    if (!target) return
    event.stopPropagation()
    setHoveredCell(target)
  }

  const applyBlockTarget = (event, cell) => {
    if (!active || paused || inputMode !== 'build' || event.delta > BUILDER_TAP_TOLERANCE_PX) return
    const target = getBlockPointerTarget(event, cell)
    if (!target) return
    event.stopPropagation()
    if (tool === 'place' && blockCount >= ASTRA_BUILDER_POC_PLOT.maxBlocks) return
    onLayerChange?.(target.y)
    onEdit?.({
      tool,
      cell: target,
      blockType: selectedBlockType,
      rotation: selectedRotation,
    })
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

      {ASTRA_BUILDER_BLOCKS.map((block) => (
        <BuilderBlockInstances
          key={block.id}
          block={block}
          instances={instancesByType.get(block.id) || []}
          onBlockPointerMove={updateHoveredBlock}
          onBlockClick={applyBlockTarget}
        />
      ))}

      {active && (
        <>
          <gridHelper
            args={[PLATFORM_SIZE, ASTRA_BUILDER_POC_PLOT.width, '#70ebc0', '#436b70']}
            position={[0, editPlaneY + 0.006, 0]}
          />
          <mesh
            position={[0, editPlaneY, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerMove={(event) => {
              event.stopPropagation()
              updateHoveredCell(event)
            }}
            onPointerOut={() => setHoveredCell(null)}
            onClick={applyHoveredCell}
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
              ) : (
                <mesh>
                  <boxGeometry args={[
                    ASTRA_BUILDER_POC_PLOT.cellSize * 0.94,
                    ASTRA_BUILDER_POC_PLOT.cellSize * 0.94,
                    ASTRA_BUILDER_POC_PLOT.cellSize * 0.94,
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
