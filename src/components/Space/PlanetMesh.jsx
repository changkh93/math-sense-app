import { useRef, useMemo, useEffect, useLayoutEffect, Suspense, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, useTexture, Float, Html } from '@react-three/drei'
import * as THREE from 'three'
import ModularShip from './ModularShip'
import { getActiveShipFamily, normalizeShipLoadout } from '../../utils/shipCatalog'
import { createProceduralPlanetTexture, getProceduralPlanetStyle } from './planetProceduralSurface'
import { getPlanetSignatureProfile } from './planetCourseStyles'

function getTexturePathForPlanetType(planetType) {
  if (planetType === 'forest') return '/assets/planets/forest.png'
  if (planetType === 'ice') return '/assets/planets/ice.png'
  if (planetType === 'lava') return '/assets/planets/lava.png'
  if (planetType === 'ocean') return '/assets/planets/ocean.png'
  if (planetType === 'castle') return '/assets/planets/castle.png'
  if (planetType === 'cloud') return '/assets/planets/cloud.png'
  if (planetType === 'dark_matter') return '/assets/planets/dark-matter.webp'
  if (planetType === 'stellar_archive') return '/assets/planets/stellar-archive.webp'
  if (planetType === 'dark_matter_refinery') return '/assets/planets/dark-matter-refinery.webp'
  return null
}

/**
 * 텍스처를 사용하는 행성 재질 (Suspense 적용)
 */
function TexturePlanetMaterial({ texturePath, isLocked, planetType }) {
  const loadedTexture = useTexture(texturePath)
  const activeTexture = useMemo(() => {
    const preparedTexture = loadedTexture.clone()
    preparedTexture.colorSpace = THREE.SRGBColorSpace
    preparedTexture.wrapS = THREE.RepeatWrapping
    preparedTexture.wrapT = THREE.ClampToEdgeWrapping
    preparedTexture.anisotropy = 4
    preparedTexture.needsUpdate = true
    return preparedTexture
  }, [loadedTexture])

  useEffect(() => () => activeTexture.dispose(), [activeTexture])

  const emissiveColor = isLocked ? '#000000' : (
    planetType === 'lava' ? '#ff4500' :
    planetType === 'forest' ? '#1b5e20' :
    planetType === 'castle' ? '#fbc02d' :
    planetType === 'dark_matter' ? '#32106b' :
    planetType === 'stellar_archive' ? '#9a5200' :
    planetType === 'dark_matter_refinery' ? '#8a4300' :
    '#000000'
  )
  const emissiveIntensity = isLocked ? 0 : (
    planetType === 'dark_matter' ? 0.34 :
    planetType === 'stellar_archive' ? 0.24 :
    planetType === 'dark_matter_refinery' ? 0.28 :
    planetType === 'lava' ? 0.3 :
    0.2
  )
  const isMetallicWorld = planetType === 'stellar_archive' || planetType === 'dark_matter_refinery'
  
  return (
    <meshStandardMaterial
      map={activeTexture}
      roughness={isLocked ? 0.9 : (isMetallicWorld ? 0.48 : 0.6)}
      metalness={isLocked ? 0.8 : (isMetallicWorld ? 0.32 : (planetType === 'crystal' ? 0.6 : 0.1))}
      emissive={emissiveColor}
      emissiveIntensity={emissiveIntensity}
      color="#ffffff"
    />
  )
}

/**
 * 절차적 텍스처(Canvas)를 사용하는 행성 재질
 */
function ProceduralPlanetMaterial({ planetTexture, color, isLocked, planetType }) {
  const style = getProceduralPlanetStyle(planetType, color)
  return (
    <meshStandardMaterial
      map={planetTexture}
      roughness={isLocked ? 0.9 : 0.76}
      metalness={isLocked ? 0.5 : (style.metalness || 0.05)}
      emissive={isLocked ? '#000000' : (style.emissive || '#000000')}
      emissiveIntensity={isLocked ? 0 : (style.emissiveIntensity || 0)}
      color={isLocked ? '#555555' : '#ffffff'}
    />
  )
}

/**
 * 재질 선택기 (Suspense Wrapper)
 */
function PlanetMaterialKey({ planetType, planetTexture, texturePath, color, isLocked }) {
  if (texturePath) {
    return (
      <TexturePlanetMaterial 
        texturePath={texturePath} 
        isLocked={isLocked}
        planetType={planetType}
      />
    )
  }

  return (
    <ProceduralPlanetMaterial 
      planetTexture={planetTexture} 
      color={color} 
      isLocked={isLocked}
      planetType={planetType}
    />
  )
}

/**
 * 행성 주위의 홀로그램 고리 (Hover 시 표시)
 */
function HologramRing({ size, color }) {
  const ringRef = useRef()
  
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.01
      ringRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.1
    }
  })

  return (
    <group ref={ringRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size * 1.4, size * 1.5, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size * 1.6, size * 1.62, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function OrbitNodes({ size, radius, count, color, shape = 'sphere', offset = 0 }) {
  const meshRef = useRef()

  useLayoutEffect(() => {
    if (!meshRef.current) return
    const dummy = new THREE.Object3D()
    for (let index = 0; index < count; index += 1) {
      const angle = offset + (index / count) * Math.PI * 2
      dummy.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
      dummy.rotation.set(angle * 0.35, angle, -angle * 0.2)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(index, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [count, offset, radius])

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      {shape === 'cube' ? (
        <boxGeometry args={[size * 0.11, size * 0.11, size * 0.11]} />
      ) : shape === 'diamond' ? (
        <octahedronGeometry args={[size * 0.085, 0]} />
      ) : (
        <sphereGeometry args={[size * 0.065, 8, 6]} />
      )}
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  )
}

function SignatureOrbit({
  size,
  color,
  radius = 1.38,
  tilt = [Math.PI / 2, 0, 0],
  nodes = 0,
  nodeShape = 'sphere',
  opacity = 0.72,
  offset = 0,
}) {
  const orbitRadius = size * radius
  return (
    <group rotation={tilt}>
      <mesh>
        <torusGeometry args={[orbitRadius, size * 0.015, 6, 48]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} depthWrite={false} />
      </mesh>
      {nodes > 0 && (
        <OrbitNodes
          size={size}
          radius={orbitRadius}
          count={nodes}
          color={color}
          shape={nodeShape}
          offset={offset}
        />
      )}
    </group>
  )
}

function SignatureShell({ size, color, shape = 'icosahedron', scale = 1.17 }) {
  return (
    <mesh scale={scale}>
      {shape === 'octahedron' ? (
        <octahedronGeometry args={[size, 1]} />
      ) : (
        <icosahedronGeometry args={[size, 1]} />
      )}
      <meshBasicMaterial
        color={color}
        wireframe
        transparent
        opacity={0.34}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  )
}

function PlanetSignature({ size, profile }) {
  const groupRef = useRef()

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.16
  })

  if (!profile) return null
  const { ornament, primary, secondary } = profile

  return (
    <group ref={groupRef}>
      {ornament === 'calendar_crown' && (
        <>
          <SignatureOrbit size={size} color={primary} radius={1.36} nodes={12} nodeShape="diamond" tilt={[1.18, 0.18, 0.2]} />
          <SignatureOrbit size={size} color={secondary} radius={1.52} nodes={4} tilt={[0.52, 0.28, -0.48]} opacity={0.5} offset={0.38} />
        </>
      )}
      {ornament === 'axiom_meridians' && (
        <>
          <SignatureOrbit size={size} color={primary} radius={1.12} tilt={[0, 0, 0]} opacity={0.42} />
          <SignatureOrbit size={size} color={secondary} radius={1.14} tilt={[0, Math.PI / 3, 0]} opacity={0.4} />
          <SignatureOrbit size={size} color={primary} radius={1.16} tilt={[Math.PI / 2, 0, 0]} nodes={3} opacity={0.5} />
        </>
      )}
      {ornament === 'abacus_orbit' && (
        <>
          <SignatureOrbit size={size} color={primary} radius={1.38} nodes={10} nodeShape="sphere" tilt={[1.32, 0.1, -0.3]} />
          <SignatureOrbit size={size} color={secondary} radius={1.23} nodes={5} nodeShape="diamond" tilt={[0.34, 0.74, 0.22]} opacity={0.55} offset={0.3} />
        </>
      )}
      {ornament === 'data_orbits' && (
        <>
          <SignatureOrbit size={size} color={primary} radius={1.32} nodes={7} nodeShape="cube" tilt={[1.05, 0.3, 0.5]} />
          <SignatureOrbit size={size} color={secondary} radius={1.48} nodes={4} tilt={[0.25, 0.8, -0.5]} opacity={0.58} offset={0.55} />
        </>
      )}
      {ornament === 'polyhedron_shell' && (
        <>
          <SignatureShell size={size} color={primary} />
          <SignatureOrbit size={size} color={secondary} radius={1.42} nodes={3} nodeShape="diamond" tilt={[0.92, 0.38, -0.2]} opacity={0.62} />
        </>
      )}
      {ornament === 'trial_moons' && (
        <>
          <SignatureOrbit size={size} color={primary} radius={1.48} nodes={4} nodeShape="sphere" tilt={[1.18, 0.14, -0.32]} />
          <SignatureOrbit size={size} color={secondary} radius={1.27} nodes={3} nodeShape="diamond" tilt={[0.36, 0.62, 0.42]} opacity={0.5} />
        </>
      )}
      {ornament === 'shield_satellites' && (
        <>
          <SignatureShell size={size} color={primary} shape="octahedron" scale={1.13} />
          <SignatureOrbit size={size} color={secondary} radius={1.5} nodes={6} nodeShape="diamond" tilt={[1.22, 0.2, 0.24]} />
        </>
      )}
      {ornament === 'binary_orbit' && (
        <>
          <SignatureOrbit size={size} color={primary} radius={1.35} nodes={8} nodeShape="cube" tilt={[1.24, 0.08, -0.25]} />
          <SignatureOrbit size={size} color={secondary} radius={1.18} nodes={2} nodeShape="sphere" tilt={[0.28, 0.75, 0.45]} opacity={0.56} offset={0.8} />
        </>
      )}
      {ornament === 'quantum_cage' && (
        <>
          <SignatureShell size={size} color={primary} shape="octahedron" scale={1.12} />
          <SignatureOrbit size={size} color={secondary} radius={1.34} nodes={3} tilt={[0.4, 0.8, 0.25]} />
          <SignatureOrbit size={size} color={primary} radius={1.4} tilt={[1.18, 0.15, -0.48]} opacity={0.48} />
        </>
      )}
      {ornament === 'data_network' && (
        <>
          <SignatureOrbit size={size} color={primary} radius={1.32} nodes={6} nodeShape="sphere" tilt={[0.38, 0.72, -0.18]} />
          <SignatureOrbit size={size} color={secondary} radius={1.46} nodes={5} nodeShape="cube" tilt={[1.18, 0.2, 0.52]} opacity={0.58} offset={0.42} />
        </>
      )}
      {ornament === 'arcade_satellites' && (
        <>
          <SignatureShell size={size} color={secondary} shape="octahedron" scale={1.1} />
          <SignatureOrbit size={size} color={primary} radius={1.48} nodes={5} nodeShape="cube" tilt={[1.08, 0.32, -0.34]} />
        </>
      )}
      {ornament === 'prime_knot' && (
        <>
          <mesh rotation={[0.62, 0.25, 0.2]}>
            <torusKnotGeometry args={[size * 1.28, size * 0.022, 72, 6, 2, 3]} />
            <meshBasicMaterial color={primary} transparent opacity={0.72} toneMapped={false} depthWrite={false} />
          </mesh>
          <SignatureOrbit size={size} color={secondary} radius={1.48} nodes={5} nodeShape="diamond" tilt={[1.25, 0.12, -0.3]} opacity={0.55} />
        </>
      )}
    </group>
  )
}

/**
 * 떠다니는 수학 기호 (Hover 시 표시)
 */
function FloatingFormulas({ size, color }) {
  const groupRef = useRef()
  const symbols = ['∑', '∫', 'π', '√', '÷', '∞', '∂', '∆']
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y -= 0.005
      groupRef.current.children.forEach((child, i) => {
        child.position.y += Math.sin(state.clock.elapsedTime * 2 + i) * 0.002
      })
    }
  })

  return (
    <group ref={groupRef}>
      {symbols.map((sym, i) => {
        const angle = (i / symbols.length) * Math.PI * 2
        const radius = size * 2.2
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        
        const verticalOffset = ((((i * 37) % 11) / 10) - 0.5) * size

        return (
          <Html
            key={i}
            position={[x, verticalOffset, z]}
            center
            style={{
              color: color,
              fontSize: '1rem',
              fontWeight: 'bold',
              textShadow: '0 0 3px #000, 0 0 6px #000',
              pointerEvents: 'none',
              fontFamily: 'serif'
            }}
          >
            {sym}
          </Html>
        )
      })}
    </group>
  )
}

/**
 * 궤도를 도는 우주선
 */
export function OrbitingSpaceship({ 
  orbitRadius = 3.5, 
  baseSpeed = 0.5, 
  equipment = {}, 
  shipData = {},
  shipCustomization = {},
  isBoosting = false 
}) {
  const shipRef = useRef()
  const angleRef = useRef(0)
  const [isOccluded, setIsOccluded] = useState(false)

  const effectiveSpeed = useMemo(() => {
    let s = baseSpeed
    if (equipment.engine) s *= 1.5
    if (isBoosting) s *= 4
    return s
  }, [baseSpeed, equipment.engine, isBoosting])

  useFrame((_, delta) => {
    angleRef.current += delta * effectiveSpeed
    if (shipRef.current) {
      shipRef.current.position.x = Math.cos(angleRef.current) * orbitRadius
      shipRef.current.position.z = Math.sin(angleRef.current) * orbitRadius
      shipRef.current.position.y = Math.sin(angleRef.current * 2) * 0.3
    }
  })

  const resolvedShipData = useMemo(() => Object.keys(shipData || {}).length ? shipData : { shipCustomization }, [shipData, shipCustomization])
  const mapFamily = useMemo(() => getActiveShipFamily(resolvedShipData), [resolvedShipData])
  const mapLoadout = useMemo(() => normalizeShipLoadout(resolvedShipData, mapFamily), [resolvedShipData, mapFamily])
  const mapShipSize = mapFamily === 'pathfinder' ? (isBoosting ? 120 : 104) : (isBoosting ? 96 : 82)

  return (
    <group ref={shipRef}>
      <Html
        center
        occlude
        onOcclude={setIsOccluded}
        zIndexRange={[80, 1]}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          className={`orbiting-modular-ship ${isBoosting ? 'is-boosting' : ''} ${isOccluded ? 'is-occluded' : ''}`}
          style={{ width: mapShipSize, height: mapShipSize }}
        >
          <ModularShip
            loadout={mapLoadout}
            family={mapFamily}
            size={mapShipSize}
            title="현재 행성을 탐사 중인 나의 탐사선"
            animate={false}
          />
        </div>
      </Html>
    </group>
  )
}

/**
 * 3D Planet Mesh Component (No Canvas)
 */
export default function PlanetMesh({ 
  color = '#4a90e2', 
  size = 1, 
  speed = 0.002, 
  planetType = 'default',
  showSpaceship = false, 
  showFormulas = true,
  status = 'not_started',
  equipment = {}, 
  shipData = {},
  shipCustomization = {},
  isBoosting = false,
  isLocked = false,
  ...props 
}) {
  const meshRef = useRef()
  const cloudsRef = useRef()
  const [hovered, setHovered] = useState(false)
  const signatureProfile = useMemo(() => getPlanetSignatureProfile(planetType), [planetType])

  const adjustedColor = useMemo(() => {
    if (status === 'not_started') return color // Don't dim too much
    return color
  }, [color, status])
  const texturePath = useMemo(() => getTexturePathForPlanetType(planetType), [planetType])

  // Deterministic equirectangular data is generated once. This avoids the old
  // square-image sprite processing and gives every rotating world a full back side.
  const planetTexture = useMemo(
    () => texturePath ? null : createProceduralPlanetTexture(planetType, adjustedColor),
    [adjustedColor, planetType, texturePath],
  )

  useEffect(() => () => planetTexture?.dispose(), [planetTexture])

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += speed * 60 * Math.min(delta, 0.05)
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += speed * 48 * Math.min(delta, 0.05)
    }
  })

  // Handle Pointer Events
  const handlePointerOver = (e) => {
    setHovered(true)
    if (props.onPointerOver) props.onPointerOver(e)
  }
  
  const handlePointerOut = (e) => {
    setHovered(false)
    if (props.onPointerOut) props.onPointerOut(e)
  }

  return (
    <group 
      {...props}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      scale={hovered ? 1.1 : 1} // Hover Scale Effect
    >
      {/* Golden Aura for Completed Planets */}
      {status === 'completed' && (
        <mesh scale={[1.22, 1.22, 1.22]}>
          <sphereGeometry args={[size, 24, 16]} />
          <meshBasicMaterial 
            color="#ffd700" 
            transparent 
            opacity={0.08}
            side={THREE.BackSide} 
          />
        </mesh>
      )}
      
      {/* Floating Sparkles for Completed Planets */}
      {status === 'completed' && <ExplorationSuccessParticles size={size} />}

      <Sphere ref={meshRef} args={[size, 48, 32]}>
        <Suspense fallback={<meshStandardMaterial color={adjustedColor} roughness={0.8} />}>
          <PlanetMaterialKey
            planetType={planetType}
            planetTexture={planetTexture}
            texturePath={texturePath}
            color={adjustedColor}
            isLocked={isLocked}
          />
        </Suspense>
      </Sphere>

      {!isLocked && signatureProfile && <PlanetSignature size={size} profile={signatureProfile} />}

      <Sphere args={[size * 1.045, 32, 20]}>
        <meshBasicMaterial
          color={isLocked ? '#000000' : (planetType === 'lava' ? '#ff4500' :
                 planetType === 'forest' ? '#4ade80' :
                 planetType === 'castle' ? '#fbbf24' :
                 planetType === 'ice' ? '#00d4ff' :
                 planetType === 'middle_math_core' ? '#68d9ff' :
                 planetType === 'middle_math_analytics' ? '#a56bff' :
                 planetType === 'middle_math_geometry' ? '#b98dff' :
                 planetType === 'middle_math_exam' ? '#ffb357' :
                                 signatureProfile?.atmosphere || color)}
          transparent
          opacity={isLocked ? 0.3 : 0.15}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </Sphere>
      
      {(!isLocked && (planetType === 'default' || planetType === 'cloud')) && (
        <Sphere ref={cloudsRef} args={[size * 1.02, 32, 32]}>
          <meshBasicMaterial
            color="white"
            transparent
            opacity={0.1}
            alphaMap={planetTexture}
          />
        </Sphere>
      )}

      {showSpaceship && (
        <OrbitingSpaceship 
          orbitRadius={size * 1.8} 
          equipment={equipment} 
          shipData={shipData}
          shipCustomization={shipCustomization}
          isBoosting={isBoosting} 
        />
      )}

      {/* Hover Effects */}
      {hovered && !isLocked && (
        <>
          <HologramRing size={size} color={color} />
          {showFormulas && <FloatingFormulas size={size} color={color} />}
        </>
      )}
      
      {isLocked && (
        // Lock Symbol (Simple Crossed Ring)
        <mesh rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[size * 1.2, 0.05, 16, 100]} />
          <meshBasicMaterial color="#555555" />
        </mesh>
      )}
    </group>
  )
}

/**
 * ExplorationSuccessParticles - 완료된 행성을 위한 파티클 효과
 */
function ExplorationSuccessParticles({ size }) {
  const count = 20
  const positions = useMemo(() => {
    const pos = []
    for (let i = 0; i < count; i++) {
      const fraction = (i * 0.61803398875) % 1
      const r = size * (1.2 + fraction * 0.5)
      const theta = i * 2.39996322973
      const phi = Math.acos(1 - (2 * (i + 0.5) / count))
      pos.push([
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      ])
    }
    return pos
  }, [size])

  return (
    <group>
      {positions.map((p, i) => (
        <Float key={i} speed={2} rotationIntensity={1} floatIntensity={1} position={p}>
          <mesh>
            <sphereGeometry args={[0.015, 8, 8]} />
            <meshBasicMaterial color="#ffd700" transparent opacity={0.8} />
          </mesh>
        </Float>
      ))}
    </group>
  )
}
