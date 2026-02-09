import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Stars, CameraControls, Environment, Float, Text } from '@react-three/drei'
import * as THREE from 'three'
import PlanetMesh from './PlanetMesh'

/**
 * 워프 효과를 위한 고속 별 이동
 */
function WarpStars({ active }) {
  return (
    <Stars 
      radius={100} 
      depth={50} 
      count={5000} 
      factor={4} 
      saturation={0} 
      fade 
      speed={active ? 20 : 1} 
    />
  )
}

/**
 * 3D Space Scene with Spiral Layout
 */
function SceneContent({ 
  regions, 
  onSelectRegion, 
  selectedRegionId,
  recentRegionId,
  explorationStatus = {},
  equipment = {},
  isBoosting = false 
}) {
  const controlsRef = useRef()
  const { camera } = useThree()
  const [warpActive, setWarpActive] = useState(false)
  
  // Spiral Layout Configuration
  const spiralConfig = {
    radiusStep: 4,   
    angleStep: 1.2,  
    yStep: -1.8,     // Increased vertical spacing slightly
    initialRadius: 2,
    yOffset: -3      // Shift everything down
  }

  // Calculate positions
  const planetPositions = useMemo(() => {
    if (!regions) return []
    return regions.map((region, i) => {
      const angle = i * spiralConfig.angleStep
      const radius = spiralConfig.initialRadius + (i * 0.5) // 점차 넓어짐
      
      // Spiral Position (X, Z plane mainly, with Y for depth)
      const x = Math.cos(angle) * radius * 3
      const z = Math.sin(angle) * radius * 2 - (i * 2) 
      const y = i * spiralConfig.yStep + spiralConfig.yOffset

      // Planet Type Logic
      let planetType = 'default'
      let planetColor = '#4a90e2'
      
      if (region.title.includes('아디테라')) {
        planetType = 'forest'; planetColor = '#348c31'
      } else if (region.title.includes('디비디아')) {
        planetType = 'lava'; planetColor = '#eb4d4b'
      } else if (region.title.includes('프락토니스') || region.title.includes('분수')) {
        planetType = 'ice'; planetColor = '#81d4fa'
      } else if (region.title.includes('멀티플루비아')) {
        planetType = 'ocean'; planetColor = '#0077be'
      } else if (region.title.includes('데시멜라')) {
        planetType = 'cloud'; planetColor = '#6ab04c'
      } else if (region.title.includes('라티오카스')) {
        planetType = 'castle'; planetColor = '#f9ca24'
      } else {
        planetType = ['default', 'crystal', 'cloud'][i % 3]
        planetColor = ['#00d4ff', '#9c27b0', '#ffffff'][i % 3]
      }

      return {
        ...region,
        position: [x, y, z],
        planetType,
        planetColor,
        isLocked: false // Unlocking all planets as requested
      }
    })
  }, [regions])

  // Camera Animation & Warp Logic
  useEffect(() => {
    if (selectedRegionId && controlsRef.current) {
      const targetPlanet = planetPositions.find(p => p.id === selectedRegionId)
      if (targetPlanet) {
        // Warp Start
        setWarpActive(true)
        
        // Fly to planet
        const [x, y, z] = targetPlanet.position
        controlsRef.current.setLookAt(
          x, y + 2, z + 6, // Camera Position
          x, y, z,         // Target Position
          true             // Transition: true
        )
        
        // Warp End after transition
        setTimeout(() => setWarpActive(false), 1000)
      }
    } else if (controlsRef.current) {
      // Reset View (Overview) - Lower target to keep planets in bottom 2/3 of screen
      controlsRef.current.setLookAt(0, 8, 20, 0, -5, 0, true)
    }
  }, [selectedRegionId, planetPositions])

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#00d4ff" />
      
      <WarpStars active={warpActive || isBoosting} />
      
      <CameraControls 
        ref={controlsRef} 
        minDistance={2} 
        maxDistance={50} 
        smoothTime={0.8}
      />

      {planetPositions.map((planet, idx) => (
        <group key={planet.id} position={planet.position}>
          <Float 
            speed={2} 
            rotationIntensity={0.2} 
            floatIntensity={0.5}
            floatingRange={[-0.2, 0.2]}
          >
            <PlanetMesh 
               color={planet.planetColor} 
               size={1.2} 
               planetType={planet.planetType}
               showSpaceship={selectedRegionId === planet.id || (!selectedRegionId && recentRegionId === planet.id)} 
               status={explorationStatus[planet.id] || 'not_started'}
               equipment={equipment}
               isBoosting={isBoosting}
               isLocked={planet.isLocked}
               onClick={(e) => {
                 e.stopPropagation()
                 // 잠금된 행성은 선택 불가 (옵션)
                 // if (planet.isLocked) return; 
                 onSelectRegion(planet.id)
               }}
               onPointerOver={() => { document.body.style.cursor = 'pointer' }}
               onPointerOut={() => { document.body.style.cursor = 'auto' }}
             />
            
            {/* 3D Text Label */}
            <Text
              position={[0, 1.8, 0]}
              fontSize={0.4}
              color={planet.isLocked ? "#888888" : "white"}
              anchorX="center"
              anchorY="middle"
              // font="/fonts/Orbitron-Bold.ttf" // 폰트 로드 문제 발생 가능성 있으므로 기본값 사용 또는 생략
              outlineWidth={0.02}
              outlineColor="#000000"
            >
              {planet.title} {planet.isLocked ? "(LOCKED)" : ""}
            </Text>
          </Float>
          
          {/* Connection Line */}
          {idx < planetPositions.length - 1 && (
            <Line 
              start={[0, 0, 0]} 
              end={[
                planetPositions[idx+1].position[0] - planet.position[0],
                planetPositions[idx+1].position[1] - planet.position[1],
                planetPositions[idx+1].position[2] - planet.position[2]
              ]} 
            />
          )}
        </group>
      ))}
    </>
  )
}

function Line({ start, end }) {
  const ref = useRef()
  useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...start), 
      new THREE.Vector3(...end)
    ])
    return geometry
  }, [start, end])

  return (
    <line>
      <bufferGeometry attach="geometry" setFromPoints={[new THREE.Vector3(...start), new THREE.Vector3(...end)]} />
      <lineBasicMaterial attach="material" color="#00d4ff" transparent opacity={0.1} />
    </line>
  )
}

export default function SpaceScene(props) {
  return (
    <div style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0 }}>
      <Canvas
        camera={{ position: [0, 5, 15], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <SceneContent {...props} />
      </Canvas>
    </div>
  )
}
