import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  MARINE_HABITAT_COUNT,
  getMarineHabitat,
  getOceanFloorY,
  sampleExplorationWater,
} from './frontierExploration.js'
import {
  FISH_PROFILES,
  createMarineFishGeometry,
  createCoralGeometry,
  createSeaweedGeometry,
  createSeabedGeometry,
  createTurtleGeometry,
  createFlipperGeometry,
  marineRandom,
} from './marineGeometry.js'
import {
  createMarineMaterial,
  createSeabedMaterial,
  createReefMaterial,
} from './marineMaterials.js'

const SCHOOL_SIZE = 8

function FishSchools({ habitats, worldRadius, playerRef, clock, paused }) {
  const meshes = useRef([])
  const assets = useMemo(
    () =>
      FISH_PROFILES.map((_, i) => ({
        geometry: createMarineFishGeometry(i),
        material: createMarineMaterial('fish', clock),
      })),
    [clock],
  )
  const schools = useMemo(
    () =>
      habitats.map((habitat, school) => ({
        habitat,
        species: school % 4,
        fish: Array.from({ length: SCHOOL_SIZE }, (_, i) => ({
          x: habitat.x + (marineRandom(school * 31 + i) - 0.5) * 3,
          y: Math.min(-0.4, habitat.y + marineRandom(school * 43 + i) * 0.5),
          z: habitat.z + (marineRandom(school * 57 + i) - 0.5) * 3,
          vx: 0.3,
          vz: 0.1,
          yaw: 0,
          size:
            FISH_PROFILES[school % 4].size *
            (0.8 + marineRandom(i + school * 19) * 0.4),
        })),
      })),
    [habitats],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useEffect(
    () => () =>
      assets.forEach(({ geometry, material }) => {
        geometry.dispose()
        material.dispose()
      }),
    [assets],
  )
  useFrame(({ camera }, dt) => {
    const delta = paused ? 0 : Math.min(dt, 0.05),
      t = clock.value
    const player = playerRef?.current?.position
    const counters = [0, 0, 0, 0]
    schools.forEach((school, si) => {
      const { habitat, fish, species } = school
      const visible =
        Math.hypot(
          camera.position.x - habitat.x,
          camera.position.z - habitat.z,
        ) < 38
      const mesh = meshes.current[species]
      if (!mesh) return
      const speed = FISH_PROFILES[species].speed
      const heading = t * 0.085 + si * 2.4
      const cx = habitat.x + Math.cos(heading) * 3
      const cz = habitat.z + Math.sin(heading * 0.87) * 3
      // Snapshot velocities: each fish sees the same previous-frame neighbours.
      const averageX = fish.reduce((sum, f) => sum + f.vx, 0) / fish.length
      const averageZ = fish.reduce((sum, f) => sum + f.vz, 0) / fish.length
      fish.forEach((f, i) => {
        if (visible && delta) {
          let sx = 0,
            sz = 0
          fish.forEach((other) => {
            if (other === f) return
            const dx = f.x - other.x,
              dz = f.z - other.z,
              d2 = dx * dx + dz * dz
            if (d2 < 0.7 && d2 > 0.001) {
              sx += dx / (d2 + 0.15)
              sz += dz / (d2 + 0.15)
            }
          })
          let tx =
            (cx - f.x) * 0.3 +
            averageX * 0.7 +
            sx * 0.22 +
            Math.sin(t * 0.63 + i * 4.1) * 0.08
          let tz =
            (cz - f.z) * 0.3 +
            averageZ * 0.7 +
            sz * 0.22 +
            Math.cos(t * 0.53 + i * 3.7) * 0.08
          let flee = 0
          if (player) {
            const dx = f.x - player.x,
              dz = f.z - player.z,
              d = Math.hypot(dx, dz, f.y - player.y)
            if (d < 2.5) {
              flee = (2.5 - d) / 2.5
              tx += (dx / (d + 0.1)) * flee * 3
              tz += (dz / (d + 0.1)) * flee * 3
            }
          }
          const length = Math.max(0.01, Math.hypot(tx, tz)),
            k = 1 - Math.exp(-delta * 2)
          f.vx += ((tx / length) * speed * (1 + flee * 1.4) - f.vx) * k
          f.vz += ((tz / length) * speed * (1 + flee * 1.4) - f.vz) * k
          f.x += f.vx * delta
          f.z += f.vz * delta
          const radial = Math.hypot(f.x, f.z)
          if (radial < worldRadius + 2) {
            f.x *= (worldRadius + 2) / radial
            f.z *= (worldRadius + 2) / radial
          }
          const floor = getOceanFloorY(f.x, f.z, worldRadius)
          const targetY = Math.min(
            -0.35,
            Math.max(
              floor + 0.25,
              habitat.y + Math.sin(t * 0.5 + i * 1.2) * 0.4,
            ),
          )
          f.y += (targetY - f.y) * (1 - Math.exp(-delta * 1.8))
          f.y = Math.min(-0.35, Math.max(floor + 0.2, f.y))
          const yaw = Math.atan2(-f.vz, f.vx)
          f.yaw +=
            Math.atan2(Math.sin(yaw - f.yaw), Math.cos(yaw - f.yaw)) *
            (1 - Math.exp(-delta * 4))
        }
        dummy.position.set(f.x, f.y, f.z)
        dummy.rotation.set(0, f.yaw, Math.sin(t * 0.6 + i) * 0.035)
        dummy.scale.setScalar(visible ? f.size : 0)
        dummy.updateMatrix()
        mesh.setMatrixAt(counters[species]++, dummy.matrix)
      })
    })
    meshes.current.forEach((mesh) => {
      if (mesh) mesh.instanceMatrix.needsUpdate = true
    })
  })
  return assets.map(({ geometry, material }, i) => (
    <instancedMesh
      key={i}
      ref={(mesh) => {
        meshes.current[i] = mesh
      }}
      args={[
        geometry,
        material,
        habitats.filter((_, j) => j % 4 === i).length * SCHOOL_SIZE,
      ]}
      frustumCulled={false}
      raycast={() => null}
    />
  ))
}

function ReefFields({ habitats, worldRadius, clock }) {
  const meshes = useRef([])
  const lastCamera = useRef([Infinity, Infinity])
  const variants = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => createCoralGeometry(i % 5, i + 1)),
    [],
  )
  const weed = useMemo(() => createSeaweedGeometry(4), [])
  const reefMaterial = useMemo(() => createReefMaterial(), [])
  const weedMaterial = useMemo(
    () => createMarineMaterial('weed', clock),
    [clock],
  )
  const rock = useMemo(() => {
    const source = new THREE.SphereGeometry(1, 32, 20)
    source.deleteAttribute('uv')
    source.deleteAttribute('normal')
    const g = mergeVertices(source)
    source.dispose()
    const p = g.attributes.position,
      colors = []
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        r = 1 + 0.13 * Math.sin(x * 9 + z * 4) * Math.cos(y * 7)
      p.setXYZ(i, x * r, y * r, z * r)
    }
    for (let i = 0; i < p.count; i++) {
      const c = new THREE.Color('#777968').multiplyScalar(
        0.8 + 0.2 * Math.sin(p.getX(i) * 9 + p.getZ(i) * 7) ** 2,
      )
      colors.push(c.r, c.g, c.b)
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [])
  const placements = useMemo(() => {
    const groups = Array.from({ length: 12 }, () => [])
    habitats.forEach((h, hi) => {
      for (let j = 0; j < 32; j++) {
        const seed = hi * 101 + j,
          angle = marineRandom(seed) * Math.PI * 2,
          range = Math.sqrt(marineRandom(seed + 500)) * 4.3
        const x = h.x + Math.cos(angle) * range,
          z = h.z + Math.sin(angle) * range
        if (Math.hypot(x, z) < worldRadius + 1.5) continue
        const kind = j < 12 ? (hi * 3 + j) % 10 : j < 28 ? 10 : 11
        const size =
          kind === 10
            ? 0.35 + marineRandom(seed + 8) * 0.5
            : kind === 11
              ? 0.55 + marineRandom(seed + 8) * 1.3
              : 0.3 + marineRandom(seed + 8) * 0.65
        const y =
          getOceanFloorY(x, z, worldRadius) - (kind === 11 ? 0.16 : 0.015)
        if (kind !== 11 && y > -1.1) continue
        const d = new THREE.Object3D()
        d.position.set(x, y, z)
        if (kind === 11 || kind % 5 === 1 || kind % 5 === 2) {
          // Broad bases follow the slope instead of hanging off it like shelves.
          const slopeX =
            (getOceanFloorY(x + 0.2, z, worldRadius) -
              getOceanFloorY(x - 0.2, z, worldRadius)) /
            0.4
          const slopeZ =
            (getOceanFloorY(x, z + 0.2, worldRadius) -
              getOceanFloorY(x, z - 0.2, worldRadius)) /
            0.4
          d.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(-slopeX, 1, -slopeZ).normalize(),
          )
        }
        d.rotateY(angle)
        d.scale.set(size, size * (kind === 11 ? 0.55 : 1), size)
        d.updateMatrix()
        groups[kind].push({ x, z, matrix: d.matrix.clone() })
      }
    })
    return groups
  }, [habitats, worldRadius])
  useLayoutEffect(() => {
    lastCamera.current = [Infinity, Infinity]
  }, [placements])
  useFrame(({ camera }) => {
    if (
      Math.hypot(
        camera.position.x - lastCamera.current[0],
        camera.position.z - lastCamera.current[1],
      ) < 2
    )
      return
    lastCamera.current = [camera.position.x, camera.position.z]
    placements.forEach((items, i) => {
      const mesh = meshes.current[i]
      if (!mesh) return
      let count = 0
      items.forEach((p) => {
        if (Math.hypot(p.x - camera.position.x, p.z - camera.position.z) < 30)
          mesh.setMatrixAt(count++, p.matrix)
      })
      mesh.count = count
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    })
  })
  useEffect(
    () => () => {
      variants.forEach((g) => g.dispose())
      weed.dispose()
      rock.dispose()
      reefMaterial.dispose()
      weedMaterial.dispose()
    },
    [variants, weed, rock, reefMaterial, weedMaterial],
  )
  return (
    <group>
      {[...variants, weed, rock].map((geometry, i) => (
        <instancedMesh
          key={i}
          ref={(mesh) => {
            meshes.current[i] = mesh
          }}
          args={[
            geometry,
            i === 10 ? weedMaterial : reefMaterial,
            placements[i].length,
          ]}
          receiveShadow
          raycast={() => null}
        />
      ))}
    </group>
  )
}

function SeaTurtle({ habitat, worldRadius, clock, assets }) {
  const root = useRef(),
    flippers = useRef([])
  useFrame(({ camera }) => {
    const t = clock.value + habitat.x * 0.2,
      a = t * 0.055
    const x = habitat.x + Math.cos(a) * 3,
      z = habitat.z + Math.sin(a) * 3
    root.current.visible =
      Math.hypot(camera.position.x - x, camera.position.z - z) < 35
    root.current.position.set(
      x,
      Math.min(
        -0.45,
        Math.max(
          getOceanFloorY(x, z, worldRadius) + 0.25,
          habitat.y + 0.3 + Math.sin(t * 0.35) * 0.15,
        ),
      ),
      z,
    )
    root.current.rotation.set(0, -a - Math.PI / 2, Math.sin(t * 0.6) * 0.025)
    flippers.current.forEach((fin, i) => {
      if (!fin) return
      const side = i % 2 ? 1 : -1,
        beat = Math.sin(t * 1.65 + (i > 1 ? 0.6 : 0))
      fin.rotation.x = side * (0.1 + beat * (i < 2 ? 0.48 : 0.12))
      fin.rotation.y = side * (i < 2 ? 0.12 : 0.5)
    })
  })
  return (
    <group ref={root} scale={0.85}>
      <mesh geometry={assets.body} material={assets.material} />
      {[-1, 1, -1, 1].map((side, i) => (
        <group
          key={i}
          ref={(fin) => {
            flippers.current[i] = fin
          }}
          position={[i < 2 ? 0.28 : -0.4, -0.07, side * (i < 2 ? 0.32 : 0.28)]}
          scale={[i < 2 ? 1 : 0.52, 1, side * (i < 2 ? 1 : 0.65)]}
        >
          <mesh geometry={assets.flipper} material={assets.material} />
        </group>
      ))}
    </group>
  )
}

function Jellyfish({ habitat, clock }) {
  const root = useRef()
  const tentacles = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const a = (i * Math.PI * 2) / 9,
          points = []
        for (let j = 0; j < 10; j++)
          points.push(
            new THREE.Vector3(
              Math.cos(a) * 0.16 + Math.sin(j * 0.75 + i) * 0.025,
              -j * 0.07,
              Math.sin(a) * 0.16 + Math.cos(j * 0.6 + i) * 0.025,
            ),
          )
        return new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          18,
          0.005,
          4,
          false,
        )
      }),
    [],
  )
  useEffect(() => () => tentacles.forEach((g) => g.dispose()), [tentacles])
  useFrame(({ camera }) => {
    const t = clock.value + habitat.x
    root.current.position.set(
      habitat.x + Math.sin(t * 0.14),
      habitat.y + 1.4 + Math.sin(t * 0.45) * 0.25,
      habitat.z + Math.cos(t * 0.13),
    )
    root.current.scale.set(
      1 + Math.sin(t * 1.8) * 0.07,
      1 - Math.sin(t * 1.8) * 0.1,
      1 + Math.sin(t * 1.8) * 0.07,
    )
    root.current.visible =
      camera.position.distanceTo(root.current.position) < 26
  })
  return (
    <group ref={root}>
      <mesh scale={[0.29, 0.17, 0.29]}>
        <sphereGeometry args={[1, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
        <meshStandardMaterial
          color="#d0cedb"
          emissive="#635d7c"
          emissiveIntensity={0.15}
          transparent
          opacity={0.25}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {tentacles.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial
            color="#c1c4d0"
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function WaterAtmosphere({ worldRadius, playerRef, clock }) {
  const air = useRef(),
    light = useRef(),
    bubbles = useRef()
  const fog = useMemo(() => new THREE.FogExp2('#14485d', 0.038), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ scene, camera }) => {
    const water = sampleExplorationWater(
      camera.position.x,
      camera.position.z,
      worldRadius,
      true,
    )
    const submerged = water && camera.position.y < water.surfaceY - 0.03
    if (submerged && !air.current) {
      air.current = { scene, fog: scene.fog, background: scene.background }
      scene.fog = fog
      scene.background = fog.color
    }
    if (submerged) {
      scene.fog = fog
      scene.background = fog.color
    }
    if (!submerged && air.current) {
      scene.fog = air.current.fog
      scene.background = air.current.background
      air.current = null
    }
    if (light.current) light.current.intensity = submerged ? 0.55 : 0.06
    const player = playerRef?.current?.position
    for (let i = 0; i < 40; i++) {
      const phase =
        (clock.value * (0.17 + marineRandom(i) * 0.13) + i * 0.137) % 1
      const active = player && player.y < -0.5
      dummy.position.set(
        (player?.x || 0) + Math.sin(i * 4.3 + phase * 2) * 0.1,
        (player?.y || 0) + 0.45 + phase * 2.5,
        (player?.z || 0) + Math.cos(i * 3.7) * 0.12,
      )
      dummy.scale.setScalar(
        active
          ? (0.007 + marineRandom(i + 20) ** 3 * 0.025) * (1 + phase * 0.3)
          : 0,
      )
      dummy.updateMatrix()
      bubbles.current.setMatrixAt(i, dummy.matrix)
    }
    bubbles.current.instanceMatrix.needsUpdate = true
  })
  useEffect(
    () => () => {
      if (air.current) {
        air.current.scene.fog = air.current.fog
        air.current.scene.background = air.current.background
      }
    },
    [],
  )
  return (
    <group>
      <hemisphereLight ref={light} args={['#bbdedb', '#173643', 0.06]} />
      <instancedMesh
        ref={bubbles}
        args={[undefined, undefined, 40]}
        frustumCulled={false}
        raycast={() => null}
      >
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial
          color="#d8eced"
          transparent
          opacity={0.18}
          roughness={0.1}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  )
}

export default function FrontierMarineWorld({
  worldRadius,
  paused = false,
  playerRef,
}) {
  const clock = useMemo(() => ({ value: 0 }), [])
  const habitats = useMemo(
    () =>
      Array.from({ length: MARINE_HABITAT_COUNT }, (_, i) =>
        getMarineHabitat(i, worldRadius),
      ),
    [worldRadius],
  )
  const seabed = useMemo(() => createSeabedGeometry(worldRadius), [worldRadius])
  const sand = useMemo(() => createSeabedMaterial(clock), [clock])
  const turtleAssets = useMemo(
    () => ({
      body: createTurtleGeometry(),
      flipper: createFlipperGeometry(),
      material: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.8,
        side: THREE.DoubleSide,
      }),
    }),
    [],
  )
  useFrame((_, delta) => {
    // Mutable GPU uniform, not React render state.
    // eslint-disable-next-line react-hooks/immutability
    if (!paused) clock.value += Math.min(delta, 0.05)
  }, -1)
  useEffect(() => () => seabed.dispose(), [seabed])
  useEffect(() => () => sand.dispose(), [sand])
  useEffect(
    () => () => {
      turtleAssets.body.dispose()
      turtleAssets.flipper.dispose()
      turtleAssets.material.dispose()
    },
    [turtleAssets],
  )
  return (
    <group>
      <WaterAtmosphere
        worldRadius={worldRadius}
        playerRef={playerRef}
        clock={clock}
      />
      <mesh geometry={seabed} material={sand} receiveShadow />
      <ReefFields habitats={habitats} worldRadius={worldRadius} clock={clock} />
      <FishSchools
        habitats={habitats}
        worldRadius={worldRadius}
        playerRef={playerRef}
        clock={clock}
        paused={paused}
      />
      {habitats
        .filter((_, i) => i % 6 === 0)
        .map((h, i) => (
          <SeaTurtle
            key={i}
            habitat={h}
            worldRadius={worldRadius}
            clock={clock}
            assets={turtleAssets}
          />
        ))}
      {habitats
        .filter((_, i) => i % 8 === 1)
        .map((h, i) => (
          <Jellyfish key={i} habitat={h} clock={clock} />
        ))}
    </group>
  )
}
