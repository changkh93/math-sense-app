import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getSkyLandmarks } from './frontierExploration.js'

function SkyRay({ landmark, index, paused }) {
  const group = useRef()
  const left = useRef()
  const right = useRef()
  const time = useRef(index * 2)
  useFrame((_, delta) => {
    if (paused) return
    time.current += Math.min(delta, .05)
    const angle = time.current * .22
    group.current.position.set(landmark.x + Math.cos(angle) * 2.7, landmark.y + 1.4 + Math.sin(angle * 3) * .4, landmark.z + Math.sin(angle) * 2.7)
    group.current.rotation.y = -angle
    left.current.rotation.x = Math.sin(time.current * 2) * .28
    right.current.rotation.x = -Math.sin(time.current * 2) * .28
  })
  return <group ref={group}>
    <mesh scale={[.7, .13, .36]}><sphereGeometry args={[.5, 8, 5]} /><meshStandardMaterial color={landmark.color} emissive={landmark.color} emissiveIntensity={.4} /></mesh>
    {[-1, 1].map((side) => <group key={side} ref={side < 0 ? left : right} position={[0, 0, side * .17]}>
      <mesh rotation={[Math.PI / 2, 0, Math.PI / 2]} position={[0, 0, side * .28]} scale={[1, 1.7, .1]}><coneGeometry args={[.37, .7, 3]} /><meshStandardMaterial color={landmark.color} side={THREE.DoubleSide} /></mesh>
    </group>)}
    <mesh position={[-.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[.05, .8, 5]} /><meshStandardMaterial color={landmark.color} /></mesh>
  </group>
}

export default function FrontierSkyWorld({ worldRadius, playerRef, paused }) {
  const clouds = useRef()
  const motes = useRef()
  const time = useRef(0)
  const matrix = useMemo(() => new THREE.Object3D(), [])
  const landmarks = useMemo(() => getSkyLandmarks(worldRadius), [worldRadius])
  useFrame((_, delta) => {
    if (!paused) time.current += Math.min(delta, .05)
    if (!clouds.current || !motes.current) return
    for (let i = 0; i < 48; i++) {
      const cluster = Math.floor(i / 4)
      const angle = cluster * Math.PI / 6 + time.current * .003
      const radius = worldRadius * (.65 + (cluster % 3) * .18)
      matrix.position.set(Math.cos(angle) * radius + (i % 4) * .9, 6 + cluster % 3 * 3.4 + (i % 2) * .3, Math.sin(angle) * radius)
      matrix.rotation.set(0, angle, 0)
      matrix.scale.set(1.5, .45, .9)
      matrix.updateMatrix()
      clouds.current.setMatrixAt(i, matrix.matrix)
    }
    const player = playerRef.current?.position
    const visible = player && player.y > 4
    for (let i = 0; i < 36; i++) {
      matrix.position.set((player?.x || 0) + Math.sin(i * 4.2) * 5, (player?.y || 0) + ((i * .47 + time.current * .18) % 5) - 2, (player?.z || 0) + Math.cos(i * 2.3) * 5)
      matrix.scale.set(visible ? .035 : 0, visible ? .035 : 0, visible ? .3 : 0)
      matrix.rotation.set(0, .6, 0)
      matrix.updateMatrix()
      motes.current.setMatrixAt(i, matrix.matrix)
    }
    clouds.current.instanceMatrix.needsUpdate = true
    motes.current.instanceMatrix.needsUpdate = true
  })
  return <group>
    <instancedMesh ref={clouds} args={[undefined, undefined, 48]} frustumCulled={false} raycast={() => null}>
      <sphereGeometry args={[1, 10, 6]} /><meshStandardMaterial color="#c7e6ed" transparent opacity={.24} depthWrite={false} roughness={1} />
    </instancedMesh>
    <instancedMesh ref={motes} args={[undefined, undefined, 36]} frustumCulled={false} raycast={() => null}>
      <sphereGeometry args={[1, 5, 3]} /><meshBasicMaterial color="#d9fff1" transparent opacity={.42} depthWrite={false} />
    </instancedMesh>
    {landmarks.map((landmark, index) => <group key={landmark.id}>
      <group position={[landmark.x, landmark.y, landmark.z]}>
        <mesh><torusGeometry args={[1.35, .065, 8, 40]} /><meshStandardMaterial color={landmark.color} emissive={landmark.color} emissiveIntensity={1.4} /></mesh>
        {Array.from({ length: 8 }, (_, j) => <mesh key={j} position={[Math.cos(j * Math.PI / 4) * 1.7, Math.sin(j * Math.PI / 4) * 1.7, 0]}><octahedronGeometry args={[.08, 0]} /><meshBasicMaterial color={landmark.color} /></mesh>)}
      </group>
      <SkyRay landmark={landmark} index={index} paused={paused} />
    </group>)}
  </group>
}
