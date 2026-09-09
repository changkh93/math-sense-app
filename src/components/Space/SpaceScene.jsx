import React, { useRef, useMemo, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { AdaptiveDpr, Stars, CameraControls, Float, Html } from '@react-three/drei'
import * as THREE from 'three'
import PlanetMesh from './PlanetMesh'
import { getMiddleMathPlanetStyle, getPythonPlanetStyle } from './planetCourseStyles'
import { checkWebGLSupport } from '../../utils/webglSupport'
import { isWesternClassicCluster, filterWesternClassicRegions } from '../../constants/westernClassicNavigation'

const SPIRAL_CONFIG = {
  radiusStep: 4,
  angleStep: 1.2,
  yStep: -1.8,
  initialRadius: 2,
  yOffset: -3,
}

const ELEMENTARY_OVERVIEW_POSITIONS = [
  [8.4, -3.2, -0.5],
  [2.4, -5.8, -3.8],
  [-3.8, -6.3, -0.5],
  [-8.3, -3.9, -2.5],
  [-1.3, -3.2, -5.2],
  [7.5, -7.1, -3.5],
  [0, -11, -5.8],
]

const MIDDLE_MATH_OVERVIEW_POSITIONS = [
  [7, -3, -2],
  [4, -7.8, -2],
  [-4, -7.8, -2],
  [-7, -3.5, -2],
  [0, -3.2, -3],
  [0, -9.8, -3],
]

const PYTHON_OVERVIEW_POSITIONS = [
  [6.5, -3, -2],
  [4, -7.2, -2],
  [-4, -7.2, -2],
  [-6.5, -4.6, -2],
]

function getWesternClassicPlanetStyle(region) {
  const title = region?.title || ''

  if (title.includes('네버랜드')) {
    return { planetType: 'western_classic_neverland', planetColor: '#2dd4bf' }
  }
  if (title.includes('노벨문학상')) {
    return { planetType: 'western_classic_nobel', planetColor: '#f4d58d' }
  }
  return { planetType: 'western_classic_heritage', planetColor: '#a855f7' }
}

/**
 * 워프 효과를 위한 고속 별 이동
 */
function WarpStars({ active }) {
  return (
    <Stars 
      radius={100} 
      depth={50} 
      count={3200}
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
  useFrame(({ camera }, delta) => {
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
  clusterId,
  onSelectRegion, 
  onSelectArchive,
  onSelectReadingLibrary,
  selectedRegionId,
  recentRegionId,
  explorationStatus = {},
  equipment = {},
  shipData = {},
  shipCustomization = {},
  isBoosting = false,
  onSelectDarkMatter,
  onSelectDarkMatterRefinery,
  onSelectMistakeNotebook,
  onSelectLumiProtocol,
  onSelectAlgorithmConstellation,
  showLumiProtocol = false,
  darkMatterCount = 0
}) {
  const controlsRef = useRef()
  const [warpActive, setWarpActive] = useState(false)
  
  const isClassic = isWesternClassicCluster(clusterId);
  const isElementary = clusterId === 'cluster_elementary' || clusterId === '초등수학'
  const isMiddleMath = clusterId === 'middle-math' || clusterId === '중등수학'
  const isPython = clusterId === 'python' || clusterId === '파이썬'
  const displayedRegions = useMemo(() => {
    return isClassic ? filterWesternClassicRegions(regions, clusterId) : regions;
  }, [regions, clusterId, isClassic]);

  // Spiral Layout Configuration
  // Calculate positions
  const planetPositions = useMemo(() => {
    if (!displayedRegions) return []
    return displayedRegions.map((region, i) => {
      const angle = i * SPIRAL_CONFIG.angleStep
      const radius = SPIRAL_CONFIG.initialRadius + (i * 0.5)
      const curatedPosition = isElementary
        ? ELEMENTARY_OVERVIEW_POSITIONS[i]
        : isMiddleMath
          ? MIDDLE_MATH_OVERVIEW_POSITIONS[i]
          : isPython
            ? PYTHON_OVERVIEW_POSITIONS[i]
            : null

      // Elementary keeps a curated open constellation; other clusters retain
      // the extensible spiral for arbitrary region counts.
      const x = curatedPosition?.[0] ?? Math.cos(angle) * radius * 3
      const y = curatedPosition?.[1] ?? i * SPIRAL_CONFIG.yStep + SPIRAL_CONFIG.yOffset
      const z = curatedPosition?.[2] ?? Math.sin(angle) * radius * 2 - (i * 2)

      // Planet Type Logic
      let planetType = 'default'
      let planetColor = '#4a90e2'
      
      if (isElementary && region.title?.includes('월간평가')) {
        planetType = 'elementary_monthly_evaluation'; planetColor = '#6d8dff'
      } else if (isMiddleMath || region.clusterId === 'middle-math' || region.clusterId === '중등수학') {
        const middleMathStyle = getMiddleMathPlanetStyle(region, i)
        planetType = middleMathStyle.planetType
        planetColor = middleMathStyle.planetColor
      } else if (isPython || region.clusterId === 'python' || region.clusterId === '파이썬' || region.title?.includes('파이썬')) {
        const pythonStyle = getPythonPlanetStyle(region, i)
        planetType = pythonStyle.planetType
        planetColor = pythonStyle.planetColor
      } else if (region.clusterId === 'western-classic' || region.clusterId === '서양고전') {
        const classicStyle = getWesternClassicPlanetStyle(region)
        planetType = classicStyle.planetType
        planetColor = classicStyle.planetColor
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
  }, [displayedRegions, isElementary, isMiddleMath, isPython])

  // Camera Animation & Warp Logic
  useEffect(() => {
    if (selectedRegionId && controlsRef.current) {
      const targetPlanet = planetPositions.find(p => p.id === selectedRegionId)
      if (targetPlanet) {
        // Warp Start
        queueMicrotask(() => setWarpActive(true))
        
        // Fly to planet
        const [x, y, z] = targetPlanet.position
        controlsRef.current.setLookAt(
          x, y + 2, z + 6, // Camera Position
          x, y, z,         // Target Position
          true             // Transition: true
        )
        
        // Warp End after transition
        const timeout = setTimeout(() => setWarpActive(false), 1000)
        return () => clearTimeout(timeout)
      }
    } else if (controlsRef.current) {
      // Reset View (Overview) - Lower target to keep planets in bottom 2/3 of screen
      if (isElementary) controlsRef.current.setLookAt(0, 8, 24, 0, -4.5, -2, true)
      else controlsRef.current.setLookAt(0, 8, 20, 0, -5, 0, true)
    }
  }, [selectedRegionId, planetPositions, isElementary])

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#00d4ff" />
      
      <CameraFOV isBoosting={isBoosting} />
      <AdaptiveDpr pixelated />
      <WarpStars active={warpActive || isBoosting} />
      
      <CameraControls 
        ref={controlsRef} 
        minDistance={2} 
        maxDistance={80}
        smoothTime={0.55}
        dollyToCursor
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
               showFormulas={!planet.planetType.startsWith('western_classic_')}
               showSpaceship={selectedRegionId === planet.id || (!selectedRegionId && recentRegionId === planet.id)} 
               status={explorationStatus[planet.id] || 'not_started'}
               equipment={equipment}
               shipData={shipData}
               shipCustomization={shipCustomization}
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
              planetType="stellar_archive"
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

      {/* Reading Bookshelf Planet for Western Classic */}
      {(!selectedRegionId && isClassic) && (
        <group position={[4.8, 0.3, -1.2]}>
          <Float speed={1.7} rotationIntensity={0.55} floatIntensity={1} floatingRange={[-0.25, 0.25]}>
            <PlanetMesh
              color="#0d9488"
              size={0.7}
              planetType="reading_library"
              showSpaceship={false}
              showFormulas={false}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectReadingLibrary) onSelectReadingLibrary();
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
              나의 책장<br/>
              <span style={{ fontSize: '0.72rem', color: '#ccfbf1', fontWeight: '500' }}>Reading Bookshelf</span>
            </Html>
          </Float>
        </group>
      )}

      {/* Mistake Notebook Planet */}
      {(!selectedRegionId && !isClassic) && (
        <group position={[4.8, 0.3, -1.2]}>
          <Float speed={1.7} rotationIntensity={0.55} floatIntensity={1} floatingRange={[-0.25, 0.25]}>
            <PlanetMesh
              color="#8b5cf6"
              size={0.65}
              planetType="elementary_mistake_notebook"
              showSpaceship={false}
              showFormulas={false}
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
      {(!selectedRegionId && !isClassic) && (
        <group position={[-6.8, -1.0, -0.5]}>
          <Float speed={1.8} rotationIntensity={0.6} floatIntensity={0.9} floatingRange={[-0.25, 0.25]}>
            <PlanetMesh
              color="#f59e0b"
              size={0.45}
              planetType="dark_matter_refinery"
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

      {/* LUMI Protocol — dedicated Python World entry */}
      {(!selectedRegionId && showLumiProtocol) && (
        <group position={[0.2, -3.1, 2.6]}>
          <Float speed={2.2} rotationIntensity={0.7} floatIntensity={1.15} floatingRange={[-0.32, 0.32]}>
            <PlanetMesh
              color="#22d3ee"
              size={0.86}
              planetType="crystal"
              showSpaceship={false}
              showFormulas={true}
              onClick={(event) => {
                event.stopPropagation()
                onSelectLumiProtocol?.()
              }}
              onPointerOver={() => { document.body.style.cursor = 'pointer' }}
              onPointerOut={() => { document.body.style.cursor = 'auto' }}
            />
            <pointLight position={[0, 0, 1.2]} intensity={1.6} color="#55f1c8" distance={7} />
            <Html
              position={[0, 1.48, 0]}
              center
              zIndexRange={[100, 0]}
              style={{
                color: '#55f1c8',
                fontSize: '1.08rem',
                fontWeight: '900',
                fontFamily: 'var(--font-title, sans-serif)',
                whiteSpace: 'nowrap',
                textShadow: '0 2px 6px rgba(0,0,0,.95), 0 0 16px rgba(73,233,255,.65)',
                pointerEvents: 'none',
                textAlign: 'center',
                lineHeight: '1.3',
              }}
            >
              루미 프로토콜<br />
              <span style={{ fontSize: '.72rem', color: '#d8fbff', fontWeight: '600' }}>LUMI Protocol · 20 Missions</span>
            </Html>
          </Float>
        </group>
      )}

      {/* Algorithm Constellation — dedicated Python World Thinking Route Planet */}
      {(!selectedRegionId && showLumiProtocol) && (
        <group position={[-3.2, -1.8, 2.2]}>
          <Float speed={2.0} rotationIntensity={0.65} floatIntensity={1.1} floatingRange={[-0.3, 0.3]}>
            <PlanetMesh
              color="#00f0ff"
              size={0.92}
              planetType="algorithm_constellation"
              showSpaceship={false}
              showFormulas={true}
              onClick={(event) => {
                event.stopPropagation()
                onSelectAlgorithmConstellation?.()
              }}
              onPointerOver={() => { document.body.style.cursor = 'pointer' }}
              onPointerOut={() => { document.body.style.cursor = 'auto' }}
            />
            <pointLight position={[0, 0, 1.2]} intensity={2.0} color="#00f0ff" distance={7} />
            <Html
              position={[0, 1.5, 0]}
              center
              zIndexRange={[100, 0]}
              style={{
                color: '#c7d2fe',
                fontSize: '1.08rem',
                fontWeight: '900',
                fontFamily: 'var(--font-title, sans-serif)',
                whiteSpace: 'nowrap',
                textShadow: '0 2px 6px rgba(0,0,0,.95), 0 0 16px rgba(129,140,248,.7)',
                pointerEvents: 'none',
                textAlign: 'center',
                lineHeight: '1.3',
              }}
            >
              🌌 생각의 항로<br />
              <span style={{ fontSize: '.72rem', color: '#e0e7ff', fontWeight: '600' }}>Algorithm Constellation · 알고리즘 성단</span>
            </Html>
          </Float>
        </group>
      )}
    </>
  )
}

function Line({ start, end }) {
  const geometry = useMemo(() => (
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...start), 
      new THREE.Vector3(...end)
    ])
  ), [start, end])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <line geometry={geometry}>
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

export default function SpaceScene(props) {
  const fov = props.isBoosting ? 60 : 45;
  const [hasWebGL, setHasWebGL] = useState(() => checkWebGLSupport());

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
          dpr={[1, 1.5]}
          performance={{ min: 0.55, debounce: 250 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false }}
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
      <div
        className="font-tech"
        style={{
          position: 'absolute',
          right: 28,
          bottom: 28,
          padding: '7px 12px',
          border: '1px solid rgba(155, 207, 231, 0.14)',
          borderRadius: 999,
          background: 'rgba(3, 9, 24, 0.48)',
          color: 'rgba(205, 226, 240, 0.68)',
          fontSize: 11,
          letterSpacing: '.02em',
          pointerEvents: 'none',
          backdropFilter: 'blur(8px)',
        }}
      >
        드래그로 둘러보기 · 휠로 확대/축소
      </div>
    </div>
  )
}
