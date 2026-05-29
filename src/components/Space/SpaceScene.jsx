import React, { useRef, useMemo, useState, useEffect, Suspense } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Stars, CameraControls, Environment, Float, Html } from '@react-three/drei'
import * as THREE from 'three'
import PlanetMesh from './PlanetMesh'

const MIDDLE_MATH_PLANET_STYLES = [
  { planetType: 'middle_math_core', planetColor: '#59c8ff' },
  { planetType: 'middle_math_analytics', planetColor: '#8f64ff' },
  { planetType: 'middle_math_geometry', planetColor: '#b08cff' },
  { planetType: 'middle_math_exam', planetColor: '#ffbf66' }
]

function getMiddleMathPlanetStyle(region, index) {
  const title = region?.title || ''

  if (title.includes('기본개념')) {
    return { planetType: 'middle_math_core', planetColor: '#59c8ff' }
  }
  if (title.includes('함수') || title.includes('확률') || title.includes('통계')) {
    return { planetType: 'middle_math_analytics', planetColor: '#9a73ff' }
  }
  if (title.includes('기하')) {
    return { planetType: 'middle_math_geometry', planetColor: '#bc8fff' }
  }
  if (title.includes('평가') || title.includes('모의')) {
    return { planetType: 'middle_math_exam', planetColor: '#ffbe72' }
  }

  return MIDDLE_MATH_PLANET_STYLES[index % MIDDLE_MATH_PLANET_STYLES.length]
}

const PYTHON_PLANET_STYLES = [
  { planetType: 'python_foundation', planetColor: '#63b3ff' },
  { planetType: 'python_advanced', planetColor: '#34d3ff' },
  { planetType: 'python_data', planetColor: '#7f8cff' },
  { planetType: 'python_project', planetColor: '#b159ff' }
]

function getPythonPlanetStyle(region, index) {
  const title = region?.title || ''

  if (title.includes('수학') || title.includes('기초') || title.includes('입문')) {
    return { planetType: 'python_foundation', planetColor: '#63b3ff' }
  }
  if (title.includes('심화') || title.includes('반복') || title.includes('함수') || title.includes('클래스') || title.includes('알고리즘')) {
    return { planetType: 'python_advanced', planetColor: '#34d3ff' }
  }
  if (title.includes('데이터') || title.includes('시각화') || title.includes('분석') || title.includes('pandas') || title.includes('matplotlib')) {
    return { planetType: 'python_data', planetColor: '#7f8cff' }
  }
  if (title.includes('게임') || title.includes('프로젝트') || title.includes('turtle') || title.includes('창작')) {
    return { planetType: 'python_project', planetColor: '#b159ff' }
  }

  return PYTHON_PLANET_STYLES[index % PYTHON_PLANET_STYLES.length]
}

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
 * Smooth FOV transition
 */
function CameraFOV({ isBoosting }) {
  const { camera } = useThree()
  useFrame((state, delta) => {
    const targetFov = isBoosting ? 70 : 45
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, delta * 5)
    camera.updateProjectionMatrix()
  })
  return null
}

/**
 * 3D Space Scene with Spiral Layout
 */
function SceneContent({ 
  regions, 
  onSelectRegion, 
  onSelectArchive,
  selectedRegionId,
  recentRegionId,
  explorationStatus = {},
  equipment = {},
  isBoosting = false,
  onSelectDarkMatter,
  onSelectDarkMatterRefinery,
  onSelectMistakeNotebook,
  darkMatterCount = 0
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
      
      if (region.clusterId === 'middle-math' || region.clusterId === '중등수학') {
        const middleMathStyle = getMiddleMathPlanetStyle(region, i)
        planetType = middleMathStyle.planetType
        planetColor = middleMathStyle.planetColor
      } else if (region.clusterId === 'python' || region.clusterId === '파이썬' || region.title?.includes('파이썬')) {
        const pythonStyle = getPythonPlanetStyle(region, i)
        planetType = pythonStyle.planetType
        planetColor = pythonStyle.planetColor
      } else if (region.title.includes('아디테라')) {
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
      
      <CameraFOV isBoosting={isBoosting} />
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
            
            {/* DOM HTML Label */}
            <Html
              position={[0, 1.8, 0]}
              center
              zIndexRange={[100, 0]}
              style={{
                color: planet.isLocked ? "#888888" : "white",
                fontSize: '1rem',
                fontWeight: 'bold',
                fontFamily: 'var(--font-title, sans-serif)',
                whiteSpace: 'nowrap',
                textShadow: '0px 2px 4px rgba(0,0,0,0.8), 0 0 10px #000',
                pointerEvents: 'none'
              }}
            >
              {planet.title} {planet.isLocked ? "(LOCKED)" : ""}
            </Html>
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

      {( !selectedRegionId ) && ( // Only show when looking at the cluster overview
        <group position={[0, 0.5, -2]}>
          <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1} floatingRange={[-0.5, 0.5]}>
            <PlanetMesh 
              color="#ffaa00" 
              size={0.8} 
              planetType="crystal" /* Special distinct look */
              showSpaceship={false}
              showFormulas={true}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectArchive) onSelectArchive();
              }}
              onPointerOver={() => { document.body.style.cursor = 'pointer' }}
              onPointerOut={() => { document.body.style.cursor = 'auto' }}
            />
            {/* Assignment Label */}
            <Html
              position={[0, 1.3, 0]}
              center
              zIndexRange={[100, 0]}
              style={{
                color: "#ffd700",
                fontSize: '1.1rem',
                fontWeight: '900',
                fontFamily: 'var(--font-title, sans-serif)',
                whiteSpace: 'nowrap',
                textShadow: '0 2px 6px rgba(0,0,0,0.9), 0 0 12px #000',
                pointerEvents: 'none',
                textAlign: 'center',
                lineHeight: '1.3'
              }}
            >
              과제 기록소<br/>
              <span style={{ fontSize: '0.75rem', color: '#ffffff', fontWeight: '500' }}>Stellar Archive</span>
            </Html>
          </Float>
        </group>
      )}

      {/* Mistake Notebook Planet */}
      {( !selectedRegionId ) && (
        <group position={[4.8, 0.3, -1.2]}>
          <Float speed={1.7} rotationIntensity={0.55} floatIntensity={1} floatingRange={[-0.25, 0.25]}>
            <PlanetMesh
              color="#14b8a6"
              size={0.65}
              planetType="cloud"
              showSpaceship={false}
              showFormulas={true}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectMistakeNotebook) onSelectMistakeNotebook();
              }}
              onPointerOver={() => { document.body.style.cursor = 'pointer' }}
              onPointerOut={() => { document.body.style.cursor = 'auto' }}
            />
            <Html
              position={[0, 1.25, 0]}
              center
              zIndexRange={[100, 0]}
              style={{
                color: "#5eead4",
                fontSize: '1.05rem',
                fontWeight: '900',
                fontFamily: 'var(--font-title, sans-serif)',
                whiteSpace: 'nowrap',
                textShadow: '0 2px 6px rgba(0,0,0,0.9), 0 0 12px #000',
                pointerEvents: 'none',
                textAlign: 'center',
                lineHeight: '1.3'
              }}
            >
              오답노트 행성<br/>
              <span style={{ fontSize: '0.72rem', color: '#ccfbf1', fontWeight: '500' }}>Memory Planet</span>
            </Html>
          </Float>
        </group>
      )}

      {/* Dark Matter Planet */}
      {( !selectedRegionId ) && (
        <group position={[-5, 0.5, -1]}>
          <Float speed={2.5} rotationIntensity={0.8} floatIntensity={1.2} floatingRange={[-0.3, 0.3]}>
            <PlanetMesh 
              color="#6b21a8" 
              size={0.7} 
              planetType="dark_matter"
              speed={0.005 + Math.min(0.02, (darkMatterCount || 0) * 0.001)}
              showSpaceship={false}
              showFormulas={false}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectDarkMatter) onSelectDarkMatter();
              }}
              onPointerOver={() => { document.body.style.cursor = 'pointer' }}
              onPointerOut={() => { document.body.style.cursor = 'auto' }}
            />
            {/* Dark Matter Label */}
            <Html
              position={[0, 1.3, 0]}
              center
              zIndexRange={[100, 0]}
              style={{
                color: "#c084fc",
                fontSize: '1.1rem',
                fontWeight: '900',
                fontFamily: 'var(--font-title, sans-serif)',
                whiteSpace: 'nowrap',
                textShadow: '0 2px 6px rgba(0,0,0,0.9), 0 0 12px #000',
                pointerEvents: 'none',
                textAlign: 'center',
                lineHeight: '1.3'
              }}
            >
              다크 매터<br/>
              <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: '500' }}>Dark Matter</span>
            </Html>
          </Float>
        </group>
      )}

      {/* Dark Matter Refinery Planet */}
      {( !selectedRegionId ) && (
        <group position={[-6.8, -1.0, -0.5]}>
          <Float speed={1.8} rotationIntensity={0.6} floatIntensity={0.9} floatingRange={[-0.25, 0.25]}>
            <PlanetMesh
              color="#f59e0b"
              size={0.45}
              planetType="crystal"
              speed={0.01 + Math.min(0.02, (darkMatterCount || 0) * 0.001)}
              showSpaceship={false}
              showFormulas={true}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectDarkMatterRefinery) onSelectDarkMatterRefinery();
                else if (onSelectDarkMatter) onSelectDarkMatter();
              }}
              onPointerOver={() => { document.body.style.cursor = 'pointer' }}
              onPointerOut={() => { document.body.style.cursor = 'auto' }}
            />
            <Html
              position={[0, 0.95, 0]}
              center
              zIndexRange={[100, 0]}
              style={{
                color: "#fbbf24",
                fontSize: '0.95rem',
                fontWeight: '900',
                fontFamily: 'var(--font-title, sans-serif)',
                whiteSpace: 'nowrap',
                textShadow: '0 2px 6px rgba(0,0,0,0.9), 0 0 12px #000',
                pointerEvents: 'none',
                textAlign: 'center',
                lineHeight: '1.25'
              }}
            >
              다크매터 정제소<br/>
              <span style={{ fontSize: '0.68rem', color: '#fde68a', fontWeight: '500' }}>Refinery</span>
            </Html>
          </Float>
        </group>
      )}
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

/**
 * WebGL Error Boundary — Canvas 크래시 시 fallback UI 제공
 */
class CanvasErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('[SpaceScene] Canvas crash:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0,
          background: 'radial-gradient(ellipse at center, #0a1628 0%, #020810 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', color: '#88aabb'
        }}>
          <p style={{ fontSize: '1.2rem', textShadow: '0 0 10px rgba(0,212,255,0.4)' }}>
            3D 렌더링을 사용할 수 없습니다.
          </p>
          <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
            행성을 아래 목록에서 선택해 주세요.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function checkWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

export default function SpaceScene(props) {
  const fov = props.isBoosting ? 60 : 45;
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    if (!checkWebGLSupport()) {
      console.warn('[SpaceScene] WebGL not supported on this device.');
      setHasWebGL(false);
    }
  }, []);

  if (!hasWebGL) {
    // WebGL 지원 안됨 - 빈 배경 (SpaceHome에서 2D 모드로 강제 전환할 수 있도록 처리)
    return (
      <div style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         <p style={{ color: '#88aabb', textShadow: '0 0 10px rgba(0,212,255,0.4)' }}>
           3D 렌더링을 지원하지 않는 기기입니다. 2D 모드를 사용해 주세요.
         </p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0 }}>
      <CanvasErrorBoundary>
        <Canvas
          camera={{ position: [0, 5, 15], fov: fov }}
          gl={{ antialias: true, alpha: true, failIfMajorPerformanceCaveat: false }}
          onCreated={({ gl }) => {
            const canvas = gl.domElement;
            const handleContextRestored = () => {
              setHasWebGL(true);
            };
            canvas.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              setHasWebGL(false);
            });
            canvas.addEventListener('webglcontextrestored', handleContextRestored);
          }}
        >
          <SceneContent {...props} />
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  )
}
