import { useRef, useMemo, Suspense, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, useTexture, Float, Html } from '@react-three/drei'
import * as THREE from 'three'
import ModularShip from './ModularShip'
import { getActiveShipFamily, normalizeShipLoadout } from '../../utils/shipCatalog'

const IMAGE_PLANET_TYPES = new Set([
  'middle_math_core',
  'middle_math_analytics',
  'middle_math_geometry',
  'middle_math_exam',
  'python_foundation',
  'python_advanced',
  'python_data',
  'python_project'
])

function getTexturePathForPlanetType(planetType) {
  if (planetType === 'forest') return '/assets/planets/forest.png'
  if (planetType === 'ice') return '/assets/planets/ice.png'
  if (planetType === 'lava') return '/assets/planets/lava.png'
  if (planetType === 'ocean') return '/assets/planets/ocean.png'
  if (planetType === 'castle') return '/assets/planets/castle.png'
  if (planetType === 'cloud') return '/assets/planets/cloud.png'
  if (planetType === 'middle_math_core') return '/assets/planets/middle-math-core.png'
  if (planetType === 'middle_math_analytics') return '/assets/planets/middle-math-analytics.png'
  if (planetType === 'middle_math_geometry') return '/assets/planets/middle-math-geometry.png'
  if (planetType === 'middle_math_exam') return '/assets/planets/middle-math-exam.png'
  if (planetType === 'python_foundation') return '/assets/planets/python-foundation.png'
  if (planetType === 'python_advanced') return '/assets/planets/python-advanced.png'
  if (planetType === 'python_data') return '/assets/planets/python-data.png'
  if (planetType === 'python_project') return '/assets/planets/python-project.png'
  return null
}

/**
 * 텍스처를 사용하는 행성 재질 (Suspense 적용)
 */
function TexturePlanetMaterial({ texturePath, planetTexture, color, isLocked, planetType }) {
  const activeTexture = useTexture(texturePath)
  
  return (
    <meshStandardMaterial
      map={activeTexture}
      roughness={isLocked ? 0.9 : 0.6}
      metalness={isLocked ? 0.8 : (planetType === 'crystal' ? 0.6 : 0.1)}
      emissive={isLocked ? '#000000' : (planetType === 'lava' ? '#ff4500' : 
                planetType === 'forest' ? '#1b5e20' : 
                planetType === 'castle' ? '#fbc02d' : '#000000')}
      emissiveIntensity={isLocked ? 0 : (planetType === 'lava' ? 0.3 : 0.2)}
      color="#ffffff"
    />
  )
}

/**
 * 절차적 텍스처(Canvas)를 사용하는 행성 재질
 */
function ProceduralPlanetMaterial({ planetTexture, color, isLocked, planetType }) {
  return (
    <meshStandardMaterial
      map={planetTexture} // CanvasTexture
      roughness={isLocked ? 0.9 : 0.8}
      metalness={isLocked ? 0.8 : (planetType === 'crystal' ? 0.6 : 0.1)}
      emissive={isLocked ? '#000000' : (planetType === 'lava' ? '#ff4500' : '#000000')}
      emissiveIntensity={isLocked ? 0 : (planetType === 'lava' ? 0.3 : 0)}
      color={isLocked ? '#555555' : color}
    />
  )
}

/**
 * 완성형 이미지 행성을 3D 장면 안에 그대로 보이게 하는 스프라이트 렌더러
 */
function ImageSpritePlanet({ texturePath, size, isLocked }) {
  const activeTexture = useTexture(texturePath)

  const spriteTexture = useMemo(() => {
    const image = activeTexture?.image
    if (!image || typeof document === 'undefined') return activeTexture

    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height

    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const { data, width, height } = imageData
    const cx = width / 2
    const cy = height / 2
    const baseRadius = Math.min(width, height) * 0.39
    const featherRadius = Math.min(width, height) * 0.10

    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % width
      const y = Math.floor(i / 4 / width)
      const dx = x - cx
      const dy = y - cy
      const distance = Math.sqrt((dx * dx) + (dy * dy))
      const radialAlpha = THREE.MathUtils.clamp(
        1 - ((distance - baseRadius) / featherRadius),
        0,
        1
      )

      const brightness = Math.max(data[i], data[i + 1], data[i + 2]) / 255
      const glowAlpha = THREE.MathUtils.clamp((brightness - 0.06) / 0.22, 0, 1)
      data[i + 3] = Math.round(Math.max(radialAlpha, glowAlpha) * 255)
    }

    ctx.putImageData(imageData, 0, 0)

    const processedTexture = new THREE.CanvasTexture(canvas)
    processedTexture.colorSpace = THREE.SRGBColorSpace
    processedTexture.needsUpdate = true
    return processedTexture
  }, [activeTexture])

  return (
    <sprite scale={[size * 2.55, size * 2.55, 1]}>
      <spriteMaterial
        map={spriteTexture}
        transparent
        opacity={isLocked ? 0.42 : 1}
        color={isLocked ? '#8893a8' : '#ffffff'}
        depthWrite={false}
      />
    </sprite>
  )
}

/**
 * 재질 선택기 (Suspense Wrapper)
 */
function PlanetMaterialKey({ planetType, planetTexture, color, isLocked }) {
  const texturePath = useMemo(() => getTexturePathForPlanetType(planetType), [planetType])

  if (texturePath) {
    return (
      <TexturePlanetMaterial 
        texturePath={texturePath} 
        planetTexture={planetTexture} 
        color={color} 
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
        
        return (
          <Html
            key={i}
            position={[x, (Math.random() - 0.5) * size, z]}
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
  const groupRef = useRef()
  const [hovered, setHovered] = useState(false)

  const adjustedColor = useMemo(() => {
    if (status === 'not_started') return color // Don't dim too much
    return color
  }, [color, status])

  // 행성 텍스처 (타입별 색상 조합) - 즉시 생성되는 절차적 텍스처 (로딩 중 폴백용)
  const planetTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    
    let baseColor = adjustedColor
    let secondaryColor = new THREE.Color(adjustedColor).offsetHSL(0, 0, 0.1).getStyle()
    
    if (planetType === 'forest') {
      baseColor = '#4ade80' // Brighter Green
      secondaryColor = '#166534'
    } else if (planetType === 'lava') {
      baseColor = '#ff4500'
      secondaryColor = '#1a1a1a'
    } else if (planetType === 'ice') {
      baseColor = '#ffffff'
      secondaryColor = '#81d4fa'
    } else if (planetType === 'crystal') {
      baseColor = '#9c27b0'
      secondaryColor = '#e1f5fe'
    } else if (planetType === 'ocean') {
      baseColor = '#0077be'
      secondaryColor = '#00d4ff'
    } else if (planetType === 'castle') {
      baseColor = '#ffd700'
      secondaryColor = '#8b4513'
    } else if (planetType === 'cloud') {
      baseColor = '#a7ffeb'
      secondaryColor = '#e0f2f1'
    } else if (planetType === 'middle_math_core') {
      baseColor = '#4aa8ff'
      secondaryColor = '#123b7a'
    } else if (planetType === 'middle_math_analytics') {
      baseColor = '#7c4dff'
      secondaryColor = '#09183b'
    } else if (planetType === 'middle_math_geometry') {
      baseColor = '#8d63ff'
      secondaryColor = '#16102f'
    } else if (planetType === 'middle_math_exam') {
      baseColor = '#b05cff'
      secondaryColor = '#240021'
    } else if (planetType === 'python_foundation') {
      baseColor = '#2f8fff'
      secondaryColor = '#08132d'
    } else if (planetType === 'python_advanced') {
      baseColor = '#2cc7ff'
      secondaryColor = '#071a2f'
    } else if (planetType === 'python_data') {
      baseColor = '#6a7dff'
      secondaryColor = '#140c35'
    } else if (planetType === 'python_project') {
      baseColor = '#a043ff'
      secondaryColor = '#1a0028'
    } else if (planetType === 'dark_matter') {
      baseColor = '#1a0033'
      secondaryColor = '#6b21a8'
    }

    const gradient = ctx.createLinearGradient(0, 0, 512, 256)
    gradient.addColorStop(0, baseColor)
    gradient.addColorStop(0.5, secondaryColor)
    gradient.addColorStop(1, baseColor)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 256)
    
    for (let i = 0; i < 60; i++) {
      ctx.beginPath()
      ctx.arc(
        Math.random() * 512,
        Math.random() * 256,
        Math.random() * 40 + 5,
        0,
        Math.PI * 2
      )
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.1})`
      ctx.fill()
    }
    
    return new THREE.CanvasTexture(canvas)
  }, [adjustedColor, planetType])

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += speed
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += speed * 0.8
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

  const texturePath = useMemo(() => getTexturePathForPlanetType(planetType), [planetType])
  const usesImageSprite = texturePath && IMAGE_PLANET_TYPES.has(planetType)

  return (
    <group 
      ref={groupRef} 
      {...props}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      scale={hovered ? 1.1 : 1} // Hover Scale Effect
    >
      {/* Golden Aura for Completed Planets */}
      {status === 'completed' && (
        <mesh scale={[1.4, 1.4, 1.4]}>
          <sphereGeometry args={[size, 32, 32]} />
          <meshBasicMaterial 
            color="#ffd700" 
            transparent 
            opacity={0.15} 
            side={THREE.BackSide} 
          />
        </mesh>
      )}
      
      {/* Floating Sparkles for Completed Planets */}
      {status === 'completed' && <ExplorationSuccessParticles size={size} />}

      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
        {usesImageSprite ? (
          <Suspense fallback={null}>
            <ImageSpritePlanet
              texturePath={texturePath}
              size={size}
              isLocked={isLocked}
            />
          </Suspense>
        ) : (
          <Sphere args={[size, 64, 64]}>
            <Suspense fallback={
              <meshStandardMaterial map={planetTexture} roughness={0.8} />
            }>
              <PlanetMaterialKey
                planetType={planetType} 
                planetTexture={planetTexture} 
                color={adjustedColor} 
                isLocked={isLocked} // Removed '|| status === "not_started"'
              />
            </Suspense>
          </Sphere>
        )}
      </Float>
      

      
      {!usesImageSprite && (
        <Sphere args={[size * 1.05, 32, 32]}>
          <meshBasicMaterial
            color={isLocked ? '#000000' : (planetType === 'lava' ? '#ff4500' : 
                   planetType === 'forest' ? '#4ade80' : 
                   planetType === 'castle' ? '#fbbf24' : 
                   planetType === 'ice' ? '#00d4ff' :
                   planetType === 'middle_math_core' ? '#68d9ff' :
                   planetType === 'middle_math_analytics' ? '#a56bff' :
                   planetType === 'middle_math_geometry' ? '#b98dff' :
                   planetType === 'middle_math_exam' ? '#ffb357' : color)}
            transparent
            opacity={isLocked ? 0.5 : 0.25} // Increased opacity for better aura
            side={THREE.BackSide}
          />
        </Sphere>
      )}
      
      {(!isLocked && !usesImageSprite && (planetType === 'default' || planetType === 'cloud')) && (
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
      const r = size * (1.2 + Math.random() * 0.5)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
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
